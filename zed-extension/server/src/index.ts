import { readFileSync, writeFileSync, watch, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join, dirname } from "path";
import { Tracker } from "../../../devglobe-core/src/tracker";
import { langFromPath } from "../../../devglobe-core/src/language";
import { updateStatusMessage } from "../../../devglobe-core/src/heartbeat";
import type { CoreEvent, Config } from "../../../devglobe-core/src/types";

const CONFIG_DIR = join(homedir(), ".devglobe");
const API_KEY_PATH = join(CONFIG_DIR, "api_key");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

const mode = process.argv[2];
if (mode === "lsp") {
  startLsp();
} else if (mode) {
  runSubcommand(mode, process.argv.slice(3));
} else {
  process.stderr.write("Usage: server.js <lsp|setup|anonymous|share-repo|status>\n");
  process.exit(1);
}

// ── LSP Language Server (precise activity detection) ──────────────────

function startLsp(): void {
  const log = (msg: string) => process.stderr.write(`[DevGlobe:lsp] ${msg}\n`);

  const tracker = new Tracker((event: CoreEvent) => {
    if (event.event === "heartbeat_ok") {
      const { today_seconds, language } = event.data;
      const h = Math.floor(today_seconds / 3600);
      const m = Math.floor((today_seconds % 3600) / 60);
      const time = h > 0 ? `${h}h ${m}m` : `${m}m`;
      log(`Heartbeat OK — ${language || "Unknown"} — ${time} today`);
    }
  });

  let started = false;

  function ensureStarted(): void {
    if (started) return;
    const apiKey = readApiKey();
    if (!apiKey) return;
    const config = readConfig();
    tracker.init(apiKey, "zed", config.shareRepo, config.anonymousMode);
    tracker.resume();
    started = true;
    log("Tracking started");
  }

  // Watch config for changes
  try {
    watch(CONFIG_DIR, (_event, filename) => {
      if (filename === "api_key" && !started) {
        ensureStarted();
      }
      if (filename === "config.json") {
        const config = readConfig();
        tracker.setConfig(config.shareRepo, config.anonymousMode);
      }
    });
  } catch { /* ~/.devglobe/ doesn't exist yet */ }

  const fileLangs = new Map<string, string>();

  // LSP protocol: Content-Length framed JSON-RPC on stdin/stdout
  let buf = "";
  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", (chunk: string) => {
    buf += chunk;
    while (true) {
      const headerEnd = buf.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;
      const header = buf.slice(0, headerEnd);
      const match = header.match(/Content-Length:\s*(\d+)/i);
      if (!match) { buf = buf.slice(headerEnd + 4); continue; }
      const len = parseInt(match[1], 10);
      const bodyStart = headerEnd + 4;
      if (buf.length < bodyStart + len) break;
      const body = buf.slice(bodyStart, bodyStart + len);
      buf = buf.slice(bodyStart + len);
      handleLspMessage(body);
    }
  });

  function sendLsp(msg: object): void {
    const body = JSON.stringify(msg);
    process.stdout.write(`Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`);
  }

  function handleLspMessage(raw: string): void {
    let msg: { jsonrpc: string; id?: number; method?: string; params?: any };
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.method) {
      case "initialize":
        sendLsp({
          jsonrpc: "2.0",
          id: msg.id,
          result: {
            capabilities: {
              textDocumentSync: {
                openClose: true,
                change: 2, // incremental
                save: { includeText: false },
              },
            },
            serverInfo: { name: "devglobe-ls", version: "0.1.0" },
          },
        });
        log("LSP initialized");
        break;

      case "initialized":
        break;

      case "textDocument/didOpen": {
        const uri = msg.params?.textDocument?.uri as string;
        const languageId = msg.params?.textDocument?.languageId as string;
        if (uri) {
          const filePath = uriToPath(uri);
          const cwd = dirname(filePath);
          const language = capitalizeLanguageId(languageId) || langFromPath(filePath) || undefined;
          if (language) fileLangs.set(uri, language);
          ensureStarted();
          tracker.recordActivity(filePath, cwd, language);
        }
        break;
      }

      case "textDocument/didChange": {
        const uri = msg.params?.textDocument?.uri as string;
        if (uri) {
          const filePath = uriToPath(uri);
          const cwd = dirname(filePath);
          const language = fileLangs.get(uri) || langFromPath(filePath) || undefined;
          ensureStarted();
          tracker.recordActivity(filePath, cwd, language);
        }
        break;
      }

      case "textDocument/didSave": {
        const uri = msg.params?.textDocument?.uri as string;
        if (uri) {
          const filePath = uriToPath(uri);
          const cwd = dirname(filePath);
          const language = fileLangs.get(uri) || langFromPath(filePath) || undefined;
          ensureStarted();
          tracker.recordActivity(filePath, cwd, language);
        }
        break;
      }

      case "textDocument/didClose": {
        const uri = msg.params?.textDocument?.uri as string;
        if (uri) fileLangs.delete(uri);
        break;
      }

      case "shutdown":
        sendLsp({ jsonrpc: "2.0", id: msg.id, result: null });
        break;

      case "exit":
        tracker.shutdown();
        process.exit(0);
        break;

      default:
        if (msg.id !== undefined) {
          sendLsp({ jsonrpc: "2.0", id: msg.id, error: { code: -32601, message: "Method not found" } });
        }
        break;
    }
  }

  process.stdin.on("end", () => { tracker.shutdown(); process.exit(0); });
  process.on("SIGTERM", () => { tracker.shutdown(); process.exit(0); });
  process.on("SIGINT", () => { tracker.shutdown(); process.exit(0); });
}

