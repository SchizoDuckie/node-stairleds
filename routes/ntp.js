import { execSync } from 'child_process';

/**
 * NTP Configuration Handler
 * @class
 */
class NTP {
    constructor() {
        this.offTimes = [];
    }

    /**
     * Register NTP routes with the application
     * @param {StairledApp} app - The main application instance
     */
    register(app) {
        // Configuration GET route
        app.webServer.get('/ntp', (req, res) => {
            res.render('ntp', {
                offTimes: app.config.get('ntp:offTimes') || []
            });
        });

        // Configuration POST route
        app.webServer.post('/ntp', (req, res) => {
            try {
                // Extract and structure form data from Bootstrap layout
                const offTimes = [];
                
                // Process each time block (now 0-based to match template)
                for (let i = 0; i < 3; i++) {  // Changed from 1-3 to 0-2
                    offTimes.push({
                        enabled: req.body[`enable${i}`] === 'on', // Matches template's @index
                        start: req.body[`start${i}`] || '00:00',
                        end: req.body[`end${i}`] || '00:00'
                    });
                }

                // Validate and sanitize input
                const validOffTimes = this.validateOffTimes(offTimes);
                
                // Save configuration
                app.config.set('ntp:offTimes', validOffTimes);
                app.config.save();
                
                res.redirect('/ntp');
            } catch (error) {
                console.error('NTP config error:', error);
                res.status(400).json({ 
                    success: false, 
                    error: error.message 
                });
            }
        });

        // Emergency shutdown route
        app.webServer.post('/ntp/emergency-off', (req, res) => {
            try {
                const now = new Date();
                const endTime = new Date(now.getTime() + (12 * 60 * 60 * 1000));
                
                // Format times as HH:mm
                const formatTime = (date) => 
                    `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

                // Preserve existing config while updating third slot
                const existingTimes = app.config.get('ntp:offTimes') || [];
                const emergencyTime = {
                    enabled: true,
                    start: formatTime(now),
                    end: formatTime(endTime)
                };

                // Maintain existing array structure while updating last entry
                const newOffTimes = [
                    ...existingTimes.slice(0, 2), // Preserve first two entries
                    emergencyTime                 // Overwrite third entry
                ].filter(t => t).slice(0, 3);     // Ensure max 3 entries

                // Validate and save using existing security checks
                const validTimes = this.validateOffTimes(newOffTimes);
                app.config.set('ntp:offTimes', validTimes);
                app.config.save();

                res.redirect('/ntp');
            } catch (error) {
                console.error('Emergency off failed:', error);
                res.status(500).redirect('/ntp');
            }
        });

        // Time synchronization route
        app.webServer.post('/ntp/sync-time', (req, res) => {
            try {
                const clientTime = new Date(req.body.clientTime);
                const serverTime = new Date();
                
                if (!this.isPlausibleTime(clientTime)) {
                    return res.status(400).json({ error: 'Invalid time format' });
                }

                const timeDelta = clientTime - serverTime;
                
                if (Math.abs(timeDelta) > 300000) {
                    console.log(`Correcting time drift: ${timeDelta}ms`);
                    execSync(`sudo date -s "@${Math.floor(clientTime.getTime()/1000)}"`);
                    return res.json({ success: true, corrected: timeDelta });
                }
                
                res.json({ success: true, drift: timeDelta });
            } catch (e) {
                console.error('Time sync failed:', e);
                res.status(500).json({ error: 'Time synchronization failed' });
            }
        });

      
    }

    /**
     * Validate off time entries
     * @private
     * @param {Array} times - Raw input times from form
     * @returns {Array} Validated and sanitized times
     */
    validateOffTimes(times) {
        if (!Array.isArray(times)) {
            throw new Error('Invalid times format');
        }

        return times
            .map(t => ({
                enabled: Boolean(t.enabled),
                start: t.start?.substring(0, 5) || '00:00',
                end: t.end?.substring(0, 5) || '00:00'
            }))
            .filter(t => {
                const [startH, startM] = t.start.split(':').map(Number);
                const [endH, endM] = t.end.split(':').map(Number);
                return startH < 24 && startM < 60 && endH < 24 && endM < 60;
            });
    }

    /**
     * Validate client-provided time sanity
     * @param {number} timestamp - Client-reported time in ms
     * @returns {boolean} True if time appears plausible
     */
    isPlausibleTime(timestamp) {
        const date = new Date(timestamp);
        // Basic sanity checks:
        return date.getFullYear() >= 2023 && 
               date.getFullYear() <= 2030 &&
               date.getMonth() >= 0 &&
               date.getMonth() <= 11;
    }
}

export default new NTP(); 