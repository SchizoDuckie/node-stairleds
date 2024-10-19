import TimeLine from '../animationengine/TimeLine.js';
import TimelineAnimation from './TimelineAnimation.js';
import FadeTo from './FadeTo.js';

/**
 * Shifting Animation.
 * Fades led numbers passed in `options.leds[]` from their current brightness to zero
 * and applies the current brightness to the next item over.
 */
class Shifting extends TimelineAnimation { 
    
    /**
     * Options: `Object{}` with these mandatory properties
     * - steps `int` steps to shift brightnesses for
     * - duration: `int` duration in ms it takes to animate all the leds in sequence
     * - mapper: `LedMapper` an instance of the PinMapper class to find current pin brightnesses from  
     * - leds: `array` led numbers to fade in
     * @param {Object} options 
     */
    constructor(options) {
        super(options);
        this.brightnesses = [];
        this.options.direction = this.options.direction || 'up';
        this.options.bouncing = this.options.bouncing || false;
        this.options.bounceAfter = this.options.bounceAfter || this.options.leds.length;
        if (!this.options.mapper) {
            throw new Error("mandatory option mapper is missing!");
        }
        if (!('shifts' in this.options)) {
            throw new Error("mandatory options shifts is missing!");
        }
        this.timeline = null;
    }

    onStart() {
        this.timeline = new TimeLine();
        for (var i = 0; i < this.options.leds.length; i++) {
            this.brightnesses.push({ 
                led: this.options.leds[i], 
                brightness: this.options.mapper.getBrightness(this.options.leds[i])
            });
        }
        // Create a copy of the start state LEDs and prepare to shift brightnesses
        // Loop through the number of shifts specified in options
        // For each LED, add a FadeTo animation to the timeline
        // Shift the LED states for the next iteration
        // If bouncing is enabled, toggle the direction after a specified number of shifts
        var originalStates = this.brightnesses;
        
        for (i = 0; i < this.options.shifts; i++) {
            var shiftedStates = this.shift(originalStates, this.options.direction);
            for (var j = 0; j < this.options.leds.length; j++) {
                this.timeline.add(Math.round(i * (this.options.duration / this.options.shifts)), new FadeTo({
                    brightness: shiftedStates[j].brightness,
                    duration: this.options.duration / this.options.shifts,
                    mapper: this.options.mapper,
                    leds: [this.options.leds[j]]
                }));
            }
            originalStates = this.shift(originalStates, this.options.direction);
            if (this.options.bouncing && i % this.options.bounceAfter == 0) {
                this.options.direction = this.options.direction == 'up' ? 'down' : 'up';
            } 
        }
        this.timeline.setStartTime(this.absoluteStart);
    }

    shift(input, direction) {
        var output = [], i = 0;
        if (input.length < 2) {
            throw new Error("Need at least 2 leds to be able to shift!");
        }
        switch (direction) {
            case 'up':
                for (i = 1; i < input.length; i++) {
                    output.push(input[i]);
                }
                output.push(input[0]);           
                break;
            case 'down':
                output.push(input[input.length - 1]);
                for (i = 0; i < input.length - 1; i++) {
                    output.push(input[i]);
                }
                break;
        }
        return output;
    }

    reset() {
        this.timeline.reset();
        super.reset();
    }

    render() {
        var output = {};
        this.timeline.setCurrentPosition(this.absoluteCurrent);
        var items = this.timeline.getActiveItems();
        for (var item of items) {
            var pins = item.render();
            for (var pin in pins) {
                output[pin] = parseInt(pins[pin]);
            }
        }
        return output;
    } 
}

export default Shifting;
