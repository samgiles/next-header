(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/*jshint browser:true, node:true*/

'use strict';

module.exports = Delegate;

/**
 * DOM event delegator
 *
 * The delegator will listen
 * for events that bubble up
 * to the root node.
 *
 * @constructor
 * @param {Node|string} [root] The root node or a selector string matching the root node
 */
function Delegate(root) {

  /**
   * Maintain a map of listener
   * lists, keyed by event name.
   *
   * @type Object
   */
  this.listenerMap = [{}, {}];
  if (root) {
    this.root(root);
  }

  /** @type function() */
  this.handle = Delegate.prototype.handle.bind(this);
}

/**
 * Start listening for events
 * on the provided DOM element
 *
 * @param  {Node|string} [root] The root node or a selector string matching the root node
 * @returns {Delegate} This method is chainable
 */
Delegate.prototype.root = function(root) {
  var listenerMap = this.listenerMap;
  var eventType;

  // Remove master event listeners
  if (this.rootElement) {
    for (eventType in listenerMap[1]) {
      if (listenerMap[1].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, true);
      }
    }
    for (eventType in listenerMap[0]) {
      if (listenerMap[0].hasOwnProperty(eventType)) {
        this.rootElement.removeEventListener(eventType, this.handle, false);
      }
    }
  }

  // If no root or root is not
  // a dom node, then remove internal
  // root reference and exit here
  if (!root || !root.addEventListener) {
    if (this.rootElement) {
      delete this.rootElement;
    }
    return this;
  }

  /**
   * The root node at which
   * listeners are attached.
   *
   * @type Node
   */
  this.rootElement = root;

  // Set up master event listeners
  for (eventType in listenerMap[1]) {
    if (listenerMap[1].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, true);
    }
  }
  for (eventType in listenerMap[0]) {
    if (listenerMap[0].hasOwnProperty(eventType)) {
      this.rootElement.addEventListener(eventType, this.handle, false);
    }
  }

  return this;
};

/**
 * @param {string} eventType
 * @returns boolean
 */
Delegate.prototype.captureForType = function(eventType) {
  return ['blur', 'error', 'focus', 'load', 'resize', 'scroll'].indexOf(eventType) !== -1;
};

/**
 * Attach a handler to one
 * event for all elements
 * that match the selector,
 * now or in the future
 *
 * The handler function receives
 * three arguments: the DOM event
 * object, the node that matched
 * the selector while the event
 * was bubbling and a reference
 * to itself. Within the handler,
 * 'this' is equal to the second
 * argument.
 *
 * The node that actually received
 * the event can be accessed via
 * 'event.target'.
 *
 * @param {string} eventType Listen for these events
 * @param {string|undefined} selector Only handle events on elements matching this selector, if undefined match root element
 * @param {function()} handler Handler function - event data passed here will be in event.data
 * @param {Object} [eventData] Data to pass in event.data
 * @returns {Delegate} This method is chainable
 */
Delegate.prototype.on = function(eventType, selector, handler, useCapture) {
  var root, listenerMap, matcher, matcherParam;

  if (!eventType) {
    throw new TypeError('Invalid event type: ' + eventType);
  }

  // handler can be passed as
  // the second or third argument
  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  }

  // Fallback to sensible defaults
  // if useCapture not set
  if (useCapture === undefined) {
    useCapture = this.captureForType(eventType);
  }

  if (typeof handler !== 'function') {
    throw new TypeError('Handler must be a type of Function');
  }

  root = this.rootElement;
  listenerMap = this.listenerMap[useCapture ? 1 : 0];

  // Add master handler for type if not created yet
  if (!listenerMap[eventType]) {
    if (root) {
      root.addEventListener(eventType, this.handle, useCapture);
    }
    listenerMap[eventType] = [];
  }

  if (!selector) {
    matcherParam = null;

    // COMPLEX - matchesRoot needs to have access to
    // this.rootElement, so bind the function to this.
    matcher = matchesRoot.bind(this);

  // Compile a matcher for the given selector
  } else if (/^[a-z]+$/i.test(selector)) {
    matcherParam = selector;
    matcher = matchesTag;
  } else if (/^#[a-z0-9\-_]+$/i.test(selector)) {
    matcherParam = selector.slice(1);
    matcher = matchesId;
  } else {
    matcherParam = selector;
    matcher = matches;
  }

  // Add to the list of listeners
  listenerMap[eventType].push({
    selector: selector,
    handler: handler,
    matcher: matcher,
    matcherParam: matcherParam
  });

  return this;
};

/**
 * Remove an event handler
 * for elements that match
 * the selector, forever
 *
 * @param {string} [eventType] Remove handlers for events matching this type, considering the other parameters
 * @param {string} [selector] If this parameter is omitted, only handlers which match the other two will be removed
 * @param {function()} [handler] If this parameter is omitted, only handlers which match the previous two will be removed
 * @returns {Delegate} This method is chainable
 */
Delegate.prototype.off = function(eventType, selector, handler, useCapture) {
  var i, listener, listenerMap, listenerList, singleEventType;

  // Handler can be passed as
  // the second or third argument
  if (typeof selector === 'function') {
    useCapture = handler;
    handler = selector;
    selector = null;
  }

  // If useCapture not set, remove
  // all event listeners
  if (useCapture === undefined) {
    this.off(eventType, selector, handler, true);
    this.off(eventType, selector, handler, false);
    return this;
  }

  listenerMap = this.listenerMap[useCapture ? 1 : 0];
  if (!eventType) {
    for (singleEventType in listenerMap) {
      if (listenerMap.hasOwnProperty(singleEventType)) {
        this.off(singleEventType, selector, handler);
      }
    }

    return this;
  }

  listenerList = listenerMap[eventType];
  if (!listenerList || !listenerList.length) {
    return this;
  }

  // Remove only parameter matches
  // if specified
  for (i = listenerList.length - 1; i >= 0; i--) {
    listener = listenerList[i];

    if ((!selector || selector === listener.selector) && (!handler || handler === listener.handler)) {
      listenerList.splice(i, 1);
    }
  }

  // All listeners removed
  if (!listenerList.length) {
    delete listenerMap[eventType];

    // Remove the main handler
    if (this.rootElement) {
      this.rootElement.removeEventListener(eventType, this.handle, useCapture);
    }
  }

  return this;
};


/**
 * Handle an arbitrary event.
 *
 * @param {Event} event
 */
Delegate.prototype.handle = function(event) {
  var i, l, type = event.type, root, phase, listener, returned, listenerList = [], target, /** @const */ EVENTIGNORE = 'ftLabsDelegateIgnore';

  if (event[EVENTIGNORE] === true) {
    return;
  }

  target = event.target;

  // Hardcode value of Node.TEXT_NODE
  // as not defined in IE8
  if (target.nodeType === 3) {
    target = target.parentNode;
  }

  root = this.rootElement;

  phase = event.eventPhase || ( event.target !== event.currentTarget ? 3 : 2 );
  
  switch (phase) {
    case 1: //Event.CAPTURING_PHASE:
      listenerList = this.listenerMap[1][type];
    break;
    case 2: //Event.AT_TARGET:
      if (this.listenerMap[0] && this.listenerMap[0][type]) listenerList = listenerList.concat(this.listenerMap[0][type]);
      if (this.listenerMap[1] && this.listenerMap[1][type]) listenerList = listenerList.concat(this.listenerMap[1][type]);
    break;
    case 3: //Event.BUBBLING_PHASE:
      listenerList = this.listenerMap[0][type];
    break;
  }

  // Need to continuously check
  // that the specific list is
  // still populated in case one
  // of the callbacks actually
  // causes the list to be destroyed.
  l = listenerList.length;
  while (target && l) {
    for (i = 0; i < l; i++) {
      listener = listenerList[i];

      // Bail from this loop if
      // the length changed and
      // no more listeners are
      // defined between i and l.
      if (!listener) {
        break;
      }

      // Check for match and fire
      // the event if there's one
      //
      // TODO:MCG:20120117: Need a way
      // to check if event#stopImmediatePropagation
      // was called. If so, break both loops.
      if (listener.matcher.call(target, listener.matcherParam, target)) {
        returned = this.fire(event, target, listener);
      }

      // Stop propagation to subsequent
      // callbacks if the callback returned
      // false
      if (returned === false) {
        event[EVENTIGNORE] = true;
        event.preventDefault();
        return;
      }
    }

    // TODO:MCG:20120117: Need a way to
    // check if event#stopPropagation
    // was called. If so, break looping
    // through the DOM. Stop if the
    // delegation root has been reached
    if (target === root) {
      break;
    }

    l = listenerList.length;
    target = target.parentElement;
  }
};

/**
 * Fire a listener on a target.
 *
 * @param {Event} event
 * @param {Node} target
 * @param {Object} listener
 * @returns {boolean}
 */
Delegate.prototype.fire = function(event, target, listener) {
  return listener.handler.call(target, event, target);
};

/**
 * Check whether an element
 * matches a generic selector.
 *
 * @type function()
 * @param {string} selector A CSS selector
 */
var matches = (function(el) {
  if (!el) return;
  var p = el.prototype;
  return (p.matches || p.matchesSelector || p.webkitMatchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector);
}(Element));

/**
 * Check whether an element
 * matches a tag selector.
 *
 * Tags are NOT case-sensitive,
 * except in XML (and XML-based
 * languages such as XHTML).
 *
 * @param {string} tagName The tag name to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */
function matchesTag(tagName, element) {
  return tagName.toLowerCase() === element.tagName.toLowerCase();
}

/**
 * Check whether an element
 * matches the root.
 *
 * @param {?String} selector In this case this is always passed through as null and not used
 * @param {Element} element The element to test with
 * @returns boolean
 */
function matchesRoot(selector, element) {
  /*jshint validthis:true*/
  if (this.rootElement === window) return element === document;
  return this.rootElement === element;
}

/**
 * Check whether the ID of
 * the element in 'this'
 * matches the given ID.
 *
 * IDs are case-sensitive.
 *
 * @param {string} id The ID to test against
 * @param {Element} element The element to test with
 * @returns boolean
 */
function matchesId(id, element) {
  return id === element.id;
}

/**
 * Short hand for off()
 * and root(), ie both
 * with no parameters
 *
 * @return void
 */
