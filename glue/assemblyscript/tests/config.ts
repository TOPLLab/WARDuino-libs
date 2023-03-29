class Config {
    button: u32;
    led: u32;
    ssid: string;
    password: string;
    brokerUrl: string
    brokerPort: u32;
    clientId: string;

    constructor(button: u32, led: u32, ssid: string, password: string, 
                brokerUrl: string, brokerPort: u32, clientId: string) {
        this.button = button;
        this.led = led;
        this.ssid = ssid;
        this.password = password;
        this.brokerUrl = brokerUrl;
        this.brokerPort = brokerPort;
        this.clientId = clientId;
    }
}

export let config: Config = new Config(25, 26, 'local-network', 'network-password', '192.168.0.24', 1883, 'random-mqtt-client-id');
