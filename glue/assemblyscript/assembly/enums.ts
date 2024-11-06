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

const LOW = 0;
const HIGH = 1;
