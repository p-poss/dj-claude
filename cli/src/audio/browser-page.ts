// Inline HTML page served to the browser for audio playback.
// Visual design matches claude.dj (welcome box, ASCII logo, dancing Claude).

export function getPageHtml(wsPort: number): string {
  // Body frames: 4 frames, each 10 rows x 18 cols
  // 0=empty, 1=body, 2=eye, 3=mouth
  const bodyFrames = [
    [[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],[0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],[0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[0,0,0,1,1,1,1,1,3,3,1,1,1,1,1,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0]],
    [[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],[0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],[0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[0,0,0,1,1,1,1,1,3,3,1,1,1,1,1,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0]],
    [[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],[0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],[0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[0,0,0,1,1,1,1,1,3,3,1,1,1,1,1,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0]],
    [[0,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,0],[0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],[0,1,0,1,1,1,1,1,1,1,1,1,1,1,1,0,1,0],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,1,2,1,1,1,1,1,1,2,1,1,1,1,1],[1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],[0,0,0,1,1,1,1,1,3,3,1,1,1,1,1,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0],[0,0,0,1,1,1,1,1,1,1,1,1,1,1,1,0,0,0]],
  ];

  // Leg frames: 4 frames, each 2 rows x 18 cols
  const legFrames = [
    [[0,0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0],[0,0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0]],
    [[0,0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0],[0,0,0,0,0,0,0,0,0,0,0,1,0,1,0,0,0,0]],
    [[0,0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0],[0,0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0]],
    [[0,0,0,0,1,0,1,0,0,0,0,1,0,1,0,0,0,0],[0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,0]],
  ];

  const framesJson = JSON.stringify({ body: bodyFrames, legs: legFrames });

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DJ Claude | v 0.1.9</title>
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🔈</text></svg>">
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
    gap: 0;
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

  pre { margin: 0; font-family: inherit; font-size: 12px; line-height: 1.2; }

  .ascii-box { width: fit-content; user-select: none; }
  .dim { opacity: 0.3; }

  /* ── ASCII logo ── */
  #logo { user-select: none; }

  /* ── Start button ── */
  #start-box {
    cursor: pointer;
    user-select: none;
    width: fit-content;
    transition: opacity 0.15s;
    margin-top: 8px;
  }
  #start-box:hover { opacity: 0.6; }
  #start-box.disabled { opacity: 0.3; pointer-events: none; }

  /* ── Dancing Claude ── */
  #claude {
    margin-top: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: transform 0.15s ease-out;
  }
  .pixel-row { display: flex; }
  .pixel {
    width: 6px;
    height: 6px;
  }

  /* ── Speech bubble ── */
  #speech {
    margin-top: 16px;
    opacity: 0.4;
    user-select: none;
    text-align: center;
    border: 1px solid var(--fg);
    border-radius: 4px;
    padding: 8px 16px;
    line-height: 1.5;
  }
</style>
</head>
<body>

<!-- Welcome box -->
<div class="ascii-box">
  <pre>╔═════════════════════════════════════════════╗</pre>
  <div style="display:flex"><pre>║</pre><pre style="flex:1;text-align:center">Welcome to DJ Claude <span class="dim">v 0.1.9</span></pre><pre>║</pre></div>
  <pre>╚═════════════════════════════════════════════╝</pre>
</div>

<!-- ASCII Logo -->
<div id="logo">
<pre>
 ██████╗      ██╗     ██████╗██╗      █████╗ ██╗   ██╗██████╗ ███████╗
 ██╔══██╗     ██║    ██╔════╝██║     ██╔══██╗██║   ██║██╔══██╗██╔════╝
 ██║  ██║     ██║    ██║     ██║     ███████║██║   ██║██║  ██║█████╗
 ██║  ██║██   ██║    ██║     ██║     ██╔══██║██║   ██║██║  ██║██╔══╝
 ██████╔╝╚█████╔╝    ╚██████╗███████╗██║  ██║╚██████╔╝██████╔╝███████╗
 ╚═════╝  ╚════╝      ╚═════╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚══════╝</pre>
</div>

