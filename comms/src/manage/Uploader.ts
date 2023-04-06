import {ChildProcess, exec, spawn} from 'child_process';
import {ReadlineParser, SerialPort, SerialPortOpenOptions} from 'serialport';
import {Readable} from 'stream';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import {Emulator, Instance} from '../bridge/Instance';

export abstract class Uploader {
    abstract upload(program: string): Promise<Instance>;

    protected removeTmpDir(tmpdir: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.rm(tmpdir, {recursive: true}, err => {
                if (err) {
                    reject('Could not delete temporary directory.');
                    return;
                }
                resolve();
            });
        });
    }
}

interface SerialOptions {
    path?: string,
    fqbn?: string,
    baudRate?: number
}

function isReadable(x: Readable | null): x is Readable {
    return x !== null;
}

export class EmulatorUploader extends Uploader {
    private readonly interpreter: string;
    private readonly args: string[];
    private readonly port: number;

    constructor(interpreter: string, port: number, args: string[] = []) {
        super();
        this.interpreter = interpreter;
        this.port = port;
        this.args = args;
    }

    upload(program: string, listener?: (chunk: any) => void): Promise<Emulator> {
        return this.connectSocket(program, listener);
    }

    private startWARDuino(program: string): ChildProcess {
        const _args: string[] = [program, '--socket', (this.port).toString()].concat(this.args);
        console.log(_args.join(' '));
        return spawn(this.interpreter, _args);
    }

    private connectSocket(program: string, listener?: (chunk: any) => void): Promise<Emulator> {
        const that = this;
        const process = this.startWARDuino(program);

        return new Promise(function (resolve, reject) {
            if (process === undefined) {
                reject('Failed to start process.');
            }

            while (process.stdout === undefined) {
            }

            if (isReadable(process.stdout)) {
                let error: string = '';

                const reader = new ReadlineParser();
                process.stdout.pipe(reader);

                reader.on('data', (data) => {
                    console.log(data);

                    if (listener !== undefined) {
                        listener(data);
                    }

                    if (data.includes('Listening')) {
                        console.log('ok');

                        const client = new net.Socket();
                        client.connect(that.port, () => {
                            console.log('connected');
                            if (listener !== undefined) {
                                client.on('data', listener);
                            }
                            resolve({process: process, interface: client});
                        });
                    } else {
                        error = data.toString();
                    }
                });

                reader.on('error', (err: Error) => {
                    error = err.message;
                });

                reader.on('close', () => {
                    reject(`Could not connect. Error:  ${error}`);
                });
            } else {
                reject();
            }
        });
    }
}

export class ArduinoUploader extends Uploader {
    private readonly sdkpath: string;
    private readonly fqbn: string;
    private readonly options: SerialPortOpenOptions<any>;

    constructor(sdkpath: string, options: SerialOptions) {
        super();
        this.sdkpath = sdkpath;
        this.fqbn = options.fqbn ?? 'esp32:esp32:esp32wrover';
        this.options = {
            path: options.path ?? '/dev/ttyUSB0',
            baudRate: options.baudRate ?? 115200
        };
    }

    public upload(program: string): Promise<Instance> {
        return this.stage(program).then(() => {
            return this.removeTmpDir(path.dirname(program));
        }).then(() => {
            return this.flash();
        }).then(() => {
            return this.connect();
        });
    }

    private stage(program: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const command = `xxd -i ${program} | sed -e 's/[^ ]*_wasm/upload_wasm/g' > ${this.sdkpath}/upload.h`;

            let createHeaders = exec(command);

            createHeaders.on('close', (code) => {
                if (code !== 0) {
                    reject('staging failed: unable to initialize headers');
                    return;
                }
                resolve();
            });
        }).then(() => {
            return new Promise<void>((resolve, reject) => {
                let compile = exec('make compile', {cwd: this.sdkpath});

                compile.on('close', (code) => {
                    if (code !== 0) {
                        reject('staging failed: unable to build Arduino program');
                        return;
                    }
                    resolve();
                });
            });
        });
    }

    private flash(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const command = `make flash PORT=${this.options.path} FQBN=${this.fqbn}`;

            const upload = exec(command, {cwd: this.sdkpath});

            upload.on('close', (code) => {
                if (code !== 0) {
                    reject(`unable to flash program to ${this.fqbn}`);
                    return;
                }
                resolve();
            });
        });
    }

    private connect(): Promise<Instance> {
        return new Promise<Instance>((resolve, reject) => {
            const connection = new SerialPort(this.options,
                (error) => {
                    if (error) {
                        reject(`could not connect to serial port: ${this.options.path}`);
                        return;
                    }
                }
            );
            connection.on('data', function (data) {
                if (data.includes('LOADED')) {
                    connection.removeAllListeners('data');
                    resolve({interface: connection});
                }
            });
        });
    }
}
