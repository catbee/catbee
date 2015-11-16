'use strict';

var _get = require('babel-runtime/helpers/get')['default'];

var _inherits = require('babel-runtime/helpers/inherits')['default'];

var _createClass = require('babel-runtime/helpers/create-class')['default'];

var _classCallCheck = require('babel-runtime/helpers/class-call-check')['default'];

var _Object$create = require('babel-runtime/core-js/object/create')['default'];

var _Promise = require('babel-runtime/core-js/promise')['default'];

var _Object$keys = require('babel-runtime/core-js/object/keys')['default'];

var _Object$defineProperties = require('babel-runtime/core-js/object/define-properties')['default'];

var _Object$freeze = require('babel-runtime/core-js/object/freeze')['default'];

var _Object$seal = require('babel-runtime/core-js/object/seal')['default'];

var util = require('util');
var morphdom = require('morphdom');
var errorHelper = require('../lib/helpers/errorHelper');
var moduleHelper = require('../lib/helpers/moduleHelper');
var hrTimeHelper = require('../lib/helpers/hrTimeHelper');
var DocumentRendererBase = require('../lib/base/DocumentRendererBase');
var State = require('../lib/State');

var WARN_ID_NOT_SPECIFIED = 'Component "%s" does not have an ID, skipping...';
var WARN_SAME_ID = 'The duplicated ID "%s" has been found, skipping component "%s"...';
var ERROR_CREATE_WRONG_ARGUMENTS = 'Tag name should be a string and attributes should be an object';
var ERROR_CREATE_WRONG_NAME = 'Component for tag "%s" not found';
var ERROR_CREATE_WRONG_ID = 'The ID is not specified or already used';

var SPECIAL_IDS = {
  $$head: '$$head',
  $$document: '$$document'
};

var TAG_NAMES = {
  TITLE: 'TITLE',
  HTML: 'HTML',
  HEAD: 'HEAD',
  BASE: 'BASE',
  STYLE: 'STYLE',
  SCRIPT: 'SCRIPT',
  NOSCRIPT: 'NOSCRIPT',
  META: 'META',
  LINK: 'LINK'
};

var NODE_TYPES = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8
};

// http://www.w3.org/TR/2015/WD-uievents-20150319/#event-types-list
var NON_BUBBLING_EVENTS = {
  abort: true,
  blur: true,
  error: true,
  focus: true,
  load: true,
  mouseenter: true,
  mouseleave: true,
  resize: true,
  unload: true
};

