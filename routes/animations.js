class Animations {
    register(app) {
        app.webServer.get('/animations/steps', function (req, res) {
            const pinMapping = app.pinMapper.getPinMapping();
            const animations = Object.entries(app.animations).map(([name, animation]) => ({
                name,
                description: animation.description,
                stepConfig: animation.stepConfig
            }));

            res.render('animation-steps', {
                animations,
                pinMapping
            });
        });

        app.webServer.post('/animations/steps', function (req, res) {
            const { animationName, stepGroups } = req.body;
            
            // Update animation configuration
            const config = app.config.get('animations') || {};
            config[animationName] = {
                ...config[animationName],
                stepConfig: stepGroups
            };
            
            app.config.set('animations', config);
            app.config.save();
            
            // Reinitialize animations
            app.animations = app.initAnimations(app.pinMapper);
            
            res.redirect('/animations/steps');
        });

        console.log("🎬 Animation configuration routes added");
    }
}

export default new Animations(); 