/**
 * as-warduino - WARDuino primitives library
 *
 * <br>
 *
 * WARDuino is a dynamic WebAssembly runtime for embedded devices, that
 * provides primitives to access hardware and IoT specific functionality.
 *
 * The `as-warduino` package allows using these primitives from AssemblyScript.
 *
 * <br>
 *
 * # Usage
 *
 * ```ts
 * import {pin_mode, digital_write, delay, OUTPUT, HIGH, LOW} from "as-warduino";
 *
 * export function main(): void {
 *   let led = 34;
 *   warduino.pin_mode(led, OUTPUT);
 *
 *   let pause = 1000;
 *   while (true) {
 *     digital_write(led, HIGH);
 *     delay(pause);
 *     digital_write(led, LOW);
 *     delay(pause);
 *   }
 * }
 * ```
 */

// Time primitives

/** Returns the number of milliseconds passed since the current program started to run. */
@external("env", "millis")              export declare function millis(): u32;
/** Pauses the program for the amount of time (in milliseconds). */
@external("env", "chip_delay")          export declare function delay(ms: u32): void;

// Digital I/O primitives

@external("env", "chip_pin_mode")       declare function _pin_mode(pin: u32, mode: u32): void;
@external("env", "chip_digital_write")  declare function _digital_write(pin: u32, value: u32): void;
@external("env", "chip_digital_read")   declare function _digital_read(pin: u32): u32;

/** Reads the value from the specified analog pin. */
@external("env", "chip_analog_read")    export declare function analog_read(pin: u32): i32;

// Interrupts primitives

@external("env", "subscribe_interrupt") declare function subscribe_interrupt(pin: u32, fn: () => void, mode: u32): void;

// Serial
@external("env", "print_string")        declare function _print(text: ArrayBuffer, length: u32): void;

// Wi-Fi
@external("env", "wifi_connect")        declare function _wifi_connect(ssid: ArrayBuffer, length: i32, password: ArrayBuffer, size: i32): void;

/** Returns the status of the Wi-Fi connection of the board. */
@external("env", "wifi_status")         export declare function wifi_status(): i32;
@external("env", "wifi_localip")        declare function _wifi_localip(buff: ArrayBuffer, buffer_size: u32): i32;

// HTTP
@external("env", "http_get")            declare function _http_get(url: ArrayBuffer, url_len: u32, buffer: ArrayBuffer, buffer_size: u32): i32;
@external("env", "http_post")           declare function _http_post(url: ArrayBuffer, url_len: u32,
                                                                    body: ArrayBuffer, body_len: u32,
                                                                    content_type: ArrayBuffer, content_type_len: u32,
                                                                    authorization: ArrayBuffer, authorization_len: u32,
                                                                    buffer: ArrayBuffer, buffer_size: u32): i32;

// MQTT
@external("env", "mqtt_init")        declare function  _mqtt_init(server: ArrayBuffer, length: i32, port: u32): void;
@external("env", "mqtt_connect")     declare function  _mqtt_connect(client_id: ArrayBuffer, length: i32): i32;
@external("env", "mqtt_connected")   declare function  _mqtt_connected(): i32;

/** Returns the status of the connection to the MQTT broker. */
@external("env", "mqtt_state")       export declare function  mqtt_state(): i32;

@external("env", "mqtt_publish")     declare function  _mqtt_publish(topic: ArrayBuffer, topic_length: i32, payload: ArrayBuffer, payload_length: i32): i32;

/** Subscribe a callback function to an MQTT topic. */
@external("env", "mqtt_subscribe")   export declare function  mqtt_subscribe(topic: string, fn: (topic: string, payload: string) => void): i32;

/** Unsubscribe a callback function from an MQTT topic. */
@external("env", "mqtt_unsubscribe") export declare function  mqtt_unsubscribe(topic: string, fn: (topic: string, payload: string) => void): i32;

/**  Check for messages from the MQTT broker. */
@external("env", "mqtt_loop")        export declare function  mqtt_loop(): i32;

// Neopixel
@external("env", "init_pixels")      export declare function init_pixels(): void;
@external("env", "clear_pixels")     export declare function clear_pixels(): void;
@external("env", "set_pixel_color")  export declare function set_pixel_color(ledIndex: i32, r: i32, g: i32, b:i32): void;
@external("env", "show_pixels")      export declare function show_pixels(): void;

