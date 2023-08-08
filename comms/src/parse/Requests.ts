import {Instruction} from '../debug/Instructions';
import {WARDuino} from '../debug/WARDuino';
import {ackParser, breakpointParser, invokeParser, stateParser} from './Parsers';
import {Breakpoint} from '../debug/Breakpoint';
import {WASM} from '../sourcemap/Wasm';
import ieee754 from 'ieee754';

// An acknowledgement returned by the debugger
export interface Ack {
    text: string
}

export interface Exception extends Ack {
}

// A request represents a debug message and its parser
export interface Request<R> {
    instruction: Instruction,     // instruction of the debug message (pause, run, step, ...)
    payload?: string,             // optional payload of the debug message
    parser: (input: string) => R  // the parser for the response to the debug message
}

export namespace Request {
    import State = WARDuino.State;
    import Value = WASM.Value;
    import Type = WASM.Type;
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

    export function invoke(fidx: number, args: Value[]): Request<State | Exception> {
        let payload: string = WASM.leb128(fidx);
        args.forEach((arg: Value) => {
            if (arg.type === Type.i32 || arg.type === Type.i64) {
                payload += WASM.leb128(arg.value);
            } else {
                const buff = Buffer.alloc(arg.type === Type.f32 ? 4 : 8);
                ieee754.write(buff, arg.value, 0, true, 23, buff.length);
                payload += buff.toString('hex');
            }
        });

        return {
            instruction: Instruction.invoke,
            payload: payload,
            parser: invokeParser
        }
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
