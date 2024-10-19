import { spawn } from 'child_process';
import EventEmitter from 'events';

class MdnsDiscoveryService extends EventEmitter {
    constructor() {
        super();
        this.devices = []; // Store discovered devices
        this.process = null;
    }

    start() {
        this.process = spawn('avahi-browse', ['-p', '-t', '-r', '_mqtt._tcp']);

        this.process.stdout.on('data', (data) => {
            const lines = data.toString().trim().split('\n');
            lines.forEach(this.parseLine.bind(this));
        });

        this.process.stderr.on('data', (data) => {
            console.error(`avahi-browse stderr: ${data}`);
        });

        console.log('mDNS discovery service started using avahi-browse');
    }

    parseLine(line) {
        const parts = line.split('\t');
        if (parts.length === 9 && parts[0] === '=') {
            const device = {
                name: parts[3],
                address: parts[7],
                port: parseInt(parts[8], 10)
            };

            if (!this.devices.some(d => d.name === device.name)) {
                this.devices.push(device);
                this.emit('deviceDiscovered', device);
                console.log('Discovered new sensor device:', device);
            }
        }
    }

    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
        console.log('mDNS discovery service stopped');
    }

    getDiscoveredDevices() {
        return this.devices; // Return the current list of devices
    }
}

export default new MdnsDiscoveryService();
