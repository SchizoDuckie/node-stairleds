/**
 * Base class for an animation powered by a timeline.
 * Requires extending, override at least the render() method to use.
 * Optionally use onStart to hook into the start of the animation
 * (for instance to determine led brightness before start)
 * Most simple example: 
 * 
 * ```
 * class FadeIn extends TimelineAnimation {
 *   constructor(options) {
 *       super(options);
 *   }
*
 *   render() {
 *       var output = {};
 *       for(var i=0; i< this.options.leds.length; i++) {
 *           var range = this.options.end - this.options.start;
 *           output[this.options.leds[i]] = (range / 100) * this.progress;
 *       }
 *       return output;
 *   } 
 *  }
 * ```   
 *
 * This animation class runs on the principle of returning an object with
 * led numbers and brightnesses for a point in time. It does not perform the
 * actual manipulation of the led brightness itself, that's the task of the `LedstripAnimation` class
 * 
 */
const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

class TimelineAnimation {

    constructor(options) {
        this.options = options;
        this.absoluteStart = 0;
        this.absoluteEnd = null;
        this.absoluteCurrent = null;
        this.relativeStart = 0;
        this.duration = this.options.duration || this.calculateDuration();
        this.progress = 0;
        this.active = false;
        this.ended = false;
        this.started = false;
        this.id = this.generateId();
    }

    reset() {
        this.progress = 0;
        this.active = false;
        this.ended = false;
        this.started = false;
        this.absoluteStart = 0;
        this.absoluteEnd = null;
        this.absoluteCurrent = null;
        return this;
    }

    setLeds(leds) {
        this.options.leds = leds;
        return this;
    }

    generateId() {
 
        var rtn = '';
        for (var i = 0; i < 8; i++) {
            rtn += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
        }
        return rtn;
    }

    setRelativePosition(startTime) {
        this.relativeStart = startTime;
        return this;
    }

    /**
     * Sets the absolute start time and calculate duration based off of that.
     * Automatically calls calculateDuration if no `options.duration` was passed
     * @param {Date} startTime 
     */
    setAbsolutePosition(startTime) {
        this.absoluteStart = startTime;
        this.absoluteEnd = startTime + (this.duration || this.calculateDuration());
        return this;
    }

    /**
     * This event fires just before running the render() method for the first time.
     * Use for additional initialisation and calculations
     * @void
     */
    onStart() {
    }

    /**
     * Automatically called when no `duration` parameter was passed in options.
     * Useful for animations that last an amount of time not yet determinable at design time 
     * Override when needed
     * @return {Number} duration of animation in ms
     */
    calculateDuration() {
        throw new Error("No duration passed to options. Perform calculation here.");
    }

    /**
     * Set the current position of this animation by passing a Timestamp
     * Calculates this.progress in percentage from 0 to 100
     * @todo fix the event where the last step of the animation is bypassed in the loop
     * @param {Date} currentTime 
     */
    setCurrentPosition(currentTime) {
        if((currentTime >= this.absoluteStart && currentTime <= this.absoluteEnd) || (this.active && !this.ended)) {
            if (!this.started) {
                this.started = true;
                this.onStart();
            }
            this.active = true;
            this.absoluteCurrent = currentTime;
            this.progress = Math.min(Math.round((100 / this.duration) * (currentTime - this.absoluteStart) , 3), 100);
            if(this.progress >= 100) {
                this.ended = true;
            }
        } else {
            this.active = false;
            this.absoluteCurrent = null;
        }
        if(currentTime > this.absoluteEnd) {
            this.progress = 100;
        } else if (currentTime < this.absoluteStart) {
            this.progress = 0;
        }
    }

    /**
     * Render the state of this animation for the current point in time.
     * Use `this.progress` for calculations, or rely on `this.absoluteStart`, `this.absoluteCurrent` and `this.absoluteEnd`
     * 
     * Return an array with integers [0-4095] of led brightness values 
     * @return {Object} {} <int Pin: int Brightness>
     */
    render() {
        console.log(this.constructor.name, this.options.leds, this.progress);
        return [];
        //throw new Error("Not implemented");
    }

    clone() {
        return Object.assign(Object.create(Object.getPrototypeOf(this)),this);
    }
}

export default TimelineAnimation;