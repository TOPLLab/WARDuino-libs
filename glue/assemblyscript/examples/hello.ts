// Hello world!
import {print, delay} from "as-warduino/assembly";

export function main(): void {
    while (true) {
        print("Hello world!");
        delay(1000);
    }
}
