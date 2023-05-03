import {Instruction} from '../debug/Instructions';
import {WARDuino} from '../debug/WARDuino';
import {WASM} from '../sourcemap/Wasm';
import {ackParser, breakpointParser, stateParser} from './Parsers';
import {Breakpoint} from '../debug/Breakpoint';
import Value = WASM.Value;
import Frame = WASM.Frame;
import Table = WASM.Table;
import Memory = WASM.Memory;
import BRTable = WARDuino.BRTable;
import CallbackMapping = WARDuino.CallbackMapping;
import InterruptEvent = WARDuino.InterruptEvent;

// WARDuino VM State - format returned by inspect/dump requests
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

// An acknowledgement returned by the debugger
export interface Ack {
    ack: string
}

// A request represents a debug message and its parser
export interface Request<R> {
    instruction: Instruction,     // instruction of the debug message (pause, run, step, ...)
    payload?: string,             // optional payload of the debug message
    parser: (input: string) => R  // the parser for the response to the debug message
}

export namespace Request {
    export const run: Request<Ack> = {
        instruction: Instruction.run,
        parser: (line: string) => {
            return ackParser(line, 'GO');
        }
    };

    export const halt: Request<Ack> = {
        instruction: Instruction.halt,
        parser: (line: string) => {
            return ackParser(line, 'STOP');
        }
    };


    export const pause: Request<Ack> = {
        instruction: Instruction.pause,
        parser: (line: string) => {
            return ackParser(line, 'PAUSE');
        }
    };

    export const step: Request<Ack> = {
        instruction: Instruction.step,
        parser: (line: string) => {
            return ackParser(line, 'STEP');
        }
    };

    export function addBreakpoint(payload: Breakpoint): Request<Breakpoint> {
        return {
            instruction: Instruction.addBreakpoint,
            payload: payload.toString(),
            parser: breakpointParser
        };
    }

    export function removeBreakpoint(payload: Breakpoint): Request<Breakpoint> {
        return {
            instruction: Instruction.removeBreakpoint,
            payload: payload.toString(),
            parser: breakpointParser
        };
    }

    export function inspect(payload: string): Request<State> {
        return {
            instruction: Instruction.inspect,
            payload: payload,
            parser: stateParser
        }
    }

    export const dump: Request<State> = {
        instruction: Instruction.dump,
        parser: stateParser
    };

    export const dumpLocals: Request<State> = {
        instruction: Instruction.dumpLocals,
        parser: stateParser
    };

    export const dumpAll: Request<State> = {
        instruction: Instruction.dumpAll,
        parser: stateParser
    };

    export const reset: Request<Ack> = {
        instruction: Instruction.reset,
        parser: (line: string) => {
            return ackParser(line, 'RESET');
        }
    };

    export const updateFunction: Request<Ack> = {
        instruction: Instruction.updateFunction,
        parser: (line: string) => {
            return ackParser(line, 'CHANGE function');
        }
    }

    export const updateLocal: Request<Ack> = {
        instruction: Instruction.updateLocal,
        parser: (line: string) => {
            return ackParser(line, 'CHANGE local');
        }
    }

    export const updateModule: Request<Ack> = {
        instruction: Instruction.updateModule,
        parser: (line: string) => {
            return ackParser(line, 'CHANGE Module');
        }
    }

    export const invoke: Request<State> = {
        instruction: Instruction.invoke,
        parser: stateParser
    }

    export const snapshot: Request<State> = {
        instruction: Instruction.snapshot,
        parser: stateParser
    }

    export const dumpAllEvents: Request<State> = {
        instruction: Instruction.dumpAllEvents,
        parser: stateParser
    }

    export const dumpEvents: Request<State> = {
        instruction: Instruction.dumpEvents,
        parser: stateParser
    }

    export const dumpCallbackmapping: Request<State> = {
        instruction: Instruction.dumpCallbackmapping,
        parser: stateParser
    }
}
