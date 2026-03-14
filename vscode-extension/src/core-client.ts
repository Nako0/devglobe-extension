import * as vscode from 'vscode';
import { spawn, ChildProcess } from 'child_process';
import { createInterface, Interface } from 'readline';
import * as path from 'path';
import { log } from './logger';

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

type CoreState = {
    connected: boolean;
    tracking: boolean;
    coding_time: string;
    language: string | null;
    share_repo: boolean;
    anonymous_mode: boolean;
    status_message: string;
    offline: boolean;
};

type CoreEvent =
    | { event: 'state'; data: CoreState }
    | { event: 'heartbeat_ok'; data: { today_seconds: number; language: string | null } }
    | { event: 'offline'; data: { message: string } }
    | { event: 'online'; data: { message: string } }
    | { event: 'status_ok'; data: { message: string } }
    | { event: 'status_error'; data: { message: string } };

function coreStateToTracker(s: CoreState): TrackerState {
    return {
        connected: s.connected,
        tracking: s.tracking,
        codingTime: s.coding_time,
        language: s.language,
        shareRepo: s.share_repo,
        anonymousMode: s.anonymous_mode,
        statusMessage: s.status_message,
        offline: s.offline,
    };
}

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

function detectEditor(): string {
    const name = vscode.env.appName.toLowerCase();
    if (name.includes('cursor'))       return 'cursor';
    if (name.includes('windsurf'))     return 'windsurf';
    if (name.includes('vscodium'))     return 'vscodium';
    if (name.includes('positron'))     return 'positron';
    if (name.includes('void'))         return 'void';
    if (name.includes('antigravity'))  return 'antigravity';
    return 'vscode';
}

export class CoreClient implements vscode.Disposable {
    private proc: ChildProcess | null = null;
    private rl: Interface | null = null;
    private state: TrackerState = { ...DEFAULT_STATE };
    private statusBarItem: vscode.StatusBarItem | null = null;

    constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly onStateChange: (state: TrackerState) => void,
    ) {
        context.subscriptions.push(this);
    }

    dispose(): void {
        this.send({ method: 'shutdown' });
        this.proc?.kill();
        this.proc = null;
        this.statusBarItem?.dispose();
    }

    getState(): TrackerState {
        return { ...this.state };
    }

    private ensureProcess(): void {
        if (this.proc && this.proc.exitCode === null) return;

        const corePath = path.join(this.context.extensionPath, 'out', 'devglobe-core.js');
        this.proc = spawn(process.execPath, [corePath, 'daemon'], {
            stdio: ['pipe', 'pipe', 'pipe'],
        });

        this.proc.stderr?.on('data', (chunk: Buffer) => {
            log.warn('core stderr:', chunk.toString().trim());
        });

        this.proc.on('exit', (code) => {
            log.info(`core exited with code ${code}`);
            this.proc = null;
        });

        this.rl = createInterface({ input: this.proc.stdout!, terminal: false });
        this.rl.on('line', (line) => this.handleLine(line));
    }

    private handleLine(line: string): void {
        let event: CoreEvent;
        try { event = JSON.parse(line); } catch { return; }

        switch (event.event) {
            case 'state':
                this.state = coreStateToTracker(event.data);
                this.updateStatusBar();
                this.onStateChange(this.state);
                break;

            case 'heartbeat_ok':
                this.updateStatusBarTime(event.data.today_seconds);
                break;

            case 'offline':
                vscode.window.showWarningMessage(`DevGlobe: ${event.data.message}`);
                break;

            case 'online':
                vscode.window.showInformationMessage(`DevGlobe: ${event.data.message}`);
                break;

            case 'status_ok':
                vscode.window.showInformationMessage(
                    event.data.message ? `DevGlobe: Status set to "${event.data.message}"` : 'DevGlobe: Status cleared'
                );
                break;

            case 'status_error':
                vscode.window.showErrorMessage(`DevGlobe: ${event.data.message}`);
                break;
        }
    }

    private send(msg: Record<string, unknown>): void {
        if (!this.proc?.stdin?.writable) return;
        this.proc.stdin.write(JSON.stringify(msg) + '\n');
    }

    init(apiKey: string, config: vscode.WorkspaceConfiguration): void {
        this.ensureProcess();
        this.send({
            method: 'init',
            params: {
                api_key: apiKey,
                editor: detectEditor(),
                share_repo: config.get('shareRepo', false),
                anonymous_mode: config.get('anonymousMode', false),
                status_message: config.get('statusMessage', ''),
            },
        });
        this.state.connected = true;
        this.state.shareRepo = config.get('shareRepo', false);
        this.state.anonymousMode = config.get('anonymousMode', false);
        this.state.statusMessage = config.get('statusMessage', '');
    }

    start(): void {
        this.ensureStatusBar();
        this.send({ method: 'resume' });
    }

    pause(): void {
        this.send({ method: 'pause' });
        this.statusBarItem?.hide();
    }

    activity(filePath: string, cwd: string, language?: string): void {
        this.send({
            method: 'activity',
            params: { file_path: filePath, cwd, ...(language && { language }) },
        });
    }

    setConfig(key: string, value: boolean): void {
        const params: Record<string, boolean> = {};
        if (key === 'shareRepo') params.share_repo = value;
        if (key === 'anonymousMode') params.anonymous_mode = value;
        this.send({ method: 'set_config', params });
    }

    setStatus(message: string): void {
        this.send({ method: 'set_status', params: { message } });
    }

    reset(): void {
        this.send({ method: 'shutdown' });
        this.proc?.kill();
        this.proc = null;
        this.state = { ...DEFAULT_STATE };
        this.statusBarItem?.hide();
        this.onStateChange(this.state);
    }

    updatePreference(key: keyof TrackerState, value: boolean): void {
        (this.state as unknown as Record<string, unknown>)[key] = value;
        this.onStateChange(this.state);
    }

    setStatusMessage(message: string): void {
        this.state.statusMessage = message;
        this.onStateChange(this.state);
    }

    private ensureStatusBar(): void {
        if (this.statusBarItem) return;
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
        this.statusBarItem.tooltip = 'DevGlobe: Coding time today';
        this.statusBarItem.text = '$(clock) 0m';
        this.statusBarItem.show();
        this.context.subscriptions.push(this.statusBarItem);
    }

    private updateStatusBar(): void {
        if (!this.statusBarItem) return;
        if (this.state.tracking) {
            this.statusBarItem.text = `$(clock) ${this.state.codingTime}`;
            this.statusBarItem.tooltip = `DevGlobe: ${this.state.codingTime} coded today`;
            this.statusBarItem.show();
        } else {
            this.statusBarItem.hide();
        }
    }

    private updateStatusBarTime(todaySeconds: number): void {
        if (!this.statusBarItem) return;
        const h = Math.floor(todaySeconds / 3600);
        const m = Math.floor((todaySeconds % 3600) / 60);
        const label = h > 0 ? `${h}h ${m}m` : `${m}m`;
        this.statusBarItem.text = `$(clock) ${label}`;
        this.statusBarItem.tooltip = `DevGlobe: ${label} coded today`;
        this.statusBarItem.show();
    }
}
