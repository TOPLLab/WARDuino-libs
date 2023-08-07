import {sha512} from 'sha512-crypt-ts';
import {readFileSync} from 'fs';
import {
    CompileOutput,
    CompilerFactory,
    Connection,
    Platform,
    SourceMapper,
    Uploader,
    UploaderFactory
} from 'warduino-comms';
import {homedir} from 'os';
import ora, {oraPromise} from 'ora';
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
    uploaded = 'uploaded',
    uploading = 'uploading',
}

interface Program {
    file: string;
    hash: string;
}

export class Debugger extends EventEmitter {

    public connection?: Connection;

    public sourcemapper?: SourceMapper;  // TODO

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

        // compile program
        const output: CompileOutput = await oraPromise(new CompilerFactory(process.env.WABT ?? '')
            .pickCompiler(program)
            .compile(program), {
            text: 'Compiling program ...',
            successText: 'Compiled program.',
            failText: 'Failed to compile program.'
        });

        this.emit(DebuggerEvents.compiled);

        const uploaded = false;

        this.emit(DebuggerEvents.uploading);

        let uploading = ora(`Uploading to ${port} ...`);
        let connecting = ora('Connecting to debugger ...');
        const uploader: Uploader = new UploaderFactory(EMULATOR, ARDUINO).pickUploader(platformMap.get(platform) ?? Platform.emulated, port);
        uploader.on('started', () => uploading.start());
        uploader.on('connecting', () => {
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
