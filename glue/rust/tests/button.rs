// Button demo app
use warduino::{PinMode, PinVoltage, pin_mode, digital_write, delay, sub_interrupt, InterruptMode, mqtt_loop};

static BUTTON : u32 = 25;
static LED    : u32 = 26;

fn callback(_topic: &str, _payload: &str, _length: u32) {
    let val = digital_read(LED);
    if val == HIGH {
        digital_write(LED, PinVoltage.LOW);
    } else {
        digital_write(LED, PinVoltage.HIGH);
    }
}

#[no_mangle]
pub fn main() {
    pin_mode(BUTTON, PinMode.INPUT);
    pin_mode(LED, PinMode.OUTPUT);

    sub_interrupt(BUTTON, callback, InterruptMode.FALLING);

    loop {
        delay(1000);
        mqtt_loop();
    }
}

