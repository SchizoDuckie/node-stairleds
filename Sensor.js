import Stairlog from "./db/entities/Stairlog.js";

class Sensor {

    constructor(config, mqttClient, animations) {
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
        this.initMqttSubscription(mqttClient);
        this.anim = animations[this.triggerEffect];
        this.animations = animations;
    }

    initMqttSubscription(mqttClient) {

        mqttClient.on('message',  (topic, message) => {
            let messageParts = message.toString().split("|"),
                sensorName = messageParts[0],
                value = parseInt(messageParts[1]),
                state = parseInt(messageParts[2]);
//	    console.log("Sensor: ", sensorName, "my name: ", this.name, value);
            if (sensorName === this.name) {
                this.processTrigger(value);
            }
        });
    }

    processTrigger(value) {
//console.debug("Process trigger? ", value, this.triggerType, this.triggerTreshold);
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
            console.log(`[${this.lastTriggered.toLocaleString()}] Sensor '${this.name}' just triggered! Measured ${value} ${this.triggerType} configured treshold ${this.triggerTreshold}. Starting LedstripAnimation '${this.triggerEffect}'`);
            setTimeout(() => { this.active=false }, 2000);
            if(this.anim) {
                let skip=false;
                Object.keys(this.animations).map(anim => {
                    if(this.animations[anim].started) {
                        console.log(`Animation ${anim} is still active, not starting a new one`);
                        skip=true;
                    }
                })
                if(!skip) {
                    this.anim.start();
                }
            } else {
                console.log(`Not starting anim ${this.triggerEffect} because it wasn't found.`);
            }

            try {
                let logRecord = new Stairlog();
                logRecord.sensorname = this.name,
                    logRecord.sensorvalue = value;
                logRecord.effect = this.triggerEffect;
                logRecord.Save();
            } catch (E) {
                console.log("Error during log insert into sqlite3: ",E);
            }
        }
    }


}

export default Sensor;
