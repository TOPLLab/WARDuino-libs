// config::BUTTON demo app
use warduino::{delay, digital_read, digital_write, InterruptMode, mqtt_loop, pin_mode, PinMode, PinVoltage, sub_interrupt};

mod config;

fn callback(_topic: &str, _payload: &str, _length: u32) {
    let voltage = digital_read(config::LED);
    match voltage {
        PinVoltage::HIGH => digital_write(config::LED, PinVoltage::LOW),
        PinVoltage::LOW => digital_write(config::LED, PinVoltage::HIGH)
    }
}

#[no_mangle]
pub fn main() {
    pin_mode(config::BUTTON, PinMode::INPUT);
    pin_mode(config::LED, PinMode::OUTPUT);

    sub_interrupt(config::BUTTON, InterruptMode::FALLING, callback);

    loop {
        delay(1000);
        mqtt_loop();
    }
}

