// Hello world!
use warduino::{delay, print};

#[no_mangle]
pub fn main() {
    loop {
        print("Hello world!");
        delay(1000);
    }
}
