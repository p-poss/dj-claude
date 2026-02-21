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
      '\n  Missing ANTHROPIC_API_KEY!\n\n' +
      '  Set it as an environment variable:\n' +
      '    export ANTHROPIC_API_KEY=sk-ant-...\n\n' +
      '  Or create a .env file:\n' +
      '    echo "ANTHROPIC_API_KEY=sk-ant-..." > .env\n'
    );
    process.exit(1);
  }
  return key;
}

export function findApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}
