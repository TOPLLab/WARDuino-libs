// Blinking LED example
use warduino::{delay, digital_write, pin_mode, PinMode, PinVoltage};

mod config;

#[no_mangle]
pub fn main() {
    let led: u32 = config::LED;
    pin_mode(led, PinMode::OUTPUT);

    let pause: u32 = 1000;
    loop {
        digital_write(led, PinVoltage::HIGH);
        delay(pause);
        digital_write(led, PinVoltage::LOW);
        delay(pause);
    }
}
