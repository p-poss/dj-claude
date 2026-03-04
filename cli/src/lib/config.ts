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
      '  ║  DJ Claude \x1b[0mv 0.1.18\x1b[1m — Live coding music for Agents ║\n' +
      '  ╚════════════════════════════════════════════════════╝\x1b[0m\n' +
      '\n' +
      '  \x1b[1m─── About ─────────────────────────────────────────────\x1b[0m\n' +
      '\n' +
      '  DJ Claude generates live music in your terminal\n' +
      '  using Strudel patterns. Describe what you want to\n' +
      '  hear and Claude composes it in real time.\n' +
      '\n' +
      '  • \x1b[1mGitHub\x1b[0m  \x1b[34mhttps://github.com/p-poss/dj-claude\x1b[0m\n' +
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
