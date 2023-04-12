import {Duplex} from 'stream';
import {Instance} from './Instance';
import {Instruction} from '../debug/Instructions';
import {defaultParser, parserTable, State} from '../parse/Parsers';
import {MessageQueue} from '../parse/MessageQueue';

class Sender<R extends Object> {
    private readonly instruction: Instruction;
    private parser: (input: string) => R;

    constructor(instruction: Instruction, parser: (input: string) => R) {
        this.instruction = instruction;
        this.parser = parser;
    }

    public sendInstruction(socket: Duplex, payload?: string): Promise<R> {
        const stack: MessageQueue<R> = new MessageQueue<R>('\n', this.parser);

        return new Promise((resolve) => {  // TODO add reject
            socket.on('data', (data: Buffer) => {
                stack.push(data.toString());
                stack.tryParser(resolve);
            });

            socket.write(`${this.instruction}${payload ?? ''}\n`);
        });
    }
}


export const instructionTable: Map<Instruction, Sender<any>> = new Map([
    [Instruction.dump, new Sender<State>(Instruction.dump, parserTable.get(Instruction.dump) ?? defaultParser)]
])

// instructionTable.get(Instruction.dump)!.sendInstruction(socket, `payload`): Promise<State>;

export abstract class PlatformBridge {
    // Timeouts for async actions
    public readonly instructionTimeout: number = 2000;
    public readonly connectionTimeout: number = 2000;

    // Name of platform
    public abstract readonly name: string;

    // Optional monitor to receive all data from platform
    protected abstract monitor?: (chunk: any) => void;

    // All instances created by the platform
    protected abstract connections: Instance[];

    // Connect to platform, creates a new instance
    abstract connect(program: string, args: string[]): Promise<Instance>;

    // Send an instruction of over a socket
    abstract sendInstruction(socket: Duplex, payload: any): Promise<Object | void>;

    // Change the program of an instance
    abstract setProgram(socket: Duplex, program: string): Promise<boolean>;

    checkConnections(): void {
        this.connections.forEach((instance: Instance) => {
            this.check(instance);
        });
    }

    protected abstract check(instance: Instance): void;

    getConnections(): Instance[] {
        return this.connections;
    }

    abstract addListener(instance: Instance, listener: (data: string) => void): void;

    abstract clearListeners(instance: Instance): void;

    abstract disconnect(instance: Instance | void): Promise<void>;
}
