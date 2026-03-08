"use strict";

// src/index.ts
var import_fs = require("fs");
var import_child_process = require("child_process");
var import_https = require("https");
var import_http = require("http");
var import_os = require("os");
var import_path2 = require("path");

// src/lang.ts
var import_path = require("path");
var EXT_LANG = {
  // Web — frontend
  ".js": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".ts": "TypeScript",
  ".mts": "TypeScript",
  ".cts": "TypeScript",
  ".jsx": "React JSX",
  ".tsx": "React TSX",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".astro": "Astro",
  ".html": "HTML",
  ".htm": "HTML",
  ".css": "CSS",
  ".sass": "Sass",
  ".scss": "SCSS",
  ".less": "Less",
  ".styl": "Stylus",
  ".graphql": "GraphQL",
  ".gql": "GraphQL",
  ".mdx": "MDX",
  // Web — templating
  ".hbs": "Handlebars",
  ".pug": "Pug",
  ".jade": "Pug",
  ".ejs": "EJS",
  ".erb": "ERB",
  ".haml": "Haml",
  ".twig": "Twig",
  ".blade.php": "Blade",
  ".liquid": "Liquid",
  ".mustache": "Mustache",
  ".njk": "Nunjucks",
  // Systems
  ".c": "C",
  ".h": "C",
  ".cpp": "C++",
  ".cxx": "C++",
  ".cc": "C++",
  ".hpp": "C++",
  ".hxx": "C++",
  ".rs": "Rust",
  ".go": "Go",
  ".zig": "Zig",
  ".d": "D",
  ".v": "V",
  ".odin": "Odin",
  ".mojo": "Mojo",
  // JVM
  ".java": "Java",
  ".kt": "Kotlin",
  ".kts": "Kotlin",
  ".scala": "Scala",
  ".sc": "Scala",
  ".groovy": "Groovy",
  // .NET
  ".cs": "C#",
  ".fs": "F#",
  ".fsx": "F#",
  ".vb": "Visual Basic",
  // Scripting
  ".py": "Python",
  ".pyw": "Python",
  ".pyi": "Python",
  ".rb": "Ruby",
  ".php": "PHP",
  ".lua": "Lua",
  ".pl": "Perl",
  ".pm": "Perl",
  ".r": "R",
  ".R": "R",
  ".jl": "Julia",
  ".m": "MATLAB",
  // Mobile / cross-platform
  ".swift": "Swift",
  ".dart": "Dart",
  ".mm": "Objective-C++",
  // Functional
  ".hs": "Haskell",
  ".lhs": "Haskell",
  ".ex": "Elixir",
  ".exs": "Elixir",
  ".erl": "Erlang",
  ".hrl": "Erlang",
  ".ml": "OCaml",
  ".mli": "OCaml",
  ".elm": "Elm",
  ".purs": "PureScript",
  ".clj": "Clojure",
  ".cljs": "Clojure",
  ".cljc": "Clojure",
  ".rkt": "Racket",
  ".scm": "Scheme",
  ".lisp": "Common Lisp",
  ".pro": "Prolog",
  ".gleam": "Gleam",
  ".roc": "Roc",
  ".idr": "Idris",
  ".agda": "Agda",
  ".lean": "Lean",
  // Systems / low-level
  ".nim": "Nim",
  ".cr": "Crystal",
  ".hx": "Haxe",
  ".ada": "Ada",
  ".adb": "Ada",
  ".ads": "Ada",
  ".f90": "Fortran",
  ".f95": "Fortran",
  ".f03": "Fortran",
  ".pas": "Pascal",
  ".pp": "Pascal",
  ".cob": "COBOL",
  ".cbl": "COBOL",
  ".vhd": "VHDL",
  ".vhdl": "VHDL",
  ".sv": "SystemVerilog",
  ".svh": "SystemVerilog",
  // Assembly / GPU
  ".asm": "Assembly",
  ".s": "Assembly",
  ".cu": "CUDA",
  ".cuh": "CUDA",
  ".glsl": "GLSL",
  ".vert": "GLSL",
  ".frag": "GLSL",
  ".hlsl": "HLSL",
  ".wgsl": "WGSL",
  ".metal": "Metal",
  // DevOps / infra
  ".sh": "Bash",
  ".bash": "Bash",
  ".zsh": "Bash",
  ".fish": "Fish",
  ".ps1": "PowerShell",
  ".psm1": "PowerShell",
  ".bat": "Batch",
  ".cmd": "Batch",
  ".tf": "Terraform",
  ".tfvars": "Terraform",
  ".nix": "Nix",
  // Database
  ".sql": "SQL",
  ".prisma": "Prisma",
  // Smart contracts
  ".sol": "Solidity",
  ".vy": "Vyper",
  // Game dev
  ".gd": "GDScript",
  ".gdshader": "Godot Shader",
  // Config / data
  ".json": "JSON",
  ".jsonc": "JSON",
  ".jsonnet": "Jsonnet",
  ".yaml": "YAML",
  ".yml": "YAML",
  ".toml": "TOML",
  ".xml": "XML",
  ".ini": "INI",
  ".env": "Env",
  ".properties": "Properties",
  ".csv": "CSV",
  ".tsv": "TSV",
  ".cue": "CUE",
  ".dhall": "Dhall",
  ".pkl": "Pkl",
  ".proto": "Protobuf",
  ".thrift": "Thrift",
  ".avro": "Avro",
  // Documentation
  ".md": "Markdown",
  ".rst": "reStructuredText",
  ".tex": "LaTeX",
  ".bib": "BibTeX",
  ".typ": "Typst",
  ".adoc": "AsciiDoc",
  ".txt": "Plain Text",
  // Misc
  ".coffee": "CoffeeScript",
  ".tcl": "Tcl"
};
var NAME_LANG = {
  "Dockerfile": "Docker",
  "docker-compose.yml": "Docker Compose",
  "docker-compose.yaml": "Docker Compose",
  "Makefile": "Makefile",
  "CMakeLists.txt": "CMake",
  "Justfile": "Just",
  ".gitignore": "Gitignore",
  ".editorconfig": "EditorConfig"
};
function langFromPath(filePath) {
  const base = filePath.split("/").pop() || "";
  if (base in NAME_LANG) return NAME_LANG[base];
  const ext = (0, import_path.extname)(base);
  if (!ext) return null;
  return EXT_LANG[ext] ?? null;
}