/** The voltage of a digital pin. */
export enum PinVoltage {
    /** Low voltage on a digital I/O pin */
    LOW  = 0,
    /** High voltage on a digital I/O pin */
    HIGH = 1,
}

/** The mode of a pin interrupt. */
export enum InterruptMode {
    /** Changing edge on a digital I/O pin */
    CHANGED = 1,
    /** Falling edge on a digital I/O pin */
    FALLING = 2,
    /** Rising edge on a digital I/O pin */
    RISING  = 3,
}

/** The mode of a digital I/O pin. */
export enum PinMode {
    /** Input mode for digital pins */
    INPUT  = 0x0,
    /** Output mode for digital pins */
    OUTPUT = 0x2,
}

/** Pauses the program for the amount of time (in seconds). */
export function sleep(s: u32): void {
    delay(s * 1000);
}

/** Configures the [PinMode] of the specified pin. */
export function pinMode(pin: u32, mode: PinMode) {
    _pin_mode(pin, mode);
}

/** Write the voltage to a specified digital pin, either [HIGH](PinVoltage) or [LOW](PinVoltage). */
export function digital_write(pin: u32, value: PinVoltage) {
    _digital_write(pin, value);
}

/** Reads the value from a specified digital pin, either [HIGH](PinVoltage) or [LOW](PinVoltage). */
export function digital_read(pin: u32): PinVoltage {
    return _digital_read(pin);
}

/** Subscribe a callback function to an interrupt on the given pin. */
export function interrupt_on(pin: u32, mode: InterruptMode, fn: () => void): void {
    subscribe_interrupt(pin, fn, mode);
}

/** Print a string to the serial port. */
export function print(text: string): void {
    _print(String.UTF8.encode(text, true), String.UTF8.byteLength(text, true));
}

/** Connect to Wi-Fi network with SSID and password. */
export function wifi_connect(ssid: string, password: string): void {
    _wifi_connect(String.UTF8.encode(ssid, true), String.UTF8.byteLength(ssid, true),
                  String.UTF8.encode(password, true), String.UTF8.byteLength(password, true));
}

/** Returns the local IP address of the board. */
export function wifi_localip(): string {
    let localip = new ArrayBuffer(20);
    _wifi_localip(localip, localip.byteLength);
    return String.UTF8.decode(localip, true);
}

/** Send an HTTP GET request. The response is written to an ArrayBuffer. */
export function http_get(url: string, response: ArrayBuffer): i32 {
    return _http_get(String.UTF8.encode(url, true), String.UTF8.byteLength(url, true), response, response.byteLength);
}

export class PostOptions {
    url: string;
    body: string;
    content_type: string;
    authorization: string;
}

/** Send an HTTP POST request. The response is written to an ArrayBuffer. */
export function http_post(options: PostOptions, response: ArrayBuffer): i32 {
    return _http_post(String.UTF8.encode(options.url, true), String.UTF8.byteLength(options.url, true),
                      String.UTF8.encode(options.body, true), String.UTF8.byteLength(options.body, true),
                      String.UTF8.encode(options.content_type, true), String.UTF8.byteLength(options.content_type, true),
                      String.UTF8.encode(options.authorization, true), String.UTF8.byteLength(options.authorizatio, true),
                      response, response.byteLength);
}

/**  Configure an MQTT broker. */
export function mqtt_init(server: string, port: u32): void {
    _mqtt_init(String.UTF8.encode(server, true), String.UTF8.byteLength(server, true), port);
}

/** Connect to the Configured MQTT broker with client_id. */
export function mqtt_connect(client_id: string): i32 {
    return _mqtt_connect(String.UTF8.encode(client_id, true), String.UTF8.byteLength(client_id, true));
}

/** Returns whether the board is still connected to the MQTT broker. */
export function mqtt_connected(): bool {
    return _mqtt_connected() == 1;
}

/** Publish a message on an MQTT topic. */
export function mqtt_publish(topic: string, payload: string): i32 {
    return _mqtt_publish(String.UTF8.encode(topic, true), String.UTF8.byteLength(topic, true), String.UTF8.encode(payload, true), String.UTF8.byteLength(payload, true));
}
