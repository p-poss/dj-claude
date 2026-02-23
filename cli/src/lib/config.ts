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
      '  \x1b[1m╔═════════════════════════════════════════════════════╗\n' +
      '  ║  DJ Claude — AI-generated music in your terminal    ║\n' +
      '  ╚═════════════════════════════════════════════════════╝\x1b[0m\n' +
      '\n' +
      '  \x1b[1m─── Ways to play ───────────────────────────────────\x1b[0m\n' +
      '\n' +
      '  • Web app           \x1b[34mhttps://claude.dj\x1b[0m\n' +
      '  • Terminal TUI      \x1b[34mnpx dj-claude\x1b[0m\n' +
      '  • TUI + Web audio   \x1b[34mnpx dj-claude --browser\x1b[0m\n' +
      '  • Headless          \x1b[34mnpx dj-claude --headless "jazz piano"\x1b[0m\n' +
      '  • MCP server        \x1b[34mnpx dj-claude-mcp\x1b[0m\n' +
      '\n' +
      '  \x1b[1m─── Anthropic API Setup ────────────────────────────\x1b[0m\n' +
      '\n' +
      '  \x1b[1;4;31mNo Anthropic API key found!\x1b[0m\n' +
      '\n' +
      '  • Set it as an environment variable:\n' +
      '    \x1b[34mexport ANTHROPIC_API_KEY=sk-ant-...\x1b[0m\n' +
      '\n' +
      '  • Or create a .env file in your project directory:\n' +
      '    \x1b[34mecho "ANTHROPIC_API_KEY=sk-ant-..." > .env\x1b[0m\n'
    );
    process.exit(1);
  }
  return key;
}

export function findApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}
