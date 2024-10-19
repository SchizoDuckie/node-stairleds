import server from './WebServer.js';
import WebsocketServer from './WebsocketServer.js';
import PinMapper from './PinMapper.js';
import Sensor from './Sensor.js';
import PCA9685 from "adafruit-pca9685";
import nconf from "nconf";
import path from "path";
import LedstripAnimation from "./animationengine/LedstripAnimation.js";
import { FadeIn, FadeOut, FadeTo, Immediate, Shifting, Sequence } from './animations/index.js';
import mqtt from "mqtt";
import StairLog from "./db/entities/Stairlog.js";
import CRUD from "./db/CRUD.js";
import mdnsDiscoveryService from './services/MdnsDiscoveryService.js'; // Import the mDNS service

console.log('Starting Extremely Overengineered Stairleds Server');

class StairledApp
{

    constructor() {
        this.config = this.initConfig();
        this.db = this.initDB();
        this.pinMapper = this.initPinMapper();
        this.webserver = this.initWebServer();
        this.webSocketServer = this.initWebSocketServer();
        this.mqttClient = this.initMqttClient();
        this.animations = this.initAnimations(this.pinMapper);
        this.sensors = this.initSensors();
        this.initMdnsDiscovery(); // Initialize mDNS discovery
    }

    async initDB() {
        await CRUD.init({
            adapter: 'NodeSQLiteAdapter',
            databaseName: 'stairleds.sqlite3'
        });
    }

    initMdnsDiscovery() {
        mdnsDiscoveryService.start(); // Start the mDNS discovery service

        // Update sensorDevices when a new device is discovered
        mdnsDiscoveryService.on('deviceDiscovered', (device) => {
            console.log('Discovered new sensor device:', device);
        });
    }

    start() {
        this.webserver.listen(80);
        console.log("Webserver started at port 80")

        this.webSocketServer.start();
        console.log("WebSocketserver started");
    }

    initMqttClient() {
        this.mqttHost = 'mqtt://' + this.config.get('mqtt:hostname');
        this.mqttChannel = this.config.get('mqtt:channel');

        console.log("MQTT Client: Connecting to : "+this.mqttHost);
        let mqttClient  = mqtt.connect(this.mqttHost);

        mqttClient.on('connect', () => {
            console.log("MQTT Client connected!");
            mqttClient.subscribe(this.mqttChannel,  (err) => {
                if (!err) {
                    console.log("MQTT Client subscribed to channel", this.mqttChannel);
                } else {
                    console.error("Error Connecting to MQTT Client!: ", err);
                }
            });
        });
        return mqttClient;
    }


    initAnimations(pinMapper) {
        return {
            "LightEmUp!": (new LedstripAnimation(pinMapper))
                .add(0, new Sequence({
                    brightness: 400,
                    duration: 2000,
                    leds: [17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1],
                    mapper: pinMapper
                }))
                .add(1000,  new Sequence({
                    brightness: 4000,
                    duration: 4000,
                    leds: [17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1],
                    mapper: pinMapper
                }))
                .add(20000, new Sequence({
                    brightness: 0,
                    duration: 15000,
                    leds: [17,16,15,14,13,12,11,10,9,8,7,6,5,4,3,2,1],
                    mapper: pinMapper
                })),
            "LightEmDown!": (new LedstripAnimation(pinMapper))
                .add(0, new Sequence({
                    brightness: 400,
                    duration: 1500,
                    leds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,17],
                    mapper: pinMapper
                }))
                .add(1000, new Sequence({
                    brightness: 4000,
                    duration: 4000,
                    leds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,17],
                    mapper: pinMapper
                }))
                .add(20000, new Sequence({
                    brightness: 0,
                    duration: 15000,
                    leds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,17],
                    mapper: pinMapper
                })),


        }
    }

    initSensors() {
        let configured = this.config.get('sensors');
        let sensors = [];
        console.log("Initting sensors: ", sensors);
        configured.map((sensorConfig) => {
            sensors.push(new Sensor(sensorConfig, this.mqttClient, this.animations));
        });
        return sensors;
    }

    /**
     * @return {Express}
     */
    initWebServer() {
        server.registerRoutes(this);
        /**
         * registerRoutes is a custom function that loads functionality from /routes
         */
        server.get('/',  function (req, res) {
            return res.redirect("/dashboard");
        });
        server.get('/dashboard', async function (req, res) {
            try {
                let downstairs = await CRUD.Find(StairLog, {"sensorname": "Sensor Downstairs"});
                let upstairs = await CRUD.Find(StairLog, {"sensorname": "Sensor Upstairs"});
                console.log("Down triggers: ", downstairs.length);
                res.render('dashboard', {
                    "downtriggers": downstairs.length,
                    "uptriggers": upstairs.length
                });
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                res.status(500).send("Error loading dashboard data");
            }
        });

        server.get('/about', function (req, res) {
            res.render('about');
        });
        server.get('/ntp', function (req, res) {
            res.render('ntp');
        });

        server.get('/wifi', function (req, res) {
            res.render('wifi');
        });
        server.get('/demo', function (req, res) {
            res.render('demo');
        });
        server.get('/manual', function (req, res) {
            res.render('manual');
        });
        return server;
    }

    /**
     * @returns {WebsocketServer}
     */
    initWebSocketServer() {
        let wss = new WebsocketServer();
        wss
            .addHandler('getstats', function () {
                return JSON.stringify({
                    'memory_usage': process.memoryUsage().heapUsed / 1024 / 1024,
                    'datetime': new Date().toString()
                });
            })

            .addHandler('ping', function () {
                return 'pong';
            })


        return wss;
    }

    /**
     * Load default config variables and override with user config from user.json
     * @See nconf
     * @returns nconf
     */
    initConfig() {
         // Configure the provider with multiple hierarchical stores
                    // representing `user` and `global` configuration values.
        const __dirname = path.dirname(process.argv[1]);
        let config = new nconf.Provider({
            stores: [
                { name: 'global', type: 'file', file: path.join(__dirname, '/config/default.json') },
                { name: 'user', type: 'file', file: path.join(__dirname, '/config/user.json') }
            ]
        });
        console.log("Config loaded, defaults from ./config/defaults.json are overridden by ./config/user.json");
        return config;
    }

    /**
     * Initialize and configure pinmapping according to config
     * @returns {PinMapper}
     */
    initPinMapper() {
        console.log("Initializing PCA9685 Pin Mapper");

        const A = "A";
        const B = "B";
        let config = this.config;
        let mapper = new PinMapper();
        mapper
            .addDriver(A, new PCA9685({
                "freq": config.get('pca9685:A:freq'), // frequency of the device
                "correctionFactor": config.get('pca9685:A:correctionFactor'), // correction factor - fine tune the frequency
                "address": parseInt(config.get('pca9685:A:address')), // i2c bus address
                "device": config.get('pca9685:A:device'), // device name
            }))
            .addDriver(B, new PCA9685({
                "freq": config.get('pca9685:B:freq'), // frequency of the device
                "correctionFactor": config.get('pca9685:B:correctionFactor'), // correction factor - fine tune the frequency
                "address": parseInt(config.get('pca9685:B:address')), // i2c bus address
                "device": config.get('pca9685:B:device'), // device name
            }))
            .setPinMapping(config.get("pinmapper"))
            .test();
        return mapper;
    }

}



const app = new StairledApp();
app.start();
