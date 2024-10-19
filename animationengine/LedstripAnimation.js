import TimeLine from './TimeLine.js';


/**
 * LedstripAnimation 
 * fades led strips attached to pca9685 instances with PWM.
 */
class LedstripAnimation {

    /**
     * Constructor: initializes the internal timeline and attaches the PinMapper
     * @param {PinMapper} mapper PinMapper instance for PCA9685 pin mapping
     */
    constructor(mapper, easingFunction = this.defaultEasing) {
        this.mapper = mapper;
        this.timeline = new TimeLine();
        this.easingFunction = easingFunction; // Add easing function property
        this.started = false;
        this.startTime = null;
        this.currentTime = null;
        this.hooks = [];
        this.boundLoop = null;
        this.loopInfinite = false;
        this.looper = null;
    }

    // Default easing function (linear)
    defaultEasing(t) {
        return this.easeInOutQuad(t);
    }

    // Easing functions
    static easeInQuad(t) {
        return t * t;
    }

    static easeOutQuad(t) {
        return t * (2 - t);
    }

    static easeInOutQuad(t) {
        return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    static easeInCubic(t) {
        return t * t * t;
    }

    static easeOutCubic(t) {
        return (--t) * t * t + 1;
    }

    static easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    static easeInQuart(t) {
        return t * t * t * t;
    }

    static easeOutQuart(t) {
        return 1 - (--t) * t * t * t;
    }

    static easeInOutQuart(t) {
        return t < 0.5 ? 8 * t * t * t * t : 1 - 8 * (--t) * t * t * t;
    }

    static easeInQuint(t) {
        return t * t * t * t * t;
    }

    static easeOutQuint(t) {
        return 1 + (--t) * t * t * t * t;
    }

    static easeInOutQuint(t) {
        return t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * (--t) * t * t * t * t;
    }

    static easeInExpo(t) {
        return t === 0 ? 0 : Math.pow(2, 10 * (t - 1));
    }

    static easeOutExpo(t) {
        return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    static easeInOutExpo(t) {
        if (t === 0) return 0;
        if (t === 1) return 1;
        return t < 0.5 ? 0.5 * Math.pow(2, 20 * t - 10) : 1 - 0.5 * Math.pow(2, -20 * t + 10);
    }

    static easeInCirc(t) {
        return 1 - Math.sqrt(1 - t * t);
    }

    static easeOutCirc(t) {
        return Math.sqrt(1 - (--t) * t);
    }

    static easeInOutCirc(t) {
        return t < 0.5 ? (1 - Math.sqrt(1 - 4 * t * t)) / 2 : (Math.sqrt(1 - (-2 * t + 2) * (-2 * t + 2)) + 1) / 2;
    }

    // Compensate for LED brightness threshold
    compensateBrightness(value) {
        const threshold = 200; // Example threshold value
        const maxBrightness = 4095; // Max PWM value
        if (value < threshold) {
            return Math.round((value / threshold) * maxBrightness); // Scale below threshold
        } else {
            return Math.round(maxBrightness * (1 - Math.pow((1 - (value - threshold) / (maxBrightness - threshold)), 2))); // Non-linear scaling above threshold
        }
    }

    /**
     * Add a hook into the animation process, for instance to tap into rendering
     * @param {function} callback to execute on
     * @return {LedstripAnimation} fluent interface
     */
    addHook(callback) {
        this.hooks.push(callback);
        return this;
    }

    /**
     * Add a new animation procedure to the timeline
     * @param {int} startTime startTime in milliseconds
     * @param {TimelineAnimation} instance an instance of a `TimelineAnimation`
     * @return {LedstripAnimation} fluent interface
     */
    add(startTime, instance) {
        this.timeline.add(startTime, instance);
        return this;
    }

    /**
     * Main Run loop:
     * - Updates the timeline with current position
     * - Grabs active items
     * - Calls `render()` on them
     * - Iterates the results and sets the brightness on returned pins via the pinMapper
     * - schedules the next call to itself via `setImmediate`
     * @private
     * @return void
     */
     loop() {

        this.currentTime = Date.now();
        this.timeline.setCurrentPosition(this.currentTime);
        let items = this.timeline.getActiveItems();

        for (let item of items) {
            let easedProgress = this.easingFunction(item.progress / 100); // Apply easing
            let pins = item.render(easedProgress); // Pass eased progress to render
            for (let pin in pins) {
                let compensatedBrightness = this.compensateBrightness(parseInt(pins[pin]));
                this.mapper.setBrightness(parseInt(pin), compensatedBrightness);
            }
        }

        for(let i=0; i< this.hooks.length; i++) {
            this.hooks[i](items, this);
        }
        items = null;

        if((this.startTime + this.timeline.duration) < this.currentTime) {
             this.stop();
            if (this.loopInfinite) {
                this.start();
            }
        } else {
            if(this.started) {
                this.looper = setImmediate(this.boundLoop);
            }
        }
    }


    /**
     * Start the animation. 
     * - sets `this.started` to `true`
     * - Sets `this.startTime` to `Date.now()` or to the _provided timestamp_. 
     * - Propagates the current time to the internal Timeline instance
     * - Starts calling the `this.loop()` function as fast as possible. 
     * @param {Date} timeTravel optional start time in history or future.
     * @return {LedstripAnimation} fluent interface
     */
    start(timeTravel) {
        this.started = true;
        this.startTime = timeTravel || Date.now();
        this.timeline.setStartTime(this.startTime);
        this.boundLoop = this.loop.bind(this);
        this.loop();
        return this;
    }

    /**
     * Stop the animation.
     * Kills the loop and sets `this.started` to `false`
     * @return {LedstripAnimation} fluent interface
     */
    stop() {
        this.started = false;
        this.looper = null;
        this.boundLoop = null;
        this.currentTime = null;
        clearImmediate(this.looper);
        this.timeline.reset();
        this.mapper.setAllBrightness(0);
        return this;
    }

    /**
     * Set animation timing options.
     * @param {Object} options - Animation options including timing.
     */
    setAnimationTiming(options) {
        this.animationTiming = options;
    }
}

export default LedstripAnimation;
