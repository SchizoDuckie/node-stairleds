import { eventBus, Events } from '../services/EventBus.js';
import { animationService } from '../services/AnimationService.js';
import Sensor from '../Sensor.js';

class Sensors {
    constructor() {
        this.sensorDevices = [];
    }

    register(app) {
       
        // Web routes
        app.webServer.get('/sensors', async (req, res) => {
            try {
                const animations = await animationService.getAnimationsList();
                const discoveredDevices = app.mdns.getDiscoveredDevices();
                const configuredSensors = app.config.get('sensors') || [];
                
                // Fix: Create a map of ALL configured sensors first
                const sensorMap = new Map();
                configuredSensors.forEach(config => {
                    sensorMap.set(config.name, {
                        ...config,
                        connected: false // Default to offline until proven otherwise
                    });
                });

                // Merge with discovered devices
                discoveredDevices.forEach(device => {
                    sensorMap.set(device.name, {
                        ...(sensorMap.get(device.name) || {}), // Keep existing config if present
                        ...device,
                        connected: true
                    });
                });

                // Convert map back to array for rendering
                const mergedSensors = Array.from(sensorMap.values());

                res.render('sensors', {
                    title: 'Sensors',
                    sensors: mergedSensors,
                    effects: animations
                });
            } catch (error) {
                console.error('Sensor route error:', error);
                res.status(500).send('Error loading sensor page');
            }
        });

        app.webServer.post("/sensors", (req, res) => {
            try {
                // Handle single sensor config
                const config = {
                    name: req.body.name,
                    channel: Number(req.body.channel) || 0,
                    triggerThreshold: Number(req.body.triggerThreshold) || 0,
                    triggerType: req.body.triggerType,
                    triggerEffect: req.body.triggerEffect
                };

                // Merge with existing sensors
                const existingSensors = app.config.get('sensors') || [];
                
                // Find existing sensor index
                const existingIndex = existingSensors.findIndex(s => s.name === config.name);
                
                if (existingIndex > -1) {
                    // Merge existing config with new values
                    existingSensors[existingIndex] = {
                        ...existingSensors[existingIndex],
                        ...config
                    };
                } else {
                    // Add new sensor config
                    existingSensors.push(config);
                }

                // Update application state
                app.sensors = existingSensors.map(s => new Sensor(s));
                
                // Save merged configurations
                app.config.set('sensors', existingSensors);
                app.config.save();
                
                res.sendStatus(200);
            } catch (error) {
                console.error('Sensor save error:', error);
                res.status(500).send('Error saving sensor configuration');
            }
        });

        // API routes
        app.webServer.get('/api/sensor-devices', (req, res) => {
            res.json(app.mdns.getDiscoveredDevices());
        });

        app.webSocketServer.addHandler('mqttlog', () => {
            const messages = app.mqtt.getLatestMessages() || [];
            const uniqueSensors = [...new Set(messages.map(msg => msg.sensor))];
            return JSON.stringify(messages);
        });

    }
}

export default new Sensors();
