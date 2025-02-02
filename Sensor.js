import Stairlog from "./db/entities/Stairlog.js";
import { eventBus, Events } from './services/EventBus.js';
import { animationService } from './services/AnimationService.js';

class Sensor {
    /**
     * Creates a new sensor instance
     * @param {object} config - Sensor configuration
     */
    constructor(config) {
        this.enabled = config.enabled;
        this.name = config.name;
        this.type = config.type;
        this.channel = config.channel;
        this.triggerTreshold = config.triggerTreshold;
        this.triggerType = config.triggerType;
        this.triggerEffect = config.triggerEffect;
        this.upperTreshold = config.upperTreshold;
        this.active = false;
        this.lastTriggered = null;
        this.lastLogTime = 0;
        
        // Get animation from centralized service
        this.anim = animationService.animations.get(this.triggerEffect);
        
        if (!this.anim) {
            eventBus.emit(Events.SYSTEM_ERROR, 
                `Animation '${this.triggerEffect}' not found for sensor ${this.name}`);
        }
        
        this.initEventListeners();
    }

    initEventListeners() {
        eventBus.on(Events.SENSOR_DATA, (sensorName, value) => {
            if (sensorName !== this.name) return;
            
            const now = Date.now();
            if (now - this.lastLogTime >= 1000) {
                eventBus.emit(Events.SYSTEM_DEBUG, 
                    `Sensor ${this.name} reading: ${value}`);
                this.lastLogTime = now;
            }

            this.processTrigger(value);
        });
    }

    processTrigger(value) {
        if(value > this.upperTreshold) return;

        switch (this.triggerType) {
            case "<=":
                if (value <= this.triggerTreshold) {
                    this.trigger(value);
                }
                break;
            case ">=":
                if (value >= this.triggerTreshold) {
                    this.trigger(value);
                }
                break;
            case "==":
                if (value === this.triggerTreshold) {
                    this.trigger(value);
                }
                break;
        }
    }

    async trigger(value) {
        if(!this.active) {
            this.active = true;
            this.lastTriggered = new Date();
            
            eventBus.emit(Events.SYSTEM_INFO, 
                `Sensor '${this.name}' triggered! Measured ${value} ${this.triggerType} configured treshold ${this.triggerTreshold}. Starting LedstripAnimation '${this.triggerEffect}'`);
            
            setTimeout(() => { this.active=false }, 2000);
            
            if(this.anim) {
                let skip = false;
                // Check all animations through the service
                animationService.animations.forEach(anim => {
                    if(anim.started) {
                        eventBus.emit(Events.SYSTEM_DEBUG, 
                            `Animation ${anim.name} is still active, not starting a new one`);
                        skip = true;
                    }
                });
                
                if(!skip) {
                    this.anim.start();
                }
            } else {
                eventBus.emit(Events.SYSTEM_ERROR, 
                    `Not starting anim ${this.triggerEffect} because it wasn't found.`);
            }

            try {
                let logRecord = new Stairlog();
                logRecord.sensorname = this.name;
                logRecord.sensorvalue = value;
                logRecord.effect = this.triggerEffect;
                await logRecord.Save();
            } catch (error) {
                eventBus.emit(Events.SYSTEM_ERROR, 
                    `Error during log insert into sqlite3: ${error.message}`);
            }
        }
    }
}

export default Sensor;
