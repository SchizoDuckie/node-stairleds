/**
 * PCA9685 Handling and routes.
 * Cre
 */
class Pca9685 {

    constructor() {

    }


    /**
     * Hook everything up
     * @param app {StairledApp}
     * @param config
     * @param websocketServer
     * @param pinMapper
     */
    register (app) {

        app.webServer.get('/pca9685', function (req, res) {
            const availableDrivers = app.pinMapper.getDriverMappings();
            console.log('Available drivers:', availableDrivers);  // Debug output
            res.render('pca9685', availableDrivers);
        });

        app.webServer.post("/pca9685", function (req, res) {
            console.log("\n=== Processing Pin Mapping POST ===");
            console.log("Raw POST data:", req.body);
            
            const { mappings } = req.body;
            
            if (!Array.isArray(mappings) || mappings.length === 0) {
                console.error("No mappings received");
                return res.status(400).json({ error: "No mappings provided" });
            }

            // Basic validation of required fields and data types
            const validMappings = mappings.filter(m => 
                m && 
                typeof m.driver === 'string' &&
                Number.isInteger(m.pin) && m.pin >= 0 && m.pin <= 15 &&
                Number.isInteger(m.step) && m.step > 0
            );

            if (validMappings.length === 0) {
                console.error("No valid mappings found");
                return res.status(400).json({ error: "Invalid mapping data" });
            }

            console.log("Saving mappings:", validMappings);
            app.pinMapper.setPinMapping(validMappings);
            app.config.set('pinmapper:mapping', validMappings);
            app.config.save();
            
            res.redirect('/pca9685');
        });

        app.webSocketServer.addHandler('setPWM', (address, ports, value) => {
            console.log(`\n=== Processing setPWM ===`);
            console.log(`Address: ${address} (${typeof address})`);
            console.log(`Ports: ${ports} (${typeof ports})`);
            console.log(`Value: ${value} (${typeof value})`);

            const driver = app.pinMapper.getDriverByAddress(address);
            if (!driver) {
                console.error(`Invalid driver address: ${address}`);
                return;
            }

            // Convert ports to numbers once and filter invalid values
            const portNumbers = ports
                .split(',')
                .map(p => parseInt(p, 10))
                .filter(p => !isNaN(p) && p >= 0 && p < 16);
            
            console.log(`Parsed port numbers:`, portNumbers);
            console.log(`Parsed PWM value:`, parseInt(value));

            // Fallback to individual updates
            portNumbers.forEach(port => {
                try {
                    driver.setPwm(port, 0, parseInt(value));
                } catch (err) {
                    console.error(`Failed to set PWM for port ${port}:`, err);
                    console.error(`Port: ${port} (${typeof port})`);
                    console.error(`Value: ${value} (${typeof value})`);
                }
            });
        });
 
    }
}

export default new Pca9685();