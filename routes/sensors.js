import server from "../WebServer.js";

/**
 * PCA9685 Handling and routes.
 * Creates a demo animation and hooks up websocket triggers to start and stop.
 */
class Sensors {

    /**
     * Hook everything up
     * @param app {StairledApp}
     */
    register (app) {

        function postParam(posted, paramname, defaultValue) {
            if(Object.keys(posted).indexOf(paramname) === -1 || posted[paramname] === '') {
                return defaultValue;
            }
            return posted[paramname];
        }

        app.webserver.get('/sensors', function (req, res) {
            res.render('sensors');
        });

        app.webserver.post("/sensors", function (req, res) {
            res.redirect('/sensors');
            console.log("Incoming POSTdata: ", req.body);
            var posted = req.body;

            console.log("New sensor config: ", posted);

            app.config.save();
        });


        /**
         * stream statistics
         */
        app.webSocketServer.addHandler('sensor1', function () {
            return JSON.stringify({
                type: 'sensor1',
                value: 0, // PIRSensor1.value,
                time: Date.now()
            });
        })
        .addHandler('sensor2', function () {
            return JSON.stringify({
                type: 'sensor2',
                value: 0, //PIRSensor2.value,
                time: Date.now()
            });
        })

        console.log("Sensors webserver routes added");
    }
}

export default  new Sensors();