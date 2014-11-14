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

var reqwest = require('../vendor/reqwest.min');
var User    = require("./../../../next-user-model-component/main.js");

var emit = function(name, data) {
  var event = document.createEvent('Event');
  event.initEvent(name, true, true);
  if (data) {
    event.detail = data;
  }
  document.dispatchEvent(event);
};

var List = function (opts) {
    this.name  = opts.name;
    this.api = 'http://ft-next-api-user-prefs.herokuapp.com/user/';
    this.userId = new User(document.cookie).id();
    this.session = new User(document.cookie).session();
};

List.prototype._request = function(method, payload, path) {
    
    console.log(method, this.api + this.name + ((path) ? '/' + path : ''));
    return reqwest({
        url: this.api + this.name + ((path) ? '/' + path : ''),
        method: method,
        type: 'json',
        timeout: 5000,
        data: (payload) ? JSON.stringify(payload) : '',
        contentType: 'application/json',
        headers: {
            'X-FT-UID': this.userId,
            'X-FT-SESSION': this.session
        },
        crossOrigin: true
    })
}


List.prototype.fetch = function () {
    var self = this;
    this._request('GET')
        .then(function (response) {
            emit(self.name + ':load', response)
        })    
        .fail(function() {
            console.log('failed to fetch to list');
        });
};

List.prototype.add = function (payload) {
    this._request('PUT', payload)
        .fail(function() {
            console.log('failed to add to list', payload);
        });
};

List.prototype.clear = function (payload) {

    if (!payload.uuidv3) {
        throw "Attempting to delete a list without a uuid string"
    }

    this._request('DELETE', undefined, encodeURI(decodeURI(payload.uuidv3)))
        .fail(function() {
            console.log('failed to delete to list', payload);
        });
};

module.exports = List;

},{"../vendor/reqwest.min":8,"./../../../next-user-model-component/main.js":2}],5:[function(require,module,exports){

var reqwest = require('../vendor/reqwest.min');
var User    = require("./../../../next-user-model-component/main.js");

var NOTIFICATIONS_URL = 'http://ft-next-api-user-prefs.herokuapp.com/user/notifications';

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


function NotificationPoller() {
	
    this.userId = new User(document.cookie).id();

	setInterval(this.poll.bind(this), 1000 * 60 * 0.2); // 30 second polling
	
	// Clear notifications if a stream has been openend
	this.currentStream = getCurrentStream();

    // FIXME - not implemented
	if(/PATH-TO-FOLLOWING/.test(location.pathname)) {
        console.log('clearing all notifications');
	} else if(this.currentStream) {
		this.clear(this.currentStream);
	}

	this.poll(); //pass flag to indicate this is the first load

}

NotificationPoller.prototype.poll = function() {
	
    // fetch all notifications
    reqwest({
        url: NOTIFICATIONS_URL,
        type: 'json',
        method: 'get',
        headers: {
            'X-FT-UID': this.userId 
        },
        crossOrigin: true
    }, function (notifications) {
        emit('notifications:load', { count: notifications.length });
    });
};

NotificationPoller.prototype.clear = function(uuid) {
	if(uuid) {
		reqwest({
			url: NOTIFICATIONS_URL + '/' + uuid,
			type: 'json',
			method: 'delete',
			headers: {
				'X-FT-UID': this.userId
			},
			crossOrigin: true
		});
	}
};

module.exports = NotificationPoller;

},{"../vendor/reqwest.min":8,"./../../../next-user-model-component/main.js":2}],6:[function(require,module,exports){

var List = require('./List');

var UserPrefs = function(opts) {

    // Create lists for a user
    var recommend   = new List({ name: 'recommend' });
    var following   = new List({ name: 'favourites' }); // FIXME change to following after new API is working
    var forlater    = new List({ name: 'forlaters' });
    var history     = new List({ name: 'history' });
   
    // Listen for events, bind them to the list methods
    document.addEventListener('recommend:add', function (event) {
        recommend.add(event.detail);
    });

    document.addEventListener('favourites:add', function (event) {
        following.add(event.detail);
    });
    
    document.addEventListener('forlaters:add', function (event) {
        forlater.add(event.detail);
    });
    
    document.addEventListener('recommend:remove', function (event) {
        recommend.clear(event.detail);
    });

    document.addEventListener('favourites:remove', function (event) {
        following.clear(event.detail);
    });
    
    document.addEventListener('forlaters:remove', function (event) {
        forlater.clear(event.detail);
    });
    
    // Fetch each type of list so that the contents of each one gets broadcast
    // to the rest of the UI 
    
    following.fetch();
    forlater.fetch();
    recommend.fetch();

};


module.exports = UserPrefs;

},{"./List":4}],7:[function(require,module,exports){

var UserPrefs           = require('./lib/UserPrefs');
var NotificationPoller  = require('./lib/NotificationPoller');

(function () {
    new UserPrefs();
    new NotificationPoller();
})();

},{"./lib/NotificationPoller":5,"./lib/UserPrefs":6}],8:[function(require,module,exports){
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
var myFtButton = header.querySelector('.o-header-button[data-target-panel="myft"]');
var defaultPanel = header.getAttribute('data-default-panel');
var delegate = new Delegate(header);
var bodyDelegate = new Delegate();
var Notify = require('./src/js/Notify');
require("./bower_components/next-user-preferences/src/main.js");
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


// Listen for the notification poller to report the number of new items
document.addEventListener('notifications:load', function(e) {
    var notifications = e.detail;
    document.querySelector('.notify-badge').textContent = notifications.count;
});

document.addEventListener('notifications:new', function(e) {
	var data = e.detail;
	
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
				location.href = '/' + res.id;
			}
		}).show();
	}).fail(function(err) {
		new Notify({
			title: 'New article in ' + data.stream.displayText,
			lifespan: 1000 * 10,
			onclick: function() {
				location.href = '/' + data.notifications[0].item;
			}
		}).show();
	});


});

// Make the follow button visible  
function setFollowingButton () {
	var uid = new User(document.cookie).id();
	if (uid) {
		myFtButton.setAttribute('href', '/users/' + uid + '/following/new');
		myFtButton.textContent = 'Following';
		myFtButton.insertAdjacentHTML('beforeend', '<span class="notify-badge"></span>');
	}
}

function transitionMyFtButton (type) {

	function listener() {
		myFtButton.classList.remove('transitioning');
		myFtButton.removeEventListener('transitionend', listener);
	}

	myFtButton.addEventListener('transitionend', listener);
	myFtButton.classList.add('transitioning');
	myFtButton.classList.add('myft--' + type);
	myFtButton.offsetWidth; //forces repaint

	myFtButton.classList.remove('myft--' + type);
}

document.addEventListener('favourites:add', function (e) {
	transitionMyFtButton('add-favourite');
});

document.addEventListener('favourites:remove', function (e) {
	transitionMyFtButton('remove-favourite');
});

var data = require('./src/uber-index.json').data;

function splitArray(arr, by) {
	return arr.reduce(function(out, value, index) {
		var column = index % by;
		out[column] = out[column] || [];
		out[column].push(value);
		return out;
	},[]);
}

// Split the data into four columns, and again into 2
data = splitArray(splitArray(data, 4), 2);

header.querySelector('.o-header__secondary--menu-js').innerHTML = '<ul class="uber-index">'
	+ data.map(function(item) {
		return '<ul data-o-grid-colspan="6 M6 L6 XL6">'
			+ item.map(function(item) {
				return '<ul data-o-grid-colspan="12 M12 L6 XL6">'
					+ item.map(function(item) {
						return '<li class="uber-index__title">'
							+ '<a href="' + item.nextUrl + '">' + item.title + '</a>'
							+ '<ul class="uber-index__children">'
							+ item.navigationItems.map(function(child) {
								return '<li class="uber-index__child"><a href="' + child.nextUrl + '">' + child.title + '</a></li>';
							}).join('')
							+ '</ul>'
							+ '</li>';
					}).join('')
					+ '</ul>';
			}).join('')
			+ '</ul>';
	}).join('')
	+ '</ul>';

