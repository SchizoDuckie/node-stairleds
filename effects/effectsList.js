const effectsList = {
    fadeIn250: { start: 0, end: 200, duration: 250, leds: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17] },
    fadeOut250: { start: 200, end: 0, duration: 250, leds: [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17] },
    fadeInHalf500: { start: 0, end: 500, duration: 500, leds: [2,4,6,8,10,12,14,16] },
    fadeOutHalf500: { start: 500, end: 0, duration: 500, leds: [2,4,6,8,10,12,14,16] },
    fadeInOtherHalf500: { start: 0, end: 500, duration: 500, leds: [1,3,5,6,7,11,13,15,17] },
    fadeOutOtherHalf500: { start: 500, end: 0, duration: 500, leds: [1,3,5,6,7,11,13,15,17] },
    sequenceOn1000: { brightness: 2000, duration: 1000, leds: [1,2,3,4,5] },
    shiftRight5Pins1000: { direction: 'down', duration: 1000, shifts: 5, leds: [10,11,12,13,14,15] }
};

export default effectsList;
