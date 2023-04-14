import { Instruction } from "../debug/Instructions";

export interface StackValue {
    idx: number,
    type: string;
    value: number | bigint;
}

export interface CallbackMapping {
    callbackid: string;
    tableIndexes: number[]
}

export interface InterruptEvent {
    topic: string;
    payload: string;
}

export interface Frame {
    type: number;
    fidx: string;
    sp: number;
    fp: number;
    block_key: number;
    ra: number;
    idx: number;
}

export interface Table {
    max: number;
    init: number;
    elements: number[];
}

export interface Memory {
    pages: number;
    max: number;
    init: number;
    bytes: Uint8Array;
}

export interface BRTable {
    size: string;
    labels: number[];
}

export interface State {
    pc?: number;
    pc_error?: number;
    exception_msg?: string;
    breakpoints?: number[];
    stack?: StackValue[];
    callstack?: Frame[];
    globals?: StackValue[];
    table?: Table;
    memory?: Memory;
    br_table?: BRTable;
    callbacks?: CallbackMapping[];
    events?: InterruptEvent[];
}


export interface Request<R> {
    instruction: Instruction,
    payload?: string,
    parser: (input: string) => R,
    expectedResponse?: (input: string) => boolean
}

export type RequestBuilder<R> = (payload: string) => Request<R>;


const IdentityParser = (line: string) => {
    return line;
}

export const RunRequest: Request<string> = {
    instruction: Instruction.run,
    expectedResponse: (line: string) => {
        return line.includes("GO!");
    },
    parser: IdentityParser
}


export const PauseRequest: Request<string> = {
    instruction: Instruction.pause,
    expectedResponse: (line: string) => {
        return line.includes("PAUSE!");
    },
    parser: IdentityParser
}

export const StepRequest: Request<string> = {
    instruction: Instruction.step,
    expectedResponse: (line) => {
        return line.includes("STEP");
    },
    parser: IdentityParser
}


export function InspectRequest(payload: string): Request<State> {
    return {
        instruction: Instruction.inspect,
        payload: payload,
        parser: (input: string) => {
            const parsed: State = JSON.parse(input);
            return parsed;
        }
    }
}

export const requestTable: Map<Instruction, Request<any>> = new Map([
    [Instruction.run, RunRequest],
    [Instruction.step, StepRequest],
    [Instruction.pause, PauseRequest],
]);


export const requestBuilderTable: Map<Instruction, RequestBuilder<any>> = new Map([
    [Instruction.inspect, InspectRequest]
]);