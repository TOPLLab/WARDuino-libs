import {sha512} from 'sha512-crypt-ts';
import {readFileSync} from 'fs';
import {
    CompileOutput,
    Compiler,
    CompilerFactory,
    Connection,
    Platform,
    SourceMap,
    Uploader,
    UploaderFactory
} from 'warduino-comms';
import {homedir} from 'os';
import ora from 'ora';
import EventEmitter from 'events';

const EMULATOR: string = `${homedir()}/Arduino/libraries/WARDuino/build-emu/wdcli`;
const ARDUINO: string = `${homedir()}/Arduino/libraries/WARDuino/platforms/Arduino/`;

const platformMap: Map<string, Platform> = new Map<string, Platform>([
    ['emulator', Platform.emulated],
    ['arduino', Platform.arduino],
])

enum DebuggerEvents {
    compiled = 'compiled',
    compiling = 'compiling',
    connected = 'connected',
    failed = 'failed',
    sourcemap = 'sourcemap',
    uploaded = 'uploaded',
    uploading = 'uploading',
}

interface Program {
    file: string;
    hash: string;
}

export class Debugger extends EventEmitter {

    public connection?: Connection;

    public mapping?: SourceMap.Mapping;  // TODO

    private program: Program;

    private readonly port: string;

    private readonly platform: string;

    constructor(program: string, port: string, platform: string) {
        super();
        this.port = port;
        this.platform = platform;
        this.program = {file: program, hash: sha512.base64(readFileSync(program).toString())};
    }

    // Compiles and uploads a new program
    public async launch(): Promise<Debugger> {
        return new Promise((resolve, reject) => {
            this.init().then(() => resolve(this)).catch((err) => reject(err));
        });
    }

    // Init connection
    private async init() {
        this.connection = await this.connect(this.program.file, this.port, this.platform);
        this.emit(DebuggerEvents.uploaded);
    }

    private async connect(program: string, port: string, platform: string): Promise<Connection> {
        this.emit(DebuggerEvents.compiling);

        const compiler: Compiler = await new CompilerFactory(process.env.WABT ?? '').pickCompiler(program);
        let compiled: boolean = false;

        let compiling = ora('Compiling program ...').start();
        let generating = ora('Generating source map ...');

        compiler.on('compiled', () => {
            this.emit(DebuggerEvents.compiled);
            compiled = true;
            compiling.succeed('Compiled program.');
            generating.start();
        });

        compiler.on('sourcemap', () => {
            this.emit(DebuggerEvents.sourcemap);
            generating.succeed('Generated source map.');
        });

        compiler.on('failed', () => {
            if (!compiled) {
                compiling.fail('Failed to compile program.');
            } else {
                generating.fail('Failed to generate source map.');
            }
        });

        // compile program
        const output: CompileOutput = await compiler.map(program);
        this.mapping = output.map;

        let uploaded: boolean = false;

        this.emit(DebuggerEvents.uploading);

        let uploading = ora(`Uploading to ${port} ...`);
        let connecting = ora('Connecting to debugger ...');
        const uploader: Uploader = new UploaderFactory(EMULATOR, ARDUINO).pickUploader(platformMap.get(platform) ?? Platform.emulated, port);
        uploader.on('started', () => uploading.start());
        uploader.on('connecting', () => {
            uploaded = true;
            uploading.succeed(`Uploaded to ${platform}.`);
            connecting.start();
        });
        uploader.on('connected', () => connecting.succeed(`Connected to ${platform}.`));
        uploader.on('failed', () => {
            if (!uploaded) {
                uploading.fail(`Uploading to ${platform} failed.`);
            } else {
                connecting.fail(`Connecting to ${platform} failed.`);
            }
        });
        return uploader.upload(`${output.dir}/upload.wasm`);
    }
}
