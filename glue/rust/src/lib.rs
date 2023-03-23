//! warduino - WARDuino primitives library
//!
//! <br>
//!
//! WARDuino is a dynamic WebAssembly runtime for embedded devices, that
//! provides primitives to access hardware and IoT specific functionality.
//!
//! The `warduino` crate allows using these primitives from Rust.
//!
//! <br>
//!
//! # Usage
//!
//! ```toml
//! [dependencies]
//! warduino = "0.1.0"
//! ```
//!
//! ```rust
//!use warduino::*;
//!
//!pub fn main() {
//!    let led = 2;
//!    pin_mode(led, OUTPUT);
//!
//!    let pause = 1000;
//!    loop {
//!        digital_write(led, HIGH);
//!        delay(pause);
//!        digital_write(led, LOW);
//!        delay(pause);
//!    }
//!}
//! ```

#![crate_name = "warduino"]

use std::mem;

#[link(wasm_import_module = "env")]
extern {
    // Time
    #[link_name = "millis"]                 fn _millis() -> u32;
    #[link_name = "chip_delay"]             fn _delay(ms: u32);

    // Digital I/O
    #[link_name = "chip_pin_mode"]          fn _pinMode(pin: u32, mode: u32);
    #[link_name = "chip_digital_write"]     fn _digitalWrite(pin: u32, value: u32);
    #[link_name = "chip_digital_read"]      fn _digitalRead(pin: u32) -> u32;
    #[link_name = "chip_analog_read"]       fn _analogRead(pin: u32) -> i32;

    // Serial
    #[link_name = "print_string"]       fn _print_buffer(text: *const u8, length: usize);
    #[link_name = "print_int"]          fn _print_int(integer: i32);

    // Wi-Fi
    #[link_name = "wifi_connect"]      fn _connect(ssid: &str, password: &str);
    #[link_name = "wifi_status"]       fn _status() -> i32;
    #[link_name = "wifi_localip"]      fn _localip(buffer: *const u8, buffer_length: usize) -> i32;

    // HTTP
    #[link_name = "http_get"]           fn _get(url: *const u8, url_len: usize, buffer: *const u8, buffer_size: usize) -> i32;
    #[link_name = "http_post"]          fn _post(url: *const u8, url_len: usize,
                                                 body: *const u8, body_len: usize,
                                                 content_type: *const u8, content_type_len: usize,
                                                 authorization: *const u8, authorization_len: usize,
                                                 buffer: *const u8, buffer_size: usize)
                                           -> i32;
    

    // Interrupts
    #[link_name = "subscribe_interrupt"]  fn _sub_interrupt(pin: u32, f: fn(&str, &str, u32), mode: u32);
    #[link_name = "unsubscribe_interrupt"]  fn _unsub_interrupt(pin: u32);

    // MQTT
    #[link_name = "mqtt_init"]          fn _mqtt_init(server: *const u8, server_length: usize, port: u32);
    #[link_name = "mqtt_connect"]       fn _mqtt_connect(client_id: *const u8, client_id_length: usize) -> i32;
    #[link_name = "mqtt_connected"]     fn _mqtt_connected() -> i32;
    #[link_name = "mqtt_state"]         fn _mqtt_state() -> i32;
    #[link_name = "mqtt_publish"]       fn _mqtt_publish(topic: *const u8, topic_length: usize, payload: *const u8, payload_length: usize) -> i32;
    #[link_name = "mqtt_subscribe"]     fn _mqtt_subscribe(topic: *const u8, topic_length: usize, f: fn(&str, &str, u32)) -> i32;
    #[link_name = "mqtt_unsubscribe"]   fn _mqtt_unsubscribe(topic: *const u8, topic_length: usize, f: fn(&str, &str, u32)) -> i32;
    #[link_name = "mqtt_loop"]          fn _mqtt_loop() -> i32;
}

#[repr(C)]
pub struct Headers {
    pub content_type: &'static str,
    pub authorization: &'static str,
}

#[repr(C)]
pub struct PostOptions {
    pub uri: &'static str,
    pub body: String,
    pub headers: Headers,
}

fn size_of_post_options(options: &PostOptions) -> usize {
    options.uri.len() + options.body.len() + options.headers.content_type.len()
}

/// LOW voltage on a digital I/O pin
pub static LOW     : u32 = 0x0;
/// HIGH voltage on a digital I/O pin
pub static HIGH    : u32 = 0x1;

/// CHANGING edge on a digital I/O pin
pub static CHANGE  : u32 = 1;
/// FALLING edge on a digital I/O pin
pub static FALLING : u32 = 2;
/// RISING edge on a digital I/O pin
pub static RISING  : u32 = 3;

