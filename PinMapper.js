import Wire from 'i2c';
import sleeper from "sleep";

// Constants
const OSCILLATOR_FREQ = 27000000;
const PWM_FREQUENCY = 52000;
const PCA9685_BASE_ADDRESS = 0x40;
const PCA9685_MAX_ADDRESS = 0x7F;
const MODE1_REGISTER = 0x00;

// Set much higher limit for event listeners since i2c lib adds them per instance
process.setMaxListeners(100);


/**
 * PCA9685 wrapper / mapper with auto-discovery
 * Initializes on i2c ports and enables addressing pins in mappable pin order 
 */
class PinMapper {
    constructor() {
        console.log('Initializing PinMapper instance');
        this.drivers = {};
        this.pinMapping = {};
        this.brightnesses = {};
        this.wire = null;
        
        // Properly bind exit handler
        this.exitHandler = this.exitHandler.bind(this);
        
        // Store initial listener count
        this.initialExitListeners = process.listeners('exit').length;
        
        // Stronger cleanup registration
        this.registeredCleanup = false;
        this.registerCleanupHandlers();
    }

    /**
     * Unified exit handler with proper cleanup sequence
     */
    exitHandler() {
        if (!this.cleanupCompleted) {
            this.cleanup();
        }
    }

    /**
     * Registers cleanup handlers with process events
     * @private
     */
    registerCleanupHandlers() {
        if (this.registeredCleanup) return;
        
        // Handle normal exits
        process.on('exit', this.exitHandler);
        
        // Handle signals
        process.on('SIGINT', this.exitHandler);
        process.on('SIGTERM', this.exitHandler);
        
        // Handle uncaught exceptions as last resort
        process.on('uncaughtException', this.exitHandler);
        
        this.registeredCleanup = true;
    }

