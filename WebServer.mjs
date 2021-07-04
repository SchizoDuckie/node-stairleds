/**
 * HTTP Server:
 * Express + Handlebars
 */
import express from 'express';
import expressHandlebars from 'express-handlebars';
import fs from 'fs';
import handlebars from 'handlebars';
import bodyParser from 'body-parser';
import multer from 'multer';
import path from 'path';


const __dirname = path.dirname(process.argv[1]);
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
app.registerRoutes = function(application) {
    let walker = require('node-walker');
    let routepath = __dirname + '/routes';
    console.log('Including webserver handlers in ' + routepath + '\n----------------------');
    walker(routepath, function (err, filename, next) {
        // an error occurred somewhere along the lines
        if (err) throw err;
        // filename
        if (filename !== null) {
            let route = require(filename);
            try {
                route.register(application);
            } catch(E) {
                console.log("Error while registering route: ", filename, E);
            }
        }
        if (next)  next();
    });

}

export default app;