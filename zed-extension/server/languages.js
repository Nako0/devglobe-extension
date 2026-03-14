'use strict';

const LANG_MAP = {
  '.js': 'JavaScript', '.mjs': 'JavaScript', '.cjs': 'JavaScript',
  '.ts': 'TypeScript', '.tsx': 'TypeScript', '.mts': 'TypeScript',
  '.jsx': 'JavaScript',
  '.py': 'Python', '.pyw': 'Python', '.pyi': 'Python',
  '.rs': 'Rust',
  '.go': 'Go',
  '.java': 'Java',
  '.kt': 'Kotlin', '.kts': 'Kotlin',
  '.c': 'C', '.h': 'C',
  '.cpp': 'C++', '.cxx': 'C++', '.cc': 'C++', '.hpp': 'C++',
  '.cs': 'C#',
  '.rb': 'Ruby', '.erb': 'Ruby',
  '.php': 'PHP',
  '.swift': 'Swift',
  '.dart': 'Dart',
  '.lua': 'Lua',
  '.r': 'R', '.R': 'R',
  '.scala': 'Scala',
  '.zig': 'Zig',
  '.nim': 'Nim',
  '.ex': 'Elixir', '.exs': 'Elixir',
  '.erl': 'Erlang',
  '.hs': 'Haskell',
  '.ml': 'OCaml', '.mli': 'OCaml',
  '.clj': 'Clojure', '.cljs': 'Clojure',
  '.v': 'V',
  '.sol': 'Solidity',
  '.sql': 'SQL',
  '.sh': 'Shell', '.bash': 'Shell', '.zsh': 'Shell',
  '.ps1': 'PowerShell',
  '.html': 'HTML', '.htm': 'HTML',
  '.css': 'CSS', '.scss': 'SCSS', '.sass': 'Sass', '.less': 'Less',
  '.json': 'JSON', '.jsonc': 'JSON',
  '.yaml': 'YAML', '.yml': 'YAML',
  '.toml': 'TOML',
  '.xml': 'XML',
  '.md': 'Markdown', '.mdx': 'Markdown',
  '.vue': 'Vue',
  '.svelte': 'Svelte',
  '.astro': 'Astro',
  '.tf': 'Terraform', '.hcl': 'HCL',
  '.graphql': 'GraphQL', '.gql': 'GraphQL',
  '.proto': 'Protocol Buffers',
};

function getLanguageFromExt(ext) {
  if (!ext) return null;
  const lower = ext.toLowerCase();
  if (LANG_MAP[lower]) return LANG_MAP[lower];
  // Check original case (for .R vs .r)
  if (LANG_MAP[ext]) return LANG_MAP[ext];
  // Fallback: capitalize without dot
  if (lower.length > 1) return lower.slice(1).charAt(0).toUpperCase() + lower.slice(2);
  return null;
}

module.exports = { getLanguageFromExt, LANG_MAP };
