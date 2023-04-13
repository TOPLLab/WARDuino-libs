import {ChildProcess} from 'child_process';
import {Duplex} from 'stream';
import {SerialPort} from 'serialport';

export interface Instance {
    interface: Duplex;
    kill: () => boolean;
}

export interface SerialInstance extends Instance {
    interface: SerialPort;
}

export interface Emulator extends Instance {
    process: ChildProcess;
}
