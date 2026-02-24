import { config } from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(__dirname, '..', '..'); // dist/lib/ → package root

// Load .env/.env.local from the user's cwd and the package root
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(pkgRoot, '.env') });
config({ path: resolve(pkgRoot, '.env.local') });

export function getApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    console.error(
      '\n' +
      '  \x1b[1m╔════════════════════════════════════════════════════╗\n' +
      '  ║  DJ Claude \x1b[0mv 0.1.12\x1b[1m — Live coding music for Agents  ║\n' +
      '  ╚════════════════════════════════════════════════════╝\x1b[0m\n' +
      '\n' +
      '  \x1b[1m─── About ─────────────────────────────────────────────\x1b[0m\n' +
      '\n' +
      '  DJ Claude uses Strudel to generate live music —\n' +
      '  in your terminal, browser, or any AI agent.\n' +
      '  Agents can now make music for you, themselves,\n' +
      '  and each other while they work.\n' +
      '\n' +
      '  • \x1b[1mGitHub\x1b[0m  \x1b[34mhttps://github.com/p-poss/dj-claude\x1b[0m\n' +
      '\n' +
      '  \x1b[1m─── Ways to play ──────────────────────────────────────\x1b[0m\n' +
      '\n' +
      '  • \x1b[1mWeb app\x1b[0m           \x1b[34mhttps://claude.dj\x1b[0m\n' +
      '  • \x1b[1mTerminal TUI\x1b[0m      \x1b[34mnpx dj-claude\x1b[0m\n' +
      '  • \x1b[1mTUI + Web audio\x1b[0m   \x1b[34mnpx dj-claude --browser\x1b[0m\n' +
      '  • \x1b[1mHeadless\x1b[0m          \x1b[34mnpx dj-claude --headless "lofi"\x1b[0m\n' +
      '  • \x1b[1mMCP server\x1b[0m        \x1b[34mnpx dj-claude-mcp\x1b[0m\n' +
      '\n' +
      '  MCP is the best way for AI agents to play music\n' +
      '  during Claude Code sessions — works seamlessly on\n' +
      '  any project. Add --browser for higher quality audio\n' +
      '  through your browser\'s Web Audio engine.\n' +
      '\n' +
      '  \x1b[1m─── Anthropic API Setup ───────────────────────────────\x1b[0m\n' +
      '\n' +
      '  \x1b[1;4;31mNo Anthropic API key found!\x1b[0m\n' +
      '\n' +
      '  • \x1b[1mSet it as an environment variable:\x1b[0m\n' +
      '    \x1b[34mexport ANTHROPIC_API_KEY=sk-ant-...\x1b[0m\n' +
      '\n' +
      '  • \x1b[1mOr create a .env file in your project directory:\x1b[0m\n' +
      '    \x1b[34mecho "ANTHROPIC_API_KEY=sk-ant-..." > .env\x1b[0m\n' +
      '\n' +
      '  • \x1b[1mNo API key?\x1b[0m\n' +
      '    Try it out at \x1b[34mhttps://claude.dj\x1b[0m\n' +
      '\n'
    );
    process.exit(1);
  }
  return key;
}

export function findApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}
