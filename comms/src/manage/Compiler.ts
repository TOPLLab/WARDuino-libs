import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {exec, ExecException} from 'child_process';
import {SourceMap} from '../sourcemap/SourceMap';

export interface CompileOutput {
    file: string; // the compiled file
    out?: String;
    err?: String;
}

export class CompilerFactory {
    private readonly wat: WatCompiler;

    constructor(wabt: string) {
        this.wat = new WatCompiler(wabt);
    }

    public pickCompiler(file: string): Compiler {
        let fileType = getFileExtension(file);
        switch (fileType) {
            case 'wast' :
            case 'wat' :
                return this.wat;
            case 'ts' :
                return new AsScriptCompiler();
        }
        throw new Error('Unsupported file type');
    }
}

export abstract class Compiler {
    // compiles program to WAT
    abstract compile(program: string): Promise<CompileOutput>;

    // generates a sourceMap
    abstract map(program: string): Promise<SourceMap.Mapping>;

    protected makeTmpDir(): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.mkdtemp(path.join(os.tmpdir(), 'warduino.'), (err, tmpdir) => {
                if (err === null) {
                    resolve(tmpdir);
                } else {
                    reject('could not make temporary directory');
                }
            });
        });
    }
}

export class WatCompiler extends Compiler {
    private readonly wabt: string;

    private tmpdir?: string;

    private compiled: Map<string, CompileOutput> = new Map<string, CompileOutput>();

    constructor(wabt: string) {
        super();
        this.wabt = wabt;
    }

    public async compile(program: string): Promise<CompileOutput> {
        if (this.tmpdir !== undefined) {
            return this.wasm(program);
        }

        return this.makeTmpDir().then((dir) => {
            this.tmpdir = dir;
            return this.wasm(program);
        });
    }

    private wasm(program: string): Promise<CompileOutput> {
        // do not recompiled previous compilations
        if (this.compiled.has(program)) {
            return Promise.resolve(this.compiled.get(program)!);
        }

        // compile WAT to Wasm
        return new Promise<CompileOutput>((resolve, reject) => {
            const command = `${this.wabt}/wat2wasm --debug-names -v -o ${this.tmpdir}/upload.wasm ${program}`;
            let out: String = '';
            let err: String = '';

            function handle(error: ExecException | null, stdout: String, stderr: any) {
                out = stdout;
                err = error?.message ?? '';
            }

            let compile = exec(command, handle);

            compile.on('close', (code) => {
                if (code !== 0) {
                    reject(`Compilation to wasm failed: wat2wasm exited with code ${code}`);
                    return;
                }
                this.compiled.set(program, {file: `${this.tmpdir}/upload.wasm`, out: out, err: err});
                resolve({file: `${this.tmpdir}/upload.wasm`, out: out, err: err});
            });
        });

    }

    private dump(output: CompileOutput): Promise<SourceMap.Mapping> {
        // object dump
        return new Promise<SourceMap.Mapping>((resolve, reject) => {
            const command = `${this.wabt}/wasm-objdump -x -m ${output.file}`;

            let compile = exec(command, (error: ExecException | null, stdout: String, stderr: any) => {
                resolve(this.parseWasmObjDump(output, stdout.toString()));
            });

            compile.on('close', (code) => {
                if (code !== 0) {
                    reject(`wasm-objdump exited with code ${code}`);
                    return;
                }
            });
        });
    }

    public async map(program: string): Promise<SourceMap.Mapping> {
        return this.compile(program).then((output) => {
            return this.dump(output);
        });
    }

    private parseWasmObjDump(context: CompileOutput, input: string): SourceMap.Mapping {
        return {lines: [], functions: parseExport(input), globals: [], imports: []};
    }

}

export class AsScriptCompiler extends Compiler {
    private compiled?: string;

    constructor() {
        super();
    }

    public async compile(program: string): Promise<CompileOutput> {
        if (this.compiled) {
            return {file: this.compiled};
        }

        // TODO compile to wat and return file location
        this.compiled = program;
        return {file: this.compiled};
    }

    public async map(program: string): Promise<SourceMap.Mapping> {
        // TODO implement
        await this.compile(program);
        // ...
        return Promise.resolve({lines: [], functions: [], globals: [], imports: []});
    }
}

function getFileExtension(file: string): string {
    let splitted = file.split('.');
    if (splitted.length === 2) {
        return splitted.pop()!;
    }
    throw Error("Could not determine file type");
}

export function parseExport(input: string): SourceMap.Closure[] {
    const results: SourceMap.Closure[] = [];
    const section: string[] = consumeUntil(input, 'Export').split('\n');
    section.pop();
    for (const line of section) {
        const index: number = getIndex(line);
        const name: string = getName(line);
        if (0 <= index && 0 < name.length) {
            results.push({index: index, name: name, arguments: [], locals: []});
        }
    }
    return results;
}

function consumeUntil(text: string, until: string): string {
    return text.split(until)[1] ?? '';
}

function getIndex(line: string): number {
    return parseInt(find(/func\[([0-9]+)\]/, line));
}

function getName(line: string): string {
    return find(/-> "([^"]+)"/, line);
}

export function find(regex: RegExp, input: string) {
    const match = regex.exec(input);
    if (match === null || match[1] === undefined) {
        return '';
    }
    return match[1];
}