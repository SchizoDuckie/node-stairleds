import TimelineAnimation from  './TimelineAnimation.js';

/**
 * A Fade In Animation.
 * Fades all LEDs from `options.start` to `options.end`
 */
class FadeIn extends TimelineAnimation {
    
    /**
     * Options: `Object{}` with these mandatory properties
     * - start `int[0-4095]` start brightness
     * - end: `int[0-4095]` end brightness
     * - mapper: `LedMapper` an instance of the PinMapper class to find current pin brightnesses from  
     * @param {Object} options 
     */
    constructor(options) {
        super(options);
        this.options.leds = this.options.leds || this.options.mapper.getAllLeds(); // Fallback to all LEDs
        this.duration = options.duration || this.duration; // Set duration from options
    }

    render() {
        const output = {};
        const range = this.options.end - this.options.start;

        for (let i = 0; i < this.options.leds.length; i++) {
            output[this.options.leds[i]] = this.options.start + ((range / 100) * this.progress);
        }
        return output;
    }    
}

export default FadeIn;