Delegate.prototype.destroy = function() {
  this.off();
  this.root();
};

},{}],2:[function(require,module,exports){
module.exports = require('./src/models/User');

},{"./src/models/User":3}],3:[function(require,module,exports){

/**
 * Encapsulates an FT user
 */

var User = function (cookie) {
    this.cookie = (cookie) ? ';' + cookie : '';
}

// Returns the eRights user id
User.prototype.id = function () {
    var parts = this.cookie.split("; FT_U=");
    var ftU = parts.pop().split(";").shift();
    if(ftU) {
        return ftU.match(/_EID=(\d+)_PID/)[1];
    } else {
        return;
    }
}

User.prototype.session = function () {
    return this.cookie.match(/SKEY=(.+)_RI/)[1];
}

module.exports = User;

},{}],4:[function(require,module,exports){
// Stores a unique list of things (Eg, sections, favourites, history) against a
// key in localStorage

var reqwest = require('../vendor/reqwest.min');

var API_URL = 'http://ft-next-api-user-prefs.herokuapp.com/user/';

var emit = function(name, data) {
  var event = document.createEvent('Event');
  event.initEvent(name, true, true);
  if (data) {
    event.detail = data;
  }
  top.document.dispatchEvent(event);
};


var Me = function (key, userId) {
  if (!key) {
    throw new Error('You must supply a key /^[a-z]+$/');
  }
  this.key = key;

  this.localStorageKey = 'ft.next.user.' + key;

  if(userId) {
    this.apiURL = API_URL + key;
    this.userId = userId;
  }      
    //Start off with local copy...
    this.val = this.getOrCreate();
    //Then try and fetch server copy
    this.fetch();

  };

  Me.prototype.get = function (key) {
    key = key || this.localStorageKey;
    var exists = localStorage.getItem(key);
    if (exists) {
      return JSON.parse(exists);
    } else {
      return false;
    }
  };

  Me.prototype.getOrCreate = function (key) {
    key = key || this.localStorageKey;
    var saved = this.get(key);
    if(saved) {
      return saved;
    } else {
      var empty = [];
      localStorage.setItem(key, JSON.stringify(empty));
      return empty;
    }
  };

  Me.prototype.fetch = function() {

    var me = this;

    //If no userID don't fetch from server
    if(!this.userId) {
      return;
    }

    reqwest({
      url: this.apiURL,
      type: 'json',
      method: 'get',
      headers: {
        'X-FT-UID': this.userId
      },
      crossOrigin: true
    }).then(function(faves) {
      if(faves) {
        me.val = faves;
        //accept the server copy as 'the truth'...
        me.save(me.val);
        //but then process any leftover requests locally
        me.processPending('add');
        me.processPending('remove');
        me.processPending('clear');
      }
    }).always(function(err) {
      //trigger load and update events
      emit(me.key + ':load', me);
      emit(me.key + ':update', me);
    });  
  };

  Me.prototype.save = function (obj, key) {
    key = key || this.localStorageKey;
    if(obj && obj.length) {
      localStorage.setItem(key, JSON.stringify(obj)); 
    } else {
      localStorage.removeItem(key);
    }
  };

  Me.prototype.addPending = function(obj, action) {
    var pending = this.getOrCreate(this.localStorageKey + '.' + action);
    pending.push(obj);
    //if we're adding something, then get rid of any pending clear requests
    if(action === 'add') {
      localStorage.removeItem(this.localStorageKey + '.clear');
    }
    this.save(pending, this.localStorageKey + '.' + action);
  };

  Me.prototype.processPending = function(action) {
    var me = this;
    var pending = this.get(this.localStorageKey + '.' + action);
    if(pending && pending.length) {
      //Clear is a special case
      if(action === 'clear') {
        if(pending[pending.length - 1] === true) {
          me.clear();
          pending = null;
        }
      } else {
        pending.forEach(function(itemToAdd, index) {
           // remove the item from the todo list and execute the action 
           pending.splice(index, 1);
           me[action](itemToAdd);
         });
      }
      this.save(pending, this.localStorageKey + '.' + action);
    }

  };

  Me.prototype.add = function (obj) {
    var me = this;
    this.val = this.getOrCreate();
    if (!this.exists(obj.uuidv3)) {
      this.val.push(obj);
      this.save(this.val);
      emit(me.key + ':update', me); //trigger event to render UI

      //Send a request to add to server
      if(this.apiURL) {
        reqwest({
          url: this.apiURL,
          method: 'put',
          type: 'json',
          contentType: 'application/json',
          data: JSON.stringify(obj),
          headers: {
            'X-FT-UID': this.userId
          },
          crossOrigin: true
        }).fail(function() {
          me.addPending(obj, 'add'); //server request failed so push it to the list of pending
        });
      }
    }
  };

  Me.prototype.remove = function (obj) {
    var me = this;

    this.val = this.getOrCreate();
    this.val = this.val.filter(function(item) {
      return (item.uuidv3 !== obj.uuidv3);
    });
    this.save(this.val);

    emit(me.key + ':update', me); //trigger event to render UI

    //Send a request to delete from server
    if(this.apiURL) {

      reqwest({
        url: this.apiURL + '/' + encodeURI(decodeURI(obj.uuidv3)),
        type: 'json',
        method: 'delete',
        headers: {
          'X-FT-UID': this.userId
        },
        crossOrigin: true
      }).fail(function() {
        me.addPending(obj, 'remove');  //server request failed so push it to the list of pending
      });
    }
  };


  Me.prototype.exists = function (uuid) {
    this.val = this.getOrCreate();
    return this.val.some(function (item) {
      return item.uuidv3 === uuid;
    });
  };

  Me.prototype.clear = function () {
    var me = this;
    var status = localStorage.removeItem(this.localStorageKey);
    this.val = [];

    emit(me.key + ':update', me); //trigger event to render UI

      //Send a request to delete ALL from server
      if(this.apiURL) {

        reqwest({
          url: this.apiURL,
          type: 'json',
          method: 'delete',
          headers: {
            'X-FT-UID': this.userId
          },
          crossOrigin: true
        }).fail(function() {
          me.addPending(true, 'clear');
        });
      }

      return status;
    };


    module.exports = Me;


},{"../vendor/reqwest.min":8}],5:[function(require,module,exports){
var reqwest = require('../vendor/reqwest.min');


var NOTIFICATIONS_URL = 'http://ft-next-api-user-prefs.herokuapp.com/user/notifications/';
var emit = function(name, data) {
	var event = document.createEvent('Event');
	event.initEvent(name, true, true);
	if (data) {
		event.detail = data;
	}
	top.document.dispatchEvent(event);
};


function extractSearchTerm(queryString) {
    return queryString.match(/q=([^&]*)/)[1];
}

var getCurrentStream = function() {
  var onArticle = /^\/[a-f0-9]+-(.*)/.test(location.pathname); // '27a5e286-4314-11e4-8a43-00144feabdc0'; 
  if(onArticle || location.pathname.indexOf('/search') !== 0) { //hacky way to exclude homepage!
  	return false;
  } else {
  	return extractSearchTerm(location.search);
  }
};


function NotificationPoller(userPreferenceList) {
	this.userPreferenceList = userPreferenceList;
	setInterval(this.poll.bind(this), 1000 * 60 * 0.2); //30 second polling
	this.notifications = {};

	//Clear notifications if a stream has been openend
	this.currentStream = getCurrentStream();
	if(location.pathname.indexOf('/favourites') >= 0) {
		this.clear()
	} else if(this.currentStream) {
		this.clear(this.currentStream);
	}

	this.poll(true); //pass flag to indicate this is the first load

}

NotificationPoller.prototype.poll = function(firstLoad) {
	var poller = this;
	var notificationPromises = [];
	var newNotifications;
	this.userPreferenceList.list.get().forEach(function(stream) {
		//don't bother fetching if you are on that stream currently
		(function(stream) {
			if(stream.resourceType !== 'stream') {
				return false;
			}
			notificationPromises.push(reqwest({
				url: NOTIFICATIONS_URL + stream.uuidv3,
				type: 'json',
				method: 'get',
				headers: {
					'X-FT-UID': poller.userPreferenceList.userId
				},
				crossOrigin: true
			}).then(function(notifications) {
				if(notifications && notifications.length) {

					//If the stream is currently open, emit an event with the notifications, and then clear them
					// (but only do this once)
					if(firstLoad && stream.uuidv3 === poller.currentStream) {
						emit('notifications:opened', { uuidv3: stream.uuidv3, notifications: notifications });
						poller.clear(stream.uuidv3);
					}

					newNotifications = filterNew(poller.notifications[stream.uuidv3], notifications);

					if(!firstLoad && newNotifications.length) {
						emit('notifications:new', { stream: stream, notifications: newNotifications });
					}
					poller.notifications[stream.uuidv3] = notifications;

				} else {
					delete poller.notifications[stream.uuidv3];
				}
				poller.render();
			}));

		}(stream))
		
	});

	Promise.all(notificationPromises).then(function(streamNotifications) {
		if(poller.notifications) {
			emit('notifications:load', poller.notifications);
		}
	});
};

function filterNew(originalList, newList) {
	originalList = originalList || [];
	newList = newList || [];
	var originalIds = originalList.map(function(item) { return item.id; });
	return newList.filter(function(notif) { return (originalIds.indexOf(notif.id) < 0); });
}

function renderBadge(el, number) {
	var badge = el.getElementsByClassName('js-notify-badge')[0];
	if(!badge) {
		badge = document.createElement('span');
		badge.className = 'notify-badge js-notify-badge';
		el.appendChild(badge);
	}
	if(number > 0) {
		badge.removeAttribute('aria-hidden');
		badge.textContent = number;
	} else {
		badge.setAttribute('aria-hidden', '');
	}
}

NotificationPoller.prototype.render = function() {
	for(var stream in this.notifications) {
		link = this.userPreferenceList.container.querySelector('[href="/search?q=' + stream + '"]');
		if(link) {
			renderBadge(link, this.notifications[stream].length);
		}
	}
};

NotificationPoller.prototype.clear = function(uuid) {
	if(uuid) {
		this.notifications[uuid] = [];
		reqwest({
			url: NOTIFICATIONS_URL + uuid,
			type: 'json',
			method: 'delete',
			headers: {
				'X-FT-UID': this.userPreferenceList.userId
			},
			crossOrigin: true
		});
	} else if (typeof uuid === 'undefined') {
		this.notifications = {};
	}
	this.render();
};

module.exports = NotificationPoller;
},{"../vendor/reqwest.min":8}],6:[function(require,module,exports){
var NotificationPoller = require('./NotificationPoller');
var Me = require('./Me');

var $ = function (selector) {
  return [].slice.call(document.querySelectorAll(selector));
};
var emit = function(name, data) {
  var event = document.createEvent('Event');
  event.initEvent(name, true, true);
  if (data) {
    event.detail = data;
  }
  top.document.dispatchEvent(event);
};

var getUserId = function() {
  var value = "; " + document.cookie;
  var parts = value.split("; FT_U=");
  var ftU = parts.pop().split(";").shift();
  if(ftU) {
    return ftU.match(/_EID=(\d+)_PID/)[1];
  } else {
    return;
  }
};

var UserPreferenceList = function(container, opts) {
  var self = this;
  this.userId = getUserId();
  this.key = container.getAttribute('data-user-preference-list');
  this.container = container;
  this.notify = opts.notify;

};

UserPreferenceList.prototype.init = function() {
  var self = this;
  if(!this.userId) {
    this.render();
  }

  document.addEventListener(this.key + ':add', function(ev) {
    self.add(ev.detail);
  });
  document.addEventListener(this.key + ':remove', function(ev) {
    self.remove(ev.detail);
  });

  document.addEventListener(this.key + ':clear', this.clear.bind(this));
  document.addEventListener(this.key + ':update', this.render.bind(this));

  $('[data-list-source="' + this.key + '"] .clear__button').map(function (el) {
    el.addEventListener('click', self.clear.bind(self));
  });

  this.list = new Me(this.key, this.userId);

  if(this.notify === true) {
    this.notifier = new NotificationPoller(this);
  }
}

UserPreferenceList.prototype.render = function() {
  var me = this;
  var href = '';

  var links = this.list ? this.list.getOrCreate().reverse() : [];

  var linksHTML = links.map(function (section) {
    href = section.resourceType === 'stream' ? '/search?q=' + section.uuidv3 : '/' + section.uuidv3;
    return '<li class="item-type--' + section.resourceType + '"><a href="' + href + '">' + section.displayText + '</a></li>';
  }).join('');
  
  if(this.container) {
    this.container.innerHTML =  linksHTML;
  }
  if(this.notifier) {
    this.notifier.render();
  }
};


UserPreferenceList.prototype.add = function(obj) {
  this.list.add(obj);
};

UserPreferenceList.prototype.remove = function(obj) {
  this.list.remove(obj);
};

UserPreferenceList.prototype.clear = function() {
  this.list.clear();
};

UserPreferenceList.init = function(rootEl, opts) {
  var components = {}, 
      fEls, 
      c, l, 
      component;

  rootEl = rootEl || document.body;
  //set config with overrides passed through

  if (rootEl.querySelectorAll) {
    fEls = rootEl.querySelectorAll('[data-user-preference-list]');
    for (c = 0, l = fEls.length; c < l; c++) {
      if (!fEls[c].hasAttribute('data-o-author-alerts--js')) {
        component = new UserPreferenceList(fEls[c], opts || {});
        component.init(opts);
        components[fEls[c].getAttribute('data-user-preference-list')] = component;
      }
    }
  }

  return components;
};


module.exports = UserPreferenceList;

},{"./Me":4,"./NotificationPoller":5}],7:[function(require,module,exports){
var UserPreferenceList = require('./lib/UserPreferenceList');

module.exports = UserPreferenceList;
},{"./lib/UserPreferenceList":6}],8:[function(require,module,exports){
/*!
  * Reqwest! A general purpose XHR connection manager
  * license MIT (c) Dustin Diaz 2014
  * https://github.com/ded/reqwest
  */
!function(e,t,n){typeof module!="undefined"&&module.exports?module.exports=n():typeof define=="function"&&define.amd?define(n):t[e]=n()}("reqwest",this,function(){function succeed(e){return httpsRe.test(window.location.protocol)?twoHundo.test(e.status):!!e.response}function handleReadyState(e,t,n){return function(){if(e._aborted)return n(e.request);e.request&&e.request[readyState]==4&&(e.request.onreadystatechange=noop,succeed(e.request)?t(e.request):n(e.request))}}function setHeaders(e,t){var n=t.headers||{},r;n.Accept=n.Accept||defaultHeaders.accept[t.type]||defaultHeaders.accept["*"];var i=typeof FormData=="function"&&t.data instanceof FormData;!t.crossOrigin&&!n[requestedWith]&&(n[requestedWith]=defaultHeaders.requestedWith),!n[contentType]&&!i&&(n[contentType]=t.contentType||defaultHeaders.contentType);for(r in n)n.hasOwnProperty(r)&&"setRequestHeader"in e&&e.setRequestHeader(r,n[r])}function setCredentials(e,t){typeof t.withCredentials!="undefined"&&typeof e.withCredentials!="undefined"&&(e.withCredentials=!!t.withCredentials)}function generalCallback(e){lastValue=e}function urlappend(e,t){return e+(/\?/.test(e)?"&":"?")+t}function handleJsonp(e,t,n,r){var i=uniqid++,s=e.jsonpCallback||"callback",o=e.jsonpCallbackName||reqwest.getcallbackPrefix(i),u=new RegExp("((^|\\?|&)"+s+")=([^&]+)"),a=r.match(u),f=doc.createElement("script"),l=0,c=navigator.userAgent.indexOf("MSIE 10.0")!==-1;return a?a[3]==="?"?r=r.replace(u,"$1="+o):o=a[3]:r=urlappend(r,s+"="+o),win[o]=generalCallback,f.type="text/javascript",f.src=r,f.async=!0,typeof f.onreadystatechange!="undefined"&&!c&&(f.htmlFor=f.id="_reqwest_"+i),f.onload=f.onreadystatechange=function(){if(f[readyState]&&f[readyState]!=="complete"&&f[readyState]!=="loaded"||l)return!1;f.onload=f.onreadystatechange=null,f.onclick&&f.onclick(),t(lastValue),lastValue=undefined,head.removeChild(f),l=1},head.appendChild(f),{abort:function(){f.onload=f.onreadystatechange=null,n({},"Request is aborted: timeout",{}),lastValue=undefined,head.removeChild(f),l=1}}}function getRequest(e,t){var n=this.o,r=(n.method||"GET").toUpperCase(),i=typeof n=="string"?n:n.url,s=n.processData!==!1&&n.data&&typeof n.data!="string"?reqwest.toQueryString(n.data):n.data||null,o,u=!1;return(n["type"]=="jsonp"||r=="GET")&&s&&(i=urlappend(i,s),s=null),n["type"]=="jsonp"?handleJsonp(n,e,t,i):(o=n.xhr&&n.xhr(n)||xhr(n),o.open(r,i,n.async===!1?!1:!0),setHeaders(o,n),setCredentials(o,n),win[xDomainRequest]&&o instanceof win[xDomainRequest]?(o.onload=e,o.onerror=t,o.onprogress=function(){},u=!0):o.onreadystatechange=handleReadyState(this,e,t),n.before&&n.before(o),u?setTimeout(function(){o.send(s)},200):o.send(s),o)}function Reqwest(e,t){this.o=e,this.fn=t,init.apply(this,arguments)}function setType(e){if(e.match("json"))return"json";if(e.match("javascript"))return"js";if(e.match("text"))return"html";if(e.match("xml"))return"xml"}function init(o,fn){function complete(e){o.timeout&&clearTimeout(self.timeout),self.timeout=null;while(self._completeHandlers.length>0)self._completeHandlers.shift()(e)}function success(resp){var type=o.type||setType(resp.getResponseHeader("Content-Type"));resp=type!=="jsonp"?self.request:resp;var filteredResponse=globalSetupOptions.dataFilter(resp.responseText,type),r=filteredResponse;try{resp.responseText=r}catch(e){}if(r)switch(type){case"json":try{resp=win.JSON?win.JSON.parse(r):eval("("+r+")")}catch(err){return error(resp,"Could not parse JSON in response",err)}break;case"js":resp=eval(r);break;case"html":resp=r;break;case"xml":resp=resp.responseXML&&resp.responseXML.parseError&&resp.responseXML.parseError.errorCode&&resp.responseXML.parseError.reason?null:resp.responseXML}self._responseArgs.resp=resp,self._fulfilled=!0,fn(resp),self._successHandler(resp);while(self._fulfillmentHandlers.length>0)resp=self._fulfillmentHandlers.shift()(resp);complete(resp)}function error(e,t,n){e=self.request,self._responseArgs.resp=e,self._responseArgs.msg=t,self._responseArgs.t=n,self._erred=!0;while(self._errorHandlers.length>0)self._errorHandlers.shift()(e,t,n);complete(e)}this.url=typeof o=="string"?o:o.url,this.timeout=null,this._fulfilled=!1,this._successHandler=function(){},this._fulfillmentHandlers=[],this._errorHandlers=[],this._completeHandlers=[],this._erred=!1,this._responseArgs={};var self=this;fn=fn||function(){},o.timeout&&(this.timeout=setTimeout(function(){self.abort()},o.timeout)),o.success&&(this._successHandler=function(){o.success.apply(o,arguments)}),o.error&&this._errorHandlers.push(function(){o.error.apply(o,arguments)}),o.complete&&this._completeHandlers.push(function(){o.complete.apply(o,arguments)}),this.request=getRequest.call(this,success,error)}function reqwest(e,t){return new Reqwest(e,t)}function normalize(e){return e?e.replace(/\r?\n/g,"\r\n"):""}function serial(e,t){var n=e.name,r=e.tagName.toLowerCase(),i=function(e){e&&!e.disabled&&t(n,normalize(e.attributes.value&&e.attributes.value.specified?e.value:e.text))},s,o,u,a;if(e.disabled||!n)return;switch(r){case"input":/reset|button|image|file/i.test(e.type)||(s=/checkbox/i.test(e.type),o=/radio/i.test(e.type),u=e.value,(!s&&!o||e.checked)&&t(n,normalize(s&&u===""?"on":u)));break;case"textarea":t(n,normalize(e.value));break;case"select":if(e.type.toLowerCase()==="select-one")i(e.selectedIndex>=0?e.options[e.selectedIndex]:null);else for(a=0;e.length&&a<e.length;a++)e.options[a].selected&&i(e.options[a])}}function eachFormElement(){var e=this,t,n,r=function(t,n){var r,i,s;for(r=0;r<n.length;r++){s=t[byTag](n[r]);for(i=0;i<s.length;i++)serial(s[i],e)}};for(n=0;n<arguments.length;n++)t=arguments[n],/input|select|textarea/i.test(t.tagName)&&serial(t,e),r(t,["input","select","textarea"])}function serializeQueryString(){return reqwest.toQueryString(reqwest.serializeArray.apply(null,arguments))}function serializeHash(){var e={};return eachFormElement.apply(function(t,n){t in e?(e[t]&&!isArray(e[t])&&(e[t]=[e[t]]),e[t].push(n)):e[t]=n},arguments),e}function buildParams(e,t,n,r){var i,s,o,u=/\[\]$/;if(isArray(t))for(s=0;t&&s<t.length;s++)o=t[s],n||u.test(e)?r(e,o):buildParams(e+"["+(typeof o=="object"?s:"")+"]",o,n,r);else if(t&&t.toString()==="[object Object]")for(i in t)buildParams(e+"["+i+"]",t[i],n,r);else r(e,t)}var win=window,doc=document,httpsRe=/^http/,twoHundo=/^(20\d|1223)$/,byTag="getElementsByTagName",readyState="readyState",contentType="Content-Type",requestedWith="X-Requested-With",head=doc[byTag]("head")[0],uniqid=0,callbackPrefix="reqwest_"+ +(new Date),lastValue,xmlHttpRequest="XMLHttpRequest",xDomainRequest="XDomainRequest",noop=function(){},isArray=typeof Array.isArray=="function"?Array.isArray:function(e){return e instanceof Array},defaultHeaders={contentType:"application/x-www-form-urlencoded",requestedWith:xmlHttpRequest,accept:{"*":"text/javascript, text/html, application/xml, text/xml, */*",xml:"application/xml, text/xml",html:"text/html",text:"text/plain",json:"application/json, text/javascript",js:"application/javascript, text/javascript"}},xhr=function(e){if(e.crossOrigin===!0){var t=win[xmlHttpRequest]?new XMLHttpRequest:null;if(t&&"withCredentials"in t)return t;if(win[xDomainRequest])return new XDomainRequest;throw new Error("Browser does not support cross-origin requests")}return win[xmlHttpRequest]?new XMLHttpRequest:new ActiveXObject("Microsoft.XMLHTTP")},globalSetupOptions={dataFilter:function(e){return e}};return Reqwest.prototype={abort:function(){this._aborted=!0,this.request.abort()},retry:function(){init.call(this,this.o,this.fn)},then:function(e,t){return e=e||function(){},t=t||function(){},this._fulfilled?this._responseArgs.resp=e(this._responseArgs.resp):this._erred?t(this._responseArgs.resp,this._responseArgs.msg,this._responseArgs.t):(this._fulfillmentHandlers.push(e),this._errorHandlers.push(t)),this},always:function(e){return this._fulfilled||this._erred?e(this._responseArgs.resp):this._completeHandlers.push(e),this},fail:function(e){return this._erred?e(this._responseArgs.resp,this._responseArgs.msg,this._responseArgs.t):this._errorHandlers.push(e),this},"catch":function(e){return this.fail(e)}},reqwest.serializeArray=function(){var e=[];return eachFormElement.apply(function(t,n){e.push({name:t,value:n})},arguments),e},reqwest.serialize=function(){if(arguments.length===0)return"";var e,t,n=Array.prototype.slice.call(arguments,0);return e=n.pop(),e&&e.nodeType&&n.push(e)&&(e=null),e&&(e=e.type),e=="map"?t=serializeHash:e=="array"?t=reqwest.serializeArray:t=serializeQueryString,t.apply(null,n)},reqwest.toQueryString=function(e,t){var n,r,i=t||!1,s=[],o=encodeURIComponent,u=function(e,t){t="function"==typeof t?t():t==null?"":t,s[s.length]=o(e)+"="+o(t)};if(isArray(e))for(r=0;e&&r<e.length;r++)u(e[r].name,e[r].value);else for(n in e)e.hasOwnProperty(n)&&buildParams(n,e[n],i,u);return s.join("&").replace(/%20/g,"+")},reqwest.getcallbackPrefix=function(){return callbackPrefix},reqwest.compat=function(e,t){return e&&(e.type&&(e.method=e.type)&&delete e.type,e.dataType&&(e.type=e.dataType),e.jsonpCallback&&(e.jsonpCallbackName=e.jsonpCallback)&&delete e.jsonpCallback,e.jsonp&&(e.jsonpCallback=e.jsonp)),new Reqwest(e,t)},reqwest.ajaxSetup=function(e){e=e||{};for(var t in e)globalSetupOptions[t]=e[t]},reqwest})
},{}],9:[function(require,module,exports){
/*!
  * Reqwest! A general purpose XHR connection manager
  * license MIT (c) Dustin Diaz 2014
  * https://github.com/ded/reqwest
  */

!function (name, context, definition) {
  if (typeof module != 'undefined' && module.exports) module.exports = definition()
  else if (typeof define == 'function' && define.amd) define(definition)
  else context[name] = definition()
}('reqwest', this, function () {

  var win = window
    , doc = document
    , httpsRe = /^http/
    , protocolRe = /(^\w+):\/\//
    , twoHundo = /^(20\d|1223)$/ //http://stackoverflow.com/questions/10046972/msie-returns-status-code-of-1223-for-ajax-request
    , byTag = 'getElementsByTagName'
    , readyState = 'readyState'
    , contentType = 'Content-Type'
    , requestedWith = 'X-Requested-With'
    , head = doc[byTag]('head')[0]
    , uniqid = 0
    , callbackPrefix = 'reqwest_' + (+new Date())
    , lastValue // data stored by the most recent JSONP callback
    , xmlHttpRequest = 'XMLHttpRequest'
    , xDomainRequest = 'XDomainRequest'
    , noop = function () {}

    , isArray = typeof Array.isArray == 'function'
        ? Array.isArray
        : function (a) {
            return a instanceof Array
          }

    , defaultHeaders = {
          'contentType': 'application/x-www-form-urlencoded'
        , 'requestedWith': xmlHttpRequest
        , 'accept': {
              '*':  'text/javascript, text/html, application/xml, text/xml, */*'
            , 'xml':  'application/xml, text/xml'
            , 'html': 'text/html'
            , 'text': 'text/plain'
            , 'json': 'application/json, text/javascript'
            , 'js':   'application/javascript, text/javascript'
          }
      }

    , xhr = function(o) {
        // is it x-domain
        if (o['crossOrigin'] === true) {
          var xhr = win[xmlHttpRequest] ? new XMLHttpRequest() : null
          if (xhr && 'withCredentials' in xhr) {
            return xhr
          } else if (win[xDomainRequest]) {
            return new XDomainRequest()
          } else {
            throw new Error('Browser does not support cross-origin requests')
          }
        } else if (win[xmlHttpRequest]) {
          return new XMLHttpRequest()
        } else {
          return new ActiveXObject('Microsoft.XMLHTTP')
        }
      }
    , globalSetupOptions = {
        dataFilter: function (data) {
          return data
        }
      }

  function succeed(r) {
    var protocol = protocolRe.exec(r.url);
    protocol = (protocol && protocol[1]) || window.location.protocol;
    return httpsRe.test(protocol) ? twoHundo.test(r.request.status) : !!r.request.response;
  }

  function handleReadyState(r, success, error) {
    return function () {
      // use _aborted to mitigate against IE err c00c023f
      // (can't read props on aborted request objects)
      if (r._aborted) return error(r.request)
      if (r._timedOut) return error(r.request, 'Request is aborted: timeout')
      if (r.request && r.request[readyState] == 4) {
        r.request.onreadystatechange = noop
        if (succeed(r)) success(r.request)
        else
          error(r.request)
      }
    }
  }

  function setHeaders(http, o) {
    var headers = o['headers'] || {}
      , h

    headers['Accept'] = headers['Accept']
      || defaultHeaders['accept'][o['type']]
      || defaultHeaders['accept']['*']

    var isAFormData = typeof FormData === 'function' && (o['data'] instanceof FormData);
    // breaks cross-origin requests with legacy browsers
    if (!o['crossOrigin'] && !headers[requestedWith]) headers[requestedWith] = defaultHeaders['requestedWith']
    if (!headers[contentType] && !isAFormData) headers[contentType] = o['contentType'] || defaultHeaders['contentType']
    for (h in headers)
      headers.hasOwnProperty(h) && 'setRequestHeader' in http && http.setRequestHeader(h, headers[h])
  }

  function setCredentials(http, o) {
    if (typeof o['withCredentials'] !== 'undefined' && typeof http.withCredentials !== 'undefined') {
      http.withCredentials = !!o['withCredentials']
    }
  }

  function generalCallback(data) {
    lastValue = data
  }

  function urlappend (url, s) {
    return url + (/\?/.test(url) ? '&' : '?') + s
  }

  function handleJsonp(o, fn, err, url) {
    var reqId = uniqid++
      , cbkey = o['jsonpCallback'] || 'callback' // the 'callback' key
      , cbval = o['jsonpCallbackName'] || reqwest.getcallbackPrefix(reqId)
      , cbreg = new RegExp('((^|\\?|&)' + cbkey + ')=([^&]+)')
      , match = url.match(cbreg)
      , script = doc.createElement('script')
      , loaded = 0
      , isIE10 = navigator.userAgent.indexOf('MSIE 10.0') !== -1

    if (match) {
      if (match[3] === '?') {
        url = url.replace(cbreg, '$1=' + cbval) // wildcard callback func name
      } else {
        cbval = match[3] // provided callback func name
      }
    } else {
      url = urlappend(url, cbkey + '=' + cbval) // no callback details, add 'em
    }

    win[cbval] = generalCallback

    script.type = 'text/javascript'
    script.src = url
    script.async = true
    if (typeof script.onreadystatechange !== 'undefined' && !isIE10) {
      // need this for IE due to out-of-order onreadystatechange(), binding script
      // execution to an event listener gives us control over when the script
      // is executed. See http://jaubourg.net/2010/07/loading-script-as-onclick-handler-of.html
      script.htmlFor = script.id = '_reqwest_' + reqId
    }

    script.onload = script.onreadystatechange = function () {
      if ((script[readyState] && script[readyState] !== 'complete' && script[readyState] !== 'loaded') || loaded) {
        return false
      }
      script.onload = script.onreadystatechange = null
      script.onclick && script.onclick()
      // Call the user callback with the last value stored and clean up values and scripts.
      fn(lastValue)
      lastValue = undefined
      head.removeChild(script)
      loaded = 1
    }

    // Add the script to the DOM head
    head.appendChild(script)

    // Enable JSONP timeout
    return {
      abort: function () {
        script.onload = script.onreadystatechange = null
        err({}, 'Request is aborted: timeout', {})
        lastValue = undefined
        head.removeChild(script)
        loaded = 1
      }
    }
  }

  function getRequest(fn, err) {
    var o = this.o
      , method = (o['method'] || 'GET').toUpperCase()
      , url = typeof o === 'string' ? o : o['url']
      // convert non-string objects to query-string form unless o['processData'] is false
      , data = (o['processData'] !== false && o['data'] && typeof o['data'] !== 'string')
        ? reqwest.toQueryString(o['data'])
        : (o['data'] || null)
      , http
      , sendWait = false

    // if we're working on a GET request and we have data then we should append
    // query string to end of URL and not post data
    if ((o['type'] == 'jsonp' || method == 'GET') && data) {
      url = urlappend(url, data)
      data = null
    }

    if (o['type'] == 'jsonp') return handleJsonp(o, fn, err, url)

    // get the xhr from the factory if passed
    // if the factory returns null, fall-back to ours
    http = (o.xhr && o.xhr(o)) || xhr(o)

    http.open(method, url, o['async'] === false ? false : true)
    setHeaders(http, o)
    setCredentials(http, o)
    if (win[xDomainRequest] && http instanceof win[xDomainRequest]) {
        http.onload = fn
        http.onerror = err
        // NOTE: see
        // http://social.msdn.microsoft.com/Forums/en-US/iewebdevelopment/thread/30ef3add-767c-4436-b8a9-f1ca19b4812e
        http.onprogress = function() {}
        sendWait = true
    } else {
      http.onreadystatechange = handleReadyState(this, fn, err)
    }
    o['before'] && o['before'](http)
    if (sendWait) {
      setTimeout(function () {
        http.send(data)
      }, 200)
    } else {
      http.send(data)
    }
    return http
  }

  function Reqwest(o, fn) {
    this.o = o
    this.fn = fn

    init.apply(this, arguments)
  }

  function setType(header) {
    // json, javascript, text/plain, text/html, xml
    if (header.match('json')) return 'json'
    if (header.match('javascript')) return 'js'
    if (header.match('text')) return 'html'
    if (header.match('xml')) return 'xml'
  }

  function init(o, fn) {

    this.url = typeof o == 'string' ? o : o['url']
    this.timeout = null

    // whether request has been fulfilled for purpose
    // of tracking the Promises
    this._fulfilled = false
    // success handlers
    this._successHandler = function(){}
    this._fulfillmentHandlers = []
    // error handlers
    this._errorHandlers = []
    // complete (both success and fail) handlers
    this._completeHandlers = []
    this._erred = false
    this._responseArgs = {}

    var self = this

    fn = fn || function () {}

    if (o['timeout']) {
      this.timeout = setTimeout(function () {
        timedOut()
      }, o['timeout'])
    }

    if (o['success']) {
      this._successHandler = function () {
        o['success'].apply(o, arguments)
      }
    }

    if (o['error']) {
      this._errorHandlers.push(function () {
        o['error'].apply(o, arguments)
      })
    }

    if (o['complete']) {
      this._completeHandlers.push(function () {
        o['complete'].apply(o, arguments)
      })
    }

    function complete (resp) {
      o['timeout'] && clearTimeout(self.timeout)
      self.timeout = null
      while (self._completeHandlers.length > 0) {
        self._completeHandlers.shift()(resp)
      }
    }

    function success (resp) {
      var type = o['type'] || resp && setType(resp.getResponseHeader('Content-Type')) // resp can be undefined in IE
      resp = (type !== 'jsonp') ? self.request : resp
      // use global data filter on response text
      var filteredResponse = globalSetupOptions.dataFilter(resp.responseText, type)
        , r = filteredResponse
      try {
        resp.responseText = r
      } catch (e) {
        // can't assign this in IE<=8, just ignore
      }
      if (r) {
        switch (type) {
        case 'json':
          try {
            resp = win.JSON ? win.JSON.parse(r) : eval('(' + r + ')')
          } catch (err) {
            return error(resp, 'Could not parse JSON in response', err)
          }
          break
        case 'js':
          resp = eval(r)
          break
        case 'html':
          resp = r
          break
        case 'xml':
          resp = resp.responseXML
              && resp.responseXML.parseError // IE trololo
              && resp.responseXML.parseError.errorCode
              && resp.responseXML.parseError.reason
            ? null
            : resp.responseXML
          break
        }
      }

      self._responseArgs.resp = resp
      self._fulfilled = true
      fn(resp)
      self._successHandler(resp)
      while (self._fulfillmentHandlers.length > 0) {
        resp = self._fulfillmentHandlers.shift()(resp)
      }

      complete(resp)
    }

    function timedOut() {
      self._timedOut = true
      self.request.abort()      
    }

    function error(resp, msg, t) {
      resp = self.request
      self._responseArgs.resp = resp
      self._responseArgs.msg = msg
      self._responseArgs.t = t
      self._erred = true
      while (self._errorHandlers.length > 0) {
        self._errorHandlers.shift()(resp, msg, t)
      }
      complete(resp)
    }

    this.request = getRequest.call(this, success, error)
  }

  Reqwest.prototype = {
    abort: function () {
      this._aborted = true
      this.request.abort()
    }

  , retry: function () {
      init.call(this, this.o, this.fn)
    }

    /**
     * Small deviation from the Promises A CommonJs specification
     * http://wiki.commonjs.org/wiki/Promises/A
     */

    /**
     * `then` will execute upon successful requests
     */
  , then: function (success, fail) {
      success = success || function () {}
      fail = fail || function () {}
      if (this._fulfilled) {
        this._responseArgs.resp = success(this._responseArgs.resp)
      } else if (this._erred) {
        fail(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
      } else {
        this._fulfillmentHandlers.push(success)
        this._errorHandlers.push(fail)
      }
      return this
    }

    /**
     * `always` will execute whether the request succeeds or fails
     */
  , always: function (fn) {
      if (this._fulfilled || this._erred) {
        fn(this._responseArgs.resp)
      } else {
        this._completeHandlers.push(fn)
      }
      return this
    }

    /**
     * `fail` will execute when the request fails
     */
  , fail: function (fn) {
      if (this._erred) {
        fn(this._responseArgs.resp, this._responseArgs.msg, this._responseArgs.t)
      } else {
        this._errorHandlers.push(fn)
      }
      return this
    }
  , 'catch': function (fn) {
      return this.fail(fn)
    }
  }

  function reqwest(o, fn) {
    return new Reqwest(o, fn)
  }

  // normalize newline variants according to spec -> CRLF
  function normalize(s) {
    return s ? s.replace(/\r?\n/g, '\r\n') : ''
  }

  function serial(el, cb) {
    var n = el.name
      , t = el.tagName.toLowerCase()
      , optCb = function (o) {
          // IE gives value="" even where there is no value attribute
          // 'specified' ref: http://www.w3.org/TR/DOM-Level-3-Core/core.html#ID-862529273
          if (o && !o['disabled'])
            cb(n, normalize(o['attributes']['value'] && o['attributes']['value']['specified'] ? o['value'] : o['text']))
        }
      , ch, ra, val, i

    // don't serialize elements that are disabled or without a name
    if (el.disabled || !n) return

    switch (t) {
    case 'input':
      if (!/reset|button|image|file/i.test(el.type)) {
        ch = /checkbox/i.test(el.type)
        ra = /radio/i.test(el.type)
        val = el.value
        // WebKit gives us "" instead of "on" if a checkbox has no value, so correct it here
        ;(!(ch || ra) || el.checked) && cb(n, normalize(ch && val === '' ? 'on' : val))
      }
      break
    case 'textarea':
      cb(n, normalize(el.value))
      break
    case 'select':
      if (el.type.toLowerCase() === 'select-one') {
        optCb(el.selectedIndex >= 0 ? el.options[el.selectedIndex] : null)
      } else {
        for (i = 0; el.length && i < el.length; i++) {
          el.options[i].selected && optCb(el.options[i])
        }
      }
      break
    }
  }

  // collect up all form elements found from the passed argument elements all
  // the way down to child elements; pass a '<form>' or form fields.
  // called with 'this'=callback to use for serial() on each element
  function eachFormElement() {
    var cb = this
      , e, i
      , serializeSubtags = function (e, tags) {
          var i, j, fa
          for (i = 0; i < tags.length; i++) {
            fa = e[byTag](tags[i])
            for (j = 0; j < fa.length; j++) serial(fa[j], cb)
          }
        }

    for (i = 0; i < arguments.length; i++) {
      e = arguments[i]
      if (/input|select|textarea/i.test(e.tagName)) serial(e, cb)
      serializeSubtags(e, [ 'input', 'select', 'textarea' ])
    }
  }

  // standard query string style serialization
  function serializeQueryString() {
    return reqwest.toQueryString(reqwest.serializeArray.apply(null, arguments))
  }

  // { 'name': 'value', ... } style serialization
  function serializeHash() {
    var hash = {}
    eachFormElement.apply(function (name, value) {
      if (name in hash) {
        hash[name] && !isArray(hash[name]) && (hash[name] = [hash[name]])
        hash[name].push(value)
      } else hash[name] = value
    }, arguments)
    return hash
  }

  // [ { name: 'name', value: 'value' }, ... ] style serialization
  reqwest.serializeArray = function () {
    var arr = []
    eachFormElement.apply(function (name, value) {
      arr.push({name: name, value: value})
    }, arguments)
    return arr
  }

  reqwest.serialize = function () {
    if (arguments.length === 0) return ''
    var opt, fn
      , args = Array.prototype.slice.call(arguments, 0)

    opt = args.pop()
    opt && opt.nodeType && args.push(opt) && (opt = null)
    opt && (opt = opt.type)

    if (opt == 'map') fn = serializeHash
    else if (opt == 'array') fn = reqwest.serializeArray
    else fn = serializeQueryString

    return fn.apply(null, args)
  }

  reqwest.toQueryString = function (o, trad) {
    var prefix, i
      , traditional = trad || false
      , s = []
      , enc = encodeURIComponent
      , add = function (key, value) {
          // If value is a function, invoke it and return its value
          value = ('function' === typeof value) ? value() : (value == null ? '' : value)
          s[s.length] = enc(key) + '=' + enc(value)
        }
    // If an array was passed in, assume that it is an array of form elements.
    if (isArray(o)) {
      for (i = 0; o && i < o.length; i++) add(o[i]['name'], o[i]['value'])
    } else {
      // If traditional, encode the "old" way (the way 1.3.2 or older
      // did it), otherwise encode params recursively.
      for (prefix in o) {
        if (o.hasOwnProperty(prefix)) buildParams(prefix, o[prefix], traditional, add)
      }
    }

    // spaces should be + according to spec
    return s.join('&').replace(/%20/g, '+')
  }

  function buildParams(prefix, obj, traditional, add) {
    var name, i, v
      , rbracket = /\[\]$/

    if (isArray(obj)) {
      // Serialize array item.
      for (i = 0; obj && i < obj.length; i++) {
        v = obj[i]
        if (traditional || rbracket.test(prefix)) {
          // Treat each array item as a scalar.
          add(prefix, v)
        } else {
          buildParams(prefix + '[' + (typeof v === 'object' ? i : '') + ']', v, traditional, add)
        }
      }
    } else if (obj && obj.toString() === '[object Object]') {
      // Serialize object item.
      for (name in obj) {
        buildParams(prefix + '[' + name + ']', obj[name], traditional, add)
      }

    } else {
      // Serialize scalar item.
      add(prefix, obj)
    }
  }

  reqwest.getcallbackPrefix = function () {
    return callbackPrefix
  }

  // jQuery and Zepto compatibility, differences can be remapped here so you can call
  // .ajax.compat(options, callback)
  reqwest.compat = function (o, fn) {
    if (o) {
      o['type'] && (o['method'] = o['type']) && delete o['type']
      o['dataType'] && (o['type'] = o['dataType'])
      o['jsonpCallback'] && (o['jsonpCallbackName'] = o['jsonpCallback']) && delete o['jsonpCallback']
      o['jsonp'] && (o['jsonpCallback'] = o['jsonp'])
    }
    return new Reqwest(o, fn)
  }

  reqwest.ajaxSetup = function (options) {
    options = options || {}
    for (var k in options) {
      globalSetupOptions[k] = options[k]
    }
  }

  return reqwest
});

},{}],10:[function(require,module,exports){
'use strict';

var reqwest = require("./bower_components/reqwest/reqwest.js");
var Delegate = require("./bower_components/dom-delegate/lib/delegate.js");
var header = document.querySelector('.o-header');
var myFt = document.querySelector('.o-header__secondary--myft-js');
var myFTButton = header.querySelector('.o-header-button-js[data-target-panel="myft"]');
var defaultPanel = header.getAttribute('data-default-panel');
var delegate = new Delegate(header);
var bodyDelegate = new Delegate();
var Notify = require('./src/js/Notify');
var nextUserPreferences = require("./bower_components/next-user-preferences/src/main.js");
var User = require("./bower_components/next-user-model-component/main.js");



delegate.on('click', '.o-header-button-js', function(event) {
	event.preventDefault();
	event.stopPropagation();

	// HACK
	var targetPanel = event.target.getAttribute('data-target-panel')
		|| event.target.parentNode.getAttribute('data-target-panel')
		|| defaultPanel;
	var currentPanel = header.getAttribute('data-panel');
	if (currentPanel !== targetPanel && targetPanel !== defaultPanel) {
		bodyDelegate.root(document.body);
		header.setAttribute('data-panel', targetPanel);
	} else {
		bodyDelegate.root();
		if (defaultPanel) {
			header.setAttribute('data-panel', defaultPanel);
		} else {
			header.removeAttribute('data-panel');
		}
	}
});

delegate.on('click', function(event) {
	event.stopPropagation();
});

bodyDelegate.on('click', function(event) {
	event.preventDefault();
	event.stopPropagation();
	if (defaultPanel) {
		header.setAttribute('data-panel', defaultPanel);
	} else {
		header.removeAttribute('data-panel');
	}
});

document.addEventListener('notifications:load', function(e) {

    console.log(e);

    var total = 0, 
        notifications = e.detail;
		
    if(myFTButton.getElementsByClassName('notify-badge').length) {
        myFTButton.getElementsByClassName('notify-badge')[0].textContent = notifications.count;
    } else {
        myFTButton.insertAdjacentHTML('beforeend', '<span class="notify-badge">'+total + '</span>')
    }
	
});

document.addEventListener('notifications:new', function(e) {
	var total = 0, 
	    data = e.detail;
	
	var id = data.notifications[0].item;
	reqwest({
		url: '/' + id,
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json'
		}
	}).then(function(res) {
		new Notify({
			title: 'New article in ' + data.stream.displayText,
			body: res.headline,
			lifespan: 1000 * 10,
			onclick: function() {
				location.href = '/' + res.id
			}
		}).show();
	}).fail(function(err) {
		new Notify({
			title: 'New article in ' + data.stream.displayText,
			lifespan: 1000 * 10,
			onclick: function() {
				location.href = '/' + data.notifications[0].item
			}
		}).show();
	});


});

function setFollowingButton () {
	myFTButton.setAttribute('href', 'next.ft.com/users/' + new User(document.cookie).id()) + '/following/new';
}

function transitionMyFTButton (type) {

	function listener() {
		myFTButton.classList.remove('transitioning');
		myFTButton.removeEventListener('transitionend', listener);
	};

	myFTButton.addEventListener('transitionend', listener);
	myFTButton.classList.add('transitioning');
	myFTButton.classList.add('myft--' + type);
	myFTButton.offsetWidth; //forces repaint

	myFTButton.classList.remove('myft--' + type);
}

document.addEventListener('favourites:add', function (e) {
	transitionMyFTButton('add-favourite');
});

document.addEventListener('favourites:remove', function (e) {
	transitionMyFTButton('remove-favourite');
});


reqwest('http://next-companies-et-al.herokuapp.com/v1/ubernav.json', function(resp) {
	var data = resp.data;
	header.querySelector('.o-header__secondary--menu-js').innerHTML = '<ul class="uber-index">'
		+ data.map(function(item) {
		return '<li class="uber-index__title" data-o-grid-colspan="6 M6 L3 XL3">'
			+ '<a href="' + item.nextUrl + '">' + item.title + '</a>'
			+ '<ul class="uber-index__children">'
			+ item.navigationItems.map(function(child) {
				return '<li class="uber-index__child"><a href="' + child.nextUrl + '">' + child.title + '</a></li>';
			}).join('')
			+ '</ul>'
			+ '</li>';
		}).join('');
		+ '</ul>';
});

setFollowingButton();

if (myFt) nextUserPreferences.init(myFt, { notify: true });

},{"./bower_components/dom-delegate/lib/delegate.js":1,"./bower_components/next-user-model-component/main.js":2,"./bower_components/next-user-preferences/src/main.js":7,"./bower_components/reqwest/reqwest.js":9,"./src/js/Notify":11}],11:[function(require,module,exports){
/**
 * Message the user
 *
 * > new Notify({ html: "You've got mail", lifespace: 10000 }).show();
 *
 * TODO
 *
 *  - UX to deal with multiple messages.
 *  - W3 / Chrome desktop notifications permission.
 *  - Acknowledgement UX
 *
 */
var Notify = function (message) {
    this.template = '<h3 class="message__title">' + message.title + '<i class="message__close icon icon__close"></i></h3><span class="message__body">' + message.body + '</span>';
    this.lifespan = message.lifespan || 5000;
    this.dom = document.createElement('div');
    this.dom.className = 'message__container'
    this.dom.innerHTML = this.template; 
    this.hasDesktopPermission = false;
    this.root = document.body;
    this.message = message;
};

function createNotification(message) {
    var notification = new Notification(message.title, {body: message.body});
    notification.addEventListener('click', message.onclick);
    return notification;
}

Notify.prototype.show = function () {
    
    var self = this;
    // granted
    //TODO - enable this again once we've thought about the UX!
    if (false && window.Notification && Notification.permission === "granted") {
        createNotification(self.message);
    } else if (false && window.Notification && Notification.permission !== "denied") {
      
        Notification.requestPermission(function (status) {
            if (Notification.permission !== status) {
                Notification.permission = status;
            }

            // granted
            if (status === "granted") {
                createNotification(self.message);
            } else {
                self.showHtmlNotification();    
            }
        });
    // denied
    } else {
        this.showHtmlNotification();    
    }
};

Notify.prototype.destroy = function () {
    // FIXME forget if I need to remove event listener :)
    this.dom.parentNode.removeChild(this.dom);
};

Notify.prototype.showHtmlNotification = function () {

    var self = this;

    this.root.appendChild(this.dom);

    // Automatically destroy the box after a few seconds
    var selfDestruct = setTimeout(function () {
        self.destroy();
    }, this.lifespan); 

    // Acknowledgment UI
    this.dom.querySelector('.message__close').addEventListener('click', function () {
        self.destroy();
        clearTimeout(selfDestruct);
    });

    this.dom.addEventListener('click', function (e) {
        if(e.target.className.indexOf('message__close') >= 0) {
            return;
        }
        self.message.onclick();
        self.destroy();
        clearTimeout(selfDestruct);
    });

};

module.exports = Notify;
},{}]},{},[10])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlcyI6WyIvdXNyL2xvY2FsL2xpYi9ub2RlX21vZHVsZXMvb3JpZ2FtaS1idWlsZC10b29scy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21hdHQuY2hhZGJ1cm4vUHJvamVjdHMvTmV4dC9hcHBzL25leHQtaGVhZGVyL2Jvd2VyX2NvbXBvbmVudHMvZG9tLWRlbGVnYXRlL2xpYi9kZWxlZ2F0ZS5qcyIsIi9Vc2Vycy9tYXR0LmNoYWRidXJuL1Byb2plY3RzL05leHQvYXBwcy9uZXh0LWhlYWRlci9ib3dlcl9jb21wb25lbnRzL25leHQtdXNlci1tb2RlbC1jb21wb25lbnQvbWFpbi5qcyIsIi9Vc2Vycy9tYXR0LmNoYWRidXJuL1Byb2plY3RzL05leHQvYXBwcy9uZXh0LWhlYWRlci9ib3dlcl9jb21wb25lbnRzL25leHQtdXNlci1tb2RlbC1jb21wb25lbnQvc3JjL21vZGVscy9Vc2VyLmpzIiwiL1VzZXJzL21hdHQuY2hhZGJ1cm4vUHJvamVjdHMvTmV4dC9hcHBzL25leHQtaGVhZGVyL2Jvd2VyX2NvbXBvbmVudHMvbmV4dC11c2VyLXByZWZlcmVuY2VzL3NyYy9saWIvTWUuanMiLCIvVXNlcnMvbWF0dC5jaGFkYnVybi9Qcm9qZWN0cy9OZXh0L2FwcHMvbmV4dC1oZWFkZXIvYm93ZXJfY29tcG9uZW50cy9uZXh0LXVzZXItcHJlZmVyZW5jZXMvc3JjL2xpYi9Ob3RpZmljYXRpb25Qb2xsZXIuanMiLCIvVXNlcnMvbWF0dC5jaGFkYnVybi9Qcm9qZWN0cy9OZXh0L2FwcHMvbmV4dC1oZWFkZXIvYm93ZXJfY29tcG9uZW50cy9uZXh0LXVzZXItcHJlZmVyZW5jZXMvc3JjL2xpYi9Vc2VyUHJlZmVyZW5jZUxpc3QuanMiLCIvVXNlcnMvbWF0dC5jaGFkYnVybi9Qcm9qZWN0cy9OZXh0L2FwcHMvbmV4dC1oZWFkZXIvYm93ZXJfY29tcG9uZW50cy9uZXh0LXVzZXItcHJlZmVyZW5jZXMvc3JjL21haW4uanMiLCIvVXNlcnMvbWF0dC5jaGFkYnVybi9Qcm9qZWN0cy9OZXh0L2FwcHMvbmV4dC1oZWFkZXIvYm93ZXJfY29tcG9uZW50cy9uZXh0LXVzZXItcHJlZmVyZW5jZXMvc3JjL3ZlbmRvci9yZXF3ZXN0Lm1pbi5qcyIsIi9Vc2Vycy9tYXR0LmNoYWRidXJuL1Byb2plY3RzL05leHQvYXBwcy9uZXh0LWhlYWRlci9ib3dlcl9jb21wb25lbnRzL3JlcXdlc3QvcmVxd2VzdC5qcyIsIi9Vc2Vycy9tYXR0LmNoYWRidXJuL1Byb2plY3RzL05leHQvYXBwcy9uZXh0LWhlYWRlci9tYWluLmpzIiwiL1VzZXJzL21hdHQuY2hhZGJ1cm4vUHJvamVjdHMvTmV4dC9hcHBzL25leHQtaGVhZGVyL3NyYy9qcy9Ob3RpZnkuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3YUE7QUFDQTs7QUNEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqT0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkhBO0FBQ0E7QUFDQTs7QUNGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDTEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdm1CQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpfXZhciBmPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChmLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGYsZi5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKmpzaGludCBicm93c2VyOnRydWUsIG5vZGU6dHJ1ZSovXG5cbid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBEZWxlZ2F0ZTtcblxuLyoqXG4gKiBET00gZXZlbnQgZGVsZWdhdG9yXG4gKlxuICogVGhlIGRlbGVnYXRvciB3aWxsIGxpc3RlblxuICogZm9yIGV2ZW50cyB0aGF0IGJ1YmJsZSB1cFxuICogdG8gdGhlIHJvb3Qgbm9kZS5cbiAqXG4gKiBAY29uc3RydWN0b3JcbiAqIEBwYXJhbSB7Tm9kZXxzdHJpbmd9IFtyb290XSBUaGUgcm9vdCBub2RlIG9yIGEgc2VsZWN0b3Igc3RyaW5nIG1hdGNoaW5nIHRoZSByb290IG5vZGVcbiAqL1xuZnVuY3Rpb24gRGVsZWdhdGUocm9vdCkge1xuXG4gIC8qKlxuICAgKiBNYWludGFpbiBhIG1hcCBvZiBsaXN0ZW5lclxuICAgKiBsaXN0cywga2V5ZWQgYnkgZXZlbnQgbmFtZS5cbiAgICpcbiAgICogQHR5cGUgT2JqZWN0XG4gICAqL1xuICB0aGlzLmxpc3RlbmVyTWFwID0gW3t9LCB7fV07XG4gIGlmIChyb290KSB7XG4gICAgdGhpcy5yb290KHJvb3QpO1xuICB9XG5cbiAgLyoqIEB0eXBlIGZ1bmN0aW9uKCkgKi9cbiAgdGhpcy5oYW5kbGUgPSBEZWxlZ2F0ZS5wcm90b3R5cGUuaGFuZGxlLmJpbmQodGhpcyk7XG59XG5cbi8qKlxuICogU3RhcnQgbGlzdGVuaW5nIGZvciBldmVudHNcbiAqIG9uIHRoZSBwcm92aWRlZCBET00gZWxlbWVudFxuICpcbiAqIEBwYXJhbSAge05vZGV8c3RyaW5nfSBbcm9vdF0gVGhlIHJvb3Qgbm9kZSBvciBhIHNlbGVjdG9yIHN0cmluZyBtYXRjaGluZyB0aGUgcm9vdCBub2RlXG4gKiBAcmV0dXJucyB7RGVsZWdhdGV9IFRoaXMgbWV0aG9kIGlzIGNoYWluYWJsZVxuICovXG5EZWxlZ2F0ZS5wcm90b3R5cGUucm9vdCA9IGZ1bmN0aW9uKHJvb3QpIHtcbiAgdmFyIGxpc3RlbmVyTWFwID0gdGhpcy5saXN0ZW5lck1hcDtcbiAgdmFyIGV2ZW50VHlwZTtcblxuICAvLyBSZW1vdmUgbWFzdGVyIGV2ZW50IGxpc3RlbmVyc1xuICBpZiAodGhpcy5yb290RWxlbWVudCkge1xuICAgIGZvciAoZXZlbnRUeXBlIGluIGxpc3RlbmVyTWFwWzFdKSB7XG4gICAgICBpZiAobGlzdGVuZXJNYXBbMV0uaGFzT3duUHJvcGVydHkoZXZlbnRUeXBlKSkge1xuICAgICAgICB0aGlzLnJvb3RFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLmhhbmRsZSwgdHJ1ZSk7XG4gICAgICB9XG4gICAgfVxuICAgIGZvciAoZXZlbnRUeXBlIGluIGxpc3RlbmVyTWFwWzBdKSB7XG4gICAgICBpZiAobGlzdGVuZXJNYXBbMF0uaGFzT3duUHJvcGVydHkoZXZlbnRUeXBlKSkge1xuICAgICAgICB0aGlzLnJvb3RFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLmhhbmRsZSwgZmFsc2UpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIC8vIElmIG5vIHJvb3Qgb3Igcm9vdCBpcyBub3RcbiAgLy8gYSBkb20gbm9kZSwgdGhlbiByZW1vdmUgaW50ZXJuYWxcbiAgLy8gcm9vdCByZWZlcmVuY2UgYW5kIGV4aXQgaGVyZVxuICBpZiAoIXJvb3QgfHwgIXJvb3QuYWRkRXZlbnRMaXN0ZW5lcikge1xuICAgIGlmICh0aGlzLnJvb3RFbGVtZW50KSB7XG4gICAgICBkZWxldGUgdGhpcy5yb290RWxlbWVudDtcbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvKipcbiAgICogVGhlIHJvb3Qgbm9kZSBhdCB3aGljaFxuICAgKiBsaXN0ZW5lcnMgYXJlIGF0dGFjaGVkLlxuICAgKlxuICAgKiBAdHlwZSBOb2RlXG4gICAqL1xuICB0aGlzLnJvb3RFbGVtZW50ID0gcm9vdDtcblxuICAvLyBTZXQgdXAgbWFzdGVyIGV2ZW50IGxpc3RlbmVyc1xuICBmb3IgKGV2ZW50VHlwZSBpbiBsaXN0ZW5lck1hcFsxXSkge1xuICAgIGlmIChsaXN0ZW5lck1hcFsxXS5oYXNPd25Qcm9wZXJ0eShldmVudFR5cGUpKSB7XG4gICAgICB0aGlzLnJvb3RFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLmhhbmRsZSwgdHJ1ZSk7XG4gICAgfVxuICB9XG4gIGZvciAoZXZlbnRUeXBlIGluIGxpc3RlbmVyTWFwWzBdKSB7XG4gICAgaWYgKGxpc3RlbmVyTWFwWzBdLmhhc093blByb3BlcnR5KGV2ZW50VHlwZSkpIHtcbiAgICAgIHRoaXMucm9vdEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMuaGFuZGxlLCBmYWxzZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIEBwYXJhbSB7c3RyaW5nfSBldmVudFR5cGVcbiAqIEByZXR1cm5zIGJvb2xlYW5cbiAqL1xuRGVsZWdhdGUucHJvdG90eXBlLmNhcHR1cmVGb3JUeXBlID0gZnVuY3Rpb24oZXZlbnRUeXBlKSB7XG4gIHJldHVybiBbJ2JsdXInLCAnZXJyb3InLCAnZm9jdXMnLCAnbG9hZCcsICdyZXNpemUnLCAnc2Nyb2xsJ10uaW5kZXhPZihldmVudFR5cGUpICE9PSAtMTtcbn07XG5cbi8qKlxuICogQXR0YWNoIGEgaGFuZGxlciB0byBvbmVcbiAqIGV2ZW50IGZvciBhbGwgZWxlbWVudHNcbiAqIHRoYXQgbWF0Y2ggdGhlIHNlbGVjdG9yLFxuICogbm93IG9yIGluIHRoZSBmdXR1cmVcbiAqXG4gKiBUaGUgaGFuZGxlciBmdW5jdGlvbiByZWNlaXZlc1xuICogdGhyZWUgYXJndW1lbnRzOiB0aGUgRE9NIGV2ZW50XG4gKiBvYmplY3QsIHRoZSBub2RlIHRoYXQgbWF0Y2hlZFxuICogdGhlIHNlbGVjdG9yIHdoaWxlIHRoZSBldmVudFxuICogd2FzIGJ1YmJsaW5nIGFuZCBhIHJlZmVyZW5jZVxuICogdG8gaXRzZWxmLiBXaXRoaW4gdGhlIGhhbmRsZXIsXG4gKiAndGhpcycgaXMgZXF1YWwgdG8gdGhlIHNlY29uZFxuICogYXJndW1lbnQuXG4gKlxuICogVGhlIG5vZGUgdGhhdCBhY3R1YWxseSByZWNlaXZlZFxuICogdGhlIGV2ZW50IGNhbiBiZSBhY2Nlc3NlZCB2aWFcbiAqICdldmVudC50YXJnZXQnLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBldmVudFR5cGUgTGlzdGVuIGZvciB0aGVzZSBldmVudHNcbiAqIEBwYXJhbSB7c3RyaW5nfHVuZGVmaW5lZH0gc2VsZWN0b3IgT25seSBoYW5kbGUgZXZlbnRzIG9uIGVsZW1lbnRzIG1hdGNoaW5nIHRoaXMgc2VsZWN0b3IsIGlmIHVuZGVmaW5lZCBtYXRjaCByb290IGVsZW1lbnRcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oKX0gaGFuZGxlciBIYW5kbGVyIGZ1bmN0aW9uIC0gZXZlbnQgZGF0YSBwYXNzZWQgaGVyZSB3aWxsIGJlIGluIGV2ZW50LmRhdGFcbiAqIEBwYXJhbSB7T2JqZWN0fSBbZXZlbnREYXRhXSBEYXRhIHRvIHBhc3MgaW4gZXZlbnQuZGF0YVxuICogQHJldHVybnMge0RlbGVnYXRlfSBUaGlzIG1ldGhvZCBpcyBjaGFpbmFibGVcbiAqL1xuRGVsZWdhdGUucHJvdG90eXBlLm9uID0gZnVuY3Rpb24oZXZlbnRUeXBlLCBzZWxlY3RvciwgaGFuZGxlciwgdXNlQ2FwdHVyZSkge1xuICB2YXIgcm9vdCwgbGlzdGVuZXJNYXAsIG1hdGNoZXIsIG1hdGNoZXJQYXJhbTtcblxuICBpZiAoIWV2ZW50VHlwZSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0ludmFsaWQgZXZlbnQgdHlwZTogJyArIGV2ZW50VHlwZSk7XG4gIH1cblxuICAvLyBoYW5kbGVyIGNhbiBiZSBwYXNzZWQgYXNcbiAgLy8gdGhlIHNlY29uZCBvciB0aGlyZCBhcmd1bWVudFxuICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdXNlQ2FwdHVyZSA9IGhhbmRsZXI7XG4gICAgaGFuZGxlciA9IHNlbGVjdG9yO1xuICAgIHNlbGVjdG9yID0gbnVsbDtcbiAgfVxuXG4gIC8vIEZhbGxiYWNrIHRvIHNlbnNpYmxlIGRlZmF1bHRzXG4gIC8vIGlmIHVzZUNhcHR1cmUgbm90IHNldFxuICBpZiAodXNlQ2FwdHVyZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdXNlQ2FwdHVyZSA9IHRoaXMuY2FwdHVyZUZvclR5cGUoZXZlbnRUeXBlKTtcbiAgfVxuXG4gIGlmICh0eXBlb2YgaGFuZGxlciAhPT0gJ2Z1bmN0aW9uJykge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoJ0hhbmRsZXIgbXVzdCBiZSBhIHR5cGUgb2YgRnVuY3Rpb24nKTtcbiAgfVxuXG4gIHJvb3QgPSB0aGlzLnJvb3RFbGVtZW50O1xuICBsaXN0ZW5lck1hcCA9IHRoaXMubGlzdGVuZXJNYXBbdXNlQ2FwdHVyZSA/IDEgOiAwXTtcblxuICAvLyBBZGQgbWFzdGVyIGhhbmRsZXIgZm9yIHR5cGUgaWYgbm90IGNyZWF0ZWQgeWV0XG4gIGlmICghbGlzdGVuZXJNYXBbZXZlbnRUeXBlXSkge1xuICAgIGlmIChyb290KSB7XG4gICAgICByb290LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLmhhbmRsZSwgdXNlQ2FwdHVyZSk7XG4gICAgfVxuICAgIGxpc3RlbmVyTWFwW2V2ZW50VHlwZV0gPSBbXTtcbiAgfVxuXG4gIGlmICghc2VsZWN0b3IpIHtcbiAgICBtYXRjaGVyUGFyYW0gPSBudWxsO1xuXG4gICAgLy8gQ09NUExFWCAtIG1hdGNoZXNSb290IG5lZWRzIHRvIGhhdmUgYWNjZXNzIHRvXG4gICAgLy8gdGhpcy5yb290RWxlbWVudCwgc28gYmluZCB0aGUgZnVuY3Rpb24gdG8gdGhpcy5cbiAgICBtYXRjaGVyID0gbWF0Y2hlc1Jvb3QuYmluZCh0aGlzKTtcblxuICAvLyBDb21waWxlIGEgbWF0Y2hlciBmb3IgdGhlIGdpdmVuIHNlbGVjdG9yXG4gIH0gZWxzZSBpZiAoL15bYS16XSskL2kudGVzdChzZWxlY3RvcikpIHtcbiAgICBtYXRjaGVyUGFyYW0gPSBzZWxlY3RvcjtcbiAgICBtYXRjaGVyID0gbWF0Y2hlc1RhZztcbiAgfSBlbHNlIGlmICgvXiNbYS16MC05XFwtX10rJC9pLnRlc3Qoc2VsZWN0b3IpKSB7XG4gICAgbWF0Y2hlclBhcmFtID0gc2VsZWN0b3Iuc2xpY2UoMSk7XG4gICAgbWF0Y2hlciA9IG1hdGNoZXNJZDtcbiAgfSBlbHNlIHtcbiAgICBtYXRjaGVyUGFyYW0gPSBzZWxlY3RvcjtcbiAgICBtYXRjaGVyID0gbWF0Y2hlcztcbiAgfVxuXG4gIC8vIEFkZCB0byB0aGUgbGlzdCBvZiBsaXN0ZW5lcnNcbiAgbGlzdGVuZXJNYXBbZXZlbnRUeXBlXS5wdXNoKHtcbiAgICBzZWxlY3Rvcjogc2VsZWN0b3IsXG4gICAgaGFuZGxlcjogaGFuZGxlcixcbiAgICBtYXRjaGVyOiBtYXRjaGVyLFxuICAgIG1hdGNoZXJQYXJhbTogbWF0Y2hlclBhcmFtXG4gIH0pO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgYW4gZXZlbnQgaGFuZGxlclxuICogZm9yIGVsZW1lbnRzIHRoYXQgbWF0Y2hcbiAqIHRoZSBzZWxlY3RvciwgZm9yZXZlclxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBbZXZlbnRUeXBlXSBSZW1vdmUgaGFuZGxlcnMgZm9yIGV2ZW50cyBtYXRjaGluZyB0aGlzIHR5cGUsIGNvbnNpZGVyaW5nIHRoZSBvdGhlciBwYXJhbWV0ZXJzXG4gKiBAcGFyYW0ge3N0cmluZ30gW3NlbGVjdG9yXSBJZiB0aGlzIHBhcmFtZXRlciBpcyBvbWl0dGVkLCBvbmx5IGhhbmRsZXJzIHdoaWNoIG1hdGNoIHRoZSBvdGhlciB0d28gd2lsbCBiZSByZW1vdmVkXG4gKiBAcGFyYW0ge2Z1bmN0aW9uKCl9IFtoYW5kbGVyXSBJZiB0aGlzIHBhcmFtZXRlciBpcyBvbWl0dGVkLCBvbmx5IGhhbmRsZXJzIHdoaWNoIG1hdGNoIHRoZSBwcmV2aW91cyB0d28gd2lsbCBiZSByZW1vdmVkXG4gKiBAcmV0dXJucyB7RGVsZWdhdGV9IFRoaXMgbWV0aG9kIGlzIGNoYWluYWJsZVxuICovXG5EZWxlZ2F0ZS5wcm90b3R5cGUub2ZmID0gZnVuY3Rpb24oZXZlbnRUeXBlLCBzZWxlY3RvciwgaGFuZGxlciwgdXNlQ2FwdHVyZSkge1xuICB2YXIgaSwgbGlzdGVuZXIsIGxpc3RlbmVyTWFwLCBsaXN0ZW5lckxpc3QsIHNpbmdsZUV2ZW50VHlwZTtcblxuICAvLyBIYW5kbGVyIGNhbiBiZSBwYXNzZWQgYXNcbiAgLy8gdGhlIHNlY29uZCBvciB0aGlyZCBhcmd1bWVudFxuICBpZiAodHlwZW9mIHNlbGVjdG9yID09PSAnZnVuY3Rpb24nKSB7XG4gICAgdXNlQ2FwdHVyZSA9IGhhbmRsZXI7XG4gICAgaGFuZGxlciA9IHNlbGVjdG9yO1xuICAgIHNlbGVjdG9yID0gbnVsbDtcbiAgfVxuXG4gIC8vIElmIHVzZUNhcHR1cmUgbm90IHNldCwgcmVtb3ZlXG4gIC8vIGFsbCBldmVudCBsaXN0ZW5lcnNcbiAgaWYgKHVzZUNhcHR1cmUgPT09IHVuZGVmaW5lZCkge1xuICAgIHRoaXMub2ZmKGV2ZW50VHlwZSwgc2VsZWN0b3IsIGhhbmRsZXIsIHRydWUpO1xuICAgIHRoaXMub2ZmKGV2ZW50VHlwZSwgc2VsZWN0b3IsIGhhbmRsZXIsIGZhbHNlKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVyTWFwID0gdGhpcy5saXN0ZW5lck1hcFt1c2VDYXB0dXJlID8gMSA6IDBdO1xuICBpZiAoIWV2ZW50VHlwZSkge1xuICAgIGZvciAoc2luZ2xlRXZlbnRUeXBlIGluIGxpc3RlbmVyTWFwKSB7XG4gICAgICBpZiAobGlzdGVuZXJNYXAuaGFzT3duUHJvcGVydHkoc2luZ2xlRXZlbnRUeXBlKSkge1xuICAgICAgICB0aGlzLm9mZihzaW5nbGVFdmVudFR5cGUsIHNlbGVjdG9yLCBoYW5kbGVyKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVyTGlzdCA9IGxpc3RlbmVyTWFwW2V2ZW50VHlwZV07XG4gIGlmICghbGlzdGVuZXJMaXN0IHx8ICFsaXN0ZW5lckxpc3QubGVuZ3RoKSB7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBSZW1vdmUgb25seSBwYXJhbWV0ZXIgbWF0Y2hlc1xuICAvLyBpZiBzcGVjaWZpZWRcbiAgZm9yIChpID0gbGlzdGVuZXJMaXN0Lmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSB7XG4gICAgbGlzdGVuZXIgPSBsaXN0ZW5lckxpc3RbaV07XG5cbiAgICBpZiAoKCFzZWxlY3RvciB8fCBzZWxlY3RvciA9PT0gbGlzdGVuZXIuc2VsZWN0b3IpICYmICghaGFuZGxlciB8fCBoYW5kbGVyID09PSBsaXN0ZW5lci5oYW5kbGVyKSkge1xuICAgICAgbGlzdGVuZXJMaXN0LnNwbGljZShpLCAxKTtcbiAgICB9XG4gIH1cblxuICAvLyBBbGwgbGlzdGVuZXJzIHJlbW92ZWRcbiAgaWYgKCFsaXN0ZW5lckxpc3QubGVuZ3RoKSB7XG4gICAgZGVsZXRlIGxpc3RlbmVyTWFwW2V2ZW50VHlwZV07XG5cbiAgICAvLyBSZW1vdmUgdGhlIG1haW4gaGFuZGxlclxuICAgIGlmICh0aGlzLnJvb3RFbGVtZW50KSB7XG4gICAgICB0aGlzLnJvb3RFbGVtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLmhhbmRsZSwgdXNlQ2FwdHVyZSk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5cbi8qKlxuICogSGFuZGxlIGFuIGFyYml0cmFyeSBldmVudC5cbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldmVudFxuICovXG5EZWxlZ2F0ZS5wcm90b3R5cGUuaGFuZGxlID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIGksIGwsIHR5cGUgPSBldmVudC50eXBlLCByb290LCBwaGFzZSwgbGlzdGVuZXIsIHJldHVybmVkLCBsaXN0ZW5lckxpc3QgPSBbXSwgdGFyZ2V0LCAvKiogQGNvbnN0ICovIEVWRU5USUdOT1JFID0gJ2Z0TGFic0RlbGVnYXRlSWdub3JlJztcblxuICBpZiAoZXZlbnRbRVZFTlRJR05PUkVdID09PSB0cnVlKSB7XG4gICAgcmV0dXJuO1xuICB9XG5cbiAgdGFyZ2V0ID0gZXZlbnQudGFyZ2V0O1xuXG4gIC8vIEhhcmRjb2RlIHZhbHVlIG9mIE5vZGUuVEVYVF9OT0RFXG4gIC8vIGFzIG5vdCBkZWZpbmVkIGluIElFOFxuICBpZiAodGFyZ2V0Lm5vZGVUeXBlID09PSAzKSB7XG4gICAgdGFyZ2V0ID0gdGFyZ2V0LnBhcmVudE5vZGU7XG4gIH1cblxuICByb290ID0gdGhpcy5yb290RWxlbWVudDtcblxuICBwaGFzZSA9IGV2ZW50LmV2ZW50UGhhc2UgfHwgKCBldmVudC50YXJnZXQgIT09IGV2ZW50LmN1cnJlbnRUYXJnZXQgPyAzIDogMiApO1xuICBcbiAgc3dpdGNoIChwaGFzZSkge1xuICAgIGNhc2UgMTogLy9FdmVudC5DQVBUVVJJTkdfUEhBU0U6XG4gICAgICBsaXN0ZW5lckxpc3QgPSB0aGlzLmxpc3RlbmVyTWFwWzFdW3R5cGVdO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgMjogLy9FdmVudC5BVF9UQVJHRVQ6XG4gICAgICBpZiAodGhpcy5saXN0ZW5lck1hcFswXSAmJiB0aGlzLmxpc3RlbmVyTWFwWzBdW3R5cGVdKSBsaXN0ZW5lckxpc3QgPSBsaXN0ZW5lckxpc3QuY29uY2F0KHRoaXMubGlzdGVuZXJNYXBbMF1bdHlwZV0pO1xuICAgICAgaWYgKHRoaXMubGlzdGVuZXJNYXBbMV0gJiYgdGhpcy5saXN0ZW5lck1hcFsxXVt0eXBlXSkgbGlzdGVuZXJMaXN0ID0gbGlzdGVuZXJMaXN0LmNvbmNhdCh0aGlzLmxpc3RlbmVyTWFwWzFdW3R5cGVdKTtcbiAgICBicmVhaztcbiAgICBjYXNlIDM6IC8vRXZlbnQuQlVCQkxJTkdfUEhBU0U6XG4gICAgICBsaXN0ZW5lckxpc3QgPSB0aGlzLmxpc3RlbmVyTWFwWzBdW3R5cGVdO1xuICAgIGJyZWFrO1xuICB9XG5cbiAgLy8gTmVlZCB0byBjb250aW51b3VzbHkgY2hlY2tcbiAgLy8gdGhhdCB0aGUgc3BlY2lmaWMgbGlzdCBpc1xuICAvLyBzdGlsbCBwb3B1bGF0ZWQgaW4gY2FzZSBvbmVcbiAgLy8gb2YgdGhlIGNhbGxiYWNrcyBhY3R1YWxseVxuICAvLyBjYXVzZXMgdGhlIGxpc3QgdG8gYmUgZGVzdHJveWVkLlxuICBsID0gbGlzdGVuZXJMaXN0Lmxlbmd0aDtcbiAgd2hpbGUgKHRhcmdldCAmJiBsKSB7XG4gICAgZm9yIChpID0gMDsgaSA8IGw7IGkrKykge1xuICAgICAgbGlzdGVuZXIgPSBsaXN0ZW5lckxpc3RbaV07XG5cbiAgICAgIC8vIEJhaWwgZnJvbSB0aGlzIGxvb3AgaWZcbiAgICAgIC8vIHRoZSBsZW5ndGggY2hhbmdlZCBhbmRcbiAgICAgIC8vIG5vIG1vcmUgbGlzdGVuZXJzIGFyZVxuICAgICAgLy8gZGVmaW5lZCBiZXR3ZWVuIGkgYW5kIGwuXG4gICAgICBpZiAoIWxpc3RlbmVyKSB7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuXG4gICAgICAvLyBDaGVjayBmb3IgbWF0Y2ggYW5kIGZpcmVcbiAgICAgIC8vIHRoZSBldmVudCBpZiB0aGVyZSdzIG9uZVxuICAgICAgLy9cbiAgICAgIC8vIFRPRE86TUNHOjIwMTIwMTE3OiBOZWVkIGEgd2F5XG4gICAgICAvLyB0byBjaGVjayBpZiBldmVudCNzdG9wSW1tZWRpYXRlUHJvcGFnYXRpb25cbiAgICAgIC8vIHdhcyBjYWxsZWQuIElmIHNvLCBicmVhayBib3RoIGxvb3BzLlxuICAgICAgaWYgKGxpc3RlbmVyLm1hdGNoZXIuY2FsbCh0YXJnZXQsIGxpc3RlbmVyLm1hdGNoZXJQYXJhbSwgdGFyZ2V0KSkge1xuICAgICAgICByZXR1cm5lZCA9IHRoaXMuZmlyZShldmVudCwgdGFyZ2V0LCBsaXN0ZW5lcik7XG4gICAgICB9XG5cbiAgICAgIC8vIFN0b3AgcHJvcGFnYXRpb24gdG8gc3Vic2VxdWVudFxuICAgICAgLy8gY2FsbGJhY2tzIGlmIHRoZSBjYWxsYmFjayByZXR1cm5lZFxuICAgICAgLy8gZmFsc2VcbiAgICAgIGlmIChyZXR1cm5lZCA9PT0gZmFsc2UpIHtcbiAgICAgICAgZXZlbnRbRVZFTlRJR05PUkVdID0gdHJ1ZTtcbiAgICAgICAgZXZlbnQucHJldmVudERlZmF1bHQoKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRPRE86TUNHOjIwMTIwMTE3OiBOZWVkIGEgd2F5IHRvXG4gICAgLy8gY2hlY2sgaWYgZXZlbnQjc3RvcFByb3BhZ2F0aW9uXG4gICAgLy8gd2FzIGNhbGxlZC4gSWYgc28sIGJyZWFrIGxvb3BpbmdcbiAgICAvLyB0aHJvdWdoIHRoZSBET00uIFN0b3AgaWYgdGhlXG4gICAgLy8gZGVsZWdhdGlvbiByb290IGhhcyBiZWVuIHJlYWNoZWRcbiAgICBpZiAodGFyZ2V0ID09PSByb290KSB7XG4gICAgICBicmVhaztcbiAgICB9XG5cbiAgICBsID0gbGlzdGVuZXJMaXN0Lmxlbmd0aDtcbiAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50RWxlbWVudDtcbiAgfVxufTtcblxuLyoqXG4gKiBGaXJlIGEgbGlzdGVuZXIgb24gYSB0YXJnZXQuXG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAqIEBwYXJhbSB7Tm9kZX0gdGFyZ2V0XG4gKiBAcGFyYW0ge09iamVjdH0gbGlzdGVuZXJcbiAqIEByZXR1cm5zIHtib29sZWFufVxuICovXG5EZWxlZ2F0ZS5wcm90b3R5cGUuZmlyZSA9IGZ1bmN0aW9uKGV2ZW50LCB0YXJnZXQsIGxpc3RlbmVyKSB7XG4gIHJldHVybiBsaXN0ZW5lci5oYW5kbGVyLmNhbGwodGFyZ2V0LCBldmVudCwgdGFyZ2V0KTtcbn07XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBhbiBlbGVtZW50XG4gKiBtYXRjaGVzIGEgZ2VuZXJpYyBzZWxlY3Rvci5cbiAqXG4gKiBAdHlwZSBmdW5jdGlvbigpXG4gKiBAcGFyYW0ge3N0cmluZ30gc2VsZWN0b3IgQSBDU1Mgc2VsZWN0b3JcbiAqL1xudmFyIG1hdGNoZXMgPSAoZnVuY3Rpb24oZWwpIHtcbiAgaWYgKCFlbCkgcmV0dXJuO1xuICB2YXIgcCA9IGVsLnByb3RvdHlwZTtcbiAgcmV0dXJuIChwLm1hdGNoZXMgfHwgcC5tYXRjaGVzU2VsZWN0b3IgfHwgcC53ZWJraXRNYXRjaGVzU2VsZWN0b3IgfHwgcC5tb3pNYXRjaGVzU2VsZWN0b3IgfHwgcC5tc01hdGNoZXNTZWxlY3RvciB8fCBwLm9NYXRjaGVzU2VsZWN0b3IpO1xufShFbGVtZW50KSk7XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBhbiBlbGVtZW50XG4gKiBtYXRjaGVzIGEgdGFnIHNlbGVjdG9yLlxuICpcbiAqIFRhZ3MgYXJlIE5PVCBjYXNlLXNlbnNpdGl2ZSxcbiAqIGV4Y2VwdCBpbiBYTUwgKGFuZCBYTUwtYmFzZWRcbiAqIGxhbmd1YWdlcyBzdWNoIGFzIFhIVE1MKS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gdGFnTmFtZSBUaGUgdGFnIG5hbWUgdG8gdGVzdCBhZ2FpbnN0XG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdG8gdGVzdCB3aXRoXG4gKiBAcmV0dXJucyBib29sZWFuXG4gKi9cbmZ1bmN0aW9uIG1hdGNoZXNUYWcodGFnTmFtZSwgZWxlbWVudCkge1xuICByZXR1cm4gdGFnTmFtZS50b0xvd2VyQ2FzZSgpID09PSBlbGVtZW50LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGFuIGVsZW1lbnRcbiAqIG1hdGNoZXMgdGhlIHJvb3QuXG4gKlxuICogQHBhcmFtIHs/U3RyaW5nfSBzZWxlY3RvciBJbiB0aGlzIGNhc2UgdGhpcyBpcyBhbHdheXMgcGFzc2VkIHRocm91Z2ggYXMgbnVsbCBhbmQgbm90IHVzZWRcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0byB0ZXN0IHdpdGhcbiAqIEByZXR1cm5zIGJvb2xlYW5cbiAqL1xuZnVuY3Rpb24gbWF0Y2hlc1Jvb3Qoc2VsZWN0b3IsIGVsZW1lbnQpIHtcbiAgLypqc2hpbnQgdmFsaWR0aGlzOnRydWUqL1xuICBpZiAodGhpcy5yb290RWxlbWVudCA9PT0gd2luZG93KSByZXR1cm4gZWxlbWVudCA9PT0gZG9jdW1lbnQ7XG4gIHJldHVybiB0aGlzLnJvb3RFbGVtZW50ID09PSBlbGVtZW50O1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgdGhlIElEIG9mXG4gKiB0aGUgZWxlbWVudCBpbiAndGhpcydcbiAqIG1hdGNoZXMgdGhlIGdpdmVuIElELlxuICpcbiAqIElEcyBhcmUgY2FzZS1zZW5zaXRpdmUuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGlkIFRoZSBJRCB0byB0ZXN0IGFnYWluc3RcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0byB0ZXN0IHdpdGhcbiAqIEByZXR1cm5zIGJvb2xlYW5cbiAqL1xuZnVuY3Rpb24gbWF0Y2hlc0lkKGlkLCBlbGVtZW50KSB7XG4gIHJldHVybiBpZCA9PT0gZWxlbWVudC5pZDtcbn1cblxuLyoqXG4gKiBTaG9ydCBoYW5kIGZvciBvZmYoKVxuICogYW5kIHJvb3QoKSwgaWUgYm90aFxuICogd2l0aCBubyBwYXJhbWV0ZXJzXG4gKlxuICogQHJldHVybiB2b2lkXG4gKi9cbkRlbGVnYXRlLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gIHRoaXMub2ZmKCk7XG4gIHRoaXMucm9vdCgpO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gcmVxdWlyZSgnLi9zcmMvbW9kZWxzL1VzZXInKTtcbiIsIlxuLyoqXG4gKiBFbmNhcHN1bGF0ZXMgYW4gRlQgdXNlclxuICovXG5cbnZhciBVc2VyID0gZnVuY3Rpb24gKGNvb2tpZSkge1xuICAgIHRoaXMuY29va2llID0gKGNvb2tpZSkgPyAnOycgKyBjb29raWUgOiAnJztcbn1cblxuLy8gUmV0dXJucyB0aGUgZVJpZ2h0cyB1c2VyIGlkXG5Vc2VyLnByb3RvdHlwZS5pZCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgcGFydHMgPSB0aGlzLmNvb2tpZS5zcGxpdChcIjsgRlRfVT1cIik7XG4gICAgdmFyIGZ0VSA9IHBhcnRzLnBvcCgpLnNwbGl0KFwiO1wiKS5zaGlmdCgpO1xuICAgIGlmKGZ0VSkge1xuICAgICAgICByZXR1cm4gZnRVLm1hdGNoKC9fRUlEPShcXGQrKV9QSUQvKVsxXTtcbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm47XG4gICAgfVxufVxuXG5Vc2VyLnByb3RvdHlwZS5zZXNzaW9uID0gZnVuY3Rpb24gKCkge1xuICAgIHJldHVybiB0aGlzLmNvb2tpZS5tYXRjaCgvU0tFWT0oLispX1JJLylbMV07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gVXNlcjtcbiIsIi8vIFN0b3JlcyBhIHVuaXF1ZSBsaXN0IG9mIHRoaW5ncyAoRWcsIHNlY3Rpb25zLCBmYXZvdXJpdGVzLCBoaXN0b3J5KSBhZ2FpbnN0IGFcbi8vIGtleSBpbiBsb2NhbFN0b3JhZ2VcblxudmFyIHJlcXdlc3QgPSByZXF1aXJlKCcuLi92ZW5kb3IvcmVxd2VzdC5taW4nKTtcblxudmFyIEFQSV9VUkwgPSAnaHR0cDovL2Z0LW5leHQtYXBpLXVzZXItcHJlZnMuaGVyb2t1YXBwLmNvbS91c2VyLyc7XG5cbnZhciBlbWl0ID0gZnVuY3Rpb24obmFtZSwgZGF0YSkge1xuICB2YXIgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgZXZlbnQuaW5pdEV2ZW50KG5hbWUsIHRydWUsIHRydWUpO1xuICBpZiAoZGF0YSkge1xuICAgIGV2ZW50LmRldGFpbCA9IGRhdGE7XG4gIH1cbiAgdG9wLmRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xufTtcblxuXG52YXIgTWUgPSBmdW5jdGlvbiAoa2V5LCB1c2VySWQpIHtcbiAgaWYgKCFrZXkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ1lvdSBtdXN0IHN1cHBseSBhIGtleSAvXlthLXpdKyQvJyk7XG4gIH1cbiAgdGhpcy5rZXkgPSBrZXk7XG5cbiAgdGhpcy5sb2NhbFN0b3JhZ2VLZXkgPSAnZnQubmV4dC51c2VyLicgKyBrZXk7XG5cbiAgaWYodXNlcklkKSB7XG4gICAgdGhpcy5hcGlVUkwgPSBBUElfVVJMICsga2V5O1xuICAgIHRoaXMudXNlcklkID0gdXNlcklkO1xuICB9ICAgICAgXG4gICAgLy9TdGFydCBvZmYgd2l0aCBsb2NhbCBjb3B5Li4uXG4gICAgdGhpcy52YWwgPSB0aGlzLmdldE9yQ3JlYXRlKCk7XG4gICAgLy9UaGVuIHRyeSBhbmQgZmV0Y2ggc2VydmVyIGNvcHlcbiAgICB0aGlzLmZldGNoKCk7XG5cbiAgfTtcblxuICBNZS5wcm90b3R5cGUuZ2V0ID0gZnVuY3Rpb24gKGtleSkge1xuICAgIGtleSA9IGtleSB8fCB0aGlzLmxvY2FsU3RvcmFnZUtleTtcbiAgICB2YXIgZXhpc3RzID0gbG9jYWxTdG9yYWdlLmdldEl0ZW0oa2V5KTtcbiAgICBpZiAoZXhpc3RzKSB7XG4gICAgICByZXR1cm4gSlNPTi5wYXJzZShleGlzdHMpO1xuICAgIH0gZWxzZSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICB9O1xuXG4gIE1lLnByb3RvdHlwZS5nZXRPckNyZWF0ZSA9IGZ1bmN0aW9uIChrZXkpIHtcbiAgICBrZXkgPSBrZXkgfHwgdGhpcy5sb2NhbFN0b3JhZ2VLZXk7XG4gICAgdmFyIHNhdmVkID0gdGhpcy5nZXQoa2V5KTtcbiAgICBpZihzYXZlZCkge1xuICAgICAgcmV0dXJuIHNhdmVkO1xuICAgIH0gZWxzZSB7XG4gICAgICB2YXIgZW1wdHkgPSBbXTtcbiAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKGtleSwgSlNPTi5zdHJpbmdpZnkoZW1wdHkpKTtcbiAgICAgIHJldHVybiBlbXB0eTtcbiAgICB9XG4gIH07XG5cbiAgTWUucHJvdG90eXBlLmZldGNoID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgLy9JZiBubyB1c2VySUQgZG9uJ3QgZmV0Y2ggZnJvbSBzZXJ2ZXJcbiAgICBpZighdGhpcy51c2VySWQpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICByZXF3ZXN0KHtcbiAgICAgIHVybDogdGhpcy5hcGlVUkwsXG4gICAgICB0eXBlOiAnanNvbicsXG4gICAgICBtZXRob2Q6ICdnZXQnLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnWC1GVC1VSUQnOiB0aGlzLnVzZXJJZFxuICAgICAgfSxcbiAgICAgIGNyb3NzT3JpZ2luOiB0cnVlXG4gICAgfSkudGhlbihmdW5jdGlvbihmYXZlcykge1xuICAgICAgaWYoZmF2ZXMpIHtcbiAgICAgICAgbWUudmFsID0gZmF2ZXM7XG4gICAgICAgIC8vYWNjZXB0IHRoZSBzZXJ2ZXIgY29weSBhcyAndGhlIHRydXRoJy4uLlxuICAgICAgICBtZS5zYXZlKG1lLnZhbCk7XG4gICAgICAgIC8vYnV0IHRoZW4gcHJvY2VzcyBhbnkgbGVmdG92ZXIgcmVxdWVzdHMgbG9jYWxseVxuICAgICAgICBtZS5wcm9jZXNzUGVuZGluZygnYWRkJyk7XG4gICAgICAgIG1lLnByb2Nlc3NQZW5kaW5nKCdyZW1vdmUnKTtcbiAgICAgICAgbWUucHJvY2Vzc1BlbmRpbmcoJ2NsZWFyJyk7XG4gICAgICB9XG4gICAgfSkuYWx3YXlzKGZ1bmN0aW9uKGVycikge1xuICAgICAgLy90cmlnZ2VyIGxvYWQgYW5kIHVwZGF0ZSBldmVudHNcbiAgICAgIGVtaXQobWUua2V5ICsgJzpsb2FkJywgbWUpO1xuICAgICAgZW1pdChtZS5rZXkgKyAnOnVwZGF0ZScsIG1lKTtcbiAgICB9KTsgIFxuICB9O1xuXG4gIE1lLnByb3RvdHlwZS5zYXZlID0gZnVuY3Rpb24gKG9iaiwga2V5KSB7XG4gICAga2V5ID0ga2V5IHx8IHRoaXMubG9jYWxTdG9yYWdlS2V5O1xuICAgIGlmKG9iaiAmJiBvYmoubGVuZ3RoKSB7XG4gICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShrZXksIEpTT04uc3RyaW5naWZ5KG9iaikpOyBcbiAgICB9IGVsc2Uge1xuICAgICAgbG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oa2V5KTtcbiAgICB9XG4gIH07XG5cbiAgTWUucHJvdG90eXBlLmFkZFBlbmRpbmcgPSBmdW5jdGlvbihvYmosIGFjdGlvbikge1xuICAgIHZhciBwZW5kaW5nID0gdGhpcy5nZXRPckNyZWF0ZSh0aGlzLmxvY2FsU3RvcmFnZUtleSArICcuJyArIGFjdGlvbik7XG4gICAgcGVuZGluZy5wdXNoKG9iaik7XG4gICAgLy9pZiB3ZSdyZSBhZGRpbmcgc29tZXRoaW5nLCB0aGVuIGdldCByaWQgb2YgYW55IHBlbmRpbmcgY2xlYXIgcmVxdWVzdHNcbiAgICBpZihhY3Rpb24gPT09ICdhZGQnKSB7XG4gICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbSh0aGlzLmxvY2FsU3RvcmFnZUtleSArICcuY2xlYXInKTtcbiAgICB9XG4gICAgdGhpcy5zYXZlKHBlbmRpbmcsIHRoaXMubG9jYWxTdG9yYWdlS2V5ICsgJy4nICsgYWN0aW9uKTtcbiAgfTtcblxuICBNZS5wcm90b3R5cGUucHJvY2Vzc1BlbmRpbmcgPSBmdW5jdGlvbihhY3Rpb24pIHtcbiAgICB2YXIgbWUgPSB0aGlzO1xuICAgIHZhciBwZW5kaW5nID0gdGhpcy5nZXQodGhpcy5sb2NhbFN0b3JhZ2VLZXkgKyAnLicgKyBhY3Rpb24pO1xuICAgIGlmKHBlbmRpbmcgJiYgcGVuZGluZy5sZW5ndGgpIHtcbiAgICAgIC8vQ2xlYXIgaXMgYSBzcGVjaWFsIGNhc2VcbiAgICAgIGlmKGFjdGlvbiA9PT0gJ2NsZWFyJykge1xuICAgICAgICBpZihwZW5kaW5nW3BlbmRpbmcubGVuZ3RoIC0gMV0gPT09IHRydWUpIHtcbiAgICAgICAgICBtZS5jbGVhcigpO1xuICAgICAgICAgIHBlbmRpbmcgPSBudWxsO1xuICAgICAgICB9XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBwZW5kaW5nLmZvckVhY2goZnVuY3Rpb24oaXRlbVRvQWRkLCBpbmRleCkge1xuICAgICAgICAgICAvLyByZW1vdmUgdGhlIGl0ZW0gZnJvbSB0aGUgdG9kbyBsaXN0IGFuZCBleGVjdXRlIHRoZSBhY3Rpb24gXG4gICAgICAgICAgIHBlbmRpbmcuc3BsaWNlKGluZGV4LCAxKTtcbiAgICAgICAgICAgbWVbYWN0aW9uXShpdGVtVG9BZGQpO1xuICAgICAgICAgfSk7XG4gICAgICB9XG4gICAgICB0aGlzLnNhdmUocGVuZGluZywgdGhpcy5sb2NhbFN0b3JhZ2VLZXkgKyAnLicgKyBhY3Rpb24pO1xuICAgIH1cblxuICB9O1xuXG4gIE1lLnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAob2JqKSB7XG4gICAgdmFyIG1lID0gdGhpcztcbiAgICB0aGlzLnZhbCA9IHRoaXMuZ2V0T3JDcmVhdGUoKTtcbiAgICBpZiAoIXRoaXMuZXhpc3RzKG9iai51dWlkdjMpKSB7XG4gICAgICB0aGlzLnZhbC5wdXNoKG9iaik7XG4gICAgICB0aGlzLnNhdmUodGhpcy52YWwpO1xuICAgICAgZW1pdChtZS5rZXkgKyAnOnVwZGF0ZScsIG1lKTsgLy90cmlnZ2VyIGV2ZW50IHRvIHJlbmRlciBVSVxuXG4gICAgICAvL1NlbmQgYSByZXF1ZXN0IHRvIGFkZCB0byBzZXJ2ZXJcbiAgICAgIGlmKHRoaXMuYXBpVVJMKSB7XG4gICAgICAgIHJlcXdlc3Qoe1xuICAgICAgICAgIHVybDogdGhpcy5hcGlVUkwsXG4gICAgICAgICAgbWV0aG9kOiAncHV0JyxcbiAgICAgICAgICB0eXBlOiAnanNvbicsXG4gICAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICBkYXRhOiBKU09OLnN0cmluZ2lmeShvYmopLFxuICAgICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAgICdYLUZULVVJRCc6IHRoaXMudXNlcklkXG4gICAgICAgICAgfSxcbiAgICAgICAgICBjcm9zc09yaWdpbjogdHJ1ZVxuICAgICAgICB9KS5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG1lLmFkZFBlbmRpbmcob2JqLCAnYWRkJyk7IC8vc2VydmVyIHJlcXVlc3QgZmFpbGVkIHNvIHB1c2ggaXQgdG8gdGhlIGxpc3Qgb2YgcGVuZGluZ1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gIH07XG5cbiAgTWUucHJvdG90eXBlLnJlbW92ZSA9IGZ1bmN0aW9uIChvYmopIHtcbiAgICB2YXIgbWUgPSB0aGlzO1xuXG4gICAgdGhpcy52YWwgPSB0aGlzLmdldE9yQ3JlYXRlKCk7XG4gICAgdGhpcy52YWwgPSB0aGlzLnZhbC5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIChpdGVtLnV1aWR2MyAhPT0gb2JqLnV1aWR2Myk7XG4gICAgfSk7XG4gICAgdGhpcy5zYXZlKHRoaXMudmFsKTtcblxuICAgIGVtaXQobWUua2V5ICsgJzp1cGRhdGUnLCBtZSk7IC8vdHJpZ2dlciBldmVudCB0byByZW5kZXIgVUlcblxuICAgIC8vU2VuZCBhIHJlcXVlc3QgdG8gZGVsZXRlIGZyb20gc2VydmVyXG4gICAgaWYodGhpcy5hcGlVUkwpIHtcblxuICAgICAgcmVxd2VzdCh7XG4gICAgICAgIHVybDogdGhpcy5hcGlVUkwgKyAnLycgKyBlbmNvZGVVUkkoZGVjb2RlVVJJKG9iai51dWlkdjMpKSxcbiAgICAgICAgdHlwZTogJ2pzb24nLFxuICAgICAgICBtZXRob2Q6ICdkZWxldGUnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ1gtRlQtVUlEJzogdGhpcy51c2VySWRcbiAgICAgICAgfSxcbiAgICAgICAgY3Jvc3NPcmlnaW46IHRydWVcbiAgICAgIH0pLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgIG1lLmFkZFBlbmRpbmcob2JqLCAncmVtb3ZlJyk7ICAvL3NlcnZlciByZXF1ZXN0IGZhaWxlZCBzbyBwdXNoIGl0IHRvIHRoZSBsaXN0IG9mIHBlbmRpbmdcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuXG4gIE1lLnByb3RvdHlwZS5leGlzdHMgPSBmdW5jdGlvbiAodXVpZCkge1xuICAgIHRoaXMudmFsID0gdGhpcy5nZXRPckNyZWF0ZSgpO1xuICAgIHJldHVybiB0aGlzLnZhbC5zb21lKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICByZXR1cm4gaXRlbS51dWlkdjMgPT09IHV1aWQ7XG4gICAgfSk7XG4gIH07XG5cbiAgTWUucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBtZSA9IHRoaXM7XG4gICAgdmFyIHN0YXR1cyA9IGxvY2FsU3RvcmFnZS5yZW1vdmVJdGVtKHRoaXMubG9jYWxTdG9yYWdlS2V5KTtcbiAgICB0aGlzLnZhbCA9IFtdO1xuXG4gICAgZW1pdChtZS5rZXkgKyAnOnVwZGF0ZScsIG1lKTsgLy90cmlnZ2VyIGV2ZW50IHRvIHJlbmRlciBVSVxuXG4gICAgICAvL1NlbmQgYSByZXF1ZXN0IHRvIGRlbGV0ZSBBTEwgZnJvbSBzZXJ2ZXJcbiAgICAgIGlmKHRoaXMuYXBpVVJMKSB7XG5cbiAgICAgICAgcmVxd2VzdCh7XG4gICAgICAgICAgdXJsOiB0aGlzLmFwaVVSTCxcbiAgICAgICAgICB0eXBlOiAnanNvbicsXG4gICAgICAgICAgbWV0aG9kOiAnZGVsZXRlJyxcbiAgICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAnWC1GVC1VSUQnOiB0aGlzLnVzZXJJZFxuICAgICAgICAgIH0sXG4gICAgICAgICAgY3Jvc3NPcmlnaW46IHRydWVcbiAgICAgICAgfSkuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgICBtZS5hZGRQZW5kaW5nKHRydWUsICdjbGVhcicpO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIHN0YXR1cztcbiAgICB9O1xuXG5cbiAgICBtb2R1bGUuZXhwb3J0cyA9IE1lO1xuXG4iLCJ2YXIgcmVxd2VzdCA9IHJlcXVpcmUoJy4uL3ZlbmRvci9yZXF3ZXN0Lm1pbicpO1xuXG5cbnZhciBOT1RJRklDQVRJT05TX1VSTCA9ICdodHRwOi8vZnQtbmV4dC1hcGktdXNlci1wcmVmcy5oZXJva3VhcHAuY29tL3VzZXIvbm90aWZpY2F0aW9ucy8nO1xudmFyIGVtaXQgPSBmdW5jdGlvbihuYW1lLCBkYXRhKSB7XG5cdHZhciBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRldmVudC5pbml0RXZlbnQobmFtZSwgdHJ1ZSwgdHJ1ZSk7XG5cdGlmIChkYXRhKSB7XG5cdFx0ZXZlbnQuZGV0YWlsID0gZGF0YTtcblx0fVxuXHR0b3AuZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCk7XG59O1xuXG5cbmZ1bmN0aW9uIGV4dHJhY3RTZWFyY2hUZXJtKHF1ZXJ5U3RyaW5nKSB7XG4gICAgcmV0dXJuIHF1ZXJ5U3RyaW5nLm1hdGNoKC9xPShbXiZdKikvKVsxXTtcbn1cblxudmFyIGdldEN1cnJlbnRTdHJlYW0gPSBmdW5jdGlvbigpIHtcbiAgdmFyIG9uQXJ0aWNsZSA9IC9eXFwvW2EtZjAtOV0rLSguKikvLnRlc3QobG9jYXRpb24ucGF0aG5hbWUpOyAvLyAnMjdhNWUyODYtNDMxNC0xMWU0LThhNDMtMDAxNDRmZWFiZGMwJzsgXG4gIGlmKG9uQXJ0aWNsZSB8fCBsb2NhdGlvbi5wYXRobmFtZS5pbmRleE9mKCcvc2VhcmNoJykgIT09IDApIHsgLy9oYWNreSB3YXkgdG8gZXhjbHVkZSBob21lcGFnZSFcbiAgXHRyZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSB7XG4gIFx0cmV0dXJuIGV4dHJhY3RTZWFyY2hUZXJtKGxvY2F0aW9uLnNlYXJjaCk7XG4gIH1cbn07XG5cblxuZnVuY3Rpb24gTm90aWZpY2F0aW9uUG9sbGVyKHVzZXJQcmVmZXJlbmNlTGlzdCkge1xuXHR0aGlzLnVzZXJQcmVmZXJlbmNlTGlzdCA9IHVzZXJQcmVmZXJlbmNlTGlzdDtcblx0c2V0SW50ZXJ2YWwodGhpcy5wb2xsLmJpbmQodGhpcyksIDEwMDAgKiA2MCAqIDAuMik7IC8vMzAgc2Vjb25kIHBvbGxpbmdcblx0dGhpcy5ub3RpZmljYXRpb25zID0ge307XG5cblx0Ly9DbGVhciBub3RpZmljYXRpb25zIGlmIGEgc3RyZWFtIGhhcyBiZWVuIG9wZW5lbmRcblx0dGhpcy5jdXJyZW50U3RyZWFtID0gZ2V0Q3VycmVudFN0cmVhbSgpO1xuXHRpZihsb2NhdGlvbi5wYXRobmFtZS5pbmRleE9mKCcvZmF2b3VyaXRlcycpID49IDApIHtcblx0XHR0aGlzLmNsZWFyKClcblx0fSBlbHNlIGlmKHRoaXMuY3VycmVudFN0cmVhbSkge1xuXHRcdHRoaXMuY2xlYXIodGhpcy5jdXJyZW50U3RyZWFtKTtcblx0fVxuXG5cdHRoaXMucG9sbCh0cnVlKTsgLy9wYXNzIGZsYWcgdG8gaW5kaWNhdGUgdGhpcyBpcyB0aGUgZmlyc3QgbG9hZFxuXG59XG5cbk5vdGlmaWNhdGlvblBvbGxlci5wcm90b3R5cGUucG9sbCA9IGZ1bmN0aW9uKGZpcnN0TG9hZCkge1xuXHR2YXIgcG9sbGVyID0gdGhpcztcblx0dmFyIG5vdGlmaWNhdGlvblByb21pc2VzID0gW107XG5cdHZhciBuZXdOb3RpZmljYXRpb25zO1xuXHR0aGlzLnVzZXJQcmVmZXJlbmNlTGlzdC5saXN0LmdldCgpLmZvckVhY2goZnVuY3Rpb24oc3RyZWFtKSB7XG5cdFx0Ly9kb24ndCBib3RoZXIgZmV0Y2hpbmcgaWYgeW91IGFyZSBvbiB0aGF0IHN0cmVhbSBjdXJyZW50bHlcblx0XHQoZnVuY3Rpb24oc3RyZWFtKSB7XG5cdFx0XHRpZihzdHJlYW0ucmVzb3VyY2VUeXBlICE9PSAnc3RyZWFtJykge1xuXHRcdFx0XHRyZXR1cm4gZmFsc2U7XG5cdFx0XHR9XG5cdFx0XHRub3RpZmljYXRpb25Qcm9taXNlcy5wdXNoKHJlcXdlc3Qoe1xuXHRcdFx0XHR1cmw6IE5PVElGSUNBVElPTlNfVVJMICsgc3RyZWFtLnV1aWR2Myxcblx0XHRcdFx0dHlwZTogJ2pzb24nLFxuXHRcdFx0XHRtZXRob2Q6ICdnZXQnLFxuXHRcdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdFx0J1gtRlQtVUlEJzogcG9sbGVyLnVzZXJQcmVmZXJlbmNlTGlzdC51c2VySWRcblx0XHRcdFx0fSxcblx0XHRcdFx0Y3Jvc3NPcmlnaW46IHRydWVcblx0XHRcdH0pLnRoZW4oZnVuY3Rpb24obm90aWZpY2F0aW9ucykge1xuXHRcdFx0XHRpZihub3RpZmljYXRpb25zICYmIG5vdGlmaWNhdGlvbnMubGVuZ3RoKSB7XG5cblx0XHRcdFx0XHQvL0lmIHRoZSBzdHJlYW0gaXMgY3VycmVudGx5IG9wZW4sIGVtaXQgYW4gZXZlbnQgd2l0aCB0aGUgbm90aWZpY2F0aW9ucywgYW5kIHRoZW4gY2xlYXIgdGhlbVxuXHRcdFx0XHRcdC8vIChidXQgb25seSBkbyB0aGlzIG9uY2UpXG5cdFx0XHRcdFx0aWYoZmlyc3RMb2FkICYmIHN0cmVhbS51dWlkdjMgPT09IHBvbGxlci5jdXJyZW50U3RyZWFtKSB7XG5cdFx0XHRcdFx0XHRlbWl0KCdub3RpZmljYXRpb25zOm9wZW5lZCcsIHsgdXVpZHYzOiBzdHJlYW0udXVpZHYzLCBub3RpZmljYXRpb25zOiBub3RpZmljYXRpb25zIH0pO1xuXHRcdFx0XHRcdFx0cG9sbGVyLmNsZWFyKHN0cmVhbS51dWlkdjMpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG5ld05vdGlmaWNhdGlvbnMgPSBmaWx0ZXJOZXcocG9sbGVyLm5vdGlmaWNhdGlvbnNbc3RyZWFtLnV1aWR2M10sIG5vdGlmaWNhdGlvbnMpO1xuXG5cdFx0XHRcdFx0aWYoIWZpcnN0TG9hZCAmJiBuZXdOb3RpZmljYXRpb25zLmxlbmd0aCkge1xuXHRcdFx0XHRcdFx0ZW1pdCgnbm90aWZpY2F0aW9uczpuZXcnLCB7IHN0cmVhbTogc3RyZWFtLCBub3RpZmljYXRpb25zOiBuZXdOb3RpZmljYXRpb25zIH0pO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRwb2xsZXIubm90aWZpY2F0aW9uc1tzdHJlYW0udXVpZHYzXSA9IG5vdGlmaWNhdGlvbnM7XG5cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRkZWxldGUgcG9sbGVyLm5vdGlmaWNhdGlvbnNbc3RyZWFtLnV1aWR2M107XG5cdFx0XHRcdH1cblx0XHRcdFx0cG9sbGVyLnJlbmRlcigpO1xuXHRcdFx0fSkpO1xuXG5cdFx0fShzdHJlYW0pKVxuXHRcdFxuXHR9KTtcblxuXHRQcm9taXNlLmFsbChub3RpZmljYXRpb25Qcm9taXNlcykudGhlbihmdW5jdGlvbihzdHJlYW1Ob3RpZmljYXRpb25zKSB7XG5cdFx0aWYocG9sbGVyLm5vdGlmaWNhdGlvbnMpIHtcblx0XHRcdGVtaXQoJ25vdGlmaWNhdGlvbnM6bG9hZCcsIHBvbGxlci5ub3RpZmljYXRpb25zKTtcblx0XHR9XG5cdH0pO1xufTtcblxuZnVuY3Rpb24gZmlsdGVyTmV3KG9yaWdpbmFsTGlzdCwgbmV3TGlzdCkge1xuXHRvcmlnaW5hbExpc3QgPSBvcmlnaW5hbExpc3QgfHwgW107XG5cdG5ld0xpc3QgPSBuZXdMaXN0IHx8IFtdO1xuXHR2YXIgb3JpZ2luYWxJZHMgPSBvcmlnaW5hbExpc3QubWFwKGZ1bmN0aW9uKGl0ZW0pIHsgcmV0dXJuIGl0ZW0uaWQ7IH0pO1xuXHRyZXR1cm4gbmV3TGlzdC5maWx0ZXIoZnVuY3Rpb24obm90aWYpIHsgcmV0dXJuIChvcmlnaW5hbElkcy5pbmRleE9mKG5vdGlmLmlkKSA8IDApOyB9KTtcbn1cblxuZnVuY3Rpb24gcmVuZGVyQmFkZ2UoZWwsIG51bWJlcikge1xuXHR2YXIgYmFkZ2UgPSBlbC5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdqcy1ub3RpZnktYmFkZ2UnKVswXTtcblx0aWYoIWJhZGdlKSB7XG5cdFx0YmFkZ2UgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdzcGFuJyk7XG5cdFx0YmFkZ2UuY2xhc3NOYW1lID0gJ25vdGlmeS1iYWRnZSBqcy1ub3RpZnktYmFkZ2UnO1xuXHRcdGVsLmFwcGVuZENoaWxkKGJhZGdlKTtcblx0fVxuXHRpZihudW1iZXIgPiAwKSB7XG5cdFx0YmFkZ2UucmVtb3ZlQXR0cmlidXRlKCdhcmlhLWhpZGRlbicpO1xuXHRcdGJhZGdlLnRleHRDb250ZW50ID0gbnVtYmVyO1xuXHR9IGVsc2Uge1xuXHRcdGJhZGdlLnNldEF0dHJpYnV0ZSgnYXJpYS1oaWRkZW4nLCAnJyk7XG5cdH1cbn1cblxuTm90aWZpY2F0aW9uUG9sbGVyLnByb3RvdHlwZS5yZW5kZXIgPSBmdW5jdGlvbigpIHtcblx0Zm9yKHZhciBzdHJlYW0gaW4gdGhpcy5ub3RpZmljYXRpb25zKSB7XG5cdFx0bGluayA9IHRoaXMudXNlclByZWZlcmVuY2VMaXN0LmNvbnRhaW5lci5xdWVyeVNlbGVjdG9yKCdbaHJlZj1cIi9zZWFyY2g/cT0nICsgc3RyZWFtICsgJ1wiXScpO1xuXHRcdGlmKGxpbmspIHtcblx0XHRcdHJlbmRlckJhZGdlKGxpbmssIHRoaXMubm90aWZpY2F0aW9uc1tzdHJlYW1dLmxlbmd0aCk7XG5cdFx0fVxuXHR9XG59O1xuXG5Ob3RpZmljYXRpb25Qb2xsZXIucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24odXVpZCkge1xuXHRpZih1dWlkKSB7XG5cdFx0dGhpcy5ub3RpZmljYXRpb25zW3V1aWRdID0gW107XG5cdFx0cmVxd2VzdCh7XG5cdFx0XHR1cmw6IE5PVElGSUNBVElPTlNfVVJMICsgdXVpZCxcblx0XHRcdHR5cGU6ICdqc29uJyxcblx0XHRcdG1ldGhvZDogJ2RlbGV0ZScsXG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdCdYLUZULVVJRCc6IHRoaXMudXNlclByZWZlcmVuY2VMaXN0LnVzZXJJZFxuXHRcdFx0fSxcblx0XHRcdGNyb3NzT3JpZ2luOiB0cnVlXG5cdFx0fSk7XG5cdH0gZWxzZSBpZiAodHlwZW9mIHV1aWQgPT09ICd1bmRlZmluZWQnKSB7XG5cdFx0dGhpcy5ub3RpZmljYXRpb25zID0ge307XG5cdH1cblx0dGhpcy5yZW5kZXIoKTtcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm90aWZpY2F0aW9uUG9sbGVyOyIsInZhciBOb3RpZmljYXRpb25Qb2xsZXIgPSByZXF1aXJlKCcuL05vdGlmaWNhdGlvblBvbGxlcicpO1xudmFyIE1lID0gcmVxdWlyZSgnLi9NZScpO1xuXG52YXIgJCA9IGZ1bmN0aW9uIChzZWxlY3Rvcikge1xuICByZXR1cm4gW10uc2xpY2UuY2FsbChkb2N1bWVudC5xdWVyeVNlbGVjdG9yQWxsKHNlbGVjdG9yKSk7XG59O1xudmFyIGVtaXQgPSBmdW5jdGlvbihuYW1lLCBkYXRhKSB7XG4gIHZhciBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICBldmVudC5pbml0RXZlbnQobmFtZSwgdHJ1ZSwgdHJ1ZSk7XG4gIGlmIChkYXRhKSB7XG4gICAgZXZlbnQuZGV0YWlsID0gZGF0YTtcbiAgfVxuICB0b3AuZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCk7XG59O1xuXG52YXIgZ2V0VXNlcklkID0gZnVuY3Rpb24oKSB7XG4gIHZhciB2YWx1ZSA9IFwiOyBcIiArIGRvY3VtZW50LmNvb2tpZTtcbiAgdmFyIHBhcnRzID0gdmFsdWUuc3BsaXQoXCI7IEZUX1U9XCIpO1xuICB2YXIgZnRVID0gcGFydHMucG9wKCkuc3BsaXQoXCI7XCIpLnNoaWZ0KCk7XG4gIGlmKGZ0VSkge1xuICAgIHJldHVybiBmdFUubWF0Y2goL19FSUQ9KFxcZCspX1BJRC8pWzFdO1xuICB9IGVsc2Uge1xuICAgIHJldHVybjtcbiAgfVxufTtcblxudmFyIFVzZXJQcmVmZXJlbmNlTGlzdCA9IGZ1bmN0aW9uKGNvbnRhaW5lciwgb3B0cykge1xuICB2YXIgc2VsZiA9IHRoaXM7XG4gIHRoaXMudXNlcklkID0gZ2V0VXNlcklkKCk7XG4gIHRoaXMua2V5ID0gY29udGFpbmVyLmdldEF0dHJpYnV0ZSgnZGF0YS11c2VyLXByZWZlcmVuY2UtbGlzdCcpO1xuICB0aGlzLmNvbnRhaW5lciA9IGNvbnRhaW5lcjtcbiAgdGhpcy5ub3RpZnkgPSBvcHRzLm5vdGlmeTtcblxufTtcblxuVXNlclByZWZlcmVuY2VMaXN0LnByb3RvdHlwZS5pbml0ID0gZnVuY3Rpb24oKSB7XG4gIHZhciBzZWxmID0gdGhpcztcbiAgaWYoIXRoaXMudXNlcklkKSB7XG4gICAgdGhpcy5yZW5kZXIoKTtcbiAgfVxuXG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIodGhpcy5rZXkgKyAnOmFkZCcsIGZ1bmN0aW9uKGV2KSB7XG4gICAgc2VsZi5hZGQoZXYuZGV0YWlsKTtcbiAgfSk7XG4gIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIodGhpcy5rZXkgKyAnOnJlbW92ZScsIGZ1bmN0aW9uKGV2KSB7XG4gICAgc2VsZi5yZW1vdmUoZXYuZGV0YWlsKTtcbiAgfSk7XG5cbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcih0aGlzLmtleSArICc6Y2xlYXInLCB0aGlzLmNsZWFyLmJpbmQodGhpcykpO1xuICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKHRoaXMua2V5ICsgJzp1cGRhdGUnLCB0aGlzLnJlbmRlci5iaW5kKHRoaXMpKTtcblxuICAkKCdbZGF0YS1saXN0LXNvdXJjZT1cIicgKyB0aGlzLmtleSArICdcIl0gLmNsZWFyX19idXR0b24nKS5tYXAoZnVuY3Rpb24gKGVsKSB7XG4gICAgZWwuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBzZWxmLmNsZWFyLmJpbmQoc2VsZikpO1xuICB9KTtcblxuICB0aGlzLmxpc3QgPSBuZXcgTWUodGhpcy5rZXksIHRoaXMudXNlcklkKTtcblxuICBpZih0aGlzLm5vdGlmeSA9PT0gdHJ1ZSkge1xuICAgIHRoaXMubm90aWZpZXIgPSBuZXcgTm90aWZpY2F0aW9uUG9sbGVyKHRoaXMpO1xuICB9XG59XG5cblVzZXJQcmVmZXJlbmNlTGlzdC5wcm90b3R5cGUucmVuZGVyID0gZnVuY3Rpb24oKSB7XG4gIHZhciBtZSA9IHRoaXM7XG4gIHZhciBocmVmID0gJyc7XG5cbiAgdmFyIGxpbmtzID0gdGhpcy5saXN0ID8gdGhpcy5saXN0LmdldE9yQ3JlYXRlKCkucmV2ZXJzZSgpIDogW107XG5cbiAgdmFyIGxpbmtzSFRNTCA9IGxpbmtzLm1hcChmdW5jdGlvbiAoc2VjdGlvbikge1xuICAgIGhyZWYgPSBzZWN0aW9uLnJlc291cmNlVHlwZSA9PT0gJ3N0cmVhbScgPyAnL3NlYXJjaD9xPScgKyBzZWN0aW9uLnV1aWR2MyA6ICcvJyArIHNlY3Rpb24udXVpZHYzO1xuICAgIHJldHVybiAnPGxpIGNsYXNzPVwiaXRlbS10eXBlLS0nICsgc2VjdGlvbi5yZXNvdXJjZVR5cGUgKyAnXCI+PGEgaHJlZj1cIicgKyBocmVmICsgJ1wiPicgKyBzZWN0aW9uLmRpc3BsYXlUZXh0ICsgJzwvYT48L2xpPic7XG4gIH0pLmpvaW4oJycpO1xuICBcbiAgaWYodGhpcy5jb250YWluZXIpIHtcbiAgICB0aGlzLmNvbnRhaW5lci5pbm5lckhUTUwgPSAgbGlua3NIVE1MO1xuICB9XG4gIGlmKHRoaXMubm90aWZpZXIpIHtcbiAgICB0aGlzLm5vdGlmaWVyLnJlbmRlcigpO1xuICB9XG59O1xuXG5cblVzZXJQcmVmZXJlbmNlTGlzdC5wcm90b3R5cGUuYWRkID0gZnVuY3Rpb24ob2JqKSB7XG4gIHRoaXMubGlzdC5hZGQob2JqKTtcbn07XG5cblVzZXJQcmVmZXJlbmNlTGlzdC5wcm90b3R5cGUucmVtb3ZlID0gZnVuY3Rpb24ob2JqKSB7XG4gIHRoaXMubGlzdC5yZW1vdmUob2JqKTtcbn07XG5cblVzZXJQcmVmZXJlbmNlTGlzdC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5saXN0LmNsZWFyKCk7XG59O1xuXG5Vc2VyUHJlZmVyZW5jZUxpc3QuaW5pdCA9IGZ1bmN0aW9uKHJvb3RFbCwgb3B0cykge1xuICB2YXIgY29tcG9uZW50cyA9IHt9LCBcbiAgICAgIGZFbHMsIFxuICAgICAgYywgbCwgXG4gICAgICBjb21wb25lbnQ7XG5cbiAgcm9vdEVsID0gcm9vdEVsIHx8IGRvY3VtZW50LmJvZHk7XG4gIC8vc2V0IGNvbmZpZyB3aXRoIG92ZXJyaWRlcyBwYXNzZWQgdGhyb3VnaFxuXG4gIGlmIChyb290RWwucXVlcnlTZWxlY3RvckFsbCkge1xuICAgIGZFbHMgPSByb290RWwucXVlcnlTZWxlY3RvckFsbCgnW2RhdGEtdXNlci1wcmVmZXJlbmNlLWxpc3RdJyk7XG4gICAgZm9yIChjID0gMCwgbCA9IGZFbHMubGVuZ3RoOyBjIDwgbDsgYysrKSB7XG4gICAgICBpZiAoIWZFbHNbY10uaGFzQXR0cmlidXRlKCdkYXRhLW8tYXV0aG9yLWFsZXJ0cy0tanMnKSkge1xuICAgICAgICBjb21wb25lbnQgPSBuZXcgVXNlclByZWZlcmVuY2VMaXN0KGZFbHNbY10sIG9wdHMgfHwge30pO1xuICAgICAgICBjb21wb25lbnQuaW5pdChvcHRzKTtcbiAgICAgICAgY29tcG9uZW50c1tmRWxzW2NdLmdldEF0dHJpYnV0ZSgnZGF0YS11c2VyLXByZWZlcmVuY2UtbGlzdCcpXSA9IGNvbXBvbmVudDtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gY29tcG9uZW50cztcbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBVc2VyUHJlZmVyZW5jZUxpc3Q7XG4iLCJ2YXIgVXNlclByZWZlcmVuY2VMaXN0ID0gcmVxdWlyZSgnLi9saWIvVXNlclByZWZlcmVuY2VMaXN0Jyk7XG5cbm1vZHVsZS5leHBvcnRzID0gVXNlclByZWZlcmVuY2VMaXN0OyIsIi8qIVxuICAqIFJlcXdlc3QhIEEgZ2VuZXJhbCBwdXJwb3NlIFhIUiBjb25uZWN0aW9uIG1hbmFnZXJcbiAgKiBsaWNlbnNlIE1JVCAoYykgRHVzdGluIERpYXogMjAxNFxuICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9kZWQvcmVxd2VzdFxuICAqL1xuIWZ1bmN0aW9uKGUsdCxuKXt0eXBlb2YgbW9kdWxlIT1cInVuZGVmaW5lZFwiJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1uKCk6dHlwZW9mIGRlZmluZT09XCJmdW5jdGlvblwiJiZkZWZpbmUuYW1kP2RlZmluZShuKTp0W2VdPW4oKX0oXCJyZXF3ZXN0XCIsdGhpcyxmdW5jdGlvbigpe2Z1bmN0aW9uIHN1Y2NlZWQoZSl7cmV0dXJuIGh0dHBzUmUudGVzdCh3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wpP3R3b0h1bmRvLnRlc3QoZS5zdGF0dXMpOiEhZS5yZXNwb25zZX1mdW5jdGlvbiBoYW5kbGVSZWFkeVN0YXRlKGUsdCxuKXtyZXR1cm4gZnVuY3Rpb24oKXtpZihlLl9hYm9ydGVkKXJldHVybiBuKGUucmVxdWVzdCk7ZS5yZXF1ZXN0JiZlLnJlcXVlc3RbcmVhZHlTdGF0ZV09PTQmJihlLnJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlPW5vb3Asc3VjY2VlZChlLnJlcXVlc3QpP3QoZS5yZXF1ZXN0KTpuKGUucmVxdWVzdCkpfX1mdW5jdGlvbiBzZXRIZWFkZXJzKGUsdCl7dmFyIG49dC5oZWFkZXJzfHx7fSxyO24uQWNjZXB0PW4uQWNjZXB0fHxkZWZhdWx0SGVhZGVycy5hY2NlcHRbdC50eXBlXXx8ZGVmYXVsdEhlYWRlcnMuYWNjZXB0W1wiKlwiXTt2YXIgaT10eXBlb2YgRm9ybURhdGE9PVwiZnVuY3Rpb25cIiYmdC5kYXRhIGluc3RhbmNlb2YgRm9ybURhdGE7IXQuY3Jvc3NPcmlnaW4mJiFuW3JlcXVlc3RlZFdpdGhdJiYobltyZXF1ZXN0ZWRXaXRoXT1kZWZhdWx0SGVhZGVycy5yZXF1ZXN0ZWRXaXRoKSwhbltjb250ZW50VHlwZV0mJiFpJiYobltjb250ZW50VHlwZV09dC5jb250ZW50VHlwZXx8ZGVmYXVsdEhlYWRlcnMuY29udGVudFR5cGUpO2ZvcihyIGluIG4pbi5oYXNPd25Qcm9wZXJ0eShyKSYmXCJzZXRSZXF1ZXN0SGVhZGVyXCJpbiBlJiZlLnNldFJlcXVlc3RIZWFkZXIocixuW3JdKX1mdW5jdGlvbiBzZXRDcmVkZW50aWFscyhlLHQpe3R5cGVvZiB0LndpdGhDcmVkZW50aWFscyE9XCJ1bmRlZmluZWRcIiYmdHlwZW9mIGUud2l0aENyZWRlbnRpYWxzIT1cInVuZGVmaW5lZFwiJiYoZS53aXRoQ3JlZGVudGlhbHM9ISF0LndpdGhDcmVkZW50aWFscyl9ZnVuY3Rpb24gZ2VuZXJhbENhbGxiYWNrKGUpe2xhc3RWYWx1ZT1lfWZ1bmN0aW9uIHVybGFwcGVuZChlLHQpe3JldHVybiBlKygvXFw/Ly50ZXN0KGUpP1wiJlwiOlwiP1wiKSt0fWZ1bmN0aW9uIGhhbmRsZUpzb25wKGUsdCxuLHIpe3ZhciBpPXVuaXFpZCsrLHM9ZS5qc29ucENhbGxiYWNrfHxcImNhbGxiYWNrXCIsbz1lLmpzb25wQ2FsbGJhY2tOYW1lfHxyZXF3ZXN0LmdldGNhbGxiYWNrUHJlZml4KGkpLHU9bmV3IFJlZ0V4cChcIigoXnxcXFxcP3wmKVwiK3MrXCIpPShbXiZdKylcIiksYT1yLm1hdGNoKHUpLGY9ZG9jLmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIiksbD0wLGM9bmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiTVNJRSAxMC4wXCIpIT09LTE7cmV0dXJuIGE/YVszXT09PVwiP1wiP3I9ci5yZXBsYWNlKHUsXCIkMT1cIitvKTpvPWFbM106cj11cmxhcHBlbmQocixzK1wiPVwiK28pLHdpbltvXT1nZW5lcmFsQ2FsbGJhY2ssZi50eXBlPVwidGV4dC9qYXZhc2NyaXB0XCIsZi5zcmM9cixmLmFzeW5jPSEwLHR5cGVvZiBmLm9ucmVhZHlzdGF0ZWNoYW5nZSE9XCJ1bmRlZmluZWRcIiYmIWMmJihmLmh0bWxGb3I9Zi5pZD1cIl9yZXF3ZXN0X1wiK2kpLGYub25sb2FkPWYub25yZWFkeXN0YXRlY2hhbmdlPWZ1bmN0aW9uKCl7aWYoZltyZWFkeVN0YXRlXSYmZltyZWFkeVN0YXRlXSE9PVwiY29tcGxldGVcIiYmZltyZWFkeVN0YXRlXSE9PVwibG9hZGVkXCJ8fGwpcmV0dXJuITE7Zi5vbmxvYWQ9Zi5vbnJlYWR5c3RhdGVjaGFuZ2U9bnVsbCxmLm9uY2xpY2smJmYub25jbGljaygpLHQobGFzdFZhbHVlKSxsYXN0VmFsdWU9dW5kZWZpbmVkLGhlYWQucmVtb3ZlQ2hpbGQoZiksbD0xfSxoZWFkLmFwcGVuZENoaWxkKGYpLHthYm9ydDpmdW5jdGlvbigpe2Yub25sb2FkPWYub25yZWFkeXN0YXRlY2hhbmdlPW51bGwsbih7fSxcIlJlcXVlc3QgaXMgYWJvcnRlZDogdGltZW91dFwiLHt9KSxsYXN0VmFsdWU9dW5kZWZpbmVkLGhlYWQucmVtb3ZlQ2hpbGQoZiksbD0xfX19ZnVuY3Rpb24gZ2V0UmVxdWVzdChlLHQpe3ZhciBuPXRoaXMubyxyPShuLm1ldGhvZHx8XCJHRVRcIikudG9VcHBlckNhc2UoKSxpPXR5cGVvZiBuPT1cInN0cmluZ1wiP246bi51cmwscz1uLnByb2Nlc3NEYXRhIT09ITEmJm4uZGF0YSYmdHlwZW9mIG4uZGF0YSE9XCJzdHJpbmdcIj9yZXF3ZXN0LnRvUXVlcnlTdHJpbmcobi5kYXRhKTpuLmRhdGF8fG51bGwsbyx1PSExO3JldHVybihuW1widHlwZVwiXT09XCJqc29ucFwifHxyPT1cIkdFVFwiKSYmcyYmKGk9dXJsYXBwZW5kKGkscykscz1udWxsKSxuW1widHlwZVwiXT09XCJqc29ucFwiP2hhbmRsZUpzb25wKG4sZSx0LGkpOihvPW4ueGhyJiZuLnhocihuKXx8eGhyKG4pLG8ub3BlbihyLGksbi5hc3luYz09PSExPyExOiEwKSxzZXRIZWFkZXJzKG8sbiksc2V0Q3JlZGVudGlhbHMobyxuKSx3aW5beERvbWFpblJlcXVlc3RdJiZvIGluc3RhbmNlb2Ygd2luW3hEb21haW5SZXF1ZXN0XT8oby5vbmxvYWQ9ZSxvLm9uZXJyb3I9dCxvLm9ucHJvZ3Jlc3M9ZnVuY3Rpb24oKXt9LHU9ITApOm8ub25yZWFkeXN0YXRlY2hhbmdlPWhhbmRsZVJlYWR5U3RhdGUodGhpcyxlLHQpLG4uYmVmb3JlJiZuLmJlZm9yZShvKSx1P3NldFRpbWVvdXQoZnVuY3Rpb24oKXtvLnNlbmQocyl9LDIwMCk6by5zZW5kKHMpLG8pfWZ1bmN0aW9uIFJlcXdlc3QoZSx0KXt0aGlzLm89ZSx0aGlzLmZuPXQsaW5pdC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9ZnVuY3Rpb24gc2V0VHlwZShlKXtpZihlLm1hdGNoKFwianNvblwiKSlyZXR1cm5cImpzb25cIjtpZihlLm1hdGNoKFwiamF2YXNjcmlwdFwiKSlyZXR1cm5cImpzXCI7aWYoZS5tYXRjaChcInRleHRcIikpcmV0dXJuXCJodG1sXCI7aWYoZS5tYXRjaChcInhtbFwiKSlyZXR1cm5cInhtbFwifWZ1bmN0aW9uIGluaXQobyxmbil7ZnVuY3Rpb24gY29tcGxldGUoZSl7by50aW1lb3V0JiZjbGVhclRpbWVvdXQoc2VsZi50aW1lb3V0KSxzZWxmLnRpbWVvdXQ9bnVsbDt3aGlsZShzZWxmLl9jb21wbGV0ZUhhbmRsZXJzLmxlbmd0aD4wKXNlbGYuX2NvbXBsZXRlSGFuZGxlcnMuc2hpZnQoKShlKX1mdW5jdGlvbiBzdWNjZXNzKHJlc3Ape3ZhciB0eXBlPW8udHlwZXx8c2V0VHlwZShyZXNwLmdldFJlc3BvbnNlSGVhZGVyKFwiQ29udGVudC1UeXBlXCIpKTtyZXNwPXR5cGUhPT1cImpzb25wXCI/c2VsZi5yZXF1ZXN0OnJlc3A7dmFyIGZpbHRlcmVkUmVzcG9uc2U9Z2xvYmFsU2V0dXBPcHRpb25zLmRhdGFGaWx0ZXIocmVzcC5yZXNwb25zZVRleHQsdHlwZSkscj1maWx0ZXJlZFJlc3BvbnNlO3RyeXtyZXNwLnJlc3BvbnNlVGV4dD1yfWNhdGNoKGUpe31pZihyKXN3aXRjaCh0eXBlKXtjYXNlXCJqc29uXCI6dHJ5e3Jlc3A9d2luLkpTT04/d2luLkpTT04ucGFyc2Uocik6ZXZhbChcIihcIityK1wiKVwiKX1jYXRjaChlcnIpe3JldHVybiBlcnJvcihyZXNwLFwiQ291bGQgbm90IHBhcnNlIEpTT04gaW4gcmVzcG9uc2VcIixlcnIpfWJyZWFrO2Nhc2VcImpzXCI6cmVzcD1ldmFsKHIpO2JyZWFrO2Nhc2VcImh0bWxcIjpyZXNwPXI7YnJlYWs7Y2FzZVwieG1sXCI6cmVzcD1yZXNwLnJlc3BvbnNlWE1MJiZyZXNwLnJlc3BvbnNlWE1MLnBhcnNlRXJyb3ImJnJlc3AucmVzcG9uc2VYTUwucGFyc2VFcnJvci5lcnJvckNvZGUmJnJlc3AucmVzcG9uc2VYTUwucGFyc2VFcnJvci5yZWFzb24/bnVsbDpyZXNwLnJlc3BvbnNlWE1MfXNlbGYuX3Jlc3BvbnNlQXJncy5yZXNwPXJlc3Asc2VsZi5fZnVsZmlsbGVkPSEwLGZuKHJlc3ApLHNlbGYuX3N1Y2Nlc3NIYW5kbGVyKHJlc3ApO3doaWxlKHNlbGYuX2Z1bGZpbGxtZW50SGFuZGxlcnMubGVuZ3RoPjApcmVzcD1zZWxmLl9mdWxmaWxsbWVudEhhbmRsZXJzLnNoaWZ0KCkocmVzcCk7Y29tcGxldGUocmVzcCl9ZnVuY3Rpb24gZXJyb3IoZSx0LG4pe2U9c2VsZi5yZXF1ZXN0LHNlbGYuX3Jlc3BvbnNlQXJncy5yZXNwPWUsc2VsZi5fcmVzcG9uc2VBcmdzLm1zZz10LHNlbGYuX3Jlc3BvbnNlQXJncy50PW4sc2VsZi5fZXJyZWQ9ITA7d2hpbGUoc2VsZi5fZXJyb3JIYW5kbGVycy5sZW5ndGg+MClzZWxmLl9lcnJvckhhbmRsZXJzLnNoaWZ0KCkoZSx0LG4pO2NvbXBsZXRlKGUpfXRoaXMudXJsPXR5cGVvZiBvPT1cInN0cmluZ1wiP286by51cmwsdGhpcy50aW1lb3V0PW51bGwsdGhpcy5fZnVsZmlsbGVkPSExLHRoaXMuX3N1Y2Nlc3NIYW5kbGVyPWZ1bmN0aW9uKCl7fSx0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXJzPVtdLHRoaXMuX2Vycm9ySGFuZGxlcnM9W10sdGhpcy5fY29tcGxldGVIYW5kbGVycz1bXSx0aGlzLl9lcnJlZD0hMSx0aGlzLl9yZXNwb25zZUFyZ3M9e307dmFyIHNlbGY9dGhpcztmbj1mbnx8ZnVuY3Rpb24oKXt9LG8udGltZW91dCYmKHRoaXMudGltZW91dD1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7c2VsZi5hYm9ydCgpfSxvLnRpbWVvdXQpKSxvLnN1Y2Nlc3MmJih0aGlzLl9zdWNjZXNzSGFuZGxlcj1mdW5jdGlvbigpe28uc3VjY2Vzcy5hcHBseShvLGFyZ3VtZW50cyl9KSxvLmVycm9yJiZ0aGlzLl9lcnJvckhhbmRsZXJzLnB1c2goZnVuY3Rpb24oKXtvLmVycm9yLmFwcGx5KG8sYXJndW1lbnRzKX0pLG8uY29tcGxldGUmJnRoaXMuX2NvbXBsZXRlSGFuZGxlcnMucHVzaChmdW5jdGlvbigpe28uY29tcGxldGUuYXBwbHkobyxhcmd1bWVudHMpfSksdGhpcy5yZXF1ZXN0PWdldFJlcXVlc3QuY2FsbCh0aGlzLHN1Y2Nlc3MsZXJyb3IpfWZ1bmN0aW9uIHJlcXdlc3QoZSx0KXtyZXR1cm4gbmV3IFJlcXdlc3QoZSx0KX1mdW5jdGlvbiBub3JtYWxpemUoZSl7cmV0dXJuIGU/ZS5yZXBsYWNlKC9cXHI/XFxuL2csXCJcXHJcXG5cIik6XCJcIn1mdW5jdGlvbiBzZXJpYWwoZSx0KXt2YXIgbj1lLm5hbWUscj1lLnRhZ05hbWUudG9Mb3dlckNhc2UoKSxpPWZ1bmN0aW9uKGUpe2UmJiFlLmRpc2FibGVkJiZ0KG4sbm9ybWFsaXplKGUuYXR0cmlidXRlcy52YWx1ZSYmZS5hdHRyaWJ1dGVzLnZhbHVlLnNwZWNpZmllZD9lLnZhbHVlOmUudGV4dCkpfSxzLG8sdSxhO2lmKGUuZGlzYWJsZWR8fCFuKXJldHVybjtzd2l0Y2gocil7Y2FzZVwiaW5wdXRcIjovcmVzZXR8YnV0dG9ufGltYWdlfGZpbGUvaS50ZXN0KGUudHlwZSl8fChzPS9jaGVja2JveC9pLnRlc3QoZS50eXBlKSxvPS9yYWRpby9pLnRlc3QoZS50eXBlKSx1PWUudmFsdWUsKCFzJiYhb3x8ZS5jaGVja2VkKSYmdChuLG5vcm1hbGl6ZShzJiZ1PT09XCJcIj9cIm9uXCI6dSkpKTticmVhaztjYXNlXCJ0ZXh0YXJlYVwiOnQobixub3JtYWxpemUoZS52YWx1ZSkpO2JyZWFrO2Nhc2VcInNlbGVjdFwiOmlmKGUudHlwZS50b0xvd2VyQ2FzZSgpPT09XCJzZWxlY3Qtb25lXCIpaShlLnNlbGVjdGVkSW5kZXg+PTA/ZS5vcHRpb25zW2Uuc2VsZWN0ZWRJbmRleF06bnVsbCk7ZWxzZSBmb3IoYT0wO2UubGVuZ3RoJiZhPGUubGVuZ3RoO2ErKyllLm9wdGlvbnNbYV0uc2VsZWN0ZWQmJmkoZS5vcHRpb25zW2FdKX19ZnVuY3Rpb24gZWFjaEZvcm1FbGVtZW50KCl7dmFyIGU9dGhpcyx0LG4scj1mdW5jdGlvbih0LG4pe3ZhciByLGkscztmb3Iocj0wO3I8bi5sZW5ndGg7cisrKXtzPXRbYnlUYWddKG5bcl0pO2ZvcihpPTA7aTxzLmxlbmd0aDtpKyspc2VyaWFsKHNbaV0sZSl9fTtmb3Iobj0wO248YXJndW1lbnRzLmxlbmd0aDtuKyspdD1hcmd1bWVudHNbbl0sL2lucHV0fHNlbGVjdHx0ZXh0YXJlYS9pLnRlc3QodC50YWdOYW1lKSYmc2VyaWFsKHQsZSkscih0LFtcImlucHV0XCIsXCJzZWxlY3RcIixcInRleHRhcmVhXCJdKX1mdW5jdGlvbiBzZXJpYWxpemVRdWVyeVN0cmluZygpe3JldHVybiByZXF3ZXN0LnRvUXVlcnlTdHJpbmcocmVxd2VzdC5zZXJpYWxpemVBcnJheS5hcHBseShudWxsLGFyZ3VtZW50cykpfWZ1bmN0aW9uIHNlcmlhbGl6ZUhhc2goKXt2YXIgZT17fTtyZXR1cm4gZWFjaEZvcm1FbGVtZW50LmFwcGx5KGZ1bmN0aW9uKHQsbil7dCBpbiBlPyhlW3RdJiYhaXNBcnJheShlW3RdKSYmKGVbdF09W2VbdF1dKSxlW3RdLnB1c2gobikpOmVbdF09bn0sYXJndW1lbnRzKSxlfWZ1bmN0aW9uIGJ1aWxkUGFyYW1zKGUsdCxuLHIpe3ZhciBpLHMsbyx1PS9cXFtcXF0kLztpZihpc0FycmF5KHQpKWZvcihzPTA7dCYmczx0Lmxlbmd0aDtzKyspbz10W3NdLG58fHUudGVzdChlKT9yKGUsbyk6YnVpbGRQYXJhbXMoZStcIltcIisodHlwZW9mIG89PVwib2JqZWN0XCI/czpcIlwiKStcIl1cIixvLG4scik7ZWxzZSBpZih0JiZ0LnRvU3RyaW5nKCk9PT1cIltvYmplY3QgT2JqZWN0XVwiKWZvcihpIGluIHQpYnVpbGRQYXJhbXMoZStcIltcIitpK1wiXVwiLHRbaV0sbixyKTtlbHNlIHIoZSx0KX12YXIgd2luPXdpbmRvdyxkb2M9ZG9jdW1lbnQsaHR0cHNSZT0vXmh0dHAvLHR3b0h1bmRvPS9eKDIwXFxkfDEyMjMpJC8sYnlUYWc9XCJnZXRFbGVtZW50c0J5VGFnTmFtZVwiLHJlYWR5U3RhdGU9XCJyZWFkeVN0YXRlXCIsY29udGVudFR5cGU9XCJDb250ZW50LVR5cGVcIixyZXF1ZXN0ZWRXaXRoPVwiWC1SZXF1ZXN0ZWQtV2l0aFwiLGhlYWQ9ZG9jW2J5VGFnXShcImhlYWRcIilbMF0sdW5pcWlkPTAsY2FsbGJhY2tQcmVmaXg9XCJyZXF3ZXN0X1wiKyArKG5ldyBEYXRlKSxsYXN0VmFsdWUseG1sSHR0cFJlcXVlc3Q9XCJYTUxIdHRwUmVxdWVzdFwiLHhEb21haW5SZXF1ZXN0PVwiWERvbWFpblJlcXVlc3RcIixub29wPWZ1bmN0aW9uKCl7fSxpc0FycmF5PXR5cGVvZiBBcnJheS5pc0FycmF5PT1cImZ1bmN0aW9uXCI/QXJyYXkuaXNBcnJheTpmdW5jdGlvbihlKXtyZXR1cm4gZSBpbnN0YW5jZW9mIEFycmF5fSxkZWZhdWx0SGVhZGVycz17Y29udGVudFR5cGU6XCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRcIixyZXF1ZXN0ZWRXaXRoOnhtbEh0dHBSZXF1ZXN0LGFjY2VwdDp7XCIqXCI6XCJ0ZXh0L2phdmFzY3JpcHQsIHRleHQvaHRtbCwgYXBwbGljYXRpb24veG1sLCB0ZXh0L3htbCwgKi8qXCIseG1sOlwiYXBwbGljYXRpb24veG1sLCB0ZXh0L3htbFwiLGh0bWw6XCJ0ZXh0L2h0bWxcIix0ZXh0OlwidGV4dC9wbGFpblwiLGpzb246XCJhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L2phdmFzY3JpcHRcIixqczpcImFwcGxpY2F0aW9uL2phdmFzY3JpcHQsIHRleHQvamF2YXNjcmlwdFwifX0seGhyPWZ1bmN0aW9uKGUpe2lmKGUuY3Jvc3NPcmlnaW49PT0hMCl7dmFyIHQ9d2luW3htbEh0dHBSZXF1ZXN0XT9uZXcgWE1MSHR0cFJlcXVlc3Q6bnVsbDtpZih0JiZcIndpdGhDcmVkZW50aWFsc1wiaW4gdClyZXR1cm4gdDtpZih3aW5beERvbWFpblJlcXVlc3RdKXJldHVybiBuZXcgWERvbWFpblJlcXVlc3Q7dGhyb3cgbmV3IEVycm9yKFwiQnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGNyb3NzLW9yaWdpbiByZXF1ZXN0c1wiKX1yZXR1cm4gd2luW3htbEh0dHBSZXF1ZXN0XT9uZXcgWE1MSHR0cFJlcXVlc3Q6bmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKX0sZ2xvYmFsU2V0dXBPcHRpb25zPXtkYXRhRmlsdGVyOmZ1bmN0aW9uKGUpe3JldHVybiBlfX07cmV0dXJuIFJlcXdlc3QucHJvdG90eXBlPXthYm9ydDpmdW5jdGlvbigpe3RoaXMuX2Fib3J0ZWQ9ITAsdGhpcy5yZXF1ZXN0LmFib3J0KCl9LHJldHJ5OmZ1bmN0aW9uKCl7aW5pdC5jYWxsKHRoaXMsdGhpcy5vLHRoaXMuZm4pfSx0aGVuOmZ1bmN0aW9uKGUsdCl7cmV0dXJuIGU9ZXx8ZnVuY3Rpb24oKXt9LHQ9dHx8ZnVuY3Rpb24oKXt9LHRoaXMuX2Z1bGZpbGxlZD90aGlzLl9yZXNwb25zZUFyZ3MucmVzcD1lKHRoaXMuX3Jlc3BvbnNlQXJncy5yZXNwKTp0aGlzLl9lcnJlZD90KHRoaXMuX3Jlc3BvbnNlQXJncy5yZXNwLHRoaXMuX3Jlc3BvbnNlQXJncy5tc2csdGhpcy5fcmVzcG9uc2VBcmdzLnQpOih0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXJzLnB1c2goZSksdGhpcy5fZXJyb3JIYW5kbGVycy5wdXNoKHQpKSx0aGlzfSxhbHdheXM6ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX2Z1bGZpbGxlZHx8dGhpcy5fZXJyZWQ/ZSh0aGlzLl9yZXNwb25zZUFyZ3MucmVzcCk6dGhpcy5fY29tcGxldGVIYW5kbGVycy5wdXNoKGUpLHRoaXN9LGZhaWw6ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX2VycmVkP2UodGhpcy5fcmVzcG9uc2VBcmdzLnJlc3AsdGhpcy5fcmVzcG9uc2VBcmdzLm1zZyx0aGlzLl9yZXNwb25zZUFyZ3MudCk6dGhpcy5fZXJyb3JIYW5kbGVycy5wdXNoKGUpLHRoaXN9LFwiY2F0Y2hcIjpmdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5mYWlsKGUpfX0scmVxd2VzdC5zZXJpYWxpemVBcnJheT1mdW5jdGlvbigpe3ZhciBlPVtdO3JldHVybiBlYWNoRm9ybUVsZW1lbnQuYXBwbHkoZnVuY3Rpb24odCxuKXtlLnB1c2goe25hbWU6dCx2YWx1ZTpufSl9LGFyZ3VtZW50cyksZX0scmVxd2VzdC5zZXJpYWxpemU9ZnVuY3Rpb24oKXtpZihhcmd1bWVudHMubGVuZ3RoPT09MClyZXR1cm5cIlwiO3ZhciBlLHQsbj1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMCk7cmV0dXJuIGU9bi5wb3AoKSxlJiZlLm5vZGVUeXBlJiZuLnB1c2goZSkmJihlPW51bGwpLGUmJihlPWUudHlwZSksZT09XCJtYXBcIj90PXNlcmlhbGl6ZUhhc2g6ZT09XCJhcnJheVwiP3Q9cmVxd2VzdC5zZXJpYWxpemVBcnJheTp0PXNlcmlhbGl6ZVF1ZXJ5U3RyaW5nLHQuYXBwbHkobnVsbCxuKX0scmVxd2VzdC50b1F1ZXJ5U3RyaW5nPWZ1bmN0aW9uKGUsdCl7dmFyIG4scixpPXR8fCExLHM9W10sbz1lbmNvZGVVUklDb21wb25lbnQsdT1mdW5jdGlvbihlLHQpe3Q9XCJmdW5jdGlvblwiPT10eXBlb2YgdD90KCk6dD09bnVsbD9cIlwiOnQsc1tzLmxlbmd0aF09byhlKStcIj1cIitvKHQpfTtpZihpc0FycmF5KGUpKWZvcihyPTA7ZSYmcjxlLmxlbmd0aDtyKyspdShlW3JdLm5hbWUsZVtyXS52YWx1ZSk7ZWxzZSBmb3IobiBpbiBlKWUuaGFzT3duUHJvcGVydHkobikmJmJ1aWxkUGFyYW1zKG4sZVtuXSxpLHUpO3JldHVybiBzLmpvaW4oXCImXCIpLnJlcGxhY2UoLyUyMC9nLFwiK1wiKX0scmVxd2VzdC5nZXRjYWxsYmFja1ByZWZpeD1mdW5jdGlvbigpe3JldHVybiBjYWxsYmFja1ByZWZpeH0scmVxd2VzdC5jb21wYXQ9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gZSYmKGUudHlwZSYmKGUubWV0aG9kPWUudHlwZSkmJmRlbGV0ZSBlLnR5cGUsZS5kYXRhVHlwZSYmKGUudHlwZT1lLmRhdGFUeXBlKSxlLmpzb25wQ2FsbGJhY2smJihlLmpzb25wQ2FsbGJhY2tOYW1lPWUuanNvbnBDYWxsYmFjaykmJmRlbGV0ZSBlLmpzb25wQ2FsbGJhY2ssZS5qc29ucCYmKGUuanNvbnBDYWxsYmFjaz1lLmpzb25wKSksbmV3IFJlcXdlc3QoZSx0KX0scmVxd2VzdC5hamF4U2V0dXA9ZnVuY3Rpb24oZSl7ZT1lfHx7fTtmb3IodmFyIHQgaW4gZSlnbG9iYWxTZXR1cE9wdGlvbnNbdF09ZVt0XX0scmVxd2VzdH0pIiwiLyohXG4gICogUmVxd2VzdCEgQSBnZW5lcmFsIHB1cnBvc2UgWEhSIGNvbm5lY3Rpb24gbWFuYWdlclxuICAqIGxpY2Vuc2UgTUlUIChjKSBEdXN0aW4gRGlheiAyMDE0XG4gICogaHR0cHM6Ly9naXRodWIuY29tL2RlZC9yZXF3ZXN0XG4gICovXG5cbiFmdW5jdGlvbiAobmFtZSwgY29udGV4dCwgZGVmaW5pdGlvbikge1xuICBpZiAodHlwZW9mIG1vZHVsZSAhPSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKClcbiAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIGRlZmluZShkZWZpbml0aW9uKVxuICBlbHNlIGNvbnRleHRbbmFtZV0gPSBkZWZpbml0aW9uKClcbn0oJ3JlcXdlc3QnLCB0aGlzLCBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIHdpbiA9IHdpbmRvd1xuICAgICwgZG9jID0gZG9jdW1lbnRcbiAgICAsIGh0dHBzUmUgPSAvXmh0dHAvXG4gICAgLCBwcm90b2NvbFJlID0gLyheXFx3Kyk6XFwvXFwvL1xuICAgICwgdHdvSHVuZG8gPSAvXigyMFxcZHwxMjIzKSQvIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDA0Njk3Mi9tc2llLXJldHVybnMtc3RhdHVzLWNvZGUtb2YtMTIyMy1mb3ItYWpheC1yZXF1ZXN0XG4gICAgLCBieVRhZyA9ICdnZXRFbGVtZW50c0J5VGFnTmFtZSdcbiAgICAsIHJlYWR5U3RhdGUgPSAncmVhZHlTdGF0ZSdcbiAgICAsIGNvbnRlbnRUeXBlID0gJ0NvbnRlbnQtVHlwZSdcbiAgICAsIHJlcXVlc3RlZFdpdGggPSAnWC1SZXF1ZXN0ZWQtV2l0aCdcbiAgICAsIGhlYWQgPSBkb2NbYnlUYWddKCdoZWFkJylbMF1cbiAgICAsIHVuaXFpZCA9IDBcbiAgICAsIGNhbGxiYWNrUHJlZml4ID0gJ3JlcXdlc3RfJyArICgrbmV3IERhdGUoKSlcbiAgICAsIGxhc3RWYWx1ZSAvLyBkYXRhIHN0b3JlZCBieSB0aGUgbW9zdCByZWNlbnQgSlNPTlAgY2FsbGJhY2tcbiAgICAsIHhtbEh0dHBSZXF1ZXN0ID0gJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICwgeERvbWFpblJlcXVlc3QgPSAnWERvbWFpblJlcXVlc3QnXG4gICAgLCBub29wID0gZnVuY3Rpb24gKCkge31cblxuICAgICwgaXNBcnJheSA9IHR5cGVvZiBBcnJheS5pc0FycmF5ID09ICdmdW5jdGlvbidcbiAgICAgICAgPyBBcnJheS5pc0FycmF5XG4gICAgICAgIDogZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgIHJldHVybiBhIGluc3RhbmNlb2YgQXJyYXlcbiAgICAgICAgICB9XG5cbiAgICAsIGRlZmF1bHRIZWFkZXJzID0ge1xuICAgICAgICAgICdjb250ZW50VHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnXG4gICAgICAgICwgJ3JlcXVlc3RlZFdpdGgnOiB4bWxIdHRwUmVxdWVzdFxuICAgICAgICAsICdhY2NlcHQnOiB7XG4gICAgICAgICAgICAgICcqJzogICd0ZXh0L2phdmFzY3JpcHQsIHRleHQvaHRtbCwgYXBwbGljYXRpb24veG1sLCB0ZXh0L3htbCwgKi8qJ1xuICAgICAgICAgICAgLCAneG1sJzogICdhcHBsaWNhdGlvbi94bWwsIHRleHQveG1sJ1xuICAgICAgICAgICAgLCAnaHRtbCc6ICd0ZXh0L2h0bWwnXG4gICAgICAgICAgICAsICd0ZXh0JzogJ3RleHQvcGxhaW4nXG4gICAgICAgICAgICAsICdqc29uJzogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvamF2YXNjcmlwdCdcbiAgICAgICAgICAgICwgJ2pzJzogICAnYXBwbGljYXRpb24vamF2YXNjcmlwdCwgdGV4dC9qYXZhc2NyaXB0J1xuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICwgeGhyID0gZnVuY3Rpb24obykge1xuICAgICAgICAvLyBpcyBpdCB4LWRvbWFpblxuICAgICAgICBpZiAob1snY3Jvc3NPcmlnaW4nXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgIHZhciB4aHIgPSB3aW5beG1sSHR0cFJlcXVlc3RdID8gbmV3IFhNTEh0dHBSZXF1ZXN0KCkgOiBudWxsXG4gICAgICAgICAgaWYgKHhociAmJiAnd2l0aENyZWRlbnRpYWxzJyBpbiB4aHIpIHtcbiAgICAgICAgICAgIHJldHVybiB4aHJcbiAgICAgICAgICB9IGVsc2UgaWYgKHdpblt4RG9tYWluUmVxdWVzdF0pIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgWERvbWFpblJlcXVlc3QoKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Jyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBjcm9zcy1vcmlnaW4gcmVxdWVzdHMnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh3aW5beG1sSHR0cFJlcXVlc3RdKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBBY3RpdmVYT2JqZWN0KCdNaWNyb3NvZnQuWE1MSFRUUCcpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAsIGdsb2JhbFNldHVwT3B0aW9ucyA9IHtcbiAgICAgICAgZGF0YUZpbHRlcjogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgZnVuY3Rpb24gc3VjY2VlZChyKSB7XG4gICAgdmFyIHByb3RvY29sID0gcHJvdG9jb2xSZS5leGVjKHIudXJsKTtcbiAgICBwcm90b2NvbCA9IChwcm90b2NvbCAmJiBwcm90b2NvbFsxXSkgfHwgd2luZG93LmxvY2F0aW9uLnByb3RvY29sO1xuICAgIHJldHVybiBodHRwc1JlLnRlc3QocHJvdG9jb2wpID8gdHdvSHVuZG8udGVzdChyLnJlcXVlc3Quc3RhdHVzKSA6ICEhci5yZXF1ZXN0LnJlc3BvbnNlO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlUmVhZHlTdGF0ZShyLCBzdWNjZXNzLCBlcnJvcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyB1c2UgX2Fib3J0ZWQgdG8gbWl0aWdhdGUgYWdhaW5zdCBJRSBlcnIgYzAwYzAyM2ZcbiAgICAgIC8vIChjYW4ndCByZWFkIHByb3BzIG9uIGFib3J0ZWQgcmVxdWVzdCBvYmplY3RzKVxuICAgICAgaWYgKHIuX2Fib3J0ZWQpIHJldHVybiBlcnJvcihyLnJlcXVlc3QpXG4gICAgICBpZiAoci5fdGltZWRPdXQpIHJldHVybiBlcnJvcihyLnJlcXVlc3QsICdSZXF1ZXN0IGlzIGFib3J0ZWQ6IHRpbWVvdXQnKVxuICAgICAgaWYgKHIucmVxdWVzdCAmJiByLnJlcXVlc3RbcmVhZHlTdGF0ZV0gPT0gNCkge1xuICAgICAgICByLnJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gbm9vcFxuICAgICAgICBpZiAoc3VjY2VlZChyKSkgc3VjY2VzcyhyLnJlcXVlc3QpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBlcnJvcihyLnJlcXVlc3QpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2V0SGVhZGVycyhodHRwLCBvKSB7XG4gICAgdmFyIGhlYWRlcnMgPSBvWydoZWFkZXJzJ10gfHwge31cbiAgICAgICwgaFxuXG4gICAgaGVhZGVyc1snQWNjZXB0J10gPSBoZWFkZXJzWydBY2NlcHQnXVxuICAgICAgfHwgZGVmYXVsdEhlYWRlcnNbJ2FjY2VwdCddW29bJ3R5cGUnXV1cbiAgICAgIHx8IGRlZmF1bHRIZWFkZXJzWydhY2NlcHQnXVsnKiddXG5cbiAgICB2YXIgaXNBRm9ybURhdGEgPSB0eXBlb2YgRm9ybURhdGEgPT09ICdmdW5jdGlvbicgJiYgKG9bJ2RhdGEnXSBpbnN0YW5jZW9mIEZvcm1EYXRhKTtcbiAgICAvLyBicmVha3MgY3Jvc3Mtb3JpZ2luIHJlcXVlc3RzIHdpdGggbGVnYWN5IGJyb3dzZXJzXG4gICAgaWYgKCFvWydjcm9zc09yaWdpbiddICYmICFoZWFkZXJzW3JlcXVlc3RlZFdpdGhdKSBoZWFkZXJzW3JlcXVlc3RlZFdpdGhdID0gZGVmYXVsdEhlYWRlcnNbJ3JlcXVlc3RlZFdpdGgnXVxuICAgIGlmICghaGVhZGVyc1tjb250ZW50VHlwZV0gJiYgIWlzQUZvcm1EYXRhKSBoZWFkZXJzW2NvbnRlbnRUeXBlXSA9IG9bJ2NvbnRlbnRUeXBlJ10gfHwgZGVmYXVsdEhlYWRlcnNbJ2NvbnRlbnRUeXBlJ11cbiAgICBmb3IgKGggaW4gaGVhZGVycylcbiAgICAgIGhlYWRlcnMuaGFzT3duUHJvcGVydHkoaCkgJiYgJ3NldFJlcXVlc3RIZWFkZXInIGluIGh0dHAgJiYgaHR0cC5zZXRSZXF1ZXN0SGVhZGVyKGgsIGhlYWRlcnNbaF0pXG4gIH1cblxuICBmdW5jdGlvbiBzZXRDcmVkZW50aWFscyhodHRwLCBvKSB7XG4gICAgaWYgKHR5cGVvZiBvWyd3aXRoQ3JlZGVudGlhbHMnXSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGh0dHAud2l0aENyZWRlbnRpYWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgaHR0cC53aXRoQ3JlZGVudGlhbHMgPSAhIW9bJ3dpdGhDcmVkZW50aWFscyddXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2VuZXJhbENhbGxiYWNrKGRhdGEpIHtcbiAgICBsYXN0VmFsdWUgPSBkYXRhXG4gIH1cblxuICBmdW5jdGlvbiB1cmxhcHBlbmQgKHVybCwgcykge1xuICAgIHJldHVybiB1cmwgKyAoL1xcPy8udGVzdCh1cmwpID8gJyYnIDogJz8nKSArIHNcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZUpzb25wKG8sIGZuLCBlcnIsIHVybCkge1xuICAgIHZhciByZXFJZCA9IHVuaXFpZCsrXG4gICAgICAsIGNia2V5ID0gb1snanNvbnBDYWxsYmFjayddIHx8ICdjYWxsYmFjaycgLy8gdGhlICdjYWxsYmFjaycga2V5XG4gICAgICAsIGNidmFsID0gb1snanNvbnBDYWxsYmFja05hbWUnXSB8fCByZXF3ZXN0LmdldGNhbGxiYWNrUHJlZml4KHJlcUlkKVxuICAgICAgLCBjYnJlZyA9IG5ldyBSZWdFeHAoJygoXnxcXFxcP3wmKScgKyBjYmtleSArICcpPShbXiZdKyknKVxuICAgICAgLCBtYXRjaCA9IHVybC5tYXRjaChjYnJlZylcbiAgICAgICwgc2NyaXB0ID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgICAsIGxvYWRlZCA9IDBcbiAgICAgICwgaXNJRTEwID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdNU0lFIDEwLjAnKSAhPT0gLTFcblxuICAgIGlmIChtYXRjaCkge1xuICAgICAgaWYgKG1hdGNoWzNdID09PSAnPycpIHtcbiAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoY2JyZWcsICckMT0nICsgY2J2YWwpIC8vIHdpbGRjYXJkIGNhbGxiYWNrIGZ1bmMgbmFtZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2J2YWwgPSBtYXRjaFszXSAvLyBwcm92aWRlZCBjYWxsYmFjayBmdW5jIG5hbWVcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdXJsID0gdXJsYXBwZW5kKHVybCwgY2JrZXkgKyAnPScgKyBjYnZhbCkgLy8gbm8gY2FsbGJhY2sgZGV0YWlscywgYWRkICdlbVxuICAgIH1cblxuICAgIHdpbltjYnZhbF0gPSBnZW5lcmFsQ2FsbGJhY2tcblxuICAgIHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCdcbiAgICBzY3JpcHQuc3JjID0gdXJsXG4gICAgc2NyaXB0LmFzeW5jID0gdHJ1ZVxuICAgIGlmICh0eXBlb2Ygc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSAhPT0gJ3VuZGVmaW5lZCcgJiYgIWlzSUUxMCkge1xuICAgICAgLy8gbmVlZCB0aGlzIGZvciBJRSBkdWUgdG8gb3V0LW9mLW9yZGVyIG9ucmVhZHlzdGF0ZWNoYW5nZSgpLCBiaW5kaW5nIHNjcmlwdFxuICAgICAgLy8gZXhlY3V0aW9uIHRvIGFuIGV2ZW50IGxpc3RlbmVyIGdpdmVzIHVzIGNvbnRyb2wgb3ZlciB3aGVuIHRoZSBzY3JpcHRcbiAgICAgIC8vIGlzIGV4ZWN1dGVkLiBTZWUgaHR0cDovL2phdWJvdXJnLm5ldC8yMDEwLzA3L2xvYWRpbmctc2NyaXB0LWFzLW9uY2xpY2staGFuZGxlci1vZi5odG1sXG4gICAgICBzY3JpcHQuaHRtbEZvciA9IHNjcmlwdC5pZCA9ICdfcmVxd2VzdF8nICsgcmVxSWRcbiAgICB9XG5cbiAgICBzY3JpcHQub25sb2FkID0gc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICgoc2NyaXB0W3JlYWR5U3RhdGVdICYmIHNjcmlwdFtyZWFkeVN0YXRlXSAhPT0gJ2NvbXBsZXRlJyAmJiBzY3JpcHRbcmVhZHlTdGF0ZV0gIT09ICdsb2FkZWQnKSB8fCBsb2FkZWQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgICBzY3JpcHQub25sb2FkID0gc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IG51bGxcbiAgICAgIHNjcmlwdC5vbmNsaWNrICYmIHNjcmlwdC5vbmNsaWNrKClcbiAgICAgIC8vIENhbGwgdGhlIHVzZXIgY2FsbGJhY2sgd2l0aCB0aGUgbGFzdCB2YWx1ZSBzdG9yZWQgYW5kIGNsZWFuIHVwIHZhbHVlcyBhbmQgc2NyaXB0cy5cbiAgICAgIGZuKGxhc3RWYWx1ZSlcbiAgICAgIGxhc3RWYWx1ZSA9IHVuZGVmaW5lZFxuICAgICAgaGVhZC5yZW1vdmVDaGlsZChzY3JpcHQpXG4gICAgICBsb2FkZWQgPSAxXG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBzY3JpcHQgdG8gdGhlIERPTSBoZWFkXG4gICAgaGVhZC5hcHBlbmRDaGlsZChzY3JpcHQpXG5cbiAgICAvLyBFbmFibGUgSlNPTlAgdGltZW91dFxuICAgIHJldHVybiB7XG4gICAgICBhYm9ydDogZnVuY3Rpb24gKCkge1xuICAgICAgICBzY3JpcHQub25sb2FkID0gc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IG51bGxcbiAgICAgICAgZXJyKHt9LCAnUmVxdWVzdCBpcyBhYm9ydGVkOiB0aW1lb3V0Jywge30pXG4gICAgICAgIGxhc3RWYWx1ZSA9IHVuZGVmaW5lZFxuICAgICAgICBoZWFkLnJlbW92ZUNoaWxkKHNjcmlwdClcbiAgICAgICAgbG9hZGVkID0gMVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJlcXVlc3QoZm4sIGVycikge1xuICAgIHZhciBvID0gdGhpcy5vXG4gICAgICAsIG1ldGhvZCA9IChvWydtZXRob2QnXSB8fCAnR0VUJykudG9VcHBlckNhc2UoKVxuICAgICAgLCB1cmwgPSB0eXBlb2YgbyA9PT0gJ3N0cmluZycgPyBvIDogb1sndXJsJ11cbiAgICAgIC8vIGNvbnZlcnQgbm9uLXN0cmluZyBvYmplY3RzIHRvIHF1ZXJ5LXN0cmluZyBmb3JtIHVubGVzcyBvWydwcm9jZXNzRGF0YSddIGlzIGZhbHNlXG4gICAgICAsIGRhdGEgPSAob1sncHJvY2Vzc0RhdGEnXSAhPT0gZmFsc2UgJiYgb1snZGF0YSddICYmIHR5cGVvZiBvWydkYXRhJ10gIT09ICdzdHJpbmcnKVxuICAgICAgICA/IHJlcXdlc3QudG9RdWVyeVN0cmluZyhvWydkYXRhJ10pXG4gICAgICAgIDogKG9bJ2RhdGEnXSB8fCBudWxsKVxuICAgICAgLCBodHRwXG4gICAgICAsIHNlbmRXYWl0ID0gZmFsc2VcblxuICAgIC8vIGlmIHdlJ3JlIHdvcmtpbmcgb24gYSBHRVQgcmVxdWVzdCBhbmQgd2UgaGF2ZSBkYXRhIHRoZW4gd2Ugc2hvdWxkIGFwcGVuZFxuICAgIC8vIHF1ZXJ5IHN0cmluZyB0byBlbmQgb2YgVVJMIGFuZCBub3QgcG9zdCBkYXRhXG4gICAgaWYgKChvWyd0eXBlJ10gPT0gJ2pzb25wJyB8fCBtZXRob2QgPT0gJ0dFVCcpICYmIGRhdGEpIHtcbiAgICAgIHVybCA9IHVybGFwcGVuZCh1cmwsIGRhdGEpXG4gICAgICBkYXRhID0gbnVsbFxuICAgIH1cblxuICAgIGlmIChvWyd0eXBlJ10gPT0gJ2pzb25wJykgcmV0dXJuIGhhbmRsZUpzb25wKG8sIGZuLCBlcnIsIHVybClcblxuICAgIC8vIGdldCB0aGUgeGhyIGZyb20gdGhlIGZhY3RvcnkgaWYgcGFzc2VkXG4gICAgLy8gaWYgdGhlIGZhY3RvcnkgcmV0dXJucyBudWxsLCBmYWxsLWJhY2sgdG8gb3Vyc1xuICAgIGh0dHAgPSAoby54aHIgJiYgby54aHIobykpIHx8IHhocihvKVxuXG4gICAgaHR0cC5vcGVuKG1ldGhvZCwgdXJsLCBvWydhc3luYyddID09PSBmYWxzZSA/IGZhbHNlIDogdHJ1ZSlcbiAgICBzZXRIZWFkZXJzKGh0dHAsIG8pXG4gICAgc2V0Q3JlZGVudGlhbHMoaHR0cCwgbylcbiAgICBpZiAod2luW3hEb21haW5SZXF1ZXN0XSAmJiBodHRwIGluc3RhbmNlb2Ygd2luW3hEb21haW5SZXF1ZXN0XSkge1xuICAgICAgICBodHRwLm9ubG9hZCA9IGZuXG4gICAgICAgIGh0dHAub25lcnJvciA9IGVyclxuICAgICAgICAvLyBOT1RFOiBzZWVcbiAgICAgICAgLy8gaHR0cDovL3NvY2lhbC5tc2RuLm1pY3Jvc29mdC5jb20vRm9ydW1zL2VuLVVTL2lld2ViZGV2ZWxvcG1lbnQvdGhyZWFkLzMwZWYzYWRkLTc2N2MtNDQzNi1iOGE5LWYxY2ExOWI0ODEyZVxuICAgICAgICBodHRwLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbigpIHt9XG4gICAgICAgIHNlbmRXYWl0ID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICBodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZVJlYWR5U3RhdGUodGhpcywgZm4sIGVycilcbiAgICB9XG4gICAgb1snYmVmb3JlJ10gJiYgb1snYmVmb3JlJ10oaHR0cClcbiAgICBpZiAoc2VuZFdhaXQpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBodHRwLnNlbmQoZGF0YSlcbiAgICAgIH0sIDIwMClcbiAgICB9IGVsc2Uge1xuICAgICAgaHR0cC5zZW5kKGRhdGEpXG4gICAgfVxuICAgIHJldHVybiBodHRwXG4gIH1cblxuICBmdW5jdGlvbiBSZXF3ZXN0KG8sIGZuKSB7XG4gICAgdGhpcy5vID0gb1xuICAgIHRoaXMuZm4gPSBmblxuXG4gICAgaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gIH1cblxuICBmdW5jdGlvbiBzZXRUeXBlKGhlYWRlcikge1xuICAgIC8vIGpzb24sIGphdmFzY3JpcHQsIHRleHQvcGxhaW4sIHRleHQvaHRtbCwgeG1sXG4gICAgaWYgKGhlYWRlci5tYXRjaCgnanNvbicpKSByZXR1cm4gJ2pzb24nXG4gICAgaWYgKGhlYWRlci5tYXRjaCgnamF2YXNjcmlwdCcpKSByZXR1cm4gJ2pzJ1xuICAgIGlmIChoZWFkZXIubWF0Y2goJ3RleHQnKSkgcmV0dXJuICdodG1sJ1xuICAgIGlmIChoZWFkZXIubWF0Y2goJ3htbCcpKSByZXR1cm4gJ3htbCdcbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXQobywgZm4pIHtcblxuICAgIHRoaXMudXJsID0gdHlwZW9mIG8gPT0gJ3N0cmluZycgPyBvIDogb1sndXJsJ11cbiAgICB0aGlzLnRpbWVvdXQgPSBudWxsXG5cbiAgICAvLyB3aGV0aGVyIHJlcXVlc3QgaGFzIGJlZW4gZnVsZmlsbGVkIGZvciBwdXJwb3NlXG4gICAgLy8gb2YgdHJhY2tpbmcgdGhlIFByb21pc2VzXG4gICAgdGhpcy5fZnVsZmlsbGVkID0gZmFsc2VcbiAgICAvLyBzdWNjZXNzIGhhbmRsZXJzXG4gICAgdGhpcy5fc3VjY2Vzc0hhbmRsZXIgPSBmdW5jdGlvbigpe31cbiAgICB0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXJzID0gW11cbiAgICAvLyBlcnJvciBoYW5kbGVyc1xuICAgIHRoaXMuX2Vycm9ySGFuZGxlcnMgPSBbXVxuICAgIC8vIGNvbXBsZXRlIChib3RoIHN1Y2Nlc3MgYW5kIGZhaWwpIGhhbmRsZXJzXG4gICAgdGhpcy5fY29tcGxldGVIYW5kbGVycyA9IFtdXG4gICAgdGhpcy5fZXJyZWQgPSBmYWxzZVxuICAgIHRoaXMuX3Jlc3BvbnNlQXJncyA9IHt9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgIGZuID0gZm4gfHwgZnVuY3Rpb24gKCkge31cblxuICAgIGlmIChvWyd0aW1lb3V0J10pIHtcbiAgICAgIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB0aW1lZE91dCgpXG4gICAgICB9LCBvWyd0aW1lb3V0J10pXG4gICAgfVxuXG4gICAgaWYgKG9bJ3N1Y2Nlc3MnXSkge1xuICAgICAgdGhpcy5fc3VjY2Vzc0hhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9bJ3N1Y2Nlc3MnXS5hcHBseShvLCBhcmd1bWVudHMpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9bJ2Vycm9yJ10pIHtcbiAgICAgIHRoaXMuX2Vycm9ySGFuZGxlcnMucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9bJ2Vycm9yJ10uYXBwbHkobywgYXJndW1lbnRzKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBpZiAob1snY29tcGxldGUnXSkge1xuICAgICAgdGhpcy5fY29tcGxldGVIYW5kbGVycy5wdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb1snY29tcGxldGUnXS5hcHBseShvLCBhcmd1bWVudHMpXG4gICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXBsZXRlIChyZXNwKSB7XG4gICAgICBvWyd0aW1lb3V0J10gJiYgY2xlYXJUaW1lb3V0KHNlbGYudGltZW91dClcbiAgICAgIHNlbGYudGltZW91dCA9IG51bGxcbiAgICAgIHdoaWxlIChzZWxmLl9jb21wbGV0ZUhhbmRsZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgc2VsZi5fY29tcGxldGVIYW5kbGVycy5zaGlmdCgpKHJlc3ApXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3VjY2VzcyAocmVzcCkge1xuICAgICAgdmFyIHR5cGUgPSBvWyd0eXBlJ10gfHwgcmVzcCAmJiBzZXRUeXBlKHJlc3AuZ2V0UmVzcG9uc2VIZWFkZXIoJ0NvbnRlbnQtVHlwZScpKSAvLyByZXNwIGNhbiBiZSB1bmRlZmluZWQgaW4gSUVcbiAgICAgIHJlc3AgPSAodHlwZSAhPT0gJ2pzb25wJykgPyBzZWxmLnJlcXVlc3QgOiByZXNwXG4gICAgICAvLyB1c2UgZ2xvYmFsIGRhdGEgZmlsdGVyIG9uIHJlc3BvbnNlIHRleHRcbiAgICAgIHZhciBmaWx0ZXJlZFJlc3BvbnNlID0gZ2xvYmFsU2V0dXBPcHRpb25zLmRhdGFGaWx0ZXIocmVzcC5yZXNwb25zZVRleHQsIHR5cGUpXG4gICAgICAgICwgciA9IGZpbHRlcmVkUmVzcG9uc2VcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3AucmVzcG9uc2VUZXh0ID0gclxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBjYW4ndCBhc3NpZ24gdGhpcyBpbiBJRTw9OCwganVzdCBpZ25vcmVcbiAgICAgIH1cbiAgICAgIGlmIChyKSB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdqc29uJzpcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzcCA9IHdpbi5KU09OID8gd2luLkpTT04ucGFyc2UocikgOiBldmFsKCcoJyArIHIgKyAnKScpXG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3IocmVzcCwgJ0NvdWxkIG5vdCBwYXJzZSBKU09OIGluIHJlc3BvbnNlJywgZXJyKVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdqcyc6XG4gICAgICAgICAgcmVzcCA9IGV2YWwocilcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdodG1sJzpcbiAgICAgICAgICByZXNwID0gclxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ3htbCc6XG4gICAgICAgICAgcmVzcCA9IHJlc3AucmVzcG9uc2VYTUxcbiAgICAgICAgICAgICAgJiYgcmVzcC5yZXNwb25zZVhNTC5wYXJzZUVycm9yIC8vIElFIHRyb2xvbG9cbiAgICAgICAgICAgICAgJiYgcmVzcC5yZXNwb25zZVhNTC5wYXJzZUVycm9yLmVycm9yQ29kZVxuICAgICAgICAgICAgICAmJiByZXNwLnJlc3BvbnNlWE1MLnBhcnNlRXJyb3IucmVhc29uXG4gICAgICAgICAgICA/IG51bGxcbiAgICAgICAgICAgIDogcmVzcC5yZXNwb25zZVhNTFxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc2VsZi5fcmVzcG9uc2VBcmdzLnJlc3AgPSByZXNwXG4gICAgICBzZWxmLl9mdWxmaWxsZWQgPSB0cnVlXG4gICAgICBmbihyZXNwKVxuICAgICAgc2VsZi5fc3VjY2Vzc0hhbmRsZXIocmVzcClcbiAgICAgIHdoaWxlIChzZWxmLl9mdWxmaWxsbWVudEhhbmRsZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmVzcCA9IHNlbGYuX2Z1bGZpbGxtZW50SGFuZGxlcnMuc2hpZnQoKShyZXNwKVxuICAgICAgfVxuXG4gICAgICBjb21wbGV0ZShyZXNwKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRpbWVkT3V0KCkge1xuICAgICAgc2VsZi5fdGltZWRPdXQgPSB0cnVlXG4gICAgICBzZWxmLnJlcXVlc3QuYWJvcnQoKSAgICAgIFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVycm9yKHJlc3AsIG1zZywgdCkge1xuICAgICAgcmVzcCA9IHNlbGYucmVxdWVzdFxuICAgICAgc2VsZi5fcmVzcG9uc2VBcmdzLnJlc3AgPSByZXNwXG4gICAgICBzZWxmLl9yZXNwb25zZUFyZ3MubXNnID0gbXNnXG4gICAgICBzZWxmLl9yZXNwb25zZUFyZ3MudCA9IHRcbiAgICAgIHNlbGYuX2VycmVkID0gdHJ1ZVxuICAgICAgd2hpbGUgKHNlbGYuX2Vycm9ySGFuZGxlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICBzZWxmLl9lcnJvckhhbmRsZXJzLnNoaWZ0KCkocmVzcCwgbXNnLCB0KVxuICAgICAgfVxuICAgICAgY29tcGxldGUocmVzcClcbiAgICB9XG5cbiAgICB0aGlzLnJlcXVlc3QgPSBnZXRSZXF1ZXN0LmNhbGwodGhpcywgc3VjY2VzcywgZXJyb3IpXG4gIH1cblxuICBSZXF3ZXN0LnByb3RvdHlwZSA9IHtcbiAgICBhYm9ydDogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5fYWJvcnRlZCA9IHRydWVcbiAgICAgIHRoaXMucmVxdWVzdC5hYm9ydCgpXG4gICAgfVxuXG4gICwgcmV0cnk6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGluaXQuY2FsbCh0aGlzLCB0aGlzLm8sIHRoaXMuZm4pXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU21hbGwgZGV2aWF0aW9uIGZyb20gdGhlIFByb21pc2VzIEEgQ29tbW9uSnMgc3BlY2lmaWNhdGlvblxuICAgICAqIGh0dHA6Ly93aWtpLmNvbW1vbmpzLm9yZy93aWtpL1Byb21pc2VzL0FcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIGB0aGVuYCB3aWxsIGV4ZWN1dGUgdXBvbiBzdWNjZXNzZnVsIHJlcXVlc3RzXG4gICAgICovXG4gICwgdGhlbjogZnVuY3Rpb24gKHN1Y2Nlc3MsIGZhaWwpIHtcbiAgICAgIHN1Y2Nlc3MgPSBzdWNjZXNzIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgICBmYWlsID0gZmFpbCB8fCBmdW5jdGlvbiAoKSB7fVxuICAgICAgaWYgKHRoaXMuX2Z1bGZpbGxlZCkge1xuICAgICAgICB0aGlzLl9yZXNwb25zZUFyZ3MucmVzcCA9IHN1Y2Nlc3ModGhpcy5fcmVzcG9uc2VBcmdzLnJlc3ApXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2VycmVkKSB7XG4gICAgICAgIGZhaWwodGhpcy5fcmVzcG9uc2VBcmdzLnJlc3AsIHRoaXMuX3Jlc3BvbnNlQXJncy5tc2csIHRoaXMuX3Jlc3BvbnNlQXJncy50KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fZnVsZmlsbG1lbnRIYW5kbGVycy5wdXNoKHN1Y2Nlc3MpXG4gICAgICAgIHRoaXMuX2Vycm9ySGFuZGxlcnMucHVzaChmYWlsKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBgYWx3YXlzYCB3aWxsIGV4ZWN1dGUgd2hldGhlciB0aGUgcmVxdWVzdCBzdWNjZWVkcyBvciBmYWlsc1xuICAgICAqL1xuICAsIGFsd2F5czogZnVuY3Rpb24gKGZuKSB7XG4gICAgICBpZiAodGhpcy5fZnVsZmlsbGVkIHx8IHRoaXMuX2VycmVkKSB7XG4gICAgICAgIGZuKHRoaXMuX3Jlc3BvbnNlQXJncy5yZXNwKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fY29tcGxldGVIYW5kbGVycy5wdXNoKGZuKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBgZmFpbGAgd2lsbCBleGVjdXRlIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHNcbiAgICAgKi9cbiAgLCBmYWlsOiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIGlmICh0aGlzLl9lcnJlZCkge1xuICAgICAgICBmbih0aGlzLl9yZXNwb25zZUFyZ3MucmVzcCwgdGhpcy5fcmVzcG9uc2VBcmdzLm1zZywgdGhpcy5fcmVzcG9uc2VBcmdzLnQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9lcnJvckhhbmRsZXJzLnB1c2goZm4pXG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCAnY2F0Y2gnOiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIHJldHVybiB0aGlzLmZhaWwoZm4pXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVxd2VzdChvLCBmbikge1xuICAgIHJldHVybiBuZXcgUmVxd2VzdChvLCBmbilcbiAgfVxuXG4gIC8vIG5vcm1hbGl6ZSBuZXdsaW5lIHZhcmlhbnRzIGFjY29yZGluZyB0byBzcGVjIC0+IENSTEZcbiAgZnVuY3Rpb24gbm9ybWFsaXplKHMpIHtcbiAgICByZXR1cm4gcyA/IHMucmVwbGFjZSgvXFxyP1xcbi9nLCAnXFxyXFxuJykgOiAnJ1xuICB9XG5cbiAgZnVuY3Rpb24gc2VyaWFsKGVsLCBjYikge1xuICAgIHZhciBuID0gZWwubmFtZVxuICAgICAgLCB0ID0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAsIG9wdENiID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAvLyBJRSBnaXZlcyB2YWx1ZT1cIlwiIGV2ZW4gd2hlcmUgdGhlcmUgaXMgbm8gdmFsdWUgYXR0cmlidXRlXG4gICAgICAgICAgLy8gJ3NwZWNpZmllZCcgcmVmOiBodHRwOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMy1Db3JlL2NvcmUuaHRtbCNJRC04NjI1MjkyNzNcbiAgICAgICAgICBpZiAobyAmJiAhb1snZGlzYWJsZWQnXSlcbiAgICAgICAgICAgIGNiKG4sIG5vcm1hbGl6ZShvWydhdHRyaWJ1dGVzJ11bJ3ZhbHVlJ10gJiYgb1snYXR0cmlidXRlcyddWyd2YWx1ZSddWydzcGVjaWZpZWQnXSA/IG9bJ3ZhbHVlJ10gOiBvWyd0ZXh0J10pKVxuICAgICAgICB9XG4gICAgICAsIGNoLCByYSwgdmFsLCBpXG5cbiAgICAvLyBkb24ndCBzZXJpYWxpemUgZWxlbWVudHMgdGhhdCBhcmUgZGlzYWJsZWQgb3Igd2l0aG91dCBhIG5hbWVcbiAgICBpZiAoZWwuZGlzYWJsZWQgfHwgIW4pIHJldHVyblxuXG4gICAgc3dpdGNoICh0KSB7XG4gICAgY2FzZSAnaW5wdXQnOlxuICAgICAgaWYgKCEvcmVzZXR8YnV0dG9ufGltYWdlfGZpbGUvaS50ZXN0KGVsLnR5cGUpKSB7XG4gICAgICAgIGNoID0gL2NoZWNrYm94L2kudGVzdChlbC50eXBlKVxuICAgICAgICByYSA9IC9yYWRpby9pLnRlc3QoZWwudHlwZSlcbiAgICAgICAgdmFsID0gZWwudmFsdWVcbiAgICAgICAgLy8gV2ViS2l0IGdpdmVzIHVzIFwiXCIgaW5zdGVhZCBvZiBcIm9uXCIgaWYgYSBjaGVja2JveCBoYXMgbm8gdmFsdWUsIHNvIGNvcnJlY3QgaXQgaGVyZVxuICAgICAgICA7KCEoY2ggfHwgcmEpIHx8IGVsLmNoZWNrZWQpICYmIGNiKG4sIG5vcm1hbGl6ZShjaCAmJiB2YWwgPT09ICcnID8gJ29uJyA6IHZhbCkpXG4gICAgICB9XG4gICAgICBicmVha1xuICAgIGNhc2UgJ3RleHRhcmVhJzpcbiAgICAgIGNiKG4sIG5vcm1hbGl6ZShlbC52YWx1ZSkpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3NlbGVjdCc6XG4gICAgICBpZiAoZWwudHlwZS50b0xvd2VyQ2FzZSgpID09PSAnc2VsZWN0LW9uZScpIHtcbiAgICAgICAgb3B0Q2IoZWwuc2VsZWN0ZWRJbmRleCA+PSAwID8gZWwub3B0aW9uc1tlbC5zZWxlY3RlZEluZGV4XSA6IG51bGwpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGkgPSAwOyBlbC5sZW5ndGggJiYgaSA8IGVsLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgZWwub3B0aW9uc1tpXS5zZWxlY3RlZCAmJiBvcHRDYihlbC5vcHRpb25zW2ldKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIC8vIGNvbGxlY3QgdXAgYWxsIGZvcm0gZWxlbWVudHMgZm91bmQgZnJvbSB0aGUgcGFzc2VkIGFyZ3VtZW50IGVsZW1lbnRzIGFsbFxuICAvLyB0aGUgd2F5IGRvd24gdG8gY2hpbGQgZWxlbWVudHM7IHBhc3MgYSAnPGZvcm0+JyBvciBmb3JtIGZpZWxkcy5cbiAgLy8gY2FsbGVkIHdpdGggJ3RoaXMnPWNhbGxiYWNrIHRvIHVzZSBmb3Igc2VyaWFsKCkgb24gZWFjaCBlbGVtZW50XG4gIGZ1bmN0aW9uIGVhY2hGb3JtRWxlbWVudCgpIHtcbiAgICB2YXIgY2IgPSB0aGlzXG4gICAgICAsIGUsIGlcbiAgICAgICwgc2VyaWFsaXplU3VidGFncyA9IGZ1bmN0aW9uIChlLCB0YWdzKSB7XG4gICAgICAgICAgdmFyIGksIGosIGZhXG4gICAgICAgICAgZm9yIChpID0gMDsgaSA8IHRhZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGZhID0gZVtieVRhZ10odGFnc1tpXSlcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBmYS5sZW5ndGg7IGorKykgc2VyaWFsKGZhW2pdLCBjYilcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGUgPSBhcmd1bWVudHNbaV1cbiAgICAgIGlmICgvaW5wdXR8c2VsZWN0fHRleHRhcmVhL2kudGVzdChlLnRhZ05hbWUpKSBzZXJpYWwoZSwgY2IpXG4gICAgICBzZXJpYWxpemVTdWJ0YWdzKGUsIFsgJ2lucHV0JywgJ3NlbGVjdCcsICd0ZXh0YXJlYScgXSlcbiAgICB9XG4gIH1cblxuICAvLyBzdGFuZGFyZCBxdWVyeSBzdHJpbmcgc3R5bGUgc2VyaWFsaXphdGlvblxuICBmdW5jdGlvbiBzZXJpYWxpemVRdWVyeVN0cmluZygpIHtcbiAgICByZXR1cm4gcmVxd2VzdC50b1F1ZXJ5U3RyaW5nKHJlcXdlc3Quc2VyaWFsaXplQXJyYXkuYXBwbHkobnVsbCwgYXJndW1lbnRzKSlcbiAgfVxuXG4gIC8vIHsgJ25hbWUnOiAndmFsdWUnLCAuLi4gfSBzdHlsZSBzZXJpYWxpemF0aW9uXG4gIGZ1bmN0aW9uIHNlcmlhbGl6ZUhhc2goKSB7XG4gICAgdmFyIGhhc2ggPSB7fVxuICAgIGVhY2hGb3JtRWxlbWVudC5hcHBseShmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICAgIGlmIChuYW1lIGluIGhhc2gpIHtcbiAgICAgICAgaGFzaFtuYW1lXSAmJiAhaXNBcnJheShoYXNoW25hbWVdKSAmJiAoaGFzaFtuYW1lXSA9IFtoYXNoW25hbWVdXSlcbiAgICAgICAgaGFzaFtuYW1lXS5wdXNoKHZhbHVlKVxuICAgICAgfSBlbHNlIGhhc2hbbmFtZV0gPSB2YWx1ZVxuICAgIH0sIGFyZ3VtZW50cylcbiAgICByZXR1cm4gaGFzaFxuICB9XG5cbiAgLy8gWyB7IG5hbWU6ICduYW1lJywgdmFsdWU6ICd2YWx1ZScgfSwgLi4uIF0gc3R5bGUgc2VyaWFsaXphdGlvblxuICByZXF3ZXN0LnNlcmlhbGl6ZUFycmF5ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcnIgPSBbXVxuICAgIGVhY2hGb3JtRWxlbWVudC5hcHBseShmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICAgIGFyci5wdXNoKHtuYW1lOiBuYW1lLCB2YWx1ZTogdmFsdWV9KVxuICAgIH0sIGFyZ3VtZW50cylcbiAgICByZXR1cm4gYXJyXG4gIH1cblxuICByZXF3ZXN0LnNlcmlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gICAgdmFyIG9wdCwgZm5cbiAgICAgICwgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMClcblxuICAgIG9wdCA9IGFyZ3MucG9wKClcbiAgICBvcHQgJiYgb3B0Lm5vZGVUeXBlICYmIGFyZ3MucHVzaChvcHQpICYmIChvcHQgPSBudWxsKVxuICAgIG9wdCAmJiAob3B0ID0gb3B0LnR5cGUpXG5cbiAgICBpZiAob3B0ID09ICdtYXAnKSBmbiA9IHNlcmlhbGl6ZUhhc2hcbiAgICBlbHNlIGlmIChvcHQgPT0gJ2FycmF5JykgZm4gPSByZXF3ZXN0LnNlcmlhbGl6ZUFycmF5XG4gICAgZWxzZSBmbiA9IHNlcmlhbGl6ZVF1ZXJ5U3RyaW5nXG5cbiAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYXJncylcbiAgfVxuXG4gIHJlcXdlc3QudG9RdWVyeVN0cmluZyA9IGZ1bmN0aW9uIChvLCB0cmFkKSB7XG4gICAgdmFyIHByZWZpeCwgaVxuICAgICAgLCB0cmFkaXRpb25hbCA9IHRyYWQgfHwgZmFsc2VcbiAgICAgICwgcyA9IFtdXG4gICAgICAsIGVuYyA9IGVuY29kZVVSSUNvbXBvbmVudFxuICAgICAgLCBhZGQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICAgIC8vIElmIHZhbHVlIGlzIGEgZnVuY3Rpb24sIGludm9rZSBpdCBhbmQgcmV0dXJuIGl0cyB2YWx1ZVxuICAgICAgICAgIHZhbHVlID0gKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2YWx1ZSkgPyB2YWx1ZSgpIDogKHZhbHVlID09IG51bGwgPyAnJyA6IHZhbHVlKVxuICAgICAgICAgIHNbcy5sZW5ndGhdID0gZW5jKGtleSkgKyAnPScgKyBlbmModmFsdWUpXG4gICAgICAgIH1cbiAgICAvLyBJZiBhbiBhcnJheSB3YXMgcGFzc2VkIGluLCBhc3N1bWUgdGhhdCBpdCBpcyBhbiBhcnJheSBvZiBmb3JtIGVsZW1lbnRzLlxuICAgIGlmIChpc0FycmF5KG8pKSB7XG4gICAgICBmb3IgKGkgPSAwOyBvICYmIGkgPCBvLmxlbmd0aDsgaSsrKSBhZGQob1tpXVsnbmFtZSddLCBvW2ldWyd2YWx1ZSddKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0cmFkaXRpb25hbCwgZW5jb2RlIHRoZSBcIm9sZFwiIHdheSAodGhlIHdheSAxLjMuMiBvciBvbGRlclxuICAgICAgLy8gZGlkIGl0KSwgb3RoZXJ3aXNlIGVuY29kZSBwYXJhbXMgcmVjdXJzaXZlbHkuXG4gICAgICBmb3IgKHByZWZpeCBpbiBvKSB7XG4gICAgICAgIGlmIChvLmhhc093blByb3BlcnR5KHByZWZpeCkpIGJ1aWxkUGFyYW1zKHByZWZpeCwgb1twcmVmaXhdLCB0cmFkaXRpb25hbCwgYWRkKVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHNwYWNlcyBzaG91bGQgYmUgKyBhY2NvcmRpbmcgdG8gc3BlY1xuICAgIHJldHVybiBzLmpvaW4oJyYnKS5yZXBsYWNlKC8lMjAvZywgJysnKVxuICB9XG5cbiAgZnVuY3Rpb24gYnVpbGRQYXJhbXMocHJlZml4LCBvYmosIHRyYWRpdGlvbmFsLCBhZGQpIHtcbiAgICB2YXIgbmFtZSwgaSwgdlxuICAgICAgLCByYnJhY2tldCA9IC9cXFtcXF0kL1xuXG4gICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgLy8gU2VyaWFsaXplIGFycmF5IGl0ZW0uXG4gICAgICBmb3IgKGkgPSAwOyBvYmogJiYgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuICAgICAgICB2ID0gb2JqW2ldXG4gICAgICAgIGlmICh0cmFkaXRpb25hbCB8fCByYnJhY2tldC50ZXN0KHByZWZpeCkpIHtcbiAgICAgICAgICAvLyBUcmVhdCBlYWNoIGFycmF5IGl0ZW0gYXMgYSBzY2FsYXIuXG4gICAgICAgICAgYWRkKHByZWZpeCwgdilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBidWlsZFBhcmFtcyhwcmVmaXggKyAnWycgKyAodHlwZW9mIHYgPT09ICdvYmplY3QnID8gaSA6ICcnKSArICddJywgdiwgdHJhZGl0aW9uYWwsIGFkZClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAob2JqICYmIG9iai50b1N0cmluZygpID09PSAnW29iamVjdCBPYmplY3RdJykge1xuICAgICAgLy8gU2VyaWFsaXplIG9iamVjdCBpdGVtLlxuICAgICAgZm9yIChuYW1lIGluIG9iaikge1xuICAgICAgICBidWlsZFBhcmFtcyhwcmVmaXggKyAnWycgKyBuYW1lICsgJ10nLCBvYmpbbmFtZV0sIHRyYWRpdGlvbmFsLCBhZGQpXG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2VyaWFsaXplIHNjYWxhciBpdGVtLlxuICAgICAgYWRkKHByZWZpeCwgb2JqKVxuICAgIH1cbiAgfVxuXG4gIHJlcXdlc3QuZ2V0Y2FsbGJhY2tQcmVmaXggPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrUHJlZml4XG4gIH1cblxuICAvLyBqUXVlcnkgYW5kIFplcHRvIGNvbXBhdGliaWxpdHksIGRpZmZlcmVuY2VzIGNhbiBiZSByZW1hcHBlZCBoZXJlIHNvIHlvdSBjYW4gY2FsbFxuICAvLyAuYWpheC5jb21wYXQob3B0aW9ucywgY2FsbGJhY2spXG4gIHJlcXdlc3QuY29tcGF0ID0gZnVuY3Rpb24gKG8sIGZuKSB7XG4gICAgaWYgKG8pIHtcbiAgICAgIG9bJ3R5cGUnXSAmJiAob1snbWV0aG9kJ10gPSBvWyd0eXBlJ10pICYmIGRlbGV0ZSBvWyd0eXBlJ11cbiAgICAgIG9bJ2RhdGFUeXBlJ10gJiYgKG9bJ3R5cGUnXSA9IG9bJ2RhdGFUeXBlJ10pXG4gICAgICBvWydqc29ucENhbGxiYWNrJ10gJiYgKG9bJ2pzb25wQ2FsbGJhY2tOYW1lJ10gPSBvWydqc29ucENhbGxiYWNrJ10pICYmIGRlbGV0ZSBvWydqc29ucENhbGxiYWNrJ11cbiAgICAgIG9bJ2pzb25wJ10gJiYgKG9bJ2pzb25wQ2FsbGJhY2snXSA9IG9bJ2pzb25wJ10pXG4gICAgfVxuICAgIHJldHVybiBuZXcgUmVxd2VzdChvLCBmbilcbiAgfVxuXG4gIHJlcXdlc3QuYWpheFNldHVwID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIGZvciAodmFyIGsgaW4gb3B0aW9ucykge1xuICAgICAgZ2xvYmFsU2V0dXBPcHRpb25zW2tdID0gb3B0aW9uc1trXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXF3ZXN0XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlcXdlc3QgPSByZXF1aXJlKFwiLi9ib3dlcl9jb21wb25lbnRzL3JlcXdlc3QvcmVxd2VzdC5qc1wiKTtcbnZhciBEZWxlZ2F0ZSA9IHJlcXVpcmUoXCIuL2Jvd2VyX2NvbXBvbmVudHMvZG9tLWRlbGVnYXRlL2xpYi9kZWxlZ2F0ZS5qc1wiKTtcbnZhciBoZWFkZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuby1oZWFkZXInKTtcbnZhciBteUZ0ID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm8taGVhZGVyX19zZWNvbmRhcnktLW15ZnQtanMnKTtcbnZhciBteUZUQnV0dG9uID0gaGVhZGVyLnF1ZXJ5U2VsZWN0b3IoJy5vLWhlYWRlci1idXR0b24tanNbZGF0YS10YXJnZXQtcGFuZWw9XCJteWZ0XCJdJyk7XG52YXIgZGVmYXVsdFBhbmVsID0gaGVhZGVyLmdldEF0dHJpYnV0ZSgnZGF0YS1kZWZhdWx0LXBhbmVsJyk7XG52YXIgZGVsZWdhdGUgPSBuZXcgRGVsZWdhdGUoaGVhZGVyKTtcbnZhciBib2R5RGVsZWdhdGUgPSBuZXcgRGVsZWdhdGUoKTtcbnZhciBOb3RpZnkgPSByZXF1aXJlKCcuL3NyYy9qcy9Ob3RpZnknKTtcbnZhciBuZXh0VXNlclByZWZlcmVuY2VzID0gcmVxdWlyZShcIi4vYm93ZXJfY29tcG9uZW50cy9uZXh0LXVzZXItcHJlZmVyZW5jZXMvc3JjL21haW4uanNcIik7XG52YXIgVXNlciA9IHJlcXVpcmUoXCIuL2Jvd2VyX2NvbXBvbmVudHMvbmV4dC11c2VyLW1vZGVsLWNvbXBvbmVudC9tYWluLmpzXCIpO1xuXG5cblxuZGVsZWdhdGUub24oJ2NsaWNrJywgJy5vLWhlYWRlci1idXR0b24tanMnLCBmdW5jdGlvbihldmVudCkge1xuXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuXHQvLyBIQUNLXG5cdHZhciB0YXJnZXRQYW5lbCA9IGV2ZW50LnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0LXBhbmVsJylcblx0XHR8fCBldmVudC50YXJnZXQucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0LXBhbmVsJylcblx0XHR8fCBkZWZhdWx0UGFuZWw7XG5cdHZhciBjdXJyZW50UGFuZWwgPSBoZWFkZXIuZ2V0QXR0cmlidXRlKCdkYXRhLXBhbmVsJyk7XG5cdGlmIChjdXJyZW50UGFuZWwgIT09IHRhcmdldFBhbmVsICYmIHRhcmdldFBhbmVsICE9PSBkZWZhdWx0UGFuZWwpIHtcblx0XHRib2R5RGVsZWdhdGUucm9vdChkb2N1bWVudC5ib2R5KTtcblx0XHRoZWFkZXIuc2V0QXR0cmlidXRlKCdkYXRhLXBhbmVsJywgdGFyZ2V0UGFuZWwpO1xuXHR9IGVsc2Uge1xuXHRcdGJvZHlEZWxlZ2F0ZS5yb290KCk7XG5cdFx0aWYgKGRlZmF1bHRQYW5lbCkge1xuXHRcdFx0aGVhZGVyLnNldEF0dHJpYnV0ZSgnZGF0YS1wYW5lbCcsIGRlZmF1bHRQYW5lbCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGhlYWRlci5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtcGFuZWwnKTtcblx0XHR9XG5cdH1cbn0pO1xuXG5kZWxlZ2F0ZS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuXHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbn0pO1xuXG5ib2R5RGVsZWdhdGUub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdGlmIChkZWZhdWx0UGFuZWwpIHtcblx0XHRoZWFkZXIuc2V0QXR0cmlidXRlKCdkYXRhLXBhbmVsJywgZGVmYXVsdFBhbmVsKTtcblx0fSBlbHNlIHtcblx0XHRoZWFkZXIucmVtb3ZlQXR0cmlidXRlKCdkYXRhLXBhbmVsJyk7XG5cdH1cbn0pO1xuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdub3RpZmljYXRpb25zOmxvYWQnLCBmdW5jdGlvbihlKSB7XG5cbiAgICBjb25zb2xlLmxvZyhlKTtcblxuICAgIHZhciB0b3RhbCA9IDAsIFxuICAgICAgICBub3RpZmljYXRpb25zID0gZS5kZXRhaWw7XG5cdFx0XG4gICAgaWYobXlGVEJ1dHRvbi5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdub3RpZnktYmFkZ2UnKS5sZW5ndGgpIHtcbiAgICAgICAgbXlGVEJ1dHRvbi5nZXRFbGVtZW50c0J5Q2xhc3NOYW1lKCdub3RpZnktYmFkZ2UnKVswXS50ZXh0Q29udGVudCA9IG5vdGlmaWNhdGlvbnMuY291bnQ7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgbXlGVEJ1dHRvbi5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsICc8c3BhbiBjbGFzcz1cIm5vdGlmeS1iYWRnZVwiPicrdG90YWwgKyAnPC9zcGFuPicpXG4gICAgfVxuXHRcbn0pO1xuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdub3RpZmljYXRpb25zOm5ldycsIGZ1bmN0aW9uKGUpIHtcblx0dmFyIHRvdGFsID0gMCwgXG5cdCAgICBkYXRhID0gZS5kZXRhaWw7XG5cdFxuXHR2YXIgaWQgPSBkYXRhLm5vdGlmaWNhdGlvbnNbMF0uaXRlbTtcblx0cmVxd2VzdCh7XG5cdFx0dXJsOiAnLycgKyBpZCxcblx0XHRoZWFkZXJzOiB7XG5cdFx0XHQnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuXHRcdFx0J0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuXHRcdH1cblx0fSkudGhlbihmdW5jdGlvbihyZXMpIHtcblx0XHRuZXcgTm90aWZ5KHtcblx0XHRcdHRpdGxlOiAnTmV3IGFydGljbGUgaW4gJyArIGRhdGEuc3RyZWFtLmRpc3BsYXlUZXh0LFxuXHRcdFx0Ym9keTogcmVzLmhlYWRsaW5lLFxuXHRcdFx0bGlmZXNwYW46IDEwMDAgKiAxMCxcblx0XHRcdG9uY2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRsb2NhdGlvbi5ocmVmID0gJy8nICsgcmVzLmlkXG5cdFx0XHR9XG5cdFx0fSkuc2hvdygpO1xuXHR9KS5mYWlsKGZ1bmN0aW9uKGVycikge1xuXHRcdG5ldyBOb3RpZnkoe1xuXHRcdFx0dGl0bGU6ICdOZXcgYXJ0aWNsZSBpbiAnICsgZGF0YS5zdHJlYW0uZGlzcGxheVRleHQsXG5cdFx0XHRsaWZlc3BhbjogMTAwMCAqIDEwLFxuXHRcdFx0b25jbGljazogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGxvY2F0aW9uLmhyZWYgPSAnLycgKyBkYXRhLm5vdGlmaWNhdGlvbnNbMF0uaXRlbVxuXHRcdFx0fVxuXHRcdH0pLnNob3coKTtcblx0fSk7XG5cblxufSk7XG5cbmZ1bmN0aW9uIHNldEZvbGxvd2luZ0J1dHRvbiAoKSB7XG5cdG15RlRCdXR0b24uc2V0QXR0cmlidXRlKCdocmVmJywgJ25leHQuZnQuY29tL3VzZXJzLycgKyBuZXcgVXNlcihkb2N1bWVudC5jb29raWUpLmlkKCkpICsgJy9mb2xsb3dpbmcvbmV3Jztcbn1cblxuZnVuY3Rpb24gdHJhbnNpdGlvbk15RlRCdXR0b24gKHR5cGUpIHtcblxuXHRmdW5jdGlvbiBsaXN0ZW5lcigpIHtcblx0XHRteUZUQnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoJ3RyYW5zaXRpb25pbmcnKTtcblx0XHRteUZUQnV0dG9uLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RyYW5zaXRpb25lbmQnLCBsaXN0ZW5lcik7XG5cdH07XG5cblx0bXlGVEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgbGlzdGVuZXIpO1xuXHRteUZUQnV0dG9uLmNsYXNzTGlzdC5hZGQoJ3RyYW5zaXRpb25pbmcnKTtcblx0bXlGVEJ1dHRvbi5jbGFzc0xpc3QuYWRkKCdteWZ0LS0nICsgdHlwZSk7XG5cdG15RlRCdXR0b24ub2Zmc2V0V2lkdGg7IC8vZm9yY2VzIHJlcGFpbnRcblxuXHRteUZUQnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoJ215ZnQtLScgKyB0eXBlKTtcbn1cblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZmF2b3VyaXRlczphZGQnLCBmdW5jdGlvbiAoZSkge1xuXHR0cmFuc2l0aW9uTXlGVEJ1dHRvbignYWRkLWZhdm91cml0ZScpO1xufSk7XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2Zhdm91cml0ZXM6cmVtb3ZlJywgZnVuY3Rpb24gKGUpIHtcblx0dHJhbnNpdGlvbk15RlRCdXR0b24oJ3JlbW92ZS1mYXZvdXJpdGUnKTtcbn0pO1xuXG5cbnJlcXdlc3QoJ2h0dHA6Ly9uZXh0LWNvbXBhbmllcy1ldC1hbC5oZXJva3VhcHAuY29tL3YxL3ViZXJuYXYuanNvbicsIGZ1bmN0aW9uKHJlc3ApIHtcblx0dmFyIGRhdGEgPSByZXNwLmRhdGE7XG5cdGhlYWRlci5xdWVyeVNlbGVjdG9yKCcuby1oZWFkZXJfX3NlY29uZGFyeS0tbWVudS1qcycpLmlubmVySFRNTCA9ICc8dWwgY2xhc3M9XCJ1YmVyLWluZGV4XCI+J1xuXHRcdCsgZGF0YS5tYXAoZnVuY3Rpb24oaXRlbSkge1xuXHRcdHJldHVybiAnPGxpIGNsYXNzPVwidWJlci1pbmRleF9fdGl0bGVcIiBkYXRhLW8tZ3JpZC1jb2xzcGFuPVwiNiBNNiBMMyBYTDNcIj4nXG5cdFx0XHQrICc8YSBocmVmPVwiJyArIGl0ZW0ubmV4dFVybCArICdcIj4nICsgaXRlbS50aXRsZSArICc8L2E+J1xuXHRcdFx0KyAnPHVsIGNsYXNzPVwidWJlci1pbmRleF9fY2hpbGRyZW5cIj4nXG5cdFx0XHQrIGl0ZW0ubmF2aWdhdGlvbkl0ZW1zLm1hcChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0XHRyZXR1cm4gJzxsaSBjbGFzcz1cInViZXItaW5kZXhfX2NoaWxkXCI+PGEgaHJlZj1cIicgKyBjaGlsZC5uZXh0VXJsICsgJ1wiPicgKyBjaGlsZC50aXRsZSArICc8L2E+PC9saT4nO1xuXHRcdFx0fSkuam9pbignJylcblx0XHRcdCsgJzwvdWw+J1xuXHRcdFx0KyAnPC9saT4nO1xuXHRcdH0pLmpvaW4oJycpO1xuXHRcdCsgJzwvdWw+Jztcbn0pO1xuXG5zZXRGb2xsb3dpbmdCdXR0b24oKTtcblxuaWYgKG15RnQpIG5leHRVc2VyUHJlZmVyZW5jZXMuaW5pdChteUZ0LCB7IG5vdGlmeTogdHJ1ZSB9KTtcbiIsIi8qKlxuICogTWVzc2FnZSB0aGUgdXNlclxuICpcbiAqID4gbmV3IE5vdGlmeSh7IGh0bWw6IFwiWW91J3ZlIGdvdCBtYWlsXCIsIGxpZmVzcGFjZTogMTAwMDAgfSkuc2hvdygpO1xuICpcbiAqIFRPRE9cbiAqXG4gKiAgLSBVWCB0byBkZWFsIHdpdGggbXVsdGlwbGUgbWVzc2FnZXMuXG4gKiAgLSBXMyAvIENocm9tZSBkZXNrdG9wIG5vdGlmaWNhdGlvbnMgcGVybWlzc2lvbi5cbiAqICAtIEFja25vd2xlZGdlbWVudCBVWFxuICpcbiAqL1xudmFyIE5vdGlmeSA9IGZ1bmN0aW9uIChtZXNzYWdlKSB7XG4gICAgdGhpcy50ZW1wbGF0ZSA9ICc8aDMgY2xhc3M9XCJtZXNzYWdlX190aXRsZVwiPicgKyBtZXNzYWdlLnRpdGxlICsgJzxpIGNsYXNzPVwibWVzc2FnZV9fY2xvc2UgaWNvbiBpY29uX19jbG9zZVwiPjwvaT48L2gzPjxzcGFuIGNsYXNzPVwibWVzc2FnZV9fYm9keVwiPicgKyBtZXNzYWdlLmJvZHkgKyAnPC9zcGFuPic7XG4gICAgdGhpcy5saWZlc3BhbiA9IG1lc3NhZ2UubGlmZXNwYW4gfHwgNTAwMDtcbiAgICB0aGlzLmRvbSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgIHRoaXMuZG9tLmNsYXNzTmFtZSA9ICdtZXNzYWdlX19jb250YWluZXInXG4gICAgdGhpcy5kb20uaW5uZXJIVE1MID0gdGhpcy50ZW1wbGF0ZTsgXG4gICAgdGhpcy5oYXNEZXNrdG9wUGVybWlzc2lvbiA9IGZhbHNlO1xuICAgIHRoaXMucm9vdCA9IGRvY3VtZW50LmJvZHk7XG4gICAgdGhpcy5tZXNzYWdlID0gbWVzc2FnZTtcbn07XG5cbmZ1bmN0aW9uIGNyZWF0ZU5vdGlmaWNhdGlvbihtZXNzYWdlKSB7XG4gICAgdmFyIG5vdGlmaWNhdGlvbiA9IG5ldyBOb3RpZmljYXRpb24obWVzc2FnZS50aXRsZSwge2JvZHk6IG1lc3NhZ2UuYm9keX0pO1xuICAgIG5vdGlmaWNhdGlvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIG1lc3NhZ2Uub25jbGljayk7XG4gICAgcmV0dXJuIG5vdGlmaWNhdGlvbjtcbn1cblxuTm90aWZ5LnByb3RvdHlwZS5zaG93ID0gZnVuY3Rpb24gKCkge1xuICAgIFxuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICAvLyBncmFudGVkXG4gICAgLy9UT0RPIC0gZW5hYmxlIHRoaXMgYWdhaW4gb25jZSB3ZSd2ZSB0aG91Z2h0IGFib3V0IHRoZSBVWCFcbiAgICBpZiAoZmFsc2UgJiYgd2luZG93Lk5vdGlmaWNhdGlvbiAmJiBOb3RpZmljYXRpb24ucGVybWlzc2lvbiA9PT0gXCJncmFudGVkXCIpIHtcbiAgICAgICAgY3JlYXRlTm90aWZpY2F0aW9uKHNlbGYubWVzc2FnZSk7XG4gICAgfSBlbHNlIGlmIChmYWxzZSAmJiB3aW5kb3cuTm90aWZpY2F0aW9uICYmIE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uICE9PSBcImRlbmllZFwiKSB7XG4gICAgICBcbiAgICAgICAgTm90aWZpY2F0aW9uLnJlcXVlc3RQZXJtaXNzaW9uKGZ1bmN0aW9uIChzdGF0dXMpIHtcbiAgICAgICAgICAgIGlmIChOb3RpZmljYXRpb24ucGVybWlzc2lvbiAhPT0gc3RhdHVzKSB7XG4gICAgICAgICAgICAgICAgTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gPSBzdGF0dXM7XG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIC8vIGdyYW50ZWRcbiAgICAgICAgICAgIGlmIChzdGF0dXMgPT09IFwiZ3JhbnRlZFwiKSB7XG4gICAgICAgICAgICAgICAgY3JlYXRlTm90aWZpY2F0aW9uKHNlbGYubWVzc2FnZSk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHNlbGYuc2hvd0h0bWxOb3RpZmljYXRpb24oKTsgICAgXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIC8vIGRlbmllZFxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuc2hvd0h0bWxOb3RpZmljYXRpb24oKTsgICAgXG4gICAgfVxufTtcblxuTm90aWZ5LnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24gKCkge1xuICAgIC8vIEZJWE1FIGZvcmdldCBpZiBJIG5lZWQgdG8gcmVtb3ZlIGV2ZW50IGxpc3RlbmVyIDopXG4gICAgdGhpcy5kb20ucGFyZW50Tm9kZS5yZW1vdmVDaGlsZCh0aGlzLmRvbSk7XG59O1xuXG5Ob3RpZnkucHJvdG90eXBlLnNob3dIdG1sTm90aWZpY2F0aW9uID0gZnVuY3Rpb24gKCkge1xuXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuXG4gICAgdGhpcy5yb290LmFwcGVuZENoaWxkKHRoaXMuZG9tKTtcblxuICAgIC8vIEF1dG9tYXRpY2FsbHkgZGVzdHJveSB0aGUgYm94IGFmdGVyIGEgZmV3IHNlY29uZHNcbiAgICB2YXIgc2VsZkRlc3RydWN0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgIH0sIHRoaXMubGlmZXNwYW4pOyBcblxuICAgIC8vIEFja25vd2xlZGdtZW50IFVJXG4gICAgdGhpcy5kb20ucXVlcnlTZWxlY3RvcignLm1lc3NhZ2VfX2Nsb3NlJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICBjbGVhclRpbWVvdXQoc2VsZkRlc3RydWN0KTtcbiAgICB9KTtcblxuICAgIHRoaXMuZG9tLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKGUpIHtcbiAgICAgICAgaWYoZS50YXJnZXQuY2xhc3NOYW1lLmluZGV4T2YoJ21lc3NhZ2VfX2Nsb3NlJykgPj0gMCkge1xuICAgICAgICAgICAgcmV0dXJuO1xuICAgICAgICB9XG4gICAgICAgIHNlbGYubWVzc2FnZS5vbmNsaWNrKCk7XG4gICAgICAgIHNlbGYuZGVzdHJveSgpO1xuICAgICAgICBjbGVhclRpbWVvdXQoc2VsZkRlc3RydWN0KTtcbiAgICB9KTtcblxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb3RpZnk7Il19
