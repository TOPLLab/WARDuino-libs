import {WASM} from '../sourcemap/Wasm';

export namespace WARDuino {
    import Value = WASM.Value;
    import Frame = WASM.Frame;
    import Table = WASM.Table;
    import Memory = WASM.Memory;

    export interface CallbackMapping {
        callbackid: string;
        tableIndexes: number[]
    }

    export interface InterruptEvent {
        topic: string;
        payload: string;
    }

    export interface BRTable {
        size: string;
        labels: number[];
    }

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
}