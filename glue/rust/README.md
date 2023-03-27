<div align="center">

<h1>warduino</h1>

<p><strong>Crate for accessing WARDuino primitives in Rust.</strong></p>

</div>

## Features

+ Access WARDuino primitives from Rust
+ Use Rust types and structs for arguments

## Installation

Add the following to your Cargo.toml:

```toml
[dependencies]
warduino = "0.1.0"
```

## Usage

```rust
use warduino::{PinMode, PinVoltage, pin_mode, digital_write, delay};

pub fn main() {
    let led = 2;
    pin_mode(led, PinMode::OUTPUT);

    let pause = 1000;
    loop {
        digital_write(led, PinVoltage::HIGH);
        delay(pause);
        digital_write(led, PinVoltage::LOW);
        delay(pause);
    }
}
```

