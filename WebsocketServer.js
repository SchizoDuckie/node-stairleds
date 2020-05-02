const WEBSOCKET_DEFAULT_PORT = 8000;

class WebsocketServer {
    constructor() {
        this.websocket = null;
        this.port = WEBSOCKET_DEFAULT_PORT;
        this.clients = [];
        this.handlers = {};
    }

    onPageRequest(req, res) {
        console.log("Page request!", req, res);
        res.writeHead(200, {'Content-Type': 'text/html'});
        res.end("No.");
    }
    
    setPort(port) {
        this.port = port;
        return this;
    }

    start() {
        console.log("Starting websocket server on "+this.port);
        const WebSocket = require('ws');
        this.websocket = new WebSocket.Server({
            port: this.port
        });
        this.websocket.on('connection', this.handleConnection.bind(this));
        return this;
    }

    handleConnection(ws) {
        this.clients.push(ws);
        ws.on('message', function(msg) {
            this.handleMessage(msg, ws);
        }.bind(this));
        ws.on('close', function(evt) {
          var x = this.clients.indexOf(ws);
          if (x > -1) {
            this.clients.splice(x, 1);
          }
        }.bind(this));
    }

    addHandler(topic, handler) {
        this.handlers[topic] = handler;
        return this;
    }

    handleMessage(msg, client) {
        //console.log("[WS incoming message] ", msg);
        var topic = msg,
            args = [];
        if(msg.indexOf('|') > -1) {
            args = msg.split('|');
            topic = args.shift();
        }
        var response = '?';
        if (topic in this.handlers) {
            response = this.handlers[topic].apply(null, args);
         //   console.log(`Sending response via ${topic} handler: ${response}.`);
        } else {
            console.log(`Unkown websocket message came in: ${topic}. Available handlers: ${Object.keys(this.handlers)}`);
        }
       
        if(response && response.length) {
            client.send(response);
        }
       
    }
}

module.exports = WebsocketServer;