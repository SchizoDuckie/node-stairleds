/**
 * MQTT Handling and routes.
 * Cre
 */
class MQTT {

    constructor() {
        this.enabled = null;
    }



    /**
     * Hook everything up
     * @param app {StairledApp}
     */
    register (app) {
        app.webServer.get('/mqtt', function (req, res) {
            res.render('mqtt', {
                'config' : app.config.get('mqtt')
            });
        });

        app.webSocketServer.addHandler('mqttlog', () => {
            const messageQueue = app.mqttClient.getMessageQueue();
            const output = JSON.stringify(messageQueue);
            app.mqttClient.messageQueue = []; // Clear the queue after sending
            return output;
        });

        console.log([
            "📨 MQTT Webserver route added", 
            "📨 MQTT Websocket listener attached."
        ].join("\n"));
    }
}

export default new MQTT();
