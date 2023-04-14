import { Duplex } from "stream";
import { Request, requestTable, requestBuilderTable, RequestBuilder } from "./Requests"
import { Instruction } from "../debug/Instructions";

type PromiseResolver<R> = (value: R | PromiseLike<R>) => void;

export class RequestQueue {
    private readonly delimiter: string;
    private stack: string[];
    private requests: [Request<any>, PromiseResolver<any>][];
    private catchAllHandler: (line: string) => void;

    private channel: Duplex;

    constructor(channel: Duplex, delimiter: string) {
        this.delimiter = delimiter;
        this.stack = [];
        this.requests = [];
        this.channel = channel;
        this.catchAllHandler = (line: string) => {
            return this.catchAllLogger(line)
        }
        this.registerChannelCallbacks();
    }

    public sendRequest<R>(request: Request<R>): Promise<R> {
        return new Promise((resolve, reject) => {
            this.requests.push([request, resolve]);
            this.channel.write(`${request.instruction}${request.payload ?? ""}\n`, (err: any) => {
                if (err !== undefined) {
                    reject(err);
                }
            });
        });
    }

    public sendInstruction<R>(instruction: Instruction, payload?: string): Promise<R> {
        if (requestTable.get(instruction)) {
            const req = requestTable.get(instruction)
            return this.sendRequest(req!);
        } else {
            const reqbuilder: RequestBuilder<R> = requestBuilderTable.get(instruction)!;
            const req = reqbuilder(payload ?? "");
            return this.sendRequest(req);
        }
    }

    private handleData(data: Buffer) {
        this.push(data.toString());
        this.handleCompleteLines();
    }

    private registerChannelCallbacks() {
        this.channel.on("data", (data: Buffer) => {
            this.handleData(data)
        });
    }

    private push(data: string): void {
        const messages: string[] = this.split(data);
        if (this.lastMessageIncomplete()) {
            this.stack[this.stack.length - 1] += messages.shift();
        }
        this.stack = this.stack.concat(messages);
    }

    private pop(): string | undefined {
        if (this.hasCompleteMessage()) {
            return this.stack.shift();
        }
    }

    private split(text: string): string[] {
        return text.split(new RegExp(`(.*?${this.delimiter})`, 'g')).filter(s => {
            return s.length > 0;
        });
    }

    private lastMessageIncomplete(): boolean {
        const last: string | undefined = this.stack[this.stack.length - 1];
        return last !== undefined && !last.includes(this.delimiter);
    }

    private hasCompleteMessage(): boolean {
        return !this.lastMessageIncomplete() || this.stack.length > 1;
    }

    private catchAllLogger(line: string) {
        console.log(`RequestQueue: unhandled line "${line}"`);
    }

    private handleCompleteLines() {
        let message = this.pop();
        while (message !== undefined) {
            const resolved = this.resolveMessage(message);
            if (!resolved) {
                this.catchAllHandler(message);
            }
            message = this.pop();
        }
    }

    private resolveMessage(message: string): boolean {
        let reqIdx = 0;
        let resolved = false;
        while (reqIdx < this.requests.length) {
            const [request, resolve] = this.requests[reqIdx];
            let tryParser = request.expectedResponse ? request.expectedResponse(message) : true;
            if (tryParser) {
                try {
                    const parsed = request.parser(message);
                    resolve(parsed);
                    resolved = true;
                    break;
                }
                catch (e) { }
            }
            reqIdx += 1;
        }

        // remove resolved request from queue
        if (resolved) {
            this.requests.splice(reqIdx, 1);
        }
        return resolved;
    }
}
