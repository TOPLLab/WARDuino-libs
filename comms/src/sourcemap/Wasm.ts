export namespace WASM {
    export enum Type {
        f32,
        f64,
        i32,
        i64,
        unknown
    }

    export const typing = new Map<string, Type>([
        ['f32', Type.f32],
        ['f64', Type.f64],
        ['i32', Type.i32],
        ['i64', Type.i64]
    ]);

    export interface Value {
        type: Type;
        value: number;
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

}