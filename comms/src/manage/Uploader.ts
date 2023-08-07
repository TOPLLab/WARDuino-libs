import {ChildProcess, exec, spawn} from 'child_process';
import {ReadlineParser, SerialPort, SerialPortOpenOptions} from 'serialport';
import {Readable} from 'stream';
import * as fs from 'fs';
import * as net from 'net';
import * as path from 'path';
import {Connection, Serial, SubProcess} from '../bridge/Connection';
import {EventEmitter} from 'events';

export enum Platform {
    emulated,
    arduino
}

enum UploaderEvents {
    compiled = 'compiled',
    compiling = 'compiling',
    connected = 'connected',
    connecting = 'connecting',
    failed = 'failed',
    flashing = 'flashing',
    staging = 'staging',
    started = 'started',
    uploaded = 'uploaded',
    uploading = 'uploading',
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


export abstract class Uploader extends EventEmitter {
    abstract upload(program: string): Promise<Connection>;

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

    upload(program: string, listener?: (chunk: any) => void): Promise<SubProcess> {
        return this.connectSocket(program, listener);
    }

    private startWARDuino(program: string): ChildProcess {
        const _args: string[] = [program, '--paused', '--socket', (this.port).toString()].concat(this.args);
        return spawn(this.interpreter, _args);
    }

    private connectSocket(program: string, listener?: (chunk: any) => void): Promise<SubProcess> {
        const that = this;
        const process = this.startWARDuino(program);

        return new Promise(function (resolve, reject) {
            if (process === undefined) {
                reject('Failed to start process.');
            }

            that.emit(UploaderEvents.started);

            while (process.stdout === undefined) {
            }

            if (isReadable(process.stdout)) {
                let error: string = '';

                const reader = new ReadlineParser();
                process.stdout.pipe(reader);

                reader.on('data', (data) => {
                    if (listener !== undefined) {
                        listener(data);
                    }

                    that.emit(UploaderEvents.connecting);

                    if (data.includes('Listening')) {
                        const client = new net.Socket();
                        client.connect(that.port, () => {
                            that.emit(UploaderEvents.connected);
                            if (listener !== undefined) {
                                client.on('data', listener);
                            }
                            resolve(new SubProcess(client, process));
                        });
                    } else {
                        error = data.toString();
                    }
                });

                reader.on('error', (err: Error) => {
                    error = err.message;
                });

                reader.on('close', () => {
                    that.emit(UploaderEvents.failed);
                    reject(`Could not connect. Error:  ${error}`);
                });
            } else {
                that.emit(UploaderEvents.failed);
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

    public upload(program: string): Promise<Connection> {
        this.emit(UploaderEvents.staging);
        return this.stage(program).then(() => {
            return this.removeTmpDir(path.dirname(program));
        }).then(() => {
            this.emit(UploaderEvents.flashing);
            return this.flash();
        }).then(() => {
            this.emit(UploaderEvents.connecting);
            return this.connect();
        });
    }

    private stage(program: string): Promise<void> {
        const that = this;
        return new Promise<void>((resolve, reject) => {
            const command = `xxd -i ${program} | sed -e 's/[^ ]*_wasm/upload_wasm/g' > ${this.sdkpath}/upload.h`;

            let createHeaders = exec(command);

            createHeaders.on('close', (code) => {
                if (code !== 0) {
                    that.emit(UploaderEvents.failed);
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
                        that.emit(UploaderEvents.failed);
                        reject('staging failed: unable to build Arduino program');
                        return;
                    }
                    resolve();
                });
            });
        });
    }

    private flash(): Promise<void> {
        const that = this;
        return new Promise<void>((resolve, reject) => {
            const command = `make flash PORT=${this.options.path} FQBN=${this.fqbn}`;

            const upload = exec(command, {cwd: this.sdkpath});

            upload.on('close', (code) => {
                if (code !== 0) {
                    that.emit(UploaderEvents.failed);
                    reject(`unable to flash program to ${this.fqbn}`);
                    return;
                }
                resolve();
            });
        });
    }

    private connect(): Promise<Connection> {
        const that = this;
        return new Promise<Connection>((resolve, reject) => {
            const connection = new SerialPort(this.options,
                (error) => {
                    if (error) {
                        that.emit(UploaderEvents.failed);
                        reject(`could not connect to serial port: ${this.options.path}`);
                        return;
                    }
                }
            );
            connection.on('data', function (data) {
                if (data.includes('LOADED')) {
                    connection.removeAllListeners('data');
                    that.emit(UploaderEvents.connected);
                    resolve(new Serial(connection));
                }
            });
        });
    }
}
