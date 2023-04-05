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

    interface Value {
        type: Type;
        value: number;
    }
}