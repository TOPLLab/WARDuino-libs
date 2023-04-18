export class MessageQueue implements Iterable<string> {
    private readonly delimiter: string;
    private queue: string[];

    constructor(delimiter: string) {
        this.delimiter = delimiter;
        this.queue = [];
    }

    public push(data: string): void {
        const messages: string[] = this.split(data);
        if (this.lastMessageIncomplete()) {
            this.queue[this.queue.length - 1] += messages.shift();
        }
        this.queue = this.queue.concat(messages);
    }

    public pop(): string | undefined {
        if (this.hasCompleteMessage()) {
            return this.queue.shift();
        }
    }

    private split(text: string): string[] {
        return text.split(new RegExp(`(.*?${this.delimiter})`, 'g')).filter(s => {
            return s.length > 0;
        });
    }

    private lastMessageIncomplete(): boolean {
        const last: string | undefined = this.queue[this.queue.length - 1];
        return last !== undefined && !last.includes(this.delimiter);
    }

    private hasCompleteMessage(): boolean {
        return this.queue.length > 0 && (!this.lastMessageIncomplete() || this.queue.length > 1);
    }

    [Symbol.iterator](): Iterator<string> {
        return {
            next: (): IteratorResult<string> => {
                return {
                    done: !this.hasCompleteMessage(),
                    value: this.pop()!
                }
            }
        };
    }
}
