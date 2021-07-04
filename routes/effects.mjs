import { FadeIn, FadeOut, FadeTo, Immediate, Shifting, Sequence } from '../animations';
import LedstripAnimation from '../animationengine/LedstripAnimation.mjs';

/**
 * PCA9685 Handling and routes.
 * Creates a demo animation and hooks up websocket triggers to start and stop.
 */
class Effects {

    constructor()  {
       this.animation = null;
    }

    /**
     *
     * @param {PinMapper} pinMapper
     */
    createDemoAnimation(pinMapper) {
        const fadeIn250 = new FadeIn({ start: 0, end: 200, duration: 250, leds: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17] });
        const fadeOut250 = new FadeOut({ start: 200, end: 0, duration: 250, leds: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17] });
        const fadeInHalf500 = new FadeIn({ start: 0, end: 500, duration: 500, leds: [2,4,6,8,10,12,14,16]});
        const fadeOutHalf500 = new FadeOut({ start: 500, end: 0, duration: 500, leds: [2,4,6,8,10,12,14,16]});

        const fadeInOtherHalf500 = new FadeIn({ start: 0, end: 500, duration: 500, leds: [1,3,5,6,7,11,13,15,17] });
        const fadeOutOtherHalf500 = new FadeOut({ start: 500, end: 0, duration: 500, leds: [1,3,5,6,7,11,13,15,17] });

        // fade leds 1-5 one by one over 1000ms
        const sequenceOn1000 = new Sequence({ brightness: 2000, duration: 1000, leds: [1,2,3,4,5], mapper: pinMapper })

        // shift current led brightness to the pin on the right 8 times over 1000ms
        const shiftRight5Pins1000 = new Shifting({ direction: 'down', duration: 1000, shifts: 5, leds: [ 10,11,12,13,14,15], mapper: pinMapper })

        let animation = (new LedstripAnimation(pinMapper))
            // add a fadein animation that starts at 0ms, lasts 150ms and fades pins 1-6 from 0 to 200
            .add(0, fadeIn250.clone())
            .add(300, fadeOut250.clone())

            .add(600, fadeInHalf500.clone())
            .add(1100, fadeOutHalf500.clone())
            .add(1100, fadeInOtherHalf500.clone())
            .add(1600, fadeOutOtherHalf500.clone())
            .add(1600, fadeInHalf500.clone())

            .add(2500, sequenceOn1000.clone())

            .add(2500,  shiftRight5Pins1000.clone())

            // animate leds to almost off in sequence from 800 to 20 over 200ms
            .add(3500,  new Sequence({ brightness: 20,  duration: 1000, leds: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17], mapper: pinMapper }))

            // fade all leds out from their current brightness to zero in 250ms.
            .add(5000, new FadeTo({ brightness: 0, duration: 1000, leds:  [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17], mapper: pinMapper }))
            .add(7700, fadeInHalf500.clone())
            .add(7700, fadeOutOtherHalf500.clone())
            .add(8000, fadeOutHalf500.clone())
            .add(9000, new Sequence({
                brightness: 4000,
                duration: 2000,
                leds: [1,3,5,7,9,11,13,15,17],
                mapper: pinMapper
            }))
            .add(11000, new Sequence({
                brightness: 0,
                duration: 500,
                leds: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17],
                mapper: pinMapper
            }))
            .add(12000, new FadeIn({
                start: 0,
                end: 4000,
                duration: 200,
                leds: [1],
                mapper: pinMapper
            }))
            .add(12500, new Shifting({
                duration: 3000,
                leds: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17],
                shifts: 27,
                mapper: pinMapper
            }))
            .add(15500, new Shifting({
                duration: 10000,
                leds: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17],
                shifts: 180,
                mapper: pinMapper,
                direction: 'down'
            }))

        animation.loopInfinite = true;
        return animation;
    }


    /**
     * Hook everything up
     * @param app {StairledApp}
     */
    register (app) {

        function postParam(posted, paramname, defaultValue) {
            if(Object.keys(posted).indexOf(paramname) === -1 || posted[paramname] === '') {
                return defaultValue;
            }
            return posted[paramname];
        }

        this.animation = this.createDemoAnimation(app.pinMapper);

        app.webserver.get('/effects', (req, res) => {
            res.render('effects', { anim: this.animation });
        });

        /**
         * rock that shit
         */
        app.webSocketServer.addHandler('demo', () => {
            this.animation.start();
        })
        app.webSocketServer.addHandler('stopdemo', () => {
            this.animation.stop();
        })
        app.webSocketServer.addHandler('cleardemo', () => {
            this.animation.clear();
        })


        app.webserver.post("/effects", (req, res) => {
            res.redirect('/effects');
            console.log("Incoming POSTdata: ", req.body);
            var posted = req.body;
            let anim = this.animation;
            anim.FADE_DURATION = parseInt(postParam(posted, 'fade-duration', 6));
            anim.FADE_BRIGHTNESS = parseInt(postParam(posted, 'fade-brightness', 200)); // fade all leds to this brightness to before starting the animation. 0 to disable.
            anim.MAX_BRIGHTNESS = parseInt(postParam(posted, 'max-brightness', 4095)); // max global LED brightness
            anim.setDuration(parseInt(postParam(posted, 'anim-duration', 600)));
            anim.ANIM_STRATEGY = parseInt(postParam(posted, 'anim-strategy', anim.ANIMATION_STRATEGIES.ONE_AT_A_TIME));
            anim.ANIM_OFF_STRATEGY = parseInt(postParam(posted, 'off-anim-type', anim.ANIMATION_OFF_STRATEGIES.SEQUENCE));
            anim.USE_FADE_START = parseInt(postParam(posted, 'use-fade-start', 0)) === 1;
            anim.USE_FADE_END = parseInt(postParam(posted, 'use-fade-end', 0 )) === 1;
            anim.setShifting(parseInt(postParam(posted, 'anim-shifting', 0)) === 1);
            anim.ANIM_SHIFT_STEPS = parseInt(postParam(posted, 'anim-shift-steps', anim.animation.length));
            anim.setAnimation(posted.animation.map(function(val) { return parseInt(val); }));
            anim.stop();
            anim.start();
        });


        app.webSocketServer.addHandler('ledtest', (address, ports, value) => {
            ports = ports.split(',');
            var driver = app.pinMapper.getDriverByAddress(address);
            ports.map(function (port) {
                driver.setPwm(port, 0, value);
            });
        });


        console.log("Effects webserver routes added\nEffects Websocket listener attached");
    }
}

module.exports = new Effects();