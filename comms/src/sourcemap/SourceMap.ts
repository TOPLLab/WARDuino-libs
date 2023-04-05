export namespace SourceMap {
    export interface Mapping {
        lines: SourceLine[];
        functions: Closure[];
        globals: Variable[];
        imports: Closure[];
    }

// TODO rework to map address to lines (instead of the other way around)

    export interface SourceLine {
        line: number;
        columnStart: number;
        columnEnd: number;
        instructions: TargetInstruction[];  // instructions in compiled target
    }

    export interface TargetInstruction {
        address: string;
    }

    export interface Closure {
        index: number;
        name: string;
        arguments: Variable[];
        locals: Variable[];
    }

    export interface Variable {
        index: number;
        name: string;
        type: string;
        mutable: boolean;
        value: string;
    }
}