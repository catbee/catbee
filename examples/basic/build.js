var catberry = require('../../index');
var handlebars = require('catberry-handlebars');
var uhr = require('catberry-uhr');

var cat = catberry.create({});
handlebars.register(cat.locator);
cat.build();
