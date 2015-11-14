/**
 * Сборщик серверного приложения на основе
 * <catberry> и <express>. Служит для
 * создания инстанса приложения.
 */
var catberry = require('../../index');
var express = require('express');
var handlebars = require('catberry-handlebars');
var path = require('path');

/**
 * Создание инстанса приложения
 *
 * @param {Object} config - application config
 * @returns {Promise} - express app
 */
exports.create = function create (config = {}) {
  var cat = catberry.create(config);
  var app = express();

  var staticPath = path.join(__dirname, config.public);
  var staticRoute = config.publicPath;

  handlebars.register(cat.locator);

  app.use(cat.getMiddleware());
  app.use(staticRoute, express.static(staticPath));

  return Promise.resolve(app);
};
