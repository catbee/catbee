var catberry = require('../../index');
var handlebars = require('catberry-handlebars');
var uhr = require('catberry-uhr');

var cat = catberry.create({
  babel: {
    stage: 0
  }
});


handlebars.register(cat.locator);
cat.build();
