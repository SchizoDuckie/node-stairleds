console.log('Starting Stairleds Server');

var config = require('nconf');
config.env('.');
config.file('./config/user.json');
config.defaults(require('./config/default.json'));

const PinMapper = require('./PinMapper');
const AnimationEngine = require('./AnimationEngine');

const PCA9685 = require("adafruit-pca9685");

const A = "A";
const B = "B";

var mapper = new PinMapper();
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
    .setPinMapping(config.get("pinmapper"));

mapper.setBrightness(16,100);

var anim = new AnimationEngine(mapper);
anim
    .setAnimation([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 90, 80, 70, 60, 50, 40, 30]);
// .start();
/*
var gpio = require('raspi-gpio');
var PIRSensor1 = new gpio.DigitalInput({
    pin: 'GPIO20',
    pullResistor: gpio.PULL_DOWN
});

var PIRSensor2 = new gpio.DigitalInput({
    pin: 'GPIO21',
    pullResistor: gpio.PULL_DOWN
});

PIRSensor1.on('change', function (value) {
    console.log(new Date().toString() + "New GPIO20 value!", value);
});

PIRSensor2.on('change', function (value) {
    console.log(new Date().toString() + "New GPIO21 value!", value);
});*/


/**
 *  websocket server
 */
var wss = new(require('./WebsocketServer'))();
wss
    .addHandler('getstats', function () {
        return JSON.stringify({
            'memory_usage': process.memoryUsage().heapUsed / 1024 / 1024,
            'datetime': new Date().toString()
        });
    })
    .addHandler('ledtest', function (address, ports, value) {
        console.log("In ledtest handler", arguments);
        ports = ports.split(',');
        var driver = mapper.getDriverByAddress(address);
        ports.map(function (port) {
            driver.setPwm(port, 0, value);
        });
    })
    .addHandler('ping', function () {
        return 'pong';
    })
    .addHandler('demo', function () {
        anim.start();
    })
    .addHandler('stopdemo', function () {
        anim.stop();
    })
    .addHandler('cleardemo', function() {
        anim.clear();
    })
    .addHandler('sensor1', function () {
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
    .start();

const app = require('./WebServer');

app.get('/', function (req, res) {
    res.render('dashboard');
});
app.get('/dashboard', function (req, res) {
    res.render('dashboard');
});
app.get('/about', function (req, res) {
    res.render('about');
});
app.get('/mqtt', function (req, res) {
    res.render('mqtt');
});
app.get('/ntp', function (req, res) {
    res.render('ntp');
});
app.get('/effects', function (req, res) {
    res.render('effects', { anim: anim });
});

function postParam(posted, paramname, defaultValue) {
    if(Object.keys(posted).indexOf(paramname) == -1 || posted[paramname] == '') {
        return defaultValue;
    }
    return posted[paramname];
}

app.post("/effects", function(req, res) {
    res.redirect('/effects');
    console.log("Incoming POSTdata: ", req.body);
    var posted = req.body;
    anim.FADE_DURATION = parseInt(postParam(posted, 'fade-duration', 6));
    anim.FADE_BRIGHTNESS = parseInt(postParam(posted, 'fade-brightness', 200)); // fade all leds to this brightness to before starting the animation. 0 to disable.
    anim.MAX_BRIGHTNESS = parseInt(postParam(posted, 'max-brightness', 4095)); // max global LED brightness
    anim.setDuration(parseInt(postParam(posted, 'anim-duration', 600)));
    anim.ANIM_STRATEGY = parseInt(postParam(posted, 'anim-strategy', anim.ANIMATION_STRATEGIES.ONE_AT_A_TIME));
    anim.ANIM_OFF_STRATEGY = parseInt(postParam(posted, 'off-anim-type', anim.ANIMATION_OFF_STRATEGIES.SEQUENCE));
    anim.USE_FADE_START = parseInt(postParam(posted, 'use-fade-start', 0)) == 1;
    anim.USE_FADE_END = parseInt(postParam(posted, 'use-fade-end', 0 )) == 1;
    anim.setShifting(parseInt(postParam(posted, 'anim-shifting', 0)) == 1);
    anim.ANIM_SHIFT_STEPS = parseInt(postParam(posted, 'anim-shift-steps', anim.animation.length));
    anim.setAnimation(posted.animation.map(function(val) { return parseInt(val); }));
    anim.stop();
    anim.start();
});


app.get('/pca9685', function (req, res) {
    res.render('pca9685', {
         "pca9685_A": mapper.getPinMapingForDriver('A'),
         "pca9685_B": mapper.getPinMapingForDriver('B')
    });
});

app.post("/pca9685", function (req, res) {
    res.redirect('/pca9685');
    console.log("Incoming POSTdata: ", req.body);
    var posted = req.body;
    var mappings = {};
    var pin;
    var sortorder;
    Object.keys(posted.pca9685_A).map((value, index) => {
        pin = parseInt(value.split('_')[1]);
        sortorder = posted.pca9685_A[value];
        if(sortorder != '') {
            mappings[sortorder] = {
                driver: 'A',
                pin: pin
            }
        }
    });
    Object.keys(posted.pca9685_B).map((value, index) => {
        pin = parseInt(value.split('_')[1]);
        sortorder = posted.pca9685_B[value];
        if(sortorder != '') {
            mappings[sortorder] = {
                driver: 'B',
                pin: pin
            }
        }
    });
    console.log("New posted mappings: ", mappings);
    config.set('pinmapper', mappings);
    config.save();
});


app.get('/pir', function (req, res) {
    res.render('pir');
});
app.get('/wifi', function (req, res) {
    res.render('wifi');
});
app.get('/demo', function (req, res) {
    res.render('demo');
});
app.get('/manual', function (req, res) {
    res.render('manual');
});

app.listen(80);
