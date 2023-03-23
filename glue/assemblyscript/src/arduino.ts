@external("env", "millis")              export declare function millis(): u32;
@external("env", "chip_delay")          export declare function delay(ms: u32): void;
@external("env", "chip_pin_mode")       export declare function pin_mode(pin: u32, mode: u32): void;
@external("env", "chip_digital_write")  export declare function digital_write(pin: u32, value: u32): void;
@external("env", "chip_digital_read")   export declare function digital_read(pin: u32): u32;
@external("env", "chip_analog_read")    export declare function analog_read(pin: u32): i32;

@external("env", "print_string")        declare function _print(text: ArrayBuffer, length: u32): void;

@external("env", "wifi_connect")        declare function _wifi_connect(ssid: ArrayBuffer, length: i32, password: ArrayBuffer, size: i32): void;
@external("env", "wifi_status")         export declare function wifi_status(): i32;
@external("env", "wifi_localip")        declare function _wifi_localip(buff: ArrayBuffer, buffer_size: u32): i32;

@external("env", "http_get")            declare function _http_get(url: ArrayBuffer, url_len: u32, buffer: ArrayBuffer, buffer_size: u32): i32;
@external("env", "http_post")           declare function _http_post(url: ArrayBuffer, url_len: u32,
                                                                    body: ArrayBuffer, body_len: u32,
                                                                    content_type: ArrayBuffer, content_type_len: u32,
                                                                    authorization: ArrayBuffer, authorization_len: u32,
                                                                    buffer: ArrayBuffer, buffer_size: u32): i32;

@external("env", "init_pixels") export declare function init_pixels(): void;
@external("env", "clear_pixels") export declare function clear_pixels(): void;
@external("env", "set_pixel_color") export declare function set_pixel_color(ledIndex: i32, r: i32, g: i32, b:i32): void;
@external("env", "show_pixels") export declare function show_pixels(): void;

export const LOW: u32 = 0;
export const HIGH: u32 = 1;

export const INPUT: u32 = 0x0;
export const OUTPUT: u32 = 0x2;

export function print(text: string): void {
    _print(String.UTF8.encode(text, true), String.UTF8.byteLength(text, true));
}

export function wifi_connect(ssid: string, password: string): void {
    _wifi_connect(String.UTF8.encode(ssid, true), String.UTF8.byteLength(ssid, true),
                  String.UTF8.encode(password, true), String.UTF8.byteLength(password, true));
}

export function wifi_localip(): string {
    let localip = new ArrayBuffer(20);
    _wifi_localip(localip, localip.byteLength);
    return String.UTF8.decode(localip, true);
}

export function http_get(url: string, buffer: ArrayBuffer): i32 {
    return _http_get(String.UTF8.encode(url, true), String.UTF8.byteLength(url, true), buffer, buffer.byteLength);
}

class Options {
    url: string;
    body: string;
    content_type: string;
    authorization: string;
}

//export function http_post(url: string, body: string, content_type: string, authorization: string, response: ArrayBuffer): i32 {
export function http_post(options: Options, response: ArrayBuffer): i32 {
    return _http_post(String.UTF8.encode(options.url, true), String.UTF8.byteLength(options.url, true),
                      String.UTF8.encode(options.body, true), String.UTF8.byteLength(options.body, true),
                      String.UTF8.encode(options.content_type, true), String.UTF8.byteLength(options.content_type, true),
                      String.UTF8.encode(options.authorization, true), String.UTF8.byteLength(options.authorizatio, true),
                      response, response.byteLength);
}
