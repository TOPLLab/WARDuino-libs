import {Instruction} from '../debug/Instructions';
import {WARDuino} from '../debug/WARDuino';
import {WASM} from '../sourcemap/Wasm';
import {stateParser} from './Parsers';
import Value = WASM.Value;
import Frame = WASM.Frame;
import Table = WASM.Table;
import Memory = WASM.Memory;
import BRTable = WARDuino.BRTable;
import CallbackMapping = WARDuino.CallbackMapping;
import InterruptEvent = WARDuino.InterruptEvent;

export interface State {
    pc?: number;
    pc_error?: number;
    exception_msg?: string;
    breakpoints?: number[];
    stack?: Value[];
    callstack?: Frame[];
    globals?: Value[];
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
    expectedResponse?: (input: string) => boolean // TODO remove
}

const IdentityParser = (line: string) => {
    return line;
}

export namespace Request {
    export const run: Request<string> = {
        instruction: Instruction.run,
        parser: (line: string) => {
            if (line !== 'GO!') {
                throw Error("invalid ack for run request");
            }
            return line;
        }
    };

    export const pause: Request<string> = {
        instruction: Instruction.pause,
        parser: (line: string) => {
            if (line !== 'PAUSE!') {
                throw Error("invalid ack for pause request");
            }
            return line;
        }
    };

    export const step: Request<string> = {
        instruction: Instruction.step,
        parser: (line: string) => {
            if (line !== 'STEP!') {
                throw Error("invalid ack for step request");
            }
            return line;
        }
    };

    export const dump: Request<State> = {
        instruction: Instruction.dump,
        parser: stateParser
    };

    export function inspect(payload: string): Request<State> {
        return {
            instruction: Instruction.inspect,
            payload: payload,
            parser: (input: string) => {
                const parsed: State = JSON.parse(input);
                return parsed;
            }
        }
    }
}

type RequestBuilder<R> = (payload: string) => Request<R>;

export class RequestFactory {
    private static readonly requestTable: Map<Instruction, Request<any>> = new Map([
        [Instruction.run, Request.run],
        [Instruction.step, Request.step],
        [Instruction.pause, Request.pause],
    ]);

    private static readonly requestBuilderTable: Map<Instruction, RequestBuilder<any>> = new Map([
        [Instruction.inspect, Request.inspect]
    ]);

    public static getRequest(instruction: Instruction, payload?: string): Request<any> | undefined {
        if (payload && RequestFactory.requestBuilderTable.has(instruction)) {
            return RequestFactory.requestBuilderTable.get(instruction)!(payload);
        }

        if (RequestFactory.requestTable.has(instruction)) {
            return RequestFactory.requestTable.get(instruction);
        }

        return undefined;
    }
}