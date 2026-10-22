import type { Hooks, PluginInput, PluginModule, PluginOptions } from "@opencode-ai/plugin";
import type { Plugin } from "@opencode/plugin";
import { runOneshotInMemory, type OneshotState } from "../../devglobe-core/src/oneshot";
import { langFromPath } from "../../devglobe-core/src/language";
import { setApiKey, loadConfig, configPath } from "../../devglobe-core/src/config";
import { sendStatus } from "../../devglobe-core/src/heartbeat";

const PLUGIN_VERSION = "2.1.0";

const SETUP_DESCRIPTION =
  "Configure DevGlobe with an API key. Get your key at https://devglobe.app/dashboard/settings.";
const STATUS_DESCRIPTION =
  "Set a status message on your DevGlobe profile, visible on the globe next to your avatar.";
const CHECK_DESCRIPTION = "Check DevGlobe installation status — API key and config.";

function extractFilePath(toolName: string, args: any, title: string | undefined, metadata: any): string | null {
  if (metadata?.filediff?.file) return metadata.filediff.file;
  if (metadata?.filepath) return metadata.filepath;
  if (metadata?.filePath) return metadata.filePath;
  if (args?.file_path) return args.file_path;
  if (args?.filePath) return args.filePath;
  if (args?.path) return args.path;
  if (toolName === "read" && title) return title;

  if (metadata?.results) {
    for (const r of metadata.results) {
      if (r.filediff?.file) return r.filediff.file;
    }
  }

  return null;
}

function createHeartbeat(directory: string) {
  // Per-instance state in the plugin closure — no shared file, no contention
  // when multiple OpenCode processes run in parallel. Each process rate-limits
  // and dedups independently. Server-side rate-limiting handles cross-process
  // bursts.
  const state: OneshotState = {};

  return async function heartbeat(filePath: string | null, force: boolean): Promise<void> {
    const language = filePath ? langFromPath(filePath) ?? undefined : undefined;

    try {
      await runOneshotInMemory(
        {
          file: filePath ?? undefined,
          cwd: directory,
          editor: "opencode",
          language,
          pluginVersion: PLUGIN_VERSION,
          force,
        },
        state,
      );
    } catch {
      // Errors are already logged by devglobe-core; swallow here so plugin
      // handlers never crash the OpenCode session.
    }
  };
}

function setupDevGlobe(apiKey: string): string {
  if (!apiKey?.trim()) return "Error: API key is required.";
  setApiKey(apiKey.trim());
  return `DevGlobe configured! API key saved to ${configPath()}. Heartbeats will be sent automatically while you code.`;
}

async function setDevGlobeStatus(message: string): Promise<string> {
  const cfg = loadConfig();
  if (!cfg.apiKey) return "Error: No API key configured. Run devglobe_setup first.";

  try {
    await sendStatus(cfg.apiKey, message);
    return `Status updated: "${message}"`;
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : "unknown"}`;
  }
}

function checkDevGlobe(): string {
  const cfg = loadConfig();
  const lines: string[] = ["=== DevGlobe Status ==="];
  lines.push(`Config: ${configPath()}`);
  lines.push(`API key: ${cfg.apiKey ? cfg.apiKey.substring(0, 15) + "... OK" : "NOT SET"}`);
  lines.push(`Debug logging: ${cfg.debug ? "on" : "off"}`);
  lines.push(`Privacy:`);
  lines.push(`  hide_file_names = ${cfg.privacy.hideFileNames}`);
  lines.push(`  hide_branch_names = ${cfg.privacy.hideBranchNames}`);
  lines.push(`  hide_project_names = ${cfg.privacy.hideProjectNames}`);
  lines.push(`Editor: opencode`);
  lines.push(``);
  lines.push(
    `Visibility settings (anonymous mode, repo sharing on the live globe, profile mode) are managed at https://devglobe.app/dashboard/settings`,
  );
  return lines.join("\n");
}

const apiKeySchema = {
  type: "object",
  properties: {
    api_key: { type: "string", description: "Your DevGlobe API key" },
  },
  required: ["api_key"],
  additionalProperties: false,
} as const;

const statusSchema = {
  type: "object",
  properties: {
    message: { type: "string", description: "Status message (max 100 characters)" },
  },
  required: ["message"],
  additionalProperties: false,
} as const;

const emptySchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

const v2Plugin: Plugin.Plugin = {
  id: "devglobe",
  async setup(ctx) {
    const directory = ctx.location.directory;
    const heartbeat = createHeartbeat(directory);

    await ctx.tool.transform((editor) => {
      editor.add({
        name: "devglobe_setup",
        description: SETUP_DESCRIPTION,
        input: apiKeySchema,
        async execute(input) {
          return { content: setupDevGlobe((input as { api_key: string }).api_key) };
        },
      });

      editor.add({
        name: "devglobe_status",
        description: STATUS_DESCRIPTION,
        input: statusSchema,
        async execute(input) {
          return { content: await setDevGlobeStatus((input as { message: string }).message) };
        },
      });

      editor.add({
        name: "devglobe_check",
        description: CHECK_DESCRIPTION,
        input: emptySchema,
        async execute() {
          return { content: checkDevGlobe() };
        },
      });
    });

    await ctx.tool.hook("execute.after", (event) => {
      const metadata = event.status === "completed" ? event.result.metadata : undefined;
      void heartbeat(extractFilePath(event.tool, event.input, undefined, metadata), false);
    });

    const controller = new AbortController();
    void (async () => {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        // The event stream is global; ignore sessions from other projects.
        if (event.location?.directory !== directory) continue;
        if (event.type === "session.idle" || event.type === "session.deleted") {
          await heartbeat(null, true);
        }
      }
    })().catch(() => {});

    return () => controller.abort();
  },
};

async function legacyPlugin(input: PluginInput, _options?: PluginOptions): Promise<Hooks> {
  const heartbeat = createHeartbeat(input.directory);
  // Loaded lazily so V2 hosts never need the V1 SDK package.
  const { tool } = await import("@opencode-ai/plugin/tool");
  const z = tool.schema;

  return {
    tool: {
      devglobe_setup: tool({
        description: SETUP_DESCRIPTION,
        args: {
          api_key: z.string().describe("Your DevGlobe API key"),
        },
        async execute(args) {
          return setupDevGlobe(args.api_key);
        },
      }),

      devglobe_status: tool({
        description: STATUS_DESCRIPTION,
        args: {
          message: z.string().describe("Status message (max 100 characters)"),
        },
        async execute(args) {
          return setDevGlobeStatus(args.message);
        },
      }),

      devglobe_check: tool({
        description: CHECK_DESCRIPTION,
        args: {},
        async execute() {
          return checkDevGlobe();
        },
      }),
    },

    "tool.execute.after": async (hookInput, output) => {
      const filePath = extractFilePath(hookInput.tool, hookInput.args, output.title, output.metadata);
      void heartbeat(filePath, false);
    },

    event: async ({ event }) => {
      if (event.type === "file.edited") {
        const filePath = (event.properties as any)?.file ?? null;
        // A 15s network timeout must not hold up OpenCode's file events.
        void heartbeat(filePath, false);
      }
      if (event.type === "session.idle" || event.type === "session.deleted") {
        await heartbeat(null, true);
      }
    },
  };
}

const legacyModule: PluginModule = {
  id: "devglobe",
  server: legacyPlugin,
};

export default {
  ...v2Plugin,
  server: legacyModule.server,
};
