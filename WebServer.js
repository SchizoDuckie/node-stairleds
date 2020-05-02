/**
 * HTTP Server:
 * Express + Handlebars
 */
var express = require('express');
var exphbs = require('express-handlebars');
var fs = require('fs');
var handlebars = require('handlebars');
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer();

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




var app = express();
exphbs = exphbs();
app.use(express.static('public'));
app.engine('handlebars', exphbs);
app.set('view engine', 'handlebars');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(upload.array());


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


module.exports = app;