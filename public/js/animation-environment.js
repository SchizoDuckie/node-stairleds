// Proper animation timing polyfill
window.setImmediate = (fn) => setTimeout(fn, 0);
window.clearImmediate = clearTimeout;

/**
 * Browser-side preview mapper that mimics PCA9685 behavior using CSS
 */
class PreviewPinMapper {
    constructor() {
        this.pinMapping = window.pinMappingData || [];
        this.brightnessState = new Map();
        this.ledElements = new Map();
        this.hooks = new Set();
        this.initializeLedElements();
    }

    initializeLedElements() {
        document.querySelectorAll('.led-preview').forEach(led => {
            const driver = led.dataset.driver;
            const pin = led.dataset.pin;
            this.ledElements.set(`${driver}-${pin}`, led);
        });
    }

    /**
     * Add a hook to be called when LED states change
     * @param {Function} callback - Function(Map<string, number>) where key is "driver-pin"
     */
    addHook(callback) {
        this.hooks.add(callback);
    }

    /**
     * Remove a previously added hook
     * @param {Function} callback - The callback to remove
     */
    removeHook(callback) {
        this.hooks.delete(callback);
    }

    getPinMapping() {
        return this.pinMapping;
    }

    getBrightness(ledNumber) {
        const mapping = this.pinMapping.find(m => m.step === ledNumber);
        return mapping ? this.brightnessState.get(`${mapping.driver}-${mapping.pin}`) || 0 : 0;
    }

    setBrightness(step, brightness) {
        brightness = Math.min(Math.max(brightness, 0), 4095);
        // Find the mapping for this step
        const mapping = this.pinMapping.find(m => m.step === step);
        if (!mapping) return;

        // Use the existing method with driver and pin
        const key = `${mapping.driver}-${mapping.pin}`;
        this.brightnessState.set(key, brightness);
        this.updateLedDisplay(key, brightness);
        
        // Notify hooks of state change
        this.hooks.forEach(hook => hook(this.brightnessState));
    }

    // Keep the old method for compatibility
    setBrightnessForPin(driver, pin, brightness) {
        const key = `${driver}-${pin}`;
        this.brightnessState.set(key, Math.min(Math.max(brightness, 0), 4095));
        this.updateLedDisplay(key, brightness);
        this.hooks.forEach(hook => hook(this.brightnessState));
    }

    updateLedDisplay(key, brightness) {
        brightness = Math.min(Math.max(brightness, 0), 4095);
        const led = this.ledElements.get(key);
        if (!led) return;
        // Convert PWM value (0-4095) to opacity (0-1)
        let opacity = (brightness / 4095) * 100;
        opacity = Math.min(Math.max(opacity, 0), 100);
        console.log(key, brightness, opacity);
        // Simple color with opacity
        led.style.boxShadow = `-1px 4px 3px 2px rgb(255 247 0 / ${opacity}%)`;
        console.log(`0 0 10px rgba(255, 234, 131 / ${opacity})`)
        
        //led.style.backgroundColor = `rgba(255, 234, 131, ${opacity})`;
        console.log(key, brightness, led.style.backgroundColor);
        led.classList.toggle('on', brightness > 0);
    }

    setAllBrightness(brightness) {
        this.pinMapping.forEach(mapping => {
            this.setBrightness(mapping.step, brightness);
        });
    }
}

window.PreviewPinMapper = PreviewPinMapper;
