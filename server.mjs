

import server from './WebServer';
import WebsocketServer from './WebsocketServer';
import PinMapper from './PinMapper';
import PCA9685 from "adafruit-pca9685";
import config from "nconf";

console.log('Starting Extremely Overengineered Stairleds Server');

class StairledApp
{

    constructor() {
        this.config = this.initConfig();
        this.pinMapper = this.initPinMapper();
        this.webserver = this.initWebServer();
        this.webSocketServer = this.initWebSocketServer();
    }

    start() {
        this.webserver.listen(80);
        console.log("Webserver started at port 80")

        this.webSocketServer.start();
        console.log("WebSocketserver started");
    }

    /**
     * @return {Express}
     */
    initWebServer() {

        /**
         * registerRoutes is a custom function that loads functionality from /routes
         */
        server.registerRoutes(this);

        server.get('/', function (req, res) {
            res.render('dashboard');
        });
        server.get('/dashboard', function (req, res) {
            res.render('dashboard');
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
        config.env('.');
        config.file('./config/user.json');
        config.defaults(require('./config/default.json'));
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
            .addDriver(A, PCA9685({
                "freq": config.get('pca9685:A:freq'), // frequency of the device
                "correctionFactor": config.get('pca9685:A:correctionFactor'), // correction factor - fine tune the frequency
                "address": parseInt(config.get('pca9685:A:address')), // i2c bus address
                "device": config.get('pca9685:A:device'), // device name
            }))
            .addDriver(B, PCA9685({
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


