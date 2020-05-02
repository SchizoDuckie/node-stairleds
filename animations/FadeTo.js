/**
 * A Fade To Animation.
 * Fades led numbers passed in `options.leds[]` from their current brightness to `options.brightness`
 */
class FadeTo extends TimelineAnimation {

    
    /**
     * Options: `Object{}` with these mandatory properties
     * - brightness `int[0-4095]` end brightness
     * - duration: `int` duration in ms it takes to animate the leds at once
     * - mapper: `LedMapper` an instance of the PinMapper class to find current pin brightnesses from  
     * - leds: `array` led numbers to fade
     * @param {Object} options 
     */
    constructor(options) {
        super(options);
        if(!('brightness' in this.options)) {
            throw new Error("mandatory option brightness is missing!");
        }
        if(!this.options.mapper) {
            throw new Error("mandatory option mapper is missing!");
        }
        this.brightnesses = {};
    }

    onStart() {
        
        for(var i= 0; i< this.options.leds.length; i++) {
            this.brightnesses[this.options.leds[i]] = this.options.mapper.getBrightness(this.options.leds[i]);
        }
        
    }

    render() {
        var output = {};
        for(var i=0; i< this.options.leds.length; i++) {
            var led = this.options.leds[i],
                end = this.options.brightness,
                start = this.brightnesses[led],
                range = (start > end) ? start - end : end - start;

            if (end > start) {
                output[led] = Math.round(start + ((range / 100) * this.progress));
            } else {
                output[led] = start - ((range / 100) * this.progress);
            }
        }
        return output;
    } 
}
