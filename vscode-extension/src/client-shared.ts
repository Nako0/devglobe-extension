import * as vscode from 'vscode';

export interface TrackerState {
    connected: boolean;
    tracking: boolean;
    codingTime: string;
    language: string | null;
    shareRepo: boolean;
    anonymousMode: boolean;
    statusMessage: string;
    offline: boolean;
}

export interface DevGlobeClient extends vscode.Disposable {
    getState(): TrackerState;
    init(apiKey: string, config: vscode.WorkspaceConfiguration): void;
    start(): void;
    pause(): void;
    activity(filePath: string, cwd: string, language?: string): void;
    setConfig(key: string, value: boolean): void;
    setStatus(message: string): void;
    reset(): void;
    updatePreference(key: keyof TrackerState, value: boolean): void;
}

export const DEFAULT_STATE: TrackerState = {
    connected: false,
    tracking: false,
    codingTime: '0m',
    language: null,
    shareRepo: false,
    anonymousMode: false,
    statusMessage: '',
    offline: false,
};

const LANG_MAP: Record<string, string> = {
    javascript: 'JavaScript', typescript: 'TypeScript',
    javascriptreact: 'React JSX', typescriptreact: 'React TSX',
    vue: 'Vue', svelte: 'Svelte', astro: 'Astro', angular: 'Angular',
    html: 'HTML', css: 'CSS', sass: 'Sass', scss: 'SCSS', less: 'Less', stylus: 'Stylus',
    graphql: 'GraphQL', mdx: 'MDX',
    handlebars: 'Handlebars', pug: 'Pug', jade: 'Pug', ejs: 'EJS',
    erb: 'ERB', haml: 'Haml', twig: 'Twig', blade: 'Blade',
    'django-html': 'Django', jinja: 'Jinja', liquid: 'Liquid', mustache: 'Mustache',
    razor: 'Razor', nunjucks: 'Nunjucks',
    c: 'C', cpp: 'C++', rust: 'Rust', go: 'Go', zig: 'Zig', d: 'D',
    v: 'V', odin: 'Odin', carbon: 'Carbon', mojo: 'Mojo',
    java: 'Java', kotlin: 'Kotlin', scala: 'Scala', groovy: 'Groovy',
    csharp: 'C#', fsharp: 'F#', vb: 'Visual Basic',
    python: 'Python', ruby: 'Ruby', php: 'PHP', lua: 'Lua', perl: 'Perl',
    r: 'R', julia: 'Julia', matlab: 'MATLAB',
    swift: 'Swift', dart: 'Dart', 'objective-c': 'Objective-C', 'objective-cpp': 'Objective-C++',
    haskell: 'Haskell', elixir: 'Elixir', erlang: 'Erlang', ocaml: 'OCaml',
    elm: 'Elm', purescript: 'PureScript', clojure: 'Clojure', racket: 'Racket',
    scheme: 'Scheme', commonlisp: 'Common Lisp', prolog: 'Prolog',
    gleam: 'Gleam', roc: 'Roc', idris: 'Idris', agda: 'Agda', lean: 'Lean', coq: 'Coq',
    nim: 'Nim', crystal: 'Crystal', haxe: 'Haxe',
    ada: 'Ada', fortran: 'Fortran', pascal: 'Pascal', cobol: 'COBOL',
    vhdl: 'VHDL', verilog: 'Verilog', systemverilog: 'SystemVerilog',
    asm: 'Assembly', 'arm64': 'ARM64', cuda: 'CUDA',
    glsl: 'GLSL', hlsl: 'HLSL', wgsl: 'WGSL', metal: 'Metal', shaderlab: 'ShaderLab',
    shellscript: 'Bash', powershell: 'PowerShell', fish: 'Fish', bat: 'Batch',
    terraform: 'Terraform', bicep: 'Bicep', pulumi: 'Pulumi',
    nix: 'Nix', ansible: 'Ansible', puppet: 'Puppet',
    dockerfile: 'Docker', 'docker-compose': 'Docker Compose',
    makefile: 'Makefile', cmake: 'CMake', just: 'Just', meson: 'Meson',
    sql: 'SQL', plsql: 'PL/SQL', mysql: 'MySQL', pgsql: 'PostgreSQL',
    mongodb: 'MongoDB', redis: 'Redis', cypher: 'Cypher', sparql: 'SPARQL',
    prisma: 'Prisma',
    solidity: 'Solidity', vyper: 'Vyper', move: 'Move', cairo: 'Cairo',
    gdscript: 'GDScript', 'gdresource': 'Godot Resource', 'gdshader': 'Godot Shader',
    json: 'JSON', jsonc: 'JSON', jsonnet: 'Jsonnet',
    yaml: 'YAML', toml: 'TOML', xml: 'XML', ini: 'INI',
    dotenv: 'Config', properties: 'Config',
    csv: 'CSV', tsv: 'TSV',
    cue: 'CUE', dhall: 'Dhall', pkl: 'Pkl',
    proto: 'Protobuf', protobuf: 'Protobuf', thrift: 'Thrift', avro: 'Avro',
    markdown: 'Markdown', restructuredtext: 'reStructuredText',
    latex: 'LaTeX', tex: 'LaTeX', bibtex: 'BibTeX', typst: 'Typst',
    asciidoc: 'AsciiDoc', plaintext: 'Plain Text',
    coffeescript: 'CoffeeScript', tcl: 'Tcl', awk: 'AWK', sed: 'Sed',
    regex: 'Regex', diff: 'Diff', 'git-commit': 'Git Commit', 'git-rebase': 'Git Rebase',
    ignore: 'Gitignore', editorconfig: 'EditorConfig',
    http: 'HTTP', ssh_config: 'SSH Config',
    log: 'Log',
};

export function mapLanguageId(id: string): string {
    if (id in LANG_MAP) return LANG_MAP[id];
    return id.charAt(0).toUpperCase() + id.slice(1);
}

export function detectEditor(): string {
    const name = vscode.env.appName.toLowerCase();
    if (name.includes('cursor')) return 'cursor';
    if (name.includes('windsurf')) return 'windsurf';
    if (name.includes('vscodium')) return 'vscodium';
    if (name.includes('positron')) return 'positron';
    if (name.includes('void')) return 'void';
    if (name.includes('antigravity')) return 'antigravity';
    return 'vscode';
}