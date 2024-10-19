import TimeLine from '../animationengine/TimeLine.js';
import TimelineAnimation from './TimelineAnimation.js';
import FadeTo from './FadeTo.js';

/**
 * Sequence Animation.
 * Fades led numbers passed in `options.leds[]` from their current brightness to `options.brightness` one by one
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
        if(!("brightness" in options)) {
            throw new Error("Required option 'brightness' is missing for Sequence " + JSON.stringify(options));
        }
        super(options);

        this.timeline = new TimeLine();
        /**
         * How long each step of the timeline should last based on the amount of leds passed
         * @type {number}
         */
        let stepDuration = Math.floor(this.options.duration / this.options.leds.length);

        /**
         * Create a clone of the fade for every led in the passed options and add that to the timeline after
         * the previous one.
         */
        for(var index=0; index< this.options.leds.length; index++) {
            let clonedFade = new FadeTo({
                brightness: this.options.brightness,
                duration: stepDuration,
                mapper: this.options.mapper,
                leds: [this.options.leds[index]]
            });
            this.timeline.add(index * stepDuration, clonedFade);
        }
    }

    onStart() {
        this.timeline.setStartTime(this.absoluteStart);
    }

    render() {
        let output = {};
        this.timeline.setCurrentPosition(this.absoluteCurrent);
        let items = this.timeline.getActiveItems();
        for(let item of items) {
            let pins = item.render();
            for(let pin in pins) {
                output[pin] = parseInt(pins[pin]);
            }
        }

        return output;
    }

    toString() {
        console.log(this.constructor.name, this.options, this.timeline);
    }
 }

export default Sequence;
