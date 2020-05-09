var OSCILLATOR_FREQ = 27000000;
var PWM_FREQUENCY = 52000;

/**
 * PCA9685 wrapper / mapper
 * Initializes on an i2c port and enables and addresses pins in mappable pin order 
 */
class PinMapper {
  
  constructor() {
      this.pinCount = 0;
      this.drivers = [];
      this.pinMapping = {};
      this.brightnesses = {};
    }

    /**
     * Add a driver to the pinmapper at an index. 
     * Use getDriver to retrieve
     * @param string index 
     * @param pca9685driver instance 
     */
    addDriver(index, instance) {
      this.drivers[index] = instance;
      return this;
    }

    getDriver(index) {
      return this.drivers[index];
    }

    getDriverByAddress(address) {
      for(var i in this.drivers) {
        if(this.drivers[i].address == address) {
          return this.drivers[i];
        }
      }
      return null;
    }

    /**
     * configure what pins get what order
     * 
     */
    setPinMapping(mapping) {
      this.pinMapping = mapping;
      return this;
    }

    getMappedPin(index) {
      if(typeof index === undefined || !(index in this.pinMapping)) {
        throw new Error(`Pin ${index} is unknown in current pinMapping: ${this.pinMapping}`);
      }
      return this.pinMapping[index];
    }

    unmap(pin) {
      for(var unmapped in this.pinMapping) {
        if(this.pinMapping[unmapped].pin == pin) {
          return unmapped;
        }
      }
    }
  
    getBrightness(pin) {
      return this.brightnesses[pin] || 0;
    }

    /**
     * Generic brightness control from web interface
     * @param int pin pca9685 pin to control
     * @param int brightness 0-4095
     */
    setBrightness(mappedPin, brightness)
    {
      brightness = Math.min(brightness, 4095);
      var mapped = this.getMappedPin(mappedPin);
      
      if(!(mappedPin in this.brightnesses) || this.brightnesses[mappedPin] != brightness) {
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

    setAllBrightness(brightness) {
      for(var i=0; i< Object.keys(this.pinMapping).length; i++) {
        this.setBrightness(i, brightness);
      }
      return this;
    } 
  
    setPWMFrequency(freq) {
      this.driver.setPWMFrequency(freq);
      return this;
    }

    /*
    "pinmapper": {
        "0" :  { "driver": "B", "pin": 15},
        "1" :  { "driver": "B", "pin": 14},
        "2" :  { "driver": "B", "pin": 13},
        "3" :  { "driver": "B", "pin": 12},
        "4" :  { "driver": "B", "pin": 11},
        "5" :  { "driver": "B", "pin": 10},
        "6" :  { "driver": "B", "pin": 9},
        "7" :  { "driver": "B", "pin": 8},
        "8" :  { "driver": "B", "pin": 7},
        "9" :  { "driver": "A", "pin": 0},
        "10" : { "driver": "A", "pin": 1},
        "11" : { "driver": "A", "pin": 2},
        "12" : { "driver": "A", "pin": 3},
        "13" : { "driver": "A", "pin": 4},
        "14" : { "driver": "A", "pin": 5},
        "15" : { "driver": "A", "pin": 6},
        "16" : { "driver": "A", "pin": 7},
        "17" : { "driver": "A", "pin": 8}
    }
*/

    getPinMapingForDriver(driver) {
        let output = {}, currentMapping = {};
        for (var i in this.pinMapping) {
          if(this.pinMapping[i].driver == driver) {
            currentMapping[this.pinMapping[i].pin] = i;    
          }
        }
        for(i=0; i<16; i++) {
          output[i] = currentMapping[i] || null;
        }
        console.log("Pin mapping for driver "+driver+":", output);
        return output;
    }
      
    readConfig() {
          return 0;
    }

    saveConfig() {

    }

}

export { PinMapper };