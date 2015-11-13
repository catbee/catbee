/**
 * Зависимости модуля
 */
var http = require('http');
var app = require('./app');

/**
 * Создает и запускает сервер
 *
 * @param {Object} instance
 * @returns {Promise}
 */
function start (instance) {
  return http.createServer(instance).listen(3000);
}

/**
 * Создаем инстанс приложения и запускаем сервер
 */
app
  .create({
    "public": "./public",
    "publicPath": "/public"
  })
  .then(start);
