
class API {

    constructor()  {

    }

    register(app) {
         app.webServer.get('/mdns-discovery', (req, res) => {
            const discoveredDevices = app.mdns.getDiscoveredDevices();
            res.json(discoveredDevices);
        });
    }
}

export default new API();
