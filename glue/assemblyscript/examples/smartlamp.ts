// Simple smart lamp app demo
import {
    delay,
    digitalRead,
    digitalWrite,
    InterruptMode,
    interruptOn,
    MQTT,
    pinMode,
    PinMode,
    PinVoltage,
    print,
    sleep,
    WiFi
} from "as-warduino/assembly";
import {config} from "./config";

function until(done: () => boolean, attempt: () => void): void {
    while (!done()) {
        delay(1000);
        attempt();
    }
}

function callback(topic: string,
                  payload: string): void {
    print("Message [" + topic + "] " + payload + "\n");

    if (payload.includes("on")) {
        digitalWrite(config.led, PinVoltage.HIGH);  // Turn the LED on
    } else {
        digitalWrite(config.led, PinVoltage.LOW);   // Turn the LED off
    }
}

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
    // Set pin modes
    pinMode(config.led, PinMode.OUTPUT);
    pinMode(config.button, PinMode.INPUT);

    // Connect to Wi-Fi
    until(WiFi.connected,
        () => {
            WiFi.connect(config.ssid, config.password);
        });
    let message = "Connected to wifi network with ip: ";
    print(message.concat(WiFi.localip()));

    // Connect to MQTT broker
    MQTT.configureBroker(config.brokerUrl, config.brokerPort);
    until(MQTT.connected,
        () => {
            MQTT.connect(config.clientId);
            MQTT.loop();
        });

    // Subscribe to MQTT topic and turn on LED
    MQTT.subscribe("LED", callback);
    MQTT.publish("LED", "on");

    // Subscribe to button interrupt
    interruptOn(config.button, InterruptMode.CHANGED, toggleLED);

    while (true) {
        until(MQTT.connected,
            () => {
                MQTT.connect(config.clientId);
                MQTT.loop();
            });

        sleep(5); // Sleep for 5 seconds
    }
}
