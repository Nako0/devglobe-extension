import { extname } from 'path';

/**
 * Maps file extensions to language display names.
 * Uses the same names as the VS Code extension's LANG_MAP.
 */
const EXT_LANG: Record<string, string> = {
  // Web — frontend
  '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
  '.ts': 'TypeScript', '.mts': 'TypeScript', '.cts': 'TypeScript',
  '.jsx': 'React JSX', '.tsx': 'React TSX',
  '.vue': 'Vue', '.svelte': 'Svelte', '.astro': 'Astro',
  '.html': 'HTML', '.htm': 'HTML',
  '.css': 'CSS', '.sass': 'Sass', '.scss': 'SCSS', '.less': 'Less', '.styl': 'Stylus',
  '.graphql': 'GraphQL', '.gql': 'GraphQL', '.mdx': 'MDX',
  // Web — templating
  '.hbs': 'Handlebars', '.pug': 'Pug', '.jade': 'Pug', '.ejs': 'EJS',
  '.erb': 'ERB', '.haml': 'Haml', '.twig': 'Twig', '.blade.php': 'Blade',
  '.liquid': 'Liquid', '.mustache': 'Mustache', '.njk': 'Nunjucks',
  // Systems
  '.c': 'C', '.h': 'C',
  '.cpp': 'C++', '.cxx': 'C++', '.cc': 'C++', '.hpp': 'C++', '.hxx': 'C++',
  '.rs': 'Rust', '.go': 'Go', '.zig': 'Zig', '.d': 'D',
  '.v': 'V', '.odin': 'Odin', '.mojo': 'Mojo',
  // JVM
  '.java': 'Java', '.kt': 'Kotlin', '.kts': 'Kotlin',
  '.scala': 'Scala', '.sc': 'Scala', '.groovy': 'Groovy',
  // .NET
  '.cs': 'C#', '.fs': 'F#', '.fsx': 'F#', '.vb': 'Visual Basic',
  // Scripting
  '.py': 'Python', '.pyw': 'Python', '.pyi': 'Python',
  '.rb': 'Ruby', '.php': 'PHP',
  '.lua': 'Lua', '.pl': 'Perl', '.pm': 'Perl',
  '.r': 'R', '.R': 'R', '.jl': 'Julia', '.m': 'MATLAB',
  // Mobile / cross-platform
  '.swift': 'Swift', '.dart': 'Dart',
  '.mm': 'Objective-C++',
  // Functional
  '.hs': 'Haskell', '.lhs': 'Haskell',
  '.ex': 'Elixir', '.exs': 'Elixir', '.erl': 'Erlang', '.hrl': 'Erlang',
  '.ml': 'OCaml', '.mli': 'OCaml',
  '.elm': 'Elm', '.purs': 'PureScript',
  '.clj': 'Clojure', '.cljs': 'Clojure', '.cljc': 'Clojure',
  '.rkt': 'Racket', '.scm': 'Scheme', '.lisp': 'Common Lisp',
  '.pro': 'Prolog', '.gleam': 'Gleam', '.roc': 'Roc',
  '.idr': 'Idris', '.agda': 'Agda', '.lean': 'Lean',
  // Systems / low-level
  '.nim': 'Nim', '.cr': 'Crystal', '.hx': 'Haxe',
  '.ada': 'Ada', '.adb': 'Ada', '.ads': 'Ada',
  '.f90': 'Fortran', '.f95': 'Fortran', '.f03': 'Fortran',
  '.pas': 'Pascal', '.pp': 'Pascal',
  '.cob': 'COBOL', '.cbl': 'COBOL',
  '.vhd': 'VHDL', '.vhdl': 'VHDL',
  '.sv': 'SystemVerilog', '.svh': 'SystemVerilog',
  // Assembly / GPU
  '.asm': 'Assembly', '.s': 'Assembly',
  '.cu': 'CUDA', '.cuh': 'CUDA',
  '.glsl': 'GLSL', '.vert': 'GLSL', '.frag': 'GLSL',
  '.hlsl': 'HLSL', '.wgsl': 'WGSL', '.metal': 'Metal',
  // DevOps / infra
  '.sh': 'Bash', '.bash': 'Bash', '.zsh': 'Bash', '.fish': 'Fish',
  '.ps1': 'PowerShell', '.psm1': 'PowerShell',
  '.bat': 'Batch', '.cmd': 'Batch',
  '.tf': 'Terraform', '.tfvars': 'Terraform',
  '.nix': 'Nix',
  // Database
  '.sql': 'SQL', '.prisma': 'Prisma',
  // Smart contracts
  '.sol': 'Solidity', '.vy': 'Vyper',
  // Game dev
  '.gd': 'GDScript', '.gdshader': 'Godot Shader',
  // Config / data
  '.json': 'JSON', '.jsonc': 'JSON', '.jsonnet': 'Jsonnet',
  '.yaml': 'YAML', '.yml': 'YAML',
  '.toml': 'TOML', '.xml': 'XML', '.ini': 'INI',
  '.env': 'Env', '.properties': 'Properties',
  '.csv': 'CSV', '.tsv': 'TSV',
  '.cue': 'CUE', '.dhall': 'Dhall', '.pkl': 'Pkl',
  '.proto': 'Protobuf', '.thrift': 'Thrift', '.avro': 'Avro',
  // Documentation
  '.md': 'Markdown', '.rst': 'reStructuredText',
  '.tex': 'LaTeX', '.bib': 'BibTeX', '.typ': 'Typst',
  '.adoc': 'AsciiDoc', '.txt': 'Plain Text',
  // Misc
  '.coffee': 'CoffeeScript', '.tcl': 'Tcl',
};

/** Special filenames that map to a language. */
const NAME_LANG: Record<string, string> = {
  'Dockerfile': 'Docker',
  'docker-compose.yml': 'Docker Compose',
  'docker-compose.yaml': 'Docker Compose',
  'Makefile': 'Makefile',
  'CMakeLists.txt': 'CMake',
  'Justfile': 'Just',
  '.gitignore': 'Gitignore',
  '.editorconfig': 'EditorConfig',
};

/** Detect the programming language from a file path. */
export function langFromPath(filePath: string): string | null {
  // Check special filenames first
  const base = filePath.split('/').pop() || '';
  if (base in NAME_LANG) return NAME_LANG[base];

  // Check compound extensions (e.g. .blade.php, .d.ts, .test.ts) before
  // falling back to extname(), which only returns the last segment.
  const lowerBase = base.toLowerCase();
  for (const key of Object.keys(EXT_LANG)) {
    if (key.startsWith('.') && key.includes('.', 1) && lowerBase.endsWith(key)) {
      return EXT_LANG[key];
    }
  }

  const ext = extname(base).toLowerCase();
  if (!ext) return null;

  return EXT_LANG[ext] ?? null;
}