var DocumentRenderer = (function (_DocumentRendererBase) {
  _inherits(DocumentRenderer, _DocumentRendererBase);

  /**
   * Creates new instance of the document renderer.
   * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
   * @constructor
   * @extends DocumentRendererBase
   */

  function DocumentRenderer($serviceLocator) {
    var _this = this;

    _classCallCheck(this, DocumentRenderer);

    _get(Object.getPrototypeOf(DocumentRenderer.prototype), 'constructor', this).call(this, $serviceLocator);

    this._state = null;
    this._config = null;
    this._logger = null;
    this._componentInstances = null;
    this._componentElements = null;
    this._componentBindings = null;
    this._currentRoutingContext = null;
    this._currentUrlState = null;
    this._currentChangedWatchers = null;
    this._currentWatchersSet = null;
    this._renderedPromise = null;
    this._isUpdating = false;
    this._awaitingRouting = null;
    this._componentInstances = _Object$create(null);
    this._componentElements = _Object$create(null);
    this._componentBindings = _Object$create(null);
    this._currentChangedWatchers = _Object$create(null);
    this._currentWatchersSet = _Object$create(null);

    this._window = $serviceLocator.resolve('window');
    this._logger = $serviceLocator.resolve('logger');
    this._config = $serviceLocator.resolve('config');

    this._eventBus.on('watcherChanged', function (watcherName) {
      _this._currentChangedWatchers[watcherName] = true;
      _this._updateWatchedComponents();
    });
  }

  /**
   * Converts NamedNodeMap of Attr items to key-value object map.
   * @param {NamedNodeMap} attributes List of Element attributes.
   * @returns {Object} Map of attribute values by names.
   */

  /**
   * State reference
   * @type {State}
   * @private
   */

  _createClass(DocumentRenderer, [{
    key: 'initWithState',

    /**
     * Sets the initial state of the application.
     * @param {Object} urlState New state of application.
     * @param {Object} routingContext Routing context.
     * @returns {Promise} Promise for nothing.
     */
    value: function initWithState(urlState, routingContext) {
      var _this2 = this;

      return this._getPromiseForReadyState().then(function () {
        _this2._currentRoutingContext = routingContext;
        _this2._currentUrlState = urlState;
      }).then(function () {
        _this2._state = _this2._serviceLocator.resolveInstance(State);
        return _this2._state.runSignal(urlState.signal, urlState.args);
      }).then(function () {
        var components = _this2._componentLoader.getComponentsByNames();
        var elements = _this2._findComponents(_this2._window.document.body, components, true);

        elements.unshift(_this2._window.document.head);
        elements.unshift(_this2._window.document.documentElement);

        return _this2._initialWrap(components, elements);
      });
    }

    /**
     * Update state by new url location.
     * @param {Object} urlState
     * @param {Object} routingContext
     * @returns {Promise} Promise for nothing.
     */
  }, {
    key: 'updateState',
    value: function updateState(urlState, routingContext) {
      var _this3 = this;

      return this._getPromiseForReadyState().then(function () {
        _this3._currentRoutingContext = routingContext;
        _this3._currentUrlState = urlState;
      }).then(function () {
        return _this3._state.runSignal(urlState.signal, urlState.args);
      })['catch'](function (reason) {
        return _this3._eventBus.emit('error', reason);
      });
    }

    /**
     * Renders component into HTML element.
     * @param {Element} element HTML element of component
     * @param {Object?} renderingContext Rendering context for group rendering.
     */
  }, {
    key: 'renderComponent',
    value: function renderComponent(element, renderingContext) {
      var _this4 = this;

      return this._getPromiseForReadyState().then(function () {
        var componentName = moduleHelper.getOriginalComponentName(element.tagName);

        var id = _this4._getId(element);
        if (!id) {
          _this4._logger.warn(util.format(WARN_ID_NOT_SPECIFIED, componentName));
          return;
        }

        if (!renderingContext) {
          renderingContext = _this4._createRenderingContext([]);
          renderingContext.rootIds[id] = true;
        }

        var hadChildren = element.hasChildNodes();
        var component = renderingContext.components[componentName];
        var instance = _this4._componentInstances[id];

        if (!component) {
          return;
        }

        if (id in renderingContext.renderedIds) {
          _this4._logger.warn(util.format(WARN_SAME_ID, id, componentName));
          return;
        }

        renderingContext.renderedIds[id] = true;

        if (!instance) {
          component.constructor.prototype.$context = _this4._getComponentContext(component, element);
          instance = _this4._serviceLocator.resolveInstance(component.constructor, renderingContext.config);
          instance.$context = component.constructor.prototype.$context;
          _this4._componentInstances[id] = instance;
        }

        var eventArgs = {
          name: componentName,
          context: instance.$context
        };

        _this4._componentElements[id] = element;

        var startTime = hrTimeHelper.get();
        _this4._eventBus.emit('componentRender', eventArgs);

        return _Promise.resolve().then(function () {
          // we need unbind the whole hierarchy only at
          // the beginning and not for new elements
          if (!(id in renderingContext.rootIds) || !hadChildren) {
            return;
          }

          return _this4._unbindAll(element, renderingContext);
        })['catch'](function (reason) {
          return _this4._eventBus.emit('error', reason);
        }).then(function () {
          if (instance.$context.element !== element) {
            instance.$context = _this4._getComponentContext(component, element);
          }
          var renderMethod = moduleHelper.getMethodToInvoke(instance, 'render');
          return moduleHelper.getSafePromise(renderMethod);
        }).then(function (dataContext) {
          return component.template.render(dataContext);
        })['catch'](function (reason) {
          return _this4._handleRenderError(element, component, reason);
        }).then(function (html) {
          var isHead = element.tagName === TAG_NAMES.HEAD;
          if (html === '' && isHead) {
            return;
          }
          var tmpElement = _this4._createTemporaryElement(element);
          tmpElement.innerHTML = html;

          if (isHead) {
            _this4._mergeHead(element, tmpElement);
            return;
          }

          morphdom(element, tmpElement, {
            onBeforeMorphElChildren: function onBeforeMorphElChildren(foundElement) {
              return foundElement === element || !_this4._isComponent(renderingContext.components, foundElement);
            }
          });

          var promises = _this4._findComponents(element, renderingContext.components, false).map(function (innerComponent) {
            return _this4.renderComponent(innerComponent, renderingContext);
          });

          return _Promise.all(promises);
        }).then(function () {
          eventArgs.hrTime = hrTimeHelper.get(startTime);
          eventArgs.time = hrTimeHelper.toMilliseconds(eventArgs.hrTime);
          _this4._eventBus.emit('componentRendered', eventArgs);
          return _this4._bindComponent(element).then(function () {
            var context = instance.$context;

            if (!context.watcher) {
              return _Promise.resolve();
            }

            return _this4._bindWatcher(id, context.watcher);
          });
        }).then(function () {
          // collecting garbage only when
          // the entire rendering is finished
          if (!(id in renderingContext.rootIds) || !hadChildren) {
            return;
          }
          _this4._collectRenderingGarbage(renderingContext);
        })['catch'](function (reason) {
          return _this4._eventBus.emit('error', reason);
        });
      });
    }

    /**
     * Gets component instance by ID.
     * @param {string} id Component ID.
     * @returns {Object|null} Component instance.
     */
  }, {
    key: 'getComponentById',
    value: function getComponentById(id) {
      return this._componentInstances[id] || null;
    }

    /**
     * Gets component instance by a DOM element.
     * @param {Element} element Component's Element.
     * @returns {Object|null} Component instance.
     */
  }, {
    key: 'getComponentByElement',
    value: function getComponentByElement(element) {
      if (!element) {
        return null;
      }
      var id = element.getAttribute(moduleHelper.ATTRIBUTE_ID);
      return this.getComponentById(id);
    }

    /**
     * Checks that every instance of component has element on the page and
     * removes all references to components removed from DOM.
     * @returns {Promise} Promise for nothing.
     */
  }, {
    key: 'collectGarbage',
    value: function collectGarbage() {
      var _this5 = this;

      return this._getPromiseForReadyState().then(function () {
        var promises = [];
        _Object$keys(_this5._componentElements).forEach(function (id) {
          if (SPECIAL_IDS.hasOwnProperty(id)) {
            return;
          }
          var element = _this5._window.document.getElementById(id);
          if (element) {
            return;
          }

          var promise = _this5._unbindComponent(_this5._componentElements[id]).then(function () {
            return _this5._removeComponent(id);
          });
          promises.push(promise);
        });
        return _Promise.all(promises);
      });
    }

    /**
     * Creates and renders component element.
     * @param {string} tagName Name of HTML tag.
     * @param {Object} attributes Element attributes.
     * @returns {Promise<Element>} Promise for HTML element with rendered component.
     */
  }, {
    key: 'createComponent',
    value: function createComponent(tagName, attributes) {
      var _this6 = this;

      if (typeof tagName !== 'string' || !attributes || typeof attributes !== 'object') {
        return _Promise.reject(new Error(ERROR_CREATE_WRONG_ARGUMENTS));
      }

      return this._getPromiseForReadyState().then(function () {
        var components = _this6._componentLoader.getComponentsByNames();
        var componentName = moduleHelper.getOriginalComponentName(tagName);

        if (moduleHelper.isHeadComponent(componentName) || moduleHelper.isDocumentComponent(componentName) || !(componentName in components)) {
          return _Promise.reject(new Error(util.format(ERROR_CREATE_WRONG_NAME, tagName)));
        }

        var safeTagName = moduleHelper.getTagNameForComponentName(componentName);

        var id = attributes[moduleHelper.ATTRIBUTE_ID];
        if (!id || id in _this6._componentInstances) {
          return _Promise.reject(new Error(ERROR_CREATE_WRONG_ID));
        }

        var element = _this6._window.document.createElement(safeTagName);
        _Object$keys(attributes).forEach(function (attributeName) {
          return element.setAttribute(attributeName, attributes[attributeName]);
        });

        return _this6.renderComponent(element).then(function () {
          return element;
        });
      });
    }

    /**
     * Clears all references to removed components during rendering process.
     * @param {Object} renderingContext Context of rendering.
     * @private
     */
  }, {
    key: '_collectRenderingGarbage',
    value: function _collectRenderingGarbage(renderingContext) {
      var _this7 = this;

      _Object$keys(renderingContext.unboundIds).forEach(function (id) {
        // this component has been rendered again and we do not need to
        // remove it.
        if (id in renderingContext.renderedIds) {
          return;
        }

        // if someone added an element with the same ID during the
        // rendering process
        if (_this7._window.document.getElementById(id) !== null) {
          return;
        }

        _this7._removeComponent(id);
      });
    }

    /**
     * Unbinds all event handlers from specified component and all it's descendants.
     * @param {Element} element Component HTML element.
     * @param {Object} renderingContext Context of rendering.
     * @returns {Promise} Promise for nothing.
     * @private
     */
  }, {
    key: '_unbindAll',
    value: function _unbindAll(element, renderingContext) {
      var _this8 = this;

      var rootId = this._getId(element);
      var promises = [];

      this._findComponents(element, renderingContext.components, true).forEach(function (innerElement) {
        var id = _this8._getId(innerElement);
        renderingContext.unboundIds[id] = true;
        promises.push(_this8._unbindComponent(innerElement));
      });

      renderingContext.unboundIds[rootId] = true;
      promises.push(this._unbindComponent(element));

      return _Promise.all(promises);
    }

    /**
     * Unbinds all event handlers from specified component.
     * @param {Element} element Component HTML element.
     * @returns {Promise} Promise for nothing.
     * @private
     */
  }, {
    key: '_unbindComponent',
    value: function _unbindComponent(element) {
      var _this9 = this;

      var id = this._getId(element);
      var instance = this._componentInstances[id];

      if (!instance) {
        return _Promise.resolve();
      }
      if (id in this._componentBindings) {
        _Object$keys(this._componentBindings[id]).forEach(function (eventName) {
          element.removeEventListener(eventName, _this9._componentBindings[id][eventName].handler, NON_BUBBLING_EVENTS.hasOwnProperty(eventName));
        });
        delete this._componentBindings[id];
      }
      var unbindMethod = moduleHelper.getMethodToInvoke(instance, 'unbind');
      return moduleHelper.getSafePromise(unbindMethod).then(function () {
        _this9._unbindWatcher(id);
        _this9._eventBus.emit('componentUnbound', {
          element: element,
          id: !SPECIAL_IDS.hasOwnProperty(id) ? id : null
        });
      })['catch'](function (reason) {
        return _this9._eventBus.emit('error', reason);
      });
    }

    /**
     * Removes component from the list.
     * @param {string} id Component's ID
     * @private
     */
  }, {
    key: '_removeComponent',
    value: function _removeComponent(id) {
      delete this._componentElements[id];
      delete this._componentInstances[id];
      delete this._componentBindings[id];
    }

    /**
     * Binds all required event handlers to component.
     * @param {Element} element Component HTML element.
     * @returns {Promise} Promise for nothing.
     * @private
     */
  }, {
    key: '_bindComponent',
    value: function _bindComponent(element) {
      var _this10 = this;

      var id = this._getId(element);
      var instance = this._componentInstances[id];

      if (!instance) {
        return _Promise.resolve();
      }

      var bindMethod = moduleHelper.getMethodToInvoke(instance, 'bind');

      return moduleHelper.getSafePromise(bindMethod).then(function (bindings) {
        if (!bindings || typeof bindings !== 'object') {
          _this10._eventBus.emit('componentBound', {
            element: element,
            id: !SPECIAL_IDS.hasOwnProperty(id) ? id : null
          });
          return;
        }

        _this10._componentBindings[id] = _Object$create(null);

        _Object$keys(bindings).forEach(function (eventName) {
          eventName = eventName.toLowerCase();

          if (eventName in _this10._componentBindings[id]) {
            return;
          }

          var selectorHandlers = _Object$create(null);

          _Object$keys(bindings[eventName]).forEach(function (selector) {
            var handler = bindings[eventName][selector];

            if (typeof handler !== 'function') {
              return;
            }

            selectorHandlers[selector] = handler.bind(instance);
          });

          _this10._componentBindings[id][eventName] = {
            handler: _this10._createBindingHandler(element, selectorHandlers),
            selectorHandlers: selectorHandlers
          };

          element.addEventListener(eventName, _this10._componentBindings[id][eventName].handler, NON_BUBBLING_EVENTS.hasOwnProperty(eventName));
        });

        _this10._eventBus.emit('componentBound', { element: element, id: id });
      });
    }

    /**
     * Creates universal event handler for delegated events.
     * @param {Element} componentRoot Root element of component.
     * @param {Object} selectorHandlers Map of event handlers by CSS selectors.
     * @returns {Function} Universal event handler for delegated events.
     * @private
     */
  }, {
    key: '_createBindingHandler',
    value: function _createBindingHandler(componentRoot, selectorHandlers) {
      var selectors = _Object$keys(selectorHandlers);
      return function (event) {
        var dispatchedEvent = createCustomEvent(event, function () {
          return element;
        }),
            element = event.target,
            targetMatches = getMatchesMethod(element),
            isHandled = selectors.some(function (selector) {
          if (targetMatches(selector)) {
            selectorHandlers[selector](dispatchedEvent);
            return true;
          }
          return false;
        });
        if (isHandled || !event.bubbles) {
          return;
        }

        while (element.parentElement && element !== componentRoot) {
          element = element.parentElement;
          targetMatches = getMatchesMethod(element);
          for (var i = 0; i < selectors.length; i++) {
            if (!targetMatches(selectors[i])) {
              continue;
            }
            isHandled = true;
            selectorHandlers[selectors[i]](dispatchedEvent);
            break;
          }

          if (isHandled) {
            break;
          }
        }
      };
    }

    /**
     * Checks if the element is a component.
     * @param {Object} components Current components.
     * @param {Element} element DOM element.
     * @private
     */
  }, {
    key: '_isComponent',
    value: function _isComponent(components, element) {
      var currentNodeName = element.nodeName;
      return moduleHelper.COMPONENT_PREFIX_REGEXP.test(currentNodeName) && moduleHelper.getOriginalComponentName(currentNodeName) in components;
    }

    /**
     * Finds all descendant components of specified component element.
     * @param {Element} element Root component HTML element to begin search with.
     * @param {Object} components Map of components by names.
     * @param {boolean} goInComponents Go inside nested components.
     * @private
     */
  }, {
    key: '_findComponents',
    value: function _findComponents(element, components, goInComponents) {
      var elements = [];
      var queue = [element];
      var currentChildren, i;

      while (queue.length > 0) {
        currentChildren = queue.shift().childNodes;
        for (i = 0; i < currentChildren.length; i++) {
          // we need only Element nodes
          if (currentChildren[i].nodeType !== 1) {
            continue;
          }

          // and they should be components
          if (!this._isComponent(components, currentChildren[i])) {
            queue.push(currentChildren[i]);
            continue;
          }

          if (goInComponents) {
            queue.push(currentChildren[i]);
          }
          elements.push(currentChildren[i]);
        }
      }

      return elements;
    }

    /**
     * Handles error while rendering.
     * @param {Element} element Component HTML element.
     * @param {Object} component Component instance.
     * @param {Error} error Error to handle.
     * @returns {Promise<string>} Promise for HTML string.
     * @private
     */
  }, {
    key: '_handleRenderError',
    value: function _handleRenderError(element, component, error) {
      this._eventBus.emit('error', error);

      // do not corrupt existed HEAD when error occurs
      if (element.tagName === TAG_NAMES.HEAD) {
        return _Promise.resolve('');
      }

      if (!this._config.isRelease && error instanceof Error) {
        return _Promise.resolve(errorHelper.prettyPrint(error, this._window.navigator.userAgent));
      } else if (component.errorTemplate) {
        return component.errorTemplate.render(error);
      }

      return _Promise.resolve('');
    }

    /**
     * Updates all components that depend on current set of changed watchers.
     * @returns {Promise} Promise for nothing.
     * @private
     */
  }, {
    key: '_updateWatchedComponents',
    value: function _updateWatchedComponents() {
      var _this11 = this;

      if (this._isUpdating) {
        return _Promise.resolve();
      }

      this._isUpdating = true;

      var changedWatchers = _Object$keys(this._currentChangedWatchers);
      if (changedWatchers.length === 0) {
        this._isUpdating = false;
        return _Promise.resolve();
      }

      this._currentChangedWatchers = _Object$create(null);
      var renderingContext = this._createRenderingContext(changedWatchers);

      var promises = renderingContext.roots.map(function (root) {
        var id = _this11._getId(root);
        renderingContext.rootIds[id] = true;
        _this11.renderComponent(root, renderingContext);
      });

      return _Promise.all(promises)['catch'](function (reason) {
        return _this11._eventBus.emit('error', reason);
      }).then(function () {
        _this11._isUpdating = false;
        _this11._eventBus.emit('documentUpdated', changedWatchers);
        return _this11._updateWatchedComponents();
      });
    }

    /**
     * Merges new and existed head elements and change only difference.
     * @param {Element} head HEAD DOM element.
     * @param {Element} newHead New head element.
     * @private
     */
  }, {
    key: '_mergeHead',
    value: function _mergeHead(head, newHead) {
      if (!newHead) {
        return;
      }

      var map = this._getHeadMap(head.childNodes);
      var sameMetaElements = _Object$create(null);
      var current, i, key, oldKey, oldItem;

      for (i = 0; i < newHead.childNodes.length; i++) {
        current = newHead.childNodes[i];

        if (!(current.nodeName in map)) {
          map[current.nodeName] = _Object$create(null);
        }

        switch (current.nodeName) {
          // these elements can be only replaced
          case TAG_NAMES.TITLE:
          case TAG_NAMES.BASE:
          case TAG_NAMES.NOSCRIPT:
            key = this._getNodeKey(current);
            oldItem = head.getElementsByTagName(current.nodeName)[0];
            if (oldItem) {
              oldKey = this._getNodeKey(oldItem);
              head.replaceChild(current, oldItem);
            } else {
              head.appendChild(current);
            }
            // when we do replace or append current is removed from newHead
            // therefore we need to decrement index
            i--;
            break;

          // these elements can not be deleted from head
          // therefore we just add new elements that differs from existed
          case TAG_NAMES.STYLE:
          case TAG_NAMES.LINK:
          case TAG_NAMES.SCRIPT:
            key = this._getNodeKey(current);
            if (!(key in map[current.nodeName])) {
              head.appendChild(current);
              i--;
            }
            break;
          // meta and other elements can be deleted
          // but we should not delete and append same elements
          default:
            key = this._getNodeKey(current);
            if (key in map[current.nodeName]) {
              sameMetaElements[key] = true;
            } else {
              head.appendChild(current);
              i--;
            }
            break;
        }
      }

      if (TAG_NAMES.META in map) {
        // remove meta tags which a not in a new head state
        _Object$keys(map[TAG_NAMES.META]).forEach(function (metaKey) {
          if (metaKey in sameMetaElements) {
            return;
          }

          head.removeChild(map[TAG_NAMES.META][metaKey]);
        });
      }
    }

    /**
     * Gets map of all HEAD's elements.
     * @param {NodeList} headChildren Head children DOM nodes.
     * @returns {Object} Map of HEAD elements.
     * @private
     */
  }, {
    key: '_getHeadMap',
    value: function _getHeadMap(headChildren) {
      // Create map of <meta>, <link>, <style> and <script> tags
      // by unique keys that contain attributes and content
      var map = _Object$create(null);
      var i, current;

      for (i = 0; i < headChildren.length; i++) {
        current = headChildren[i];
        if (!(current.nodeName in map)) {
          map[current.nodeName] = _Object$create(null);
        }
        map[current.nodeName][this._getNodeKey(current)] = current;
      }
      return map;
    }

    /**
     * Gets unique element key using element's attributes and its content.
     * @param {Node} node HTML element.
     * @returns {string} Unique key for element.
     * @private
     */
  }, {
    key: '_getNodeKey',
    value: function _getNodeKey(node) {
      var current,
          i,
          attributes = [];

      if (node.nodeType !== NODE_TYPES.ELEMENT_NODE) {
        return node.nodeValue || '';
      }

      if (node.hasAttributes()) {
        for (i = 0; i < node.attributes.length; i++) {
          current = node.attributes[i];
          attributes.push(current.name + '=' + current.value);
        }
      }

      return attributes.sort().join('|') + '>' + node.textContent;
    }

    /**
     * Does initial wrapping for every component on the page.
     * @param {Object} components Current components list.
     * @param {Array} elements Elements list.
     * @private
     */
  }, {
    key: '_initialWrap',
    value: function _initialWrap(components, elements) {
      var _this12 = this;

      var current = elements.pop();

      return _Promise.resolve().then(function () {
        var id = _this12._getId(current);

        if (!id) {
          return;
        }

        var componentName = moduleHelper.getOriginalComponentName(current.nodeName);
        if (!(componentName in components)) {
          return;
        }

        var constructor = components[componentName].constructor;
        var context = _this12._getComponentContext(components[componentName], current);
        constructor.prototype.$context = context;
        var instance = _this12._serviceLocator.resolveInstance(constructor, _this12._config);
        instance.$context = constructor.prototype.$context;

        _this12._componentElements[id] = current;
        _this12._componentInstances[id] = instance;

        _this12._eventBus.emit('componentRendered', {
          name: componentName,
          attributes: instance.$context.attributes,
          context: instance.$context
        });

        return _this12._bindComponent(current).then(function () {
          if (!context.watcher) {
            return _Promise.resolve();
          }

          return _this12._bindWatcher(id, context.watcher);
        });
      }).then(function () {
        if (elements.length > 0) {
          return _this12._initialWrap(components, elements);
        }

        _this12._eventBus.emit('documentRendered', _this12._currentRoutingContext);
      });
    }

    /**
     * Gets component context using basic context.
     * @param {Object} component Component details.
     * @param {Element} element DOM element of component.
     * @returns {Object} Component context.
     * @private
     */
  }, {
    key: '_getComponentContext',
    value: function _getComponentContext(component, element) {
      var _this13 = this;

      var componentContext = _Object$create(this._currentRoutingContext);
      var attributes = attributesToObject(element.attributes);
      var watchers = this._watcherLoader.getWatchersByNames();
      var watcherName = attributes[moduleHelper.ATTRIBUTE_WATCHER];

      _Object$defineProperties(componentContext, {
        name: {
          get: function get() {
            return component.name;
          },
          enumerable: true
        },
        attributes: {
          get: function get() {
            return attributes;
          },
          enumerable: true
        }
      });

      componentContext.element = element;
      componentContext.getComponentById = function (id) {
        return _this13.getComponentById(id);
      };
      componentContext.getComponentByElement = function (element) {
        return _this13.getComponentByElement(element);
      };
      componentContext.createComponent = function (tagName, attributes) {
        return _this13.createComponent(tagName, attributes);
      };
      componentContext.collectGarbage = function () {
        return _this13.collectGarbage();
      };
      componentContext.signal = function (name, args) {
        return _this13._state.runSignal(name, args);
      };

      if (watcherName) {
        var watcherDefinition = watchers[watcherName];

        if (typeof watcherDefinition === 'function') {
          watcherDefinition = watcherDefinition.apply(null, [attributes]);
        }

        componentContext.watcher = this._state.getWatcher(watcherDefinition);
      }

      componentContext.getWatcherData = function () {
        if (!componentContext.watcher) {
          return _Promise.resolve();
        }

        var watcherData = componentContext.watcher.get();
        return _Promise.resolve(watcherData);
      };

      return _Object$freeze(componentContext);
    }

    /**
     * Finds all rendering roots on page for all changed watchers.
     * @param {Array} changedWatcherNames List of store names which has been changed.
     * @returns {Array<Element>} HTML elements that are rendering roots.
     * @private
     */
  }, {
    key: '_findRenderingRoots',
    value: function _findRenderingRoots(changedWatcherNames) {
      var _this14 = this;

      var headWatcher = this._window.document.head.getAttribute(moduleHelper.ATTRIBUTE_WATCHER) ? '$$head' : null;
      var components = this._componentLoader.getComponentsByNames();
      var componentsElements = _Object$create(null);
      var watcherNamesSet = _Object$create(null);
      var rootsSet = _Object$create(null);
      var roots = [];

      // we should find all components and then looking for roots
      changedWatcherNames.forEach(function (watcherName) {
        watcherNamesSet[watcherName] = true;
        componentsElements[watcherName] = _this14._window.document.querySelectorAll('[' + moduleHelper.ATTRIBUTE_ID + '="' + watcherName + '"]');
      });

      if (moduleHelper.HEAD_COMPONENT_NAME in components && headWatcher in watcherNamesSet) {
        rootsSet[this._getId(this._window.document.head)] = true;
        roots.push(this._window.document.head);
      }

      changedWatcherNames.forEach(function (watcherName) {
        var current, currentId, lastRoot, lastRootId, currentWatcher, currentComponentName;

        for (var i = 0; i < componentsElements[watcherName].length; i++) {
          current = componentsElements[watcherName][i];
          currentId = componentsElements[watcherName][i].getAttribute(moduleHelper.ATTRIBUTE_ID);
          lastRoot = current;
          lastRootId = currentId;
          currentComponentName = moduleHelper.getOriginalComponentName(current.tagName);

          while (current.parentElement) {
            current = current.parentElement;
            currentId = _this14._getId(current);
            currentWatcher = current.getAttribute(moduleHelper.ATTRIBUTE_WATCHER);

            // watcher did not change state
            if (!currentWatcher || !(currentWatcher in watcherNamesSet)) {
              continue;
            }

            // is not an active component
            if (!(currentComponentName in components)) {
              continue;
            }

            lastRoot = current;
            lastRootId = currentId;
          }
          if (lastRootId in rootsSet) {
            continue;
          }
          rootsSet[lastRootId] = true;
          roots.push(lastRoot);
        }
      });

      return roots;
    }

    /**
     * Creates rendering context.
     * @param {Array?} changedWatchers Names of changed watchers.
     * @returns {{
     *   config: Object,
     *   renderedIds: {},
     *   unboundIds: {},
     *   isHeadRendered: boolean,
     *   bindMethods: Array,
     *   routingContext: Object,
     *   components: Object,
     *   roots: Array.<Element>
     * }} The context object.
     * @private
     */
  }, {
    key: '_createRenderingContext',
    value: function _createRenderingContext(changedWatchers) {
      var components = this._componentLoader.getComponentsByNames();

      return {
        config: this._config,
        renderedIds: _Object$create(null),
        unboundIds: _Object$create(null),
        isHeadRendered: false,
        bindMethods: [],
        routingContext: this._currentRoutingContext,
        components: components,
        rootIds: _Object$create(null),
        roots: changedWatchers ? this._findRenderingRoots(changedWatchers) : []
      };
    }

    /**
     * Gets ID of the element.
     * @param {Element} element HTML element of component.
     * @returns {string} ID.
     */
  }, {
    key: '_getId',
    value: function _getId(element) {
      if (element === this._window.document.documentElement) {
        return SPECIAL_IDS.$$document;
      }
      if (element === this._window.document.head) {
        return SPECIAL_IDS.$$head;
      }
      return element.getAttribute(moduleHelper.ATTRIBUTE_ID);
    }

    /**
     * Creates temporary clone of the element.
     * @param {Element} element DOM element.
     * @returns {Element} clone.
     * @private
     */
  }, {
    key: '_createTemporaryElement',
    value: function _createTemporaryElement(element) {
      var tmp = this._window.document.createElement(element.tagName),
          attributes = element.attributes;
      for (var i = 0; i < attributes.length; i++) {
        tmp.setAttribute(attributes[i].name, attributes[i].value);
      }
      return tmp;
    }

    /**
     * Bind watcher to component
     * @param {String} id
     * @param {Watcher} watcher
     * @private
     */
  }, {
    key: '_bindWatcher',
    value: function _bindWatcher(id, watcher) {
      var _this15 = this;

      return new _Promise(function (resolve) {
        // We need wait when all modifications in tree will be end
        // Because Baobab use setTimeout version of nextTick, we also must use same method
        setTimeout(function () {
          _this15._currentWatchersSet[id] = watcher;
          watcher.on('update', function () {
            return _this15._eventBus.emit('watcherChanged', id);
          });
          resolve();
        }, 0);
      });
    }

    /**
     * Unbind and release watcher
     * @param {String} id
     * @private
     */
  }, {
    key: '_unbindWatcher',
    value: function _unbindWatcher(id) {
      this._currentWatchersSet[id].off('update');
      delete this._currentChangedWatchers[id];
    }
  }]);

  return DocumentRenderer;
})(DocumentRendererBase);

