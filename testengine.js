/**
 * 
 *

var mapper = (new PinMapper())
    .addDriver(A, PCA9685({
        "freq": config.get('pca9685:A:freq'), // frequency of the device
        "correctionFactor": config.get('pca9685:A:correctionFactor'), // correction factor - fine tune the frequency 
        "address": parseInt(config.get('pca9685:A:address')), // i2c bus address
        "device": config.get('pca9685:A:device'), // device name
    }))
    .addDriver(B, PCA9685({
        "freq": config.get('pca9685:B:freq'), 
        "correctionFactor": config.get('pca9685:B:correctionFactor'),
        "address": parseInt(config.get('pca9685:B:address')), 
        "device": config.get('pca9685:B:device'), 
    }))
    .setPinMapping(config.get("pinmapper"));





var anim = (new LedstripAnimation(mapper))
    // add a fadein animation that starts at 0ms, lasts 150ms and fades pins 1-6 from 0 to 200
    .add(0,     new FadeIn({ start: 0, end: 200, duration: 150, leds: [1,2,3,4,5,6] }))
    .add(200,   new FadeIn({ start: 0, end: 200, duration: 150, leds: [7,8,9,10,11,12]}))
    // add a fadein animation that starts at 300ms, lasts 50ms and fades pins 13-18 fade from 0 to 150
    .add(300,   new FadeIn({ start: 0, end: 150, duration: 50, leds: [13,14,15,16,17,18]}))
    // animate leds in sequence from 200 to 800 over 1000ms
    .add(400,   new Sequence({ start: 200, end: 800, duration: 1000, leds: [ 4,6,7,10, 12, 15] }))
    // shift current led brightness to the pin on the right 8 times over 1000ms 
    .add(1400,  new Shifting({ direction: 'right', duration: 1000, shifts: 8, leds: [ 4,6,7,10, 12, 15] }))
    
    // animate leds to almost off in sequence from 800 to 20 over 200ms
    .add(2400,  new Sequence({ start: 800, end: 20, duration: 200, leds: [ 4,6,7,10, 12, 15] }))
    // immediately set brightness to zero on these five
    .add(2600,  new Immediate({ brightness: 0, leds: [ 1,2,3,4,5] }))
    // fade all leds out from their current brightness to zero in 250ms.
    .add(2600,  new FadeOut({ end: 0, duration: 250, leds: [6,7,8,9,10,11,12,13,14,15,16,17,18] }))
    
    .start();

    */
