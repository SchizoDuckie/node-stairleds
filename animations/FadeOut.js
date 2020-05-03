import { TimelineAnimation } from  './TimelineAnimation.js';

/**
 * A Fade Out Animation.
 * Fades led numbers passed in `options.leds[]` from `options.start` to `options.end`
 */
class FadeOut extends TimelineAnimation { 

    /**
     * Options: `Object{}` with these mandatory properties
     * - end: `int[0-4095]` end brightness
     * - leds: `array` led numbers to fade in
     * 
     * and optional parameters:
     * - start `int[0-4095]` start brightness
     * - mapper: `LedMapper` an instance of the PinMapper class to find current pin brightnesses from  
     * LedMapper is mandatory when omitting the start!
     * @param {Object} options 
     */
    constructor(options) {
        super(options);
        this.brightnesses = {};
    }

    onStart() {
        if(this.options.mapper) {
            for(var i= 0; i< this.options.leds.length; i++) {
                this.brightnesses[this.options.leds[i]] = this.options.mapper.getBrightness(this.options.leds[i]);
            }
        } 
    }

    render() {
        var output = {};
        for(var i=0; i< this.options.leds.length; i++) {
            var range;
            if(this.options.start) {
                range = this.options.start - this.options.end;
            } else {
                if(this.options.mapper) {
                    range = this.brightnesses[this.options.leds[i]] - this.options.end;
                } else {
                    throw new Error("Cannot determine range for fade out! No start and no mapper provided");
                }
            }
            output[this.options.leds[i]] = (range / 100) * (100 - this.progress);
        }
       // console.log(this.constructor.name, this.options.leds, this.progress, output);
        return output;
    } 
 }

 export { FadeOut };