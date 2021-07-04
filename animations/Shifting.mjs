import TimeLine from '../animationengine/TimeLine';
import TimelineAnimation from  './TimelineAnimation';
import FadeTo from './FadeTo';

/**
 * Shifting Animation.
 * Fades led numbers passed in `options.leds[]` from their current brightness to zero
 * and applies the current brightness to the next item over.
 * 
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
        if(!this.options.mapper) {
            throw new Error("mandatory option mapper is missing!");
        }
        if(!('shifts' in this.options)) {
            throw new Error("mandatory options shifts is missing!");
        }
        this.timeline = null;
    }

    onStart() {
        this.timeline = new TimeLine();
        for(var i= 0; i< this.options.leds.length; i++) {
            this.brightnesses.push({ 
                led: this.options.leds[i], 
                brightness: this.options.mapper.getBrightness(this.options.leds[i])
           });
        }
        // maak kopie van start state leds, omswappen naar array met pin en brightness zodat ie geshift kan worden
        // for loop aantal shifts
        // for loop alle leds
        // fadeto op current led naar brightness vorige led op tijd / steps * loop,
        // fadein op volgende led naar brightness current
        // shift led states
        var originalStates = this.brightnesses;
        
        for(i = 0; i<this.options.shifts; i++) {
            var shiftedStates = this.shift(originalStates, this.options.direction);
            for(var j = 0; j< this.options.leds.length; j++) {
                this.timeline.add(Math.round(i * (this.options.duration / this.options.shifts)), new FadeTo({
                    brightness: shiftedStates[j].brightness,
                    duration: this.options.duration / this.options.shifts,
                    mapper: this.options.mapper,
                    leds: [this.options.leds[j]]
                }));
            }
            originalStates = this.shift(originalStates, this.options.direction);
            if(this.options.bouncing && i % this.options.bounceAfter == 0) {
                this.options.direction = this.options.direction == 'up' ? 'down' : 'up';
            } 
        }
        this.timeline.setStartTime(this.absoluteStart);
    }

    shift(input, direction) {
        var output = [], i=0;
        if(input.length < 2) {
            throw new Error("Need at least 2 leds to be able to shift!");
        }
        switch(direction) {
            case 'up':
                for(i = 1; i<input.length; i++) {
                    output.push(input[i]);
                }
                output.push(input[0]);           
            break;
            case 'down':
                output.push(input[input.length -1]);
                for(i = 0; i<input.length -1; i++) {
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
        for(var item in items) {
            var pins = items[item].render();
            for(var pin in pins) {
                output[pin] = parseInt(pins[pin]);
            }
        }
        return output;
    } 

}

export default Shifting;