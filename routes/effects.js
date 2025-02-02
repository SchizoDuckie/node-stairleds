import StairAnimation from '../animations/StairAnimation.js';
import fs from 'fs/promises';
import path from 'path';
import AnimationConfigValidator from '../animations/interfaces/AnimationConfig.js';

/**
 * PCA9685 Handling and routes.
 * Creates a demo animation and hooks up websocket triggers to start and stop.
 */
class Effects {

    constructor()  {
       this.animations = new Map();
       this.currentAnimation = null;
       console.log('Effects class initialized');
    }

    /**
     * Load all animation configurations from the config/animations directory
     * @private
     * @param {PinMapper} pinMapper
     * @returns {Promise<Map<string, StairAnimation>>}
     */
    async loadAnimationConfigs(pinMapper) {
        const animationsPath = path.join(process.cwd(), 'config', 'animations');
        const files = await fs.readdir(animationsPath);
        
        for (const file of files) {
            if (path.extname(file) === '.json') {
                console.log('\n=== Loading Animation File ===');
                console.log('File:', file);
                
                const configContent = await fs.readFile(path.join(animationsPath, file), 'utf8');
                const config = JSON.parse(configContent);
                const animationName = path.basename(file, '.json');
                
                console.log('Raw config:', JSON.stringify(config, null, 2));
                
                if (config.stepConfig) {
                    config.stepConfig = config.stepConfig.map((group, idx) => {
                        console.log(`\nProcessing step group ${idx}:`, group);
                        
                        // Ensure leds is an array of numbers
                        const ledArray = Array.isArray(group.leds) ? group.leds : 
                                       typeof group.leds === 'string' ? group.leds.split(',').map(s => parseInt(s.trim())) : 
                                       [parseInt(group.leds)];
                        
                        console.log('Parsed LED array:', ledArray);
                        
                        // Map step numbers to LED mappings
                        const mappedLeds = ledArray
                            .map(step => {
                                console.log(`Looking up mapping for step ${step}`);
                                const mapping = pinMapper.pinMapping.find(m => m.step === step);
                                if (!mapping) {
                                    console.warn(`⚠️ No mapping found for step ${step}`);
                                    return null;
                                }
                                console.log(`Found mapping:`, mapping);
                                return { driver: mapping.driver, pin: mapping.pin };
                            })
                            .filter(led => led !== null);
                        
                        console.log('Final mapped LEDs:', mappedLeds);
                        
                        return {
                            ...group,
                            leds: mappedLeds
                        };
                    });
                }
                
                console.log('\nFinal processed config:', JSON.stringify(config, null, 2));
                
                this.animations.set(animationName, new StairAnimation({
                    name: animationName,
                    ...config
                }));
            }
        }
        
        return this.animations;
    }



