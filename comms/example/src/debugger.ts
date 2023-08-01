import {sha512} from 'sha512-crypt-ts';
import {readFileSync} from 'fs';
import {CompileOutput, CompilerFactory, Connection, Platform, SourceMapper, UploaderFactory} from 'warduino-comms';
import {homedir} from 'os';
import {oraPromise} from 'ora';

const EMULATOR: string = `${homedir()}/Arduino/libraries/WARDuino/build-emu/wdcli`;
const ARDUINO: string = `${homedir()}/Arduino/libraries/WARDuino/platforms/Arduino/`;

const platformMap: Map<string, Platform> = new Map<string, Platform>([
    ['emulator', Platform.emulated],
    ['arduino', Platform.arduino],
])

interface Program {
    file: string;
    hash: string;
}

export class Debugger {

    public connection?: Connection;

    public sourcemapper?: SourceMapper;  // TODO

    private program: Program;

    private readonly port: string;

    private readonly platform: string;

    constructor(program: string, port: string, platform: string) {
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
        this.connection = await connect(this.program.file, this.port, this.platform);
    }
}

async function connect(program: string, port: string, platform: string): Promise<Connection> {
    // compile program
    const output: CompileOutput = await oraPromise(new CompilerFactory(process.env.WABT ?? '')
        .pickCompiler(program)
        .compile(program), {
        text: 'Compiling program ...',
        successText: 'Compiled program.',
        failText: 'Failed to compile program.'
    });

    return oraPromise(new UploaderFactory(EMULATOR, ARDUINO).pickUploader(platformMap.get(platform) ?? Platform.emulated, port).upload(`${output.dir}/upload.wasm`), {
        text: `Uploading to ${port} ...`,
        successText: `Uploaded to ${platform}.`,
        failText: `Uploading to ${platform} failed.`
    });
}
