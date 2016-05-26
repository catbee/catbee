Catbee [![Build Status](https://travis-ci.org/catbee/catbee.svg?branch=master)](https://travis-ci.org/markuplab/catbee)
======

<img src="https://raw.githubusercontent.com/markuplab/catbee-todomvc/master/logo.png" width="100" height="100" />

#### Working Draft. Will be translated to English later. Sorry for inconvenience.

## Catbee

Catbee это фундамент для изморфных (универсальных) приложений.
Библиотека решает основные проблемы с которыми встречается разработчик при написании изоморфного приложения.

## Motivation

Создание изморфоного приложения всегда являяется нетривиальной задачей. 
Ключевые компоненты должны учитывать особенности каждого окружения.
В этой библиотеке мы постарались собрать ключевые компоненты свойственные изоморфного приложения.
Это работа с заголовками, печеньями, роутингом (History API в браузере и Middleware на сервере), редиректами.

Также Catbee предлагает унифицированную систему для работы с компонентами системы - Service Locator. 
Она позволяет вам легко манипулировать с зависимостями между внутренними частями приложения, а также расширять
приложение внешними пакетами.

Помимо всех этих приемуществ, библиотека содержит единую шину сообщений EventBus, которая содержит все события 
которые порождают компоненты.

## Getting Started

Чтобы написать приложение на Catbee вам не потребуется много сил.
Пример ниже демонстрирует код простого изоморфного приложения.

Серверная часть приложения. 
Здесь мы запускаем сервер на Express.js и перехватываем часть запросов с помощью middleware.
Catbee не отвечает за слой представления, и он может быть произвольным.
Задача библиотеки на сервере, обработать запрос и передать информацию о запросе прослойке представления, 
чтобы она смогла сформировать html строку клиенту и отправить ее.

``` javascript
// server.js
var express = require('express');
var catbee = require('catbee');
var components = require('catbee-web-components');
var document = require('./components/document');

var app = express();
var cat = catbee.create();

components.register(cat.locator, document);
cat.registerRoute({ expression: '/' });

app.use(cat.getMiddleware());

app.listen(3000);
```

Клиентская часть приложения. Она запускает приложение в браузере и отправляется прослойке представления
сигнал о том что приложение должно быть инициализированно. Далее Catbee ожидает событий от History API и уведомляет
слой представления о изменениях.

``` javascript
// browser.js
var catbee = require('catbee');
var components = require('catbee-web-components');
var document = require('./components/document');

var cat = catbee.create();

components.register(cat.locator, document);
cat.registerRoute({ expression: '/' });

cat.startWhenReady();
```

Пример изоморфного компонента которое будет использоваться как в браузере так и на клиенте.
Библиотека не пропогандирует какого-то конкретного подхода по отрисовке HTML, но некоторые из них мы официально поддерживаем.
В этом случае, используется библиотека Catbee Web Components. 
Вы можете использовать любые библиотеки для отрисовки HTML'a (React, Vue, Angular, Deku ...), с одним лишь условием,
код библиотеки должен уметь работать изоморфно.

```
// document.js
class Document {
  template (ctx) {
    return `Hello ${ctx.name}!`;
  }
  
  render () {
    return { name: 'world' }
  }
}

module.exports = {
  constructor: Document
}
```

## Installation

Установка основной библиотеки:

```
npm i catbee --save
```

[Необязательно] Установка слоя преставления:

```
npm i catbee-web-components --save
```

Вы можете выбрать любой слой представления или написать свой.

## API Reference

API библиотеки отличается от окружения в котором она используется.

### Browser

#### Instantiation

Создает оболочку приложения. Принимает первым аргументом конфигурацию приложения.

```
var config = {
  isRelease: true
};

var cat = catbee.create(config);
```

#### startWhenReady

Запускает router и вызывает стартовый запуск приложения.

#### registerRoute

Регистрирует route который должен перехватываться приложением.

```
var cat = catbee.create();

cat.registerRoute({
  expression: '/:category/?id=:id',
  args: {
    type: 'news'  
  }
})
```

### Server

#### Instantiation

Создает оболочку приложения. Принимает первым аргументом конфигурацию приложения.

```
var config = {
  isRelease: true
};

var cat = catbee.create(config);
```

#### getMiddleware

Возвращает middleware которая может быть использована как часть Express/Connect.
Перехватывает GET запросы указанные в карте роутов.

#### registerRoute

Регистрирует route который должен перехватываться приложением.

```
var cat = catbee.create();

cat.registerRoute({
  expression: '/:category/?id=:id',
  args: {
    type: 'news'  
  }
})
```

