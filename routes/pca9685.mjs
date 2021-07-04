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

        app.webserver.get('/pca9685', function (req, res) {
            res.render('pca9685', {
                "pca9685_A": app.pinMapper.getPinMapingForDriver('A'),
                "pca9685_B": app.pinMapper.getPinMapingForDriver('B')
            });
        });

        app.webserver.post("/pca9685", function (req, res) {
            res.redirect('/pca9685');
            console.log("Incoming POSTdata: ", req.body);
            var posted = req.body;
            var mappings = {};
            var pin;
            var sortorder;
            Object.keys(posted.pca9685_A).map((value, index) => {
                pin = parseInt(value.split('_')[1]);
                sortorder = posted.pca9685_A[value];
                if(sortorder !== '') {
                    mappings[sortorder] = {
                        driver: 'A',
                        pin: pin
                    }
                }
            });
            Object.keys(posted.pca9685_B).map((value, index) => {
                pin = parseInt(value.split('_')[1]);
                sortorder = posted.pca9685_B[value];
                if(sortorder !== '') {
                    mappings[sortorder] = {
                        driver: 'B',
                        pin: pin
                    }
                }
            });
            console.log("New posted mappings: ", mappings);
            app.config.set('pinmapper', mappings);
            app.config.save();
        });
        console.log("PCA9685 webserver routes added");
    }
}

module.exports = new Pca9685();