    /**
     * Cleanup method to handle resource disposal
     * @private
     */
    cleanup() {
        console.log('Cleaning up PinMapper resources...');
        try {
            // Prevent double cleanup
            if (this.cleanupCompleted) return;
            this.cleanupCompleted = true;
            
            // Existing cleanup logic
            if (this.wire) {
                console.log('Closing I2C bus...');
                this.wire.closeSync();
            }
            
            // Driver cleanup with retries
            Object.values(this.drivers).forEach(driver => {
                console.log(`Closing driver at ${driver.address}...`);
                try {
                    if (driver && typeof driver.close === 'function') {
                        // Add retry logic for driver close
                        const maxAttempts = 3;
                        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                            try {
                                driver.close();
                                break;
                            } catch (err) {
                                if (attempt === maxAttempts) throw err;
                                console.log(`Retrying driver close (attempt ${attempt})...`);
                                sleep.msleep(100);
                            }
                        }
                    }
                } catch (err) {
                    console.error('Driver close error:', err);
                }
            });
            
            // Keep existing listener cleanup but add logging
            const currentListeners = process.listeners('exit');
            console.log(`Current exit listeners: ${currentListeners.length}`);
            
        } catch (err) {
            console.error('Error during cleanup:', err);
        } finally {
            // Ensure we always remove our listeners
            process.removeListener('exit', this.exitHandler);
            process.removeListener('SIGINT', this.exitHandler);
            process.removeListener('SIGTERM', this.exitHandler);
            process.removeListener('uncaughtException', this.exitHandler);
        }
    }

    /**
     * Scan i2c bus for PCA9685 devices with validation
     * @param {number} busNumber - I2C bus number (default: 1)
     * @returns {Promise<string[]>} Array of verified device addresses in hex format
     */
    async discoverDevices(busNumber = 1) {
        console.log(`Attempting to discover devices on i2c bus ${busNumber}`);
        const discoveredAddresses = [];
        const initialExitListeners = process.listeners('exit').length;

        try {
            for (let addr = PCA9685_BASE_ADDRESS; addr <= PCA9685_MAX_ADDRESS; addr++) {
                // Skip the known false positive at 0x70
                if (addr === 0x70) continue;
                
                let wire = null;
                try {
                    wire = new Wire(addr, {device: `/dev/i2c-${busNumber}`});
                    
                    // Read MODE1 register and validate its value
                    const result = await new Promise((resolve, reject) => {
                        wire.readBytes(MODE1_REGISTER, 1, (err, buffer) => {
                            if (err) {
                                resolve(null);
                                return;
                            }
                            resolve(buffer);
                        });
                    });

                    if (result) {
                        const mode1Value = result[0];
                        // Validate MODE1 register - typical values should be 0x00, 0x11, or similar
                        // Ignore clearly invalid values that might come from non-PCA9685 devices
                        if (mode1Value <= 0x7F) {  // Valid MODE1 values are 7-bit
                            const hexAddr = `0x${addr.toString(16)}`;
                            discoveredAddresses.push(hexAddr);
                            console.log(`✓ Found PCA9685 at address ${hexAddr}, MODE1 register: 0x${mode1Value.toString(16)}`);
                        } else {
                            console.warn(`⚠️ Device at 0x${addr.toString(16)} responded but may not be PCA9685 (MODE1: 0x${mode1Value.toString(16)})`);
                        }
                    }
                } catch (err) {
                    continue;
                } finally {
                    if (wire) {
                        try {
                            wire.closeSync();
                            const currentListeners = process.listeners('exit');
                            if (currentListeners.length > initialExitListeners) {
                                currentListeners.slice(initialExitListeners).forEach(listener => {
                                    process.removeListener('exit', listener);
                                });
                            }
                        } catch (closeErr) {
                            // Ignore close errors
                        }
                    }
                }
            }

            // Additional validation step
            if (discoveredAddresses.length === 0) {
                console.warn('No PCA9685 devices found during scan');
            } else {
                console.log(`Device discovery completed. Found ${discoveredAddresses.length} devices:`, discoveredAddresses);

            }
            
            return discoveredAddresses;

        } catch (err) {
            console.error('Critical error during device discovery:', err);
            return [];
        }
    }

    /**
     * Initialize all discovered PCA9685 devices
     * @param {PCA9685Constructor} PCA9685Class - PCA9685 constructor class
     * @returns {Promise<PinMapper>}
     */
    async initializeDiscoveredDevices(PCA9685Class) {
        console.log('Starting device initialization...');
        try {
            const addresses = await this.discoverDevices();
            console.log('Discovered addresses:', addresses);
            
            if (addresses.length === 0) {
                console.warn('No PCA9685 devices found on the I2C bus');
                return this;
            }

            addresses.forEach(address => {
                console.log(`Initializing address: ${address} (${parseInt(address, 16)})`); // Debug log
                const driver = new PCA9685Class({'address': parseInt(address, 16)});
                this.addDriver(address, driver);
            });

            // Auto-generate initial pin mapping if none exists
            if (Object.keys(this.pinMapping).length === 0) {
                console.log('No pin mapping exists, generating default mapping');
                this.generateDefaultPinMapping();
            }

            return this;
        } catch (err) {
            console.error('Failed to initialize devices:', err);
            console.error('Error stack:', err.stack);
            return this;
        }
    }

    /**
     * Generate default sequential pin mapping for all discovered devices
     * @private
     */
    generateDefaultPinMapping() {
        let ledIndex = 0;
        Object.keys(this.drivers).forEach(driverAddr => {
            for (let pin = 0; pin < 16; pin++) {
                this.pinMapping[ledIndex] = {
                    driver: driverAddr,
                    pin: pin
                };
                ledIndex++;
            }
        });
        console.log('Generated default pin mapping:', this.pinMapping);
    }

    /**
     * Add a driver to the pinmapper using its i2c address as identifier
     * @param {PCA9685} instance - PCA9685 driver instance
     * @throws {Error} If address is invalid
     * @returns {PinMapper}
     */
    addDriver(address, instance) {
        
        if (address < PCA9685_BASE_ADDRESS || address > PCA9685_MAX_ADDRESS) {
            throw new Error(`Invalid PCA9685 address: ${address}. Must be between 0x40 and 0x7F`);
        }
        this.drivers[address] = instance;
        console.log(`Successfully added driver at ${address}`);
        return this;
    }

    /**
     * Get all available driver addresses
     * @returns {string[]} Array of hex addresses
     */
    getAvailableDrivers() {
        return Object.keys(this.drivers);
    }

    /**
     * Get a driver instance by its address
     * @param {string} address - Driver address (e.g., '0x40')
     * @returns {Object} Driver instance
     * @throws {Error} If driver not found
     */
    getDriver(address) {
        // Normalize address format
        const normalizedAddr = address.toLowerCase().startsWith('0x') 
            ? address.toLowerCase() 
            : `0x${address.toLowerCase()}`;
            
        const driver = this.drivers[normalizedAddr];
        if (!driver) {
            throw new Error(`Could not find PCA9685 driver by address ${address}. Did you initialize it properly?`);
        }
        return driver;
    }

    /**
     * Normalize address to hex string format
     * @param {string|number} address 
     * @returns {string}
     * @private
     */
    normalizeAddress(address) {
        return typeof address === 'number' 
            ? `0x${address.toString(16).toLowerCase()}`
            : address.toLowerCase();
    }

    /**
     * Find a driver by hex address
     * @param address {int} Hex address of driver
     * @returns {PCA9685} driver
     */
    getDriverByAddress(address) {
        
        const normalizedAddr = address.toLowerCase().startsWith('0x') 
            ? address.toLowerCase() 
            : `0x${address.toLowerCase()}`;
            
        if (normalizedAddr in this.drivers) {
            return this.drivers[normalizedAddr];
        }
        throw new Error(`Could not find PCA9685 driver by address ${normalizedAddr} from PinMapper. Did you initialize it properly? Discovered addresses: "${this.getAvailableDrivers().join(', ')}"`);
    }

    /**
     * Configure what pins get what order and update PCA9685 instances
     * @param {Array<Object>} mapping - Array of {driver, pin, step} objects
     * @returns {PinMapper}
     */
    setPinMapping(mapping) {
        if (!Array.isArray(mapping)) {
            console.error('Invalid mapping format - expected array');
            return this;
        }

        // Reset all pins
        Object.values(this.drivers).forEach(driver => {
            for (let i = 0; i < 16; i++) {
                driver.setPwm(i, 0, 0);
            }
        });

        this.pinMapping = mapping;
        // Clear the lookup cache when mapping changes
        this._lookupCache = null;

        // Initialize all mapped pins to off state
        mapping.forEach(entry => {
            try {
                const driver = this.getDriver(entry.driver);
                if (driver) {
                    driver.setPwm(entry.pin, 0, 0);
                }
            } catch (error) {
                console.warn(`Failed to initialize pin ${entry.pin} on driver ${entry.driver}:`, error);
            }
        });

        return this;
    }

    /**
     * Get a mapped pin by its step number.
     * @param {number} step - The step number in the stair sequence
     * @returns {Object} The pin mapping {driver, pin}
     */
    getMappedPin(step) {
        // Build lookup cache if it doesn't exist
        if (!this._lookupCache) {
            this._lookupCache = new Map(
                this.pinMapping.map(entry => [entry.step, entry])
            );
        }

        const mapping = this._lookupCache.get(parseInt(step));
        if (!mapping) {
            throw new Error(`Step ${step} is unknown in current pinMapping`);
        }
        return mapping;
    }

    /**
     *
     * @param pin
     * @returns {string}
     */
    unmap(pin) {
        for(let unmapped in this.pinMapping) {
            if(this.pinMapping[unmapped].pin === pin) {
                return unmapped;
            }
        }
    }

    getBrightness(pin) {
        return this.brightnesses[pin] || 0;
    }

    /**
     * Generic brightness control from web interface
     * @param {number} mappedPin - Step number to control (1-21)
     * @param {number} brightness - 0-4095, defaults to 0 if undefined/null
     * @return {this}
     */
    setBrightness(mappedPin, brightness = 0) {
        if (isNaN(brightness)) {
            // Log ONCE, only for the first error
            if (!this._firstErrorLogged) {
                this._firstErrorLogged = true;
                console.log(`First setBrightness error:`, {
                    mappedPin,
                    brightness,
                    stack: new Error().stack.split('\n')[2]  // Just the caller's line
                });
            }
            return this;
        }

        // Validate inputs
        if (isNaN(brightness) || isNaN(mappedPin)) {
            return this;
        }

        brightness = Math.min(Math.max(brightness, 0), 4095);
        if(brightness < 0) {
            throw new Error("Brightness cannot be negative");
        }
        try {
            const mapped = this.getMappedPin(mappedPin);
            this.brightnesses[mappedPin] = brightness;
            this.getDriver(mapped.driver).setPwm(mapped.pin, 0, brightness);
        } catch (error) {
            // Only log unique errors
            const errorKey = `${mappedPin}-${error.message}`;
            if (!this._reportedErrors?.has(errorKey)) {
                if (!this._reportedErrors) this._reportedErrors = new Set();
                this._reportedErrors.add(errorKey);
                console.warn(`Failed to set brightness for step ${mappedPin}:`, error.message);
            }
        }
        
        return this;
    }

    /**
     * Set all brightnesses to a specific target brightness
     * @param {int} brightness (0-4096)
     * @returns {PinMapper}
     */
    setAllBrightness(brightness) {
        // Get all unique step numbers from the pin mapping
        const steps = this.pinMapping.map(entry => entry.step);
        
        // Set brightness for each mapped step
        steps.forEach(step => {
            this.setBrightness(step, brightness);
        });
        
        return this;
    }

    /**
     * Set PWM frequency on PCA9685 driver
     * @param freq
     * @returns {PinMapper}
     */
    setPWMFrequency(freq) {
        this.driver.setPWMFrequency(freq);
        return this;
    }

    /**
     * Count how many mapped pins there are for easy iteration.
     * @returns {number}
     */
    getMappedPinCount() {
        return Object.keys(this.pinMapping).length;
    }

    getPinMappingForDriver(driver) {
        let output = {}, currentMapping = {};
        for (let pin in this.pinMapping) {
            if(this.pinMapping[pin].driver === driver) {
                currentMapping[this.pinMapping[pin].pin] = pin;
            }
        }
        for(let i=0; i<16; i++) {
            output[i] = currentMapping[i] || null;
        }
        console.log("Pin mapping for driver "+driver+":", output);
        return output;
    }

    /**
     * Test all mapped pins with a simple on/off sequence
     * @returns {PinMapper}
     */
    test() {
        try {
            // Get all steps from the mapping (these are already 1-based)
            const steps = this.pinMapping.map(entry => entry.step);
            
            if (steps.length === 0) {
                console.log('No pins mapped, skipping test');
                return this;
            }

            this.displayPinMappingSummary();
            console.log(`Pin Mapper initialized, Testing ${steps.length} leds:\nOn: `);
            
            // Test turning on using step numbers
            steps.forEach(step => {
                try {
                    process.stdout.write("+");
                    this.setBrightness(step, 1000);
                    sleeper.msleep(50);
                } catch (err) {
                    process.stdout.write("!");
                    console.warn(`Failed to set brightness for step ${step}:`, err.message);
                }
            });

            console.log('\nOff:');
            
            // Test turning off using step numbers
            steps.forEach(step => {
                try {
                    process.stdout.write("-");
                    this.setBrightness(step, 0);
                    sleeper.msleep(50);
                } catch (err) {
                    process.stdout.write("!");
                    console.warn(`Failed to turn off step ${step}:`, err.message);
                }
            });

            console.log("\nPin Mapper test completed");
            return this;
        } catch (error) {
            console.error('Error during pin mapper test:', error);
            return this;
        }
    }

    readConfig() {
        return 0;
    }

    /**
     * Save current pin mapping to persistent storage
     * @param {Function} saveCallback - Function to handle actual storage
     */
    async saveConfig(saveCallback) {
        const config = {
            pinMapping: this.pinMapping,
            discoveredDevices: this.getAvailableDrivers()
        };
        await saveCallback(config);
    }

    /**
     * Load pin mapping from persistent storage
     * @param {Function} loadCallback - Function to handle storage retrieval
     */
    async loadConfig(loadCallback) {
        const config = await loadCallback();
        if (config && config.pinMapping) {
            this.pinMapping = config.pinMapping;
        }
    }

    /**
     * Get all mapped LEDs.
     * @returns {Array} Array of LED pin numbers.
     */
    getAllLeds() {
        return Object.keys(this.pinMapping).map(pin => this.pinMapping[pin].pin);
    }

    /**
     * Display a summary of all pin mappings grouped by driver address
     * @returns {PinMapper}
     */
    displayPinMappingSummary() {
        try {
            // Create a map of driver -> pins
            const driverPinMap = {};
            
            // Group pins by driver
            Object.entries(this.pinMapping || {}).forEach(([mappedIndex, config]) => {
                // Skip if config or driver is undefined
                if (!config || !config.driver) {
                    console.warn(`Invalid mapping found for index ${mappedIndex}`);
                    return;
                }
                
                const driver = config.driver;
                if (!driverPinMap[driver]) {
                    driverPinMap[driver] = [];
                }
                
                // Only add if pin is defined
                if (config.pin !== undefined && config.pin !== null) {
                    driverPinMap[driver].push({
                        mappedIndex,
                        pin: config.pin
                    });
                }
            });

            // Display summary
            console.log('\nPin Mapping Summary:');
            Object.entries(driverPinMap).forEach(([driverName, pins]) => {
                try {
                    const driver = this.getDriver(driverName);
                    if (!driver) {
                        console.warn(`Driver ${driverName} not found`);
                        return;
                    }
                    
                    console.log(`\nDriver: ${driverName}`);
                    console.log('Pin -> Mapped Index');
                    console.log('-----------------');
                    
                    if (pins.length === 0) {
                        console.log('No pins mapped');
                        return;
                    }
                    
                    pins.sort((a, b) => a.pin - b.pin)
                        .forEach(({mappedIndex, pin}) => {
                            if (pin !== undefined && pin !== null) {
                                console.log(`${String(pin).padStart(2)} -> ${mappedIndex}`);
                            }
                        });
                } catch (driverError) {
                    console.warn(`Error processing driver ${driverName}:`, driverError.message);
                }
            });

            return this;
        } catch (error) {
            console.error('Error displaying pin mapping summary:', error);
            return this;
        }
    }

    /**
     * Get current pin mappings and driver configuration
     * @returns {Object} Discovered drivers and their pin mappings
     */
    getDriverMappings() {
        const driverData = {};
        const discoveredDrivers = this.getAvailableDrivers();
        
        discoveredDrivers.forEach(driverAddress => {
            driverData[driverAddress] = {};
            
            // Initialize all pins to null (0-15)
            for (let i = 0; i < 16; i++) {
                driverData[driverAddress][i] = null;
            }

            // Fill in configured mappings
            if (Array.isArray(this.pinMapping)) {
                this.pinMapping.forEach(mapping => {
                    if (mapping.driver === driverAddress) {
                        driverData[driverAddress][mapping.pin] = mapping.step;
                    }
                });
            }
        });

        return {
            drivers: driverData,
            discoveredAddresses: discoveredDrivers
        };
    }

    /**
     * Get mapped steps in original configuration order with full details
     * @returns {Object[]} Array of step mappings in original order
     */
    getMappedSteps() {
        return this.pinMapping.map(m => m.step).filter(Number.isInteger);
    }
}
const pinmapper = new PinMapper();
export default pinmapper;   
