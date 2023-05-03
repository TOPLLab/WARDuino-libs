import {ChildProcess} from 'child_process';
import {Duplex} from 'stream';
import {SerialPort} from 'serialport';
import {MessageQueue} from '../parse/MessageQueue';
import {Request} from '../parse/Requests';
import { EventEmitter } from "stream";

type PromiseResolver<R> = (value: R | PromiseLike<R>) => void;

export abstract class Connection extends EventEmitter {
    protected channel: Duplex;

    protected requests: [Request<any>, PromiseResolver<any>][];

    protected messages: MessageQueue;

    protected constructor(channel: Duplex) {
        super();
        this.channel = channel;
        this.requests = [];
        this.messages = new MessageQueue('\n');

        this.listen();
    }

    // listen on duplex channel
    protected listen(): void {
        this.channel.on('data', (data: Buffer) => {
            console.log(data.toString());
            this.messages.push(data.toString());
            this.process();
        });
    }

    // process messages in queue
    protected process(): void {
        // until no complete messages are left
        for (let message of this.messages) {
            const index: number = this.search(message);  // search request

            if (0 <= index && index < this.requests.length) {
                // parse and resolve
                const [candidate, resolver] = this.requests[index];
                resolver(candidate.parser(message));
                this.requests.splice(index, 1);  // delete resolved request
            }

            // silently drop message if no requests match
        }
    }

    // search for oldest request matching message
    private search(message: string): number {
        let index: number = 0;
        while (index < this.requests.length) {
            const [candidate, resolver] = this.requests[index];
            try {
                // try candidate parser
                candidate.parser(message);
                return index;
            } catch (e) {
                // failure: try next request
                index++;
            }
        }
        return -1;
    }

    // kill connection
    public kill(): boolean {
        this.channel.destroy();
        return this.channel.destroyed;
    }

    // send request over duplex channel
    public sendRequest<R>(request: Request<R>): Promise<R> {
        return new Promise((resolve, reject) => {
            this.requests.push([request, resolve]);
            this.channel.write(`${request.instruction}${request.payload ?? ''}\n`, (err: any) => {
                if (err !== undefined) {
                    reject(err);
                }
            });
        });
    }

    // TODO abstract addListener(connection: Connection, listener: (data: string) => void): void;

    // TODO abstract clearListeners(connection: Connection): void;

    // TODO abstract disconnect(connection: Connection | void): Promise<void>;
}

export class Serial extends Connection {
    constructor(channel: SerialPort) {
        super(channel);
    }
}

export class SubProcess extends Connection {
    private child: ChildProcess;

    constructor(channel: Duplex, process: ChildProcess) {
        super(channel);
        this.child = process;
    }

    public kill(): boolean {
        this.child.kill();
        return super.kill();
    }
}
