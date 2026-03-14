import { readFileSync } from 'fs';
import { runOneshot } from '../../../../devglobe-core/src/oneshot';
import type { Input } from './types';

async function main(): Promise<void> {
  const raw = readFileSync(0, 'utf-8');
  let input: Input;
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }

  const { session_id, cwd, hook_event_name } = input;
  const filePath = input.tool_input?.file_path || input.tool_response?.filePath || undefined;

  await runOneshot({
    file_path: filePath,
    cwd,
    editor: 'claude-code',
    session_id,
    force: hook_event_name === 'Stop',
  });
}

main().catch(() => process.exit(0));
