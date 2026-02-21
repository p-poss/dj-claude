import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env/.env.local from the cli/ directory and the project root
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '..', '.env') });
config({ path: resolve(process.cwd(), '..', '.env.local') });

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
