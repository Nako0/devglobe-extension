import { startDaemon } from "./daemon.js";
import { runOneshot } from "./oneshot.js";
import type { OneshotParams } from "./types.js";

const command = process.argv[2];

if (command === "daemon") {
  startDaemon();
} else if (command === "heartbeat") {
  let input: OneshotParams;
  try {
    const { readFileSync } = await import("fs");
    const raw = readFileSync(0, "utf-8");
    input = JSON.parse(raw);
  } catch {
    process.exit(0);
  }
  runOneshot(input).catch(() => process.exit(0));
} else {
  process.stderr.write("Usage: devglobe-core <daemon|heartbeat>\n");
  process.exit(1);
}
