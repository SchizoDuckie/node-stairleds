
/**
 * LedstripAnimation 
 * fades led strips attached to pca9685 instances with PWM.
 */
class LedstripAnimation {

    /**
     * Constructor: initializes the internal timeline and attaches the PinMapper
     * @param {PinMapper} mapper PinMapper instance PCA9685 pin mapping  
     */
    constructor(mapper) {
        this.mapper = mapper;
        this.timeline = new TimeLine();
        this.started = false;
        this.looper = null;
        this.startTime = null;
        this.currentTime = null;
    }

    /**
     * Add a new animation procedure to the timeline
     * @param {Date} startTime startTime in milliseconds
     * @param {TimelineAnimation} instance an instance of a `TimelineAnimation`
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
     */
     loop() {
        this.currentTime = Date.now();
        this.timeline.setCurrentPosition(this.currentTime);
        var items = this.timeline.getActiveItems();
        for(var item in items) {
            var pins = items[item].render();
            for(var pin in pins) {
                this.mapper.setBrightness(parseInt(pin), parseInt(pins[pin]));
            }
        }

        if(this.started) {
            this.looper = setImmediate(this.loop.bind(this));
        }
    }


    /**
     * Start the animation. 
     * - sets `this.started` to `true`
     * - Sets `this.startTime` to `Date.now()` or to the _provided timestamp_. 
     * - Propagates the current time to the internal Timeline instance
     * - Starts calling the `this.loop()` function as fast as possible. 
     * @param {Date} timeTravel optional start time in history or future.
     */
    start(timeTravel) {
        this.started = true;
        this.startTime = timeTravel || Date.now();
        this.timeline.setStartTime(this.startTime);
        this.loop();
        return this;
    }

    /**
     * Stop the animation.
     * Kills the loop and sets `this.started` to `false`
     */
    stop() {
        this.started = false;
        clearImmediate(this.looper);
    }
}