// ── CLI Subcommands ───────────────────────────────────────────────────

function runSubcommand(cmd: string, args: string[]): void {
  switch (cmd) {
    case "setup": {
      const key = args[0];
      if (!key || !key.startsWith("devglobe_")) {
        console.log("Usage: /devglobe-setup YOUR_API_KEY\n\nGet your key at https://devglobe.xyz (profile settings).");
        process.exit(1);
      }
      mkdirSync(CONFIG_DIR, { recursive: true });
      writeFileSync(API_KEY_PATH, key);
      if (!existsSync(CONFIG_PATH)) {
        writeFileSync(CONFIG_PATH, JSON.stringify({ shareRepo: false, anonymousMode: true }, null, 2));
      }
      const config = readConfig();
      console.log(`Connected to DevGlobe!\n\nAPI key saved. You'll appear on the globe within 30 seconds.\n\nCurrent settings:\n- Anonymous mode: ${config.anonymousMode !== false}\n- Share repository: ${config.shareRepo === true}\n\nOther commands: /devglobe-status, /devglobe-anonymous, /devglobe-share-repo`);
      break;
    }
    case "anonymous": {
      const value = args[0];
      if (value !== "true" && value !== "false") { console.log("Usage: /devglobe-anonymous true|false"); process.exit(1); }
      const config = readConfig();
      config.anonymousMode = value === "true";
      writeConfig(config);
      console.log(value === "true" ? "Anonymous mode enabled. You now appear on a random city in your country." : "Anonymous mode disabled. Your approximate location is shown.");
      break;
    }
    case "share-repo": {
      const value = args[0];
      if (value !== "true" && value !== "false") { console.log("Usage: /devglobe-share-repo true|false"); process.exit(1); }
      const config = readConfig();
      config.shareRepo = value === "true";
      writeConfig(config);
      console.log(value === "true" ? "Repository sharing enabled. Your repo name is now visible on the globe." : "Repository sharing disabled. Your repo name is hidden.");
      break;
    }
    case "status": {
      const message = args.join(" ");
      const apiKey = readApiKey();
      if (!apiKey) { console.log("No API key found. Run /devglobe-setup YOUR_KEY first."); process.exit(1); }
      updateStatusMessage(apiKey, message).then((ok) => {
        console.log(ok ? (message ? `Status set to "${message}"` : "Status cleared.") : "Failed to update status. Check your API key.");
        if (!ok) process.exit(1);
      });
      break;
    }
    default:
      console.log("Unknown command. Available: setup, anonymous, share-repo, status");
      process.exit(1);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────

function readApiKey(): string | null {
  const envKey = process.env.DEVGLOBE_API_KEY;
  if (envKey?.trim()) return envKey.trim();
  try {
    const key = readFileSync(API_KEY_PATH, "utf-8").trim();
    if (key) return key;
  } catch { /* not found */ }
  return null;
}

function readConfig(): Config {
  try { return JSON.parse(readFileSync(CONFIG_PATH, "utf-8")); }
  catch { return {}; }
}

function writeConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

function uriToPath(uri: string): string {
  try {
    const pathname = decodeURIComponent(new URL(uri).pathname);
    if (process.platform === "win32" && pathname.match(/^\/[a-zA-Z]:/)) {
      return pathname.slice(1);
    }
    return pathname;
  } catch { return uri; }
}

function capitalizeLanguageId(id: string | undefined): string | undefined {
  if (!id) return undefined;
  const map: Record<string, string> = {
    javascript: "JavaScript", typescript: "TypeScript",
    javascriptreact: "JSX", typescriptreact: "TSX",
    python: "Python", rust: "Rust", go: "Go", c: "C", cpp: "C++", csharp: "C#",
    java: "Java", kotlin: "Kotlin", scala: "Scala", groovy: "Groovy",
    swift: "Swift", dart: "Dart", ruby: "Ruby", php: "PHP",
    lua: "Lua", perl: "Perl", r: "R", julia: "Julia", matlab: "MATLAB",
    haskell: "Haskell", elixir: "Elixir", erlang: "Erlang", ocaml: "OCaml",
    elm: "Elm", purescript: "PureScript", clojure: "Clojure", racket: "Racket", scheme: "Scheme",
    html: "HTML", css: "CSS", scss: "SCSS", sass: "Sass", less: "Less",
    json: "JSON", jsonc: "JSON", yaml: "YAML", toml: "TOML", xml: "XML", ini: "INI",
    markdown: "Markdown", latex: "LaTeX", typst: "Typst",
    sql: "SQL", prisma: "Prisma", graphql: "GraphQL",
    shellscript: "Bash", powershell: "PowerShell", fish: "Fish",
    dockerfile: "Docker", makefile: "Makefile", nix: "Nix", terraform: "Terraform",
    vue: "Vue", svelte: "Svelte", astro: "Astro",
    zig: "Zig", nim: "Nim", v: "V",
    solidity: "Solidity", gdscript: "GDScript",
    glsl: "GLSL", hlsl: "HLSL", wgsl: "WGSL", metal: "Metal",
    assembly: "Assembly", vhdl: "VHDL", verilog: "Verilog",
    protobuf: "Protobuf", proto: "Protobuf",
    plaintext: "Plain Text",
  };
  return map[id] ?? id.charAt(0).toUpperCase() + id.slice(1);
}
