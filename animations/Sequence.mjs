import TimeLine from '../animationengine/TimeLine';
import TimelineAnimation from  './TimelineAnimation';
import FadeTo from './FadeTo';

/**
 * Sequence Animation.
 * Fades led numbers passed in `options.leds[]` from their current brightness to `options.duration` one by one
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
        this.fadeTo = new FadeTo({
            brightness: this.options.brightness,
            duration: this.options.duration / this.options.leds.length,
            mapper: this.options.mapper,
        });
        for(let i = 0; i<this.options.leds.length; i++) {
            this.timeline.add(Math.round(i * (this.options.duration / this.options.leds.length)), this.fadeTo.clone().setLeds([i]));
        }
    }

    onStart() {
        this.timeline.setStartTime(this.absoluteStart);
    }

    render() {
        let output = {};
        this.timeline.setCurrentPosition(this.absoluteCurrent);
        let items = this.timeline.getActiveItems();
        for(let item in items) {
            let pins = items[item].render();
            for(let pin in pins) {
                output[pin] = parseInt(pins[pin]);
            }
        }
        return output;
    }
 }

export default Sequence;