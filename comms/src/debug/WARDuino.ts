export namespace WARDuino {
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
}