// src/index.ts
var SUPABASE_URL = "https://kzcrtlbspkhlnjillhyz.supabase.co";
var SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt6Y3J0bGJzcGtobG5qaWxsaHl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzY3NTYsImV4cCI6MjA4ODIxMjc1Nn0.JvJraoxuffHe5VMQu763hROGXNot9XKFY54X6-Ko-bk";
var RATE_LIMIT_MS = 6e4;
var GEO_CACHE_TTL = 60 * 60 * 1e3;
var FETCH_TIMEOUT = 1e4;
var GEO_CACHE_PATH = (0, import_path2.join)((0, import_os.tmpdir)(), "devglobe-geo-cache.json");
async function main() {
  const raw = (0, import_fs.readFileSync)(0, "utf-8");
  let input;
  try {
    input = JSON.parse(raw);
  } catch {
    return;
  }
  const { transcript_path, cwd, hook_event_name } = input;
  const apiKey = getApiKey();
  if (!apiKey) return;
  const statePath = `${transcript_path}.devglobe`;
  const state = readState(statePath);
  const now = Date.now();
  let language = null;
  if (hook_event_name === "PostToolUse") {
    const filePath2 = input.tool_input?.file_path || input.tool_response?.filePath;
    if (filePath2) {
      language = langFromPath(filePath2);
    }
  }
  if (!language && state.lastLanguage) {
    language = state.lastLanguage;
  }
  const languageChanged = language && language !== state.lastLanguage;
  if (hook_event_name !== "Stop" && !languageChanged && state.lastHeartbeatAt) {
    if (now - state.lastHeartbeatAt < RATE_LIMIT_MS) return;
  }
  let repo = null;
  const filePath = input.tool_input?.file_path || input.tool_response?.filePath;
  const gitDirs = filePath ? [(0, import_path2.dirname)(filePath), cwd] : [cwd];
  for (const dir of gitDirs) {
    try {
      const url = (0, import_child_process.execSync)("git remote get-url origin", {
        cwd: dir,
        timeout: 5e3,
        stdio: ["pipe", "pipe", "pipe"]
      }).toString().trim();
      repo = parseRepoUrl(url);
      if (repo) break;
    } catch {
    }
  }
  const config = getConfig();
  const geo = await getGeoLocation();
  const body = JSON.stringify({
    p_key: apiKey,
    ...language && { p_lang: language },
    ...repo && { p_repo: repo },
    p_share_repo: config.shareRepo ?? false,
    p_editor: "claude-code",
    ...geo?.city && { p_city: geo.city },
    ...geo?.lat != null && { p_lat: geo.lat },
    ...geo?.lon != null && { p_lng: geo.lon }
  });
  try {
    await httpPost(`${SUPABASE_URL}/functions/v1/heartbeat`, body, {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`
    });
  } catch {
    return;
  }
  writeState(statePath, { lastHeartbeatAt: now, lastLanguage: language });
}
function getApiKey() {
  const envKey = process.env.DEVGLOBE_API_KEY;
  if (envKey?.trim()) return envKey.trim();
  const configPath = (0, import_path2.join)((0, import_os.homedir)(), ".devglobe", "api_key");
  try {
    const key = (0, import_fs.readFileSync)(configPath, "utf-8").trim();
    if (key) return key;
  } catch {
  }
  return null;
}
function getConfig() {
  const configPath = (0, import_path2.join)((0, import_os.homedir)(), ".devglobe", "config.json");
  try {
    return JSON.parse((0, import_fs.readFileSync)(configPath, "utf-8"));
  } catch {
    return {};
  }
}
function readState(path) {
  try {
    return JSON.parse((0, import_fs.readFileSync)(path, "utf-8"));
  } catch {
    return {};
  }
}
function writeState(path, state) {
  try {
    (0, import_fs.writeFileSync)(path, JSON.stringify(state));
  } catch {
  }
}
function parseRepoUrl(url) {
  const sshMatch = url.match(/[@/]([^:/]+)[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  if (sshMatch) return sshMatch[2];
  try {
    const u = new URL(url);
    const parts = u.pathname.replace(/\.git$/, "").replace(/^\//, "");
    if (parts.includes("/")) return parts;
  } catch {
  }
  return null;
}
async function getGeoLocation() {
  try {
    const cached = JSON.parse((0, import_fs.readFileSync)(GEO_CACHE_PATH, "utf-8"));
    if (cached.fetchedAt && Date.now() - cached.fetchedAt < GEO_CACHE_TTL) {
      return cached;
    }
  } catch {
  }
  let geo = await fetchGeo(
    "https://freeipapi.com/api/json",
    (d) => ({
      city: d.cityName && d.countryName ? `${d.cityName}, ${d.countryName}` : null,
      lat: roundCoord(d.latitude),
      lon: roundCoord(d.longitude),
      fetchedAt: Date.now()
    })
  );
  if (!geo) {
    geo = await fetchGeo(
      "https://ipapi.co/json/",
      (d) => ({
        city: d.city && d.country_name ? `${d.city}, ${d.country_name}` : null,
        lat: roundCoord(d.latitude),
        lon: roundCoord(d.longitude),
        fetchedAt: Date.now()
      })
    );
  }
  if (geo) {
    try {
      (0, import_fs.writeFileSync)(GEO_CACHE_PATH, JSON.stringify(geo));
    } catch {
    }
  }
  return geo;
}
function roundCoord(v) {
  if (typeof v !== "number" || !isFinite(v)) return null;
  return Math.round(v * 10) / 10;
}
async function fetchGeo(url, parse) {
  try {
    const raw = await httpGet(url);
    const data = JSON.parse(raw);
    const result = parse(data);
    if (result.lat == null || result.lon == null) return null;
    return result;
  } catch {
    return null;
  }
}
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? import_https.request : import_http.request;
    const req = mod(url, { method: "GET", timeout: FETCH_TIMEOUT }, (res) => {
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve(Buffer.concat(chunks).toString());
        } else {
          reject(new Error(`HTTP ${res.statusCode}`));
        }
      });
    });
    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("timeout"));
    });
    req.end();
  });
}
function httpPost(url, body, headers) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const mod = u.protocol === "https:" ? import_https.request : import_http.request;
    const req = mod(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method: "POST",
        headers: { ...headers, "Content-Length": Buffer.byteLength(body).toString() },
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
