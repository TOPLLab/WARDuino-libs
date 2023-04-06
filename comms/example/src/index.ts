import {command, program, Program} from 'bandersnatch';
import ora, {oraPromise} from 'ora';
import {ArduinoUploader, CompileOutput, CompilerFactory, EmulatorUploader, Uploader} from 'warduino-comms';

import {homedir} from 'os';

const EMULATOR: string = `${homedir()}/Arduino/libraries/WARDuino/build-emu/wdcli`;
const ARDUINO: string = `${homedir()}/Arduino/libraries/WARDuino/platforms/Arduino/`;

let CONNECTED: boolean = false;

enum Platform {
    emulated,
    arduino
}

const platformMap: Map<string, Platform> = new Map<string, Platform>([
    ['emulated', Platform.emulated],
    ['arduino', Platform.arduino],
])

const repl: Program = program().add(
    command('connect')
        .description('Start and connect')
        .option("program", {
            description: "WebAssembly program (.wat)",
            default: 'upload.wat',
            required: true,
            prompt: "WAT program file",
        })
        .option('platform', {
            description: 'Target platform',
            default: 'emulated',
            choices: ['emulated', 'arduino'],
            required: true,
            prompt: 'Target platform',
        })
        .option("port", {
            description: "Port address",
            default: '/dev/ttyUSB0',
            required: true,
            prompt: "Port address",
        })
        .action(async (args) => {
            if (connected()) {
                ora().warn('Already connected.');
                return;
            }

            await connect(args.program, args.port, platformMap.get(args.platform) ?? Platform.emulated)
        })
);

repl.repl();

async function connect(program: string, port: string, platform: Platform) {
    // compile program
    const output: CompileOutput = await oraPromise(new CompilerFactory(process.env.WABT ?? '')
        .pickCompiler(program)
        .compile(program), {
        text: 'Compiling program ...',
        successText: 'Compiled program.',
        failText: 'Failed to compile program.'
    });

    const connection = await oraPromise(new UploaderFactory(EMULATOR, ARDUINO).pickUploader(platform, port).upload(output.file), {
        text: `Uploading to ${port} ...`,
        successText: `Uploaded with Arduino.`,
        failText: 'Failed to upload with Arduino.'
    });

    CONNECTED = true;
}

function connected(): boolean {
    return CONNECTED;
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
