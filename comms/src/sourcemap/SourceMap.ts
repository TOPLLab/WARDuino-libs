export namespace SourceMap {

    export interface Location {
        line: number;
        column: number;
    }

    export class Mapping {
        public lines: SourceLine[];
        public functions: Closure[];
        public globals: Variable[];
        public imports: Closure[];

        constructor() {
            this.lines = [];
            this.functions = [];
            this.globals = [];
            this.imports = [];
        }

        init(lines: SourceLine[], functions: Closure[], globals: Variable[], imports: Closure[]): Mapping {
            this.lines = lines;
            this.functions = functions;
            this.globals = globals;
            this.imports = imports;
            return this;
        }

        public originalPosition(generatedPosition: TargetInstruction): Location | undefined {
            const original: SourceLine | undefined = this.lines.find((line) =>
                line.instructions.some((instruction: TargetInstruction) =>
                    instruction.address === generatedPosition.address));

            if (original === undefined) {
                return undefined;
            }

            return {line: original.line, column: original.columnStart};
        }

        public generatedPosition(originalPosition: Location): TargetInstruction[] | undefined {
            const original: SourceLine | undefined = this.lines.find((line) =>
                line.line === originalPosition.line);
            return original?.instructions;
        }
    }

// TODO rework to map address to lines (instead of the other way around)

    export interface SourceLine {
        line: number;
        columnStart: number;
        columnEnd?: number;
        instructions: TargetInstruction[];  // instructions in compiled target
        source?: string;
    }

    export interface TargetInstruction {
        address: number;
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