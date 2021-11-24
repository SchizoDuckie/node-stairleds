/**
 * The timeline holds instances of the TimelineAnimation class
 * Usage: 
 * ```
 * let line = (new TimeLine())
 *  .add(0, new FadeIn(options))
 *  .add(500, new FadeOut(options))
 *  .setStartTime(new Date());
 *  // time elapses
 *  line.setCurrentPosition(new Date());
 *  var activeItems = line.getActiveItems();
 * ```
 */
class TimeLine {

    constructor() {
        this.queue = {};
        this.startTime = 0;
        this.currentPosition = 0;
        this.duration = 0;
        this.diff = 0;
    }

    /**
     * Add a new animation at a fixed point in on the timeline.
     * @param {int} startTime in ms
     * @param {TimelineAnimation} instance instance of a TimelineAnimation class.
     * @return {TimeLine} fluent interface supported
     */
    add(startTime, instance) {
        if(!(startTime in this.queue)) {
            this.queue[startTime] = [];
        }
        this.queue[startTime].push(instance.setRelativePosition(startTime));
        if(this.duration < startTime + instance.duration) {
            this.duration = startTime + instance.duration;
        }
        return this;
    }

    /**
     * Fetch all the timeline animation items as a flat array
     * @return {TimeLineAnimation[]}
     */
    getAllItems() {
        let output = [];
        for( let time in this.queue) {
            for (let item in this.queue[time]) {
                output.push(this.queue[time][item]);
            }
        }
        return output;
    }

    /**
     * Set the Start Time for determining how much time has elapsed
     * @param {int} time absolute timestamp to set as start
     * @return {TimeLine} fluent interface supported
     */
    setStartTime(time) {
        this.startTime = time;
        for(let position in this.queue) {
            let items = this.queue[position];
            for(let i=0; i<items.length; i++) {
                items[i].setAbsolutePosition(time + parseInt(position));
            }
        }
        return this;
    }

    /**
     * Update the current time to determine current position on the timeline.
     * Walks all items on the timeline and sets their `active` flag to true when
     * they their duration is between start and end.
     * @param {Number} time current timestamp in loop
     * @return {TimeLine} fluent interface supported
     */
    setCurrentPosition(time) {
        this.currentPosition = time;
        this.diff = time - this.startTime;
        for (let position in this.queue) {
            this.queue[position].map(item => item.setCurrentPosition(time));
        }
        return this;
    }

    /**
     * Fetch an array of TimelineAnimations with `this.active=true` from the timeline
     * so they can be rendered.
     * @return {TimelineAnimation[]} array of active timeline animations
     */
    getActiveItems() {
        let output = [];
        for(let position in this.queue) {
            for(let item in this.queue[position]) {
                if (this.queue[position][item].active) {
                     output.push(this.queue[position][item]);
                 }
            }
        }
        this.activeItems = output;
        return output;
    }

    reset() {
        this.currentPosition = null;
        this.startTime = null;
        for(let position in this.queue) {
            let items = this.queue[position];
            for(let i=0; i<items.length; i++) {
                items[i].reset();
            }
        }
    }
}


export default TimeLine;