    /**
     * Register routes and websocket handlers
     * @param {StairledApp} app
     */
    async register(app) {
        await this.loadAnimationConfigs(app.pinMapper);

        // Serve all files from animations directory
        app.webServer.get('/js/animations/:file', (req, res) => {
            res.sendFile(path.join(process.cwd(), 'animations', req.params.file));
        });
        
        // Serve all files from animationengine directory
        app.webServer.get('/js/animationengine/:file', (req, res) => {
            res.sendFile(path.join(process.cwd(), 'animationengine', req.params.file));
        });
        
        // Serve all files from animations directory
        app.webServer.get('/js/animations/interfaces/:file', (req, res) => {
            res.sendFile(path.join(process.cwd(), 'animations', 'interfaces', req.params.file));
        });

        app.webServer.get('/partials/:name', (req, res) => {
            res.sendFile(path.join(process.cwd(), 'views', 'partials', req.params.name + '.html'));
        });

        app.webServer.get('/effects', async (req, res) => {
            // Decode the animation name from URL parameter
            const selectedAnimationName = req.query.animation ? 
                decodeURIComponent(req.query.animation) : 
                Array.from(this.animations.keys())[0];
            
            const selectedAnimation = this.animations.get(selectedAnimationName);
            
            console.log('\n=== Loading Effects Page ===');
            console.log('Selected animation:', selectedAnimationName);
            console.log('Raw animation config:', selectedAnimation);

            const animationsArray = Array.from(this.animations).map(([key, animation]) => ({
                key,
                name: animation.name,
                description: animation.description
            }));

            // Convert the current animation for display
            const displayAnimation = selectedAnimation ? {
                name: selectedAnimation.name,
                description: selectedAnimation.description,
                stepConfig: selectedAnimation.stepConfig?.map(group => {
                    console.log('\nProcessing group for display:', group);
                    console.log('Group LEDs before conversion:', group.leds);
                    
                    // Convert LED mappings back to step numbers with proper validation
                    const steps = group.leds.map(led => {
                        const mapping = app.pinMapper.pinMapping.find(
                            m => m.driver === led.driver && m.pin === led.pin
                        );
                        return mapping?.step ?? null;
                    }).filter(step => step !== null);  // Ensure we remove null values
                    
                    console.log('Final steps for group:', steps);
                    
                    return {
                        name: group.name || 'Unnamed Group',
                        leds: steps,
                        options: group.options || {}
                    };
                }),
                timeline: selectedAnimation.timeline?.map(item => {
                    console.log('Processing timeline item:', item);
                    return {
                        type: item.type,
                        at: item.at,
                        description: item.description,
                        options: item.options
                    };
                }) || []
            } : null;

            console.log('\nFinal display config:', JSON.stringify(displayAnimation, null, 2));
            console.log('Pin mapping:', app.pinMapper.pinMapping);

            console.log('Rendering timeline with:', displayAnimation?.timeline);
            console.log('Timeline item count:', displayAnimation?.timeline?.length);

            // Change availableSteps to include full mapping data
            

            res.render('effects', {
                animations: animationsArray,
                currentAnimation: displayAnimation,
                pinMapping: app.pinMapper.pinMapping,
                availableSteps: app.pinMapper.getMappedSteps(), 
                animationTypes: [
                    { value: 'FadeIn', label: 'Fade In' },
                    { value: 'FadeOut', label: 'Fade Out' },
                    { value: 'FadeTo', label: 'Fade To' },
                    { value: 'Immediate', label: 'Immediate' },
                    { value: 'Sequence', label: 'Sequence' },
                    { value: 'Shifting', label: 'Shifting' }
                ]
            });
        });

        // Update save endpoint to handle the conversion
        app.webServer.post("/effects/save", async (req, res) => {
            try {
                const config = req.body;
                
                AnimationConfigValidator.validateConfig(config);
                
                if (config.name) {
                    const configPath = path.join(process.cwd(), 'config', 'animations', `${config.name}.json`);
                    
                    // Write directly to filesystem
                    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
                    
                    // Update the existing animation INSTANCE CONFIG
                    const animation = this.animations.get(config.name) || {};
                    animation.config = config;  // Directly replace the config reference
                    
                    // Force refresh the display properties
                    animation.name = config.name;
                    animation.description = config.description;
                    animation.stepConfig = config.stepConfig;
                    animation.timeline = config.timeline;
                    
                    res.json({ success: true });
                } else {
                    res.status(400).json({ success: false, error: 'Invalid animation name' });
                }
            } catch (error) {
                console.error('Error saving animation:', error);
                res.status(400).json({ success: false, error: error.message });
            }
        });

        // Animation control endpoints
        app.webServer.post('/animation/start', (req, res) => {
            try {
                console.log('Request body:', req.body);
                const name = req.body.animationName;
                const config = req.body.config
                console.log('\n=== Starting Animation ===');
                console.log('Animation name:', name);
                
                const animation = this.animations.get(name);
                if (animation) {
                    if (this.currentAnimation) {
                        console.log('Stopping current animation');
                        this.currentAnimation.stop();
                    }
                    
                    // Convert string values to numbers in the timeline config
                    if (config?.timeline) {
                        config.timeline = config.timeline.map(item => ({
                            ...item,
                            options: {
                                ...item.options,
                                end: Number(item.options.end),
                                start: item.options.start ? Number(item.options.start) : undefined,
                                brightness: item.options.brightness ? Number(item.options.brightness) : undefined,
                                duration: Number(item.options.duration)
                            }
                        }));
                    }
                    
                    // Update config and start animation
                    animation.updateConfig(config);
                    this.currentAnimation = animation;
                    console.log('Starting animation');
                    animation.start();
                    res.json({ success: true });
                } else {
                    console.warn(`⚠️ Animation not found: ${name}`);
                    res.status(404).json({ success: false, error: 'Animation not found' });
                }
            } catch (error) {
                console.error('Error starting animation:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        app.webServer.post('/animation/stop', (req, res) => {
            try {
                if (this.currentAnimation) {
                    this.currentAnimation.stop();
                }
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });

        app.webServer.post('/animation/clear', (req, res) => {
            try {
                if (this.currentAnimation) {
                    this.currentAnimation.stop();
                    this.currentAnimation = null;
                }
                // Turn off all LEDs
                app.pinMapper.getAvailableDrivers().forEach(driver => {
                    for (let i = 0; i < 16; i++) {
                        driver.setPwm(i, 0, 0);
                    }
                });
                res.json({ success: true });
            } catch (error) {
                res.status(500).json({ success: false, error: error.message });
            }
        });
    }
}

const effects = new Effects();
console.log('Effects instance created');
export default effects;