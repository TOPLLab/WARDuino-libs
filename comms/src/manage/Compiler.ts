import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {exec, ExecException} from 'child_process';
import {SourceMap} from '../sourcemap/SourceMap';
import * as readline from 'readline';
import SourceLine = SourceMap.SourceLine;

export interface CompileOutput {
    dir: string; // the directory with compilation output
    out?: String;
    err?: String;
}

export class CompilerFactory {
    private readonly wat: WatCompiler;
    private readonly asc: AsScriptCompiler;

    constructor(wabt: string) {
        this.wat = new WatCompiler(wabt);
        this.asc = new AsScriptCompiler(wabt);
    }

    public pickCompiler(file: string): Compiler {
        let fileType = getFileExtension(file);
        switch (fileType) {
            case 'wast' :
            case 'wat' :
                return this.wat;
            case 'ts' :
                return this.asc;
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

    private compiled: Map<string, CompileOutput> = new Map<string, CompileOutput>();

    constructor(wabt: string) {
        super();
        this.wabt = wabt;
    }

    public async compile(program: string, dir?: string): Promise<CompileOutput> {
        if (dir) {
            return this.wasm(program, dir);
        }

        return this.makeTmpDir().then((dir: string) => {
            return this.wasm(program, dir);
        });
    }

    private wasm(program: string, dir: string): Promise<CompileOutput> {
        // do not recompiled previous compilations
        // if (this.compiled.has(program)) {
        //     return Promise.resolve(this.compiled.get(program)!);
        // }

        // compile WAT to Wasm
        return new Promise<CompileOutput>((resolve, reject) => {
            const command = `${this.wabt}/wat2wasm --no-canonicalize-leb128s --disable-bulk-memory --debug-names -v -o ${dir}/upload.wasm ${program}`;
            let out: String = '';
            let err: String = '';

            function handle(error: ExecException | null, stdout: String, stderr: any) {
                out = stdout;
                err = error?.message ?? '';
            }

            let compile = exec(command, handle);

            compile.on('close', (code) => {
                if (code !== 0) {
                    reject(`Compilation to wasm failed: wat2wasm exited with code ${code}: ${err}`);
                    return;
                }
                this.compiled.set(program, {dir: dir, out: out, err: err});
                resolve({dir: dir, out: out, err: err});
            });
        });
    }

    public dump(output: CompileOutput): Promise<SourceMap.Mapping> {
        // object dump
        return new Promise<SourceMap.Mapping>((resolve, reject) => {
            const command = `${this.wabt}/wasm-objdump -x -m ${output.dir}/upload.wasm`;

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
        return {lines: parseLines(context), functions: parseExport(input), globals: [], imports: []};
    }
}

export class AsScriptCompiler extends Compiler {
    private readonly wabt: string;

    private compiled: Map<string, CompileOutput> = new Map<string, CompileOutput>();

    constructor(wabt: string) {
        super();
        this.wabt = wabt;
    }

    public async compile(program: string): Promise<CompileOutput> {
        return this.makeTmpDir().then((dir) => {
            return this.wasm(program, dir);
        });
    }

    public async map(program: string): Promise<SourceMap.Mapping> {
        const wat = new WatCompiler(this.wabt);
        const compiler = this;

        return this.compile(program).then(async function (output: CompileOutput) {
            const dump = await wat.dump(output);
            return Promise.resolve({
                lines: await compiler.lineInformation(program, output, dump),
                functions: [],
                globals: [],
                imports: []
            });
        });
    }

    private lineInformation(program: string, output: CompileOutput, wat: SourceMap.Mapping): Promise<SourceMap.SourceLine[]> {
        const reader = readline.createInterface({input: fs.createReadStream(`${output.dir}/upload.wast`)});
        const mapping: SourceMap.SourceLine[] = [];

        const counter = ((i = 0) => () => ++i)();

        reader.on('line', (line: string, cursor = counter() + 1) => {
            if (line.includes(';;@') && line.includes(program)) {
                const entry: SourceMap.SourceLine | undefined = wat.lines.find((info) => info.line === cursor);
                if (entry) {
                    mapping.push({
                        line: +line.split(':')[1],
                        columnStart: +line.split(':')[2],
                        columnEnd: -1,
                        instructions: entry.instructions
                    });
                }
            }
        });

        return new Promise((resolve, reject) => {
            reader.on('close', () => {
                resolve(mapping);
            });
        });
    }

    private async wasm(program: string, dir: string): Promise<CompileOutput> {
        // do not recompiled previous compilations
        // if (this.compiled.has(program)) {
        //     return Promise.resolve(this.compiled.get(program)!);
        // }

        const wat = new WatCompiler(this.wabt);

        // compile AS to Wasm and WAT
        return new Promise<CompileOutput>(async (resolve, reject) => {
            const command = await this.getCompilationCommand(program, dir);
            let out: String = '';
            let err: String = '';

            function handle(error: ExecException | null, stdout: String, stderr: any) {
                out = stdout;
                err = error?.message ?? '';
            }

            let compile = exec(command, handle);

            compile.on('close', (code) => {
                if (code !== 0) {
                    reject(`Compilation to wasm failed: ${err}`);
                    return;
                }
                this.compiled.set(program, {dir: dir, out: out, err: err});
                resolve({dir: dir, out: out, err: err});
            })
        }).then((output: CompileOutput) => {
            return wat.compile(`${output.dir}/upload.wast`, output.dir);
        });
    }

    private getCompilationCommand(program: string, tmpdir: string): Promise<string> {
        // builds asc command based on the version of asc
        return new Promise<string>(async (resolve, reject) => {
            let out: String = '';
            let err: String = '';

            function handle(error: ExecException | null, stdout: String, stderr: any) {
                out = stdout;
                err = error?.message ?? '';
            }

            let version: Version = await AsScriptCompiler.retrieveVersion();
            let command = `npx asc ${program} --exportTable --disable bulk-memory --sourceMap -O3s --debug `;
            if (version.major > 0 || +version.minor >= 20) {
                command += '--outFile ';
            } else {
                command += '--binaryFile ';
            }
            command += `${tmpdir}/upload.wasm --textFile ${tmpdir}/upload.wast`;  // use .wast to get inline sourcemapping
            resolve(command);
        });
    }

    private static retrieveVersion(): Promise<Version> {
        return new Promise<Version>((resolve, reject) => {
            let out: String = '';
            let err: String = '';

            function handle(error: ExecException | null, stdout: String, stderr: any) {
                out = stdout;
                err = error?.message ?? '';
            }

            let compilerVersion = exec('npx asc --version', handle);
            compilerVersion.on('close', (code) => {
                if (code !== 0) {
                    reject(`asc --version failed: ${err}`);
                }

                const matched = out.match(/^Version (?<major>[0-9]+)\.(?<minor>[0-9]+)\.(?<patch>[0-9]+)/);
                if (matched && matched.groups?.major && matched.groups?.minor && matched.groups?.patch) {
                    resolve({major: +matched.groups.major, minor: +matched.groups.minor, patch: +matched.groups.patch});
                } else {
                    reject(`asc --version did not print expected output format 'Version x.x.x'. Got ${out} instead.`);
                }
            });
        });
    }
}

interface Version {
    major: number;
    minor: number;
    patch: number;
}

function getFileExtension(file: string): string {
    let splitted = file.split('.');
    if (splitted.length === 2) {
        return splitted.pop()!;
    }
    throw Error('Could not determine file type');
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

function parseLines(context: CompileOutput): SourceMap.SourceLine[] {
    if (context.out === undefined) {
        return [];
    }

    const lines: string[] = context.out.split('\n');
    const corrections = extractSectionAddressCorrections(lines);
    let result: SourceLine[] = [];
    let lastLineInfo = undefined;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const newLine = line.match(/@/);
        if (newLine) {
            lastLineInfo = extractLineInfo(line);
            continue;
        }
        try {
            let addr = extractAddressInformation(line);
            if (corrections.has(i)) {
                const offset = corrections.get(i)!;
                const newAddr = Number(`0x${addr}`) + offset;
                const tmpAddr = newAddr.toString(16);
                // add padding
                addr = `${'0'.repeat(addr.length - tmpAddr.length)}${tmpAddr}`;
            }
            result.push({
                line: lastLineInfo!.line,
                columnStart: lastLineInfo!.column,
                columnEnd: -1,
                instructions: [{address: addr}]
            });
        } catch (e) {
        }

    }
    return result;
}

export function extractAddressInformation(addressLine: string): string {
    let regexpr = /^(?<address>([\da-f])+):/;
    let match = addressLine.match(regexpr);
    if (match?.groups) {
        return match.groups.address;
    }
    throw Error(`Could not parse address from line: ${addressLine}`);
}

function extractLineInfo(lineString: string): LineInfo {
    lineString = lineString.substring(1);
    return jsonParse(lineString);
}

interface LineInfo {
    line: number;
    column: number;
    message: string;
}

function jsonParse(obj: string) {
    return new Function(`return ${obj}`)();
}

function extractSectionAddressCorrections(lines: string[]): Map<number, number> {
    const corrections: Map<number, number> = new Map();
    const sections: string[] =
        ['Type', 'Import', 'Function', 'Table', 'Memory', 'Global', 'Export', 'Elem', 'Code']
            .map(kind => {
                return `; section "${kind}" (`;
            })
    let candidates: number[] = [];
    let inSection = false;
    let sectionStartIdx = -1;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const foundSection = sections.find(s => {
            return line.startsWith(s);
        });

        if (foundSection) {
            inSection = true;
            sectionStartIdx = i + 1;
        }

        if (inSection && i >= sectionStartIdx) {
            candidates.push(i);
            if (line.includes('; FIXUP section size')) {
                const hexaAddr = line.match(/: ([a-zA-Z0-9]+)/)?.[1];
                if (hexaAddr) {
                    // assert(hexaAddr.length % 2 === 0, "hexa address is not even");
                    const amountBytes = hexaAddr.length / 2;
                    candidates.forEach(lineNr => {
                        corrections.set(lineNr, amountBytes - 1);
                    });
                }
                inSection = false;
                sectionStartIdx = -1;
                candidates = [];
            }
        }
    }
    return corrections;
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