/// Input mode for digital pins
pub static INPUT   : u32 = 0x0;
/// Output mode for digital pins
pub static OUTPUT  : u32 = 0x2;

/// Returns the number of milliseconds passed since the current program started to run.
pub fn millis       () -> u32               { unsafe { _millis() } }
/// Pauses the program for the amount of time (in milliseconds).
pub fn delay        (ms: u32)               { unsafe { _delay(ms); } }
/// Configures the specified pin to behave either as an [INPUT] or an [OUTPUT].
pub fn pin_mode     (pin: u32, mode: u32)   { unsafe { _pinMode(pin, mode) } }
/// Write the value to a specified digital pin, either [HIGH] or [LOW].
pub fn digital_write(pin: u32, value: u32)  { unsafe { _digitalWrite(pin, value) } }
/// Reads the value from a specified digital pin, either [HIGH] or [LOW].
pub fn digital_read (pin: u32) -> u32       { unsafe { _digitalRead(pin) } }
/// Reads the value from the specified analog pin.
pub fn analog_read  (pin: u32) -> i32       { unsafe { _analogRead(pin) } }

/// Connect to Wi-Fi network with SSID and password
pub fn wifi_connect (ssid: &str, password: &str)            { unsafe { _connect(ssid, password) } }
/// Returns the status of the Wi-Fi connection of the board
pub fn wifi_status  () -> i32                               { unsafe { _status() } }
/// Returns the local IP address of the board
pub fn wifi_localip () -> String                            { unsafe { let buffer: [u8; 100] = [0; 100];
                                                                       _localip(buffer.as_ptr(), mem::size_of_val(&buffer) / mem::size_of::<u8>());
                                                                       std::str::from_utf8(&buffer).unwrap().to_owned()
                                                            } }

/// Send an HTTP GET request.
pub fn get  (url: &str, buffer: &[u8]) -> i32               { unsafe { _get(url.as_ptr(), url.len(), buffer.as_ptr(), mem::size_of_val(buffer) / mem::size_of::<u8>()) } }
/// Send an HTTP POST request.
pub fn post (options: &PostOptions, buffer: &[u8]) -> i32   { unsafe {
        _post(options.uri.as_ptr(), options.uri.len(),
              options.body.as_ptr(), options.body.len(),
              options.headers.content_type.as_ptr(), options.headers.content_type.len(),
              options.headers.authorization.as_ptr(), options.headers.authorization.len(),
              buffer.as_ptr(), mem::size_of_val(buffer) / mem::size_of::<u8>())
    }
}

/// Print a string to the serial port.
pub fn print        (text: &[u8])   { unsafe { _print_buffer(text.as_ptr(), text.len()) } }
/// Print an integer to the serial port.
pub fn print_int    (integer: i32)  { unsafe { _print_int(integer) } }

/// subscribe a callback function to an interrupt on the given pin
pub fn sub_interrupt    (pin: u32, f: fn(&str, &str, u32), mode: u32)    { unsafe { _sub_interrupt(pin, f, mode) } }
/// Unsubscribe all callback functions for a given pin
pub fn unsub_interrupt    (pin: u32)    { unsafe { _unsub_interrupt(pin) } }

/// Configure a MQTT broker
pub fn mqtt_init        (server: &str, port: u32)                       { unsafe { _mqtt_init(server.as_ptr(), server.len(), port) } }
/// Connect to the Configured MQTT broker with client_id
pub fn mqtt_connect     (client_id: &str) -> bool                       { unsafe { _mqtt_connect(client_id.as_ptr(), client_id.len()) != 0 } }
/// Returns whether the board is still connected to the MQTT broker
pub fn mqtt_connected   () -> bool                                      { unsafe { _mqtt_connected() > 0 } }
/// Returns the status of the connection to the MQTT broker
pub fn mqtt_state       () -> i32                                       { unsafe { _mqtt_state() } }
/// Publish a message on an MQTT topic
pub fn mqtt_publish     (topic: &str, payload: &str) -> i32             { unsafe { _mqtt_publish(topic.as_ptr(), topic.len(), payload.as_ptr(), payload.len()) } }
/// Subscribe a callback function to an MQTT topic
pub fn mqtt_subscribe   (topic: &str, f: fn(&str, &str, u32)) -> i32    { unsafe { _mqtt_subscribe(topic.as_ptr(), topic.len(), f) } }
/// Unsubscribe a callback function from an MQTT topic
pub fn mqtt_unsubscribe (topic: &str, f: fn(&str, &str, u32)) -> i32    { unsafe { _mqtt_unsubscribe(topic.as_ptr(), topic.len(), f) } }
/// Check for messages from the MQTT broker
pub fn mqtt_loop        () -> i32                                       { unsafe { _mqtt_loop() } }

