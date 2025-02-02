import CRUD from "../db/CRUD.js";
import StairLog from "../db/entities/Stairlog.js";

class Dashboard {
    register(app) {        
        // Add root path alias that redirects to dashboard
        app.webServer.get('/', (req, res) => {
            res.redirect('/dashboard');
        });

        app.webServer.get('/dashboard', async function (req, res) {
            let downstairs = 0;
            let upstairs = 0;

            try {
                downstairs = await CRUD.FindCount(StairLog, {"sensorname": "Sensor Downstairs"}) || 0;
                upstairs = await CRUD.FindCount(StairLog, {"sensorname": "Upstairs"}) || 0;
            } catch (error) {
                console.error("Error fetching trigger counts:", error);
            }

            console.log("Down triggers:", downstairs);
            console.log("Up triggers:", upstairs);

            // TODO: Implement logic for fastest and slowest times
            // For now, we'll use placeholder values

            res.render('dashboard', {
                "downtriggers": downstairs,
                "uptriggers": upstairs,
                "fastestTime": "N/A", // Placeholder
                "slowestTime": "N/A"  // Placeholder
            });
        });
    }
    
}

export default new Dashboard();
