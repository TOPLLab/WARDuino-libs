import {WASM} from '../sourcemap/Wasm';
import * as ieee754 from 'ieee754';
import {State} from './Requests';

export function stateParser(text: string): State {
    return JSON.parse(text);
}

export function defaultParser(text: string): any {
    return JSON.parse(text);
}

function resetParser(text: string): Object {
    if (!text.toLowerCase().includes('reset')) {
        throw new Error();
    }

    return ackParser(text);
}

function ackParser(text: string): Object {
    return {'ack': text};
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
