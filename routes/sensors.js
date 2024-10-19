import express from 'express';
import mdnsDiscoveryService from '../services/MdnsDiscoveryService.js';

/**
 * PCA9685 Handling and routes.
 * Creates a demo animation and hooks up websocket triggers to start and stop.
 */
class Sensors {
    constructor() {
        this.sensorDevices = [];
    }

    /**
     * Hook everything up
     * @param app {StairledApp}
     */
    register(app) {

        function postParam(posted, paramname, defaultValue) {
            if (Object.keys(posted).indexOf(paramname) === -1 || posted[paramname] === '') {
                return defaultValue;
            }
            return posted[paramname];
        }

        app.webserver.get('/sensors', function (req, res) {
            // Keep the original rendering of the HTML page
            res.render('sensors', { title: 'Sensors' });
        });

        app.webserver.post("/sensors", function (req, res) {
            res.redirect('/sensors');
            console.log("Incoming POSTdata: ", req.body);
            var posted = req.body;

            console.log("New sensor config: ", posted);

            app.config.save();
        });


        /**
         * stream statistics
         */
        app.webSocketServer.addHandler('sensor1', function () {
            return JSON.stringify({
                type: 'sensor1',
                value: 0, // PIRSensor1.value,
                time: Date.now()
            });
        })
            .addHandler('sensor2', function () {
                return JSON.stringify({
                    type: 'sensor2',
                    value: 0, //PIRSensor2.value,
                    time: Date.now()
                });
            })



        // Update sensorDevices when a new device is discovered
        mdnsDiscoveryService.on('deviceDiscovered', (device) => {
            // Instead of reassigning, push the new device directly
            if (!this.sensorDevices.some(d => d.name === device.name)) {
                this.sensorDevices.push(device); // Add the new device
                console.log('Discovered new sensor device:', device);
            }
            console.log('Updated sensor devices:', this.sensorDevices); // Log updated devices
        });

        /**
         * Handles GET requests to /api/sensor-devices by sending back the list of discovered sensor devices.
         * 
         * @param {NextFunction} req - The Express request object.
         * @param {Response} res - The Express response object.
         */
        app.webserver.get('/api/sensor-devices', (req, res) => {
        
            res.json(mdnsDiscoveryService.getDiscoveredDevices()); // Use the new method
        });

        console.log("Sensors webserver routes added and mDNS discovery service started");
    }
}

export default new Sensors();
