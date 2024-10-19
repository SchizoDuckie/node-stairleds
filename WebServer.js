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

const __dirname = dirname(fileURLToPath(import.meta.url));
/**
 * If equals handlebars filter
 */
handlebars.registerHelper('if_eq', function (a, b, opts) {
    if (a === b) // Or === depending on your needs
        return opts.fn(this);
    else
        return opts.inverse(this);
});

handlebars.registerHelper('if_neq', function (a, b, opts) {
    if (a !== b) // Or === depending on your needs
        return opts.fn(this);
    else
        return opts.inverse(this);
});

handlebars.registerHelper("inc", function(value, options) {
    return parseInt(value) + 1;
});



let app = express();
app.use(express.static('public'));
app.engine('handlebars', expressHandlebars());
app.set('view engine', 'handlebars');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
//app.use(expressValidator());
app.use((multer()).array());


var partialsDir = __dirname + '/views/partials';
var filenames = fs.readdirSync(partialsDir);

filenames.forEach(function (filename) {
    var matches = /^([^.]+).handlebars$/.exec(filename);
    if (!matches) {
        return;
    }
    var name = matches[1];
    var template = fs.readFileSync(partialsDir + '/' + filename, 'utf8');
    return handlebars.registerPartial(name, template);
});

/**
 *
 * @param {StairledApp} application
 */
app.registerRoutes = async function(application) {
    let routepath = join(__dirname, 'routes');
    console.log('Including webserver handlers in ' + routepath + '\n----------------------');

    try {
        const files = await readdir(routepath);
        for (const file of files) {
            if (file.endsWith('.js')) {
                const filePath = join(routepath, file);
                console.log(`Loading route file: ${filePath}`); // Added logging
                try {
                    const route = await import(filePath);
                    const routeModule = route.default || route;
                    if (typeof routeModule.register === 'function') {
                        routeModule.register(application);
                    } else if (typeof routeModule === 'function' && routeModule.prototype.register) {
                        const instance = new routeModule();
                        instance.register(application);
                    } else {
                        console.log(`Warning: ${file} does not have a register function.`);
                    }
                } catch (error) {
                    console.log(`Error while registering route: ${file}`, error);
                }
            }
        }
    } catch (err) {
        console.error("Error reading routes directory:", err);
    }
}

export { app as default } ;
