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
    constructor(mapper) {
        this.mapper = mapper;
        this.timeline = new TimeLine();
        this.started = false;
        this.startTime = null;
        this.currentTime = null;
        this.hooks = [];
        this.boundLoop = null;
        this.loopInfinite = false;
        this.looper = null;
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

        for(let item in items) {
            let pins = items[item].render();
            for(let pin in pins) {
                this.mapper.setBrightness(parseInt(pin), parseInt(pins[pin]));
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
}

export default LedstripAnimation;