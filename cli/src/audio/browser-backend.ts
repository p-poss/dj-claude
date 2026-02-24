// Browser audio backend — routes audio through a browser tab via WebSocket.

import { createServer, type Server as HttpServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { exec } from 'node:child_process';
import type { AudioBackend, SafeEvalResult, VisualizationData } from './backend.js';
import { getPageHtml } from './browser-page.js';

// ws is dynamically imported so it's not loaded in node mode
type WsServer = import('ws').WebSocketServer;
type WsSocket = import('ws').WebSocket;

interface PendingEval {
  resolve: () => void;
  reject: (err: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class BrowserAudioBackend implements AudioBackend {
  private httpServer: HttpServer | null = null;
  private wsServer: WsServer | null = null;
  private socket: WsSocket | null = null;
  private port = 0;
  private currentCode = '';
  private pendingEvals = new Map<string, PendingEval>();
  private readyPromise: { resolve: () => void; reject: (err: Error) => void } | null = null;
  private commandQueue: Array<{ type: string; code?: string; id?: string }> = [];

  async init(): Promise<void> {
    const { WebSocketServer } = await import('ws');

    // Start HTTP server on a random available port
    this.httpServer = createServer((req, res) => {
      const pathname = req.url?.split('?')[0];
      if (pathname === '/' || pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getPageHtml(this.port));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    await new Promise<void>((resolve, reject) => {
      this.httpServer!.listen(0, '127.0.0.1', () => resolve());
      this.httpServer!.on('error', reject);
    });

    const addr = this.httpServer.address();
    this.port = typeof addr === 'object' && addr ? addr.port : 0;

    // Start WebSocket server on the same port
    this.wsServer = new WebSocketServer({ server: this.httpServer });

    this.wsServer.on('connection', (ws) => {
      this.socket = ws;

      ws.on('message', (data) => {
        let msg: { type: string; id?: string; error?: string };
        try {
          msg = JSON.parse(data.toString());
        } catch {
          return;
        }

        if (msg.type === 'ready') {
          console.error(`[dj-claude] Browser audio connected.`);
          if (this.readyPromise) {
            this.readyPromise.resolve();
            this.readyPromise = null;
          }
          // Flush queued commands
          for (const cmd of this.commandQueue) {
            this.send(cmd);
          }
          this.commandQueue = [];
          // Replay current code on reconnect
          if (this.currentCode) {
            const id = randomUUID();
            this.send({ type: 'evaluate', code: this.currentCode, id });
          }
        } else if (msg.type === 'ack' && msg.id) {
          const pending = this.pendingEvals.get(msg.id);
          if (pending) {
            clearTimeout(pending.timer);
            pending.resolve();
            this.pendingEvals.delete(msg.id);
          }
        } else if (msg.type === 'error' && msg.id) {
          const pending = this.pendingEvals.get(msg.id);
          if (pending) {
            clearTimeout(pending.timer);
            pending.reject(new Error(msg.error || 'Browser evaluation failed'));
            this.pendingEvals.delete(msg.id);
          }
        }
      });

      ws.on('close', () => {
        console.error('[dj-claude] Browser disconnected.');
        this.socket = null;
      });
    });

    // Open the browser (with autoplay hint for automation agents)
    const url = `http://127.0.0.1:${this.port}?autoplay`;
    console.error(`[dj-claude] Opening browser audio at ${url}`);
    openBrowser(url);

    // Wait for the browser to connect and send 'ready'
    await new Promise<void>((resolve, reject) => {
      this.readyPromise = { resolve, reject };
      // Don't timeout — user needs to click "Start Audio" manually
    });
  }

  async evaluate(code: string): Promise<void> {
    const id = randomUUID();
    const msg = { type: 'evaluate', code, id };

    if (!this.socket || this.socket.readyState !== 1) {
      // Queue for when browser reconnects
      this.commandQueue.push(msg);
      this.currentCode = code;
      return;
    }

    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingEvals.delete(id);
        reject(new Error('Browser evaluation timed out (10s)'));
      }, 10_000);

      this.pendingEvals.set(id, { resolve, reject, timer });
      this.send(msg);
      this.currentCode = code;
    });
  }

  async safeEvaluate(newCode: string, previousCode: string): Promise<SafeEvalResult> {
    try {
      await this.evaluate(newCode);
      return { success: true };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      if (previousCode) {
        try {
          await this.evaluate(previousCode);
        } catch {
          // Previous code also failed
        }
      }
      return { success: false, error };
    }
  }

  hush(): void {
    this.send({ type: 'hush' });
    this.currentCode = '';
  }

  dispose(): void {
    this.hush();
    for (const [id, pending] of this.pendingEvals) {
      clearTimeout(pending.timer);
      pending.reject(new Error('Backend disposed'));
      this.pendingEvals.delete(id);
    }
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }
    if (this.httpServer) {
      this.httpServer.close();
      this.httpServer = null;
    }
  }

  getVisualizationData(): VisualizationData | null {
    return null;
  }

  getPattern(): unknown | null {
    return null;
  }

  private send(msg: object): void {
    if (this.socket && this.socket.readyState === 1) {
      this.socket.send(JSON.stringify(msg));
    }
  }
}

function openBrowser(url: string): void {
  const cmd = process.platform === 'darwin'
    ? `open "${url}"`
    : process.platform === 'win32'
      ? `start "${url}"`
      : `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.error('[dj-claude] Could not open browser:', err.message);
  });
}
