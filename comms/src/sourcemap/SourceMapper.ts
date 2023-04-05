import {SourceMap} from './SourceMap';
import {exec, ExecException} from 'child_process';
import {WatCompiler} from '../manage/Compiler';
import * as fs from 'fs';
import SourceLine = SourceMap.SourceLine;
import Mapping = SourceMap.Mapping;
import Closure = SourceMap.Closure;
import Variable = SourceMap.Variable;
import TargetInstruction = SourceMap.TargetInstruction;

export abstract class SourceMapper {
    abstract mapping(): Promise<Mapping>;
}

// Maps Wasm to WAT
export class WatMapper implements SourceMapper {
    private readonly tmpdir: string;
    private readonly wabt: string;

    private lineMapping: SourceMap.SourceLine[];

    constructor(compileOutput: String, tmpdir: string, wabt: string) {
        this.lineMapping = [];
        this.parse(compileOutput);
        this.wabt = wabt;
        this.tmpdir = tmpdir;
    }

    public mapping(): Promise<Mapping> {
        return new Promise<Mapping>((resolve, reject) => {
            let functions: Closure[];
            let globals: Variable[];
            let imports: Closure[];
            let sourceMap: Mapping;

            function handleObjDumpStreams(error: ExecException | null, stdout: String, stderr: any) {
                if (stderr.match('wasm-objdump')) {
                    reject('Could not find wasm-objdump in the path');
                } else if (error) {
                    reject(error.message);
                }

                try {
                    functions = WatMapper.getFunctionInfos(stdout);
                    globals = WatMapper.getGlobalInfos(stdout);
                    imports = WatMapper.getImportInfos(stdout);
                } catch (e) {
                    reject(e);
                }
            }

            const objDump = exec(this.getNameDumpCommand(), handleObjDumpStreams);

            sourceMap = {lines: this.lineMapping, functions: [], globals: [], imports: []};
            objDump.on('close', () => {
                sourceMap.functions = functions;
                sourceMap.globals = globals;
                sourceMap.imports = imports;
                resolve(sourceMap);
            });
        });
    }

    private parse(compileOutput: String) {
        this.lineMapping = [];
        const lines = compileOutput.split('\n');
        for (let i = 0; i < lines.length; i++) {
            if (lines[i].match(/@/)) {
                let mapping: SourceLine = WatMapper.extractLineInfo(lines[i]);
                mapping.instructions = WatMapper.extractAddressInfo(lines[i + 1]);
                this.lineMapping.push(mapping);
            }
        }
    }

    private static extractLineInfo(line: string): SourceLine {
        line = line.substring(1);
        const obj: any = new Function(`return ${line}`)();
        return {line: obj.line, columnStart: obj.col_start, columnEnd: obj.col_end, instructions: []};
    }

    private static extractAddressInfo(line?: string): TargetInstruction[] {
        if (line === undefined) {
            return [];
        }

        let regexpr = /^(?<address>([\da-f])+):/;
        let match = line.match(regexpr);
        if (match?.groups) {
            return [{address: match.groups.address}];
        }

        throw Error(`Could not parse address from line: ${line}`);
    }

    private static getFunctionInfos(input: String): Closure[] {
        let functionLines: String[] = extractMajorSection('Sourcemap JSON:', input);

        if (functionLines.length === 0) {
            throw Error('Could not parse \'sourcemap\' section of objdump');
        }

        let sourcemap = JSON.parse(functionLines.join('').replace(/\t/g, ''));
        let functions: Closure[] = [];
        sourcemap.Functions.forEach((func: any, index: number) => {
            let locals: Variable[] = [];
            func.locals.forEach((local: string, index: number) => {
                locals.push({index: index, name: local, type: 'undefined', mutable: true, value: ''});
            });
            functions.push({index: index, name: func.name, arguments: [], locals: locals});
        });
        return functions;
    }

    private static getGlobalInfos(input: String): Variable[] {
        let lines: String[] = extractDetailedSection('Global[', input);
        let globals: Variable[] = [];
        lines.forEach((line) => {
            globals.push(extractGlobalInfo(line));
        });
        return globals;
    }

