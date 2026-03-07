import * as vscode from 'vscode';

/**
 * Maps VS Code language IDs to human-readable display names.
 * Unknown languages fall through to the auto-capitalize fallback.
 */
const LANG_MAP: Record<string, string> = {
    // Web — frontend
    javascript: 'JavaScript', typescript: 'TypeScript',
    javascriptreact: 'React JSX', typescriptreact: 'React TSX',
    vue: 'Vue', svelte: 'Svelte', astro: 'Astro', angular: 'Angular',
    html: 'HTML', css: 'CSS', sass: 'Sass', scss: 'SCSS', less: 'Less', stylus: 'Stylus',
    graphql: 'GraphQL', mdx: 'MDX',
    // Web — templating
    handlebars: 'Handlebars', pug: 'Pug', jade: 'Pug', ejs: 'EJS',
    erb: 'ERB', haml: 'Haml', twig: 'Twig', blade: 'Blade',
    'django-html': 'Django', jinja: 'Jinja', liquid: 'Liquid', mustache: 'Mustache',
    razor: 'Razor', nunjucks: 'Nunjucks',
    // Systems
    c: 'C', cpp: 'C++', rust: 'Rust', go: 'Go', zig: 'Zig', d: 'D',
    v: 'V', odin: 'Odin', carbon: 'Carbon', mojo: 'Mojo',
    // JVM
    java: 'Java', kotlin: 'Kotlin', scala: 'Scala', groovy: 'Groovy',
    // .NET
    csharp: 'C#', fsharp: 'F#', vb: 'Visual Basic',
    // Scripting
    python: 'Python', ruby: 'Ruby', php: 'PHP', lua: 'Lua', perl: 'Perl',
    r: 'R', julia: 'Julia', matlab: 'MATLAB',
    // Mobile / cross-platform
    swift: 'Swift', dart: 'Dart', 'objective-c': 'Objective-C', 'objective-cpp': 'Objective-C++',
    // Functional
    haskell: 'Haskell', elixir: 'Elixir', erlang: 'Erlang', ocaml: 'OCaml',
    elm: 'Elm', purescript: 'PureScript', clojure: 'Clojure', racket: 'Racket',
    scheme: 'Scheme', commonlisp: 'Common Lisp', prolog: 'Prolog',
    gleam: 'Gleam', roc: 'Roc', idris: 'Idris', agda: 'Agda', lean: 'Lean', coq: 'Coq',
    // Systems / low-level
    nim: 'Nim', crystal: 'Crystal', haxe: 'Haxe',
    ada: 'Ada', fortran: 'Fortran', pascal: 'Pascal', cobol: 'COBOL',
    vhdl: 'VHDL', verilog: 'Verilog', systemverilog: 'SystemVerilog',
    // Assembly / GPU
    asm: 'Assembly', 'arm64': 'ARM64', cuda: 'CUDA',
    glsl: 'GLSL', hlsl: 'HLSL', wgsl: 'WGSL', metal: 'Metal', shaderlab: 'ShaderLab',
    // DevOps / infra
    shellscript: 'Bash', powershell: 'PowerShell', fish: 'Fish', bat: 'Batch',
    terraform: 'Terraform', bicep: 'Bicep', pulumi: 'Pulumi',
    nix: 'Nix', ansible: 'Ansible', puppet: 'Puppet',
    dockerfile: 'Docker', 'docker-compose': 'Docker Compose',
    makefile: 'Makefile', cmake: 'CMake', just: 'Just', meson: 'Meson',
    // Database
    sql: 'SQL', plsql: 'PL/SQL', mysql: 'MySQL', pgsql: 'PostgreSQL',
    mongodb: 'MongoDB', redis: 'Redis', cypher: 'Cypher', sparql: 'SPARQL',
    prisma: 'Prisma',
    // Smart contracts / blockchain
    solidity: 'Solidity', vyper: 'Vyper', move: 'Move', cairo: 'Cairo',
    // Game dev
    gdscript: 'GDScript', 'gdresource': 'Godot Resource', 'gdshader': 'Godot Shader',
    // Config / data
    json: 'JSON', jsonc: 'JSON', jsonnet: 'Jsonnet',
    yaml: 'YAML', toml: 'TOML', xml: 'XML', ini: 'INI',
    dotenv: 'Env', properties: 'Properties',
    csv: 'CSV', tsv: 'TSV',
    cue: 'CUE', dhall: 'Dhall', pkl: 'Pkl',
    proto: 'Protobuf', protobuf: 'Protobuf', thrift: 'Thrift', avro: 'Avro',
    // Documentation / prose
    markdown: 'Markdown', restructuredtext: 'reStructuredText',
    latex: 'LaTeX', tex: 'LaTeX', bibtex: 'BibTeX', typst: 'Typst',
    asciidoc: 'AsciiDoc', plaintext: 'Plain Text',
    // Misc
    coffeescript: 'CoffeeScript', tcl: 'Tcl', awk: 'AWK', sed: 'Sed',
    regex: 'Regex', diff: 'Diff', 'git-commit': 'Git Commit', 'git-rebase': 'Git Rebase',
    ignore: 'Gitignore', editorconfig: 'EditorConfig',
    http: 'HTTP', ssh_config: 'SSH Config',
    log: 'Log',
};

/**
 * Returns the display name for the language in the currently active editor,
 * or null if no editor is open.
 */
export function getActiveLanguage(): string | null {
    const editor = vscode.window.activeTextEditor;
    if (!editor) return null;

    const id = editor.document.languageId;
    if (id in LANG_MAP) return LANG_MAP[id];

    // Unknown language: capitalize first letter so it looks intentional
    return id.charAt(0).toUpperCase() + id.slice(1);
}
