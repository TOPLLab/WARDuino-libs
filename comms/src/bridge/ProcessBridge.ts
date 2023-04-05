import {Duplex} from 'stream';
import {Instance} from './Instance';

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
    abstract sendInstruction(socket: Duplex, chunk: any, expectResponse: boolean, parser: (text: string) => Object): Promise<Object | void>;

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
