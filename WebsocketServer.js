import WebSocket from 'ws';
import http from 'http';

/**
 * Polyfill for older node versions
 */
if (!globalThis.performance?.now) {
  const startTime = process.hrtime();
  globalThis.performance = {
    now: function () {
      const diff = process.hrtime(startTime);
      return diff[0] * 1000 + diff[1] / 1e6; // Convert to milliseconds
    },
  };
}


class WebsocketServer {
    constructor() {
        this.wss = null;
        this.clients = new Set();
        this.handlers = new Map();
        this.isStarted = false;
    }

    /**
     * Starts the WebSocket server
     * @param {http.Server} server - The HTTP server instance to attach to
     * @returns {WebsocketServer} - Returns this instance for method chaining
     * @throws {Error} If server is already started or invalid server instance
     */
    start(server) {
        if (this.isStarted) {
            console.warn('WebSocket server is already running');
            return this;
        }

        if (!(server instanceof http.Server)) {
            throw new Error('Invalid server instance provided');
        }

        try {
            this.wss = new WebSocket.Server({ 
                server,
                clientTracking: true,
                noServer: false
            });

            this.wss.on('connection', this.handleConnection.bind(this));
            this.wss.on('error', this.handleError.bind(this));
            
            this.isStarted = true;

            console.log('⚡ WebSocket server started');

            return this;
        } catch (error) {
            eventBus.system('error', 'Failed to start WebSocket server', error);
            throw error;
        }
    }

    /**
     * Handles WebSocket server errors
     * @private
     * @param {Error} error - The error that occurred
     */
    handleError(error) {
        console.trace('WebSocket server error:', error);
    }

    handleConnection(ws) {
        this.clients.add(ws);
        ws.on('message', (msg) => this.handleMessage(msg, ws));
        ws.on('close', () => this.clients.delete(ws));
    }

    addHandler(topic, handler) {
        this.handlers.set(topic, handler);
        return this;
    }

    getWebSocketServer() {
        return this.wss;
    }

    handleMessage(msg, client) {
        const startTime = performance.now();
        const messages = msg.toString().split('\n');
        //console.log(`📥 Processing batch of ${messages.length} messages`);
        
        // Pre-allocate array with known size for better performance
        const responses = new Array();
        
        // Use for...of instead of forEach for better performance with break/continue
        for (const message of messages) {
            // Skip empty messages
            if (!message.trim()) continue;
            
            // Destructure only once, using split with limit for efficiency
            const [topic, ...args] = message.split('|');
            const handler = this.handlers.get(topic);
            
            if (handler) {
                try {
                    const response = handler(...args);
                    if (response) responses.push(response);
                } catch (error) {
                    console.error(`❌ Error handling message '${topic}':`, error);
                    responses.push(`error|${topic}|${error.message}`);
                }
            } else {
                console.warn(`⚠️ Unknown topic '${topic}'. Available: ${[...this.handlers.keys()].join(', ')}`);
            }
        }
        
        // Send all responses in a single message if there are any
        if (responses.length > 0) {
            client.send(responses.join('\n'));
            //console.log(`📤 Sent ${responses.length} responses`);
        }
        
        const duration = performance.now() - startTime;
        //console.log(`⚡ Processed batch in ${duration.toFixed(2)}ms (${(messages.length / duration * 1000).toFixed(2)} msgs/sec)`);
    }
    
    broadcast(message) {
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }

    async stop() {
        if (!this.isStarted) {
            return;
        }

        try {
            // Close all client connections
            for (const client of this.clients) {
                client.terminate();
            }
            this.clients.clear();

            // Close the server
            await this.closeServer();

            this.isStarted = false;
            this.wss = null;
            console.log('WebSocket server stopped');
        } catch (error) {
            eventBus.system('error', 'Error stopping WebSocket server:', error);
            throw error;
        }
    }

    /**
     * Closes the WebSocket server gracefully
     * @private
     * @returns {Promise<void>} Resolves when the server is closed
     * @throws {Error} If there's an error closing the server
     */
    async closeServer() {
        return new Promise((resolve, reject) => {
            this.wss.close(err => err ? reject(err) : resolve());
        });
    }
}

export default WebsocketServer;
