import {Connection} from './Connection';

export abstract class PlatformBridge {
    // Timeouts for async actions
    public readonly instructionTimeout: number = 2000;
    public readonly connectionTimeout: number = 2000;

    // Name of platform
    public abstract readonly name: string;

    // Optional monitor to receive all data from platform
    protected abstract monitor?: (chunk: any) => void;

    // All instances created by the platform
    protected abstract connections: Connection[];

    // Connect to platform, creates a new instance
    abstract connect(program: string, args: string[]): Promise<Connection>;

    checkConnections(): void {
        this.connections.forEach((instance: Connection) => {
            this.check(instance);
        });
    }

    protected abstract check(instance: Connection): void;

    getConnections(): Connection[] {
        return this.connections;
    }
}
