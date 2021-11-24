var http = require('http');
var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

const WEBSERVER_BASE_PATH = './../web';
const WEBSERVER_PORT = 80;

class HTTPServer {

    constructor() {
        var serve = serveStatic(WEBSERVER_BASE_PATH);

        this.server = http.createServer(function(req, res) {
            var done = finalhandler(req, res);
            serve(req, res, done);
        });
    }

    start() {
        this.server.listen(WEBSERVER_PORT);
        console.log(`Webserver started on port ${WEBSERVER_PORT}`);
    }
}

module.exports = HTTPServer;
