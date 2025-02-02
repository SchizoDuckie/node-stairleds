/**
 * HTTP Server:
 * Express + Handlebars
 */
import express from 'express';
import expressHandlebars from 'express-handlebars';
import handlebars from 'handlebars';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { readdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import http from 'http';
import WebsocketServer from './WebsocketServer.js';
import { eventBus, Events } from './services/EventBus.js';
import { create } from 'express-handlebars';

const __dirname = dirname(fileURLToPath(import.meta.url));

const ROUTES_DIR = path.join(process.cwd(), 'routes');

class WebServer {
    constructor() {
        this.app = express();
        this.initializeExpress();
        this.initializeHandlebars();
        this.server = http.createServer(this.app);
        this.routesRegistered = false;
    }

    initializeExpress() {
        this.app.use(express.static('public'));
        this.app.use(bodyParser.json());
        this.app.use(bodyParser.urlencoded({ extended: true }));
        this.app.use((multer()).array());
        this.app.use((req, res, next) => {
            res.locals.serverTimeISO = new Date().toISOString();
            next();
        });
    }

    initializeHandlebars() {
        const hbs = create({
            partialsDir: path.join(__dirname, 'views', 'partials'),
            helpers: {
                eq: (a, b) => a === b,
                if_eq: (a, b, opts) => a === b ? opts.fn(this) : opts.inverse(this),
                if_neq: (a, b, opts) => a !== b ? opts.fn(this) : opts.inverse(this),
                inc: (value) => parseInt(value) + 1,
                json: (context) => JSON.stringify(context),
                includes: (array, item) => {
                    if (!array) return false;
                    return array.includes(item);
                },
                range: (start, end) => {
                    const range = [];
                    for (let i = start; i <= end; i++) {
                        range.push(i);
                    }
                    return range;
                },
                includeRaw: (partialName) => {
                    const partialPath = path.join(__dirname, 'views', 'partials', `${partialName}.handlebars`);
                    const content = fs.readFileSync(partialPath, 'utf8');
                    return new handlebars.SafeString(content);
                },
                or: (...args) => args.slice(0, -1).some(Boolean),
                and: (...args) => args.slice(0, -1).every(Boolean),
                not: (value) => !value,
                gt: (a, b) => a > b,
                gte: (a, b) => a >= b,
                lt: (a, b) => a < b,
                lte: (a, b) => a <= b,
                join: (array, separator) => {
                    if (!Array.isArray(array)) return '';
                    return array.join(separator);
                }
            }
        });

        this.app.engine('handlebars', hbs.engine);
        this.app.set('view engine', 'handlebars');

        // Register partials using express-handlebars's built-in functionality
        // The partialsDir option above handles this automatically
        console.log("🎨 Handlebars initialized with template helpers");
    }

    async registerRoutes(stairledApp) {
        if (this.routesRegistered) {
            eventBus.system('debug', 'Routes already registered');
            return;
        }

        const routepath = join(__dirname, 'routes');
        console.log('Including webserver handlers in ' + routepath);
        console.log('----------------------');

        try {
            const files = await readdir(routepath);
            for (const file of files) {
                if (file.endsWith('.js')) {
                    const filePath = join(routepath, file);
                    try {
                        const route = await import(filePath);
                        const routeModule = route.default || route;
                        
                        if (routeModule && typeof routeModule.register === 'function') {
                            console.log(`✅ Loading routes from : routes/${file}`);
                            await routeModule.register(stairledApp);
                        } else if (typeof routeModule === 'function') {
                            const instance = new routeModule();
                            if (typeof instance.register === 'function') {
                                console.log(`✅ Loading routes from : ${file}`);
                                await instance.register(stairledApp);
                            }
                        } else {
                            console.warn(`Warning: ${file} does not have a valid register function.`);
                        }
                    } catch (error) {
                        console.error(`Error while registering route: ${file}:`, error);
                    }
                }
            }
        } catch (err) {
            console.error("Error reading routes directory:", err);
        }

        this.routesRegistered = true;
    }

    getApp() {
        return this.app;
    }

    getHttpServer() {
        return this.server;
    }

    get(path, handler) {
        return this.app.get(path, handler);
    }

    post(path, handler) {
        return this.app.post(path, handler);
    }   

    use(handler) {
        return this.app.use(handler);
    }


    /**
     * Starts the HTTP server on the specified port
     * @param {number} port - The port number to listen on (defaults to 80)
     * @returns {Promise<void>}
     * @throws {Error} If the server fails to start
     */
    async start(port = 80) {
        if (!this.server) {
            throw new Error('HTTP server not initialized');
        }

        await this.server.listen(port);
        console.log(`🕸️ Webserver started at port ${port}`);
    }
}

export default WebServer;