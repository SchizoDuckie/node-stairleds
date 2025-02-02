import { spawn } from 'child_process';
import { eventBus, Events } from './EventBus.js';

class MdnsDiscoveryService {
    constructor() {
        this.devices = [];
        this.process = null;
        this.outputBuffer = '';
        this.intervalId = null;
        this.isStarted = false;
    }

    start() {
        if (this.isStarted) {
            eventBus.emit(Events.SYSTEM_INFO, 'mDNS discovery service is already running');
            return;
        }
        
        this.discoverDevices();
        this.intervalId = setInterval(() => this.discoverDevices(), 30000);
        this.isStarted = true;
        
        console.log('🔎 mDNS discovery service started');
        eventBus.emit(Events.SERVICE_STATUS, 'mdns', 'running');
    }

    discoverDevices() {
        const timeout = setTimeout(() => {
            if (this.process) {
                this.process.kill();
                eventBus.emit(Events.SYSTEM_DEBUG, 'mDNS discovery timed out, will retry next cycle');
            }
        }, 15000);

        this.process = spawn('avahi-browse', ['-a', '-r', '-t', '-p'], {
            stdio: ['ignore', 'pipe', 'ignore']
        });
        
        let buffer = '';
        this.process.stdout.on('data', (data) => {
            buffer += data.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            lines.forEach(line => {
                if (line.trim()) {
                    this.parseLine(line.trim());
                }
            });
        });

        this.process.on('close', () => {
            clearTimeout(timeout);
            eventBus.emit(Events.SYSTEM_DEBUG, 'mDNS discovery completed');
        });
    }

    parseLine(line) {
        if (!line.startsWith('=')) return;
        
        const fields = line.split(';');
        if (fields.length < 9) return;
        
        if (fields[4] !== '_mqtt._tcp') return;

        const device = {
            interface: fields[1],
            protocol: fields[2],
            name: fields[3],
            type: fields[4],
            domain: fields[5],
            host: fields[6],
            address: fields[7],
            port: parseInt(fields[8], 10)
        };

        const existingDeviceIndex = this.devices.findIndex(d => d.host === device.host);
        if (existingDeviceIndex === -1) {
            this.devices.push(device);
            eventBus.emit(Events.SENSOR_DISCOVERED, device);
        } else {
            this.devices[existingDeviceIndex] = device;
            eventBus.emit(Events.SENSOR_UPDATED, device);
        }
    }

    stop() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isStarted = false;
        eventBus.emit(Events.SERVICE_STATUS, 'mdns', 'stopped');
        eventBus.emit(Events.SYSTEM_INFO, 'mDNS discovery service stopped');
    }

    getDiscoveredDevices() {
        return this.devices;
    }
}

export default MdnsDiscoveryService;