    private static getImportInfos(input: String): Closure[] {
        let lines: String[] = extractDetailedSection('Import[', input);
        let globals: Closure[] = [];
        lines.forEach((line) => {
            globals.push(extractImportInfo(line));
        });
        return globals;
    }

    private getNameDumpCommand(): string {
        return `${this.wabt}/wasm-objdump -x -m ${this.tmpdir}/upload.wasm`;
    }
}

function extractDetailedSection(section: string, input: String): String[] {
    let lines = input.split('\n');
    let i = 0;
    while (i < lines.length && !lines[i].startsWith(section)) {
        i++;
    }

    if (i >= lines.length) {
        return [];
    }

    let count: number = +(lines[i++].split(/[\[\]]+/)[1]);
    return lines.slice(i, ((isNaN(count)) ? lines.length : i + count));
}

function extractMajorSection(section: string, input: String): String[] {
    let lines = input.split('\n');
    let i = 0;
    while (i < lines.length && !lines[i].startsWith(section)) {
        i++;
    }

    i += 2;
    let start = i;
    while (i < lines.length && lines[i] !== '') {
        i++;
    }

    let count: number = +(lines[i++].split(/[\[\]]+/)[1]);
    return lines.slice(start, i);
}

function extractGlobalInfo(line: String): Variable {
    let global = {} as Variable;
    let match = line.match(/\[([0-9]+)]/);
    global.index = (match === null) ? NaN : +match[1];
    match = line.match(/ ([if][0-9][0-9]) /);
    global.type = (match === null) ? 'undefined' : match[1];
    match = line.match(/<([a-zA-Z0-9 ._]+)>/);
    global.name = ((match === null) ? `${global.index}` : `$${match[1]}`) + ` (${global.type})`;
    match = line.match(/mutable=([0-9])/);
    global.mutable = match !== null && +match[1] === 1;
    match = line.match(/init.*=(.*)/);
    global.value = (match === null) ? '' : match[1];
    return global;
}

function extractImportInfo(line: String): Closure {
    let primitive = {} as Closure;
    let match = line.match(/\[([0-9]+)]/);
    primitive.index = (match === null) ? NaN : +match[1];
    match = line.match(/<([a-zA-Z0-9 ._]+)>/);
    primitive.name = ((match === null) ? `${primitive.index}` : `$${match[1]}`);
    return primitive;
}

// Maps Wasm to AS
export class AsScriptMapper implements SourceMapper {
    private readonly sourceFile: string;
    private readonly watFile: string;
    private readonly tmpdir: string;
    private readonly wabt: string;

    constructor(sourceFile: string, watFile: string, tmpdir: string, wabt: string) {
        this.sourceFile = sourceFile;
        this.watFile = watFile;
        this.wabt = wabt;
        this.tmpdir = tmpdir;
    }

    public mapping(): Promise<Mapping> {
        return new Promise((resolve, reject) => {
            new WatCompiler(this.wabt).compile(this.watFile).then(output => new WatMapper(output.out ?? '', this.tmpdir, this.wabt).mapping()).then(mapping => {
                mapping.lines = this.wasmAsScriptMapping(mapping.lines);
                resolve(mapping);
            }).catch((error) => {
                reject(error);
            });
        });
    }

    private wasmAsScriptMapping(wasmWatMap: SourceLine[]): SourceLine[] {
        // Merge mappings
        const merged: SourceLine[] = [];

        fs.readFileSync(this.watFile).toString().split('\n').forEach((line, index) => {
            if (!line.includes(this.sourceFile)) {
                return;
            }
            const found = line.match(new RegExp(`;;@.*${this.sourceFile}:([0-9]*):([0-9]*)`));
            if (found) {
                const sourceLine: SourceLine | undefined = wasmWatMap.find(info => info.line === index);
                merged.push({
                    line: parseInt(found[1]),
                    columnStart: parseInt(found[2]),
                    columnEnd: parseInt(found[2]),
                    instructions: sourceLine?.instructions ?? []
                } as SourceLine);
            }
        });
        return merged;
    }
}