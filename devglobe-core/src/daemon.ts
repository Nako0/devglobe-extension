import { createInterface } from 'readline';
import { Tracker } from './tracker.js';
import type { ClientMessage, CoreEvent } from './types.js';

function send(event: CoreEvent): void {
  process.stdout.write(JSON.stringify(event) + '\n');
}

export function startDaemon(): void {
  const tracker = new Tracker(send);

  const rl = createInterface({ input: process.stdin, terminal: false });

  rl.on('line', (line) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }

    switch (msg.method) {
      case 'init':
        tracker.init(
          msg.params.api_key,
          msg.params.editor,
          msg.params.share_repo,
          msg.params.anonymous_mode,
          msg.params.status_message,
        );
        break;

      case 'activity':
        tracker.recordActivity(msg.params.file_path, msg.params.cwd, msg.params.language);
        break;

      case 'set_config':
        tracker.setConfig(msg.params.share_repo, msg.params.anonymous_mode);
        break;

      case 'set_status':
        tracker.setStatus(msg.params.message);
        break;

      case 'pause':
        tracker.pause();
        break;

      case 'resume':
        tracker.resume();
        break;

      case 'shutdown':
        tracker.shutdown();
        rl.close();
        break;
    }
  });

  rl.on('close', () => {
    // Don't exit immediately — let pending async heartbeats finish.
    // shutdown() clears the interval, so the process will exit naturally
    // once all pending promises resolve.
    tracker.shutdown();
  });
}
