import { FadeIn, FadeOut, FadeTo, Immediate, Shifting, Sequence } from './index.js';
import LedstripAnimation from '../animationengine/LedstripAnimation.js';
import AnimationConfigValidator from './interfaces/AnimationConfig.js';
import pinMapper from '../PinMapper.js';

/**
 * StairAnimation class that handles configurable stair lighting animations
 * Supports both predefined and custom step configurations
 */
class StairAnimation {
    /**
     * @param {Object} config Animation configuration
     * @param {string} config.name Animation name
     * @param {string} config.description Animation description
     * @param {Array<TimelineStep>} config.timeline Animation timeline configuration
     * @param {StepConfig} [config.stepConfig] Custom step configuration
     */
    constructor(config) {
        try {
            // Validate configuration before initializing
            AnimationConfigValidator.validateConfig(config);
            
            this.name = config.name;
            this.description = config.description;
            this.timeline = Array.isArray(config.timeline) ? config.timeline : [];
            this.leds = config.leds || [];
            this.stepConfig = config.stepConfig;
            this.animation = null;
            this.initialize();
        } catch (error) {
            console.error('Invalid animation configuration:', error);
            throw error;
        }
    }

    /**
     * Initialize the animation based on timeline configuration
     * @private
     */
    initialize() {
        this.animation = new LedstripAnimation(pinMapper);
        
        // Get all available steps from pin mapping
        const allSteps = pinMapper.pinMapping
            .map(mapping => mapping.step)
            .filter(step => step !== undefined);
        
        // Add each timeline step with its specific animation type
        this.timeline.forEach(step => {
            const AnimationType = {
                'Sequence': Sequence,
                'FadeTo': FadeTo,
                'FadeOut': FadeOut,
                'FadeIn': FadeIn,
                'Immediate': Immediate,
                'Shifting': Shifting
            }[step.type];

            if (AnimationType) {
                // If no leds specified in options, use all available steps
                const leds = step.options?.leds?.length > 0 ? step.options.leds : allSteps;
                
                const animation = new AnimationType({
                    ...step.options,
                    leds: leds,
                    mapper: pinMapper
                });
                
                this.animation.add(parseInt(step.at), animation);
            }
        });
    }

    setEasingFunction(easingFunction) {
        this.animation.setEasingFunction(easingFunction);
    }

    /**
     * Start the animation
     */

    start() {
        if (this.animation) {
            this.animation.start();
        }
    }

    /**
     * Stop the animation
     */
    stop() {
        if (this.animation) {
            this.animation.stop();
        }
    }

    updateConfig(config) {
        this.leds = config.leds || this.leds;
        this.initialize();
    }
}

/**
 * @typedef {Object} TimelineStep
 * @property {string} type Animation primitive type
 * @property {number} at Timeline position in milliseconds
 * @property {Object} options Animation-specific options
 * @property {('up'|'down')} [direction] Direction of the animation
 */

/**
 * @typedef {Object} StepGroup
 * @property {string} name Group name
 * @property {number[]} leds LED numbers in this group
 * @property {Object} [options] Group-specific animation options
 */

/**
 * @typedef {(number[]|StepGroup[])} StepConfig
 */

export default StairAnimation;