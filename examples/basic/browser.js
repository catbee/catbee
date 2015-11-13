var catbee = require('../../index');
var handlebars = require('catberry-handlebars');

global.cat = catbee.create({
  logger: {

  }
});

handlebars.register(cat.locator);

/**
 * Запускаем приложение
 */
cat.startWhenReady();