<!-- Start Audio button -->
<div id="start-box" role="button" tabindex="0" aria-label="Start Audio">
  <pre>╔════════════════════╗</pre>
  <div style="display:flex"><pre>║</pre><pre id="start-label" style="flex:1;text-align:center">▶ Unmute Audio</pre><pre>║</pre></div>
  <pre>╚════════════════════╝</pre>
</div>

<!-- Dancing Claude pixel art -->
<div id="claude"></div>

<!-- Speech bubble -->
<div id="speech">
Browser audio engine for the Terminal DJ.<br>
Press Unmute, then head back to the TUI!
</div>

<script type="module">
import { initStrudel } from 'https://unpkg.com/@strudel/web@1.2.6/dist/index.mjs';

const startBox = document.getElementById('start-box');
const startLabel = document.getElementById('start-label');
const claudeEl = document.getElementById('claude');

const FRAMES = ${framesJson};
const FG = getComputedStyle(document.documentElement).getPropertyValue('--fg').trim();
const BG = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();

let strudelEval = null;
let strudelHush = null;
let ws = null;
let started = false;
let isMixing = false;
let animFrame = 0;
let animInterval = null;

// ── Pixel art renderer ──
function renderClaude(frame) {
  const body = FRAMES.body[frame];
  const legs = FRAMES.legs[frame];
  const bob = (frame === 1 || frame === 3) && isMixing ? -2 : 0;

  claudeEl.style.transform = 'translateY(' + bob + 'px)';

  let html = '';
  const allRows = [...body, ...legs];
  for (const row of allRows) {
    html += '<div class="pixel-row">';
    for (const cell of row) {
      const bg = cell === 1 ? FG : 'transparent';
      // 2=eye, 3=mouth → transparent
      html += '<div class="pixel" style="background:' + bg + '"></div>';
    }
    html += '</div>';
  }
  claudeEl.innerHTML = html;
}

function startDancing() {
  if (animInterval) return;
  isMixing = true;
  animInterval = setInterval(() => {
    animFrame = (animFrame + 1) % 4;
    renderClaude(animFrame);
  }, 200);
}

function stopDancing() {
  isMixing = false;
  if (animInterval) {
    clearInterval(animInterval);
    animInterval = null;
  }
  animFrame = 0;
  renderClaude(0);
}

// Initial static render
renderClaude(0);

// ── Audio init ──
async function start() {
  startBox.classList.add('disabled');

  try {
    const { evaluate, hush } = await initStrudel();
    strudelEval = evaluate;
    strudelHush = hush;
    started = true;
    startLabel.textContent = '● Audio On';
    startBox.style.cursor = 'default';
    startBox.style.pointerEvents = 'none';
    startBox.classList.remove('disabled');
    connectWs();
  } catch (err) {
    startBox.classList.remove('disabled');
  }
}

// ── WebSocket ──
function connectWs() {
  if (!started) return;

  ws = new WebSocket('ws://localhost:${wsPort}');

  ws.onopen = () => {
    startLabel.textContent = '● Audio On';
    startBox.classList.remove('dim');
    ws.send(JSON.stringify({ type: 'ready' }));
  };

  ws.onmessage = async (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    if (msg.type === 'evaluate') {
      try {
        await strudelEval(msg.code);
        startDancing();
        ws.send(JSON.stringify({ type: 'ack', id: msg.id }));
      } catch (err) {
        stopDancing();
        ws.send(JSON.stringify({ type: 'error', id: msg.id, error: err.message }));
      }
    } else if (msg.type === 'hush') {
      strudelHush();
      stopDancing();
    }
  };

  ws.onclose = () => {
    if (strudelHush) strudelHush();
    stopDancing();
    startLabel.textContent = '○ Disconnected';
    startBox.classList.add('dim');
    setTimeout(connectWs, 2000);
  };

  ws.onerror = () => {
    ws.close();
  };
}

startBox.addEventListener('click', start);
startBox.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); start(); }
});

// Allow automation agents to trigger start via ?autoplay=true query param.
// This dispatches a trusted-context click; whether the browser honours it
// depends on the automation framework (Playwright/Puppeteer trusted clicks work).
if (new URLSearchParams(location.search).has('autoplay')) {
  startBox.click();
}
</script>
</body>
</html>`;
}
