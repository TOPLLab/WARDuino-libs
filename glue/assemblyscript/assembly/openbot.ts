/**
 * Open Bot Brain for as-warduino
 *
 * <br>
 *
 * The hardware pin codes for the Open Bot Brain board,
 * and some enums for Lego Mind Storm peripherals.
 *
 */

export namespace Openbotbrain {
    enum Pins {
        powerSupply = 60,
        motorABDriverSleep = 46,
        led1 = 45,
        led2 = 56,
        led3 = 39,
        sw5 = 20,
        sw1 = 21
    }

    enum InputPort {
        portA = 0,
        portB,
        portC,
        portD
    }

    enum OutputPort {
        port1 = 0,
        port2,
        port3,
        port4
    }
}

export namespace Legomindstorms {
    enum Colour {
        none = 0,
        white = 6,
        yellow = 4,
    }

    enum ColourSensorMode {
        reflect = 0,
        ambient,
        colour
    }

}