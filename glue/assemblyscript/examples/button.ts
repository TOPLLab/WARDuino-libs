// config.button demo app
import {
    delay,
    digitalRead,
    digitalWrite,
    InterruptMode,
    interruptOn,
    MQTT,
    pinMode,
    PinMode,
    PinVoltage
} from "../src/index";
import {config} from "./config";

function invert(voltage: PinVoltage): PinVoltage {
    switch (voltage) {
        case PinVoltage.LOW:
            return PinVoltage.HIGH;
        case PinVoltage.HIGH:
        default:
            return PinVoltage.LOW;
    }
}

function toggleLED(_topic: string, _payload: string): void {
    // Get current status of LED
    let status = digitalRead(config.led);
    // Toggle LED
    digitalWrite(config.led, invert(status));
}

export function main(): void {
    pinMode(config.button, PinMode.INPUT);
    pinMode(config.led, PinMode.OUTPUT);

    interruptOn(config.button, InterruptMode.FALLING, toggleLED);

    while (true) {
        delay(1000);
        MQTT.loop();
    }
}

