import { eventBus, Events } from '../services/EventBus.js';
import { animationService } from '../services/AnimationService.js';
class Sensors {
    constructor() {
        this.sensorDevices = [];
    }

    register(app) {
       
        // Web routes
        app.webServer.get('/sensors', async (req, res) => {
            const animations = await animationService.getAnimationsList();
            
            res.render('sensors', { 
                title: 'Sensors',
                sensorDevices: app.mdns.getDiscoveredDevices(),
                effects: animations
            });
        });

        app.webServer.post("/sensors", (req, res) => {
            
            const posted = req.body;
            eventBus.emit(Events.SENSOR_CONFIG, posted);
            // Convert flat post structure to sensor config array
            const sensorConfigs = Object.keys(posted).reduce((acc, key) => {
                if (key.startsWith('sensor_')) {
                    const [_, sensorName, field] = key.split('_');
                    acc[sensorName] = acc[sensorName] || {name: sensorName};
                    acc[sensorName][field] = posted[key];
                }
                return acc;
            }, {});

            // Emit config updates and save
            Object.values(sensorConfigs).forEach(config => {
                eventBus.emit(Events.SENSOR_CONFIG, {
                    name: config.name,
                    triggerTreshold: parseFloat(config.tvalue),
                    triggerType: config.tcondition,
                    triggerEffect: config.effect
                });
            });

            app.config.set('sensors', Object.values(sensorConfigs));
            app.config.save();
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
