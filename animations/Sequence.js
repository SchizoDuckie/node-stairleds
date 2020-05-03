import { TimeLine } from  '../animationengine/Timeline.js';
import { TimelineAnimation } from  './TimelineAnimation.js';
import { FadeTo } from './FadeTo.js';

/**
 * Sequence Animation.
 * Fades led numbers passed in `options.leds[]` from their current brightness to `options.duration` one by one.
 * 
 */
class Sequence extends TimelineAnimation { 

    /**
     * Options: `Object{}` with these mandatory properties
     * - brightness `int[0-4095]` end brightness
     * - duration: `int` duration in ms it takes to animate all the leds in sequence
     * - mapper: `LedMapper` an instance of the PinMapper class to find current pin brightnesses from  
     * - leds: `array` led numbers to fade in
     * @param {Object} options 
     */
    constructor(options) {
        super(options);
        this.timeline = new TimeLine();
    }

    onStart() {
       
        for(var i = 0; i<this.options.leds.length; i++) {
            this.timeline.add(Math.round(i * (this.options.duration / this.options.leds.length)), new FadeTo({
                brightness: this.options.brightness,
                duration: this.options.duration / this.options.leds.length,
                mapper: this.options.mapper,
                leds: [this.options.leds[i]]
            }));
        }
        this.timeline.setStartTime(this.absoluteStart);
    }


    render() {
        var output = {};
        this.timeline.setCurrentPosition(this.absoluteCurrent);
        var items = this.timeline.getActiveItems();
        for(var item in items) {
            var pins = items[item].render();
            for(var pin in pins) {
                output[pin] = parseInt(pins[pin]);
            }
        }
        return output;
    } 
 }

export { Sequence };