function attributesToObject(attributes) {
  var result = _Object$create(null);
  for (var i = 0; i < attributes.length; i++) {
    result[attributes[i].name] = attributes[i].value;
  }
  return result;
}

/**
 * Gets cross-browser "matches" method for the element.
 * @param {Element} element HTML element.
 * @returns {Function} "matches" method.
 */
function getMatchesMethod(element) {
  var method = element.matches || element.webkitMatchesSelector || element.mozMatchesSelector || element.oMatchesSelector || element.msMatchesSelector;

  return method.bind(element);
}

/**
 * Creates imitation of original Event object but with specified currentTarget.
 * @param {Event} event Original event object.
 * @param {Function} currentTargetGetter Getter for currentTarget.
 * @returns {Event} Wrapped event.
 */
function createCustomEvent(event, currentTargetGetter) {
  var catEvent = _Object$create(event),
      keys = [],
      properties = {};
  for (var key in event) {
    keys.push(key);
  }
  keys.forEach(function (key) {
    if (typeof event[key] === 'function') {
      properties[key] = {
        get: function get() {
          return event[key].bind(event);
        }
      };
      return;
    }

    properties[key] = {
      get: function get() {
        return event[key];
      },
      set: function set(value) {
        event[key] = value;
      }
    };
  });

  properties.currentTarget = {
    get: currentTargetGetter
  };
  _Object$defineProperties(catEvent, properties);
  _Object$seal(catEvent);
  _Object$freeze(catEvent);
  return catEvent;
}

module.exports = DocumentRenderer;

/**
 * Current application config.
 * @type {Object}
 * @private
 */

/**
 * Current logger.
 * @type {Logger}
 * @private
 */

/**
 * Current set of component instances by unique keys.
 * @type {Object}
 * @private
 */

/**
 * Current set of component elements by unique keys.
 * @type {Object}
 * @private
 */

/**
 * Current set of component bindings by unique keys.
 * @type {Object}
 * @private
 */

/**
 * Current routing context.
 * @type {Object}
 * @private
 */

/**
 * Current URL state.
 * @type {Object}
 * @private
 */

/**
 * Current set of changed watchers.
 * @type {Object}
 * @private
 */

/**
 * Current set of watchers
 * @type {Object}
 * @private
 */

/**
 * Current promise for rendered page.
 * @type {Promise}
 * @private
 */

/**
 * Current state of updating components.
 * @type {boolean}
 * @private
 */

/**
 * Current awaiting routing.
 * @type {{state: Object, routingContext: Object}}
 * @private
 */