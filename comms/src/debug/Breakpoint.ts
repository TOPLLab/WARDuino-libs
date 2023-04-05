abstract class Comparable {
    public abstract equals(other: Comparable): boolean;
}

export class Breakpoint extends Comparable {
    id: number;  // address
    line: number;
    column?: number;

    constructor(id: number, line: number) {
        super();
        this.id = id;
        this.line = line;
    }

    public equals(other: Breakpoint): boolean {
        return other.id === this.id;
    }
}

