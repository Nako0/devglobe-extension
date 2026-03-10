"use strict";

// src/commands.ts
var import_fs = require("fs");
var import_https = require("https");
var import_http = require("http");
var import_os = require("os");
var import_path = require("path");
var SUPABASE_URL = "https://kzcrtlbspkhlnjillhyz.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3J0bGJzcGtobG5qaWxsaHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzY3NTYsImV4cCI6MjA4ODIxMjc1Nn0.JvJraoxuffHe5VMQu763hROGXNot9XKFY54X6-Ko-bk";
var DEVGLOBE_DIR = (0, import_path.join)((0, import_os.homedir)(), ".devglobe");
var API_KEY_PATH = (0, import_path.join)(DEVGLOBE_DIR, "api_key");
var CONFIG_PATH = (0, import_path.join)(DEVGLOBE_DIR, "config.json");
var FETCH_TIMEOUT = 1e4;
async function main() {
  const raw = (0, import_fs.readFileSync)(0, "utf-8");
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }
  const prompt = input.user_prompt?.trim() ?? "";
  let result;
  if (prompt.startsWith("/devglobe-setup")) {
    result = await handleSetup(prompt);
  } else if (prompt.startsWith("/devglobe-status")) {
    result = await handleStatus(prompt);
  } else {
    result = { decision: "allow" };
  }
  process.stdout.write(JSON.stringify(result));
}
function parseSetupArgs(raw) {
  const tokens = raw.split(/\s+/).filter(Boolean);
  const flags = [];
  let apiKey = null;
  for (const t of tokens) {
    if (t.startsWith("--")) {
      flags.push(t);
    } else if (!apiKey) {
      apiKey = t;
    }
  }
  return { apiKey, flags };
}
async function handleSetup(prompt) {
  const raw = prompt.replace("/devglobe-setup", "").trim();
  const { apiKey, flags } = parseSetupArgs(raw);
  const hasShareRepo = flags.includes("--share-repo");
  const hasAnonymous = flags.includes("--anonymous");
  const hasFlags = hasShareRepo || hasAnonymous;
  if (!apiKey && !hasFlags) {
    return {
      decision: "block",
      reason: [
        "DevGlobe \u2014 API key required.",
        "",
        "Usage: /devglobe-setup YOUR_API_KEY [--share-repo] [--anonymous]",
        "",
        "Options:",
        "  --share-repo   Display your repo name on the globe",
        "  --anonymous    Randomize your location within your country",
        "",
        "Update settings later:  /devglobe-setup --share-repo",
        "Set a status message:   /devglobe-status Your message here",
        "",
        "Get your API key at https://devglobe.xyz (profile settings).",
        "Need help? contact@devglobe.xyz"
      ].join("\n")
    };
  }
  if (!(0, import_fs.existsSync)(DEVGLOBE_DIR)) {
    (0, import_fs.mkdirSync)(DEVGLOBE_DIR, { recursive: true });
  }
  if (apiKey) {
    (0, import_fs.writeFileSync)(API_KEY_PATH, apiKey);
  }
  const existingKey = apiKey ?? getApiKey();
  if (!existingKey && hasFlags) {
    return {
      decision: "block",
      reason: [
        "DevGlobe \u2014 no API key configured.",
        "",
        "Run /devglobe-setup YOUR_API_KEY first.",
        "Get your API key at https://devglobe.xyz (profile settings)."
      ].join("\n")
    };
  }
  const config = getConfig();
  if (apiKey && !hasFlags) {
    config.shareRepo = config.shareRepo ?? false;
    config.anonymousMode = config.anonymousMode ?? false;
  }
  if (hasShareRepo) {
    config.shareRepo = !(config.shareRepo === true);
  }
  if (hasAnonymous) {
    config.anonymousMode = !(config.anonymousMode === true);
  }
  (0, import_fs.writeFileSync)(CONFIG_PATH, JSON.stringify(config, null, 2));
  const lines = [];
  if (apiKey) {
    lines.push(
      "DevGlobe configured successfully!",
      "",
      "API key saved to ~/.devglobe/api_key"
    );
  }
  lines.push(
    ...apiKey ? [""] : [],
    "Current settings (~/.devglobe/config.json):",
    `  shareRepo:     ${config.shareRepo ?? false}`,
    `  anonymousMode: ${config.anonymousMode ?? false}`
  );
  if (apiKey) {
    lines.push(
      "",
      "You are now live on the DevGlobe map (https://devglobe.xyz).",
      "",
      "Toggle settings anytime:",
      "  /devglobe-setup --share-repo    toggle repo sharing",
      "  /devglobe-setup --anonymous     toggle anonymous mode",
      "",
      "Set a status message: /devglobe-status Your message here"
    );
  } else {
    lines.push(
      "",
      hasShareRepo ? `Repo sharing ${config.shareRepo ? "enabled" : "disabled"}.` : "",
      hasAnonymous ? `Anonymous mode ${config.anonymousMode ? "enabled" : "disabled"}.` : ""
    );
  }
  return {
    decision: "block",
    reason: lines.filter((l) => l !== void 0).join("\n")
  };
}
async function handleStatus(prompt) {
  const message = prompt.replace("/devglobe-status", "").trim();
  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      decision: "block",
      reason: [
        "DevGlobe \u2014 no API key configured.",
        "",
        "Run /devglobe-setup YOUR_API_KEY first.",
        "Get your API key at https://devglobe.xyz (profile settings)."
      ].join("\n")
    };
  }
  if (!message) {
    return {
      decision: "block",
      reason: [
        "DevGlobe \u2014 status message required.",
        "",
        "Usage: /devglobe-status Your message here",
        "Max 100 characters. Leave empty to clear."
      ].join("\n")
    };
  }
  if (message.length > 100) {
    return {
      decision: "block",
      reason: `DevGlobe \u2014 status message too long (${message.length}/100 characters).`
    };
  }
  try {
    await updateStatusMessage(apiKey, message);
    const config = getConfig();
    config.statusMessage = message;
    (0, import_fs.writeFileSync)(CONFIG_PATH, JSON.stringify(config, null, 2));
    return {
      decision: "block",
      reason: `DevGlobe \u2014 status updated: "${message}"`
    };
  } catch (err) {
    return {
      decision: "block",
      reason: [
        "DevGlobe \u2014 failed to update status.",
        "",
        `Error: ${err instanceof Error ? err.message : "Unknown error"}`,
        "Check your API key or try again. Need help? contact@devglobe.xyz"
      ].join("\n")
    };
  }
}
function getApiKey() {
  const envKey = process.env.DEVGLOBE_API_KEY;
  if (envKey?.trim()) return envKey.trim();
  try {
    const key = (0, import_fs.readFileSync)(API_KEY_PATH, "utf-8").trim();
    if (key) return key;
  } catch {
  }
  return null;
}
function getConfig() {
  try {
    return JSON.parse((0, import_fs.readFileSync)(CONFIG_PATH, "utf-8"));
  } catch {
    return {};
  }
}
function updateStatusMessage(apiKey, message) {
  const body = JSON.stringify({ p_key: apiKey, p_message: message });
  const url = `${SUPABASE_URL}/rest/v1/rpc/update_status_message`;
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? import_https.request : import_http.request;
    const req = mod(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "Content-Length": Buffer.byteLength(body).toString()
        },
        timeout: FETCH_TIMEOUT
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(Buffer.concat(chunks).toString());
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.write(body);
    req.end();
  });
}
main().catch(() => process.exit(0));
