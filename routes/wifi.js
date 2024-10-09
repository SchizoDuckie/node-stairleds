import server from "../WebServer.js";
import nconf from 'nconf';
import { scanNearbyAccessPoints } from '../services/WifiScanner.js';

class Wifi {

    register(app) {

        function handleAccessPointSettings(req, res) {
            const apName = req.body.apname;
            const password = req.body.password;

            // validate inputs
            if (!apName || !password) {
                return res.status(400).json({ success: false, message: 'Access Point name and password are required' });
            }

            // save changes
            nconf.set('wifi:accessPoint:name', apName);
            nconf.set('wifi:accessPoint:password', password);
            nconf.save();

            res.json({ success: true, message: 'Access Point settings saved' });
        }

        function handleAdditionalSettings(req, res) {
            const hostname = req.body.hostname;

            // validate input
            if (!hostname) {
                return res.status(400).json({ success: false, message: 'Hostname is required' });
            }

            // save changes
            nconf.set('wifi:additionalSettings:hostname', hostname);
            nconf.save();

            res.json({ success: true, message: 'Additional settings saved' });
        }

        app.webserver.get('/wifi', async function (req, res) {
            try {
                const apName = nconf.get('wifi:accessPoint:name') || '';
                const password = nconf.get('wifi:accessPoint:password') || '';
                const hostname = nconf.get('wifi:additionalSettings:hostname') || '';

                // scan for nearby access points
                const accessPoints = await scanNearbyAccessPoints();

                res.render('wifi', {
                    apName,
                    password,
                    hostname,
                    accessPoints,
                    connectedAp: apName ? `${apName} (${password ? '****' : 'no password'})` : 'Not connected to WiFi'
                });
            } catch (err) {
                console.error('Error rendering WiFi settings page:', err);
                res.status(500).send('Internal Server Error');
            }
        });

        app.webserver.get('/wifi/access-points', async function (req, res) {
                const accessPoints = await scanNearbyAccessPoints();

                res.json({ accessPoints });
        });



        app.webserver.post('/wifi/access-point', handleAccessPointSettings);
        app.webserver.post('/wifi/additional-settings', handleAdditionalSettings);

        console.log("Wifi webserver routes added");
    }
}

export default new Wifi();
