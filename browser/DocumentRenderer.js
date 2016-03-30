var util = require('util');
var morphdom = require('morphdom');
var errorHelper = require('../lib/helpers/errorHelper');
var moduleHelper = require('../lib/helpers/moduleHelper');
var hrTimeHelper = require('../lib/helpers/hrTimeHelper');
var DocumentRendererBase = require('../lib/base/DocumentRendererBase');
var State = require('../lib/State');

const WARN_ID_NOT_SPECIFIED = 'Component "%s" does not have an ID, skipping...';
const WARN_SAME_ID = 'The duplicated ID "%s" has been found, skipping component "%s"...';
const ERROR_CREATE_WRONG_ARGUMENTS = 'Tag name should be a string and attributes should be an object';
const ERROR_CREATE_WRONG_NAME = 'Component for tag "%s" not found';
const ERROR_CREATE_WRONG_ID = 'The ID is not specified or already used';

const SPECIAL_IDS = {
  $$head: '$$head',
  $$document: '$$document'
};

const TAG_NAMES = {
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

const NODE_TYPES = {
  ELEMENT_NODE: 1,
  TEXT_NODE: 3,
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8
};

// http://www.w3.org/TR/2015/WD-uievents-20150319/#event-types-list
const NON_BUBBLING_EVENTS = {
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

class DocumentRenderer extends DocumentRendererBase {
  /**
   * Creates new instance of the document renderer.
   * @param {ServiceLocator} $serviceLocator Locator to resolve dependencies.
   * @constructor
   * @extends DocumentRendererBase
   */
  constructor ($serviceLocator) {
    super($serviceLocator);

    this._componentInstances = Object.create(null);
    this._componentElements = Object.create(null);
    this._componentBindings = Object.create(null);
    this._currentChangedWatchers = Object.create(null);
    this._currentWatchersSet = Object.create(null);

    this._window = $serviceLocator.resolve('window');
    this._logger = $serviceLocator.resolve('logger');
    this._config = $serviceLocator.resolve('config');

    this._eventBus.on('watcherChanged', watcherName => {
      this._currentChangedWatchers[watcherName] = true;

      // We must wait next tick, before we run update.
      // It's allow collect all sync updates events
      Promise.resolve()
        .then(() => this._updateWatchedComponents());
    });
  }

  /**
   * State reference
   * @type {State}
   * @private
   */
  _state = null;

  /**
   * Current application config.
   * @type {Object}
   * @private
   */
  _config = null;

  /**
   * Current logger.
   * @type {Logger}
   * @private
   */
  _logger = null;

  /**
   * Current set of component instances by unique keys.
   * @type {Object}
   * @private
   */
  _componentInstances = null;

  /**
   * Current set of component elements by unique keys.
   * @type {Object}
   * @private
   */
  _componentElements = null;

  /**
   * Current set of component bindings by unique keys.
   * @type {Object}
   * @private
   */
  _componentBindings = null;

  /**
   * Current routing context.
   * @type {Object}
   * @private
   */
  _currentRoutingContext = null;

  /**
   * Current URL state.
   * @type {Object}
   * @private
   */
  _currentUrlState = null;

  /**
   * Current set of changed watchers.
   * @type {Object}
   * @private
   */
  _currentChangedWatchers = null;

  /**
   * Current set of watchers
   * @type {Object}
   * @private
   */
  _currentWatchersSet = null;

  /**
   * Current state of updating components.
   * @type {boolean}
   * @private
   */
  _isUpdating = false;

  /**
   * Sets the initial state of the application.
   * @param {Object} urlState New state of application.
   * @param {Object} routingContext Routing context.
   * @returns {Promise} Promise for nothing.
   */
  initWithState (urlState, routingContext) {
    return this._getPromiseForReadyState()
      .then(() => {
        this._currentRoutingContext = routingContext;
        this._currentUrlState = urlState;

        this._state = this._serviceLocator.resolveInstance(State);
        this._state.setRoutingContext(routingContext);
        return this._state.runSignal(urlState.signal, urlState.args);
      })
      .then(() => new Promise(resolve => setTimeout(resolve, 0))) // We need wait nextTick before all transactions end
      .then(() => {
        var components = this._componentLoader.getComponentsByNames();
        var elements = this._findComponents(this._window.document.body, components, true);

        elements.unshift(this._window.document.head);
        elements.unshift(this._window.document.documentElement);

        return this._initialWrap(components, elements);
      });
  }

  /**
   * Update state by new url location.
   * @param {Object} urlState
   * @param {Object} routingContext
   * @param {Object} options
   * @param {boolean} options.silent
   * @returns {Promise} Promise for nothing.
   */
  updateState (urlState, routingContext, options = {}) {
    return this._getPromiseForReadyState()
      .then(() => {
        this._currentRoutingContext = routingContext;
        this._currentUrlState = urlState;

        this._state.setRoutingContext(routingContext);

        if (options.silent) {
          return Promise.resolve();
        }

        return this._state.runSignal(urlState.signal, urlState.args);
      })
      .catch(reason => this._eventBus.emit('error', reason));
  }

  /**
   * Renders component into HTML element.
   * @param {Element} element HTML element of component
   * @param {Object?} renderingContext Rendering context for group rendering.
   * @returns {Promise}
   */
  renderComponent (element, renderingContext) {
    return this._getPromiseForReadyState()
      .then(() => {
        var componentName = moduleHelper.getOriginalComponentName(element.tagName);

        var id = this._getId(element);
        if (!id) {
          this._logger.warn(util.format(WARN_ID_NOT_SPECIFIED, componentName));
          return Promise.resolve();
        }

        if (!renderingContext) {
          renderingContext = this._createRenderingContext([]);
          renderingContext.rootIds[id] = true;
        }

        var hadChildren = element.hasChildNodes();
        var component = renderingContext.components[componentName];
        var instance = this._componentInstances[id];

        if (!component) {
          return Promise.resolve();
        }

        if (id in renderingContext.renderedIds) {
          this._logger.warn(util.format(WARN_SAME_ID, id, componentName));
          return Promise.resolve();
        }

        renderingContext.renderedIds[id] = true;

        if (!instance) {
          component.constructor.prototype.$context = this._getComponentContext(component, element);
          instance = this._serviceLocator.resolveInstance(component.constructor, renderingContext.config);
          instance.$context = component.constructor.prototype.$context;
          this._componentInstances[id] = instance;
        }

        var eventArgs = {
          name: componentName,
          context: instance.$context
        };

        this._componentElements[id] = element;

        var startTime = hrTimeHelper.get();
        this._eventBus.emit('componentRender', eventArgs);

        return Promise.resolve()
          .then(() => {
            // we need unbind the whole hierarchy only at
            // the beginning and not for new elements
            if (!(id in renderingContext.rootIds) || !hadChildren) {
              return Promise.resolve();
            }

            return this._unbindAll(element, renderingContext);
          })
          .catch(reason => this._eventBus.emit('error', reason))
          .then(() => {
            if (instance.$context.element !== element) {
              instance.$context = this._getComponentContext(component, element);
            }
            var renderMethod = moduleHelper.getMethodToInvoke(instance, 'render');
            return moduleHelper.getSafePromise(renderMethod);
          })
          .then(dataContext => component.template.render(dataContext))
          .catch(reason => this._handleRenderError(element, component, reason))
          .then(html => {
            var isHead = element.tagName === TAG_NAMES.HEAD;
            if (html === '' && isHead) {
              return Promise.resolve();
            }
            var tmpElement = this._createTemporaryElement(element);
            tmpElement.innerHTML = html;

            if (isHead) {
              this._mergeHead(element, tmpElement);
              return Promise.resolve();
            }

            morphdom(element, tmpElement, {
              onBeforeMorphElChildren: foundElement => {
                return foundElement === element ||
                  !this._isComponent(
                    renderingContext.components,
                    foundElement
                  );
              }
            });

            var promises = this._findComponents(element, renderingContext.components, false)
              .map(innerComponent => this.renderComponent(innerComponent, renderingContext));

            return Promise.all(promises);
          })
          .then(() => {
            eventArgs.hrTime = hrTimeHelper.get(startTime);
            eventArgs.time = hrTimeHelper.toMilliseconds(eventArgs.hrTime);
            this._eventBus.emit('componentRendered', eventArgs);
            return this._bindComponent(element)
              .then(() => {
                var context = instance.$context;

                if (!context.watcher) {
                  return Promise.resolve();
                }

                return this._bindWatcher(id, context.watcher);
              });
          })
          .then(() => {
            // collecting garbage only when
            // the entire rendering is finished
            if (!(id in renderingContext.rootIds) ||
              !hadChildren) {
              return;
            }
            this._collectRenderingGarbage(renderingContext);
          })
          .catch(reason => this._eventBus.emit('error', reason));
      });
  }

  /**
   * Gets component instance by ID.
   * @param {string} id Component ID.
   * @returns {Object|null} Component instance.
   */
  getComponentById (id) {
    return this._componentInstances[id] || null;
  }

  /**
   * Gets component instance by a DOM element.
   * @param {Element} element Component's Element.
   * @returns {Object|null} Component instance.
   */
  getComponentByElement (element) {
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
  collectGarbage () {
    return this._getPromiseForReadyState()
      .then(() => {
        var promises = [];
        Object.keys(this._componentElements)
          .forEach(id => {
            if (SPECIAL_IDS.hasOwnProperty(id)) {
              return;
            }
            var element = this._window.document.getElementById(id);
            if (element) {
              return;
            }

            var promise = this._unbindComponent(this._componentElements[id])
              .then(() => this._removeComponent(id));
            promises.push(promise);
          });
        return Promise.all(promises);
      });
  }

  /**
   * Creates and renders component element.
   * @param {string} tagName Name of HTML tag.
   * @param {Object} attributes Element attributes.
   * @returns {Promise<Element>} Promise for HTML element with rendered component.
   */
  createComponent (tagName, attributes) {
    if (typeof (tagName) !== 'string' || !attributes ||
      typeof (attributes) !== 'object') {
      return Promise.reject(
        new Error(ERROR_CREATE_WRONG_ARGUMENTS)
      );
    }

    return this._getPromiseForReadyState()
      .then(() => {
        var components = this._componentLoader.getComponentsByNames();
        var componentName = moduleHelper.getOriginalComponentName(tagName);

        if (moduleHelper.isHeadComponent(componentName) ||
          moduleHelper.isDocumentComponent(componentName) ||
          !(componentName in components)) {
          return Promise.reject(
            new Error(util.format(ERROR_CREATE_WRONG_NAME, tagName))
          );
        }

        var safeTagName = moduleHelper.getTagNameForComponentName(componentName);

        var id = attributes[moduleHelper.ATTRIBUTE_ID];
        if (!id || id in this._componentInstances) {
          return Promise.reject(new Error(ERROR_CREATE_WRONG_ID));
        }

        var element = this._window.document.createElement(safeTagName);
        Object.keys(attributes)
          .forEach(attributeName => element.setAttribute(attributeName, attributes[attributeName]));

        return this.renderComponent(element)
          .then(() => {
            return element;
          });
      });
  }

  /**
   * Clears all references to removed components during rendering process.
   * @param {Object} renderingContext Context of rendering.
   * @private
   */
  _collectRenderingGarbage (renderingContext) {
    Object.keys(renderingContext.unboundIds)
      .forEach(id => {
        // this component has been rendered again and we do not need to
        // remove it.
        if (id in renderingContext.renderedIds) {
          return;
        }

        // if someone added an element with the same ID during the
        // rendering process
        if (this._window.document.getElementById(id) !== null) {
          return;
        }

        this._removeComponent(id);
      });
  }

  /**
   * Unbinds all event handlers from specified component and all it's descendants.
   * @param {Element} element Component HTML element.
   * @param {Object} renderingContext Context of rendering.
   * @returns {Promise} Promise for nothing.
   * @private
   */
  _unbindAll (element, renderingContext) {
    var rootId = this._getId(element);
    var promises = [];

    this._findComponents(element, renderingContext.components, true)
      .forEach(innerElement => {
        var id = this._getId(innerElement);
        renderingContext.unboundIds[id] = true;
        promises.push(this._unbindComponent(innerElement));
      });

    renderingContext.unboundIds[rootId] = true;
    promises.push(this._unbindComponent(element));

    return Promise.all(promises);
  }

  /**
   * Unbinds all event handlers from specified component.
   * @param {Element} element Component HTML element.
   * @returns {Promise} Promise for nothing.
   * @private
   */
  _unbindComponent (element) {
    var id = this._getId(element);
    var instance = this._componentInstances[id];

    if (!instance) {
      return Promise.resolve();
    }
    if (id in this._componentBindings) {
      Object.keys(this._componentBindings[id])
        .forEach(eventName => {
          element.removeEventListener(
            eventName,
            this._componentBindings[id][eventName].handler,
            NON_BUBBLING_EVENTS.hasOwnProperty(eventName)
          );
        });
      delete this._componentBindings[id];
    }
    var unbindMethod = moduleHelper.getMethodToInvoke(instance, 'unbind');
    return moduleHelper.getSafePromise(unbindMethod)
      .then(() => {
        this._unbindWatcher(id);
        this._eventBus.emit('componentUnbound', {
          element: element,
          id: !SPECIAL_IDS.hasOwnProperty(id) ? id : null
        });
      })
      .catch(reason => this._eventBus.emit('error', reason));
  }

  /**
   * Removes component from the list.
   * @param {string} id Component's ID
   * @private
   */
  _removeComponent (id) {
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
  _bindComponent (element) {
    var id = this._getId(element);
    var instance = this._componentInstances[id];

    if (!instance) {
      return Promise.resolve();
    }

    var bindMethod = moduleHelper.getMethodToInvoke(instance, 'bind');

    return moduleHelper.getSafePromise(bindMethod)
      .then(bindings => {
        if (!bindings || typeof (bindings) !== 'object') {
          this._eventBus.emit('componentBound', {
            element: element,
            id: !SPECIAL_IDS.hasOwnProperty(id) ? id : null
          });
          return;
        }

        this._componentBindings[id] = Object.create(null);

        Object.keys(bindings)
          .forEach(eventName => {
            eventName = eventName.toLowerCase();

            if (eventName in this._componentBindings[id]) {
              return;
            }

            var selectorHandlers = Object.create(null);

            Object.keys(bindings[eventName])
              .forEach(selector => {
                var handler = bindings[eventName][selector];

                if (typeof (handler) !== 'function') {
                  return;
                }

                selectorHandlers[selector] = handler.bind(instance);
              });

            this._componentBindings[id][eventName] = {
              handler: this._createBindingHandler(element, selectorHandlers),
              selectorHandlers: selectorHandlers
            };

            element.addEventListener(
              eventName,
              this._componentBindings[id][eventName].handler,
              NON_BUBBLING_EVENTS.hasOwnProperty(eventName)
            );
          });

        this._eventBus.emit('componentBound', { element, id });
      });
  }

  /**
   * Creates universal event handler for delegated events.
   * @param {Element} componentRoot Root element of component.
   * @param {Object} selectorHandlers Map of event handlers by CSS selectors.
   * @returns {Function} Universal event handler for delegated events.
   * @private
   */
  _createBindingHandler (componentRoot, selectorHandlers) {
    var selectors = Object.keys(selectorHandlers);
    return (event) => {
      var element = event.target;

      if (element.disabled) {
        event.stopPropagation();
        return;
      }

      var dispatchedEvent = createCustomEvent(event, () => {
        return element;
      });
      var targetMatches = getMatchesMethod(element);
      var isHandled = selectors.some(selector => {
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
   * @returns {Boolean}
   * @private
   */
  _isComponent (components, element) {
    var currentNodeName = element.nodeName;
    return moduleHelper.COMPONENT_PREFIX_REGEXP.test(currentNodeName) &&
      (moduleHelper.getOriginalComponentName(currentNodeName) in components);
  }

  /**
   * Finds all descendant components of specified component element.
   * @param {Element} element Root component HTML element to begin search with.
   * @param {Object} components Map of components by names.
   * @param {boolean} goInComponents Go inside nested components.
   * @returns {Array}
   * @private
   */
  _findComponents (element, components, goInComponents) {
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
  _handleRenderError (element, component, error) {
    this._eventBus.emit('error', error);

    // do not corrupt existed HEAD when error occurs
    if (element.tagName === TAG_NAMES.HEAD) {
      return Promise.resolve('');
    }

    if (!this._config.isRelease && error instanceof Error) {
      return Promise.resolve(errorHelper.prettyPrint(
        error, this._window.navigator.userAgent
      ));
    } else if (component.errorTemplate) {
      return component.errorTemplate.render(error);
    }

    return Promise.resolve('');
  }

  /**
   * Updates all components that depend on current set of changed watchers.
   * @returns {Promise} Promise for nothing.
   * @private
   */
  _updateWatchedComponents () {
    if (this._isUpdating) {
      return Promise.resolve();
    }

    this._isUpdating = true;

    var changedWatchers = Object.keys(this._currentChangedWatchers);
    if (changedWatchers.length === 0) {
      this._isUpdating = false;
      return Promise.resolve();
    }

    this._currentChangedWatchers = Object.create(null);
    var renderingContext = this._createRenderingContext(changedWatchers);

    var promises = renderingContext.roots.map(root => {
      var id = this._getId(root);
      renderingContext.rootIds[id] = true;
      return this.renderComponent(root, renderingContext);
    });

    return Promise.all(promises)
      .catch(reason => this._eventBus.emit('error', reason))
      .then(() => {
        this._isUpdating = false;
        this._eventBus.emit('documentUpdated', changedWatchers);
        return this._updateWatchedComponents();
      });
  }

  /**
   * Merges new and existed head elements and change only difference.
   * @param {Element} head HEAD DOM element.
   * @param {Element} newHead New head element.
   * @private
   */
  _mergeHead (head, newHead) {
    if (!newHead) {
      return;
    }

    var map = this._getHeadMap(head.childNodes);
    var sameMetaElements = Object.create(null);

    /* eslint-disable */
    var current, i, key, oldKey, oldItem;
    /* eslint-enable */

    for (i = 0; i < newHead.childNodes.length; i++) {
      current = newHead.childNodes[i];

      if (!(current.nodeName in map)) {
        map[current.nodeName] = Object.create(null);
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
      Object.keys(map[TAG_NAMES.META])
        .forEach(metaKey => {
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
  _getHeadMap (headChildren) {
    // Create map of <meta>, <link>, <style> and <script> tags
    // by unique keys that contain attributes and content
    var map = Object.create(null);
    var i, current;

    for (i = 0; i < headChildren.length; i++) {
      current = headChildren[i];
      if (!(current.nodeName in map)) {
        map[current.nodeName] = Object.create(null);
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
  _getNodeKey (node) {
    var current, i;
    var attributes = [];

    if (node.nodeType !== NODE_TYPES.ELEMENT_NODE) {
      return node.nodeValue || '';
    }

    if (node.hasAttributes()) {
      for (i = 0; i < node.attributes.length; i++) {
        current = node.attributes[i];
        attributes.push(current.name + '=' + current.value);
      }
    }

    return attributes
        .sort()
        .join('|') + '>' + node.textContent;
  }

  /**
   * Does initial wrapping for every component on the page.
   * @param {Object} components Current components list.
   * @param {Array} elements Elements list.
   * @return {Promise}
   * @private
   */
  _initialWrap (components, elements) {
    var current = elements.pop();

    return Promise.resolve()
      .then(() => {
        var id = this._getId(current);

        if (!id) {
          return Promise.resolve();
        }

        var componentName = moduleHelper.getOriginalComponentName(current.nodeName);
        if (!(componentName in components)) {
          return Promise.resolve();
        }

        var constructor = components[componentName].constructor;
        var context = this._getComponentContext(components[componentName], current);
        constructor.prototype.$context = context;
        var instance = this._serviceLocator.resolveInstance(constructor, this._config);
        instance.$context = constructor.prototype.$context;

        this._componentElements[id] = current;
        this._componentInstances[id] = instance;

        this._eventBus.emit('componentRendered', {
          name: componentName,
          attributes: instance.$context.attributes,
          context: instance.$context
        });

        return this._bindComponent(current)
          .then(() => {
            if (!context.watcher) {
              return Promise.resolve();
            }

            return this._bindWatcher(id, context.watcher);
          });
      })
      .then(() => {
        if (elements.length > 0) {
          return this._initialWrap(components, elements);
        }

        this._eventBus.emit('documentRendered', this._currentRoutingContext);
      });
  }

  /**
   * Gets component context using basic context.
   * @param {Object} component Component details.
   * @param {Element} element DOM element of component.
   * @returns {Object} Component context.
   * @private
   */
  _getComponentContext (component, element) {
    var componentContext = Object.create(this._currentRoutingContext);
    var attributes = attributesToObject(element.attributes);
    var watchers = this._watcherLoader.getWatchersByNames();
    var watcherName = attributes[moduleHelper.ATTRIBUTE_WATCHER];

    Object.defineProperties(componentContext, {
      name: {
        get () {
          return component.name;
        },
        enumerable: true
      },
      attributes: {
        get () {
          return attributesToObject(this.element.attributes);
        },
        enumerable: true
      }
    });

    componentContext.element = element;
    componentContext.getComponentById = (id) => this.getComponentById(id);
    componentContext.getComponentByElement = (element) => this.getComponentByElement(element);
    componentContext.createComponent = (tagName, attributes) => this.createComponent(tagName, attributes);
    componentContext.collectGarbage = () => this.collectGarbage();
    componentContext.signal = (name, args) => this._state.runSignal(name, args);

    if (watcherName) {
      var watcherDefinition = watchers[watcherName];

      if (typeof watcherDefinition === 'function') {
        watcherDefinition = watcherDefinition.apply(null, [attributes]);
      }

      componentContext.watcher = this._state.getWatcher(watcherDefinition);
    }

    componentContext.getWatcherData = () => {
      if (!componentContext.watcher) {
        return Promise.resolve();
      }

      var watcherData = componentContext.watcher.get();
      return Promise.resolve(watcherData);
    };

    return Object.freeze(componentContext);
  }

  /**
   * Finds all rendering roots on page for all changed watchers.
   * @param {Array} changedWatcherNames List of store names which has been changed.
   * @returns {Array<Element>} HTML elements that are rendering roots.
   * @private
   */
  _findRenderingRoots (changedWatcherNames) {
    var headWatcher = this._window.document.head.getAttribute(moduleHelper.ATTRIBUTE_WATCHER) ? '$$head' : null;
    var components = this._componentLoader.getComponentsByNames();
    var componentsElements = Object.create(null);
    var watcherNamesSet = Object.create(null);
    var rootsSet = Object.create(null);
    var roots = [];

    // we should find all components and then looking for roots
    changedWatcherNames
      .forEach(watcherName => {
        watcherNamesSet[watcherName] = true;
        componentsElements[watcherName] = this._window.document
          .querySelectorAll(`[${moduleHelper.ATTRIBUTE_ID}="${watcherName}"]`);
      });

    if (moduleHelper.HEAD_COMPONENT_NAME in components && headWatcher in watcherNamesSet) {
      rootsSet[this._getId(this._window.document.head)] = true;
      roots.push(this._window.document.head);
    }

    changedWatcherNames
      .forEach(watcherName => {
        var current, currentId,
          lastRoot, lastRootId,
          currentWatcher, hasWatcherAttribute, currentComponentName;

        for (var i = 0; i < componentsElements[watcherName].length; i++) {
          current = componentsElements[watcherName][i];
          currentId = componentsElements[watcherName][i].getAttribute(moduleHelper.ATTRIBUTE_ID);
          lastRoot = current;
          lastRootId = currentId;
          currentComponentName = moduleHelper.getOriginalComponentName(current.tagName);

          while (current.parentElement) {
            current = current.parentElement;
            currentId = this._getId(current);
            currentWatcher = current.getAttribute(moduleHelper.ATTRIBUTE_ID);
            hasWatcherAttribute = current.getAttribute(moduleHelper.ATTRIBUTE_WATCHER);

            // watcher did not change state
            if (!hasWatcherAttribute || !(currentWatcher in watcherNamesSet)) {
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
  _createRenderingContext (changedWatchers) {
    var components = this._componentLoader.getComponentsByNames();

    return {
      config: this._config,
      renderedIds: Object.create(null),
      unboundIds: Object.create(null),
      isHeadRendered: false,
      bindMethods: [],
      routingContext: this._currentRoutingContext,
      components: components,
      rootIds: Object.create(null),
      roots: changedWatchers ? this._findRenderingRoots(changedWatchers) : []
    };
  }

  /**
   * Gets ID of the element.
   * @param {Element} element HTML element of component.
   * @returns {string} ID.
   */
  _getId (element) {
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
  _createTemporaryElement (element) {
    var tmp = this._window.document.createElement(element.tagName);
    var attributes = element.attributes;

    for (var i = 0; i < attributes.length; i++) {
      tmp.setAttribute(attributes[i].name, attributes[i].value);
    }
    return tmp;
  }

  /**
   * Bind watcher to component
   * @param {String} id
   * @param {Watcher} watcher
   * @return {Promise}
   * @private
   */
  _bindWatcher (id, watcher) {
    this._currentWatchersSet[id] = watcher;
    watcher.on('update', () => this._eventBus.emit('watcherChanged', id));
    return Promise.resolve(null);
  }

  /**
   * Unbind and release watcher
   * @param {String} id
   * @private
   */
  _unbindWatcher (id) {
    var watcher = this._currentWatchersSet[id];

    if (!watcher) {
      return;
    }

    watcher.off('update');
    delete this._currentChangedWatchers[id];
  }
}

/**
 * Converts NamedNodeMap of Attr items to key-value object map.
 * @param {NamedNodeMap} attributes List of Element attributes.
 * @returns {Object} Map of attribute values by names.
 */
function attributesToObject (attributes) {
  var result = Object.create(null);
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
function getMatchesMethod (element) {
  var method = (element.matches ||
  element.webkitMatchesSelector ||
  element.mozMatchesSelector ||
  element.oMatchesSelector ||
  element.msMatchesSelector);

  return method.bind(element);
}

/**
 * Creates imitation of original Event object but with specified currentTarget.
 * @param {Event} event Original event object.
 * @param {Function} currentTargetGetter Getter for currentTarget.
 * @returns {Event} Wrapped event.
 */
function createCustomEvent (event, currentTargetGetter) {
  var catEvent = Object.create(event);
  var keys = [];
  var properties = {};

  for (var key in event) {
    keys.push(key);
  }

  keys.forEach(key => {
    if (typeof (event[key]) === 'function') {
      properties[key] = {
        get: () => {
          return event[key].bind(event);
        }
      };
      return;
    }

    properties[key] = {
      get: () => {
        return event[key];
      },
      set: (value) => {
        event[key] = value;
      }
    };
  });

  properties.currentTarget = {
    get: currentTargetGetter
  };
  Object.defineProperties(catEvent, properties);
  Object.seal(catEvent);
  Object.freeze(catEvent);
  return catEvent;
}

module.exports = DocumentRenderer;
