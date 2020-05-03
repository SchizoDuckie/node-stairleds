/**
 * The timeline holds instances of the TimelineAnimation class
 * Usage: 
 * ```
 * var line = new Timeline()
 * line
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
        this.diff = 0;
    }

    /**
     * Add a new animation at a fixed point in on the timeline.
     * @param {Number} startTime in ms
     * @param {TimelineAnimation} instance instance of a TimelineAnimation class.
     * @return {this} fluent interface supported
     */
    add(startTime, instance) {
        if(!(startTime in this.queue)) {
            this.queue[startTime] = [];
        }
        this.queue[startTime].push(instance);
        return this;
    }

    /**
     * Set the Start Time for determining how much time has elapsed
     * @param {Number} time absolute timestamp to set as start
     * @return {this} fluent interface supported
     */
    setStartTime(time) {
        this.startTime = time;
        for(var position in this.queue) {
            var items = this.queue[position];
            for(var i=0; i<items.length; i++) {
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
     * @return {this} fluent interface supported
     */
    setCurrentPosition(time) {
        this.currentPosition = time;
        this.diff = time - this.startTime;
        for(var position in this.queue) {
            this.queue[position].map(item => item.setCurrentPosition(time));
        }
        return this;
    }

    /**
     * Fetch an array of TimelineAnimations with `this.active=true` from the timeline
     * so they can be rendered.
     * @return {Array<TimelineAnimation>} array of active timeline animations
     */
    getActiveItems() {
        var output = [];
        for(var position in this.queue) {
            for(var item in this.queue[position]) {
                if (this.queue[position][item].active) {
                     output.push(this.queue[position][item]);
                 }
            }
        }
        return output;
    }
}


export { TimeLine };