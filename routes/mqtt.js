/**
 * MQTT Handling and routes.
 * Cre
 */
class MQTT {

    constructor() {
        this.enabled = null;
        this.messageQueue = [];
    }

    init(mqttClient) {
        /**
         * When a new MQTT message comes in from a stair led, push it into the message queue, but keep only the last 5.
         */
        mqttClient.on('message',  (topic, message) => {
            let messageParts = message.toString().split("|");
            this.messageQueue.push({
                timestamp: Date.now(),
                sensor: messageParts[0],
                value: parseInt(messageParts[1]),
                state: parseInt(messageParts[2])
            });
            if(this.messageQueue.length > 5) {
                this.messageQueue = this.messageQueue.slice(1);
            }
        })
    }



    /**
     * Hook everything up
     * @param app {StairledApp}
     */
    register (app) {
        this.init(app.mqttClient);

        app.webserver.get('/mqtt', function (req, res) {
            res.render('mqtt', {
                'config' : app.config.get('mqtt')
            });
        });

        app.webSocketServer.addHandler('mqttlog', () => {
            var output = JSON.stringify(this.messageQueue);
            this.messageQueue = [];
            return output;
        });

        console.log("MQTT Client initialized.\nMQTT Webserver route added\nMQTT Websocket listener attached.");
    }
}

export default new MQTT();