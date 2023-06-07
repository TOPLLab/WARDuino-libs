import {command, program, Program} from 'bandersnatch';
import {oraPromise} from 'ora';
import {
    ArduinoUploader,
    CompileOutput,
    CompilerFactory,
    Connection,
    EmulatorUploader,
    Request,
    Uploader, WARDuino
} from 'warduino-comms';

import {homedir} from 'os';
import State = WARDuino.State;

const EMULATOR: string = `${homedir()}/Arduino/libraries/WARDuino/build-emu/wdcli`;
const ARDUINO: string = `${homedir()}/Arduino/libraries/WARDuino/platforms/Arduino/`;

const connections: Connection[] = [];

enum Platform {
    emulated,
    arduino
}

const platformMap: Map<string, Platform> = new Map<string, Platform>([
    ['emulated', Platform.emulated],
    ['arduino', Platform.arduino],
])

const repl: Program = program({exit: false})
    .add(
        command('spawn')
            .description('Start and connect')
            .option('program', {
                description: 'Source program (.wat, .ts)',
                default: 'blink.ts',
                required: true,
                prompt: 'WAT or AS program file',
            })
            .option('platform', {
                description: 'Target platform',
                default: 'emulated',
                choices: ['emulated', 'arduino'],
                required: true,
                prompt: 'Target platform',
            })
            .option('port', {
                description: 'Port address',
                default: '8900',
                required: true,
                prompt: 'Port address',
            })
            .action(async (args) => {
                connections.push(await connect(args.program, args.port, platformMap.get(args.platform) ?? Platform.emulated));
            })
    ).add(
        command('list')
            .description('List connections')
            .action(async () => {
                console.log(connections);
            })
    ).add(
        command('inspect')
            .description('Inspect state')
            .action(async () => {
                const response: State = await connections[0].sendRequest(Request.dump);
                console.log(`${JSON.stringify(response, null, 4)}`);
            })
    ).add(
        command('exit')
            .description('Exit the REPL')
            .action(async () => {
                console.log('shutting down connections');
                connections.forEach((connection) => connection.kill());
                process.exit(0);
            })
    );

repl.repl();

async function connect(program: string, port: string, platform: Platform): Promise<Connection> {
    // compile program
    const output: CompileOutput = await oraPromise(new CompilerFactory(process.env.WABT ?? '')
        .pickCompiler(program)
        .compile(program), {
        text: 'Compiling program ...',
        successText: 'Compiled program.',
        failText: 'Failed to compile program.'
    });

    return oraPromise(new UploaderFactory(EMULATOR, ARDUINO).pickUploader(platform, port).upload(`${output.dir}/upload.wasm`), {
        text: `Uploading to ${port} ...`,
        successText: `Uploaded with Arduino.`,
        failText: 'Failed to upload with Arduino.'
    });
}

export class UploaderFactory {
    private readonly emulator: string;
    private readonly arduino: string;

    constructor(emulator: string, arduino: string) {
        this.emulator = emulator;
        this.arduino = arduino;
    }

    public pickUploader(platform: Platform, port: string): Uploader {
        switch (platform) {
            case Platform.arduino:
                return new ArduinoUploader(this.arduino, {path: port});
            case Platform.emulated:
                return new EmulatorUploader(this.emulator, parseInt(port));
        }
        throw new Error('Unsupported file type');
    }
}