setFollowingButton();

},{"./bower_components/dom-delegate/lib/delegate.js":1,"./bower_components/next-user-model-component/main.js":2,"./bower_components/next-user-preferences/src/main.js":7,"./bower_components/reqwest/reqwest.js":9,"./src/js/Notify":11,"./src/uber-index.json":12}],11:[function(require,module,exports){
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
},{}],12:[function(require,module,exports){
module.exports={"status":"success","data":[{"title":"Home","webUrl":"http://www.ft.com","navigationItems":[],"nextUrl":"/"},{"title":"UK","webUrl":"http://www.ft.com/world/uk","navigationItems":[{"title":"Business","webUrl":"http://www.ft.com/world/uk/business","links":[{"href":"http://api.ft.com/site/v1/pages/e49dd0b8-fbbc-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"e49dd0b8-fbbc-11df-b79a-00144feab49a","nextUrl":"/search?q=page:Business"},{"title":"UK Companies","webUrl":"http://www.ft.com/companies/uk","links":[{"href":"http://api.ft.com/site/v1/pages/be0c84a4-f7e2-11df-b770-00144feab49a","rel":"site-page"}],"uuid":"be0c84a4-f7e2-11df-b770-00144feab49a","nextUrl":"/search?q=page:Companies"}],"nextUrl":"/search?q=page:uk"},{"title":"World","webUrl":"http://www.ft.com/world","navigationItems":[{"title":"Africa","webUrl":"http://www.ft.com/world/africa","links":[{"href":"http://api.ft.com/site/v1/pages/042d77d4-fbbe-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"042d77d4-fbbe-11df-b79a-00144feab49a","nextUrl":"/search?q=page:Africa"},{"title":"Europe","webUrl":"http://www.ft.com/world/europe","links":[{"href":"http://api.ft.com/site/v1/pages/012ba83a-fbbe-11df-b79a-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Brussels","webUrl":"http://www.ft.com/world/europe/brussels","links":[{"href":"http://api.ft.com/site/v1/pages/b29c960c-fbbd-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"b29c960c-fbbd-11df-b79a-00144feab49a"}],"uuid":"012ba83a-fbbe-11df-b79a-00144feab49a","nextUrl":"/search?q=page:Europe"},{"title":"UK","webUrl":"http://www.ft.com/world/uk","links":[{"href":"http://api.ft.com/site/v1/pages/2836ebbe-cd26-11de-a748-00144feabdc0","rel":"site-page"}],"navigationItems":[{"title":"Business","webUrl":"http://www.ft.com/world/uk/business","links":[{"href":"http://api.ft.com/site/v1/pages/e49dd0b8-fbbc-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"e49dd0b8-fbbc-11df-b79a-00144feab49a"},{"title":"Economy","webUrl":"http://www.ft.com/world/uk/economy","links":[{"href":"http://api.ft.com/site/v1/pages/d9a6b832-fbbc-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"d9a6b832-fbbc-11df-b79a-00144feab49a"},{"title":"UK Companies","webUrl":"http://www.ft.com/companies/uk","links":[{"href":"http://api.ft.com/site/v1/pages/be0c84a4-f7e2-11df-b770-00144feab49a","rel":"site-page"}],"uuid":"be0c84a4-f7e2-11df-b770-00144feab49a"},{"title":"Politics & Policy","webUrl":"http://www.ft.com/world/uk/politics","links":[{"href":"http://api.ft.com/site/v1/pages/e8af8cb4-fbbc-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"e8af8cb4-fbbc-11df-b79a-00144feab49a"},{"title":"Scottish independence","webUrl":"http://www.ft.com/indepth/scottish-independence","links":[{"href":"http://api.ft.com/site/v1/pages/84928e1a-cb41-11e1-b896-00144feabdc0","rel":"site-page"}],"uuid":"84928e1a-cb41-11e1-b896-00144feabdc0"},{"title":"UK Small Companies","webUrl":"http://www.ft.com/companies/uksmallercompanies","links":[{"href":"http://api.ft.com/site/v1/pages/f212bd26-f7de-11df-b770-00144feab49a","rel":"site-page"}],"uuid":"f212bd26-f7de-11df-b770-00144feab49a"}],"uuid":"2836ebbe-cd26-11de-a748-00144feabdc0","nextUrl":"/search?q=page:uk"},{"title":"US & Canada","webUrl":"http://www.ft.com/world/us","links":[{"href":"http://api.ft.com/site/v1/pages/362127c8-fbbd-11df-b79a-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Economy","webUrl":"http://www.ft.com/world/us/economy","links":[{"href":"http://api.ft.com/site/v1/pages/2555c4e6-fbc5-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"2555c4e6-fbc5-11df-b79a-00144feab49a"},{"title":"Politics & Policy","webUrl":"http://www.ft.com/world/us/politics","links":[{"href":"http://api.ft.com/site/v1/pages/eb6cf9de-fbc4-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"eb6cf9de-fbc4-11df-b79a-00144feab49a"},{"title":"Society","webUrl":"http://www.ft.com/world/us/society","links":[{"href":"http://api.ft.com/site/v1/pages/18be9990-fbbd-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"18be9990-fbbd-11df-b79a-00144feab49a"},{"title":"Canada","webUrl":"http://www.ft.com/world/canada","links":[{"href":"http://api.ft.com/site/v1/pages/ee5b45ce-fbc4-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"ee5b45ce-fbc4-11df-b79a-00144feab49a"}],"uuid":"362127c8-fbbd-11df-b79a-00144feab49a","nextUrl":"/search?q=page:US"}],"nextUrl":"/search?q=page:world"},{"title":"Companies","webUrl":"http://www.ft.com/companies","navigationItems":[{"title":"Energy","webUrl":"http://www.ft.com/companies/energy","links":[{"href":"http://api.ft.com/site/v1/pages/753c57ee-f7e8-11df-8d91-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Mining","webUrl":"http://www.ft.com/companies/mining","links":[{"href":"http://api.ft.com/site/v1/pages/7090b33e-f7e8-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"7090b33e-f7e8-11df-8d91-00144feab49a"},{"title":"Oil & Gas","webUrl":"http://www.ft.com/companies/oil-gas","links":[{"href":"http://api.ft.com/site/v1/pages/6df3be5a-f7e8-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"6df3be5a-f7e8-11df-8d91-00144feab49a"},{"title":"Utilities","webUrl":"http://www.ft.com/companies/utilities","links":[{"href":"http://api.ft.com/site/v1/pages/72d5bf68-f7e8-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"72d5bf68-f7e8-11df-8d91-00144feab49a"}],"uuid":"753c57ee-f7e8-11df-8d91-00144feab49a","nextUrl":"/search?q=page:Energy"},{"title":"Financials","webUrl":"http://www.ft.com/companies/financials","links":[{"href":"http://api.ft.com/site/v1/pages/f3edb646-f7e3-11df-8d91-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Banks","webUrl":"http://www.ft.com/companies/banks","links":[{"href":"http://api.ft.com/site/v1/pages/f1174c20-f7e3-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"f1174c20-f7e3-11df-8d91-00144feab49a"},{"title":"Insurance","webUrl":"http://www.ft.com/companies/insurance","links":[{"href":"http://api.ft.com/site/v1/pages/ed6b120a-f7e3-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"ed6b120a-f7e3-11df-8d91-00144feab49a"},{"title":"Property","webUrl":"http://www.ft.com/companies/property","links":[{"href":"http://api.ft.com/site/v1/pages/d83a0ae4-f7e3-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"d83a0ae4-f7e3-11df-8d91-00144feab49a"},{"title":"Financial Services","webUrl":"http://www.ft.com/companies/financial-services","links":[{"href":"http://api.ft.com/site/v1/pages/d6080faa-f7e3-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"d6080faa-f7e3-11df-8d91-00144feab49a"}],"uuid":"f3edb646-f7e3-11df-8d91-00144feab49a","nextUrl":"/search?q=page:Financials"},{"title":"Health","webUrl":"http://www.ft.com/companies/health","links":[{"href":"http://api.ft.com/site/v1/pages/07ef74ea-f7e9-11df-8d91-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Health Care","webUrl":"http://www.ft.com/companies/health-care","links":[{"href":"http://api.ft.com/site/v1/pages/f03ae3de-f7e8-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"f03ae3de-f7e8-11df-8d91-00144feab49a"},{"title":"Pharmaceuticals","webUrl":"http://www.ft.com/companies/pharmaceuticals","links":[{"href":"http://api.ft.com/site/v1/pages/ee014838-f7e8-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"ee014838-f7e8-11df-8d91-00144feab49a"}],"uuid":"07ef74ea-f7e9-11df-8d91-00144feab49a","nextUrl":"/search?q=page:Health"},{"title":"Industrials","webUrl":"http://www.ft.com/companies/industrials","links":[{"href":"http://api.ft.com/site/v1/pages/4464ab84-f7e4-11df-8d91-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Aerospace & Defence","webUrl":"http://www.ft.com/companies/aerospace-defence","links":[{"href":"http://api.ft.com/site/v1/pages/10f72cfe-f7e4-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"10f72cfe-f7e4-11df-8d91-00144feab49a"},{"title":"Automobiles","webUrl":"http://www.ft.com/companies/automobiles","links":[{"href":"http://api.ft.com/site/v1/pages/2586a942-f7e4-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"2586a942-f7e4-11df-8d91-00144feab49a"},{"title":"Basic Resources","webUrl":"http://www.ft.com/companies/basic-resources","links":[{"href":"http://api.ft.com/site/v1/pages/154ec1c2-f7e4-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"154ec1c2-f7e4-11df-8d91-00144feab49a"},{"title":"Chemicals","webUrl":"http://www.ft.com/companies/chemicals","links":[{"href":"http://api.ft.com/site/v1/pages/0c063528-f7e4-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"0c063528-f7e4-11df-8d91-00144feab49a"},{"title":"Construction","webUrl":"http://www.ft.com/companies/construction","links":[{"href":"http://api.ft.com/site/v1/pages/04597038-f7e4-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"04597038-f7e4-11df-8d91-00144feab49a"},{"title":"Industrial Goods","webUrl":"http://www.ft.com/companies/industrial-goods","links":[{"href":"http://api.ft.com/site/v1/pages/0e57f582-f7e4-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"0e57f582-f7e4-11df-8d91-00144feab49a"},{"title":"Support Services","webUrl":"http://www.ft.com/companies/support-services","links":[{"href":"http://api.ft.com/site/v1/pages/a9606d6c-a0cf-11e1-851f-00144feabdc0","rel":"site-page"}],"uuid":"a9606d6c-a0cf-11e1-851f-00144feabdc0"}],"uuid":"4464ab84-f7e4-11df-8d91-00144feab49a","nextUrl":"/search?q=page:Industrials"},{"title":"Luxury 360","webUrl":"http://www.ft.com/companies/luxury-360","links":[{"href":"http://api.ft.com/site/v1/pages/0d2df2b6-a247-11e0-bb06-00144feabdc0","rel":"site-page"}],"uuid":"0d2df2b6-a247-11e0-bb06-00144feabdc0","nextUrl":"/search?q=page:Luxury 360"},{"title":"Media","webUrl":"http://www.ft.com/companies/media","links":[{"href":"http://api.ft.com/site/v1/pages/0442a548-f7e3-11df-b770-00144feab49a","rel":"site-page"}],"uuid":"0442a548-f7e3-11df-b770-00144feab49a","nextUrl":"/search?q=page:Media"},{"title":"Tech","webUrl":"http://www.ft.com/companies/technology","links":[{"href":"http://api.ft.com/site/v1/pages/e900741c-f7e8-11df-8d91-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Science","webUrl":"http://www.ft.com/technology/science","links":[{"href":"http://api.ft.com/site/v1/pages/77b68d96-f7e8-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"77b68d96-f7e8-11df-8d91-00144feab49a"},{"title":"Tech Blog","webUrl":"http://blogs.ft.com/fttechhub/"}],"uuid":"e900741c-f7e8-11df-8d91-00144feab49a","nextUrl":"/search?q=page:Technology"},{"title":"Telecoms","webUrl":"http://www.ft.com/companies/telecoms","links":[{"href":"http://api.ft.com/site/v1/pages/6b0dd84c-f7e8-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"6b0dd84c-f7e8-11df-8d91-00144feab49a","nextUrl":"/search?q=page:Telecoms"},{"title":"Transport","webUrl":"http://www.ft.com/companies/transport","links":[{"href":"http://api.ft.com/site/v1/pages/0253665e-f7e4-11df-8d91-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Airlines","webUrl":"http://www.ft.com/companies/airlines","links":[{"href":"http://api.ft.com/site/v1/pages/fa6dacf6-f7e3-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"fa6dacf6-f7e3-11df-8d91-00144feab49a"},{"title":"Shipping","webUrl":"http://www.ft.com/companies/shipping","links":[{"href":"http://api.ft.com/site/v1/pages/fc89bf8e-f7e3-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"fc89bf8e-f7e3-11df-8d91-00144feab49a"},{"title":"Rail","webUrl":"http://www.ft.com/companies/rail","links":[{"href":"http://api.ft.com/site/v1/pages/f862d4ea-f7e3-11df-8d91-00144feab49a","rel":"site-page"}],"uuid":"f862d4ea-f7e3-11df-8d91-00144feab49a"}],"uuid":"0253665e-f7e4-11df-8d91-00144feab49a","nextUrl":"/search?q=page:Transport"}],"nextUrl":"/search?q=page:companies"},{"title":"Markets","webUrl":"http://www.ft.com/markets","navigationItems":[{"title":"FTfm","webUrl":"http://www.ft.com/ftfm","links":[{"href":"http://api.ft.com/site/v1/pages/d634d330-786f-11df-942a-00144feabdc0","rel":"site-page"}],"navigationItems":[{"title":"Regulation","webUrl":"http://www.ft.com/ftfm/regulation","links":[{"href":"http://api.ft.com/site/v1/pages/7dc4c904-8150-11e0-9360-00144feabdc0","rel":"site-page"}],"uuid":"7dc4c904-8150-11e0-9360-00144feabdc0"},{"title":"ETFs","webUrl":"http://www.ft.com/ftfm/etfs","links":[{"href":"http://api.ft.com/site/v1/pages/69c9596e-74b4-11df-aed7-00144feabdc0","rel":"site-page"}],"uuid":"69c9596e-74b4-11df-aed7-00144feabdc0"},{"title":"Investment Strategy","webUrl":"http://www.ft.com/ftfm/investment-strategy","links":[{"href":"http://api.ft.com/site/v1/pages/04faf19c-fbc2-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"04faf19c-fbc2-11df-b79a-00144feab49a"},{"title":"Pensions","webUrl":"http://www.ft.com/ftfm/pensions","links":[{"href":"http://api.ft.com/site/v1/pages/07e83644-fbc2-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"07e83644-fbc2-11df-b79a-00144feab49a"},{"title":"People","webUrl":"http://www.ft.com/ftfm/people","links":[{"href":"http://api.ft.com/site/v1/pages/0e8130be-fbc2-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"0e8130be-fbc2-11df-b79a-00144feab49a"},{"title":"Opinion","webUrl":"http://www.ft.com/ftfm/opinion","links":[{"href":"http://api.ft.com/site/v1/pages/2a2fae4a-f008-11e0-bc9d-00144feab49a","rel":"site-page"}],"uuid":"2a2fae4a-f008-11e0-bc9d-00144feab49a"},{"title":"Video","webUrl":"http://video.ft.com/ftfm"}],"uuid":"d634d330-786f-11df-942a-00144feabdc0","nextUrl":"/search?q=page:FT Fund Management"},{"title":"Trading Room","webUrl":"http://www.ft.com/markets/trading-room","links":[{"href":"http://api.ft.com/site/v1/pages/268d25be-89b2-11df-9ea6-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Clearing & Settlement","webUrl":"http://www.ft.com/ft-trading-room/clearing-settlement","links":[{"href":"http://api.ft.com/site/v1/pages/f940500e-fba3-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"f940500e-fba3-11df-b79a-00144feab49a"},{"title":"Developing Markets & Asia","webUrl":"http://www.ft.com/ft-trading-room/developing-markets-asia","links":[{"href":"http://api.ft.com/site/v1/pages/b66457e4-fba3-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"b66457e4-fba3-11df-b79a-00144feab49a"},{"title":"High Frequency Trading","webUrl":"http://www.ft.com/ft-trading-room/high-frequency-trading","links":[{"href":"http://api.ft.com/site/v1/pages/e51111d4-9310-11e2-9593-00144feabdc0","rel":"site-page"}],"uuid":"e51111d4-9310-11e2-9593-00144feabdc0"},{"title":"Markets Regulation","webUrl":"http://www.ft.com/ft-trading-room/markets-regulation","links":[{"href":"http://api.ft.com/site/v1/pages/c25a063e-fba3-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"c25a063e-fba3-11df-b79a-00144feab49a"},{"title":"Trading Technology","webUrl":"http://www.ft.com/ft-trading-room/trading-technology","links":[{"href":"http://api.ft.com/site/v1/pages/de79d358-fba3-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"de79d358-fba3-11df-b79a-00144feab49a"},{"title":"Quick View","webUrl":"http://www.ft.com/ft-trading-room/quick-view","links":[{"href":"http://api.ft.com/site/v1/pages/d0f4be3c-fba3-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"d0f4be3c-fba3-11df-b79a-00144feab49a"},{"title":"Carbon Markets","webUrl":"http://www.ft.com/ft-trading-room/carbon-markets","links":[{"href":"http://api.ft.com/site/v1/pages/8c8681a6-24ea-11e1-8bf9-00144feabdc0","rel":"site-page"}],"uuid":"8c8681a6-24ea-11e1-8bf9-00144feabdc0"},{"title":"Exchanges Consolidation","webUrl":"http://www.ft.com/ft-trading-room/exchanges-consolidation","links":[{"href":"http://api.ft.com/site/v1/pages/4f633f96-9d7f-11e0-9a70-00144feabdc0","rel":"site-page"}],"uuid":"4f633f96-9d7f-11e0-9a70-00144feabdc0"}],"uuid":"268d25be-89b2-11df-9ea6-00144feab49a","nextUrl":"/search?q=page:FT Trading Room"},{"title":"Equities","webUrl":"http://www.ft.com/markets/equities","links":[{"href":"http://api.ft.com/site/v1/pages/d3ed5ce8-fba3-11df-b79a-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"US","webUrl":"http://www.ft.com/markets/us","links":[{"href":"http://api.ft.com/site/v1/pages/f58f9f96-fba3-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"f58f9f96-fba3-11df-b79a-00144feab49a"},{"title":"UK","webUrl":"http://www.ft.com/markets/uk","links":[{"href":"http://api.ft.com/site/v1/pages/fb268f96-fba3-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"fb268f96-fba3-11df-b79a-00144feab49a"},{"title":"Europe","webUrl":"http://www.ft.com/markets/europe","links":[{"href":"http://api.ft.com/site/v1/pages/dc6fea66-fba3-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"dc6fea66-fba3-11df-b79a-00144feab49a"},{"title":"Asia-Pacific","webUrl":"http://www.ft.com/markets/asiapacific","links":[{"href":"http://api.ft.com/site/v1/pages/c483580c-fba3-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"c483580c-fba3-11df-b79a-00144feab49a"}],"uuid":"d3ed5ce8-fba3-11df-b79a-00144feab49a","nextUrl":"/search?q=page:Equities"},{"title":"Currencies","webUrl":"http://www.ft.com/markets/currencies","links":[{"href":"http://api.ft.com/site/v1/pages/1dcff722-f1a8-11df-bb5a-00144feab49a","rel":"site-page"}],"uuid":"1dcff722-f1a8-11df-bb5a-00144feab49a","nextUrl":"/search?q=page:Currencies"},{"title":"Commodities","webUrl":"http://www.ft.com/markets/commodities","links":[{"href":"http://api.ft.com/site/v1/pages/25d45d64-f1a8-11df-bb5a-00144feab49a","rel":"site-page"}],"uuid":"25d45d64-f1a8-11df-bb5a-00144feab49a","nextUrl":"/search?q=page:Commodities"}],"nextUrl":"/search?q=page:markets"},{"title":"Global Economy","webUrl":"http://www.ft.com/global-economy","navigationItems":[{"title":"Macro Sweep","webUrl":"http://www.ft.com/globaleconomy/macro-sweep","links":[{"href":"http://api.ft.com/site/v1/pages/de085ae6-08e0-11e3-ad07-00144feabdc0","rel":"site-page"}],"uuid":"de085ae6-08e0-11e3-ad07-00144feabdc0","nextUrl":"/search?q=page:The Macro Sweep"}],"nextUrl":"/search?q=page:global economy"},{"title":"Lex","webUrl":"http://www.ft.com/lex","navigationItems":[{"title":"Lex In depth","webUrl":"http://www.ft.com/lex/indepth","links":[{"href":"http://api.ft.com/site/v1/pages/0fc6d828-ec5e-11e1-a91c-00144feab49a","rel":"site-page"}],"uuid":"0fc6d828-ec5e-11e1-a91c-00144feab49a","nextUrl":"/search?q=page:Lex In depth"},{"title":"Best of Lex","webUrl":"http://www.ft.com/lex/best","links":[{"href":"http://api.ft.com/site/v1/pages/aa14b89c-2a5c-11e1-9bdb-00144feabdc0","rel":"site-page"}],"uuid":"aa14b89c-2a5c-11e1-9bdb-00144feabdc0","nextUrl":"/search?q=page:Best of Lex"}],"nextUrl":"/search?q=page:lex"},{"title":"Comment","webUrl":"http://www.ft.com/comment","navigationItems":[{"title":"Columnists","webUrl":"http://www.ft.com/comment/columnists","links":[{"href":"http://api.ft.com/site/v1/pages/d5498b72-f719-11df-8feb-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Janan Ganesh","webUrl":"http://www.ft.com/jananganesh","links":[{"href":"http://api.ft.com/site/v1/pages/61e68b02-f362-11e1-9ca6-00144feabdc0","rel":"site-page"}],"uuid":"61e68b02-f362-11e1-9ca6-00144feabdc0"},{"title":"John Gapper","webUrl":"http://www.ft.com/comment/columnists/johngapper","links":[{"href":"http://api.ft.com/site/v1/pages/3e33a45e-3ba4-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"3e33a45e-3ba4-11e1-a09a-00144feabdc0"},{"title":"Chris Giles","webUrl":"http://www.ft.com/comment/columnists/chris-giles","links":[{"href":"http://api.ft.com/site/v1/pages/4efad7ba-cd0a-11e1-92c1-00144feabdc0","rel":"site-page"}],"uuid":"4efad7ba-cd0a-11e1-92c1-00144feabdc0"},{"title":"John Kay","webUrl":"http://www.ft.com/comment/columnists/johnkay","links":[{"href":"http://api.ft.com/site/v1/pages/f6bcf788-3ba3-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"f6bcf788-3ba3-11e1-a09a-00144feabdc0"},{"title":"Roula Khalaf","webUrl":"http://www.ft.com/comment/columnists/roulakhalaf","links":[{"href":"http://api.ft.com/site/v1/pages/4cc2e7fa-3ba4-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"4cc2e7fa-3ba4-11e1-a09a-00144feabdc0"},{"title":"Edward Luce","webUrl":"http://www.ft.com/comment/columnists/edluce","links":[{"href":"http://api.ft.com/site/v1/pages/1377f2c4-3ba4-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"1377f2c4-3ba4-11e1-a09a-00144feabdc0"},{"title":"Jurek Martin","webUrl":"http://www.ft.com/comment/columnists/jurekmartin","links":[{"href":"http://api.ft.com/site/v1/pages/40978940-3ba4-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"40978940-3ba4-11e1-a09a-00144feabdc0"},{"title":"John McDermott","webUrl":"http://blogs.ft.com/off-message"},{"title":"Wolfgang Munchau","webUrl":"http://www.ft.com/comment/columnists/wolfgangmunchau","links":[{"href":"http://api.ft.com/site/v1/pages/52e764d0-3ba4-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"52e764d0-3ba4-11e1-a09a-00144feabdc0"},{"title":"David Pilling","webUrl":"http://www.ft.com/comment/columnists/davidpilling","links":[{"href":"http://api.ft.com/site/v1/pages/5abd7cb2-3ba4-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"5abd7cb2-3ba4-11e1-a09a-00144feabdc0"},{"title":"Ingram Pinn","webUrl":"http://www.ft.com/comment/columnists/ingrampinn","links":[{"href":"http://api.ft.com/site/v1/pages/45df1774-57ba-11e1-b089-00144feabdc0","rel":"site-page"}],"uuid":"45df1774-57ba-11e1-b089-00144feabdc0"},{"title":"Lisa Pollack","webUrl":"http://www.ft.com/comment/columnists/lisa-pollack","links":[{"href":"http://api.ft.com/site/v1/pages/8f0fb1d4-2f8e-11e4-87d9-00144feabdc0","rel":"site-page"}],"uuid":"8f0fb1d4-2f8e-11e4-87d9-00144feabdc0"},{"title":"Gideon Rachman","webUrl":"http://www.ft.com/comment/columnists/gideonrachman","links":[{"href":"http://api.ft.com/site/v1/pages/2e0de33c-3ba4-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"2e0de33c-3ba4-11e1-a09a-00144feabdc0"},{"title":"Robert Shrimsley","webUrl":"http://www.ft.com/robert-shrimsley-notebook","links":[{"href":"http://api.ft.com/site/v1/pages/f9f21064-3ba3-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"f9f21064-3ba3-11e1-a09a-00144feabdc0"},{"title":"Gary Silverman","webUrl":"http://www.ft.com/comment/columnists/garysilverman","links":[{"href":"http://api.ft.com/site/v1/pages/02327e94-3ba4-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"02327e94-3ba4-11e1-a09a-00144feabdc0"},{"title":"Philip Stephens","webUrl":"http://www.ft.com/comment/columnists/philipstephens","links":[{"href":"http://api.ft.com/site/v1/pages/43f65ea4-3ba4-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"43f65ea4-3ba4-11e1-a09a-00144feabdc0"},{"title":"Lawrence Summers","webUrl":"http://www.ft.com/comment/columnists/lawrence-summers","links":[{"href":"http://api.ft.com/site/v1/pages/662ea5ca-3c4a-11e1-8d72-00144feabdc0","rel":"site-page"}],"uuid":"662ea5ca-3c4a-11e1-8d72-00144feabdc0"},{"title":"Gillian Tett","webUrl":"http://www.ft.com/comment/columnists/gillian-tett","links":[{"href":"http://api.ft.com/site/v1/pages/9c4c8dc2-3c3e-11e1-8d72-00144feabdc0","rel":"site-page"}],"uuid":"9c4c8dc2-3c3e-11e1-8d72-00144feabdc0"},{"title":"Patti Waldmeir","webUrl":"http://www.ft.com/comment/columnists/patti-waldmeir","links":[{"href":"http://api.ft.com/site/v1/pages/d27e91a4-3995-11e4-93da-00144feabdc0","rel":"site-page"}],"uuid":"d27e91a4-3995-11e4-93da-00144feabdc0"},{"title":"Martin Wolf","webUrl":"http://www.ft.com/comment/columnists/martinwolf","links":[{"href":"http://api.ft.com/site/v1/pages/47a484c2-3ba4-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"47a484c2-3ba4-11e1-a09a-00144feabdc0"}],"uuid":"d5498b72-f719-11df-8feb-00144feab49a","nextUrl":"/search?q=page:Columnists"},{"title":"The Big Read","webUrl":"http://www.ft.com/comment/the-big-read","links":[{"href":"http://api.ft.com/site/v1/pages/0c4e3756-f71c-11df-9b06-00144feab49a","rel":"site-page"}],"uuid":"0c4e3756-f71c-11df-9b06-00144feab49a","nextUrl":"/search?q=page:The Big Read"},{"title":"Opinion","webUrl":"http://www.ft.com/comment/opinion","links":[{"href":"http://api.ft.com/site/v1/pages/075c6448-f71c-11df-9b06-00144feab49a","rel":"site-page"}],"uuid":"075c6448-f71c-11df-9b06-00144feab49a","nextUrl":"/search?q=page:Opinion"},{"title":"FT View","webUrl":"http://www.ft.com/comment/ft-view","links":[{"href":"http://api.ft.com/site/v1/pages/02694b5e-f71c-11df-9b06-00144feab49a","rel":"site-page"}],"uuid":"02694b5e-f71c-11df-9b06-00144feab49a","nextUrl":"/search?q=page:FT View"},{"title":"Letters","webUrl":"http://www.ft.com/comment/letters","links":[{"href":"http://api.ft.com/site/v1/pages/fe69c0d8-f71b-11df-9b06-00144feab49a","rel":"site-page"}],"uuid":"fe69c0d8-f71b-11df-9b06-00144feab49a","nextUrl":"/search?q=page:Letters"},{"title":"Corrections","webUrl":"http://www.ft.com/comment/corrections","links":[{"href":"http://api.ft.com/site/v1/pages/f9e971a2-f71b-11df-9b06-00144feab49a","rel":"site-page"}],"uuid":"f9e971a2-f71b-11df-9b06-00144feab49a","nextUrl":"/search?q=page:Corrections"},{"title":"Obituaries","webUrl":"http://www.ft.com/comment/obituaries","links":[{"href":"http://api.ft.com/site/v1/pages/894244ba-f71b-11df-8feb-00144feab49a","rel":"site-page"}],"uuid":"894244ba-f71b-11df-8feb-00144feab49a","nextUrl":"/search?q=page:Obituaries"}],"nextUrl":"/search?q=page:comment"},{"title":"Management","webUrl":"http://www.ft.com/management","navigationItems":[{"title":"Business Education","webUrl":"http://www.ft.com/business-education","links":[{"href":"http://api.ft.com/site/v1/pages/b34c83be-8368-11df-8451-00144feabdc0","rel":"site-page"}],"navigationItems":[{"title":"Join Our Community","webUrl":"http://www.ft.com/business-education/community","links":[{"href":"http://api.ft.com/site/v1/pages/6120159e-1340-11e4-925a-00144feabdc0","rel":"site-page"}],"uuid":"6120159e-1340-11e4-925a-00144feabdc0"},{"title":"Rankings","webUrl":"http://rankings.ft.com/businessschoolrankings/rankings"},{"title":"Applying for a Masters","webUrl":"http://www.ft.com/business-education/applying-masters-degree","links":[{"href":"http://api.ft.com/site/v1/pages/20cdf01a-fb24-11e0-bebe-00144feab49a","rel":"site-page"}],"uuid":"20cdf01a-fb24-11e0-bebe-00144feab49a"},{"title":"Applying for an MBA","webUrl":"http://www.ft.com/business-education/applying-mba","links":[{"href":"http://api.ft.com/site/v1/pages/45696468-18c2-11e4-a51a-00144feabdc0","rel":"site-page"}],"uuid":"45696468-18c2-11e4-a51a-00144feabdc0"},{"title":"Finding a Job","webUrl":"http://www.ft.com/business-education/finding-a-job","links":[{"href":"http://api.ft.com/site/v1/pages/f83c22ea-e002-11e3-9534-00144feabdc0","rel":"site-page"}],"uuid":"f83c22ea-e002-11e3-9534-00144feabdc0"},{"title":"Executive Education","webUrl":"http://www.ft.com/business-education/executive-education","links":[{"href":"http://api.ft.com/site/v1/pages/67dabd8a-fe18-11df-853b-00144feab49a","rel":"site-page"}],"uuid":"67dabd8a-fe18-11df-853b-00144feab49a"}],"uuid":"b34c83be-8368-11df-8451-00144feabdc0","nextUrl":"/search?q=page:Business Education"},{"title":"Entrepreneurship","webUrl":"http://www.ft.com/management/entrepreneurship","links":[{"href":"http://api.ft.com/site/v1/pages/41241350-fed4-11df-ae87-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Business Speak","webUrl":"http://www.ft.com/business-speak","links":[{"href":"http://api.ft.com/site/v1/pages/68f4f228-5cac-11e1-ac80-00144feabdc0","rel":"site-page"}],"uuid":"68f4f228-5cac-11e1-ac80-00144feabdc0"},{"title":"Business Questions","webUrl":"http://www.ft.com/business-questions","links":[{"href":"http://api.ft.com/site/v1/pages/84644018-6e8b-11e1-a82d-00144feab49a","rel":"site-page"}],"uuid":"84644018-6e8b-11e1-a82d-00144feab49a"}],"uuid":"41241350-fed4-11df-ae87-00144feab49a","nextUrl":"/search?q=page:Entrepreneurship"},{"title":"The Connected Business","webUrl":"http://www.ft.com/reports/the-connected-business","links":[{"href":"http://api.ft.com/site/v1/pages/172fe95e-69ab-11e2-8d07-00144feab49a","rel":"site-page"}],"uuid":"172fe95e-69ab-11e2-8d07-00144feab49a","nextUrl":"/search?q=page:The Connected Business"}],"nextUrl":"/search?q=page:management"},{"title":"Personal Finance","webUrl":"http://www.ft.com/personal-finance","navigationItems":[{"title":"Investments","webUrl":"http://www.ft.com/personal-finance/investments","links":[{"href":"http://api.ft.com/site/v1/pages/13dfe1c6-fc7c-11df-a9c5-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Directors’ Deals","webUrl":"http://www.ft.com/personal-finance/directors-deals","links":[{"href":"http://api.ft.com/site/v1/pages/f6715ab8-cd32-11e2-90e8-00144feab7de","rel":"site-page"}],"uuid":"f6715ab8-cd32-11e2-90e8-00144feab7de"},{"title":"Investors Chronicle","webUrl":"http://www.ft.com/personal-finance/investors-chronicle","links":[{"href":"http://api.ft.com/site/v1/pages/e1a3ce40-cd32-11e2-90e8-00144feab7de","rel":"site-page"}],"uuid":"e1a3ce40-cd32-11e2-90e8-00144feab7de"},{"title":"How to...","webUrl":"http://www.ft.com/personal-finance/howto","links":[{"href":"http://api.ft.com/site/v1/pages/84da4728-2ff0-11e2-ae7d-00144feabdc0","rel":"site-page"}],"uuid":"84da4728-2ff0-11e2-ae7d-00144feabdc0"},{"title":"Make the Most of It","webUrl":"http://www.ft.com/personal-finance/make-the-most-of-it","links":[{"href":"http://api.ft.com/site/v1/pages/8c9159de-2ff0-11e2-ae7d-00144feabdc0","rel":"site-page"}],"uuid":"8c9159de-2ff0-11e2-ae7d-00144feabdc0"},{"title":"Markets Insight","webUrl":"http://www.ft.com/markets/insight","links":[{"href":"http://api.ft.com/site/v1/pages/12dc06c6-2b22-11e1-8a38-00144feabdc0","rel":"site-page"}],"uuid":"12dc06c6-2b22-11e1-8a38-00144feabdc0"}],"uuid":"13dfe1c6-fc7c-11df-a9c5-00144feab49a","nextUrl":"/search?q=page:Investments"},{"title":"Trading","webUrl":"http://www.ft.com/personal-finance/trading-hub","links":[{"href":"http://api.ft.com/site/v1/pages/96972fbe-08ce-11e3-8b32-00144feabdc0","rel":"site-page"}],"uuid":"96972fbe-08ce-11e3-8b32-00144feabdc0","nextUrl":"/search?q=page:Trading Hub"},{"title":"Tax","webUrl":"http://www.ft.com/personal-finance/tax","links":[{"href":"http://api.ft.com/site/v1/pages/1ec75f4c-fc7c-11df-a9c5-00144feab49a","rel":"site-page"}],"uuid":"1ec75f4c-fc7c-11df-a9c5-00144feab49a","nextUrl":"/search?q=page:Tax"},{"title":"Money Matters","webUrl":"http://www.ft.com/personal-finance/money-matters","links":[{"href":"http://api.ft.com/site/v1/pages/0cacf8c6-fc7c-11df-a9c5-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"Top Tips","webUrl":"http://www.ft.com/personal-finance/money-matters/top-tips","links":[{"href":"http://api.ft.com/site/v1/pages/0718e94c-fc7c-11df-a9c5-00144feab49a","rel":"site-page"}],"uuid":"0718e94c-fc7c-11df-a9c5-00144feab49a"}],"uuid":"0cacf8c6-fc7c-11df-a9c5-00144feab49a","nextUrl":"/search?q=page:Money Matters"}],"nextUrl":"/search?q=page:personal finance"},{"title":"Life & Arts","webUrl":"http://www.ft.com/life-arts","navigationItems":[{"title":"Magazine","webUrl":"http://www.ft.com/magazine","links":[{"href":"http://api.ft.com/site/v1/pages/c1e2ea70-966f-11df-9caa-00144feab49a","rel":"site-page"}],"uuid":"c1e2ea70-966f-11df-9caa-00144feab49a","nextUrl":"/search?q=page:FT Magazine"},{"title":"Lunch with the FT","webUrl":"http://www.ft.com/life-arts/lunch-with-the-ft","links":[{"href":"http://api.ft.com/site/v1/pages/59022974-3ba7-11e1-a09a-00144feabdc0","rel":"site-page"}],"uuid":"59022974-3ba7-11e1-a09a-00144feabdc0","nextUrl":"/search?q=page:Lunch with the FT"},{"title":"Style","webUrl":"http://www.ft.com/life-arts/style","links":[{"href":"http://api.ft.com/site/v1/pages/29ecacb2-fba3-11df-b79a-00144feab49a","rel":"site-page"}],"uuid":"29ecacb2-fba3-11df-b79a-00144feab49a","nextUrl":"/search?q=page:Style"},{"title":"Travel","webUrl":"http://www.ft.com/travel","links":[{"href":"http://api.ft.com/site/v1/pages/1a5da3bc-89b3-11df-9ea6-00144feab49a","rel":"site-page"}],"navigationItems":[{"title":"UK","webUrl":"http://www.ft.com/travel/uk","links":[{"href":"http://api.ft.com/site/v1/pages/560d7d22-4a6c-11e0-82ab-00144feab49a","rel":"site-page"}],"uuid":"560d7d22-4a6c-11e0-82ab-00144feab49a"},{"title":"North America","webUrl":"http://www.ft.com/travel/north-america","links":[{"href":"http://api.ft.com/site/v1/pages/3ac7f2cc-4a6c-11e0-82ab-00144feab49a","rel":"site-page"}],"uuid":"3ac7f2cc-4a6c-11e0-82ab-00144feab49a"},{"title":"Europe","webUrl":"http://www.ft.com/travel/europe","links":[{"href":"http://api.ft.com/site/v1/pages/3839d00c-4a6c-11e0-82ab-00144feab49a","rel":"site-page"}],"uuid":"3839d00c-4a6c-11e0-82ab-00144feab49a"},{"title":"Asia & Australia","webUrl":"http://www.ft.com/travel/asia-australia","links":[{"href":"http://api.ft.com/site/v1/pages/40a5e99c-4a6c-11e0-82ab-00144feab49a","rel":"site-page"}],"uuid":"40a5e99c-4a6c-11e0-82ab-00144feab49a"},{"title":"Africa","webUrl":"http://www.ft.com/travel/africa","links":[{"href":"http://api.ft.com/site/v1/pages/53bb43d8-4a6c-11e0-82ab-00144feab49a","rel":"site-page"}],"uuid":"53bb43d8-4a6c-11e0-82ab-00144feab49a"},{"title":"Americas","webUrl":"http://www.ft.com/travel/americas","links":[{"href":"http://api.ft.com/site/v1/pages/23daa022-2fab-11e0-834f-00144feabdc0","rel":"site-page"}],"uuid":"23daa022-2fab-11e0-834f-00144feabdc0"},{"title":"Luxury","webUrl":"http://www.ft.com/travel/luxury","links":[{"href":"http://api.ft.com/site/v1/pages/5828f3de-4a6c-11e0-82ab-00144feab49a","rel":"site-page"}],"uuid":"5828f3de-4a6c-11e0-82ab-00144feab49a"},{"title":"Adventures","webUrl":"http://www.ft.com/travel/adventures","links":[{"href":"http://api.ft.com/site/v1/pages/8e082a2a-2edc-11e0-9877-00144feabdc0","rel":"site-page"}],"uuid":"8e082a2a-2edc-11e0-9877-00144feabdc0"},{"title":"Cycling Adventures","webUrl":"http://www.ft.com/travel/cycling-adventures","links":[{"href":"http://api.ft.com/site/v1/pages/67778072-f0c1-11e3-9e26-00144feabdc0","rel":"site-page"}],"uuid":"67778072-f0c1-11e3-9e26-00144feabdc0"},{"title":"Winter Sports","webUrl":"http://www.ft.com/travel/winter-sports","links":[{"href":"http://api.ft.com/site/v1/pages/42dd4eee-4a6c-11e0-82ab-00144feab49a","rel":"site-page"}],"uuid":"42dd4eee-4a6c-11e0-82ab-00144feab49a"},{"title":"Family","webUrl":"http://www.ft.com/travel/family","links":[{"href":"http://api.ft.com/site/v1/pages/5a386bd2-4a6c-11e0-82ab-00144feab49a","rel":"site-page"}],"uuid":"5a386bd2-4a6c-11e0-82ab-00144feab49a"},{"title":"City Breaks","webUrl":"http://www.ft.com/travel/city-breaks","links":[{"href":"http://api.ft.com/site/v1/pages/44fa9cea-4a6c-11e0-82ab-00144feab49a","rel":"site-page"}],"uuid":"44fa9cea-4a6c-11e0-82ab-00144feab49a"},{"title":"Great Journeys","webUrl":"http://www.ft.com/travel/great-journeys","links":[{"href":"http://api.ft.com/site/v1/pages/35542ca0-1ad2-11e3-87da-00144feab7de","rel":"site-page"}],"uuid":"35542ca0-1ad2-11e3-87da-00144feab7de"}],"uuid":"1a5da3bc-89b3-11df-9ea6-00144feab49a","nextUrl":"/search?q=page:Travel"},{"title":"Columns","webUrl":"http://www.ft.com/life-arts/columnists","links":[{"href":"http://api.ft.com/site/v1/pages/805db448-a0ce-11e1-851f-00144feabdc0","rel":"site-page"}],"uuid":"805db448-a0ce-11e1-851f-00144feabdc0","nextUrl":"/search?q=page:Weekend Columnists"}],"nextUrl":null}],"code":200}
},{}]},{},[10])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvYm94ZW4vbm9kZW52L3ZlcnNpb25zL3YwLjEwLjI2L2xpYi9ub2RlX21vZHVsZXMvb3JpZ2FtaS1idWlsZC10b29scy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9ib3dlcl9jb21wb25lbnRzL2RvbS1kZWxlZ2F0ZS9saWIvZGVsZWdhdGUuanMiLCIvVXNlcnMvbWFuZHJld3Mvc2FuZGJveGVzL25leHQtaGVhZGVyL2Jvd2VyX2NvbXBvbmVudHMvbmV4dC11c2VyLW1vZGVsLWNvbXBvbmVudC9tYWluLmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9ib3dlcl9jb21wb25lbnRzL25leHQtdXNlci1tb2RlbC1jb21wb25lbnQvc3JjL21vZGVscy9Vc2VyLmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9ib3dlcl9jb21wb25lbnRzL25leHQtdXNlci1wcmVmZXJlbmNlcy9zcmMvbGliL0xpc3QuanMiLCIvVXNlcnMvbWFuZHJld3Mvc2FuZGJveGVzL25leHQtaGVhZGVyL2Jvd2VyX2NvbXBvbmVudHMvbmV4dC11c2VyLXByZWZlcmVuY2VzL3NyYy9saWIvTm90aWZpY2F0aW9uUG9sbGVyLmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9ib3dlcl9jb21wb25lbnRzL25leHQtdXNlci1wcmVmZXJlbmNlcy9zcmMvbGliL1VzZXJQcmVmcy5qcyIsIi9Vc2Vycy9tYW5kcmV3cy9zYW5kYm94ZXMvbmV4dC1oZWFkZXIvYm93ZXJfY29tcG9uZW50cy9uZXh0LXVzZXItcHJlZmVyZW5jZXMvc3JjL21haW4uanMiLCIvVXNlcnMvbWFuZHJld3Mvc2FuZGJveGVzL25leHQtaGVhZGVyL2Jvd2VyX2NvbXBvbmVudHMvbmV4dC11c2VyLXByZWZlcmVuY2VzL3NyYy92ZW5kb3IvcmVxd2VzdC5taW4uanMiLCIvVXNlcnMvbWFuZHJld3Mvc2FuZGJveGVzL25leHQtaGVhZGVyL2Jvd2VyX2NvbXBvbmVudHMvcmVxd2VzdC9yZXF3ZXN0LmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9tYWluLmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9zcmMvanMvTm90aWZ5LmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9zcmMvdWJlci1pbmRleC5qc29uIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2bUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6RkEiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLypqc2hpbnQgYnJvd3Nlcjp0cnVlLCBub2RlOnRydWUqL1xuXG4ndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gRGVsZWdhdGU7XG5cbi8qKlxuICogRE9NIGV2ZW50IGRlbGVnYXRvclxuICpcbiAqIFRoZSBkZWxlZ2F0b3Igd2lsbCBsaXN0ZW5cbiAqIGZvciBldmVudHMgdGhhdCBidWJibGUgdXBcbiAqIHRvIHRoZSByb290IG5vZGUuXG4gKlxuICogQGNvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge05vZGV8c3RyaW5nfSBbcm9vdF0gVGhlIHJvb3Qgbm9kZSBvciBhIHNlbGVjdG9yIHN0cmluZyBtYXRjaGluZyB0aGUgcm9vdCBub2RlXG4gKi9cbmZ1bmN0aW9uIERlbGVnYXRlKHJvb3QpIHtcblxuICAvKipcbiAgICogTWFpbnRhaW4gYSBtYXAgb2YgbGlzdGVuZXJcbiAgICogbGlzdHMsIGtleWVkIGJ5IGV2ZW50IG5hbWUuXG4gICAqXG4gICAqIEB0eXBlIE9iamVjdFxuICAgKi9cbiAgdGhpcy5saXN0ZW5lck1hcCA9IFt7fSwge31dO1xuICBpZiAocm9vdCkge1xuICAgIHRoaXMucm9vdChyb290KTtcbiAgfVxuXG4gIC8qKiBAdHlwZSBmdW5jdGlvbigpICovXG4gIHRoaXMuaGFuZGxlID0gRGVsZWdhdGUucHJvdG90eXBlLmhhbmRsZS5iaW5kKHRoaXMpO1xufVxuXG4vKipcbiAqIFN0YXJ0IGxpc3RlbmluZyBmb3IgZXZlbnRzXG4gKiBvbiB0aGUgcHJvdmlkZWQgRE9NIGVsZW1lbnRcbiAqXG4gKiBAcGFyYW0gIHtOb2RlfHN0cmluZ30gW3Jvb3RdIFRoZSByb290IG5vZGUgb3IgYSBzZWxlY3RvciBzdHJpbmcgbWF0Y2hpbmcgdGhlIHJvb3Qgbm9kZVxuICogQHJldHVybnMge0RlbGVnYXRlfSBUaGlzIG1ldGhvZCBpcyBjaGFpbmFibGVcbiAqL1xuRGVsZWdhdGUucHJvdG90eXBlLnJvb3QgPSBmdW5jdGlvbihyb290KSB7XG4gIHZhciBsaXN0ZW5lck1hcCA9IHRoaXMubGlzdGVuZXJNYXA7XG4gIHZhciBldmVudFR5cGU7XG5cbiAgLy8gUmVtb3ZlIG1hc3RlciBldmVudCBsaXN0ZW5lcnNcbiAgaWYgKHRoaXMucm9vdEVsZW1lbnQpIHtcbiAgICBmb3IgKGV2ZW50VHlwZSBpbiBsaXN0ZW5lck1hcFsxXSkge1xuICAgICAgaWYgKGxpc3RlbmVyTWFwWzFdLmhhc093blByb3BlcnR5KGV2ZW50VHlwZSkpIHtcbiAgICAgICAgdGhpcy5yb290RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcy5oYW5kbGUsIHRydWUpO1xuICAgICAgfVxuICAgIH1cbiAgICBmb3IgKGV2ZW50VHlwZSBpbiBsaXN0ZW5lck1hcFswXSkge1xuICAgICAgaWYgKGxpc3RlbmVyTWFwWzBdLmhhc093blByb3BlcnR5KGV2ZW50VHlwZSkpIHtcbiAgICAgICAgdGhpcy5yb290RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcy5oYW5kbGUsIGZhbHNlKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICAvLyBJZiBubyByb290IG9yIHJvb3QgaXMgbm90XG4gIC8vIGEgZG9tIG5vZGUsIHRoZW4gcmVtb3ZlIGludGVybmFsXG4gIC8vIHJvb3QgcmVmZXJlbmNlIGFuZCBleGl0IGhlcmVcbiAgaWYgKCFyb290IHx8ICFyb290LmFkZEV2ZW50TGlzdGVuZXIpIHtcbiAgICBpZiAodGhpcy5yb290RWxlbWVudCkge1xuICAgICAgZGVsZXRlIHRoaXMucm9vdEVsZW1lbnQ7XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLyoqXG4gICAqIFRoZSByb290IG5vZGUgYXQgd2hpY2hcbiAgICogbGlzdGVuZXJzIGFyZSBhdHRhY2hlZC5cbiAgICpcbiAgICogQHR5cGUgTm9kZVxuICAgKi9cbiAgdGhpcy5yb290RWxlbWVudCA9IHJvb3Q7XG5cbiAgLy8gU2V0IHVwIG1hc3RlciBldmVudCBsaXN0ZW5lcnNcbiAgZm9yIChldmVudFR5cGUgaW4gbGlzdGVuZXJNYXBbMV0pIHtcbiAgICBpZiAobGlzdGVuZXJNYXBbMV0uaGFzT3duUHJvcGVydHkoZXZlbnRUeXBlKSkge1xuICAgICAgdGhpcy5yb290RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcy5oYW5kbGUsIHRydWUpO1xuICAgIH1cbiAgfVxuICBmb3IgKGV2ZW50VHlwZSBpbiBsaXN0ZW5lck1hcFswXSkge1xuICAgIGlmIChsaXN0ZW5lck1hcFswXS5oYXNPd25Qcm9wZXJ0eShldmVudFR5cGUpKSB7XG4gICAgICB0aGlzLnJvb3RFbGVtZW50LmFkZEV2ZW50TGlzdGVuZXIoZXZlbnRUeXBlLCB0aGlzLmhhbmRsZSwgZmFsc2UpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBAcGFyYW0ge3N0cmluZ30gZXZlbnRUeXBlXG4gKiBAcmV0dXJucyBib29sZWFuXG4gKi9cbkRlbGVnYXRlLnByb3RvdHlwZS5jYXB0dXJlRm9yVHlwZSA9IGZ1bmN0aW9uKGV2ZW50VHlwZSkge1xuICByZXR1cm4gWydibHVyJywgJ2Vycm9yJywgJ2ZvY3VzJywgJ2xvYWQnLCAncmVzaXplJywgJ3Njcm9sbCddLmluZGV4T2YoZXZlbnRUeXBlKSAhPT0gLTE7XG59O1xuXG4vKipcbiAqIEF0dGFjaCBhIGhhbmRsZXIgdG8gb25lXG4gKiBldmVudCBmb3IgYWxsIGVsZW1lbnRzXG4gKiB0aGF0IG1hdGNoIHRoZSBzZWxlY3RvcixcbiAqIG5vdyBvciBpbiB0aGUgZnV0dXJlXG4gKlxuICogVGhlIGhhbmRsZXIgZnVuY3Rpb24gcmVjZWl2ZXNcbiAqIHRocmVlIGFyZ3VtZW50czogdGhlIERPTSBldmVudFxuICogb2JqZWN0LCB0aGUgbm9kZSB0aGF0IG1hdGNoZWRcbiAqIHRoZSBzZWxlY3RvciB3aGlsZSB0aGUgZXZlbnRcbiAqIHdhcyBidWJibGluZyBhbmQgYSByZWZlcmVuY2VcbiAqIHRvIGl0c2VsZi4gV2l0aGluIHRoZSBoYW5kbGVyLFxuICogJ3RoaXMnIGlzIGVxdWFsIHRvIHRoZSBzZWNvbmRcbiAqIGFyZ3VtZW50LlxuICpcbiAqIFRoZSBub2RlIHRoYXQgYWN0dWFsbHkgcmVjZWl2ZWRcbiAqIHRoZSBldmVudCBjYW4gYmUgYWNjZXNzZWQgdmlhXG4gKiAnZXZlbnQudGFyZ2V0Jy5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gZXZlbnRUeXBlIExpc3RlbiBmb3IgdGhlc2UgZXZlbnRzXG4gKiBAcGFyYW0ge3N0cmluZ3x1bmRlZmluZWR9IHNlbGVjdG9yIE9ubHkgaGFuZGxlIGV2ZW50cyBvbiBlbGVtZW50cyBtYXRjaGluZyB0aGlzIHNlbGVjdG9yLCBpZiB1bmRlZmluZWQgbWF0Y2ggcm9vdCBlbGVtZW50XG4gKiBAcGFyYW0ge2Z1bmN0aW9uKCl9IGhhbmRsZXIgSGFuZGxlciBmdW5jdGlvbiAtIGV2ZW50IGRhdGEgcGFzc2VkIGhlcmUgd2lsbCBiZSBpbiBldmVudC5kYXRhXG4gKiBAcGFyYW0ge09iamVjdH0gW2V2ZW50RGF0YV0gRGF0YSB0byBwYXNzIGluIGV2ZW50LmRhdGFcbiAqIEByZXR1cm5zIHtEZWxlZ2F0ZX0gVGhpcyBtZXRob2QgaXMgY2hhaW5hYmxlXG4gKi9cbkRlbGVnYXRlLnByb3RvdHlwZS5vbiA9IGZ1bmN0aW9uKGV2ZW50VHlwZSwgc2VsZWN0b3IsIGhhbmRsZXIsIHVzZUNhcHR1cmUpIHtcbiAgdmFyIHJvb3QsIGxpc3RlbmVyTWFwLCBtYXRjaGVyLCBtYXRjaGVyUGFyYW07XG5cbiAgaWYgKCFldmVudFR5cGUpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIGV2ZW50IHR5cGU6ICcgKyBldmVudFR5cGUpO1xuICB9XG5cbiAgLy8gaGFuZGxlciBjYW4gYmUgcGFzc2VkIGFzXG4gIC8vIHRoZSBzZWNvbmQgb3IgdGhpcmQgYXJndW1lbnRcbiAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHVzZUNhcHR1cmUgPSBoYW5kbGVyO1xuICAgIGhhbmRsZXIgPSBzZWxlY3RvcjtcbiAgICBzZWxlY3RvciA9IG51bGw7XG4gIH1cblxuICAvLyBGYWxsYmFjayB0byBzZW5zaWJsZSBkZWZhdWx0c1xuICAvLyBpZiB1c2VDYXB0dXJlIG5vdCBzZXRcbiAgaWYgKHVzZUNhcHR1cmUgPT09IHVuZGVmaW5lZCkge1xuICAgIHVzZUNhcHR1cmUgPSB0aGlzLmNhcHR1cmVGb3JUeXBlKGV2ZW50VHlwZSk7XG4gIH1cblxuICBpZiAodHlwZW9mIGhhbmRsZXIgIT09ICdmdW5jdGlvbicpIHtcbiAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdIYW5kbGVyIG11c3QgYmUgYSB0eXBlIG9mIEZ1bmN0aW9uJyk7XG4gIH1cblxuICByb290ID0gdGhpcy5yb290RWxlbWVudDtcbiAgbGlzdGVuZXJNYXAgPSB0aGlzLmxpc3RlbmVyTWFwW3VzZUNhcHR1cmUgPyAxIDogMF07XG5cbiAgLy8gQWRkIG1hc3RlciBoYW5kbGVyIGZvciB0eXBlIGlmIG5vdCBjcmVhdGVkIHlldFxuICBpZiAoIWxpc3RlbmVyTWFwW2V2ZW50VHlwZV0pIHtcbiAgICBpZiAocm9vdCkge1xuICAgICAgcm9vdC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcy5oYW5kbGUsIHVzZUNhcHR1cmUpO1xuICAgIH1cbiAgICBsaXN0ZW5lck1hcFtldmVudFR5cGVdID0gW107XG4gIH1cblxuICBpZiAoIXNlbGVjdG9yKSB7XG4gICAgbWF0Y2hlclBhcmFtID0gbnVsbDtcblxuICAgIC8vIENPTVBMRVggLSBtYXRjaGVzUm9vdCBuZWVkcyB0byBoYXZlIGFjY2VzcyB0b1xuICAgIC8vIHRoaXMucm9vdEVsZW1lbnQsIHNvIGJpbmQgdGhlIGZ1bmN0aW9uIHRvIHRoaXMuXG4gICAgbWF0Y2hlciA9IG1hdGNoZXNSb290LmJpbmQodGhpcyk7XG5cbiAgLy8gQ29tcGlsZSBhIG1hdGNoZXIgZm9yIHRoZSBnaXZlbiBzZWxlY3RvclxuICB9IGVsc2UgaWYgKC9eW2Etel0rJC9pLnRlc3Qoc2VsZWN0b3IpKSB7XG4gICAgbWF0Y2hlclBhcmFtID0gc2VsZWN0b3I7XG4gICAgbWF0Y2hlciA9IG1hdGNoZXNUYWc7XG4gIH0gZWxzZSBpZiAoL14jW2EtejAtOVxcLV9dKyQvaS50ZXN0KHNlbGVjdG9yKSkge1xuICAgIG1hdGNoZXJQYXJhbSA9IHNlbGVjdG9yLnNsaWNlKDEpO1xuICAgIG1hdGNoZXIgPSBtYXRjaGVzSWQ7XG4gIH0gZWxzZSB7XG4gICAgbWF0Y2hlclBhcmFtID0gc2VsZWN0b3I7XG4gICAgbWF0Y2hlciA9IG1hdGNoZXM7XG4gIH1cblxuICAvLyBBZGQgdG8gdGhlIGxpc3Qgb2YgbGlzdGVuZXJzXG4gIGxpc3RlbmVyTWFwW2V2ZW50VHlwZV0ucHVzaCh7XG4gICAgc2VsZWN0b3I6IHNlbGVjdG9yLFxuICAgIGhhbmRsZXI6IGhhbmRsZXIsXG4gICAgbWF0Y2hlcjogbWF0Y2hlcixcbiAgICBtYXRjaGVyUGFyYW06IG1hdGNoZXJQYXJhbVxuICB9KTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIGFuIGV2ZW50IGhhbmRsZXJcbiAqIGZvciBlbGVtZW50cyB0aGF0IG1hdGNoXG4gKiB0aGUgc2VsZWN0b3IsIGZvcmV2ZXJcbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gW2V2ZW50VHlwZV0gUmVtb3ZlIGhhbmRsZXJzIGZvciBldmVudHMgbWF0Y2hpbmcgdGhpcyB0eXBlLCBjb25zaWRlcmluZyB0aGUgb3RoZXIgcGFyYW1ldGVyc1xuICogQHBhcmFtIHtzdHJpbmd9IFtzZWxlY3Rvcl0gSWYgdGhpcyBwYXJhbWV0ZXIgaXMgb21pdHRlZCwgb25seSBoYW5kbGVycyB3aGljaCBtYXRjaCB0aGUgb3RoZXIgdHdvIHdpbGwgYmUgcmVtb3ZlZFxuICogQHBhcmFtIHtmdW5jdGlvbigpfSBbaGFuZGxlcl0gSWYgdGhpcyBwYXJhbWV0ZXIgaXMgb21pdHRlZCwgb25seSBoYW5kbGVycyB3aGljaCBtYXRjaCB0aGUgcHJldmlvdXMgdHdvIHdpbGwgYmUgcmVtb3ZlZFxuICogQHJldHVybnMge0RlbGVnYXRlfSBUaGlzIG1ldGhvZCBpcyBjaGFpbmFibGVcbiAqL1xuRGVsZWdhdGUucHJvdG90eXBlLm9mZiA9IGZ1bmN0aW9uKGV2ZW50VHlwZSwgc2VsZWN0b3IsIGhhbmRsZXIsIHVzZUNhcHR1cmUpIHtcbiAgdmFyIGksIGxpc3RlbmVyLCBsaXN0ZW5lck1hcCwgbGlzdGVuZXJMaXN0LCBzaW5nbGVFdmVudFR5cGU7XG5cbiAgLy8gSGFuZGxlciBjYW4gYmUgcGFzc2VkIGFzXG4gIC8vIHRoZSBzZWNvbmQgb3IgdGhpcmQgYXJndW1lbnRcbiAgaWYgKHR5cGVvZiBzZWxlY3RvciA9PT0gJ2Z1bmN0aW9uJykge1xuICAgIHVzZUNhcHR1cmUgPSBoYW5kbGVyO1xuICAgIGhhbmRsZXIgPSBzZWxlY3RvcjtcbiAgICBzZWxlY3RvciA9IG51bGw7XG4gIH1cblxuICAvLyBJZiB1c2VDYXB0dXJlIG5vdCBzZXQsIHJlbW92ZVxuICAvLyBhbGwgZXZlbnQgbGlzdGVuZXJzXG4gIGlmICh1c2VDYXB0dXJlID09PSB1bmRlZmluZWQpIHtcbiAgICB0aGlzLm9mZihldmVudFR5cGUsIHNlbGVjdG9yLCBoYW5kbGVyLCB0cnVlKTtcbiAgICB0aGlzLm9mZihldmVudFR5cGUsIHNlbGVjdG9yLCBoYW5kbGVyLCBmYWxzZSk7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lck1hcCA9IHRoaXMubGlzdGVuZXJNYXBbdXNlQ2FwdHVyZSA/IDEgOiAwXTtcbiAgaWYgKCFldmVudFR5cGUpIHtcbiAgICBmb3IgKHNpbmdsZUV2ZW50VHlwZSBpbiBsaXN0ZW5lck1hcCkge1xuICAgICAgaWYgKGxpc3RlbmVyTWFwLmhhc093blByb3BlcnR5KHNpbmdsZUV2ZW50VHlwZSkpIHtcbiAgICAgICAgdGhpcy5vZmYoc2luZ2xlRXZlbnRUeXBlLCBzZWxlY3RvciwgaGFuZGxlcik7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lckxpc3QgPSBsaXN0ZW5lck1hcFtldmVudFR5cGVdO1xuICBpZiAoIWxpc3RlbmVyTGlzdCB8fCAhbGlzdGVuZXJMaXN0Lmxlbmd0aCkge1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gUmVtb3ZlIG9ubHkgcGFyYW1ldGVyIG1hdGNoZXNcbiAgLy8gaWYgc3BlY2lmaWVkXG4gIGZvciAoaSA9IGxpc3RlbmVyTGlzdC5sZW5ndGggLSAxOyBpID49IDA7IGktLSkge1xuICAgIGxpc3RlbmVyID0gbGlzdGVuZXJMaXN0W2ldO1xuXG4gICAgaWYgKCghc2VsZWN0b3IgfHwgc2VsZWN0b3IgPT09IGxpc3RlbmVyLnNlbGVjdG9yKSAmJiAoIWhhbmRsZXIgfHwgaGFuZGxlciA9PT0gbGlzdGVuZXIuaGFuZGxlcikpIHtcbiAgICAgIGxpc3RlbmVyTGlzdC5zcGxpY2UoaSwgMSk7XG4gICAgfVxuICB9XG5cbiAgLy8gQWxsIGxpc3RlbmVycyByZW1vdmVkXG4gIGlmICghbGlzdGVuZXJMaXN0Lmxlbmd0aCkge1xuICAgIGRlbGV0ZSBsaXN0ZW5lck1hcFtldmVudFR5cGVdO1xuXG4gICAgLy8gUmVtb3ZlIHRoZSBtYWluIGhhbmRsZXJcbiAgICBpZiAodGhpcy5yb290RWxlbWVudCkge1xuICAgICAgdGhpcy5yb290RWxlbWVudC5yZW1vdmVFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcy5oYW5kbGUsIHVzZUNhcHR1cmUpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuXG4vKipcbiAqIEhhbmRsZSBhbiBhcmJpdHJhcnkgZXZlbnQuXG4gKlxuICogQHBhcmFtIHtFdmVudH0gZXZlbnRcbiAqL1xuRGVsZWdhdGUucHJvdG90eXBlLmhhbmRsZSA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBpLCBsLCB0eXBlID0gZXZlbnQudHlwZSwgcm9vdCwgcGhhc2UsIGxpc3RlbmVyLCByZXR1cm5lZCwgbGlzdGVuZXJMaXN0ID0gW10sIHRhcmdldCwgLyoqIEBjb25zdCAqLyBFVkVOVElHTk9SRSA9ICdmdExhYnNEZWxlZ2F0ZUlnbm9yZSc7XG5cbiAgaWYgKGV2ZW50W0VWRU5USUdOT1JFXSA9PT0gdHJ1ZSkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRhcmdldCA9IGV2ZW50LnRhcmdldDtcblxuICAvLyBIYXJkY29kZSB2YWx1ZSBvZiBOb2RlLlRFWFRfTk9ERVxuICAvLyBhcyBub3QgZGVmaW5lZCBpbiBJRThcbiAgaWYgKHRhcmdldC5ub2RlVHlwZSA9PT0gMykge1xuICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnROb2RlO1xuICB9XG5cbiAgcm9vdCA9IHRoaXMucm9vdEVsZW1lbnQ7XG5cbiAgcGhhc2UgPSBldmVudC5ldmVudFBoYXNlIHx8ICggZXZlbnQudGFyZ2V0ICE9PSBldmVudC5jdXJyZW50VGFyZ2V0ID8gMyA6IDIgKTtcbiAgXG4gIHN3aXRjaCAocGhhc2UpIHtcbiAgICBjYXNlIDE6IC8vRXZlbnQuQ0FQVFVSSU5HX1BIQVNFOlxuICAgICAgbGlzdGVuZXJMaXN0ID0gdGhpcy5saXN0ZW5lck1hcFsxXVt0eXBlXTtcbiAgICBicmVhaztcbiAgICBjYXNlIDI6IC8vRXZlbnQuQVRfVEFSR0VUOlxuICAgICAgaWYgKHRoaXMubGlzdGVuZXJNYXBbMF0gJiYgdGhpcy5saXN0ZW5lck1hcFswXVt0eXBlXSkgbGlzdGVuZXJMaXN0ID0gbGlzdGVuZXJMaXN0LmNvbmNhdCh0aGlzLmxpc3RlbmVyTWFwWzBdW3R5cGVdKTtcbiAgICAgIGlmICh0aGlzLmxpc3RlbmVyTWFwWzFdICYmIHRoaXMubGlzdGVuZXJNYXBbMV1bdHlwZV0pIGxpc3RlbmVyTGlzdCA9IGxpc3RlbmVyTGlzdC5jb25jYXQodGhpcy5saXN0ZW5lck1hcFsxXVt0eXBlXSk7XG4gICAgYnJlYWs7XG4gICAgY2FzZSAzOiAvL0V2ZW50LkJVQkJMSU5HX1BIQVNFOlxuICAgICAgbGlzdGVuZXJMaXN0ID0gdGhpcy5saXN0ZW5lck1hcFswXVt0eXBlXTtcbiAgICBicmVhaztcbiAgfVxuXG4gIC8vIE5lZWQgdG8gY29udGludW91c2x5IGNoZWNrXG4gIC8vIHRoYXQgdGhlIHNwZWNpZmljIGxpc3QgaXNcbiAgLy8gc3RpbGwgcG9wdWxhdGVkIGluIGNhc2Ugb25lXG4gIC8vIG9mIHRoZSBjYWxsYmFja3MgYWN0dWFsbHlcbiAgLy8gY2F1c2VzIHRoZSBsaXN0IHRvIGJlIGRlc3Ryb3llZC5cbiAgbCA9IGxpc3RlbmVyTGlzdC5sZW5ndGg7XG4gIHdoaWxlICh0YXJnZXQgJiYgbCkge1xuICAgIGZvciAoaSA9IDA7IGkgPCBsOyBpKyspIHtcbiAgICAgIGxpc3RlbmVyID0gbGlzdGVuZXJMaXN0W2ldO1xuXG4gICAgICAvLyBCYWlsIGZyb20gdGhpcyBsb29wIGlmXG4gICAgICAvLyB0aGUgbGVuZ3RoIGNoYW5nZWQgYW5kXG4gICAgICAvLyBubyBtb3JlIGxpc3RlbmVycyBhcmVcbiAgICAgIC8vIGRlZmluZWQgYmV0d2VlbiBpIGFuZCBsLlxuICAgICAgaWYgKCFsaXN0ZW5lcikge1xuICAgICAgICBicmVhaztcbiAgICAgIH1cblxuICAgICAgLy8gQ2hlY2sgZm9yIG1hdGNoIGFuZCBmaXJlXG4gICAgICAvLyB0aGUgZXZlbnQgaWYgdGhlcmUncyBvbmVcbiAgICAgIC8vXG4gICAgICAvLyBUT0RPOk1DRzoyMDEyMDExNzogTmVlZCBhIHdheVxuICAgICAgLy8gdG8gY2hlY2sgaWYgZXZlbnQjc3RvcEltbWVkaWF0ZVByb3BhZ2F0aW9uXG4gICAgICAvLyB3YXMgY2FsbGVkLiBJZiBzbywgYnJlYWsgYm90aCBsb29wcy5cbiAgICAgIGlmIChsaXN0ZW5lci5tYXRjaGVyLmNhbGwodGFyZ2V0LCBsaXN0ZW5lci5tYXRjaGVyUGFyYW0sIHRhcmdldCkpIHtcbiAgICAgICAgcmV0dXJuZWQgPSB0aGlzLmZpcmUoZXZlbnQsIHRhcmdldCwgbGlzdGVuZXIpO1xuICAgICAgfVxuXG4gICAgICAvLyBTdG9wIHByb3BhZ2F0aW9uIHRvIHN1YnNlcXVlbnRcbiAgICAgIC8vIGNhbGxiYWNrcyBpZiB0aGUgY2FsbGJhY2sgcmV0dXJuZWRcbiAgICAgIC8vIGZhbHNlXG4gICAgICBpZiAocmV0dXJuZWQgPT09IGZhbHNlKSB7XG4gICAgICAgIGV2ZW50W0VWRU5USUdOT1JFXSA9IHRydWU7XG4gICAgICAgIGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUT0RPOk1DRzoyMDEyMDExNzogTmVlZCBhIHdheSB0b1xuICAgIC8vIGNoZWNrIGlmIGV2ZW50I3N0b3BQcm9wYWdhdGlvblxuICAgIC8vIHdhcyBjYWxsZWQuIElmIHNvLCBicmVhayBsb29waW5nXG4gICAgLy8gdGhyb3VnaCB0aGUgRE9NLiBTdG9wIGlmIHRoZVxuICAgIC8vIGRlbGVnYXRpb24gcm9vdCBoYXMgYmVlbiByZWFjaGVkXG4gICAgaWYgKHRhcmdldCA9PT0gcm9vdCkge1xuICAgICAgYnJlYWs7XG4gICAgfVxuXG4gICAgbCA9IGxpc3RlbmVyTGlzdC5sZW5ndGg7XG4gICAgdGFyZ2V0ID0gdGFyZ2V0LnBhcmVudEVsZW1lbnQ7XG4gIH1cbn07XG5cbi8qKlxuICogRmlyZSBhIGxpc3RlbmVyIG9uIGEgdGFyZ2V0LlxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50XG4gKiBAcGFyYW0ge05vZGV9IHRhcmdldFxuICogQHBhcmFtIHtPYmplY3R9IGxpc3RlbmVyXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn1cbiAqL1xuRGVsZWdhdGUucHJvdG90eXBlLmZpcmUgPSBmdW5jdGlvbihldmVudCwgdGFyZ2V0LCBsaXN0ZW5lcikge1xuICByZXR1cm4gbGlzdGVuZXIuaGFuZGxlci5jYWxsKHRhcmdldCwgZXZlbnQsIHRhcmdldCk7XG59O1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgYW4gZWxlbWVudFxuICogbWF0Y2hlcyBhIGdlbmVyaWMgc2VsZWN0b3IuXG4gKlxuICogQHR5cGUgZnVuY3Rpb24oKVxuICogQHBhcmFtIHtzdHJpbmd9IHNlbGVjdG9yIEEgQ1NTIHNlbGVjdG9yXG4gKi9cbnZhciBtYXRjaGVzID0gKGZ1bmN0aW9uKGVsKSB7XG4gIGlmICghZWwpIHJldHVybjtcbiAgdmFyIHAgPSBlbC5wcm90b3R5cGU7XG4gIHJldHVybiAocC5tYXRjaGVzIHx8IHAubWF0Y2hlc1NlbGVjdG9yIHx8IHAud2Via2l0TWF0Y2hlc1NlbGVjdG9yIHx8IHAubW96TWF0Y2hlc1NlbGVjdG9yIHx8IHAubXNNYXRjaGVzU2VsZWN0b3IgfHwgcC5vTWF0Y2hlc1NlbGVjdG9yKTtcbn0oRWxlbWVudCkpO1xuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgYW4gZWxlbWVudFxuICogbWF0Y2hlcyBhIHRhZyBzZWxlY3Rvci5cbiAqXG4gKiBUYWdzIGFyZSBOT1QgY2FzZS1zZW5zaXRpdmUsXG4gKiBleGNlcHQgaW4gWE1MIChhbmQgWE1MLWJhc2VkXG4gKiBsYW5ndWFnZXMgc3VjaCBhcyBYSFRNTCkuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHRhZ05hbWUgVGhlIHRhZyBuYW1lIHRvIHRlc3QgYWdhaW5zdFxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRvIHRlc3Qgd2l0aFxuICogQHJldHVybnMgYm9vbGVhblxuICovXG5mdW5jdGlvbiBtYXRjaGVzVGFnKHRhZ05hbWUsIGVsZW1lbnQpIHtcbiAgcmV0dXJuIHRhZ05hbWUudG9Mb3dlckNhc2UoKSA9PT0gZWxlbWVudC50YWdOYW1lLnRvTG93ZXJDYXNlKCk7XG59XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciBhbiBlbGVtZW50XG4gKiBtYXRjaGVzIHRoZSByb290LlxuICpcbiAqIEBwYXJhbSB7P1N0cmluZ30gc2VsZWN0b3IgSW4gdGhpcyBjYXNlIHRoaXMgaXMgYWx3YXlzIHBhc3NlZCB0aHJvdWdoIGFzIG51bGwgYW5kIG5vdCB1c2VkXG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdG8gdGVzdCB3aXRoXG4gKiBAcmV0dXJucyBib29sZWFuXG4gKi9cbmZ1bmN0aW9uIG1hdGNoZXNSb290KHNlbGVjdG9yLCBlbGVtZW50KSB7XG4gIC8qanNoaW50IHZhbGlkdGhpczp0cnVlKi9cbiAgaWYgKHRoaXMucm9vdEVsZW1lbnQgPT09IHdpbmRvdykgcmV0dXJuIGVsZW1lbnQgPT09IGRvY3VtZW50O1xuICByZXR1cm4gdGhpcy5yb290RWxlbWVudCA9PT0gZWxlbWVudDtcbn1cblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIHRoZSBJRCBvZlxuICogdGhlIGVsZW1lbnQgaW4gJ3RoaXMnXG4gKiBtYXRjaGVzIHRoZSBnaXZlbiBJRC5cbiAqXG4gKiBJRHMgYXJlIGNhc2Utc2Vuc2l0aXZlLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSBpZCBUaGUgSUQgdG8gdGVzdCBhZ2FpbnN0XG4gKiBAcGFyYW0ge0VsZW1lbnR9IGVsZW1lbnQgVGhlIGVsZW1lbnQgdG8gdGVzdCB3aXRoXG4gKiBAcmV0dXJucyBib29sZWFuXG4gKi9cbmZ1bmN0aW9uIG1hdGNoZXNJZChpZCwgZWxlbWVudCkge1xuICByZXR1cm4gaWQgPT09IGVsZW1lbnQuaWQ7XG59XG5cbi8qKlxuICogU2hvcnQgaGFuZCBmb3Igb2ZmKClcbiAqIGFuZCByb290KCksIGllIGJvdGhcbiAqIHdpdGggbm8gcGFyYW1ldGVyc1xuICpcbiAqIEByZXR1cm4gdm9pZFxuICovXG5EZWxlZ2F0ZS5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICB0aGlzLm9mZigpO1xuICB0aGlzLnJvb3QoKTtcbn07XG4iLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vc3JjL21vZGVscy9Vc2VyJyk7XG4iLCJcbi8qKlxuICogRW5jYXBzdWxhdGVzIGFuIEZUIHVzZXJcbiAqL1xuXG52YXIgVXNlciA9IGZ1bmN0aW9uIChjb29raWUpIHtcbiAgICB0aGlzLmNvb2tpZSA9IChjb29raWUpID8gJzsnICsgY29va2llIDogJyc7XG59XG5cbi8vIFJldHVybnMgdGhlIGVSaWdodHMgdXNlciBpZFxuVXNlci5wcm90b3R5cGUuaWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIHBhcnRzID0gdGhpcy5jb29raWUuc3BsaXQoXCI7IEZUX1U9XCIpO1xuICAgIHZhciBmdFUgPSBwYXJ0cy5wb3AoKS5zcGxpdChcIjtcIikuc2hpZnQoKTtcbiAgICBpZihmdFUpIHtcbiAgICAgICAgcmV0dXJuIGZ0VS5tYXRjaCgvX0VJRD0oXFxkKylfUElELylbMV07XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbn1cblxuVXNlci5wcm90b3R5cGUuc2Vzc2lvbiA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gdGhpcy5jb29raWUubWF0Y2goL1NLRVk9KC4rKV9SSS8pWzFdO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFVzZXI7XG4iLCJcbnZhciByZXF3ZXN0ID0gcmVxdWlyZSgnLi4vdmVuZG9yL3JlcXdlc3QubWluJyk7XG52YXIgVXNlciAgICA9IHJlcXVpcmUoXCIuLy4uLy4uLy4uL25leHQtdXNlci1tb2RlbC1jb21wb25lbnQvbWFpbi5qc1wiKTtcblxudmFyIGVtaXQgPSBmdW5jdGlvbihuYW1lLCBkYXRhKSB7XG4gIHZhciBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuICBldmVudC5pbml0RXZlbnQobmFtZSwgdHJ1ZSwgdHJ1ZSk7XG4gIGlmIChkYXRhKSB7XG4gICAgZXZlbnQuZGV0YWlsID0gZGF0YTtcbiAgfVxuICBkb2N1bWVudC5kaXNwYXRjaEV2ZW50KGV2ZW50KTtcbn07XG5cbnZhciBMaXN0ID0gZnVuY3Rpb24gKG9wdHMpIHtcbiAgICB0aGlzLm5hbWUgID0gb3B0cy5uYW1lO1xuICAgIHRoaXMuYXBpID0gJ2h0dHA6Ly9mdC1uZXh0LWFwaS11c2VyLXByZWZzLmhlcm9rdWFwcC5jb20vdXNlci8nO1xuICAgIHRoaXMudXNlcklkID0gbmV3IFVzZXIoZG9jdW1lbnQuY29va2llKS5pZCgpO1xuICAgIHRoaXMuc2Vzc2lvbiA9IG5ldyBVc2VyKGRvY3VtZW50LmNvb2tpZSkuc2Vzc2lvbigpO1xufTtcblxuTGlzdC5wcm90b3R5cGUuX3JlcXVlc3QgPSBmdW5jdGlvbihtZXRob2QsIHBheWxvYWQsIHBhdGgpIHtcbiAgICBcbiAgICBjb25zb2xlLmxvZyhtZXRob2QsIHRoaXMuYXBpICsgdGhpcy5uYW1lICsgKChwYXRoKSA/ICcvJyArIHBhdGggOiAnJykpO1xuICAgIHJldHVybiByZXF3ZXN0KHtcbiAgICAgICAgdXJsOiB0aGlzLmFwaSArIHRoaXMubmFtZSArICgocGF0aCkgPyAnLycgKyBwYXRoIDogJycpLFxuICAgICAgICBtZXRob2Q6IG1ldGhvZCxcbiAgICAgICAgdHlwZTogJ2pzb24nLFxuICAgICAgICB0aW1lb3V0OiA1MDAwLFxuICAgICAgICBkYXRhOiAocGF5bG9hZCkgPyBKU09OLnN0cmluZ2lmeShwYXlsb2FkKSA6ICcnLFxuICAgICAgICBjb250ZW50VHlwZTogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAnWC1GVC1VSUQnOiB0aGlzLnVzZXJJZCxcbiAgICAgICAgICAgICdYLUZULVNFU1NJT04nOiB0aGlzLnNlc3Npb25cbiAgICAgICAgfSxcbiAgICAgICAgY3Jvc3NPcmlnaW46IHRydWVcbiAgICB9KVxufVxuXG5cbkxpc3QucHJvdG90eXBlLmZldGNoID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBzZWxmID0gdGhpcztcbiAgICB0aGlzLl9yZXF1ZXN0KCdHRVQnKVxuICAgICAgICAudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcbiAgICAgICAgICAgIGVtaXQoc2VsZi5uYW1lICsgJzpsb2FkJywgcmVzcG9uc2UpXG4gICAgICAgIH0pICAgIFxuICAgICAgICAuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmYWlsZWQgdG8gZmV0Y2ggdG8gbGlzdCcpO1xuICAgICAgICB9KTtcbn07XG5cbkxpc3QucHJvdG90eXBlLmFkZCA9IGZ1bmN0aW9uIChwYXlsb2FkKSB7XG4gICAgdGhpcy5fcmVxdWVzdCgnUFVUJywgcGF5bG9hZClcbiAgICAgICAgLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZmFpbGVkIHRvIGFkZCB0byBsaXN0JywgcGF5bG9hZCk7XG4gICAgICAgIH0pO1xufTtcblxuTGlzdC5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbiAocGF5bG9hZCkge1xuXG4gICAgaWYgKCFwYXlsb2FkLnV1aWR2Mykge1xuICAgICAgICB0aHJvdyBcIkF0dGVtcHRpbmcgdG8gZGVsZXRlIGEgbGlzdCB3aXRob3V0IGEgdXVpZCBzdHJpbmdcIlxuICAgIH1cblxuICAgIHRoaXMuX3JlcXVlc3QoJ0RFTEVURScsIHVuZGVmaW5lZCwgZW5jb2RlVVJJKGRlY29kZVVSSShwYXlsb2FkLnV1aWR2MykpKVxuICAgICAgICAuZmFpbChmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCdmYWlsZWQgdG8gZGVsZXRlIHRvIGxpc3QnLCBwYXlsb2FkKTtcbiAgICAgICAgfSk7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IExpc3Q7XG4iLCJcbnZhciByZXF3ZXN0ID0gcmVxdWlyZSgnLi4vdmVuZG9yL3JlcXdlc3QubWluJyk7XG52YXIgVXNlciAgICA9IHJlcXVpcmUoXCIuLy4uLy4uLy4uL25leHQtdXNlci1tb2RlbC1jb21wb25lbnQvbWFpbi5qc1wiKTtcblxudmFyIE5PVElGSUNBVElPTlNfVVJMID0gJ2h0dHA6Ly9mdC1uZXh0LWFwaS11c2VyLXByZWZzLmhlcm9rdWFwcC5jb20vdXNlci9ub3RpZmljYXRpb25zJztcblxudmFyIGVtaXQgPSBmdW5jdGlvbihuYW1lLCBkYXRhKSB7XG5cdHZhciBldmVudCA9IGRvY3VtZW50LmNyZWF0ZUV2ZW50KCdFdmVudCcpO1xuXHRldmVudC5pbml0RXZlbnQobmFtZSwgdHJ1ZSwgdHJ1ZSk7XG5cdGlmIChkYXRhKSB7XG5cdFx0ZXZlbnQuZGV0YWlsID0gZGF0YTtcblx0fVxuXHR0b3AuZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCk7XG59O1xuXG5cbmZ1bmN0aW9uIGV4dHJhY3RTZWFyY2hUZXJtKHF1ZXJ5U3RyaW5nKSB7XG4gICAgcmV0dXJuIHF1ZXJ5U3RyaW5nLm1hdGNoKC9xPShbXiZdKikvKVsxXTtcbn1cblxudmFyIGdldEN1cnJlbnRTdHJlYW0gPSBmdW5jdGlvbigpIHtcbiAgdmFyIG9uQXJ0aWNsZSA9IC9eXFwvW2EtZjAtOV0rLSguKikvLnRlc3QobG9jYXRpb24ucGF0aG5hbWUpOyAvLyAnMjdhNWUyODYtNDMxNC0xMWU0LThhNDMtMDAxNDRmZWFiZGMwJzsgXG4gIGlmKG9uQXJ0aWNsZSB8fCBsb2NhdGlvbi5wYXRobmFtZS5pbmRleE9mKCcvc2VhcmNoJykgIT09IDApIHsgLy9oYWNreSB3YXkgdG8gZXhjbHVkZSBob21lcGFnZSFcbiAgXHRyZXR1cm4gZmFsc2U7XG4gIH0gZWxzZSB7XG4gIFx0cmV0dXJuIGV4dHJhY3RTZWFyY2hUZXJtKGxvY2F0aW9uLnNlYXJjaCk7XG4gIH1cbn07XG5cblxuZnVuY3Rpb24gTm90aWZpY2F0aW9uUG9sbGVyKCkge1xuXHRcbiAgICB0aGlzLnVzZXJJZCA9IG5ldyBVc2VyKGRvY3VtZW50LmNvb2tpZSkuaWQoKTtcblxuXHRzZXRJbnRlcnZhbCh0aGlzLnBvbGwuYmluZCh0aGlzKSwgMTAwMCAqIDYwICogMC4yKTsgLy8gMzAgc2Vjb25kIHBvbGxpbmdcblx0XG5cdC8vIENsZWFyIG5vdGlmaWNhdGlvbnMgaWYgYSBzdHJlYW0gaGFzIGJlZW4gb3BlbmVuZFxuXHR0aGlzLmN1cnJlbnRTdHJlYW0gPSBnZXRDdXJyZW50U3RyZWFtKCk7XG5cbiAgICAvLyBGSVhNRSAtIG5vdCBpbXBsZW1lbnRlZFxuXHRpZigvUEFUSC1UTy1GT0xMT1dJTkcvLnRlc3QobG9jYXRpb24ucGF0aG5hbWUpKSB7XG4gICAgICAgIGNvbnNvbGUubG9nKCdjbGVhcmluZyBhbGwgbm90aWZpY2F0aW9ucycpO1xuXHR9IGVsc2UgaWYodGhpcy5jdXJyZW50U3RyZWFtKSB7XG5cdFx0dGhpcy5jbGVhcih0aGlzLmN1cnJlbnRTdHJlYW0pO1xuXHR9XG5cblx0dGhpcy5wb2xsKCk7IC8vcGFzcyBmbGFnIHRvIGluZGljYXRlIHRoaXMgaXMgdGhlIGZpcnN0IGxvYWRcblxufVxuXG5Ob3RpZmljYXRpb25Qb2xsZXIucHJvdG90eXBlLnBvbGwgPSBmdW5jdGlvbigpIHtcblx0XG4gICAgLy8gZmV0Y2ggYWxsIG5vdGlmaWNhdGlvbnNcbiAgICByZXF3ZXN0KHtcbiAgICAgICAgdXJsOiBOT1RJRklDQVRJT05TX1VSTCxcbiAgICAgICAgdHlwZTogJ2pzb24nLFxuICAgICAgICBtZXRob2Q6ICdnZXQnLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgICAnWC1GVC1VSUQnOiB0aGlzLnVzZXJJZCBcbiAgICAgICAgfSxcbiAgICAgICAgY3Jvc3NPcmlnaW46IHRydWVcbiAgICB9LCBmdW5jdGlvbiAobm90aWZpY2F0aW9ucykge1xuICAgICAgICBlbWl0KCdub3RpZmljYXRpb25zOmxvYWQnLCB7IGNvdW50OiBub3RpZmljYXRpb25zLmxlbmd0aCB9KTtcbiAgICB9KTtcbn07XG5cbk5vdGlmaWNhdGlvblBvbGxlci5wcm90b3R5cGUuY2xlYXIgPSBmdW5jdGlvbih1dWlkKSB7XG5cdGlmKHV1aWQpIHtcblx0XHRyZXF3ZXN0KHtcblx0XHRcdHVybDogTk9USUZJQ0FUSU9OU19VUkwgKyAnLycgKyB1dWlkLFxuXHRcdFx0dHlwZTogJ2pzb24nLFxuXHRcdFx0bWV0aG9kOiAnZGVsZXRlJyxcblx0XHRcdGhlYWRlcnM6IHtcblx0XHRcdFx0J1gtRlQtVUlEJzogdGhpcy51c2VySWRcblx0XHRcdH0sXG5cdFx0XHRjcm9zc09yaWdpbjogdHJ1ZVxuXHRcdH0pO1xuXHR9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5vdGlmaWNhdGlvblBvbGxlcjtcbiIsIlxudmFyIExpc3QgPSByZXF1aXJlKCcuL0xpc3QnKTtcblxudmFyIFVzZXJQcmVmcyA9IGZ1bmN0aW9uKG9wdHMpIHtcblxuICAgIC8vIENyZWF0ZSBsaXN0cyBmb3IgYSB1c2VyXG4gICAgdmFyIHJlY29tbWVuZCAgID0gbmV3IExpc3QoeyBuYW1lOiAncmVjb21tZW5kJyB9KTtcbiAgICB2YXIgZm9sbG93aW5nICAgPSBuZXcgTGlzdCh7IG5hbWU6ICdmYXZvdXJpdGVzJyB9KTsgLy8gRklYTUUgY2hhbmdlIHRvIGZvbGxvd2luZyBhZnRlciBuZXcgQVBJIGlzIHdvcmtpbmdcbiAgICB2YXIgZm9ybGF0ZXIgICAgPSBuZXcgTGlzdCh7IG5hbWU6ICdmb3JsYXRlcnMnIH0pO1xuICAgIHZhciBoaXN0b3J5ICAgICA9IG5ldyBMaXN0KHsgbmFtZTogJ2hpc3RvcnknIH0pO1xuICAgXG4gICAgLy8gTGlzdGVuIGZvciBldmVudHMsIGJpbmQgdGhlbSB0byB0aGUgbGlzdCBtZXRob2RzXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncmVjb21tZW5kOmFkZCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICByZWNvbW1lbmQuYWRkKGV2ZW50LmRldGFpbCk7XG4gICAgfSk7XG5cbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdmYXZvdXJpdGVzOmFkZCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBmb2xsb3dpbmcuYWRkKGV2ZW50LmRldGFpbCk7XG4gICAgfSk7XG4gICAgXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZm9ybGF0ZXJzOmFkZCcsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBmb3JsYXRlci5hZGQoZXZlbnQuZGV0YWlsKTtcbiAgICB9KTtcbiAgICBcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdyZWNvbW1lbmQ6cmVtb3ZlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIHJlY29tbWVuZC5jbGVhcihldmVudC5kZXRhaWwpO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZmF2b3VyaXRlczpyZW1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgZm9sbG93aW5nLmNsZWFyKGV2ZW50LmRldGFpbCk7XG4gICAgfSk7XG4gICAgXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZm9ybGF0ZXJzOnJlbW92ZScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICBmb3JsYXRlci5jbGVhcihldmVudC5kZXRhaWwpO1xuICAgIH0pO1xuICAgIFxuICAgIC8vIEZldGNoIGVhY2ggdHlwZSBvZiBsaXN0IHNvIHRoYXQgdGhlIGNvbnRlbnRzIG9mIGVhY2ggb25lIGdldHMgYnJvYWRjYXN0XG4gICAgLy8gdG8gdGhlIHJlc3Qgb2YgdGhlIFVJIFxuICAgIFxuICAgIGZvbGxvd2luZy5mZXRjaCgpO1xuICAgIGZvcmxhdGVyLmZldGNoKCk7XG4gICAgcmVjb21tZW5kLmZldGNoKCk7XG5cbn07XG5cblxubW9kdWxlLmV4cG9ydHMgPSBVc2VyUHJlZnM7XG4iLCJcbnZhciBVc2VyUHJlZnMgICAgICAgICAgID0gcmVxdWlyZSgnLi9saWIvVXNlclByZWZzJyk7XG52YXIgTm90aWZpY2F0aW9uUG9sbGVyICA9IHJlcXVpcmUoJy4vbGliL05vdGlmaWNhdGlvblBvbGxlcicpO1xuXG4oZnVuY3Rpb24gKCkge1xuICAgIG5ldyBVc2VyUHJlZnMoKTtcbiAgICBuZXcgTm90aWZpY2F0aW9uUG9sbGVyKCk7XG59KSgpO1xuIiwiLyohXG4gICogUmVxd2VzdCEgQSBnZW5lcmFsIHB1cnBvc2UgWEhSIGNvbm5lY3Rpb24gbWFuYWdlclxuICAqIGxpY2Vuc2UgTUlUIChjKSBEdXN0aW4gRGlheiAyMDE0XG4gICogaHR0cHM6Ly9naXRodWIuY29tL2RlZC9yZXF3ZXN0XG4gICovXG4hZnVuY3Rpb24oZSx0LG4pe3R5cGVvZiBtb2R1bGUhPVwidW5kZWZpbmVkXCImJm1vZHVsZS5leHBvcnRzP21vZHVsZS5leHBvcnRzPW4oKTp0eXBlb2YgZGVmaW5lPT1cImZ1bmN0aW9uXCImJmRlZmluZS5hbWQ/ZGVmaW5lKG4pOnRbZV09bigpfShcInJlcXdlc3RcIix0aGlzLGZ1bmN0aW9uKCl7ZnVuY3Rpb24gc3VjY2VlZChlKXtyZXR1cm4gaHR0cHNSZS50ZXN0KHdpbmRvdy5sb2NhdGlvbi5wcm90b2NvbCk/dHdvSHVuZG8udGVzdChlLnN0YXR1cyk6ISFlLnJlc3BvbnNlfWZ1bmN0aW9uIGhhbmRsZVJlYWR5U3RhdGUoZSx0LG4pe3JldHVybiBmdW5jdGlvbigpe2lmKGUuX2Fib3J0ZWQpcmV0dXJuIG4oZS5yZXF1ZXN0KTtlLnJlcXVlc3QmJmUucmVxdWVzdFtyZWFkeVN0YXRlXT09NCYmKGUucmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2U9bm9vcCxzdWNjZWVkKGUucmVxdWVzdCk/dChlLnJlcXVlc3QpOm4oZS5yZXF1ZXN0KSl9fWZ1bmN0aW9uIHNldEhlYWRlcnMoZSx0KXt2YXIgbj10LmhlYWRlcnN8fHt9LHI7bi5BY2NlcHQ9bi5BY2NlcHR8fGRlZmF1bHRIZWFkZXJzLmFjY2VwdFt0LnR5cGVdfHxkZWZhdWx0SGVhZGVycy5hY2NlcHRbXCIqXCJdO3ZhciBpPXR5cGVvZiBGb3JtRGF0YT09XCJmdW5jdGlvblwiJiZ0LmRhdGEgaW5zdGFuY2VvZiBGb3JtRGF0YTshdC5jcm9zc09yaWdpbiYmIW5bcmVxdWVzdGVkV2l0aF0mJihuW3JlcXVlc3RlZFdpdGhdPWRlZmF1bHRIZWFkZXJzLnJlcXVlc3RlZFdpdGgpLCFuW2NvbnRlbnRUeXBlXSYmIWkmJihuW2NvbnRlbnRUeXBlXT10LmNvbnRlbnRUeXBlfHxkZWZhdWx0SGVhZGVycy5jb250ZW50VHlwZSk7Zm9yKHIgaW4gbiluLmhhc093blByb3BlcnR5KHIpJiZcInNldFJlcXVlc3RIZWFkZXJcImluIGUmJmUuc2V0UmVxdWVzdEhlYWRlcihyLG5bcl0pfWZ1bmN0aW9uIHNldENyZWRlbnRpYWxzKGUsdCl7dHlwZW9mIHQud2l0aENyZWRlbnRpYWxzIT1cInVuZGVmaW5lZFwiJiZ0eXBlb2YgZS53aXRoQ3JlZGVudGlhbHMhPVwidW5kZWZpbmVkXCImJihlLndpdGhDcmVkZW50aWFscz0hIXQud2l0aENyZWRlbnRpYWxzKX1mdW5jdGlvbiBnZW5lcmFsQ2FsbGJhY2soZSl7bGFzdFZhbHVlPWV9ZnVuY3Rpb24gdXJsYXBwZW5kKGUsdCl7cmV0dXJuIGUrKC9cXD8vLnRlc3QoZSk/XCImXCI6XCI/XCIpK3R9ZnVuY3Rpb24gaGFuZGxlSnNvbnAoZSx0LG4scil7dmFyIGk9dW5pcWlkKysscz1lLmpzb25wQ2FsbGJhY2t8fFwiY2FsbGJhY2tcIixvPWUuanNvbnBDYWxsYmFja05hbWV8fHJlcXdlc3QuZ2V0Y2FsbGJhY2tQcmVmaXgoaSksdT1uZXcgUmVnRXhwKFwiKChefFxcXFw/fCYpXCIrcytcIik9KFteJl0rKVwiKSxhPXIubWF0Y2godSksZj1kb2MuY3JlYXRlRWxlbWVudChcInNjcmlwdFwiKSxsPTAsYz1uYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoXCJNU0lFIDEwLjBcIikhPT0tMTtyZXR1cm4gYT9hWzNdPT09XCI/XCI/cj1yLnJlcGxhY2UodSxcIiQxPVwiK28pOm89YVszXTpyPXVybGFwcGVuZChyLHMrXCI9XCIrbyksd2luW29dPWdlbmVyYWxDYWxsYmFjayxmLnR5cGU9XCJ0ZXh0L2phdmFzY3JpcHRcIixmLnNyYz1yLGYuYXN5bmM9ITAsdHlwZW9mIGYub25yZWFkeXN0YXRlY2hhbmdlIT1cInVuZGVmaW5lZFwiJiYhYyYmKGYuaHRtbEZvcj1mLmlkPVwiX3JlcXdlc3RfXCIraSksZi5vbmxvYWQ9Zi5vbnJlYWR5c3RhdGVjaGFuZ2U9ZnVuY3Rpb24oKXtpZihmW3JlYWR5U3RhdGVdJiZmW3JlYWR5U3RhdGVdIT09XCJjb21wbGV0ZVwiJiZmW3JlYWR5U3RhdGVdIT09XCJsb2FkZWRcInx8bClyZXR1cm4hMTtmLm9ubG9hZD1mLm9ucmVhZHlzdGF0ZWNoYW5nZT1udWxsLGYub25jbGljayYmZi5vbmNsaWNrKCksdChsYXN0VmFsdWUpLGxhc3RWYWx1ZT11bmRlZmluZWQsaGVhZC5yZW1vdmVDaGlsZChmKSxsPTF9LGhlYWQuYXBwZW5kQ2hpbGQoZikse2Fib3J0OmZ1bmN0aW9uKCl7Zi5vbmxvYWQ9Zi5vbnJlYWR5c3RhdGVjaGFuZ2U9bnVsbCxuKHt9LFwiUmVxdWVzdCBpcyBhYm9ydGVkOiB0aW1lb3V0XCIse30pLGxhc3RWYWx1ZT11bmRlZmluZWQsaGVhZC5yZW1vdmVDaGlsZChmKSxsPTF9fX1mdW5jdGlvbiBnZXRSZXF1ZXN0KGUsdCl7dmFyIG49dGhpcy5vLHI9KG4ubWV0aG9kfHxcIkdFVFwiKS50b1VwcGVyQ2FzZSgpLGk9dHlwZW9mIG49PVwic3RyaW5nXCI/bjpuLnVybCxzPW4ucHJvY2Vzc0RhdGEhPT0hMSYmbi5kYXRhJiZ0eXBlb2Ygbi5kYXRhIT1cInN0cmluZ1wiP3JlcXdlc3QudG9RdWVyeVN0cmluZyhuLmRhdGEpOm4uZGF0YXx8bnVsbCxvLHU9ITE7cmV0dXJuKG5bXCJ0eXBlXCJdPT1cImpzb25wXCJ8fHI9PVwiR0VUXCIpJiZzJiYoaT11cmxhcHBlbmQoaSxzKSxzPW51bGwpLG5bXCJ0eXBlXCJdPT1cImpzb25wXCI/aGFuZGxlSnNvbnAobixlLHQsaSk6KG89bi54aHImJm4ueGhyKG4pfHx4aHIobiksby5vcGVuKHIsaSxuLmFzeW5jPT09ITE/ITE6ITApLHNldEhlYWRlcnMobyxuKSxzZXRDcmVkZW50aWFscyhvLG4pLHdpblt4RG9tYWluUmVxdWVzdF0mJm8gaW5zdGFuY2VvZiB3aW5beERvbWFpblJlcXVlc3RdPyhvLm9ubG9hZD1lLG8ub25lcnJvcj10LG8ub25wcm9ncmVzcz1mdW5jdGlvbigpe30sdT0hMCk6by5vbnJlYWR5c3RhdGVjaGFuZ2U9aGFuZGxlUmVhZHlTdGF0ZSh0aGlzLGUsdCksbi5iZWZvcmUmJm4uYmVmb3JlKG8pLHU/c2V0VGltZW91dChmdW5jdGlvbigpe28uc2VuZChzKX0sMjAwKTpvLnNlbmQocyksbyl9ZnVuY3Rpb24gUmVxd2VzdChlLHQpe3RoaXMubz1lLHRoaXMuZm49dCxpbml0LmFwcGx5KHRoaXMsYXJndW1lbnRzKX1mdW5jdGlvbiBzZXRUeXBlKGUpe2lmKGUubWF0Y2goXCJqc29uXCIpKXJldHVyblwianNvblwiO2lmKGUubWF0Y2goXCJqYXZhc2NyaXB0XCIpKXJldHVyblwianNcIjtpZihlLm1hdGNoKFwidGV4dFwiKSlyZXR1cm5cImh0bWxcIjtpZihlLm1hdGNoKFwieG1sXCIpKXJldHVyblwieG1sXCJ9ZnVuY3Rpb24gaW5pdChvLGZuKXtmdW5jdGlvbiBjb21wbGV0ZShlKXtvLnRpbWVvdXQmJmNsZWFyVGltZW91dChzZWxmLnRpbWVvdXQpLHNlbGYudGltZW91dD1udWxsO3doaWxlKHNlbGYuX2NvbXBsZXRlSGFuZGxlcnMubGVuZ3RoPjApc2VsZi5fY29tcGxldGVIYW5kbGVycy5zaGlmdCgpKGUpfWZ1bmN0aW9uIHN1Y2Nlc3MocmVzcCl7dmFyIHR5cGU9by50eXBlfHxzZXRUeXBlKHJlc3AuZ2V0UmVzcG9uc2VIZWFkZXIoXCJDb250ZW50LVR5cGVcIikpO3Jlc3A9dHlwZSE9PVwianNvbnBcIj9zZWxmLnJlcXVlc3Q6cmVzcDt2YXIgZmlsdGVyZWRSZXNwb25zZT1nbG9iYWxTZXR1cE9wdGlvbnMuZGF0YUZpbHRlcihyZXNwLnJlc3BvbnNlVGV4dCx0eXBlKSxyPWZpbHRlcmVkUmVzcG9uc2U7dHJ5e3Jlc3AucmVzcG9uc2VUZXh0PXJ9Y2F0Y2goZSl7fWlmKHIpc3dpdGNoKHR5cGUpe2Nhc2VcImpzb25cIjp0cnl7cmVzcD13aW4uSlNPTj93aW4uSlNPTi5wYXJzZShyKTpldmFsKFwiKFwiK3IrXCIpXCIpfWNhdGNoKGVycil7cmV0dXJuIGVycm9yKHJlc3AsXCJDb3VsZCBub3QgcGFyc2UgSlNPTiBpbiByZXNwb25zZVwiLGVycil9YnJlYWs7Y2FzZVwianNcIjpyZXNwPWV2YWwocik7YnJlYWs7Y2FzZVwiaHRtbFwiOnJlc3A9cjticmVhaztjYXNlXCJ4bWxcIjpyZXNwPXJlc3AucmVzcG9uc2VYTUwmJnJlc3AucmVzcG9uc2VYTUwucGFyc2VFcnJvciYmcmVzcC5yZXNwb25zZVhNTC5wYXJzZUVycm9yLmVycm9yQ29kZSYmcmVzcC5yZXNwb25zZVhNTC5wYXJzZUVycm9yLnJlYXNvbj9udWxsOnJlc3AucmVzcG9uc2VYTUx9c2VsZi5fcmVzcG9uc2VBcmdzLnJlc3A9cmVzcCxzZWxmLl9mdWxmaWxsZWQ9ITAsZm4ocmVzcCksc2VsZi5fc3VjY2Vzc0hhbmRsZXIocmVzcCk7d2hpbGUoc2VsZi5fZnVsZmlsbG1lbnRIYW5kbGVycy5sZW5ndGg+MClyZXNwPXNlbGYuX2Z1bGZpbGxtZW50SGFuZGxlcnMuc2hpZnQoKShyZXNwKTtjb21wbGV0ZShyZXNwKX1mdW5jdGlvbiBlcnJvcihlLHQsbil7ZT1zZWxmLnJlcXVlc3Qsc2VsZi5fcmVzcG9uc2VBcmdzLnJlc3A9ZSxzZWxmLl9yZXNwb25zZUFyZ3MubXNnPXQsc2VsZi5fcmVzcG9uc2VBcmdzLnQ9bixzZWxmLl9lcnJlZD0hMDt3aGlsZShzZWxmLl9lcnJvckhhbmRsZXJzLmxlbmd0aD4wKXNlbGYuX2Vycm9ySGFuZGxlcnMuc2hpZnQoKShlLHQsbik7Y29tcGxldGUoZSl9dGhpcy51cmw9dHlwZW9mIG89PVwic3RyaW5nXCI/bzpvLnVybCx0aGlzLnRpbWVvdXQ9bnVsbCx0aGlzLl9mdWxmaWxsZWQ9ITEsdGhpcy5fc3VjY2Vzc0hhbmRsZXI9ZnVuY3Rpb24oKXt9LHRoaXMuX2Z1bGZpbGxtZW50SGFuZGxlcnM9W10sdGhpcy5fZXJyb3JIYW5kbGVycz1bXSx0aGlzLl9jb21wbGV0ZUhhbmRsZXJzPVtdLHRoaXMuX2VycmVkPSExLHRoaXMuX3Jlc3BvbnNlQXJncz17fTt2YXIgc2VsZj10aGlzO2ZuPWZufHxmdW5jdGlvbigpe30sby50aW1lb3V0JiYodGhpcy50aW1lb3V0PXNldFRpbWVvdXQoZnVuY3Rpb24oKXtzZWxmLmFib3J0KCl9LG8udGltZW91dCkpLG8uc3VjY2VzcyYmKHRoaXMuX3N1Y2Nlc3NIYW5kbGVyPWZ1bmN0aW9uKCl7by5zdWNjZXNzLmFwcGx5KG8sYXJndW1lbnRzKX0pLG8uZXJyb3ImJnRoaXMuX2Vycm9ySGFuZGxlcnMucHVzaChmdW5jdGlvbigpe28uZXJyb3IuYXBwbHkobyxhcmd1bWVudHMpfSksby5jb21wbGV0ZSYmdGhpcy5fY29tcGxldGVIYW5kbGVycy5wdXNoKGZ1bmN0aW9uKCl7by5jb21wbGV0ZS5hcHBseShvLGFyZ3VtZW50cyl9KSx0aGlzLnJlcXVlc3Q9Z2V0UmVxdWVzdC5jYWxsKHRoaXMsc3VjY2VzcyxlcnJvcil9ZnVuY3Rpb24gcmVxd2VzdChlLHQpe3JldHVybiBuZXcgUmVxd2VzdChlLHQpfWZ1bmN0aW9uIG5vcm1hbGl6ZShlKXtyZXR1cm4gZT9lLnJlcGxhY2UoL1xccj9cXG4vZyxcIlxcclxcblwiKTpcIlwifWZ1bmN0aW9uIHNlcmlhbChlLHQpe3ZhciBuPWUubmFtZSxyPWUudGFnTmFtZS50b0xvd2VyQ2FzZSgpLGk9ZnVuY3Rpb24oZSl7ZSYmIWUuZGlzYWJsZWQmJnQobixub3JtYWxpemUoZS5hdHRyaWJ1dGVzLnZhbHVlJiZlLmF0dHJpYnV0ZXMudmFsdWUuc3BlY2lmaWVkP2UudmFsdWU6ZS50ZXh0KSl9LHMsbyx1LGE7aWYoZS5kaXNhYmxlZHx8IW4pcmV0dXJuO3N3aXRjaChyKXtjYXNlXCJpbnB1dFwiOi9yZXNldHxidXR0b258aW1hZ2V8ZmlsZS9pLnRlc3QoZS50eXBlKXx8KHM9L2NoZWNrYm94L2kudGVzdChlLnR5cGUpLG89L3JhZGlvL2kudGVzdChlLnR5cGUpLHU9ZS52YWx1ZSwoIXMmJiFvfHxlLmNoZWNrZWQpJiZ0KG4sbm9ybWFsaXplKHMmJnU9PT1cIlwiP1wib25cIjp1KSkpO2JyZWFrO2Nhc2VcInRleHRhcmVhXCI6dChuLG5vcm1hbGl6ZShlLnZhbHVlKSk7YnJlYWs7Y2FzZVwic2VsZWN0XCI6aWYoZS50eXBlLnRvTG93ZXJDYXNlKCk9PT1cInNlbGVjdC1vbmVcIilpKGUuc2VsZWN0ZWRJbmRleD49MD9lLm9wdGlvbnNbZS5zZWxlY3RlZEluZGV4XTpudWxsKTtlbHNlIGZvcihhPTA7ZS5sZW5ndGgmJmE8ZS5sZW5ndGg7YSsrKWUub3B0aW9uc1thXS5zZWxlY3RlZCYmaShlLm9wdGlvbnNbYV0pfX1mdW5jdGlvbiBlYWNoRm9ybUVsZW1lbnQoKXt2YXIgZT10aGlzLHQsbixyPWZ1bmN0aW9uKHQsbil7dmFyIHIsaSxzO2ZvcihyPTA7cjxuLmxlbmd0aDtyKyspe3M9dFtieVRhZ10obltyXSk7Zm9yKGk9MDtpPHMubGVuZ3RoO2krKylzZXJpYWwoc1tpXSxlKX19O2ZvcihuPTA7bjxhcmd1bWVudHMubGVuZ3RoO24rKyl0PWFyZ3VtZW50c1tuXSwvaW5wdXR8c2VsZWN0fHRleHRhcmVhL2kudGVzdCh0LnRhZ05hbWUpJiZzZXJpYWwodCxlKSxyKHQsW1wiaW5wdXRcIixcInNlbGVjdFwiLFwidGV4dGFyZWFcIl0pfWZ1bmN0aW9uIHNlcmlhbGl6ZVF1ZXJ5U3RyaW5nKCl7cmV0dXJuIHJlcXdlc3QudG9RdWVyeVN0cmluZyhyZXF3ZXN0LnNlcmlhbGl6ZUFycmF5LmFwcGx5KG51bGwsYXJndW1lbnRzKSl9ZnVuY3Rpb24gc2VyaWFsaXplSGFzaCgpe3ZhciBlPXt9O3JldHVybiBlYWNoRm9ybUVsZW1lbnQuYXBwbHkoZnVuY3Rpb24odCxuKXt0IGluIGU/KGVbdF0mJiFpc0FycmF5KGVbdF0pJiYoZVt0XT1bZVt0XV0pLGVbdF0ucHVzaChuKSk6ZVt0XT1ufSxhcmd1bWVudHMpLGV9ZnVuY3Rpb24gYnVpbGRQYXJhbXMoZSx0LG4scil7dmFyIGkscyxvLHU9L1xcW1xcXSQvO2lmKGlzQXJyYXkodCkpZm9yKHM9MDt0JiZzPHQubGVuZ3RoO3MrKylvPXRbc10sbnx8dS50ZXN0KGUpP3IoZSxvKTpidWlsZFBhcmFtcyhlK1wiW1wiKyh0eXBlb2Ygbz09XCJvYmplY3RcIj9zOlwiXCIpK1wiXVwiLG8sbixyKTtlbHNlIGlmKHQmJnQudG9TdHJpbmcoKT09PVwiW29iamVjdCBPYmplY3RdXCIpZm9yKGkgaW4gdClidWlsZFBhcmFtcyhlK1wiW1wiK2krXCJdXCIsdFtpXSxuLHIpO2Vsc2UgcihlLHQpfXZhciB3aW49d2luZG93LGRvYz1kb2N1bWVudCxodHRwc1JlPS9eaHR0cC8sdHdvSHVuZG89L14oMjBcXGR8MTIyMykkLyxieVRhZz1cImdldEVsZW1lbnRzQnlUYWdOYW1lXCIscmVhZHlTdGF0ZT1cInJlYWR5U3RhdGVcIixjb250ZW50VHlwZT1cIkNvbnRlbnQtVHlwZVwiLHJlcXVlc3RlZFdpdGg9XCJYLVJlcXVlc3RlZC1XaXRoXCIsaGVhZD1kb2NbYnlUYWddKFwiaGVhZFwiKVswXSx1bmlxaWQ9MCxjYWxsYmFja1ByZWZpeD1cInJlcXdlc3RfXCIrICsobmV3IERhdGUpLGxhc3RWYWx1ZSx4bWxIdHRwUmVxdWVzdD1cIlhNTEh0dHBSZXF1ZXN0XCIseERvbWFpblJlcXVlc3Q9XCJYRG9tYWluUmVxdWVzdFwiLG5vb3A9ZnVuY3Rpb24oKXt9LGlzQXJyYXk9dHlwZW9mIEFycmF5LmlzQXJyYXk9PVwiZnVuY3Rpb25cIj9BcnJheS5pc0FycmF5OmZ1bmN0aW9uKGUpe3JldHVybiBlIGluc3RhbmNlb2YgQXJyYXl9LGRlZmF1bHRIZWFkZXJzPXtjb250ZW50VHlwZTpcImFwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZFwiLHJlcXVlc3RlZFdpdGg6eG1sSHR0cFJlcXVlc3QsYWNjZXB0OntcIipcIjpcInRleHQvamF2YXNjcmlwdCwgdGV4dC9odG1sLCBhcHBsaWNhdGlvbi94bWwsIHRleHQveG1sLCAqLypcIix4bWw6XCJhcHBsaWNhdGlvbi94bWwsIHRleHQveG1sXCIsaHRtbDpcInRleHQvaHRtbFwiLHRleHQ6XCJ0ZXh0L3BsYWluXCIsanNvbjpcImFwcGxpY2F0aW9uL2pzb24sIHRleHQvamF2YXNjcmlwdFwiLGpzOlwiYXBwbGljYXRpb24vamF2YXNjcmlwdCwgdGV4dC9qYXZhc2NyaXB0XCJ9fSx4aHI9ZnVuY3Rpb24oZSl7aWYoZS5jcm9zc09yaWdpbj09PSEwKXt2YXIgdD13aW5beG1sSHR0cFJlcXVlc3RdP25ldyBYTUxIdHRwUmVxdWVzdDpudWxsO2lmKHQmJlwid2l0aENyZWRlbnRpYWxzXCJpbiB0KXJldHVybiB0O2lmKHdpblt4RG9tYWluUmVxdWVzdF0pcmV0dXJuIG5ldyBYRG9tYWluUmVxdWVzdDt0aHJvdyBuZXcgRXJyb3IoXCJCcm93c2VyIGRvZXMgbm90IHN1cHBvcnQgY3Jvc3Mtb3JpZ2luIHJlcXVlc3RzXCIpfXJldHVybiB3aW5beG1sSHR0cFJlcXVlc3RdP25ldyBYTUxIdHRwUmVxdWVzdDpuZXcgQWN0aXZlWE9iamVjdChcIk1pY3Jvc29mdC5YTUxIVFRQXCIpfSxnbG9iYWxTZXR1cE9wdGlvbnM9e2RhdGFGaWx0ZXI6ZnVuY3Rpb24oZSl7cmV0dXJuIGV9fTtyZXR1cm4gUmVxd2VzdC5wcm90b3R5cGU9e2Fib3J0OmZ1bmN0aW9uKCl7dGhpcy5fYWJvcnRlZD0hMCx0aGlzLnJlcXVlc3QuYWJvcnQoKX0scmV0cnk6ZnVuY3Rpb24oKXtpbml0LmNhbGwodGhpcyx0aGlzLm8sdGhpcy5mbil9LHRoZW46ZnVuY3Rpb24oZSx0KXtyZXR1cm4gZT1lfHxmdW5jdGlvbigpe30sdD10fHxmdW5jdGlvbigpe30sdGhpcy5fZnVsZmlsbGVkP3RoaXMuX3Jlc3BvbnNlQXJncy5yZXNwPWUodGhpcy5fcmVzcG9uc2VBcmdzLnJlc3ApOnRoaXMuX2VycmVkP3QodGhpcy5fcmVzcG9uc2VBcmdzLnJlc3AsdGhpcy5fcmVzcG9uc2VBcmdzLm1zZyx0aGlzLl9yZXNwb25zZUFyZ3MudCk6KHRoaXMuX2Z1bGZpbGxtZW50SGFuZGxlcnMucHVzaChlKSx0aGlzLl9lcnJvckhhbmRsZXJzLnB1c2godCkpLHRoaXN9LGFsd2F5czpmdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5fZnVsZmlsbGVkfHx0aGlzLl9lcnJlZD9lKHRoaXMuX3Jlc3BvbnNlQXJncy5yZXNwKTp0aGlzLl9jb21wbGV0ZUhhbmRsZXJzLnB1c2goZSksdGhpc30sZmFpbDpmdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5fZXJyZWQ/ZSh0aGlzLl9yZXNwb25zZUFyZ3MucmVzcCx0aGlzLl9yZXNwb25zZUFyZ3MubXNnLHRoaXMuX3Jlc3BvbnNlQXJncy50KTp0aGlzLl9lcnJvckhhbmRsZXJzLnB1c2goZSksdGhpc30sXCJjYXRjaFwiOmZ1bmN0aW9uKGUpe3JldHVybiB0aGlzLmZhaWwoZSl9fSxyZXF3ZXN0LnNlcmlhbGl6ZUFycmF5PWZ1bmN0aW9uKCl7dmFyIGU9W107cmV0dXJuIGVhY2hGb3JtRWxlbWVudC5hcHBseShmdW5jdGlvbih0LG4pe2UucHVzaCh7bmFtZTp0LHZhbHVlOm59KX0sYXJndW1lbnRzKSxlfSxyZXF3ZXN0LnNlcmlhbGl6ZT1mdW5jdGlvbigpe2lmKGFyZ3VtZW50cy5sZW5ndGg9PT0wKXJldHVyblwiXCI7dmFyIGUsdCxuPUFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywwKTtyZXR1cm4gZT1uLnBvcCgpLGUmJmUubm9kZVR5cGUmJm4ucHVzaChlKSYmKGU9bnVsbCksZSYmKGU9ZS50eXBlKSxlPT1cIm1hcFwiP3Q9c2VyaWFsaXplSGFzaDplPT1cImFycmF5XCI/dD1yZXF3ZXN0LnNlcmlhbGl6ZUFycmF5OnQ9c2VyaWFsaXplUXVlcnlTdHJpbmcsdC5hcHBseShudWxsLG4pfSxyZXF3ZXN0LnRvUXVlcnlTdHJpbmc9ZnVuY3Rpb24oZSx0KXt2YXIgbixyLGk9dHx8ITEscz1bXSxvPWVuY29kZVVSSUNvbXBvbmVudCx1PWZ1bmN0aW9uKGUsdCl7dD1cImZ1bmN0aW9uXCI9PXR5cGVvZiB0P3QoKTp0PT1udWxsP1wiXCI6dCxzW3MubGVuZ3RoXT1vKGUpK1wiPVwiK28odCl9O2lmKGlzQXJyYXkoZSkpZm9yKHI9MDtlJiZyPGUubGVuZ3RoO3IrKyl1KGVbcl0ubmFtZSxlW3JdLnZhbHVlKTtlbHNlIGZvcihuIGluIGUpZS5oYXNPd25Qcm9wZXJ0eShuKSYmYnVpbGRQYXJhbXMobixlW25dLGksdSk7cmV0dXJuIHMuam9pbihcIiZcIikucmVwbGFjZSgvJTIwL2csXCIrXCIpfSxyZXF3ZXN0LmdldGNhbGxiYWNrUHJlZml4PWZ1bmN0aW9uKCl7cmV0dXJuIGNhbGxiYWNrUHJlZml4fSxyZXF3ZXN0LmNvbXBhdD1mdW5jdGlvbihlLHQpe3JldHVybiBlJiYoZS50eXBlJiYoZS5tZXRob2Q9ZS50eXBlKSYmZGVsZXRlIGUudHlwZSxlLmRhdGFUeXBlJiYoZS50eXBlPWUuZGF0YVR5cGUpLGUuanNvbnBDYWxsYmFjayYmKGUuanNvbnBDYWxsYmFja05hbWU9ZS5qc29ucENhbGxiYWNrKSYmZGVsZXRlIGUuanNvbnBDYWxsYmFjayxlLmpzb25wJiYoZS5qc29ucENhbGxiYWNrPWUuanNvbnApKSxuZXcgUmVxd2VzdChlLHQpfSxyZXF3ZXN0LmFqYXhTZXR1cD1mdW5jdGlvbihlKXtlPWV8fHt9O2Zvcih2YXIgdCBpbiBlKWdsb2JhbFNldHVwT3B0aW9uc1t0XT1lW3RdfSxyZXF3ZXN0fSkiLCIvKiFcbiAgKiBSZXF3ZXN0ISBBIGdlbmVyYWwgcHVycG9zZSBYSFIgY29ubmVjdGlvbiBtYW5hZ2VyXG4gICogbGljZW5zZSBNSVQgKGMpIER1c3RpbiBEaWF6IDIwMTRcbiAgKiBodHRwczovL2dpdGh1Yi5jb20vZGVkL3JlcXdlc3RcbiAgKi9cblxuIWZ1bmN0aW9uIChuYW1lLCBjb250ZXh0LCBkZWZpbml0aW9uKSB7XG4gIGlmICh0eXBlb2YgbW9kdWxlICE9ICd1bmRlZmluZWQnICYmIG1vZHVsZS5leHBvcnRzKSBtb2R1bGUuZXhwb3J0cyA9IGRlZmluaXRpb24oKVxuICBlbHNlIGlmICh0eXBlb2YgZGVmaW5lID09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkgZGVmaW5lKGRlZmluaXRpb24pXG4gIGVsc2UgY29udGV4dFtuYW1lXSA9IGRlZmluaXRpb24oKVxufSgncmVxd2VzdCcsIHRoaXMsIGZ1bmN0aW9uICgpIHtcblxuICB2YXIgd2luID0gd2luZG93XG4gICAgLCBkb2MgPSBkb2N1bWVudFxuICAgICwgaHR0cHNSZSA9IC9eaHR0cC9cbiAgICAsIHByb3RvY29sUmUgPSAvKF5cXHcrKTpcXC9cXC8vXG4gICAgLCB0d29IdW5kbyA9IC9eKDIwXFxkfDEyMjMpJC8gLy9odHRwOi8vc3RhY2tvdmVyZmxvdy5jb20vcXVlc3Rpb25zLzEwMDQ2OTcyL21zaWUtcmV0dXJucy1zdGF0dXMtY29kZS1vZi0xMjIzLWZvci1hamF4LXJlcXVlc3RcbiAgICAsIGJ5VGFnID0gJ2dldEVsZW1lbnRzQnlUYWdOYW1lJ1xuICAgICwgcmVhZHlTdGF0ZSA9ICdyZWFkeVN0YXRlJ1xuICAgICwgY29udGVudFR5cGUgPSAnQ29udGVudC1UeXBlJ1xuICAgICwgcmVxdWVzdGVkV2l0aCA9ICdYLVJlcXVlc3RlZC1XaXRoJ1xuICAgICwgaGVhZCA9IGRvY1tieVRhZ10oJ2hlYWQnKVswXVxuICAgICwgdW5pcWlkID0gMFxuICAgICwgY2FsbGJhY2tQcmVmaXggPSAncmVxd2VzdF8nICsgKCtuZXcgRGF0ZSgpKVxuICAgICwgbGFzdFZhbHVlIC8vIGRhdGEgc3RvcmVkIGJ5IHRoZSBtb3N0IHJlY2VudCBKU09OUCBjYWxsYmFja1xuICAgICwgeG1sSHR0cFJlcXVlc3QgPSAnWE1MSHR0cFJlcXVlc3QnXG4gICAgLCB4RG9tYWluUmVxdWVzdCA9ICdYRG9tYWluUmVxdWVzdCdcbiAgICAsIG5vb3AgPSBmdW5jdGlvbiAoKSB7fVxuXG4gICAgLCBpc0FycmF5ID0gdHlwZW9mIEFycmF5LmlzQXJyYXkgPT0gJ2Z1bmN0aW9uJ1xuICAgICAgICA/IEFycmF5LmlzQXJyYXlcbiAgICAgICAgOiBmdW5jdGlvbiAoYSkge1xuICAgICAgICAgICAgcmV0dXJuIGEgaW5zdGFuY2VvZiBBcnJheVxuICAgICAgICAgIH1cblxuICAgICwgZGVmYXVsdEhlYWRlcnMgPSB7XG4gICAgICAgICAgJ2NvbnRlbnRUeXBlJzogJ2FwcGxpY2F0aW9uL3gtd3d3LWZvcm0tdXJsZW5jb2RlZCdcbiAgICAgICAgLCAncmVxdWVzdGVkV2l0aCc6IHhtbEh0dHBSZXF1ZXN0XG4gICAgICAgICwgJ2FjY2VwdCc6IHtcbiAgICAgICAgICAgICAgJyonOiAgJ3RleHQvamF2YXNjcmlwdCwgdGV4dC9odG1sLCBhcHBsaWNhdGlvbi94bWwsIHRleHQveG1sLCAqLyonXG4gICAgICAgICAgICAsICd4bWwnOiAgJ2FwcGxpY2F0aW9uL3htbCwgdGV4dC94bWwnXG4gICAgICAgICAgICAsICdodG1sJzogJ3RleHQvaHRtbCdcbiAgICAgICAgICAgICwgJ3RleHQnOiAndGV4dC9wbGFpbidcbiAgICAgICAgICAgICwgJ2pzb24nOiAnYXBwbGljYXRpb24vanNvbiwgdGV4dC9qYXZhc2NyaXB0J1xuICAgICAgICAgICAgLCAnanMnOiAgICdhcHBsaWNhdGlvbi9qYXZhc2NyaXB0LCB0ZXh0L2phdmFzY3JpcHQnXG4gICAgICAgICAgfVxuICAgICAgfVxuXG4gICAgLCB4aHIgPSBmdW5jdGlvbihvKSB7XG4gICAgICAgIC8vIGlzIGl0IHgtZG9tYWluXG4gICAgICAgIGlmIChvWydjcm9zc09yaWdpbiddID09PSB0cnVlKSB7XG4gICAgICAgICAgdmFyIHhociA9IHdpblt4bWxIdHRwUmVxdWVzdF0gPyBuZXcgWE1MSHR0cFJlcXVlc3QoKSA6IG51bGxcbiAgICAgICAgICBpZiAoeGhyICYmICd3aXRoQ3JlZGVudGlhbHMnIGluIHhocikge1xuICAgICAgICAgICAgcmV0dXJuIHhoclxuICAgICAgICAgIH0gZWxzZSBpZiAod2luW3hEb21haW5SZXF1ZXN0XSkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBYRG9tYWluUmVxdWVzdCgpXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcignQnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGNyb3NzLW9yaWdpbiByZXF1ZXN0cycpXG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2UgaWYgKHdpblt4bWxIdHRwUmVxdWVzdF0pIHtcbiAgICAgICAgICByZXR1cm4gbmV3IFhNTEh0dHBSZXF1ZXN0KClcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICByZXR1cm4gbmV3IEFjdGl2ZVhPYmplY3QoJ01pY3Jvc29mdC5YTUxIVFRQJylcbiAgICAgICAgfVxuICAgICAgfVxuICAgICwgZ2xvYmFsU2V0dXBPcHRpb25zID0ge1xuICAgICAgICBkYXRhRmlsdGVyOiBmdW5jdGlvbiAoZGF0YSkge1xuICAgICAgICAgIHJldHVybiBkYXRhXG4gICAgICAgIH1cbiAgICAgIH1cblxuICBmdW5jdGlvbiBzdWNjZWVkKHIpIHtcbiAgICB2YXIgcHJvdG9jb2wgPSBwcm90b2NvbFJlLmV4ZWMoci51cmwpO1xuICAgIHByb3RvY29sID0gKHByb3RvY29sICYmIHByb3RvY29sWzFdKSB8fCB3aW5kb3cubG9jYXRpb24ucHJvdG9jb2w7XG4gICAgcmV0dXJuIGh0dHBzUmUudGVzdChwcm90b2NvbCkgPyB0d29IdW5kby50ZXN0KHIucmVxdWVzdC5zdGF0dXMpIDogISFyLnJlcXVlc3QucmVzcG9uc2U7XG4gIH1cblxuICBmdW5jdGlvbiBoYW5kbGVSZWFkeVN0YXRlKHIsIHN1Y2Nlc3MsIGVycm9yKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uICgpIHtcbiAgICAgIC8vIHVzZSBfYWJvcnRlZCB0byBtaXRpZ2F0ZSBhZ2FpbnN0IElFIGVyciBjMDBjMDIzZlxuICAgICAgLy8gKGNhbid0IHJlYWQgcHJvcHMgb24gYWJvcnRlZCByZXF1ZXN0IG9iamVjdHMpXG4gICAgICBpZiAoci5fYWJvcnRlZCkgcmV0dXJuIGVycm9yKHIucmVxdWVzdClcbiAgICAgIGlmIChyLl90aW1lZE91dCkgcmV0dXJuIGVycm9yKHIucmVxdWVzdCwgJ1JlcXVlc3QgaXMgYWJvcnRlZDogdGltZW91dCcpXG4gICAgICBpZiAoci5yZXF1ZXN0ICYmIHIucmVxdWVzdFtyZWFkeVN0YXRlXSA9PSA0KSB7XG4gICAgICAgIHIucmVxdWVzdC5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBub29wXG4gICAgICAgIGlmIChzdWNjZWVkKHIpKSBzdWNjZXNzKHIucmVxdWVzdClcbiAgICAgICAgZWxzZVxuICAgICAgICAgIGVycm9yKHIucmVxdWVzdClcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBzZXRIZWFkZXJzKGh0dHAsIG8pIHtcbiAgICB2YXIgaGVhZGVycyA9IG9bJ2hlYWRlcnMnXSB8fCB7fVxuICAgICAgLCBoXG5cbiAgICBoZWFkZXJzWydBY2NlcHQnXSA9IGhlYWRlcnNbJ0FjY2VwdCddXG4gICAgICB8fCBkZWZhdWx0SGVhZGVyc1snYWNjZXB0J11bb1sndHlwZSddXVxuICAgICAgfHwgZGVmYXVsdEhlYWRlcnNbJ2FjY2VwdCddWycqJ11cblxuICAgIHZhciBpc0FGb3JtRGF0YSA9IHR5cGVvZiBGb3JtRGF0YSA9PT0gJ2Z1bmN0aW9uJyAmJiAob1snZGF0YSddIGluc3RhbmNlb2YgRm9ybURhdGEpO1xuICAgIC8vIGJyZWFrcyBjcm9zcy1vcmlnaW4gcmVxdWVzdHMgd2l0aCBsZWdhY3kgYnJvd3NlcnNcbiAgICBpZiAoIW9bJ2Nyb3NzT3JpZ2luJ10gJiYgIWhlYWRlcnNbcmVxdWVzdGVkV2l0aF0pIGhlYWRlcnNbcmVxdWVzdGVkV2l0aF0gPSBkZWZhdWx0SGVhZGVyc1sncmVxdWVzdGVkV2l0aCddXG4gICAgaWYgKCFoZWFkZXJzW2NvbnRlbnRUeXBlXSAmJiAhaXNBRm9ybURhdGEpIGhlYWRlcnNbY29udGVudFR5cGVdID0gb1snY29udGVudFR5cGUnXSB8fCBkZWZhdWx0SGVhZGVyc1snY29udGVudFR5cGUnXVxuICAgIGZvciAoaCBpbiBoZWFkZXJzKVxuICAgICAgaGVhZGVycy5oYXNPd25Qcm9wZXJ0eShoKSAmJiAnc2V0UmVxdWVzdEhlYWRlcicgaW4gaHR0cCAmJiBodHRwLnNldFJlcXVlc3RIZWFkZXIoaCwgaGVhZGVyc1toXSlcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldENyZWRlbnRpYWxzKGh0dHAsIG8pIHtcbiAgICBpZiAodHlwZW9mIG9bJ3dpdGhDcmVkZW50aWFscyddICE9PSAndW5kZWZpbmVkJyAmJiB0eXBlb2YgaHR0cC53aXRoQ3JlZGVudGlhbHMgIT09ICd1bmRlZmluZWQnKSB7XG4gICAgICBodHRwLndpdGhDcmVkZW50aWFscyA9ICEhb1snd2l0aENyZWRlbnRpYWxzJ11cbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiBnZW5lcmFsQ2FsbGJhY2soZGF0YSkge1xuICAgIGxhc3RWYWx1ZSA9IGRhdGFcbiAgfVxuXG4gIGZ1bmN0aW9uIHVybGFwcGVuZCAodXJsLCBzKSB7XG4gICAgcmV0dXJuIHVybCArICgvXFw/Ly50ZXN0KHVybCkgPyAnJicgOiAnPycpICsgc1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlSnNvbnAobywgZm4sIGVyciwgdXJsKSB7XG4gICAgdmFyIHJlcUlkID0gdW5pcWlkKytcbiAgICAgICwgY2JrZXkgPSBvWydqc29ucENhbGxiYWNrJ10gfHwgJ2NhbGxiYWNrJyAvLyB0aGUgJ2NhbGxiYWNrJyBrZXlcbiAgICAgICwgY2J2YWwgPSBvWydqc29ucENhbGxiYWNrTmFtZSddIHx8IHJlcXdlc3QuZ2V0Y2FsbGJhY2tQcmVmaXgocmVxSWQpXG4gICAgICAsIGNicmVnID0gbmV3IFJlZ0V4cCgnKChefFxcXFw/fCYpJyArIGNia2V5ICsgJyk9KFteJl0rKScpXG4gICAgICAsIG1hdGNoID0gdXJsLm1hdGNoKGNicmVnKVxuICAgICAgLCBzY3JpcHQgPSBkb2MuY3JlYXRlRWxlbWVudCgnc2NyaXB0JylcbiAgICAgICwgbG9hZGVkID0gMFxuICAgICAgLCBpc0lFMTAgPSBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoJ01TSUUgMTAuMCcpICE9PSAtMVxuXG4gICAgaWYgKG1hdGNoKSB7XG4gICAgICBpZiAobWF0Y2hbM10gPT09ICc/Jykge1xuICAgICAgICB1cmwgPSB1cmwucmVwbGFjZShjYnJlZywgJyQxPScgKyBjYnZhbCkgLy8gd2lsZGNhcmQgY2FsbGJhY2sgZnVuYyBuYW1lXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjYnZhbCA9IG1hdGNoWzNdIC8vIHByb3ZpZGVkIGNhbGxiYWNrIGZ1bmMgbmFtZVxuICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICB1cmwgPSB1cmxhcHBlbmQodXJsLCBjYmtleSArICc9JyArIGNidmFsKSAvLyBubyBjYWxsYmFjayBkZXRhaWxzLCBhZGQgJ2VtXG4gICAgfVxuXG4gICAgd2luW2NidmFsXSA9IGdlbmVyYWxDYWxsYmFja1xuXG4gICAgc2NyaXB0LnR5cGUgPSAndGV4dC9qYXZhc2NyaXB0J1xuICAgIHNjcmlwdC5zcmMgPSB1cmxcbiAgICBzY3JpcHQuYXN5bmMgPSB0cnVlXG4gICAgaWYgKHR5cGVvZiBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlICE9PSAndW5kZWZpbmVkJyAmJiAhaXNJRTEwKSB7XG4gICAgICAvLyBuZWVkIHRoaXMgZm9yIElFIGR1ZSB0byBvdXQtb2Ytb3JkZXIgb25yZWFkeXN0YXRlY2hhbmdlKCksIGJpbmRpbmcgc2NyaXB0XG4gICAgICAvLyBleGVjdXRpb24gdG8gYW4gZXZlbnQgbGlzdGVuZXIgZ2l2ZXMgdXMgY29udHJvbCBvdmVyIHdoZW4gdGhlIHNjcmlwdFxuICAgICAgLy8gaXMgZXhlY3V0ZWQuIFNlZSBodHRwOi8vamF1Ym91cmcubmV0LzIwMTAvMDcvbG9hZGluZy1zY3JpcHQtYXMtb25jbGljay1oYW5kbGVyLW9mLmh0bWxcbiAgICAgIHNjcmlwdC5odG1sRm9yID0gc2NyaXB0LmlkID0gJ19yZXF3ZXN0XycgKyByZXFJZFxuICAgIH1cblxuICAgIHNjcmlwdC5vbmxvYWQgPSBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgaWYgKChzY3JpcHRbcmVhZHlTdGF0ZV0gJiYgc2NyaXB0W3JlYWR5U3RhdGVdICE9PSAnY29tcGxldGUnICYmIHNjcmlwdFtyZWFkeVN0YXRlXSAhPT0gJ2xvYWRlZCcpIHx8IGxvYWRlZCkge1xuICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgIH1cbiAgICAgIHNjcmlwdC5vbmxvYWQgPSBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gbnVsbFxuICAgICAgc2NyaXB0Lm9uY2xpY2sgJiYgc2NyaXB0Lm9uY2xpY2soKVxuICAgICAgLy8gQ2FsbCB0aGUgdXNlciBjYWxsYmFjayB3aXRoIHRoZSBsYXN0IHZhbHVlIHN0b3JlZCBhbmQgY2xlYW4gdXAgdmFsdWVzIGFuZCBzY3JpcHRzLlxuICAgICAgZm4obGFzdFZhbHVlKVxuICAgICAgbGFzdFZhbHVlID0gdW5kZWZpbmVkXG4gICAgICBoZWFkLnJlbW92ZUNoaWxkKHNjcmlwdClcbiAgICAgIGxvYWRlZCA9IDFcbiAgICB9XG5cbiAgICAvLyBBZGQgdGhlIHNjcmlwdCB0byB0aGUgRE9NIGhlYWRcbiAgICBoZWFkLmFwcGVuZENoaWxkKHNjcmlwdClcblxuICAgIC8vIEVuYWJsZSBKU09OUCB0aW1lb3V0XG4gICAgcmV0dXJuIHtcbiAgICAgIGFib3J0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHNjcmlwdC5vbmxvYWQgPSBzY3JpcHQub25yZWFkeXN0YXRlY2hhbmdlID0gbnVsbFxuICAgICAgICBlcnIoe30sICdSZXF1ZXN0IGlzIGFib3J0ZWQ6IHRpbWVvdXQnLCB7fSlcbiAgICAgICAgbGFzdFZhbHVlID0gdW5kZWZpbmVkXG4gICAgICAgIGhlYWQucmVtb3ZlQ2hpbGQoc2NyaXB0KVxuICAgICAgICBsb2FkZWQgPSAxXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2V0UmVxdWVzdChmbiwgZXJyKSB7XG4gICAgdmFyIG8gPSB0aGlzLm9cbiAgICAgICwgbWV0aG9kID0gKG9bJ21ldGhvZCddIHx8ICdHRVQnKS50b1VwcGVyQ2FzZSgpXG4gICAgICAsIHVybCA9IHR5cGVvZiBvID09PSAnc3RyaW5nJyA/IG8gOiBvWyd1cmwnXVxuICAgICAgLy8gY29udmVydCBub24tc3RyaW5nIG9iamVjdHMgdG8gcXVlcnktc3RyaW5nIGZvcm0gdW5sZXNzIG9bJ3Byb2Nlc3NEYXRhJ10gaXMgZmFsc2VcbiAgICAgICwgZGF0YSA9IChvWydwcm9jZXNzRGF0YSddICE9PSBmYWxzZSAmJiBvWydkYXRhJ10gJiYgdHlwZW9mIG9bJ2RhdGEnXSAhPT0gJ3N0cmluZycpXG4gICAgICAgID8gcmVxd2VzdC50b1F1ZXJ5U3RyaW5nKG9bJ2RhdGEnXSlcbiAgICAgICAgOiAob1snZGF0YSddIHx8IG51bGwpXG4gICAgICAsIGh0dHBcbiAgICAgICwgc2VuZFdhaXQgPSBmYWxzZVxuXG4gICAgLy8gaWYgd2UncmUgd29ya2luZyBvbiBhIEdFVCByZXF1ZXN0IGFuZCB3ZSBoYXZlIGRhdGEgdGhlbiB3ZSBzaG91bGQgYXBwZW5kXG4gICAgLy8gcXVlcnkgc3RyaW5nIHRvIGVuZCBvZiBVUkwgYW5kIG5vdCBwb3N0IGRhdGFcbiAgICBpZiAoKG9bJ3R5cGUnXSA9PSAnanNvbnAnIHx8IG1ldGhvZCA9PSAnR0VUJykgJiYgZGF0YSkge1xuICAgICAgdXJsID0gdXJsYXBwZW5kKHVybCwgZGF0YSlcbiAgICAgIGRhdGEgPSBudWxsXG4gICAgfVxuXG4gICAgaWYgKG9bJ3R5cGUnXSA9PSAnanNvbnAnKSByZXR1cm4gaGFuZGxlSnNvbnAobywgZm4sIGVyciwgdXJsKVxuXG4gICAgLy8gZ2V0IHRoZSB4aHIgZnJvbSB0aGUgZmFjdG9yeSBpZiBwYXNzZWRcbiAgICAvLyBpZiB0aGUgZmFjdG9yeSByZXR1cm5zIG51bGwsIGZhbGwtYmFjayB0byBvdXJzXG4gICAgaHR0cCA9IChvLnhociAmJiBvLnhocihvKSkgfHwgeGhyKG8pXG5cbiAgICBodHRwLm9wZW4obWV0aG9kLCB1cmwsIG9bJ2FzeW5jJ10gPT09IGZhbHNlID8gZmFsc2UgOiB0cnVlKVxuICAgIHNldEhlYWRlcnMoaHR0cCwgbylcbiAgICBzZXRDcmVkZW50aWFscyhodHRwLCBvKVxuICAgIGlmICh3aW5beERvbWFpblJlcXVlc3RdICYmIGh0dHAgaW5zdGFuY2VvZiB3aW5beERvbWFpblJlcXVlc3RdKSB7XG4gICAgICAgIGh0dHAub25sb2FkID0gZm5cbiAgICAgICAgaHR0cC5vbmVycm9yID0gZXJyXG4gICAgICAgIC8vIE5PVEU6IHNlZVxuICAgICAgICAvLyBodHRwOi8vc29jaWFsLm1zZG4ubWljcm9zb2Z0LmNvbS9Gb3J1bXMvZW4tVVMvaWV3ZWJkZXZlbG9wbWVudC90aHJlYWQvMzBlZjNhZGQtNzY3Yy00NDM2LWI4YTktZjFjYTE5YjQ4MTJlXG4gICAgICAgIGh0dHAub25wcm9ncmVzcyA9IGZ1bmN0aW9uKCkge31cbiAgICAgICAgc2VuZFdhaXQgPSB0cnVlXG4gICAgfSBlbHNlIHtcbiAgICAgIGh0dHAub25yZWFkeXN0YXRlY2hhbmdlID0gaGFuZGxlUmVhZHlTdGF0ZSh0aGlzLCBmbiwgZXJyKVxuICAgIH1cbiAgICBvWydiZWZvcmUnXSAmJiBvWydiZWZvcmUnXShodHRwKVxuICAgIGlmIChzZW5kV2FpdCkge1xuICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIGh0dHAuc2VuZChkYXRhKVxuICAgICAgfSwgMjAwKVxuICAgIH0gZWxzZSB7XG4gICAgICBodHRwLnNlbmQoZGF0YSlcbiAgICB9XG4gICAgcmV0dXJuIGh0dHBcbiAgfVxuXG4gIGZ1bmN0aW9uIFJlcXdlc3QobywgZm4pIHtcbiAgICB0aGlzLm8gPSBvXG4gICAgdGhpcy5mbiA9IGZuXG5cbiAgICBpbml0LmFwcGx5KHRoaXMsIGFyZ3VtZW50cylcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFR5cGUoaGVhZGVyKSB7XG4gICAgLy8ganNvbiwgamF2YXNjcmlwdCwgdGV4dC9wbGFpbiwgdGV4dC9odG1sLCB4bWxcbiAgICBpZiAoaGVhZGVyLm1hdGNoKCdqc29uJykpIHJldHVybiAnanNvbidcbiAgICBpZiAoaGVhZGVyLm1hdGNoKCdqYXZhc2NyaXB0JykpIHJldHVybiAnanMnXG4gICAgaWYgKGhlYWRlci5tYXRjaCgndGV4dCcpKSByZXR1cm4gJ2h0bWwnXG4gICAgaWYgKGhlYWRlci5tYXRjaCgneG1sJykpIHJldHVybiAneG1sJ1xuICB9XG5cbiAgZnVuY3Rpb24gaW5pdChvLCBmbikge1xuXG4gICAgdGhpcy51cmwgPSB0eXBlb2YgbyA9PSAnc3RyaW5nJyA/IG8gOiBvWyd1cmwnXVxuICAgIHRoaXMudGltZW91dCA9IG51bGxcblxuICAgIC8vIHdoZXRoZXIgcmVxdWVzdCBoYXMgYmVlbiBmdWxmaWxsZWQgZm9yIHB1cnBvc2VcbiAgICAvLyBvZiB0cmFja2luZyB0aGUgUHJvbWlzZXNcbiAgICB0aGlzLl9mdWxmaWxsZWQgPSBmYWxzZVxuICAgIC8vIHN1Y2Nlc3MgaGFuZGxlcnNcbiAgICB0aGlzLl9zdWNjZXNzSGFuZGxlciA9IGZ1bmN0aW9uKCl7fVxuICAgIHRoaXMuX2Z1bGZpbGxtZW50SGFuZGxlcnMgPSBbXVxuICAgIC8vIGVycm9yIGhhbmRsZXJzXG4gICAgdGhpcy5fZXJyb3JIYW5kbGVycyA9IFtdXG4gICAgLy8gY29tcGxldGUgKGJvdGggc3VjY2VzcyBhbmQgZmFpbCkgaGFuZGxlcnNcbiAgICB0aGlzLl9jb21wbGV0ZUhhbmRsZXJzID0gW11cbiAgICB0aGlzLl9lcnJlZCA9IGZhbHNlXG4gICAgdGhpcy5fcmVzcG9uc2VBcmdzID0ge31cblxuICAgIHZhciBzZWxmID0gdGhpc1xuXG4gICAgZm4gPSBmbiB8fCBmdW5jdGlvbiAoKSB7fVxuXG4gICAgaWYgKG9bJ3RpbWVvdXQnXSkge1xuICAgICAgdGhpcy50aW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRpbWVkT3V0KClcbiAgICAgIH0sIG9bJ3RpbWVvdXQnXSlcbiAgICB9XG5cbiAgICBpZiAob1snc3VjY2VzcyddKSB7XG4gICAgICB0aGlzLl9zdWNjZXNzSGFuZGxlciA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb1snc3VjY2VzcyddLmFwcGx5KG8sIGFyZ3VtZW50cylcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAob1snZXJyb3InXSkge1xuICAgICAgdGhpcy5fZXJyb3JIYW5kbGVycy5wdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb1snZXJyb3InXS5hcHBseShvLCBhcmd1bWVudHMpXG4gICAgICB9KVxuICAgIH1cblxuICAgIGlmIChvWydjb21wbGV0ZSddKSB7XG4gICAgICB0aGlzLl9jb21wbGV0ZUhhbmRsZXJzLnB1c2goZnVuY3Rpb24gKCkge1xuICAgICAgICBvWydjb21wbGV0ZSddLmFwcGx5KG8sIGFyZ3VtZW50cylcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY29tcGxldGUgKHJlc3ApIHtcbiAgICAgIG9bJ3RpbWVvdXQnXSAmJiBjbGVhclRpbWVvdXQoc2VsZi50aW1lb3V0KVxuICAgICAgc2VsZi50aW1lb3V0ID0gbnVsbFxuICAgICAgd2hpbGUgKHNlbGYuX2NvbXBsZXRlSGFuZGxlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICBzZWxmLl9jb21wbGV0ZUhhbmRsZXJzLnNoaWZ0KCkocmVzcClcbiAgICAgIH1cbiAgICB9XG5cbiAgICBmdW5jdGlvbiBzdWNjZXNzIChyZXNwKSB7XG4gICAgICB2YXIgdHlwZSA9IG9bJ3R5cGUnXSB8fCByZXNwICYmIHNldFR5cGUocmVzcC5nZXRSZXNwb25zZUhlYWRlcignQ29udGVudC1UeXBlJykpIC8vIHJlc3AgY2FuIGJlIHVuZGVmaW5lZCBpbiBJRVxuICAgICAgcmVzcCA9ICh0eXBlICE9PSAnanNvbnAnKSA/IHNlbGYucmVxdWVzdCA6IHJlc3BcbiAgICAgIC8vIHVzZSBnbG9iYWwgZGF0YSBmaWx0ZXIgb24gcmVzcG9uc2UgdGV4dFxuICAgICAgdmFyIGZpbHRlcmVkUmVzcG9uc2UgPSBnbG9iYWxTZXR1cE9wdGlvbnMuZGF0YUZpbHRlcihyZXNwLnJlc3BvbnNlVGV4dCwgdHlwZSlcbiAgICAgICAgLCByID0gZmlsdGVyZWRSZXNwb25zZVxuICAgICAgdHJ5IHtcbiAgICAgICAgcmVzcC5yZXNwb25zZVRleHQgPSByXG4gICAgICB9IGNhdGNoIChlKSB7XG4gICAgICAgIC8vIGNhbid0IGFzc2lnbiB0aGlzIGluIElFPD04LCBqdXN0IGlnbm9yZVxuICAgICAgfVxuICAgICAgaWYgKHIpIHtcbiAgICAgICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICAgIGNhc2UgJ2pzb24nOlxuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICByZXNwID0gd2luLkpTT04gPyB3aW4uSlNPTi5wYXJzZShyKSA6IGV2YWwoJygnICsgciArICcpJylcbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvcihyZXNwLCAnQ291bGQgbm90IHBhcnNlIEpTT04gaW4gcmVzcG9uc2UnLCBlcnIpXG4gICAgICAgICAgfVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ2pzJzpcbiAgICAgICAgICByZXNwID0gZXZhbChyKVxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ2h0bWwnOlxuICAgICAgICAgIHJlc3AgPSByXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgY2FzZSAneG1sJzpcbiAgICAgICAgICByZXNwID0gcmVzcC5yZXNwb25zZVhNTFxuICAgICAgICAgICAgICAmJiByZXNwLnJlc3BvbnNlWE1MLnBhcnNlRXJyb3IgLy8gSUUgdHJvbG9sb1xuICAgICAgICAgICAgICAmJiByZXNwLnJlc3BvbnNlWE1MLnBhcnNlRXJyb3IuZXJyb3JDb2RlXG4gICAgICAgICAgICAgICYmIHJlc3AucmVzcG9uc2VYTUwucGFyc2VFcnJvci5yZWFzb25cbiAgICAgICAgICAgID8gbnVsbFxuICAgICAgICAgICAgOiByZXNwLnJlc3BvbnNlWE1MXG4gICAgICAgICAgYnJlYWtcbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICBzZWxmLl9yZXNwb25zZUFyZ3MucmVzcCA9IHJlc3BcbiAgICAgIHNlbGYuX2Z1bGZpbGxlZCA9IHRydWVcbiAgICAgIGZuKHJlc3ApXG4gICAgICBzZWxmLl9zdWNjZXNzSGFuZGxlcihyZXNwKVxuICAgICAgd2hpbGUgKHNlbGYuX2Z1bGZpbGxtZW50SGFuZGxlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICByZXNwID0gc2VsZi5fZnVsZmlsbG1lbnRIYW5kbGVycy5zaGlmdCgpKHJlc3ApXG4gICAgICB9XG5cbiAgICAgIGNvbXBsZXRlKHJlc3ApXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gdGltZWRPdXQoKSB7XG4gICAgICBzZWxmLl90aW1lZE91dCA9IHRydWVcbiAgICAgIHNlbGYucmVxdWVzdC5hYm9ydCgpICAgICAgXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gZXJyb3IocmVzcCwgbXNnLCB0KSB7XG4gICAgICByZXNwID0gc2VsZi5yZXF1ZXN0XG4gICAgICBzZWxmLl9yZXNwb25zZUFyZ3MucmVzcCA9IHJlc3BcbiAgICAgIHNlbGYuX3Jlc3BvbnNlQXJncy5tc2cgPSBtc2dcbiAgICAgIHNlbGYuX3Jlc3BvbnNlQXJncy50ID0gdFxuICAgICAgc2VsZi5fZXJyZWQgPSB0cnVlXG4gICAgICB3aGlsZSAoc2VsZi5fZXJyb3JIYW5kbGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHNlbGYuX2Vycm9ySGFuZGxlcnMuc2hpZnQoKShyZXNwLCBtc2csIHQpXG4gICAgICB9XG4gICAgICBjb21wbGV0ZShyZXNwKVxuICAgIH1cblxuICAgIHRoaXMucmVxdWVzdCA9IGdldFJlcXVlc3QuY2FsbCh0aGlzLCBzdWNjZXNzLCBlcnJvcilcbiAgfVxuXG4gIFJlcXdlc3QucHJvdG90eXBlID0ge1xuICAgIGFib3J0OiBmdW5jdGlvbiAoKSB7XG4gICAgICB0aGlzLl9hYm9ydGVkID0gdHJ1ZVxuICAgICAgdGhpcy5yZXF1ZXN0LmFib3J0KClcbiAgICB9XG5cbiAgLCByZXRyeTogZnVuY3Rpb24gKCkge1xuICAgICAgaW5pdC5jYWxsKHRoaXMsIHRoaXMubywgdGhpcy5mbilcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBTbWFsbCBkZXZpYXRpb24gZnJvbSB0aGUgUHJvbWlzZXMgQSBDb21tb25KcyBzcGVjaWZpY2F0aW9uXG4gICAgICogaHR0cDovL3dpa2kuY29tbW9uanMub3JnL3dpa2kvUHJvbWlzZXMvQVxuICAgICAqL1xuXG4gICAgLyoqXG4gICAgICogYHRoZW5gIHdpbGwgZXhlY3V0ZSB1cG9uIHN1Y2Nlc3NmdWwgcmVxdWVzdHNcbiAgICAgKi9cbiAgLCB0aGVuOiBmdW5jdGlvbiAoc3VjY2VzcywgZmFpbCkge1xuICAgICAgc3VjY2VzcyA9IHN1Y2Nlc3MgfHwgZnVuY3Rpb24gKCkge31cbiAgICAgIGZhaWwgPSBmYWlsIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgICBpZiAodGhpcy5fZnVsZmlsbGVkKSB7XG4gICAgICAgIHRoaXMuX3Jlc3BvbnNlQXJncy5yZXNwID0gc3VjY2Vzcyh0aGlzLl9yZXNwb25zZUFyZ3MucmVzcClcbiAgICAgIH0gZWxzZSBpZiAodGhpcy5fZXJyZWQpIHtcbiAgICAgICAgZmFpbCh0aGlzLl9yZXNwb25zZUFyZ3MucmVzcCwgdGhpcy5fcmVzcG9uc2VBcmdzLm1zZywgdGhpcy5fcmVzcG9uc2VBcmdzLnQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXJzLnB1c2goc3VjY2VzcylcbiAgICAgICAgdGhpcy5fZXJyb3JIYW5kbGVycy5wdXNoKGZhaWwpXG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGBhbHdheXNgIHdpbGwgZXhlY3V0ZSB3aGV0aGVyIHRoZSByZXF1ZXN0IHN1Y2NlZWRzIG9yIGZhaWxzXG4gICAgICovXG4gICwgYWx3YXlzOiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIGlmICh0aGlzLl9mdWxmaWxsZWQgfHwgdGhpcy5fZXJyZWQpIHtcbiAgICAgICAgZm4odGhpcy5fcmVzcG9uc2VBcmdzLnJlc3ApXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9jb21wbGV0ZUhhbmRsZXJzLnB1c2goZm4pXG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cblxuICAgIC8qKlxuICAgICAqIGBmYWlsYCB3aWxsIGV4ZWN1dGUgd2hlbiB0aGUgcmVxdWVzdCBmYWlsc1xuICAgICAqL1xuICAsIGZhaWw6IGZ1bmN0aW9uIChmbikge1xuICAgICAgaWYgKHRoaXMuX2VycmVkKSB7XG4gICAgICAgIGZuKHRoaXMuX3Jlc3BvbnNlQXJncy5yZXNwLCB0aGlzLl9yZXNwb25zZUFyZ3MubXNnLCB0aGlzLl9yZXNwb25zZUFyZ3MudClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHRoaXMuX2Vycm9ySGFuZGxlcnMucHVzaChmbilcbiAgICAgIH1cbiAgICAgIHJldHVybiB0aGlzXG4gICAgfVxuICAsICdjYXRjaCc6IGZ1bmN0aW9uIChmbikge1xuICAgICAgcmV0dXJuIHRoaXMuZmFpbChmbilcbiAgICB9XG4gIH1cblxuICBmdW5jdGlvbiByZXF3ZXN0KG8sIGZuKSB7XG4gICAgcmV0dXJuIG5ldyBSZXF3ZXN0KG8sIGZuKVxuICB9XG5cbiAgLy8gbm9ybWFsaXplIG5ld2xpbmUgdmFyaWFudHMgYWNjb3JkaW5nIHRvIHNwZWMgLT4gQ1JMRlxuICBmdW5jdGlvbiBub3JtYWxpemUocykge1xuICAgIHJldHVybiBzID8gcy5yZXBsYWNlKC9cXHI/XFxuL2csICdcXHJcXG4nKSA6ICcnXG4gIH1cblxuICBmdW5jdGlvbiBzZXJpYWwoZWwsIGNiKSB7XG4gICAgdmFyIG4gPSBlbC5uYW1lXG4gICAgICAsIHQgPSBlbC50YWdOYW1lLnRvTG93ZXJDYXNlKClcbiAgICAgICwgb3B0Q2IgPSBmdW5jdGlvbiAobykge1xuICAgICAgICAgIC8vIElFIGdpdmVzIHZhbHVlPVwiXCIgZXZlbiB3aGVyZSB0aGVyZSBpcyBubyB2YWx1ZSBhdHRyaWJ1dGVcbiAgICAgICAgICAvLyAnc3BlY2lmaWVkJyByZWY6IGh0dHA6Ly93d3cudzMub3JnL1RSL0RPTS1MZXZlbC0zLUNvcmUvY29yZS5odG1sI0lELTg2MjUyOTI3M1xuICAgICAgICAgIGlmIChvICYmICFvWydkaXNhYmxlZCddKVxuICAgICAgICAgICAgY2Iobiwgbm9ybWFsaXplKG9bJ2F0dHJpYnV0ZXMnXVsndmFsdWUnXSAmJiBvWydhdHRyaWJ1dGVzJ11bJ3ZhbHVlJ11bJ3NwZWNpZmllZCddID8gb1sndmFsdWUnXSA6IG9bJ3RleHQnXSkpXG4gICAgICAgIH1cbiAgICAgICwgY2gsIHJhLCB2YWwsIGlcblxuICAgIC8vIGRvbid0IHNlcmlhbGl6ZSBlbGVtZW50cyB0aGF0IGFyZSBkaXNhYmxlZCBvciB3aXRob3V0IGEgbmFtZVxuICAgIGlmIChlbC5kaXNhYmxlZCB8fCAhbikgcmV0dXJuXG5cbiAgICBzd2l0Y2ggKHQpIHtcbiAgICBjYXNlICdpbnB1dCc6XG4gICAgICBpZiAoIS9yZXNldHxidXR0b258aW1hZ2V8ZmlsZS9pLnRlc3QoZWwudHlwZSkpIHtcbiAgICAgICAgY2ggPSAvY2hlY2tib3gvaS50ZXN0KGVsLnR5cGUpXG4gICAgICAgIHJhID0gL3JhZGlvL2kudGVzdChlbC50eXBlKVxuICAgICAgICB2YWwgPSBlbC52YWx1ZVxuICAgICAgICAvLyBXZWJLaXQgZ2l2ZXMgdXMgXCJcIiBpbnN0ZWFkIG9mIFwib25cIiBpZiBhIGNoZWNrYm94IGhhcyBubyB2YWx1ZSwgc28gY29ycmVjdCBpdCBoZXJlXG4gICAgICAgIDsoIShjaCB8fCByYSkgfHwgZWwuY2hlY2tlZCkgJiYgY2Iobiwgbm9ybWFsaXplKGNoICYmIHZhbCA9PT0gJycgPyAnb24nIDogdmFsKSlcbiAgICAgIH1cbiAgICAgIGJyZWFrXG4gICAgY2FzZSAndGV4dGFyZWEnOlxuICAgICAgY2Iobiwgbm9ybWFsaXplKGVsLnZhbHVlKSlcbiAgICAgIGJyZWFrXG4gICAgY2FzZSAnc2VsZWN0JzpcbiAgICAgIGlmIChlbC50eXBlLnRvTG93ZXJDYXNlKCkgPT09ICdzZWxlY3Qtb25lJykge1xuICAgICAgICBvcHRDYihlbC5zZWxlY3RlZEluZGV4ID49IDAgPyBlbC5vcHRpb25zW2VsLnNlbGVjdGVkSW5kZXhdIDogbnVsbClcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGVsLmxlbmd0aCAmJiBpIDwgZWwubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICBlbC5vcHRpb25zW2ldLnNlbGVjdGVkICYmIG9wdENiKGVsLm9wdGlvbnNbaV0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIGJyZWFrXG4gICAgfVxuICB9XG5cbiAgLy8gY29sbGVjdCB1cCBhbGwgZm9ybSBlbGVtZW50cyBmb3VuZCBmcm9tIHRoZSBwYXNzZWQgYXJndW1lbnQgZWxlbWVudHMgYWxsXG4gIC8vIHRoZSB3YXkgZG93biB0byBjaGlsZCBlbGVtZW50czsgcGFzcyBhICc8Zm9ybT4nIG9yIGZvcm0gZmllbGRzLlxuICAvLyBjYWxsZWQgd2l0aCAndGhpcyc9Y2FsbGJhY2sgdG8gdXNlIGZvciBzZXJpYWwoKSBvbiBlYWNoIGVsZW1lbnRcbiAgZnVuY3Rpb24gZWFjaEZvcm1FbGVtZW50KCkge1xuICAgIHZhciBjYiA9IHRoaXNcbiAgICAgICwgZSwgaVxuICAgICAgLCBzZXJpYWxpemVTdWJ0YWdzID0gZnVuY3Rpb24gKGUsIHRhZ3MpIHtcbiAgICAgICAgICB2YXIgaSwgaiwgZmFcbiAgICAgICAgICBmb3IgKGkgPSAwOyBpIDwgdGFncy5sZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZmEgPSBlW2J5VGFnXSh0YWdzW2ldKVxuICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IGZhLmxlbmd0aDsgaisrKSBzZXJpYWwoZmFbal0sIGNiKVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgZm9yIChpID0gMDsgaSA8IGFyZ3VtZW50cy5sZW5ndGg7IGkrKykge1xuICAgICAgZSA9IGFyZ3VtZW50c1tpXVxuICAgICAgaWYgKC9pbnB1dHxzZWxlY3R8dGV4dGFyZWEvaS50ZXN0KGUudGFnTmFtZSkpIHNlcmlhbChlLCBjYilcbiAgICAgIHNlcmlhbGl6ZVN1YnRhZ3MoZSwgWyAnaW5wdXQnLCAnc2VsZWN0JywgJ3RleHRhcmVhJyBdKVxuICAgIH1cbiAgfVxuXG4gIC8vIHN0YW5kYXJkIHF1ZXJ5IHN0cmluZyBzdHlsZSBzZXJpYWxpemF0aW9uXG4gIGZ1bmN0aW9uIHNlcmlhbGl6ZVF1ZXJ5U3RyaW5nKCkge1xuICAgIHJldHVybiByZXF3ZXN0LnRvUXVlcnlTdHJpbmcocmVxd2VzdC5zZXJpYWxpemVBcnJheS5hcHBseShudWxsLCBhcmd1bWVudHMpKVxuICB9XG5cbiAgLy8geyAnbmFtZSc6ICd2YWx1ZScsIC4uLiB9IHN0eWxlIHNlcmlhbGl6YXRpb25cbiAgZnVuY3Rpb24gc2VyaWFsaXplSGFzaCgpIHtcbiAgICB2YXIgaGFzaCA9IHt9XG4gICAgZWFjaEZvcm1FbGVtZW50LmFwcGx5KGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuICAgICAgaWYgKG5hbWUgaW4gaGFzaCkge1xuICAgICAgICBoYXNoW25hbWVdICYmICFpc0FycmF5KGhhc2hbbmFtZV0pICYmIChoYXNoW25hbWVdID0gW2hhc2hbbmFtZV1dKVxuICAgICAgICBoYXNoW25hbWVdLnB1c2godmFsdWUpXG4gICAgICB9IGVsc2UgaGFzaFtuYW1lXSA9IHZhbHVlXG4gICAgfSwgYXJndW1lbnRzKVxuICAgIHJldHVybiBoYXNoXG4gIH1cblxuICAvLyBbIHsgbmFtZTogJ25hbWUnLCB2YWx1ZTogJ3ZhbHVlJyB9LCAuLi4gXSBzdHlsZSBzZXJpYWxpemF0aW9uXG4gIHJlcXdlc3Quc2VyaWFsaXplQXJyYXkgPSBmdW5jdGlvbiAoKSB7XG4gICAgdmFyIGFyciA9IFtdXG4gICAgZWFjaEZvcm1FbGVtZW50LmFwcGx5KGZ1bmN0aW9uIChuYW1lLCB2YWx1ZSkge1xuICAgICAgYXJyLnB1c2goe25hbWU6IG5hbWUsIHZhbHVlOiB2YWx1ZX0pXG4gICAgfSwgYXJndW1lbnRzKVxuICAgIHJldHVybiBhcnJcbiAgfVxuXG4gIHJlcXdlc3Quc2VyaWFsaXplID0gZnVuY3Rpb24gKCkge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gJydcbiAgICB2YXIgb3B0LCBmblxuICAgICAgLCBhcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAwKVxuXG4gICAgb3B0ID0gYXJncy5wb3AoKVxuICAgIG9wdCAmJiBvcHQubm9kZVR5cGUgJiYgYXJncy5wdXNoKG9wdCkgJiYgKG9wdCA9IG51bGwpXG4gICAgb3B0ICYmIChvcHQgPSBvcHQudHlwZSlcblxuICAgIGlmIChvcHQgPT0gJ21hcCcpIGZuID0gc2VyaWFsaXplSGFzaFxuICAgIGVsc2UgaWYgKG9wdCA9PSAnYXJyYXknKSBmbiA9IHJlcXdlc3Quc2VyaWFsaXplQXJyYXlcbiAgICBlbHNlIGZuID0gc2VyaWFsaXplUXVlcnlTdHJpbmdcblxuICAgIHJldHVybiBmbi5hcHBseShudWxsLCBhcmdzKVxuICB9XG5cbiAgcmVxd2VzdC50b1F1ZXJ5U3RyaW5nID0gZnVuY3Rpb24gKG8sIHRyYWQpIHtcbiAgICB2YXIgcHJlZml4LCBpXG4gICAgICAsIHRyYWRpdGlvbmFsID0gdHJhZCB8fCBmYWxzZVxuICAgICAgLCBzID0gW11cbiAgICAgICwgZW5jID0gZW5jb2RlVVJJQ29tcG9uZW50XG4gICAgICAsIGFkZCA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XG4gICAgICAgICAgLy8gSWYgdmFsdWUgaXMgYSBmdW5jdGlvbiwgaW52b2tlIGl0IGFuZCByZXR1cm4gaXRzIHZhbHVlXG4gICAgICAgICAgdmFsdWUgPSAoJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHZhbHVlKSA/IHZhbHVlKCkgOiAodmFsdWUgPT0gbnVsbCA/ICcnIDogdmFsdWUpXG4gICAgICAgICAgc1tzLmxlbmd0aF0gPSBlbmMoa2V5KSArICc9JyArIGVuYyh2YWx1ZSlcbiAgICAgICAgfVxuICAgIC8vIElmIGFuIGFycmF5IHdhcyBwYXNzZWQgaW4sIGFzc3VtZSB0aGF0IGl0IGlzIGFuIGFycmF5IG9mIGZvcm0gZWxlbWVudHMuXG4gICAgaWYgKGlzQXJyYXkobykpIHtcbiAgICAgIGZvciAoaSA9IDA7IG8gJiYgaSA8IG8ubGVuZ3RoOyBpKyspIGFkZChvW2ldWyduYW1lJ10sIG9baV1bJ3ZhbHVlJ10pXG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIElmIHRyYWRpdGlvbmFsLCBlbmNvZGUgdGhlIFwib2xkXCIgd2F5ICh0aGUgd2F5IDEuMy4yIG9yIG9sZGVyXG4gICAgICAvLyBkaWQgaXQpLCBvdGhlcndpc2UgZW5jb2RlIHBhcmFtcyByZWN1cnNpdmVseS5cbiAgICAgIGZvciAocHJlZml4IGluIG8pIHtcbiAgICAgICAgaWYgKG8uaGFzT3duUHJvcGVydHkocHJlZml4KSkgYnVpbGRQYXJhbXMocHJlZml4LCBvW3ByZWZpeF0sIHRyYWRpdGlvbmFsLCBhZGQpXG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gc3BhY2VzIHNob3VsZCBiZSArIGFjY29yZGluZyB0byBzcGVjXG4gICAgcmV0dXJuIHMuam9pbignJicpLnJlcGxhY2UoLyUyMC9nLCAnKycpXG4gIH1cblxuICBmdW5jdGlvbiBidWlsZFBhcmFtcyhwcmVmaXgsIG9iaiwgdHJhZGl0aW9uYWwsIGFkZCkge1xuICAgIHZhciBuYW1lLCBpLCB2XG4gICAgICAsIHJicmFja2V0ID0gL1xcW1xcXSQvXG5cbiAgICBpZiAoaXNBcnJheShvYmopKSB7XG4gICAgICAvLyBTZXJpYWxpemUgYXJyYXkgaXRlbS5cbiAgICAgIGZvciAoaSA9IDA7IG9iaiAmJiBpIDwgb2JqLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHYgPSBvYmpbaV1cbiAgICAgICAgaWYgKHRyYWRpdGlvbmFsIHx8IHJicmFja2V0LnRlc3QocHJlZml4KSkge1xuICAgICAgICAgIC8vIFRyZWF0IGVhY2ggYXJyYXkgaXRlbSBhcyBhIHNjYWxhci5cbiAgICAgICAgICBhZGQocHJlZml4LCB2KVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGJ1aWxkUGFyYW1zKHByZWZpeCArICdbJyArICh0eXBlb2YgdiA9PT0gJ29iamVjdCcgPyBpIDogJycpICsgJ10nLCB2LCB0cmFkaXRpb25hbCwgYWRkKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChvYmogJiYgb2JqLnRvU3RyaW5nKCkgPT09ICdbb2JqZWN0IE9iamVjdF0nKSB7XG4gICAgICAvLyBTZXJpYWxpemUgb2JqZWN0IGl0ZW0uXG4gICAgICBmb3IgKG5hbWUgaW4gb2JqKSB7XG4gICAgICAgIGJ1aWxkUGFyYW1zKHByZWZpeCArICdbJyArIG5hbWUgKyAnXScsIG9ialtuYW1lXSwgdHJhZGl0aW9uYWwsIGFkZClcbiAgICAgIH1cblxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBTZXJpYWxpemUgc2NhbGFyIGl0ZW0uXG4gICAgICBhZGQocHJlZml4LCBvYmopXG4gICAgfVxuICB9XG5cbiAgcmVxd2VzdC5nZXRjYWxsYmFja1ByZWZpeCA9IGZ1bmN0aW9uICgpIHtcbiAgICByZXR1cm4gY2FsbGJhY2tQcmVmaXhcbiAgfVxuXG4gIC8vIGpRdWVyeSBhbmQgWmVwdG8gY29tcGF0aWJpbGl0eSwgZGlmZmVyZW5jZXMgY2FuIGJlIHJlbWFwcGVkIGhlcmUgc28geW91IGNhbiBjYWxsXG4gIC8vIC5hamF4LmNvbXBhdChvcHRpb25zLCBjYWxsYmFjaylcbiAgcmVxd2VzdC5jb21wYXQgPSBmdW5jdGlvbiAobywgZm4pIHtcbiAgICBpZiAobykge1xuICAgICAgb1sndHlwZSddICYmIChvWydtZXRob2QnXSA9IG9bJ3R5cGUnXSkgJiYgZGVsZXRlIG9bJ3R5cGUnXVxuICAgICAgb1snZGF0YVR5cGUnXSAmJiAob1sndHlwZSddID0gb1snZGF0YVR5cGUnXSlcbiAgICAgIG9bJ2pzb25wQ2FsbGJhY2snXSAmJiAob1snanNvbnBDYWxsYmFja05hbWUnXSA9IG9bJ2pzb25wQ2FsbGJhY2snXSkgJiYgZGVsZXRlIG9bJ2pzb25wQ2FsbGJhY2snXVxuICAgICAgb1snanNvbnAnXSAmJiAob1snanNvbnBDYWxsYmFjayddID0gb1snanNvbnAnXSlcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBSZXF3ZXN0KG8sIGZuKVxuICB9XG5cbiAgcmVxd2VzdC5hamF4U2V0dXAgPSBmdW5jdGlvbiAob3B0aW9ucykge1xuICAgIG9wdGlvbnMgPSBvcHRpb25zIHx8IHt9XG4gICAgZm9yICh2YXIgayBpbiBvcHRpb25zKSB7XG4gICAgICBnbG9iYWxTZXR1cE9wdGlvbnNba10gPSBvcHRpb25zW2tdXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHJlcXdlc3Rcbn0pO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgcmVxd2VzdCA9IHJlcXVpcmUoXCIuL2Jvd2VyX2NvbXBvbmVudHMvcmVxd2VzdC9yZXF3ZXN0LmpzXCIpO1xudmFyIERlbGVnYXRlID0gcmVxdWlyZShcIi4vYm93ZXJfY29tcG9uZW50cy9kb20tZGVsZWdhdGUvbGliL2RlbGVnYXRlLmpzXCIpO1xudmFyIGhlYWRlciA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vLWhlYWRlcicpO1xudmFyIG15RnRCdXR0b24gPSBoZWFkZXIucXVlcnlTZWxlY3RvcignLm8taGVhZGVyLWJ1dHRvbltkYXRhLXRhcmdldC1wYW5lbD1cIm15ZnRcIl0nKTtcbnZhciBkZWZhdWx0UGFuZWwgPSBoZWFkZXIuZ2V0QXR0cmlidXRlKCdkYXRhLWRlZmF1bHQtcGFuZWwnKTtcbnZhciBkZWxlZ2F0ZSA9IG5ldyBEZWxlZ2F0ZShoZWFkZXIpO1xudmFyIGJvZHlEZWxlZ2F0ZSA9IG5ldyBEZWxlZ2F0ZSgpO1xudmFyIE5vdGlmeSA9IHJlcXVpcmUoJy4vc3JjL2pzL05vdGlmeScpO1xucmVxdWlyZShcIi4vYm93ZXJfY29tcG9uZW50cy9uZXh0LXVzZXItcHJlZmVyZW5jZXMvc3JjL21haW4uanNcIik7XG52YXIgVXNlciA9IHJlcXVpcmUoXCIuL2Jvd2VyX2NvbXBvbmVudHMvbmV4dC11c2VyLW1vZGVsLWNvbXBvbmVudC9tYWluLmpzXCIpO1xuXG5kZWxlZ2F0ZS5vbignY2xpY2snLCAnLm8taGVhZGVyLWJ1dHRvbi1qcycsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXG5cdC8vIEhBQ0tcblx0dmFyIHRhcmdldFBhbmVsID0gZXZlbnQudGFyZ2V0LmdldEF0dHJpYnV0ZSgnZGF0YS10YXJnZXQtcGFuZWwnKVxuXHRcdHx8IGV2ZW50LnRhcmdldC5wYXJlbnROb2RlLmdldEF0dHJpYnV0ZSgnZGF0YS10YXJnZXQtcGFuZWwnKVxuXHRcdHx8IGRlZmF1bHRQYW5lbDtcblx0dmFyIGN1cnJlbnRQYW5lbCA9IGhlYWRlci5nZXRBdHRyaWJ1dGUoJ2RhdGEtcGFuZWwnKTtcblx0aWYgKGN1cnJlbnRQYW5lbCAhPT0gdGFyZ2V0UGFuZWwgJiYgdGFyZ2V0UGFuZWwgIT09IGRlZmF1bHRQYW5lbCkge1xuXHRcdGJvZHlEZWxlZ2F0ZS5yb290KGRvY3VtZW50LmJvZHkpO1xuXHRcdGhlYWRlci5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGFuZWwnLCB0YXJnZXRQYW5lbCk7XG5cdH0gZWxzZSB7XG5cdFx0Ym9keURlbGVnYXRlLnJvb3QoKTtcblx0XHRpZiAoZGVmYXVsdFBhbmVsKSB7XG5cdFx0XHRoZWFkZXIuc2V0QXR0cmlidXRlKCdkYXRhLXBhbmVsJywgZGVmYXVsdFBhbmVsKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aGVhZGVyLnJlbW92ZUF0dHJpYnV0ZSgnZGF0YS1wYW5lbCcpO1xuXHRcdH1cblx0fVxufSk7XG5cbmRlbGVnYXRlLm9uKCdjbGljaycsIGZ1bmN0aW9uKGV2ZW50KSB7XG5cdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xufSk7XG5cbmJvZHlEZWxlZ2F0ZS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblx0aWYgKGRlZmF1bHRQYW5lbCkge1xuXHRcdGhlYWRlci5zZXRBdHRyaWJ1dGUoJ2RhdGEtcGFuZWwnLCBkZWZhdWx0UGFuZWwpO1xuXHR9IGVsc2Uge1xuXHRcdGhlYWRlci5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtcGFuZWwnKTtcblx0fVxufSk7XG5cblxuLy8gTGlzdGVuIGZvciB0aGUgbm90aWZpY2F0aW9uIHBvbGxlciB0byByZXBvcnQgdGhlIG51bWJlciBvZiBuZXcgaXRlbXNcbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ25vdGlmaWNhdGlvbnM6bG9hZCcsIGZ1bmN0aW9uKGUpIHtcbiAgICB2YXIgbm90aWZpY2F0aW9ucyA9IGUuZGV0YWlsO1xuICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5ub3RpZnktYmFkZ2UnKS50ZXh0Q29udGVudCA9IG5vdGlmaWNhdGlvbnMuY291bnQ7XG59KTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignbm90aWZpY2F0aW9uczpuZXcnLCBmdW5jdGlvbihlKSB7XG5cdHZhciBkYXRhID0gZS5kZXRhaWw7XG5cdFxuXHR2YXIgaWQgPSBkYXRhLm5vdGlmaWNhdGlvbnNbMF0uaXRlbTtcblx0cmVxd2VzdCh7XG5cdFx0dXJsOiAnLycgKyBpZCxcblx0XHRoZWFkZXJzOiB7XG5cdFx0XHQnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuXHRcdFx0J0FjY2VwdCc6ICdhcHBsaWNhdGlvbi9qc29uJ1xuXHRcdH1cblx0fSkudGhlbihmdW5jdGlvbihyZXMpIHtcblx0XHRuZXcgTm90aWZ5KHtcblx0XHRcdHRpdGxlOiAnTmV3IGFydGljbGUgaW4gJyArIGRhdGEuc3RyZWFtLmRpc3BsYXlUZXh0LFxuXHRcdFx0Ym9keTogcmVzLmhlYWRsaW5lLFxuXHRcdFx0bGlmZXNwYW46IDEwMDAgKiAxMCxcblx0XHRcdG9uY2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRsb2NhdGlvbi5ocmVmID0gJy8nICsgcmVzLmlkO1xuXHRcdFx0fVxuXHRcdH0pLnNob3coKTtcblx0fSkuZmFpbChmdW5jdGlvbihlcnIpIHtcblx0XHRuZXcgTm90aWZ5KHtcblx0XHRcdHRpdGxlOiAnTmV3IGFydGljbGUgaW4gJyArIGRhdGEuc3RyZWFtLmRpc3BsYXlUZXh0LFxuXHRcdFx0bGlmZXNwYW46IDEwMDAgKiAxMCxcblx0XHRcdG9uY2xpY2s6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRsb2NhdGlvbi5ocmVmID0gJy8nICsgZGF0YS5ub3RpZmljYXRpb25zWzBdLml0ZW07XG5cdFx0XHR9XG5cdFx0fSkuc2hvdygpO1xuXHR9KTtcblxuXG59KTtcblxuLy8gTWFrZSB0aGUgZm9sbG93IGJ1dHRvbiB2aXNpYmxlICBcbmZ1bmN0aW9uIHNldEZvbGxvd2luZ0J1dHRvbiAoKSB7XG5cdHZhciB1aWQgPSBuZXcgVXNlcihkb2N1bWVudC5jb29raWUpLmlkKCk7XG5cdGlmICh1aWQpIHtcblx0XHRteUZ0QnV0dG9uLnNldEF0dHJpYnV0ZSgnaHJlZicsICcvdXNlcnMvJyArIHVpZCArICcvZm9sbG93aW5nL25ldycpO1xuXHRcdG15RnRCdXR0b24udGV4dENvbnRlbnQgPSAnRm9sbG93aW5nJztcblx0XHRteUZ0QnV0dG9uLmluc2VydEFkamFjZW50SFRNTCgnYmVmb3JlZW5kJywgJzxzcGFuIGNsYXNzPVwibm90aWZ5LWJhZGdlXCI+PC9zcGFuPicpO1xuXHR9XG59XG5cbmZ1bmN0aW9uIHRyYW5zaXRpb25NeUZ0QnV0dG9uICh0eXBlKSB7XG5cblx0ZnVuY3Rpb24gbGlzdGVuZXIoKSB7XG5cdFx0bXlGdEJ1dHRvbi5jbGFzc0xpc3QucmVtb3ZlKCd0cmFuc2l0aW9uaW5nJyk7XG5cdFx0bXlGdEJ1dHRvbi5yZW1vdmVFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgbGlzdGVuZXIpO1xuXHR9XG5cblx0bXlGdEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCd0cmFuc2l0aW9uZW5kJywgbGlzdGVuZXIpO1xuXHRteUZ0QnV0dG9uLmNsYXNzTGlzdC5hZGQoJ3RyYW5zaXRpb25pbmcnKTtcblx0bXlGdEJ1dHRvbi5jbGFzc0xpc3QuYWRkKCdteWZ0LS0nICsgdHlwZSk7XG5cdG15RnRCdXR0b24ub2Zmc2V0V2lkdGg7IC8vZm9yY2VzIHJlcGFpbnRcblxuXHRteUZ0QnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoJ215ZnQtLScgKyB0eXBlKTtcbn1cblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZmF2b3VyaXRlczphZGQnLCBmdW5jdGlvbiAoZSkge1xuXHR0cmFuc2l0aW9uTXlGdEJ1dHRvbignYWRkLWZhdm91cml0ZScpO1xufSk7XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2Zhdm91cml0ZXM6cmVtb3ZlJywgZnVuY3Rpb24gKGUpIHtcblx0dHJhbnNpdGlvbk15RnRCdXR0b24oJ3JlbW92ZS1mYXZvdXJpdGUnKTtcbn0pO1xuXG52YXIgZGF0YSA9IHJlcXVpcmUoJy4vc3JjL3ViZXItaW5kZXguanNvbicpLmRhdGE7XG5cbmZ1bmN0aW9uIHNwbGl0QXJyYXkoYXJyLCBieSkge1xuXHRyZXR1cm4gYXJyLnJlZHVjZShmdW5jdGlvbihvdXQsIHZhbHVlLCBpbmRleCkge1xuXHRcdHZhciBjb2x1bW4gPSBpbmRleCAlIGJ5O1xuXHRcdG91dFtjb2x1bW5dID0gb3V0W2NvbHVtbl0gfHwgW107XG5cdFx0b3V0W2NvbHVtbl0ucHVzaCh2YWx1ZSk7XG5cdFx0cmV0dXJuIG91dDtcblx0fSxbXSk7XG59XG5cbi8vIFNwbGl0IHRoZSBkYXRhIGludG8gZm91ciBjb2x1bW5zLCBhbmQgYWdhaW4gaW50byAyXG5kYXRhID0gc3BsaXRBcnJheShzcGxpdEFycmF5KGRhdGEsIDQpLCAyKTtcblxuaGVhZGVyLnF1ZXJ5U2VsZWN0b3IoJy5vLWhlYWRlcl9fc2Vjb25kYXJ5LS1tZW51LWpzJykuaW5uZXJIVE1MID0gJzx1bCBjbGFzcz1cInViZXItaW5kZXhcIj4nXG5cdCsgZGF0YS5tYXAoZnVuY3Rpb24oaXRlbSkge1xuXHRcdHJldHVybiAnPHVsIGRhdGEtby1ncmlkLWNvbHNwYW49XCI2IE02IEw2IFhMNlwiPidcblx0XHRcdCsgaXRlbS5tYXAoZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRyZXR1cm4gJzx1bCBkYXRhLW8tZ3JpZC1jb2xzcGFuPVwiMTIgTTEyIEw2IFhMNlwiPidcblx0XHRcdFx0XHQrIGl0ZW0ubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcblx0XHRcdFx0XHRcdHJldHVybiAnPGxpIGNsYXNzPVwidWJlci1pbmRleF9fdGl0bGVcIj4nXG5cdFx0XHRcdFx0XHRcdCsgJzxhIGhyZWY9XCInICsgaXRlbS5uZXh0VXJsICsgJ1wiPicgKyBpdGVtLnRpdGxlICsgJzwvYT4nXG5cdFx0XHRcdFx0XHRcdCsgJzx1bCBjbGFzcz1cInViZXItaW5kZXhfX2NoaWxkcmVuXCI+J1xuXHRcdFx0XHRcdFx0XHQrIGl0ZW0ubmF2aWdhdGlvbkl0ZW1zLm1hcChmdW5jdGlvbihjaGlsZCkge1xuXHRcdFx0XHRcdFx0XHRcdHJldHVybiAnPGxpIGNsYXNzPVwidWJlci1pbmRleF9fY2hpbGRcIj48YSBocmVmPVwiJyArIGNoaWxkLm5leHRVcmwgKyAnXCI+JyArIGNoaWxkLnRpdGxlICsgJzwvYT48L2xpPic7XG5cdFx0XHRcdFx0XHRcdH0pLmpvaW4oJycpXG5cdFx0XHRcdFx0XHRcdCsgJzwvdWw+J1xuXHRcdFx0XHRcdFx0XHQrICc8L2xpPic7XG5cdFx0XHRcdFx0fSkuam9pbignJylcblx0XHRcdFx0XHQrICc8L3VsPic7XG5cdFx0XHR9KS5qb2luKCcnKVxuXHRcdFx0KyAnPC91bD4nO1xuXHR9KS5qb2luKCcnKVxuXHQrICc8L3VsPic7XG5cbnNldEZvbGxvd2luZ0J1dHRvbigpO1xuIiwiLyoqXG4gKiBNZXNzYWdlIHRoZSB1c2VyXG4gKlxuICogPiBuZXcgTm90aWZ5KHsgaHRtbDogXCJZb3UndmUgZ290IG1haWxcIiwgbGlmZXNwYWNlOiAxMDAwMCB9KS5zaG93KCk7XG4gKlxuICogVE9ET1xuICpcbiAqICAtIFVYIHRvIGRlYWwgd2l0aCBtdWx0aXBsZSBtZXNzYWdlcy5cbiAqICAtIFczIC8gQ2hyb21lIGRlc2t0b3Agbm90aWZpY2F0aW9ucyBwZXJtaXNzaW9uLlxuICogIC0gQWNrbm93bGVkZ2VtZW50IFVYXG4gKlxuICovXG52YXIgTm90aWZ5ID0gZnVuY3Rpb24gKG1lc3NhZ2UpIHtcbiAgICB0aGlzLnRlbXBsYXRlID0gJzxoMyBjbGFzcz1cIm1lc3NhZ2VfX3RpdGxlXCI+JyArIG1lc3NhZ2UudGl0bGUgKyAnPGkgY2xhc3M9XCJtZXNzYWdlX19jbG9zZSBpY29uIGljb25fX2Nsb3NlXCI+PC9pPjwvaDM+PHNwYW4gY2xhc3M9XCJtZXNzYWdlX19ib2R5XCI+JyArIG1lc3NhZ2UuYm9keSArICc8L3NwYW4+JztcbiAgICB0aGlzLmxpZmVzcGFuID0gbWVzc2FnZS5saWZlc3BhbiB8fCA1MDAwO1xuICAgIHRoaXMuZG9tID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgdGhpcy5kb20uY2xhc3NOYW1lID0gJ21lc3NhZ2VfX2NvbnRhaW5lcidcbiAgICB0aGlzLmRvbS5pbm5lckhUTUwgPSB0aGlzLnRlbXBsYXRlOyBcbiAgICB0aGlzLmhhc0Rlc2t0b3BQZXJtaXNzaW9uID0gZmFsc2U7XG4gICAgdGhpcy5yb290ID0gZG9jdW1lbnQuYm9keTtcbiAgICB0aGlzLm1lc3NhZ2UgPSBtZXNzYWdlO1xufTtcblxuZnVuY3Rpb24gY3JlYXRlTm90aWZpY2F0aW9uKG1lc3NhZ2UpIHtcbiAgICB2YXIgbm90aWZpY2F0aW9uID0gbmV3IE5vdGlmaWNhdGlvbihtZXNzYWdlLnRpdGxlLCB7Ym9keTogbWVzc2FnZS5ib2R5fSk7XG4gICAgbm90aWZpY2F0aW9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgbWVzc2FnZS5vbmNsaWNrKTtcbiAgICByZXR1cm4gbm90aWZpY2F0aW9uO1xufVxuXG5Ob3RpZnkucHJvdG90eXBlLnNob3cgPSBmdW5jdGlvbiAoKSB7XG4gICAgXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xuICAgIC8vIGdyYW50ZWRcbiAgICAvL1RPRE8gLSBlbmFibGUgdGhpcyBhZ2FpbiBvbmNlIHdlJ3ZlIHRob3VnaHQgYWJvdXQgdGhlIFVYIVxuICAgIGlmIChmYWxzZSAmJiB3aW5kb3cuTm90aWZpY2F0aW9uICYmIE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uID09PSBcImdyYW50ZWRcIikge1xuICAgICAgICBjcmVhdGVOb3RpZmljYXRpb24oc2VsZi5tZXNzYWdlKTtcbiAgICB9IGVsc2UgaWYgKGZhbHNlICYmIHdpbmRvdy5Ob3RpZmljYXRpb24gJiYgTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gIT09IFwiZGVuaWVkXCIpIHtcbiAgICAgIFxuICAgICAgICBOb3RpZmljYXRpb24ucmVxdWVzdFBlcm1pc3Npb24oZnVuY3Rpb24gKHN0YXR1cykge1xuICAgICAgICAgICAgaWYgKE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uICE9PSBzdGF0dXMpIHtcbiAgICAgICAgICAgICAgICBOb3RpZmljYXRpb24ucGVybWlzc2lvbiA9IHN0YXR1cztcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy8gZ3JhbnRlZFxuICAgICAgICAgICAgaWYgKHN0YXR1cyA9PT0gXCJncmFudGVkXCIpIHtcbiAgICAgICAgICAgICAgICBjcmVhdGVOb3RpZmljYXRpb24oc2VsZi5tZXNzYWdlKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgc2VsZi5zaG93SHRtbE5vdGlmaWNhdGlvbigpOyAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgLy8gZGVuaWVkXG4gICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5zaG93SHRtbE5vdGlmaWNhdGlvbigpOyAgICBcbiAgICB9XG59O1xuXG5Ob3RpZnkucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbiAoKSB7XG4gICAgLy8gRklYTUUgZm9yZ2V0IGlmIEkgbmVlZCB0byByZW1vdmUgZXZlbnQgbGlzdGVuZXIgOilcbiAgICB0aGlzLmRvbS5wYXJlbnROb2RlLnJlbW92ZUNoaWxkKHRoaXMuZG9tKTtcbn07XG5cbk5vdGlmeS5wcm90b3R5cGUuc2hvd0h0bWxOb3RpZmljYXRpb24gPSBmdW5jdGlvbiAoKSB7XG5cbiAgICB2YXIgc2VsZiA9IHRoaXM7XG5cbiAgICB0aGlzLnJvb3QuYXBwZW5kQ2hpbGQodGhpcy5kb20pO1xuXG4gICAgLy8gQXV0b21hdGljYWxseSBkZXN0cm95IHRoZSBib3ggYWZ0ZXIgYSBmZXcgc2Vjb25kc1xuICAgIHZhciBzZWxmRGVzdHJ1Y3QgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgfSwgdGhpcy5saWZlc3Bhbik7IFxuXG4gICAgLy8gQWNrbm93bGVkZ21lbnQgVUlcbiAgICB0aGlzLmRvbS5xdWVyeVNlbGVjdG9yKCcubWVzc2FnZV9fY2xvc2UnKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIGNsZWFyVGltZW91dChzZWxmRGVzdHJ1Y3QpO1xuICAgIH0pO1xuXG4gICAgdGhpcy5kb20uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBmdW5jdGlvbiAoZSkge1xuICAgICAgICBpZihlLnRhcmdldC5jbGFzc05hbWUuaW5kZXhPZignbWVzc2FnZV9fY2xvc2UnKSA+PSAwKSB7XG4gICAgICAgICAgICByZXR1cm47XG4gICAgICAgIH1cbiAgICAgICAgc2VsZi5tZXNzYWdlLm9uY2xpY2soKTtcbiAgICAgICAgc2VsZi5kZXN0cm95KCk7XG4gICAgICAgIGNsZWFyVGltZW91dChzZWxmRGVzdHJ1Y3QpO1xuICAgIH0pO1xuXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE5vdGlmeTsiLCJtb2R1bGUuZXhwb3J0cz17XCJzdGF0dXNcIjpcInN1Y2Nlc3NcIixcImRhdGFcIjpbe1widGl0bGVcIjpcIkhvbWVcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb21cIixcIm5hdmlnYXRpb25JdGVtc1wiOltdLFwibmV4dFVybFwiOlwiL1wifSx7XCJ0aXRsZVwiOlwiVUtcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGQvdWtcIixcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiQnVzaW5lc3NcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGQvdWsvYnVzaW5lc3NcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZTQ5ZGQwYjgtZmJiYy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJlNDlkZDBiOC1mYmJjLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkJ1c2luZXNzXCJ9LHtcInRpdGxlXCI6XCJVSyBDb21wYW5pZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL3VrXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2JlMGM4NGE0LWY3ZTItMTFkZi1iNzcwLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiYmUwYzg0YTQtZjdlMi0xMWRmLWI3NzAtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpDb21wYW5pZXNcIn1dLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6dWtcIn0se1widGl0bGVcIjpcIldvcmxkXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3dvcmxkXCIsXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIkFmcmljYVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS93b3JsZC9hZnJpY2FcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMDQyZDc3ZDQtZmJiZS0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIwNDJkNzdkNC1mYmJlLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkFmcmljYVwifSx7XCJ0aXRsZVwiOlwiRXVyb3BlXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3dvcmxkL2V1cm9wZVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wMTJiYTgzYS1mYmJlLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiQnJ1c3NlbHNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGQvZXVyb3BlL2JydXNzZWxzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2IyOWM5NjBjLWZiYmQtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiYjI5Yzk2MGMtZmJiZC0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9XSxcInV1aWRcIjpcIjAxMmJhODNhLWZiYmUtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6RXVyb3BlXCJ9LHtcInRpdGxlXCI6XCJVS1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS93b3JsZC91a1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8yODM2ZWJiZS1jZDI2LTExZGUtYTc0OC0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiQnVzaW5lc3NcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGQvdWsvYnVzaW5lc3NcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZTQ5ZGQwYjgtZmJiYy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJlNDlkZDBiOC1mYmJjLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkVjb25vbXlcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGQvdWsvZWNvbm9teVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9kOWE2YjgzMi1mYmJjLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImQ5YTZiODMyLWZiYmMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiVUsgQ29tcGFuaWVzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy91a1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9iZTBjODRhNC1mN2UyLTExZGYtYjc3MC0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImJlMGM4NGE0LWY3ZTItMTFkZi1iNzcwLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiUG9saXRpY3MgJiBQb2xpY3lcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGQvdWsvcG9saXRpY3NcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZThhZjhjYjQtZmJiYy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJlOGFmOGNiNC1mYmJjLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlNjb3R0aXNoIGluZGVwZW5kZW5jZVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9pbmRlcHRoL3Njb3R0aXNoLWluZGVwZW5kZW5jZVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy84NDkyOGUxYS1jYjQxLTExZTEtYjg5Ni0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjg0OTI4ZTFhLWNiNDEtMTFlMS1iODk2LTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiVUsgU21hbGwgQ29tcGFuaWVzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy91a3NtYWxsZXJjb21wYW5pZXNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZjIxMmJkMjYtZjdkZS0xMWRmLWI3NzAtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmMjEyYmQyNi1mN2RlLTExZGYtYjc3MC0wMDE0NGZlYWI0OWFcIn1dLFwidXVpZFwiOlwiMjgzNmViYmUtY2QyNi0xMWRlLWE3NDgtMDAxNDRmZWFiZGMwXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTp1a1wifSx7XCJ0aXRsZVwiOlwiVVMgJiBDYW5hZGFcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGQvdXNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMzYyMTI3YzgtZmJiZC0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIkVjb25vbXlcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGQvdXMvZWNvbm9teVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8yNTU1YzRlNi1mYmM1LTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjI1NTVjNGU2LWZiYzUtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiUG9saXRpY3MgJiBQb2xpY3lcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGQvdXMvcG9saXRpY3NcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZWI2Y2Y5ZGUtZmJjNC0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJlYjZjZjlkZS1mYmM0LTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlNvY2lldHlcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGQvdXMvc29jaWV0eVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8xOGJlOTk5MC1mYmJkLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjE4YmU5OTkwLWZiYmQtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiQ2FuYWRhXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3dvcmxkL2NhbmFkYVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9lZTViNDVjZS1mYmM0LTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImVlNWI0NWNlLWZiYzQtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifV0sXCJ1dWlkXCI6XCIzNjIxMjdjOC1mYmJkLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOlVTXCJ9XSxcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOndvcmxkXCJ9LHtcInRpdGxlXCI6XCJDb21wYW5pZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzXCIsXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIkVuZXJneVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvZW5lcmd5XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzc1M2M1N2VlLWY3ZTgtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJNaW5pbmdcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL21pbmluZ1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy83MDkwYjMzZS1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjcwOTBiMzNlLWY3ZTgtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiT2lsICYgR2FzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy9vaWwtZ2FzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzZkZjNiZTVhLWY3ZTgtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNmRmM2JlNWEtZjdlOC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJVdGlsaXRpZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL3V0aWxpdGllc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy83MmQ1YmY2OC1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjcyZDViZjY4LWY3ZTgtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwifV0sXCJ1dWlkXCI6XCI3NTNjNTdlZS1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkVuZXJneVwifSx7XCJ0aXRsZVwiOlwiRmluYW5jaWFsc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvZmluYW5jaWFsc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9mM2VkYjY0Ni1mN2UzLTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiQmFua3NcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL2JhbmtzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2YxMTc0YzIwLWY3ZTMtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZjExNzRjMjAtZjdlMy0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJJbnN1cmFuY2VcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL2luc3VyYW5jZVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9lZDZiMTIwYS1mN2UzLTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImVkNmIxMjBhLWY3ZTMtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiUHJvcGVydHlcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL3Byb3BlcnR5XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2Q4M2EwYWU0LWY3ZTMtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZDgzYTBhZTQtZjdlMy0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJGaW5hbmNpYWwgU2VydmljZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL2ZpbmFuY2lhbC1zZXJ2aWNlc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9kNjA4MGZhYS1mN2UzLTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImQ2MDgwZmFhLWY3ZTMtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwifV0sXCJ1dWlkXCI6XCJmM2VkYjY0Ni1mN2UzLTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkZpbmFuY2lhbHNcIn0se1widGl0bGVcIjpcIkhlYWx0aFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvaGVhbHRoXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzA3ZWY3NGVhLWY3ZTktMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJIZWFsdGggQ2FyZVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvaGVhbHRoLWNhcmVcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZjAzYWUzZGUtZjdlOC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmMDNhZTNkZS1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlBoYXJtYWNldXRpY2Fsc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvcGhhcm1hY2V1dGljYWxzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2VlMDE0ODM4LWY3ZTgtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZWUwMTQ4MzgtZjdlOC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCJ9XSxcInV1aWRcIjpcIjA3ZWY3NGVhLWY3ZTktMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6SGVhbHRoXCJ9LHtcInRpdGxlXCI6XCJJbmR1c3RyaWFsc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvaW5kdXN0cmlhbHNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNDQ2NGFiODQtZjdlNC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIkFlcm9zcGFjZSAmIERlZmVuY2VcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL2Flcm9zcGFjZS1kZWZlbmNlXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzEwZjcyY2ZlLWY3ZTQtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMTBmNzJjZmUtZjdlNC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJBdXRvbW9iaWxlc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvYXV0b21vYmlsZXNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMjU4NmE5NDItZjdlNC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIyNTg2YTk0Mi1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkJhc2ljIFJlc291cmNlc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvYmFzaWMtcmVzb3VyY2VzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzE1NGVjMWMyLWY3ZTQtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMTU0ZWMxYzItZjdlNC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJDaGVtaWNhbHNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL2NoZW1pY2Fsc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wYzA2MzUyOC1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjBjMDYzNTI4LWY3ZTQtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiQ29uc3RydWN0aW9uXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy9jb25zdHJ1Y3Rpb25cIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMDQ1OTcwMzgtZjdlNC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIwNDU5NzAzOC1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkluZHVzdHJpYWwgR29vZHNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL2luZHVzdHJpYWwtZ29vZHNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMGU1N2Y1ODItZjdlNC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIwZTU3ZjU4Mi1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlN1cHBvcnQgU2VydmljZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL3N1cHBvcnQtc2VydmljZXNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvYTk2MDZkNmMtYTBjZi0xMWUxLTg1MWYtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJhOTYwNmQ2Yy1hMGNmLTExZTEtODUxZi0wMDE0NGZlYWJkYzBcIn1dLFwidXVpZFwiOlwiNDQ2NGFiODQtZjdlNC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpJbmR1c3RyaWFsc1wifSx7XCJ0aXRsZVwiOlwiTHV4dXJ5IDM2MFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvbHV4dXJ5LTM2MFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wZDJkZjJiNi1hMjQ3LTExZTAtYmIwNi0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjBkMmRmMmI2LWEyNDctMTFlMC1iYjA2LTAwMTQ0ZmVhYmRjMFwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6THV4dXJ5IDM2MFwifSx7XCJ0aXRsZVwiOlwiTWVkaWFcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL21lZGlhXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzA0NDJhNTQ4LWY3ZTMtMTFkZi1iNzcwLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMDQ0MmE1NDgtZjdlMy0xMWRmLWI3NzAtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpNZWRpYVwifSx7XCJ0aXRsZVwiOlwiVGVjaFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvdGVjaG5vbG9neVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9lOTAwNzQxYy1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiU2NpZW5jZVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS90ZWNobm9sb2d5L3NjaWVuY2VcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNzdiNjhkOTYtZjdlOC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI3N2I2OGQ5Ni1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlRlY2ggQmxvZ1wiLFwid2ViVXJsXCI6XCJodHRwOi8vYmxvZ3MuZnQuY29tL2Z0dGVjaGh1Yi9cIn1dLFwidXVpZFwiOlwiZTkwMDc0MWMtZjdlOC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpUZWNobm9sb2d5XCJ9LHtcInRpdGxlXCI6XCJUZWxlY29tc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvdGVsZWNvbXNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNmIwZGQ4NGMtZjdlOC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI2YjBkZDg0Yy1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOlRlbGVjb21zXCJ9LHtcInRpdGxlXCI6XCJUcmFuc3BvcnRcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL3RyYW5zcG9ydFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wMjUzNjY1ZS1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiQWlybGluZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL2FpcmxpbmVzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2ZhNmRhY2Y2LWY3ZTMtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZmE2ZGFjZjYtZjdlMy0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJTaGlwcGluZ1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvc2hpcHBpbmdcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZmM4OWJmOGUtZjdlMy0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmYzg5YmY4ZS1mN2UzLTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlJhaWxcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL3JhaWxcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZjg2MmQ0ZWEtZjdlMy0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmODYyZDRlYS1mN2UzLTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn1dLFwidXVpZFwiOlwiMDI1MzY2NWUtZjdlNC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpUcmFuc3BvcnRcIn1dLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6Y29tcGFuaWVzXCJ9LHtcInRpdGxlXCI6XCJNYXJrZXRzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL21hcmtldHNcIixcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiRlRmbVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9mdGZtXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2Q2MzRkMzMwLTc4NmYtMTFkZi05NDJhLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJSZWd1bGF0aW9uXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2Z0Zm0vcmVndWxhdGlvblwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy83ZGM0YzkwNC04MTUwLTExZTAtOTM2MC0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjdkYzRjOTA0LTgxNTAtMTFlMC05MzYwLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiRVRGc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9mdGZtL2V0ZnNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNjljOTU5NmUtNzRiNC0xMWRmLWFlZDctMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI2OWM5NTk2ZS03NGI0LTExZGYtYWVkNy0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkludmVzdG1lbnQgU3RyYXRlZ3lcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vZnRmbS9pbnZlc3RtZW50LXN0cmF0ZWd5XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzA0ZmFmMTljLWZiYzItMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMDRmYWYxOWMtZmJjMi0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJQZW5zaW9uc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9mdGZtL3BlbnNpb25zXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzA3ZTgzNjQ0LWZiYzItMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMDdlODM2NDQtZmJjMi0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJQZW9wbGVcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vZnRmbS9wZW9wbGVcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMGU4MTMwYmUtZmJjMi0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIwZTgxMzBiZS1mYmMyLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIk9waW5pb25cIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vZnRmbS9vcGluaW9uXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzJhMmZhZTRhLWYwMDgtMTFlMC1iYzlkLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMmEyZmFlNGEtZjAwOC0xMWUwLWJjOWQtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJWaWRlb1wiLFwid2ViVXJsXCI6XCJodHRwOi8vdmlkZW8uZnQuY29tL2Z0Zm1cIn1dLFwidXVpZFwiOlwiZDYzNGQzMzAtNzg2Zi0xMWRmLTk0MmEtMDAxNDRmZWFiZGMwXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpGVCBGdW5kIE1hbmFnZW1lbnRcIn0se1widGl0bGVcIjpcIlRyYWRpbmcgUm9vbVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9tYXJrZXRzL3RyYWRpbmctcm9vbVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8yNjhkMjViZS04OWIyLTExZGYtOWVhNi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiQ2xlYXJpbmcgJiBTZXR0bGVtZW50XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2Z0LXRyYWRpbmctcm9vbS9jbGVhcmluZy1zZXR0bGVtZW50XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2Y5NDA1MDBlLWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZjk0MDUwMGUtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJEZXZlbG9waW5nIE1hcmtldHMgJiBBc2lhXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2Z0LXRyYWRpbmctcm9vbS9kZXZlbG9waW5nLW1hcmtldHMtYXNpYVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9iNjY0NTdlNC1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImI2NjQ1N2U0LWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiSGlnaCBGcmVxdWVuY3kgVHJhZGluZ1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9mdC10cmFkaW5nLXJvb20vaGlnaC1mcmVxdWVuY3ktdHJhZGluZ1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9lNTExMTFkNC05MzEwLTExZTItOTU5My0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImU1MTExMWQ0LTkzMTAtMTFlMi05NTkzLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiTWFya2V0cyBSZWd1bGF0aW9uXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2Z0LXRyYWRpbmctcm9vbS9tYXJrZXRzLXJlZ3VsYXRpb25cIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvYzI1YTA2M2UtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJjMjVhMDYzZS1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlRyYWRpbmcgVGVjaG5vbG9neVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9mdC10cmFkaW5nLXJvb20vdHJhZGluZy10ZWNobm9sb2d5XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2RlNzlkMzU4LWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZGU3OWQzNTgtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJRdWljayBWaWV3XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2Z0LXRyYWRpbmctcm9vbS9xdWljay12aWV3XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2QwZjRiZTNjLWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZDBmNGJlM2MtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJDYXJib24gTWFya2V0c1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9mdC10cmFkaW5nLXJvb20vY2FyYm9uLW1hcmtldHNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvOGM4NjgxYTYtMjRlYS0xMWUxLThiZjktMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI4Yzg2ODFhNi0yNGVhLTExZTEtOGJmOS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkV4Y2hhbmdlcyBDb25zb2xpZGF0aW9uXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2Z0LXRyYWRpbmctcm9vbS9leGNoYW5nZXMtY29uc29saWRhdGlvblwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy80ZjYzM2Y5Ni05ZDdmLTExZTAtOWE3MC0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjRmNjMzZjk2LTlkN2YtMTFlMC05YTcwLTAwMTQ0ZmVhYmRjMFwifV0sXCJ1dWlkXCI6XCIyNjhkMjViZS04OWIyLTExZGYtOWVhNi0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkZUIFRyYWRpbmcgUm9vbVwifSx7XCJ0aXRsZVwiOlwiRXF1aXRpZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbWFya2V0cy9lcXVpdGllc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9kM2VkNWNlOC1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiVVNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbWFya2V0cy91c1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9mNThmOWY5Ni1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImY1OGY5Zjk2LWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiVUtcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbWFya2V0cy91a1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9mYjI2OGY5Ni1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImZiMjY4Zjk2LWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiRXVyb3BlXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL21hcmtldHMvZXVyb3BlXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2RjNmZlYTY2LWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZGM2ZmVhNjYtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJBc2lhLVBhY2lmaWNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbWFya2V0cy9hc2lhcGFjaWZpY1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9jNDgzNTgwYy1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImM0ODM1ODBjLWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifV0sXCJ1dWlkXCI6XCJkM2VkNWNlOC1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkVxdWl0aWVzXCJ9LHtcInRpdGxlXCI6XCJDdXJyZW5jaWVzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL21hcmtldHMvY3VycmVuY2llc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8xZGNmZjcyMi1mMWE4LTExZGYtYmI1YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjFkY2ZmNzIyLWYxYTgtMTFkZi1iYjVhLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6Q3VycmVuY2llc1wifSx7XCJ0aXRsZVwiOlwiQ29tbW9kaXRpZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbWFya2V0cy9jb21tb2RpdGllc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8yNWQ0NWQ2NC1mMWE4LTExZGYtYmI1YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjI1ZDQ1ZDY0LWYxYTgtMTFkZi1iYjVhLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6Q29tbW9kaXRpZXNcIn1dLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6bWFya2V0c1wifSx7XCJ0aXRsZVwiOlwiR2xvYmFsIEVjb25vbXlcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vZ2xvYmFsLWVjb25vbXlcIixcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiTWFjcm8gU3dlZXBcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vZ2xvYmFsZWNvbm9teS9tYWNyby1zd2VlcFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9kZTA4NWFlNi0wOGUwLTExZTMtYWQwNy0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImRlMDg1YWU2LTA4ZTAtMTFlMy1hZDA3LTAwMTQ0ZmVhYmRjMFwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6VGhlIE1hY3JvIFN3ZWVwXCJ9XSxcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOmdsb2JhbCBlY29ub215XCJ9LHtcInRpdGxlXCI6XCJMZXhcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbGV4XCIsXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIkxleCBJbiBkZXB0aFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9sZXgvaW5kZXB0aFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wZmM2ZDgyOC1lYzVlLTExZTEtYTkxYy0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjBmYzZkODI4LWVjNWUtMTFlMS1hOTFjLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6TGV4IEluIGRlcHRoXCJ9LHtcInRpdGxlXCI6XCJCZXN0IG9mIExleFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9sZXgvYmVzdFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9hYTE0Yjg5Yy0yYTVjLTExZTEtOWJkYi0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImFhMTRiODljLTJhNWMtMTFlMS05YmRiLTAwMTQ0ZmVhYmRjMFwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6QmVzdCBvZiBMZXhcIn1dLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6bGV4XCJ9LHtcInRpdGxlXCI6XCJDb21tZW50XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnRcIixcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiQ29sdW1uaXN0c1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvbHVtbmlzdHNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZDU0OThiNzItZjcxOS0xMWRmLThmZWItMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIkphbmFuIEdhbmVzaFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9qYW5hbmdhbmVzaFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy82MWU2OGIwMi1mMzYyLTExZTEtOWNhNi0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjYxZTY4YjAyLWYzNjItMTFlMS05Y2E2LTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiSm9obiBHYXBwZXJcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9jb2x1bW5pc3RzL2pvaG5nYXBwZXJcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvM2UzM2E0NWUtM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIzZTMzYTQ1ZS0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkNocmlzIEdpbGVzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29sdW1uaXN0cy9jaHJpcy1naWxlc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy80ZWZhZDdiYS1jZDBhLTExZTEtOTJjMS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjRlZmFkN2JhLWNkMGEtMTFlMS05MmMxLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiSm9obiBLYXlcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9jb2x1bW5pc3RzL2pvaG5rYXlcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZjZiY2Y3ODgtM2JhMy0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmNmJjZjc4OC0zYmEzLTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIlJvdWxhIEtoYWxhZlwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvbHVtbmlzdHMvcm91bGFraGFsYWZcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNGNjMmU3ZmEtM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI0Y2MyZTdmYS0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkVkd2FyZCBMdWNlXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29sdW1uaXN0cy9lZGx1Y2VcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMTM3N2YyYzQtM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIxMzc3ZjJjNC0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkp1cmVrIE1hcnRpblwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvbHVtbmlzdHMvanVyZWttYXJ0aW5cIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNDA5Nzg5NDAtM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI0MDk3ODk0MC0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkpvaG4gTWNEZXJtb3R0XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly9ibG9ncy5mdC5jb20vb2ZmLW1lc3NhZ2VcIn0se1widGl0bGVcIjpcIldvbGZnYW5nIE11bmNoYXVcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9jb2x1bW5pc3RzL3dvbGZnYW5nbXVuY2hhdVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy81MmU3NjRkMC0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjUyZTc2NGQwLTNiYTQtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiRGF2aWQgUGlsbGluZ1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvbHVtbmlzdHMvZGF2aWRwaWxsaW5nXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzVhYmQ3Y2IyLTNiYTQtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNWFiZDdjYjItM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJJbmdyYW0gUGlublwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvbHVtbmlzdHMvaW5ncmFtcGlublwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy80NWRmMTc3NC01N2JhLTExZTEtYjA4OS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjQ1ZGYxNzc0LTU3YmEtMTFlMS1iMDg5LTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiTGlzYSBQb2xsYWNrXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29sdW1uaXN0cy9saXNhLXBvbGxhY2tcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvOGYwZmIxZDQtMmY4ZS0xMWU0LTg3ZDktMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI4ZjBmYjFkNC0yZjhlLTExZTQtODdkOS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkdpZGVvbiBSYWNobWFuXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29sdW1uaXN0cy9naWRlb25yYWNobWFuXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzJlMGRlMzNjLTNiYTQtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMmUwZGUzM2MtM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJSb2JlcnQgU2hyaW1zbGV5XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3JvYmVydC1zaHJpbXNsZXktbm90ZWJvb2tcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZjlmMjEwNjQtM2JhMy0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmOWYyMTA2NC0zYmEzLTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkdhcnkgU2lsdmVybWFuXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29sdW1uaXN0cy9nYXJ5c2lsdmVybWFuXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzAyMzI3ZTk0LTNiYTQtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMDIzMjdlOTQtM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJQaGlsaXAgU3RlcGhlbnNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9jb2x1bW5pc3RzL3BoaWxpcHN0ZXBoZW5zXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzQzZjY1ZWE0LTNiYTQtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNDNmNjVlYTQtM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJMYXdyZW5jZSBTdW1tZXJzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29sdW1uaXN0cy9sYXdyZW5jZS1zdW1tZXJzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzY2MmVhNWNhLTNjNGEtMTFlMS04ZDcyLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNjYyZWE1Y2EtM2M0YS0xMWUxLThkNzItMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJHaWxsaWFuIFRldHRcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9jb2x1bW5pc3RzL2dpbGxpYW4tdGV0dFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy85YzRjOGRjMi0zYzNlLTExZTEtOGQ3Mi0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjljNGM4ZGMyLTNjM2UtMTFlMS04ZDcyLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiUGF0dGkgV2FsZG1laXJcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9jb2x1bW5pc3RzL3BhdHRpLXdhbGRtZWlyXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2QyN2U5MWE0LTM5OTUtMTFlNC05M2RhLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZDI3ZTkxYTQtMzk5NS0xMWU0LTkzZGEtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJNYXJ0aW4gV29sZlwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvbHVtbmlzdHMvbWFydGlud29sZlwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy80N2E0ODRjMi0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjQ3YTQ4NGMyLTNiYTQtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwifV0sXCJ1dWlkXCI6XCJkNTQ5OGI3Mi1mNzE5LTExZGYtOGZlYi0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkNvbHVtbmlzdHNcIn0se1widGl0bGVcIjpcIlRoZSBCaWcgUmVhZFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L3RoZS1iaWctcmVhZFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wYzRlMzc1Ni1mNzFjLTExZGYtOWIwNi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjBjNGUzNzU2LWY3MWMtMTFkZi05YjA2LTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6VGhlIEJpZyBSZWFkXCJ9LHtcInRpdGxlXCI6XCJPcGluaW9uXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvb3BpbmlvblwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wNzVjNjQ0OC1mNzFjLTExZGYtOWIwNi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjA3NWM2NDQ4LWY3MWMtMTFkZi05YjA2LTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6T3BpbmlvblwifSx7XCJ0aXRsZVwiOlwiRlQgVmlld1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2Z0LXZpZXdcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMDI2OTRiNWUtZjcxYy0xMWRmLTliMDYtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIwMjY5NGI1ZS1mNzFjLTExZGYtOWIwNi0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkZUIFZpZXdcIn0se1widGl0bGVcIjpcIkxldHRlcnNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9sZXR0ZXJzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2ZlNjljMGQ4LWY3MWItMTFkZi05YjA2LTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZmU2OWMwZDgtZjcxYi0xMWRmLTliMDYtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpMZXR0ZXJzXCJ9LHtcInRpdGxlXCI6XCJDb3JyZWN0aW9uc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvcnJlY3Rpb25zXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2Y5ZTk3MWEyLWY3MWItMTFkZi05YjA2LTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZjllOTcxYTItZjcxYi0xMWRmLTliMDYtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpDb3JyZWN0aW9uc1wifSx7XCJ0aXRsZVwiOlwiT2JpdHVhcmllc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L29iaXR1YXJpZXNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvODk0MjQ0YmEtZjcxYi0xMWRmLThmZWItMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI4OTQyNDRiYS1mNzFiLTExZGYtOGZlYi0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOk9iaXR1YXJpZXNcIn1dLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6Y29tbWVudFwifSx7XCJ0aXRsZVwiOlwiTWFuYWdlbWVudFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9tYW5hZ2VtZW50XCIsXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIkJ1c2luZXNzIEVkdWNhdGlvblwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9idXNpbmVzcy1lZHVjYXRpb25cIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvYjM0YzgzYmUtODM2OC0xMWRmLTg0NTEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIkpvaW4gT3VyIENvbW11bml0eVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9idXNpbmVzcy1lZHVjYXRpb24vY29tbXVuaXR5XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzYxMjAxNTllLTEzNDAtMTFlNC05MjVhLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNjEyMDE1OWUtMTM0MC0xMWU0LTkyNWEtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJSYW5raW5nc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vcmFua2luZ3MuZnQuY29tL2J1c2luZXNzc2Nob29scmFua2luZ3MvcmFua2luZ3NcIn0se1widGl0bGVcIjpcIkFwcGx5aW5nIGZvciBhIE1hc3RlcnNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vYnVzaW5lc3MtZWR1Y2F0aW9uL2FwcGx5aW5nLW1hc3RlcnMtZGVncmVlXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzIwY2RmMDFhLWZiMjQtMTFlMC1iZWJlLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMjBjZGYwMWEtZmIyNC0xMWUwLWJlYmUtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJBcHBseWluZyBmb3IgYW4gTUJBXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2J1c2luZXNzLWVkdWNhdGlvbi9hcHBseWluZy1tYmFcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNDU2OTY0NjgtMThjMi0xMWU0LWE1MWEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI0NTY5NjQ2OC0xOGMyLTExZTQtYTUxYS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkZpbmRpbmcgYSBKb2JcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vYnVzaW5lc3MtZWR1Y2F0aW9uL2ZpbmRpbmctYS1qb2JcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZjgzYzIyZWEtZTAwMi0xMWUzLTk1MzQtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmODNjMjJlYS1lMDAyLTExZTMtOTUzNC0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkV4ZWN1dGl2ZSBFZHVjYXRpb25cIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vYnVzaW5lc3MtZWR1Y2F0aW9uL2V4ZWN1dGl2ZS1lZHVjYXRpb25cIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNjdkYWJkOGEtZmUxOC0xMWRmLTg1M2ItMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI2N2RhYmQ4YS1mZTE4LTExZGYtODUzYi0wMDE0NGZlYWI0OWFcIn1dLFwidXVpZFwiOlwiYjM0YzgzYmUtODM2OC0xMWRmLTg0NTEtMDAxNDRmZWFiZGMwXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpCdXNpbmVzcyBFZHVjYXRpb25cIn0se1widGl0bGVcIjpcIkVudHJlcHJlbmV1cnNoaXBcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbWFuYWdlbWVudC9lbnRyZXByZW5ldXJzaGlwXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzQxMjQxMzUwLWZlZDQtMTFkZi1hZTg3LTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJCdXNpbmVzcyBTcGVha1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9idXNpbmVzcy1zcGVha1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy82OGY0ZjIyOC01Y2FjLTExZTEtYWM4MC0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjY4ZjRmMjI4LTVjYWMtMTFlMS1hYzgwLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiQnVzaW5lc3MgUXVlc3Rpb25zXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2J1c2luZXNzLXF1ZXN0aW9uc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy84NDY0NDAxOC02ZThiLTExZTEtYTgyZC0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjg0NjQ0MDE4LTZlOGItMTFlMS1hODJkLTAwMTQ0ZmVhYjQ5YVwifV0sXCJ1dWlkXCI6XCI0MTI0MTM1MC1mZWQ0LTExZGYtYWU4Ny0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkVudHJlcHJlbmV1cnNoaXBcIn0se1widGl0bGVcIjpcIlRoZSBDb25uZWN0ZWQgQnVzaW5lc3NcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vcmVwb3J0cy90aGUtY29ubmVjdGVkLWJ1c2luZXNzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzE3MmZlOTVlLTY5YWItMTFlMi04ZDA3LTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMTcyZmU5NWUtNjlhYi0xMWUyLThkMDctMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpUaGUgQ29ubmVjdGVkIEJ1c2luZXNzXCJ9XSxcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOm1hbmFnZW1lbnRcIn0se1widGl0bGVcIjpcIlBlcnNvbmFsIEZpbmFuY2VcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vcGVyc29uYWwtZmluYW5jZVwiLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJJbnZlc3RtZW50c1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9wZXJzb25hbC1maW5hbmNlL2ludmVzdG1lbnRzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzEzZGZlMWM2LWZjN2MtMTFkZi1hOWM1LTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJEaXJlY3RvcnPigJkgRGVhbHNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vcGVyc29uYWwtZmluYW5jZS9kaXJlY3RvcnMtZGVhbHNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZjY3MTVhYjgtY2QzMi0xMWUyLTkwZTgtMDAxNDRmZWFiN2RlXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmNjcxNWFiOC1jZDMyLTExZTItOTBlOC0wMDE0NGZlYWI3ZGVcIn0se1widGl0bGVcIjpcIkludmVzdG9ycyBDaHJvbmljbGVcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vcGVyc29uYWwtZmluYW5jZS9pbnZlc3RvcnMtY2hyb25pY2xlXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2UxYTNjZTQwLWNkMzItMTFlMi05MGU4LTAwMTQ0ZmVhYjdkZVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZTFhM2NlNDAtY2QzMi0xMWUyLTkwZTgtMDAxNDRmZWFiN2RlXCJ9LHtcInRpdGxlXCI6XCJIb3cgdG8uLi5cIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vcGVyc29uYWwtZmluYW5jZS9ob3d0b1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy84NGRhNDcyOC0yZmYwLTExZTItYWU3ZC0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjg0ZGE0NzI4LTJmZjAtMTFlMi1hZTdkLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiTWFrZSB0aGUgTW9zdCBvZiBJdFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9wZXJzb25hbC1maW5hbmNlL21ha2UtdGhlLW1vc3Qtb2YtaXRcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvOGM5MTU5ZGUtMmZmMC0xMWUyLWFlN2QtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI4YzkxNTlkZS0yZmYwLTExZTItYWU3ZC0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIk1hcmtldHMgSW5zaWdodFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9tYXJrZXRzL2luc2lnaHRcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMTJkYzA2YzYtMmIyMi0xMWUxLThhMzgtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIxMmRjMDZjNi0yYjIyLTExZTEtOGEzOC0wMDE0NGZlYWJkYzBcIn1dLFwidXVpZFwiOlwiMTNkZmUxYzYtZmM3Yy0xMWRmLWE5YzUtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpJbnZlc3RtZW50c1wifSx7XCJ0aXRsZVwiOlwiVHJhZGluZ1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9wZXJzb25hbC1maW5hbmNlL3RyYWRpbmctaHViXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzk2OTcyZmJlLTA4Y2UtMTFlMy04YjMyLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiOTY5NzJmYmUtMDhjZS0xMWUzLThiMzItMDAxNDRmZWFiZGMwXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpUcmFkaW5nIEh1YlwifSx7XCJ0aXRsZVwiOlwiVGF4XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3BlcnNvbmFsLWZpbmFuY2UvdGF4XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzFlYzc1ZjRjLWZjN2MtMTFkZi1hOWM1LTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMWVjNzVmNGMtZmM3Yy0xMWRmLWE5YzUtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpUYXhcIn0se1widGl0bGVcIjpcIk1vbmV5IE1hdHRlcnNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vcGVyc29uYWwtZmluYW5jZS9tb25leS1tYXR0ZXJzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzBjYWNmOGM2LWZjN2MtMTFkZi1hOWM1LTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJUb3AgVGlwc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9wZXJzb25hbC1maW5hbmNlL21vbmV5LW1hdHRlcnMvdG9wLXRpcHNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMDcxOGU5NGMtZmM3Yy0xMWRmLWE5YzUtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIwNzE4ZTk0Yy1mYzdjLTExZGYtYTljNS0wMDE0NGZlYWI0OWFcIn1dLFwidXVpZFwiOlwiMGNhY2Y4YzYtZmM3Yy0xMWRmLWE5YzUtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpNb25leSBNYXR0ZXJzXCJ9XSxcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOnBlcnNvbmFsIGZpbmFuY2VcIn0se1widGl0bGVcIjpcIkxpZmUgJiBBcnRzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2xpZmUtYXJ0c1wiLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJNYWdhemluZVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9tYWdhemluZVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9jMWUyZWE3MC05NjZmLTExZGYtOWNhYS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImMxZTJlYTcwLTk2NmYtMTFkZi05Y2FhLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6RlQgTWFnYXppbmVcIn0se1widGl0bGVcIjpcIkx1bmNoIHdpdGggdGhlIEZUXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2xpZmUtYXJ0cy9sdW5jaC13aXRoLXRoZS1mdFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy81OTAyMjk3NC0zYmE3LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjU5MDIyOTc0LTNiYTctMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6THVuY2ggd2l0aCB0aGUgRlRcIn0se1widGl0bGVcIjpcIlN0eWxlXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2xpZmUtYXJ0cy9zdHlsZVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8yOWVjYWNiMi1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjI5ZWNhY2IyLWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6U3R5bGVcIn0se1widGl0bGVcIjpcIlRyYXZlbFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS90cmF2ZWxcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMWE1ZGEzYmMtODliMy0xMWRmLTllYTYtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIlVLXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3RyYXZlbC91a1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy81NjBkN2QyMi00YTZjLTExZTAtODJhYi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjU2MGQ3ZDIyLTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiTm9ydGggQW1lcmljYVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS90cmF2ZWwvbm9ydGgtYW1lcmljYVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8zYWM3ZjJjYy00YTZjLTExZTAtODJhYi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjNhYzdmMmNjLTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiRXVyb3BlXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3RyYXZlbC9ldXJvcGVcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMzgzOWQwMGMtNGE2Yy0xMWUwLTgyYWItMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIzODM5ZDAwYy00YTZjLTExZTAtODJhYi0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkFzaWEgJiBBdXN0cmFsaWFcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vdHJhdmVsL2FzaWEtYXVzdHJhbGlhXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzQwYTVlOTljLTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNDBhNWU5OWMtNGE2Yy0xMWUwLTgyYWItMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJBZnJpY2FcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vdHJhdmVsL2FmcmljYVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy81M2JiNDNkOC00YTZjLTExZTAtODJhYi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjUzYmI0M2Q4LTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiQW1lcmljYXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vdHJhdmVsL2FtZXJpY2FzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzIzZGFhMDIyLTJmYWItMTFlMC04MzRmLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMjNkYWEwMjItMmZhYi0xMWUwLTgzNGYtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJMdXh1cnlcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vdHJhdmVsL2x1eHVyeVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy81ODI4ZjNkZS00YTZjLTExZTAtODJhYi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjU4MjhmM2RlLTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiQWR2ZW50dXJlc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS90cmF2ZWwvYWR2ZW50dXJlc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy84ZTA4MmEyYS0yZWRjLTExZTAtOTg3Ny0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjhlMDgyYTJhLTJlZGMtMTFlMC05ODc3LTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiQ3ljbGluZyBBZHZlbnR1cmVzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3RyYXZlbC9jeWNsaW5nLWFkdmVudHVyZXNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNjc3NzgwNzItZjBjMS0xMWUzLTllMjYtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI2Nzc3ODA3Mi1mMGMxLTExZTMtOWUyNi0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIldpbnRlciBTcG9ydHNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vdHJhdmVsL3dpbnRlci1zcG9ydHNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNDJkZDRlZWUtNGE2Yy0xMWUwLTgyYWItMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI0MmRkNGVlZS00YTZjLTExZTAtODJhYi0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkZhbWlseVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS90cmF2ZWwvZmFtaWx5XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzVhMzg2YmQyLTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNWEzODZiZDItNGE2Yy0xMWUwLTgyYWItMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJDaXR5IEJyZWFrc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS90cmF2ZWwvY2l0eS1icmVha3NcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNDRmYTljZWEtNGE2Yy0xMWUwLTgyYWItMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI0NGZhOWNlYS00YTZjLTExZTAtODJhYi0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkdyZWF0IEpvdXJuZXlzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3RyYXZlbC9ncmVhdC1qb3VybmV5c1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8zNTU0MmNhMC0xYWQyLTExZTMtODdkYS0wMDE0NGZlYWI3ZGVcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjM1NTQyY2EwLTFhZDItMTFlMy04N2RhLTAwMTQ0ZmVhYjdkZVwifV0sXCJ1dWlkXCI6XCIxYTVkYTNiYy04OWIzLTExZGYtOWVhNi0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOlRyYXZlbFwifSx7XCJ0aXRsZVwiOlwiQ29sdW1uc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9saWZlLWFydHMvY29sdW1uaXN0c1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy84MDVkYjQ0OC1hMGNlLTExZTEtODUxZi0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjgwNWRiNDQ4LWEwY2UtMTFlMS04NTFmLTAwMTQ0ZmVhYmRjMFwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6V2Vla2VuZCBDb2x1bW5pc3RzXCJ9XSxcIm5leHRVcmxcIjpudWxsfV0sXCJjb2RlXCI6MjAwfSJdfQ==
