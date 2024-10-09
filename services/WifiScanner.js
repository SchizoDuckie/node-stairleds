import { exec } from 'child_process';

export async function scanNearbyAccessPoints() {
    const scanCommand = "sudo iwlist wlan0 scan | grep 'ESSID\\|Quality\\|Encryption'";
    return new Promise((resolve, reject) => {
        exec(scanCommand, (error, stdout) => {
            if (error) {
                reject(error);
                return;
            }

            const accessPoints = [];

            let currentAccessPoint = {};
            

            stdout.split('\n').forEach(line => {
                if (line.startsWith('ESSID')) {
                    if (currentAccessPoint) {
                        accessPoints.push(currentAccessPoint);
                    }
                    currentAccessPoint = {
                        ssid: line.split(':')[1].trim().slice(1, -1),
                        signal_level: '',
                        security: ''
                    };
                } else if (line.includes('Quality')) {
                    currentAccessPoint.signal_level = line.split('Signal level=')[1].split('/')[0];
                } else if (line.includes('Encryption key:')) {
                    currentAccessPoint.security = line.split(':')[1].trim();
                }
            });

            if (currentAccessPoint) {
                accessPoints.push(currentAccessPoint);
            }

            resolve(accessPoints);
        });
    });
}
