// Simple smart lamp app demo
use warduino::{delay, digital_read, digital_write, InterruptMode, mqtt_connect, mqtt_connected,
               mqtt_init, mqtt_loop, mqtt_publish, mqtt_subscribe, pin_mode, PinMode, PinVoltage,
               print, sleep, sub_interrupt, wifi_connect, wifi_connected, wifi_localip};

mod config;

fn until(done: fn() -> bool, attempt: fn()) {
    while !done() {
        delay(1000);
        attempt();
    }
}

fn callback(topic: &str, payload: &str, size: u32) {
    print(&format!("Message [{}] {}\n", topic, payload));

    if payload.contains("on") {
        digital_write(config::LED, PinVoltage::HIGH);  // Turn the LED on
    } else {
        digital_write(config::LED, PinVoltage::LOW);   // Turn the LED off
    }
}

fn invert(voltage: PinVoltage) -> PinVoltage {
    match voltage {
        PinVoltage::LOW => return PinVoltage::HIGH,
        PinVoltage::HIGH => return PinVoltage::LOW,
    }
}

fn toggle_led(_topic: &str, _payload: &str, _size: u32) {
    // Get current status of LED
    let status = digital_read(config::LED);
    // Toggle LED
    digital_write(config::LED, invert(status));
}

#[no_mangle]
pub fn main() {
    // Set pin modes
    pin_mode(config::LED, PinMode::OUTPUT);
    pin_mode(config::BUTTON, PinMode::INPUT);

    // Connect to Wi-Fi
    until(wifi_connected, || wifi_connect(config::SSID, config::PASSWORD));
    let message: String = "Connected to wifi network with ip: ".to_owned() + &wifi_localip();
    print(&message);

    // Connect to MQTT broker
    mqtt_init(config::BROKER_URL, config::BROKER_PORT);
    until(mqtt_connected, || {
        mqtt_connect(config::CLIENT_ID);
        mqtt_loop();
    });

    // Subscribe to MQTT topic and turn on LED
    mqtt_subscribe("LED", callback);
    mqtt_publish("LED", "on");

    // Subscribe to button interrupt
    sub_interrupt(config::BUTTON, InterruptMode::CHANGE, toggle_led);

    loop {
        until(mqtt_connected, || {
            mqtt_connect(config::CLIENT_ID);
            mqtt_loop();
        });

        sleep(5); // Sleep for 5 seconds
    }
}
