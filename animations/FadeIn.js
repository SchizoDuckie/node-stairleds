/**
 * A Fade In Animation.
 * Fades led numbers passed in `options.leds[]` from `options.start` to `options.end`
 */
class FadeIn extends TimelineAnimation {
    
    /**
     * Options: `Object{}` with these mandatory properties
     * - start `int[0-4095]` start brightness
     * - end: `int[0-4095]` end brightness
     * - leds: `array` led numbers to fade in
     * @param {Object} options 
     */
    constructor(options) {
        super(options);
    }

    render() {
        var output = {};
        for(var i=0; i< this.options.leds.length; i++) {
            var range = this.options.end - this.options.start;
            output[this.options.leds[i]] = (range / 100) * this.progress;
        }
        return output;
    }    
}