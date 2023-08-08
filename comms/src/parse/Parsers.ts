import {WASM} from '../sourcemap/Wasm';
import * as ieee754 from 'ieee754';
import {Ack, Exception} from './Requests';
import {Breakpoint} from '../debug/Breakpoint';
import {WARDuino} from '../debug/WARDuino';
import State = WARDuino.State;

export function identityParser(text: string) {
    return stripEnd(text);
}

export function stateParser(text: string): State {
    return JSON.parse(text);
}

export function invokeParser(text: string): State | Exception {
    if (exception(text)) {
        return {text: text};
    }
    return stateParser(text);
}

function exception(text: string): boolean {
    return text.trim()[0] !== "{" && !text.trim().includes('Interrupt');
}

export function ackParser(text: string, ack: string): Ack {
    if (text.toLowerCase().includes(ack.toLowerCase())) {
        return {'text': identityParser(text)};
    }
    throw Error(`No ack for ${ack}.`);
}

export function breakpointParser(text: string): Breakpoint {
    const ack: Ack = ackParser(text, 'BP');

    let breakpointInfo = ack.text.match(/BP (0x.*)!/);
    if (breakpointInfo!.length > 1) {
        return new Breakpoint(parseInt(breakpointInfo![1]), 0); // TODO address to line mapping
    }

    throw new Error('Could not parse BREAKPOINT address in ack.');
}

function returnParser(text: string): Object {
    const object = JSON.parse(text);
    if (object.stack.length === 0) {
        return object;
    }

    const result: any = object.stack[0];
    const type: WASM.Type = WASM.typing.get(result.type.toLowerCase()) ?? WASM.Type.unknown;
    if (type === WASM.Type.f32 || type === WASM.Type.f64) {
        const buff = Buffer.from(result.value, 'hex');
        result.value = ieee754.read(buff, 0, false, 23, buff.length);
    }

    return result;
}

// Strips all trailing newlines
function stripEnd(text: string): string {
    return text.replace(/\s+$/g, '');
}