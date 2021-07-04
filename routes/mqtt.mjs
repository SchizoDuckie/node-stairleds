/**
 * MQTT Handling and routes.
 * Cre
 */
class MQTT {

    constructor() {
        this.mqttClient = null;
        this.mqttHost = null;
        this.mqttChannel = null;
        this.enabled = null;
        this.messageQueue = [];
    }

    init(config) {
        this.mqttHost = config.get('mqtt.hostname');
        this.mqttChannel = config.get('mqtt.channel');
        this.enabled = config.get("mqtt.enabled");
        if (this.enabled) {
            this.initMQTT();
        }
    }

    initMQTT() {

        this.mqttClient  = require("mqtt").connect(this.mqttHost);

        this.mqttClient.on('connect', () => {
            console.log("MQTT Client connected!");
            this.mqttClient.subscribe(this.mqttChannel, function (err) {
                if (!err) {
                    console.log("MQTT Client subscribed to channel", this.mqttChannel);
                } else {
                    console.error("Error Connecting to MQTT Client!: ", err);
                }
            });
        });

        /**
         * When a new MQTT message comes in from a stair led, push it into the message queue.
         */
        this.mqttClient.on('message',  (topic, message) => {
            let messageParts = message.toString().split("|");
            this.messageQueue.push({
                timestamp: Date.now(),
                full: message.toString(),
                value: messageParts[1],
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
        this.init(app.config);

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

module.exports = new MQTT();