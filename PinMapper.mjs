var OSCILLATOR_FREQ = 27000000;
var PWM_FREQUENCY = 52000;

/**
 * PCA9685 wrapper / mapper
 * Initializes on an i2c port and enables and addresses pins in mappable pin order 
 */
class PinMapper {
  
  constructor() {
      this.drivers = [];
      this.pinMapping = {};
      this.brightnesses = {};
    }

    /**
     * Add a driver to the pinmapper under a name.
     * Use getDriver to retrieve under same name
     * @param name {string}
     * @param instance {PCMA9685}
     */
    addDriver(name, instance) {
      this.drivers[name] = instance;
      return this;
    }

  /**
   * Get a driver by name.
   * @param name {string} driver name
   * @trows Error when not found
   * @returns {PCMA9685}
   */
    getDriver(name) {
      if (!this.drivers[name]) {
        throw new Error("Could not find PCMA9685 driver by name "+name+" from PinMapper. Did you initialize it properly?")
     }
      return this.drivers[name];
    }

  /**
   * Find a driver by hex address
   * @param address {int} Hex address of driver
   * @returns PCMA9685
   */
    getDriverByAddress(address) {
      for (let i in this.drivers) {
        if(this.drivers[i].address == address) {
          return this.drivers[i];
        }
      }
      throw new Error("Could not find PCMA9685 driver by address "+address+" from PinMapper. Did you initialize it properly?");
    }

    /**
     * configure what pins get what order
     * @param mapping {object} array with pinmappings
     */
    setPinMapping(mapping) {
      this.pinMapping = mapping;
      return this;
    }

  /**
   * Get a mapped pin by it's index.
   * The PinMapping allows you to map a real-world pin to a specific ledin the order they appear on your stairs
   * @param index {int}
   * @returns
   */
    getMappedPin(index) {
      if(typeof index === undefined || !(index in this.pinMapping)) {
        throw new Error(`Pin ${index} is unknown in current pinMapping: ${this.pinMapping}`);
      }
      return this.pinMapping[index];
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
     * @param mappedPin {int} pin pca9685 pin to control
     * @param brightness {int} 0-4095
     * @return {this}
     */
    setBrightness(mappedPin, brightness)
    {
      brightness = Math.min(brightness, 4095);
      brightness = Math.max(brightness, 0);

      var mapped = this.getMappedPin(mappedPin);
      
      if(!(mappedPin in this.brightnesses) || this.brightnesses[mappedPin] !== brightness) {
        this.brightnesses[mappedPin] = brightness;
        try {
          this
          .getDriver(mapped.driver)
          .setPwm(mapped.pin, 0, brightness); 
        } catch (E) {
          console.error("Error setting brightness to "+brightness+" on pin "+mapped);
          throw E;
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
      for(var i=0; i< Object.keys(this.pinMapping).length; i++) {
        this.setBrightness(i, brightness);
      }
      return this;
    }

  /**
   * Set PWM frequency on PCMA9685 driver
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

    getPinMapingForDriver(driver) {
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
   *
   * @returns {PinMapper}
   */
  test() {
      let sleeper = require("sleep");
      console.log(`Pin Mapper initialized, Testing ${Object.keys(this.pinMapping).length} leds:\nOn: `);
      for(let i=0; i< Object.keys(this.pinMapping).length; i++) {
        process.stdout.write("+");
        this.setBrightness(i, 1000);
        sleeper.msleep(50);
      }
      console.log('\nOff:')
      for(let i=0; i< Object.keys(this.pinMapping).length; i++) {
        process.stdout.write("-");
        this.setBrightness(i, 0);
        sleeper.msleep(50);
      }
      console.log("\nPin Mapper tested and ready");

      return this;
    }


      
    readConfig() {
          return 0;
    }

    saveConfig() {

    }

}

export default PinMapper;
