// Inline HTML page served to the browser for audio playback.
// Visual design matches claude.dj (retro terminal / phosphor glow aesthetic).

export function getPageHtml(wsPort: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DJ Claude | v0.1.0</title>
<link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  :root {
    --bg: #262624;
    --fg: #E8704E;
    --fg-dim: rgba(232, 112, 78, 0.4);
  }

  body {
    background: var(--bg);
    color: var(--fg);
    font-family: 'JetBrains Mono', 'Menlo', 'Consolas', 'DejaVu Sans Mono', monospace;
    font-size: 12px;
    line-height: 1.2;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

::selection {
    background: var(--fg);
    color: var(--bg);
  }

  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--fg-dim); border-radius: 3px; }

  /* ── ASCII box button ── */
  #start-box {
    cursor: pointer;
    user-select: none;
    width: fit-content;
    transition: opacity 0.15s;
  }
  #start-box:hover { opacity: 0.6; }
  #start-box.disabled { opacity: 0.3; pointer-events: none; }
  #start-box pre {
    font-family: inherit;
    font-size: 12px;
    line-height: 1.2;
  }

  /* ── Status ── */
  #status-line {
    font-size: 12px;
    color: var(--fg-dim);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-dot {
    display: inline-block;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--fg-dim);
  }
  .status-dot.mixing {
    background: var(--fg);
    animation: pulse 1.5s ease-in-out infinite;
  }
  .status-dot.on-deck {
    background: var(--fg);
  }
  .status-dot.error {
    background: #f87171;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  /* ── Header ── */
  #header {
    text-align: center;
  }
  #header pre {
    font-family: inherit;
    font-size: 12px;
    line-height: 1.2;
  }

  /* ── Code display ── */
  #code-box {
    width: 100%;
    max-width: 640px;
    display: none;
  }
  #code-box pre.box-frame {
    font-family: inherit;
    font-size: 12px;
    line-height: 1.2;
    color: var(--fg-dim);
  }
  #code-content {
    padding: 0 4px;
    max-height: 50vh;
    overflow-y: auto;
    white-space: pre-wrap;
    word-break: break-word;
    color: var(--fg);
  }
</style>
</head>
<body>

<div id="header">
<pre>╔══════════════════════════════╗
║  DJ Claude · Browser Audio   ║
╚══════════════════════════════╝</pre>
</div>

<div id="start-box">
<pre>╔══════════════════════╗
║  ▶ Start Audio       ║
╚══════════════════════╝</pre>
</div>

<div id="status-line">
  <span class="status-dot" id="dot"></span>
  <span id="status-text">◌ Waiting</span>
</div>

<div id="code-box">
  <pre class="box-frame phosphor-glow">╔══ Now Playing ═══════════════╗</pre>
  <div id="code-content"></div>
  <pre class="box-frame phosphor-glow">╚══════════════════════════════╝</pre>
</div>

<script type="module">
import { initStrudel } from 'https://unpkg.com/@strudel/web@1.2.6/dist/index.mjs';

const statusText = document.getElementById('status-text');
const dot = document.getElementById('dot');
const codeBox = document.getElementById('code-box');
const codeContent = document.getElementById('code-content');
const startBox = document.getElementById('start-box');

let strudelEval = null;
let strudelHush = null;
let ws = null;
let started = false;

function setStatus(symbol, text, dotClass) {
  statusText.textContent = symbol + ' ' + text;
  dot.className = 'status-dot' + (dotClass ? ' ' + dotClass : '');
}

async function start() {
  startBox.classList.add('disabled');
  startBox.querySelector('pre').textContent =
    '\\u2554\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2557\\n\\u2551  \\u25B6 Initializing...   \\u2551\\n\\u255A\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u255D';
  setStatus('\\u25CC', 'Booting Up');

  try {
    const { evaluate, hush } = await initStrudel();
    strudelEval = evaluate;
    strudelHush = hush;
    started = true;
    startBox.style.display = 'none';
    connectWs();
  } catch (err) {
    setStatus('\\u25CB', 'Error: ' + err.message, 'error');
    startBox.classList.remove('disabled');
    startBox.querySelector('pre').textContent =
      '\\u2554\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2557\\n\\u2551  \\u25B6 Retry             \\u2551\\n\\u255A\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u2550\\u255D';
  }
}

function connectWs() {
  if (!started) return;
  setStatus('\\u25CE', 'On Deck', 'on-deck');

  ws = new WebSocket('ws://localhost:${wsPort}');

  ws.onopen = () => {
    setStatus('\\u25CE', 'On Deck', 'on-deck');
    ws.send(JSON.stringify({ type: 'ready' }));
  };

  ws.onmessage = async (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.type === 'evaluate') {
      try {
        setStatus('\\u25CE', 'Queuing', 'on-deck');
        await strudelEval(msg.code);
        setStatus('\\u25CF', 'Mixing', 'mixing');
        codeContent.textContent = msg.code;
        codeBox.style.display = 'block';
        ws.send(JSON.stringify({ type: 'ack', id: msg.id }));
      } catch (err) {
        setStatus('\\u25CB', 'Error', 'error');
        ws.send(JSON.stringify({ type: 'error', id: msg.id, error: err.message }));
      }
    } else if (msg.type === 'hush') {
      strudelHush();
      setStatus('\\u25CB', 'On Break');
      codeContent.textContent = '-- hushed --';
    }
  };

  ws.onclose = () => {
    setStatus('\\u25CB', 'Disconnected', 'error');
    setTimeout(connectWs, 2000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

startBox.addEventListener('click', start);
</script>
</body>
</html>`;
}
