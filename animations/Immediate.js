import TimelineAnimation from  './TimelineAnimation.js';
/**
 * 'Immediate' Animation.
 * Sets led brightness to target brightness without fade
 * 
 */
class Immediate extends TimelineAnimation {
    
    /**
     * Options: `Object{}` with these mandatory properties
     * - brightness `int[0-4095]` end brightness
     * - leds: `array` led numbers to fade in
     * @param {Object} options 
     */
    constructor(options) {
         super(options) ;
         this.done = false;
    }

    /**
     * Fixed duration: 50ms to be able to trigger on a timeline
     */
    calculateDuration() {
        return 50;
    }

    render() {
        var output = {};
        if(this.done) {
             return output;
        }
        for(var i=0; i< this.options.leds.length; i++) {
            output[this.options.leds[i]] = this.options.brightness;
        }
        this.done = true;
       return output;
    }
}

export default Immediate;