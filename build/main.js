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
	if (parseInt(notifications.count, 10) > 0) {
		document.querySelector('.notify-badge').textContent = "("+notifications.count+")";
	}
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
		myFtButton.insertAdjacentHTML('beforeend', ' <span class="notify-badge"></span>');
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi9vcHQvYm94ZW4vbm9kZW52L3ZlcnNpb25zL3YwLjEwLjI2L2xpYi9ub2RlX21vZHVsZXMvb3JpZ2FtaS1idWlsZC10b29scy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9ib3dlcl9jb21wb25lbnRzL2RvbS1kZWxlZ2F0ZS9saWIvZGVsZWdhdGUuanMiLCIvVXNlcnMvbWFuZHJld3Mvc2FuZGJveGVzL25leHQtaGVhZGVyL2Jvd2VyX2NvbXBvbmVudHMvbmV4dC11c2VyLW1vZGVsLWNvbXBvbmVudC9tYWluLmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9ib3dlcl9jb21wb25lbnRzL25leHQtdXNlci1tb2RlbC1jb21wb25lbnQvc3JjL21vZGVscy9Vc2VyLmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9ib3dlcl9jb21wb25lbnRzL25leHQtdXNlci1wcmVmZXJlbmNlcy9zcmMvbGliL0xpc3QuanMiLCIvVXNlcnMvbWFuZHJld3Mvc2FuZGJveGVzL25leHQtaGVhZGVyL2Jvd2VyX2NvbXBvbmVudHMvbmV4dC11c2VyLXByZWZlcmVuY2VzL3NyYy9saWIvTm90aWZpY2F0aW9uUG9sbGVyLmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9ib3dlcl9jb21wb25lbnRzL25leHQtdXNlci1wcmVmZXJlbmNlcy9zcmMvbGliL1VzZXJQcmVmcy5qcyIsIi9Vc2Vycy9tYW5kcmV3cy9zYW5kYm94ZXMvbmV4dC1oZWFkZXIvYm93ZXJfY29tcG9uZW50cy9uZXh0LXVzZXItcHJlZmVyZW5jZXMvc3JjL21haW4uanMiLCIvVXNlcnMvbWFuZHJld3Mvc2FuZGJveGVzL25leHQtaGVhZGVyL2Jvd2VyX2NvbXBvbmVudHMvbmV4dC11c2VyLXByZWZlcmVuY2VzL3NyYy92ZW5kb3IvcmVxd2VzdC5taW4uanMiLCIvVXNlcnMvbWFuZHJld3Mvc2FuZGJveGVzL25leHQtaGVhZGVyL2Jvd2VyX2NvbXBvbmVudHMvcmVxd2VzdC9yZXF3ZXN0LmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9tYWluLmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9zcmMvanMvTm90aWZ5LmpzIiwiL1VzZXJzL21hbmRyZXdzL3NhbmRib3hlcy9uZXh0LWhlYWRlci9zcmMvdWJlci1pbmRleC5qc29uIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN2FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0RUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2bUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9KQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekZBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3Rocm93IG5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIil9dmFyIGY9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGYuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sZixmLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qanNoaW50IGJyb3dzZXI6dHJ1ZSwgbm9kZTp0cnVlKi9cblxuJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IERlbGVnYXRlO1xuXG4vKipcbiAqIERPTSBldmVudCBkZWxlZ2F0b3JcbiAqXG4gKiBUaGUgZGVsZWdhdG9yIHdpbGwgbGlzdGVuXG4gKiBmb3IgZXZlbnRzIHRoYXQgYnViYmxlIHVwXG4gKiB0byB0aGUgcm9vdCBub2RlLlxuICpcbiAqIEBjb25zdHJ1Y3RvclxuICogQHBhcmFtIHtOb2RlfHN0cmluZ30gW3Jvb3RdIFRoZSByb290IG5vZGUgb3IgYSBzZWxlY3RvciBzdHJpbmcgbWF0Y2hpbmcgdGhlIHJvb3Qgbm9kZVxuICovXG5mdW5jdGlvbiBEZWxlZ2F0ZShyb290KSB7XG5cbiAgLyoqXG4gICAqIE1haW50YWluIGEgbWFwIG9mIGxpc3RlbmVyXG4gICAqIGxpc3RzLCBrZXllZCBieSBldmVudCBuYW1lLlxuICAgKlxuICAgKiBAdHlwZSBPYmplY3RcbiAgICovXG4gIHRoaXMubGlzdGVuZXJNYXAgPSBbe30sIHt9XTtcbiAgaWYgKHJvb3QpIHtcbiAgICB0aGlzLnJvb3Qocm9vdCk7XG4gIH1cblxuICAvKiogQHR5cGUgZnVuY3Rpb24oKSAqL1xuICB0aGlzLmhhbmRsZSA9IERlbGVnYXRlLnByb3RvdHlwZS5oYW5kbGUuYmluZCh0aGlzKTtcbn1cblxuLyoqXG4gKiBTdGFydCBsaXN0ZW5pbmcgZm9yIGV2ZW50c1xuICogb24gdGhlIHByb3ZpZGVkIERPTSBlbGVtZW50XG4gKlxuICogQHBhcmFtICB7Tm9kZXxzdHJpbmd9IFtyb290XSBUaGUgcm9vdCBub2RlIG9yIGEgc2VsZWN0b3Igc3RyaW5nIG1hdGNoaW5nIHRoZSByb290IG5vZGVcbiAqIEByZXR1cm5zIHtEZWxlZ2F0ZX0gVGhpcyBtZXRob2QgaXMgY2hhaW5hYmxlXG4gKi9cbkRlbGVnYXRlLnByb3RvdHlwZS5yb290ID0gZnVuY3Rpb24ocm9vdCkge1xuICB2YXIgbGlzdGVuZXJNYXAgPSB0aGlzLmxpc3RlbmVyTWFwO1xuICB2YXIgZXZlbnRUeXBlO1xuXG4gIC8vIFJlbW92ZSBtYXN0ZXIgZXZlbnQgbGlzdGVuZXJzXG4gIGlmICh0aGlzLnJvb3RFbGVtZW50KSB7XG4gICAgZm9yIChldmVudFR5cGUgaW4gbGlzdGVuZXJNYXBbMV0pIHtcbiAgICAgIGlmIChsaXN0ZW5lck1hcFsxXS5oYXNPd25Qcm9wZXJ0eShldmVudFR5cGUpKSB7XG4gICAgICAgIHRoaXMucm9vdEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMuaGFuZGxlLCB0cnVlKTtcbiAgICAgIH1cbiAgICB9XG4gICAgZm9yIChldmVudFR5cGUgaW4gbGlzdGVuZXJNYXBbMF0pIHtcbiAgICAgIGlmIChsaXN0ZW5lck1hcFswXS5oYXNPd25Qcm9wZXJ0eShldmVudFR5cGUpKSB7XG4gICAgICAgIHRoaXMucm9vdEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMuaGFuZGxlLCBmYWxzZSk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgLy8gSWYgbm8gcm9vdCBvciByb290IGlzIG5vdFxuICAvLyBhIGRvbSBub2RlLCB0aGVuIHJlbW92ZSBpbnRlcm5hbFxuICAvLyByb290IHJlZmVyZW5jZSBhbmQgZXhpdCBoZXJlXG4gIGlmICghcm9vdCB8fCAhcm9vdC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgaWYgKHRoaXMucm9vdEVsZW1lbnQpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLnJvb3RFbGVtZW50O1xuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8qKlxuICAgKiBUaGUgcm9vdCBub2RlIGF0IHdoaWNoXG4gICAqIGxpc3RlbmVycyBhcmUgYXR0YWNoZWQuXG4gICAqXG4gICAqIEB0eXBlIE5vZGVcbiAgICovXG4gIHRoaXMucm9vdEVsZW1lbnQgPSByb290O1xuXG4gIC8vIFNldCB1cCBtYXN0ZXIgZXZlbnQgbGlzdGVuZXJzXG4gIGZvciAoZXZlbnRUeXBlIGluIGxpc3RlbmVyTWFwWzFdKSB7XG4gICAgaWYgKGxpc3RlbmVyTWFwWzFdLmhhc093blByb3BlcnR5KGV2ZW50VHlwZSkpIHtcbiAgICAgIHRoaXMucm9vdEVsZW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMuaGFuZGxlLCB0cnVlKTtcbiAgICB9XG4gIH1cbiAgZm9yIChldmVudFR5cGUgaW4gbGlzdGVuZXJNYXBbMF0pIHtcbiAgICBpZiAobGlzdGVuZXJNYXBbMF0uaGFzT3duUHJvcGVydHkoZXZlbnRUeXBlKSkge1xuICAgICAgdGhpcy5yb290RWxlbWVudC5hZGRFdmVudExpc3RlbmVyKGV2ZW50VHlwZSwgdGhpcy5oYW5kbGUsIGZhbHNlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50VHlwZVxuICogQHJldHVybnMgYm9vbGVhblxuICovXG5EZWxlZ2F0ZS5wcm90b3R5cGUuY2FwdHVyZUZvclR5cGUgPSBmdW5jdGlvbihldmVudFR5cGUpIHtcbiAgcmV0dXJuIFsnYmx1cicsICdlcnJvcicsICdmb2N1cycsICdsb2FkJywgJ3Jlc2l6ZScsICdzY3JvbGwnXS5pbmRleE9mKGV2ZW50VHlwZSkgIT09IC0xO1xufTtcblxuLyoqXG4gKiBBdHRhY2ggYSBoYW5kbGVyIHRvIG9uZVxuICogZXZlbnQgZm9yIGFsbCBlbGVtZW50c1xuICogdGhhdCBtYXRjaCB0aGUgc2VsZWN0b3IsXG4gKiBub3cgb3IgaW4gdGhlIGZ1dHVyZVxuICpcbiAqIFRoZSBoYW5kbGVyIGZ1bmN0aW9uIHJlY2VpdmVzXG4gKiB0aHJlZSBhcmd1bWVudHM6IHRoZSBET00gZXZlbnRcbiAqIG9iamVjdCwgdGhlIG5vZGUgdGhhdCBtYXRjaGVkXG4gKiB0aGUgc2VsZWN0b3Igd2hpbGUgdGhlIGV2ZW50XG4gKiB3YXMgYnViYmxpbmcgYW5kIGEgcmVmZXJlbmNlXG4gKiB0byBpdHNlbGYuIFdpdGhpbiB0aGUgaGFuZGxlcixcbiAqICd0aGlzJyBpcyBlcXVhbCB0byB0aGUgc2Vjb25kXG4gKiBhcmd1bWVudC5cbiAqXG4gKiBUaGUgbm9kZSB0aGF0IGFjdHVhbGx5IHJlY2VpdmVkXG4gKiB0aGUgZXZlbnQgY2FuIGJlIGFjY2Vzc2VkIHZpYVxuICogJ2V2ZW50LnRhcmdldCcuXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IGV2ZW50VHlwZSBMaXN0ZW4gZm9yIHRoZXNlIGV2ZW50c1xuICogQHBhcmFtIHtzdHJpbmd8dW5kZWZpbmVkfSBzZWxlY3RvciBPbmx5IGhhbmRsZSBldmVudHMgb24gZWxlbWVudHMgbWF0Y2hpbmcgdGhpcyBzZWxlY3RvciwgaWYgdW5kZWZpbmVkIG1hdGNoIHJvb3QgZWxlbWVudFxuICogQHBhcmFtIHtmdW5jdGlvbigpfSBoYW5kbGVyIEhhbmRsZXIgZnVuY3Rpb24gLSBldmVudCBkYXRhIHBhc3NlZCBoZXJlIHdpbGwgYmUgaW4gZXZlbnQuZGF0YVxuICogQHBhcmFtIHtPYmplY3R9IFtldmVudERhdGFdIERhdGEgdG8gcGFzcyBpbiBldmVudC5kYXRhXG4gKiBAcmV0dXJucyB7RGVsZWdhdGV9IFRoaXMgbWV0aG9kIGlzIGNoYWluYWJsZVxuICovXG5EZWxlZ2F0ZS5wcm90b3R5cGUub24gPSBmdW5jdGlvbihldmVudFR5cGUsIHNlbGVjdG9yLCBoYW5kbGVyLCB1c2VDYXB0dXJlKSB7XG4gIHZhciByb290LCBsaXN0ZW5lck1hcCwgbWF0Y2hlciwgbWF0Y2hlclBhcmFtO1xuXG4gIGlmICghZXZlbnRUeXBlKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSW52YWxpZCBldmVudCB0eXBlOiAnICsgZXZlbnRUeXBlKTtcbiAgfVxuXG4gIC8vIGhhbmRsZXIgY2FuIGJlIHBhc3NlZCBhc1xuICAvLyB0aGUgc2Vjb25kIG9yIHRoaXJkIGFyZ3VtZW50XG4gIGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICB1c2VDYXB0dXJlID0gaGFuZGxlcjtcbiAgICBoYW5kbGVyID0gc2VsZWN0b3I7XG4gICAgc2VsZWN0b3IgPSBudWxsO1xuICB9XG5cbiAgLy8gRmFsbGJhY2sgdG8gc2Vuc2libGUgZGVmYXVsdHNcbiAgLy8gaWYgdXNlQ2FwdHVyZSBub3Qgc2V0XG4gIGlmICh1c2VDYXB0dXJlID09PSB1bmRlZmluZWQpIHtcbiAgICB1c2VDYXB0dXJlID0gdGhpcy5jYXB0dXJlRm9yVHlwZShldmVudFR5cGUpO1xuICB9XG5cbiAgaWYgKHR5cGVvZiBoYW5kbGVyICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcignSGFuZGxlciBtdXN0IGJlIGEgdHlwZSBvZiBGdW5jdGlvbicpO1xuICB9XG5cbiAgcm9vdCA9IHRoaXMucm9vdEVsZW1lbnQ7XG4gIGxpc3RlbmVyTWFwID0gdGhpcy5saXN0ZW5lck1hcFt1c2VDYXB0dXJlID8gMSA6IDBdO1xuXG4gIC8vIEFkZCBtYXN0ZXIgaGFuZGxlciBmb3IgdHlwZSBpZiBub3QgY3JlYXRlZCB5ZXRcbiAgaWYgKCFsaXN0ZW5lck1hcFtldmVudFR5cGVdKSB7XG4gICAgaWYgKHJvb3QpIHtcbiAgICAgIHJvb3QuYWRkRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMuaGFuZGxlLCB1c2VDYXB0dXJlKTtcbiAgICB9XG4gICAgbGlzdGVuZXJNYXBbZXZlbnRUeXBlXSA9IFtdO1xuICB9XG5cbiAgaWYgKCFzZWxlY3Rvcikge1xuICAgIG1hdGNoZXJQYXJhbSA9IG51bGw7XG5cbiAgICAvLyBDT01QTEVYIC0gbWF0Y2hlc1Jvb3QgbmVlZHMgdG8gaGF2ZSBhY2Nlc3MgdG9cbiAgICAvLyB0aGlzLnJvb3RFbGVtZW50LCBzbyBiaW5kIHRoZSBmdW5jdGlvbiB0byB0aGlzLlxuICAgIG1hdGNoZXIgPSBtYXRjaGVzUm9vdC5iaW5kKHRoaXMpO1xuXG4gIC8vIENvbXBpbGUgYSBtYXRjaGVyIGZvciB0aGUgZ2l2ZW4gc2VsZWN0b3JcbiAgfSBlbHNlIGlmICgvXlthLXpdKyQvaS50ZXN0KHNlbGVjdG9yKSkge1xuICAgIG1hdGNoZXJQYXJhbSA9IHNlbGVjdG9yO1xuICAgIG1hdGNoZXIgPSBtYXRjaGVzVGFnO1xuICB9IGVsc2UgaWYgKC9eI1thLXowLTlcXC1fXSskL2kudGVzdChzZWxlY3RvcikpIHtcbiAgICBtYXRjaGVyUGFyYW0gPSBzZWxlY3Rvci5zbGljZSgxKTtcbiAgICBtYXRjaGVyID0gbWF0Y2hlc0lkO1xuICB9IGVsc2Uge1xuICAgIG1hdGNoZXJQYXJhbSA9IHNlbGVjdG9yO1xuICAgIG1hdGNoZXIgPSBtYXRjaGVzO1xuICB9XG5cbiAgLy8gQWRkIHRvIHRoZSBsaXN0IG9mIGxpc3RlbmVyc1xuICBsaXN0ZW5lck1hcFtldmVudFR5cGVdLnB1c2goe1xuICAgIHNlbGVjdG9yOiBzZWxlY3RvcixcbiAgICBoYW5kbGVyOiBoYW5kbGVyLFxuICAgIG1hdGNoZXI6IG1hdGNoZXIsXG4gICAgbWF0Y2hlclBhcmFtOiBtYXRjaGVyUGFyYW1cbiAgfSk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSBhbiBldmVudCBoYW5kbGVyXG4gKiBmb3IgZWxlbWVudHMgdGhhdCBtYXRjaFxuICogdGhlIHNlbGVjdG9yLCBmb3JldmVyXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IFtldmVudFR5cGVdIFJlbW92ZSBoYW5kbGVycyBmb3IgZXZlbnRzIG1hdGNoaW5nIHRoaXMgdHlwZSwgY29uc2lkZXJpbmcgdGhlIG90aGVyIHBhcmFtZXRlcnNcbiAqIEBwYXJhbSB7c3RyaW5nfSBbc2VsZWN0b3JdIElmIHRoaXMgcGFyYW1ldGVyIGlzIG9taXR0ZWQsIG9ubHkgaGFuZGxlcnMgd2hpY2ggbWF0Y2ggdGhlIG90aGVyIHR3byB3aWxsIGJlIHJlbW92ZWRcbiAqIEBwYXJhbSB7ZnVuY3Rpb24oKX0gW2hhbmRsZXJdIElmIHRoaXMgcGFyYW1ldGVyIGlzIG9taXR0ZWQsIG9ubHkgaGFuZGxlcnMgd2hpY2ggbWF0Y2ggdGhlIHByZXZpb3VzIHR3byB3aWxsIGJlIHJlbW92ZWRcbiAqIEByZXR1cm5zIHtEZWxlZ2F0ZX0gVGhpcyBtZXRob2QgaXMgY2hhaW5hYmxlXG4gKi9cbkRlbGVnYXRlLnByb3RvdHlwZS5vZmYgPSBmdW5jdGlvbihldmVudFR5cGUsIHNlbGVjdG9yLCBoYW5kbGVyLCB1c2VDYXB0dXJlKSB7XG4gIHZhciBpLCBsaXN0ZW5lciwgbGlzdGVuZXJNYXAsIGxpc3RlbmVyTGlzdCwgc2luZ2xlRXZlbnRUeXBlO1xuXG4gIC8vIEhhbmRsZXIgY2FuIGJlIHBhc3NlZCBhc1xuICAvLyB0aGUgc2Vjb25kIG9yIHRoaXJkIGFyZ3VtZW50XG4gIGlmICh0eXBlb2Ygc2VsZWN0b3IgPT09ICdmdW5jdGlvbicpIHtcbiAgICB1c2VDYXB0dXJlID0gaGFuZGxlcjtcbiAgICBoYW5kbGVyID0gc2VsZWN0b3I7XG4gICAgc2VsZWN0b3IgPSBudWxsO1xuICB9XG5cbiAgLy8gSWYgdXNlQ2FwdHVyZSBub3Qgc2V0LCByZW1vdmVcbiAgLy8gYWxsIGV2ZW50IGxpc3RlbmVyc1xuICBpZiAodXNlQ2FwdHVyZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgdGhpcy5vZmYoZXZlbnRUeXBlLCBzZWxlY3RvciwgaGFuZGxlciwgdHJ1ZSk7XG4gICAgdGhpcy5vZmYoZXZlbnRUeXBlLCBzZWxlY3RvciwgaGFuZGxlciwgZmFsc2UpO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJNYXAgPSB0aGlzLmxpc3RlbmVyTWFwW3VzZUNhcHR1cmUgPyAxIDogMF07XG4gIGlmICghZXZlbnRUeXBlKSB7XG4gICAgZm9yIChzaW5nbGVFdmVudFR5cGUgaW4gbGlzdGVuZXJNYXApIHtcbiAgICAgIGlmIChsaXN0ZW5lck1hcC5oYXNPd25Qcm9wZXJ0eShzaW5nbGVFdmVudFR5cGUpKSB7XG4gICAgICAgIHRoaXMub2ZmKHNpbmdsZUV2ZW50VHlwZSwgc2VsZWN0b3IsIGhhbmRsZXIpO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgbGlzdGVuZXJMaXN0ID0gbGlzdGVuZXJNYXBbZXZlbnRUeXBlXTtcbiAgaWYgKCFsaXN0ZW5lckxpc3QgfHwgIWxpc3RlbmVyTGlzdC5sZW5ndGgpIHtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIFJlbW92ZSBvbmx5IHBhcmFtZXRlciBtYXRjaGVzXG4gIC8vIGlmIHNwZWNpZmllZFxuICBmb3IgKGkgPSBsaXN0ZW5lckxpc3QubGVuZ3RoIC0gMTsgaSA+PSAwOyBpLS0pIHtcbiAgICBsaXN0ZW5lciA9IGxpc3RlbmVyTGlzdFtpXTtcblxuICAgIGlmICgoIXNlbGVjdG9yIHx8IHNlbGVjdG9yID09PSBsaXN0ZW5lci5zZWxlY3RvcikgJiYgKCFoYW5kbGVyIHx8IGhhbmRsZXIgPT09IGxpc3RlbmVyLmhhbmRsZXIpKSB7XG4gICAgICBsaXN0ZW5lckxpc3Quc3BsaWNlKGksIDEpO1xuICAgIH1cbiAgfVxuXG4gIC8vIEFsbCBsaXN0ZW5lcnMgcmVtb3ZlZFxuICBpZiAoIWxpc3RlbmVyTGlzdC5sZW5ndGgpIHtcbiAgICBkZWxldGUgbGlzdGVuZXJNYXBbZXZlbnRUeXBlXTtcblxuICAgIC8vIFJlbW92ZSB0aGUgbWFpbiBoYW5kbGVyXG4gICAgaWYgKHRoaXMucm9vdEVsZW1lbnQpIHtcbiAgICAgIHRoaXMucm9vdEVsZW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcihldmVudFR5cGUsIHRoaXMuaGFuZGxlLCB1c2VDYXB0dXJlKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cblxuLyoqXG4gKiBIYW5kbGUgYW4gYXJiaXRyYXJ5IGV2ZW50LlxuICpcbiAqIEBwYXJhbSB7RXZlbnR9IGV2ZW50XG4gKi9cbkRlbGVnYXRlLnByb3RvdHlwZS5oYW5kbGUgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgaSwgbCwgdHlwZSA9IGV2ZW50LnR5cGUsIHJvb3QsIHBoYXNlLCBsaXN0ZW5lciwgcmV0dXJuZWQsIGxpc3RlbmVyTGlzdCA9IFtdLCB0YXJnZXQsIC8qKiBAY29uc3QgKi8gRVZFTlRJR05PUkUgPSAnZnRMYWJzRGVsZWdhdGVJZ25vcmUnO1xuXG4gIGlmIChldmVudFtFVkVOVElHTk9SRV0gPT09IHRydWUpIHtcbiAgICByZXR1cm47XG4gIH1cblxuICB0YXJnZXQgPSBldmVudC50YXJnZXQ7XG5cbiAgLy8gSGFyZGNvZGUgdmFsdWUgb2YgTm9kZS5URVhUX05PREVcbiAgLy8gYXMgbm90IGRlZmluZWQgaW4gSUU4XG4gIGlmICh0YXJnZXQubm9kZVR5cGUgPT09IDMpIHtcbiAgICB0YXJnZXQgPSB0YXJnZXQucGFyZW50Tm9kZTtcbiAgfVxuXG4gIHJvb3QgPSB0aGlzLnJvb3RFbGVtZW50O1xuXG4gIHBoYXNlID0gZXZlbnQuZXZlbnRQaGFzZSB8fCAoIGV2ZW50LnRhcmdldCAhPT0gZXZlbnQuY3VycmVudFRhcmdldCA/IDMgOiAyICk7XG4gIFxuICBzd2l0Y2ggKHBoYXNlKSB7XG4gICAgY2FzZSAxOiAvL0V2ZW50LkNBUFRVUklOR19QSEFTRTpcbiAgICAgIGxpc3RlbmVyTGlzdCA9IHRoaXMubGlzdGVuZXJNYXBbMV1bdHlwZV07XG4gICAgYnJlYWs7XG4gICAgY2FzZSAyOiAvL0V2ZW50LkFUX1RBUkdFVDpcbiAgICAgIGlmICh0aGlzLmxpc3RlbmVyTWFwWzBdICYmIHRoaXMubGlzdGVuZXJNYXBbMF1bdHlwZV0pIGxpc3RlbmVyTGlzdCA9IGxpc3RlbmVyTGlzdC5jb25jYXQodGhpcy5saXN0ZW5lck1hcFswXVt0eXBlXSk7XG4gICAgICBpZiAodGhpcy5saXN0ZW5lck1hcFsxXSAmJiB0aGlzLmxpc3RlbmVyTWFwWzFdW3R5cGVdKSBsaXN0ZW5lckxpc3QgPSBsaXN0ZW5lckxpc3QuY29uY2F0KHRoaXMubGlzdGVuZXJNYXBbMV1bdHlwZV0pO1xuICAgIGJyZWFrO1xuICAgIGNhc2UgMzogLy9FdmVudC5CVUJCTElOR19QSEFTRTpcbiAgICAgIGxpc3RlbmVyTGlzdCA9IHRoaXMubGlzdGVuZXJNYXBbMF1bdHlwZV07XG4gICAgYnJlYWs7XG4gIH1cblxuICAvLyBOZWVkIHRvIGNvbnRpbnVvdXNseSBjaGVja1xuICAvLyB0aGF0IHRoZSBzcGVjaWZpYyBsaXN0IGlzXG4gIC8vIHN0aWxsIHBvcHVsYXRlZCBpbiBjYXNlIG9uZVxuICAvLyBvZiB0aGUgY2FsbGJhY2tzIGFjdHVhbGx5XG4gIC8vIGNhdXNlcyB0aGUgbGlzdCB0byBiZSBkZXN0cm95ZWQuXG4gIGwgPSBsaXN0ZW5lckxpc3QubGVuZ3RoO1xuICB3aGlsZSAodGFyZ2V0ICYmIGwpIHtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbDsgaSsrKSB7XG4gICAgICBsaXN0ZW5lciA9IGxpc3RlbmVyTGlzdFtpXTtcblxuICAgICAgLy8gQmFpbCBmcm9tIHRoaXMgbG9vcCBpZlxuICAgICAgLy8gdGhlIGxlbmd0aCBjaGFuZ2VkIGFuZFxuICAgICAgLy8gbm8gbW9yZSBsaXN0ZW5lcnMgYXJlXG4gICAgICAvLyBkZWZpbmVkIGJldHdlZW4gaSBhbmQgbC5cbiAgICAgIGlmICghbGlzdGVuZXIpIHtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG5cbiAgICAgIC8vIENoZWNrIGZvciBtYXRjaCBhbmQgZmlyZVxuICAgICAgLy8gdGhlIGV2ZW50IGlmIHRoZXJlJ3Mgb25lXG4gICAgICAvL1xuICAgICAgLy8gVE9ETzpNQ0c6MjAxMjAxMTc6IE5lZWQgYSB3YXlcbiAgICAgIC8vIHRvIGNoZWNrIGlmIGV2ZW50I3N0b3BJbW1lZGlhdGVQcm9wYWdhdGlvblxuICAgICAgLy8gd2FzIGNhbGxlZC4gSWYgc28sIGJyZWFrIGJvdGggbG9vcHMuXG4gICAgICBpZiAobGlzdGVuZXIubWF0Y2hlci5jYWxsKHRhcmdldCwgbGlzdGVuZXIubWF0Y2hlclBhcmFtLCB0YXJnZXQpKSB7XG4gICAgICAgIHJldHVybmVkID0gdGhpcy5maXJlKGV2ZW50LCB0YXJnZXQsIGxpc3RlbmVyKTtcbiAgICAgIH1cblxuICAgICAgLy8gU3RvcCBwcm9wYWdhdGlvbiB0byBzdWJzZXF1ZW50XG4gICAgICAvLyBjYWxsYmFja3MgaWYgdGhlIGNhbGxiYWNrIHJldHVybmVkXG4gICAgICAvLyBmYWxzZVxuICAgICAgaWYgKHJldHVybmVkID09PSBmYWxzZSkge1xuICAgICAgICBldmVudFtFVkVOVElHTk9SRV0gPSB0cnVlO1xuICAgICAgICBldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVE9ETzpNQ0c6MjAxMjAxMTc6IE5lZWQgYSB3YXkgdG9cbiAgICAvLyBjaGVjayBpZiBldmVudCNzdG9wUHJvcGFnYXRpb25cbiAgICAvLyB3YXMgY2FsbGVkLiBJZiBzbywgYnJlYWsgbG9vcGluZ1xuICAgIC8vIHRocm91Z2ggdGhlIERPTS4gU3RvcCBpZiB0aGVcbiAgICAvLyBkZWxlZ2F0aW9uIHJvb3QgaGFzIGJlZW4gcmVhY2hlZFxuICAgIGlmICh0YXJnZXQgPT09IHJvb3QpIHtcbiAgICAgIGJyZWFrO1xuICAgIH1cblxuICAgIGwgPSBsaXN0ZW5lckxpc3QubGVuZ3RoO1xuICAgIHRhcmdldCA9IHRhcmdldC5wYXJlbnRFbGVtZW50O1xuICB9XG59O1xuXG4vKipcbiAqIEZpcmUgYSBsaXN0ZW5lciBvbiBhIHRhcmdldC5cbiAqXG4gKiBAcGFyYW0ge0V2ZW50fSBldmVudFxuICogQHBhcmFtIHtOb2RlfSB0YXJnZXRcbiAqIEBwYXJhbSB7T2JqZWN0fSBsaXN0ZW5lclxuICogQHJldHVybnMge2Jvb2xlYW59XG4gKi9cbkRlbGVnYXRlLnByb3RvdHlwZS5maXJlID0gZnVuY3Rpb24oZXZlbnQsIHRhcmdldCwgbGlzdGVuZXIpIHtcbiAgcmV0dXJuIGxpc3RlbmVyLmhhbmRsZXIuY2FsbCh0YXJnZXQsIGV2ZW50LCB0YXJnZXQpO1xufTtcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGFuIGVsZW1lbnRcbiAqIG1hdGNoZXMgYSBnZW5lcmljIHNlbGVjdG9yLlxuICpcbiAqIEB0eXBlIGZ1bmN0aW9uKClcbiAqIEBwYXJhbSB7c3RyaW5nfSBzZWxlY3RvciBBIENTUyBzZWxlY3RvclxuICovXG52YXIgbWF0Y2hlcyA9IChmdW5jdGlvbihlbCkge1xuICBpZiAoIWVsKSByZXR1cm47XG4gIHZhciBwID0gZWwucHJvdG90eXBlO1xuICByZXR1cm4gKHAubWF0Y2hlcyB8fCBwLm1hdGNoZXNTZWxlY3RvciB8fCBwLndlYmtpdE1hdGNoZXNTZWxlY3RvciB8fCBwLm1vek1hdGNoZXNTZWxlY3RvciB8fCBwLm1zTWF0Y2hlc1NlbGVjdG9yIHx8IHAub01hdGNoZXNTZWxlY3Rvcik7XG59KEVsZW1lbnQpKTtcblxuLyoqXG4gKiBDaGVjayB3aGV0aGVyIGFuIGVsZW1lbnRcbiAqIG1hdGNoZXMgYSB0YWcgc2VsZWN0b3IuXG4gKlxuICogVGFncyBhcmUgTk9UIGNhc2Utc2Vuc2l0aXZlLFxuICogZXhjZXB0IGluIFhNTCAoYW5kIFhNTC1iYXNlZFxuICogbGFuZ3VhZ2VzIHN1Y2ggYXMgWEhUTUwpLlxuICpcbiAqIEBwYXJhbSB7c3RyaW5nfSB0YWdOYW1lIFRoZSB0YWcgbmFtZSB0byB0ZXN0IGFnYWluc3RcbiAqIEBwYXJhbSB7RWxlbWVudH0gZWxlbWVudCBUaGUgZWxlbWVudCB0byB0ZXN0IHdpdGhcbiAqIEByZXR1cm5zIGJvb2xlYW5cbiAqL1xuZnVuY3Rpb24gbWF0Y2hlc1RhZyh0YWdOYW1lLCBlbGVtZW50KSB7XG4gIHJldHVybiB0YWdOYW1lLnRvTG93ZXJDYXNlKCkgPT09IGVsZW1lbnQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xufVxuXG4vKipcbiAqIENoZWNrIHdoZXRoZXIgYW4gZWxlbWVudFxuICogbWF0Y2hlcyB0aGUgcm9vdC5cbiAqXG4gKiBAcGFyYW0gez9TdHJpbmd9IHNlbGVjdG9yIEluIHRoaXMgY2FzZSB0aGlzIGlzIGFsd2F5cyBwYXNzZWQgdGhyb3VnaCBhcyBudWxsIGFuZCBub3QgdXNlZFxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRvIHRlc3Qgd2l0aFxuICogQHJldHVybnMgYm9vbGVhblxuICovXG5mdW5jdGlvbiBtYXRjaGVzUm9vdChzZWxlY3RvciwgZWxlbWVudCkge1xuICAvKmpzaGludCB2YWxpZHRoaXM6dHJ1ZSovXG4gIGlmICh0aGlzLnJvb3RFbGVtZW50ID09PSB3aW5kb3cpIHJldHVybiBlbGVtZW50ID09PSBkb2N1bWVudDtcbiAgcmV0dXJuIHRoaXMucm9vdEVsZW1lbnQgPT09IGVsZW1lbnQ7XG59XG5cbi8qKlxuICogQ2hlY2sgd2hldGhlciB0aGUgSUQgb2ZcbiAqIHRoZSBlbGVtZW50IGluICd0aGlzJ1xuICogbWF0Y2hlcyB0aGUgZ2l2ZW4gSUQuXG4gKlxuICogSURzIGFyZSBjYXNlLXNlbnNpdGl2ZS5cbiAqXG4gKiBAcGFyYW0ge3N0cmluZ30gaWQgVGhlIElEIHRvIHRlc3QgYWdhaW5zdFxuICogQHBhcmFtIHtFbGVtZW50fSBlbGVtZW50IFRoZSBlbGVtZW50IHRvIHRlc3Qgd2l0aFxuICogQHJldHVybnMgYm9vbGVhblxuICovXG5mdW5jdGlvbiBtYXRjaGVzSWQoaWQsIGVsZW1lbnQpIHtcbiAgcmV0dXJuIGlkID09PSBlbGVtZW50LmlkO1xufVxuXG4vKipcbiAqIFNob3J0IGhhbmQgZm9yIG9mZigpXG4gKiBhbmQgcm9vdCgpLCBpZSBib3RoXG4gKiB3aXRoIG5vIHBhcmFtZXRlcnNcbiAqXG4gKiBAcmV0dXJuIHZvaWRcbiAqL1xuRGVsZWdhdGUucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgdGhpcy5vZmYoKTtcbiAgdGhpcy5yb290KCk7XG59O1xuIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL3NyYy9tb2RlbHMvVXNlcicpO1xuIiwiXG4vKipcbiAqIEVuY2Fwc3VsYXRlcyBhbiBGVCB1c2VyXG4gKi9cblxudmFyIFVzZXIgPSBmdW5jdGlvbiAoY29va2llKSB7XG4gICAgdGhpcy5jb29raWUgPSAoY29va2llKSA/ICc7JyArIGNvb2tpZSA6ICcnO1xufVxuXG4vLyBSZXR1cm5zIHRoZSBlUmlnaHRzIHVzZXIgaWRcblVzZXIucHJvdG90eXBlLmlkID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBwYXJ0cyA9IHRoaXMuY29va2llLnNwbGl0KFwiOyBGVF9VPVwiKTtcbiAgICB2YXIgZnRVID0gcGFydHMucG9wKCkuc3BsaXQoXCI7XCIpLnNoaWZ0KCk7XG4gICAgaWYoZnRVKSB7XG4gICAgICAgIHJldHVybiBmdFUubWF0Y2goL19FSUQ9KFxcZCspX1BJRC8pWzFdO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybjtcbiAgICB9XG59XG5cblVzZXIucHJvdG90eXBlLnNlc3Npb24gPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIHRoaXMuY29va2llLm1hdGNoKC9TS0VZPSguKylfUkkvKVsxXTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBVc2VyO1xuIiwiXG52YXIgcmVxd2VzdCA9IHJlcXVpcmUoJy4uL3ZlbmRvci9yZXF3ZXN0Lm1pbicpO1xudmFyIFVzZXIgICAgPSByZXF1aXJlKFwiLi8uLi8uLi8uLi9uZXh0LXVzZXItbW9kZWwtY29tcG9uZW50L21haW4uanNcIik7XG5cbnZhciBlbWl0ID0gZnVuY3Rpb24obmFtZSwgZGF0YSkge1xuICB2YXIgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcbiAgZXZlbnQuaW5pdEV2ZW50KG5hbWUsIHRydWUsIHRydWUpO1xuICBpZiAoZGF0YSkge1xuICAgIGV2ZW50LmRldGFpbCA9IGRhdGE7XG4gIH1cbiAgZG9jdW1lbnQuZGlzcGF0Y2hFdmVudChldmVudCk7XG59O1xuXG52YXIgTGlzdCA9IGZ1bmN0aW9uIChvcHRzKSB7XG4gICAgdGhpcy5uYW1lICA9IG9wdHMubmFtZTtcbiAgICB0aGlzLmFwaSA9ICdodHRwOi8vZnQtbmV4dC1hcGktdXNlci1wcmVmcy5oZXJva3VhcHAuY29tL3VzZXIvJztcbiAgICB0aGlzLnVzZXJJZCA9IG5ldyBVc2VyKGRvY3VtZW50LmNvb2tpZSkuaWQoKTtcbiAgICB0aGlzLnNlc3Npb24gPSBuZXcgVXNlcihkb2N1bWVudC5jb29raWUpLnNlc3Npb24oKTtcbn07XG5cbkxpc3QucHJvdG90eXBlLl9yZXF1ZXN0ID0gZnVuY3Rpb24obWV0aG9kLCBwYXlsb2FkLCBwYXRoKSB7XG4gICAgXG4gICAgY29uc29sZS5sb2cobWV0aG9kLCB0aGlzLmFwaSArIHRoaXMubmFtZSArICgocGF0aCkgPyAnLycgKyBwYXRoIDogJycpKTtcbiAgICByZXR1cm4gcmVxd2VzdCh7XG4gICAgICAgIHVybDogdGhpcy5hcGkgKyB0aGlzLm5hbWUgKyAoKHBhdGgpID8gJy8nICsgcGF0aCA6ICcnKSxcbiAgICAgICAgbWV0aG9kOiBtZXRob2QsXG4gICAgICAgIHR5cGU6ICdqc29uJyxcbiAgICAgICAgdGltZW91dDogNTAwMCxcbiAgICAgICAgZGF0YTogKHBheWxvYWQpID8gSlNPTi5zdHJpbmdpZnkocGF5bG9hZCkgOiAnJyxcbiAgICAgICAgY29udGVudFR5cGU6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ1gtRlQtVUlEJzogdGhpcy51c2VySWQsXG4gICAgICAgICAgICAnWC1GVC1TRVNTSU9OJzogdGhpcy5zZXNzaW9uXG4gICAgICAgIH0sXG4gICAgICAgIGNyb3NzT3JpZ2luOiB0cnVlXG4gICAgfSlcbn1cblxuXG5MaXN0LnByb3RvdHlwZS5mZXRjaCA9IGZ1bmN0aW9uICgpIHtcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgdGhpcy5fcmVxdWVzdCgnR0VUJylcbiAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHJlc3BvbnNlKSB7XG4gICAgICAgICAgICBlbWl0KHNlbGYubmFtZSArICc6bG9hZCcsIHJlc3BvbnNlKVxuICAgICAgICB9KSAgICBcbiAgICAgICAgLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZmFpbGVkIHRvIGZldGNoIHRvIGxpc3QnKTtcbiAgICAgICAgfSk7XG59O1xuXG5MaXN0LnByb3RvdHlwZS5hZGQgPSBmdW5jdGlvbiAocGF5bG9hZCkge1xuICAgIHRoaXMuX3JlcXVlc3QoJ1BVVCcsIHBheWxvYWQpXG4gICAgICAgIC5mYWlsKGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ2ZhaWxlZCB0byBhZGQgdG8gbGlzdCcsIHBheWxvYWQpO1xuICAgICAgICB9KTtcbn07XG5cbkxpc3QucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24gKHBheWxvYWQpIHtcblxuICAgIGlmICghcGF5bG9hZC51dWlkdjMpIHtcbiAgICAgICAgdGhyb3cgXCJBdHRlbXB0aW5nIHRvIGRlbGV0ZSBhIGxpc3Qgd2l0aG91dCBhIHV1aWQgc3RyaW5nXCJcbiAgICB9XG5cbiAgICB0aGlzLl9yZXF1ZXN0KCdERUxFVEUnLCB1bmRlZmluZWQsIGVuY29kZVVSSShkZWNvZGVVUkkocGF5bG9hZC51dWlkdjMpKSlcbiAgICAgICAgLmZhaWwoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnZmFpbGVkIHRvIGRlbGV0ZSB0byBsaXN0JywgcGF5bG9hZCk7XG4gICAgICAgIH0pO1xufTtcblxubW9kdWxlLmV4cG9ydHMgPSBMaXN0O1xuIiwiXG52YXIgcmVxd2VzdCA9IHJlcXVpcmUoJy4uL3ZlbmRvci9yZXF3ZXN0Lm1pbicpO1xudmFyIFVzZXIgICAgPSByZXF1aXJlKFwiLi8uLi8uLi8uLi9uZXh0LXVzZXItbW9kZWwtY29tcG9uZW50L21haW4uanNcIik7XG5cbnZhciBOT1RJRklDQVRJT05TX1VSTCA9ICdodHRwOi8vZnQtbmV4dC1hcGktdXNlci1wcmVmcy5oZXJva3VhcHAuY29tL3VzZXIvbm90aWZpY2F0aW9ucyc7XG5cbnZhciBlbWl0ID0gZnVuY3Rpb24obmFtZSwgZGF0YSkge1xuXHR2YXIgZXZlbnQgPSBkb2N1bWVudC5jcmVhdGVFdmVudCgnRXZlbnQnKTtcblx0ZXZlbnQuaW5pdEV2ZW50KG5hbWUsIHRydWUsIHRydWUpO1xuXHRpZiAoZGF0YSkge1xuXHRcdGV2ZW50LmRldGFpbCA9IGRhdGE7XG5cdH1cblx0dG9wLmRvY3VtZW50LmRpc3BhdGNoRXZlbnQoZXZlbnQpO1xufTtcblxuXG5mdW5jdGlvbiBleHRyYWN0U2VhcmNoVGVybShxdWVyeVN0cmluZykge1xuICAgIHJldHVybiBxdWVyeVN0cmluZy5tYXRjaCgvcT0oW14mXSopLylbMV07XG59XG5cbnZhciBnZXRDdXJyZW50U3RyZWFtID0gZnVuY3Rpb24oKSB7XG4gIHZhciBvbkFydGljbGUgPSAvXlxcL1thLWYwLTldKy0oLiopLy50ZXN0KGxvY2F0aW9uLnBhdGhuYW1lKTsgLy8gJzI3YTVlMjg2LTQzMTQtMTFlNC04YTQzLTAwMTQ0ZmVhYmRjMCc7IFxuICBpZihvbkFydGljbGUgfHwgbG9jYXRpb24ucGF0aG5hbWUuaW5kZXhPZignL3NlYXJjaCcpICE9PSAwKSB7IC8vaGFja3kgd2F5IHRvIGV4Y2x1ZGUgaG9tZXBhZ2UhXG4gIFx0cmV0dXJuIGZhbHNlO1xuICB9IGVsc2Uge1xuICBcdHJldHVybiBleHRyYWN0U2VhcmNoVGVybShsb2NhdGlvbi5zZWFyY2gpO1xuICB9XG59O1xuXG5cbmZ1bmN0aW9uIE5vdGlmaWNhdGlvblBvbGxlcigpIHtcblx0XG4gICAgdGhpcy51c2VySWQgPSBuZXcgVXNlcihkb2N1bWVudC5jb29raWUpLmlkKCk7XG5cblx0c2V0SW50ZXJ2YWwodGhpcy5wb2xsLmJpbmQodGhpcyksIDEwMDAgKiA2MCAqIDAuMik7IC8vIDMwIHNlY29uZCBwb2xsaW5nXG5cdFxuXHQvLyBDbGVhciBub3RpZmljYXRpb25zIGlmIGEgc3RyZWFtIGhhcyBiZWVuIG9wZW5lbmRcblx0dGhpcy5jdXJyZW50U3RyZWFtID0gZ2V0Q3VycmVudFN0cmVhbSgpO1xuXG4gICAgLy8gRklYTUUgLSBub3QgaW1wbGVtZW50ZWRcblx0aWYoL1BBVEgtVE8tRk9MTE9XSU5HLy50ZXN0KGxvY2F0aW9uLnBhdGhuYW1lKSkge1xuICAgICAgICBjb25zb2xlLmxvZygnY2xlYXJpbmcgYWxsIG5vdGlmaWNhdGlvbnMnKTtcblx0fSBlbHNlIGlmKHRoaXMuY3VycmVudFN0cmVhbSkge1xuXHRcdHRoaXMuY2xlYXIodGhpcy5jdXJyZW50U3RyZWFtKTtcblx0fVxuXG5cdHRoaXMucG9sbCgpOyAvL3Bhc3MgZmxhZyB0byBpbmRpY2F0ZSB0aGlzIGlzIHRoZSBmaXJzdCBsb2FkXG5cbn1cblxuTm90aWZpY2F0aW9uUG9sbGVyLnByb3RvdHlwZS5wb2xsID0gZnVuY3Rpb24oKSB7XG5cdFxuICAgIC8vIGZldGNoIGFsbCBub3RpZmljYXRpb25zXG4gICAgcmVxd2VzdCh7XG4gICAgICAgIHVybDogTk9USUZJQ0FUSU9OU19VUkwsXG4gICAgICAgIHR5cGU6ICdqc29uJyxcbiAgICAgICAgbWV0aG9kOiAnZ2V0JyxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICAgJ1gtRlQtVUlEJzogdGhpcy51c2VySWQgXG4gICAgICAgIH0sXG4gICAgICAgIGNyb3NzT3JpZ2luOiB0cnVlXG4gICAgfSwgZnVuY3Rpb24gKG5vdGlmaWNhdGlvbnMpIHtcbiAgICAgICAgZW1pdCgnbm90aWZpY2F0aW9uczpsb2FkJywgeyBjb3VudDogbm90aWZpY2F0aW9ucy5sZW5ndGggfSk7XG4gICAgfSk7XG59O1xuXG5Ob3RpZmljYXRpb25Qb2xsZXIucHJvdG90eXBlLmNsZWFyID0gZnVuY3Rpb24odXVpZCkge1xuXHRpZih1dWlkKSB7XG5cdFx0cmVxd2VzdCh7XG5cdFx0XHR1cmw6IE5PVElGSUNBVElPTlNfVVJMICsgJy8nICsgdXVpZCxcblx0XHRcdHR5cGU6ICdqc29uJyxcblx0XHRcdG1ldGhvZDogJ2RlbGV0ZScsXG5cdFx0XHRoZWFkZXJzOiB7XG5cdFx0XHRcdCdYLUZULVVJRCc6IHRoaXMudXNlcklkXG5cdFx0XHR9LFxuXHRcdFx0Y3Jvc3NPcmlnaW46IHRydWVcblx0XHR9KTtcblx0fVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSBOb3RpZmljYXRpb25Qb2xsZXI7XG4iLCJcbnZhciBMaXN0ID0gcmVxdWlyZSgnLi9MaXN0Jyk7XG5cbnZhciBVc2VyUHJlZnMgPSBmdW5jdGlvbihvcHRzKSB7XG5cbiAgICAvLyBDcmVhdGUgbGlzdHMgZm9yIGEgdXNlclxuICAgIHZhciByZWNvbW1lbmQgICA9IG5ldyBMaXN0KHsgbmFtZTogJ3JlY29tbWVuZCcgfSk7XG4gICAgdmFyIGZvbGxvd2luZyAgID0gbmV3IExpc3QoeyBuYW1lOiAnZmF2b3VyaXRlcycgfSk7IC8vIEZJWE1FIGNoYW5nZSB0byBmb2xsb3dpbmcgYWZ0ZXIgbmV3IEFQSSBpcyB3b3JraW5nXG4gICAgdmFyIGZvcmxhdGVyICAgID0gbmV3IExpc3QoeyBuYW1lOiAnZm9ybGF0ZXJzJyB9KTtcbiAgICB2YXIgaGlzdG9yeSAgICAgPSBuZXcgTGlzdCh7IG5hbWU6ICdoaXN0b3J5JyB9KTtcbiAgIFxuICAgIC8vIExpc3RlbiBmb3IgZXZlbnRzLCBiaW5kIHRoZW0gdG8gdGhlIGxpc3QgbWV0aG9kc1xuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ3JlY29tbWVuZDphZGQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgcmVjb21tZW5kLmFkZChldmVudC5kZXRhaWwpO1xuICAgIH0pO1xuXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZmF2b3VyaXRlczphZGQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgZm9sbG93aW5nLmFkZChldmVudC5kZXRhaWwpO1xuICAgIH0pO1xuICAgIFxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2ZvcmxhdGVyczphZGQnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgZm9ybGF0ZXIuYWRkKGV2ZW50LmRldGFpbCk7XG4gICAgfSk7XG4gICAgXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigncmVjb21tZW5kOnJlbW92ZScsIGZ1bmN0aW9uIChldmVudCkge1xuICAgICAgICByZWNvbW1lbmQuY2xlYXIoZXZlbnQuZGV0YWlsKTtcbiAgICB9KTtcblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2Zhdm91cml0ZXM6cmVtb3ZlJywgZnVuY3Rpb24gKGV2ZW50KSB7XG4gICAgICAgIGZvbGxvd2luZy5jbGVhcihldmVudC5kZXRhaWwpO1xuICAgIH0pO1xuICAgIFxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2ZvcmxhdGVyczpyZW1vdmUnLCBmdW5jdGlvbiAoZXZlbnQpIHtcbiAgICAgICAgZm9ybGF0ZXIuY2xlYXIoZXZlbnQuZGV0YWlsKTtcbiAgICB9KTtcbiAgICBcbiAgICAvLyBGZXRjaCBlYWNoIHR5cGUgb2YgbGlzdCBzbyB0aGF0IHRoZSBjb250ZW50cyBvZiBlYWNoIG9uZSBnZXRzIGJyb2FkY2FzdFxuICAgIC8vIHRvIHRoZSByZXN0IG9mIHRoZSBVSSBcbiAgICBcbiAgICBmb2xsb3dpbmcuZmV0Y2goKTtcbiAgICBmb3JsYXRlci5mZXRjaCgpO1xuICAgIHJlY29tbWVuZC5mZXRjaCgpO1xuXG59O1xuXG5cbm1vZHVsZS5leHBvcnRzID0gVXNlclByZWZzO1xuIiwiXG52YXIgVXNlclByZWZzICAgICAgICAgICA9IHJlcXVpcmUoJy4vbGliL1VzZXJQcmVmcycpO1xudmFyIE5vdGlmaWNhdGlvblBvbGxlciAgPSByZXF1aXJlKCcuL2xpYi9Ob3RpZmljYXRpb25Qb2xsZXInKTtcblxuKGZ1bmN0aW9uICgpIHtcbiAgICBuZXcgVXNlclByZWZzKCk7XG4gICAgbmV3IE5vdGlmaWNhdGlvblBvbGxlcigpO1xufSkoKTtcbiIsIi8qIVxuICAqIFJlcXdlc3QhIEEgZ2VuZXJhbCBwdXJwb3NlIFhIUiBjb25uZWN0aW9uIG1hbmFnZXJcbiAgKiBsaWNlbnNlIE1JVCAoYykgRHVzdGluIERpYXogMjAxNFxuICAqIGh0dHBzOi8vZ2l0aHViLmNvbS9kZWQvcmVxd2VzdFxuICAqL1xuIWZ1bmN0aW9uKGUsdCxuKXt0eXBlb2YgbW9kdWxlIT1cInVuZGVmaW5lZFwiJiZtb2R1bGUuZXhwb3J0cz9tb2R1bGUuZXhwb3J0cz1uKCk6dHlwZW9mIGRlZmluZT09XCJmdW5jdGlvblwiJiZkZWZpbmUuYW1kP2RlZmluZShuKTp0W2VdPW4oKX0oXCJyZXF3ZXN0XCIsdGhpcyxmdW5jdGlvbigpe2Z1bmN0aW9uIHN1Y2NlZWQoZSl7cmV0dXJuIGh0dHBzUmUudGVzdCh3aW5kb3cubG9jYXRpb24ucHJvdG9jb2wpP3R3b0h1bmRvLnRlc3QoZS5zdGF0dXMpOiEhZS5yZXNwb25zZX1mdW5jdGlvbiBoYW5kbGVSZWFkeVN0YXRlKGUsdCxuKXtyZXR1cm4gZnVuY3Rpb24oKXtpZihlLl9hYm9ydGVkKXJldHVybiBuKGUucmVxdWVzdCk7ZS5yZXF1ZXN0JiZlLnJlcXVlc3RbcmVhZHlTdGF0ZV09PTQmJihlLnJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlPW5vb3Asc3VjY2VlZChlLnJlcXVlc3QpP3QoZS5yZXF1ZXN0KTpuKGUucmVxdWVzdCkpfX1mdW5jdGlvbiBzZXRIZWFkZXJzKGUsdCl7dmFyIG49dC5oZWFkZXJzfHx7fSxyO24uQWNjZXB0PW4uQWNjZXB0fHxkZWZhdWx0SGVhZGVycy5hY2NlcHRbdC50eXBlXXx8ZGVmYXVsdEhlYWRlcnMuYWNjZXB0W1wiKlwiXTt2YXIgaT10eXBlb2YgRm9ybURhdGE9PVwiZnVuY3Rpb25cIiYmdC5kYXRhIGluc3RhbmNlb2YgRm9ybURhdGE7IXQuY3Jvc3NPcmlnaW4mJiFuW3JlcXVlc3RlZFdpdGhdJiYobltyZXF1ZXN0ZWRXaXRoXT1kZWZhdWx0SGVhZGVycy5yZXF1ZXN0ZWRXaXRoKSwhbltjb250ZW50VHlwZV0mJiFpJiYobltjb250ZW50VHlwZV09dC5jb250ZW50VHlwZXx8ZGVmYXVsdEhlYWRlcnMuY29udGVudFR5cGUpO2ZvcihyIGluIG4pbi5oYXNPd25Qcm9wZXJ0eShyKSYmXCJzZXRSZXF1ZXN0SGVhZGVyXCJpbiBlJiZlLnNldFJlcXVlc3RIZWFkZXIocixuW3JdKX1mdW5jdGlvbiBzZXRDcmVkZW50aWFscyhlLHQpe3R5cGVvZiB0LndpdGhDcmVkZW50aWFscyE9XCJ1bmRlZmluZWRcIiYmdHlwZW9mIGUud2l0aENyZWRlbnRpYWxzIT1cInVuZGVmaW5lZFwiJiYoZS53aXRoQ3JlZGVudGlhbHM9ISF0LndpdGhDcmVkZW50aWFscyl9ZnVuY3Rpb24gZ2VuZXJhbENhbGxiYWNrKGUpe2xhc3RWYWx1ZT1lfWZ1bmN0aW9uIHVybGFwcGVuZChlLHQpe3JldHVybiBlKygvXFw/Ly50ZXN0KGUpP1wiJlwiOlwiP1wiKSt0fWZ1bmN0aW9uIGhhbmRsZUpzb25wKGUsdCxuLHIpe3ZhciBpPXVuaXFpZCsrLHM9ZS5qc29ucENhbGxiYWNrfHxcImNhbGxiYWNrXCIsbz1lLmpzb25wQ2FsbGJhY2tOYW1lfHxyZXF3ZXN0LmdldGNhbGxiYWNrUHJlZml4KGkpLHU9bmV3IFJlZ0V4cChcIigoXnxcXFxcP3wmKVwiK3MrXCIpPShbXiZdKylcIiksYT1yLm1hdGNoKHUpLGY9ZG9jLmNyZWF0ZUVsZW1lbnQoXCJzY3JpcHRcIiksbD0wLGM9bmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKFwiTVNJRSAxMC4wXCIpIT09LTE7cmV0dXJuIGE/YVszXT09PVwiP1wiP3I9ci5yZXBsYWNlKHUsXCIkMT1cIitvKTpvPWFbM106cj11cmxhcHBlbmQocixzK1wiPVwiK28pLHdpbltvXT1nZW5lcmFsQ2FsbGJhY2ssZi50eXBlPVwidGV4dC9qYXZhc2NyaXB0XCIsZi5zcmM9cixmLmFzeW5jPSEwLHR5cGVvZiBmLm9ucmVhZHlzdGF0ZWNoYW5nZSE9XCJ1bmRlZmluZWRcIiYmIWMmJihmLmh0bWxGb3I9Zi5pZD1cIl9yZXF3ZXN0X1wiK2kpLGYub25sb2FkPWYub25yZWFkeXN0YXRlY2hhbmdlPWZ1bmN0aW9uKCl7aWYoZltyZWFkeVN0YXRlXSYmZltyZWFkeVN0YXRlXSE9PVwiY29tcGxldGVcIiYmZltyZWFkeVN0YXRlXSE9PVwibG9hZGVkXCJ8fGwpcmV0dXJuITE7Zi5vbmxvYWQ9Zi5vbnJlYWR5c3RhdGVjaGFuZ2U9bnVsbCxmLm9uY2xpY2smJmYub25jbGljaygpLHQobGFzdFZhbHVlKSxsYXN0VmFsdWU9dW5kZWZpbmVkLGhlYWQucmVtb3ZlQ2hpbGQoZiksbD0xfSxoZWFkLmFwcGVuZENoaWxkKGYpLHthYm9ydDpmdW5jdGlvbigpe2Yub25sb2FkPWYub25yZWFkeXN0YXRlY2hhbmdlPW51bGwsbih7fSxcIlJlcXVlc3QgaXMgYWJvcnRlZDogdGltZW91dFwiLHt9KSxsYXN0VmFsdWU9dW5kZWZpbmVkLGhlYWQucmVtb3ZlQ2hpbGQoZiksbD0xfX19ZnVuY3Rpb24gZ2V0UmVxdWVzdChlLHQpe3ZhciBuPXRoaXMubyxyPShuLm1ldGhvZHx8XCJHRVRcIikudG9VcHBlckNhc2UoKSxpPXR5cGVvZiBuPT1cInN0cmluZ1wiP246bi51cmwscz1uLnByb2Nlc3NEYXRhIT09ITEmJm4uZGF0YSYmdHlwZW9mIG4uZGF0YSE9XCJzdHJpbmdcIj9yZXF3ZXN0LnRvUXVlcnlTdHJpbmcobi5kYXRhKTpuLmRhdGF8fG51bGwsbyx1PSExO3JldHVybihuW1widHlwZVwiXT09XCJqc29ucFwifHxyPT1cIkdFVFwiKSYmcyYmKGk9dXJsYXBwZW5kKGkscykscz1udWxsKSxuW1widHlwZVwiXT09XCJqc29ucFwiP2hhbmRsZUpzb25wKG4sZSx0LGkpOihvPW4ueGhyJiZuLnhocihuKXx8eGhyKG4pLG8ub3BlbihyLGksbi5hc3luYz09PSExPyExOiEwKSxzZXRIZWFkZXJzKG8sbiksc2V0Q3JlZGVudGlhbHMobyxuKSx3aW5beERvbWFpblJlcXVlc3RdJiZvIGluc3RhbmNlb2Ygd2luW3hEb21haW5SZXF1ZXN0XT8oby5vbmxvYWQ9ZSxvLm9uZXJyb3I9dCxvLm9ucHJvZ3Jlc3M9ZnVuY3Rpb24oKXt9LHU9ITApOm8ub25yZWFkeXN0YXRlY2hhbmdlPWhhbmRsZVJlYWR5U3RhdGUodGhpcyxlLHQpLG4uYmVmb3JlJiZuLmJlZm9yZShvKSx1P3NldFRpbWVvdXQoZnVuY3Rpb24oKXtvLnNlbmQocyl9LDIwMCk6by5zZW5kKHMpLG8pfWZ1bmN0aW9uIFJlcXdlc3QoZSx0KXt0aGlzLm89ZSx0aGlzLmZuPXQsaW5pdC5hcHBseSh0aGlzLGFyZ3VtZW50cyl9ZnVuY3Rpb24gc2V0VHlwZShlKXtpZihlLm1hdGNoKFwianNvblwiKSlyZXR1cm5cImpzb25cIjtpZihlLm1hdGNoKFwiamF2YXNjcmlwdFwiKSlyZXR1cm5cImpzXCI7aWYoZS5tYXRjaChcInRleHRcIikpcmV0dXJuXCJodG1sXCI7aWYoZS5tYXRjaChcInhtbFwiKSlyZXR1cm5cInhtbFwifWZ1bmN0aW9uIGluaXQobyxmbil7ZnVuY3Rpb24gY29tcGxldGUoZSl7by50aW1lb3V0JiZjbGVhclRpbWVvdXQoc2VsZi50aW1lb3V0KSxzZWxmLnRpbWVvdXQ9bnVsbDt3aGlsZShzZWxmLl9jb21wbGV0ZUhhbmRsZXJzLmxlbmd0aD4wKXNlbGYuX2NvbXBsZXRlSGFuZGxlcnMuc2hpZnQoKShlKX1mdW5jdGlvbiBzdWNjZXNzKHJlc3Ape3ZhciB0eXBlPW8udHlwZXx8c2V0VHlwZShyZXNwLmdldFJlc3BvbnNlSGVhZGVyKFwiQ29udGVudC1UeXBlXCIpKTtyZXNwPXR5cGUhPT1cImpzb25wXCI/c2VsZi5yZXF1ZXN0OnJlc3A7dmFyIGZpbHRlcmVkUmVzcG9uc2U9Z2xvYmFsU2V0dXBPcHRpb25zLmRhdGFGaWx0ZXIocmVzcC5yZXNwb25zZVRleHQsdHlwZSkscj1maWx0ZXJlZFJlc3BvbnNlO3RyeXtyZXNwLnJlc3BvbnNlVGV4dD1yfWNhdGNoKGUpe31pZihyKXN3aXRjaCh0eXBlKXtjYXNlXCJqc29uXCI6dHJ5e3Jlc3A9d2luLkpTT04/d2luLkpTT04ucGFyc2Uocik6ZXZhbChcIihcIityK1wiKVwiKX1jYXRjaChlcnIpe3JldHVybiBlcnJvcihyZXNwLFwiQ291bGQgbm90IHBhcnNlIEpTT04gaW4gcmVzcG9uc2VcIixlcnIpfWJyZWFrO2Nhc2VcImpzXCI6cmVzcD1ldmFsKHIpO2JyZWFrO2Nhc2VcImh0bWxcIjpyZXNwPXI7YnJlYWs7Y2FzZVwieG1sXCI6cmVzcD1yZXNwLnJlc3BvbnNlWE1MJiZyZXNwLnJlc3BvbnNlWE1MLnBhcnNlRXJyb3ImJnJlc3AucmVzcG9uc2VYTUwucGFyc2VFcnJvci5lcnJvckNvZGUmJnJlc3AucmVzcG9uc2VYTUwucGFyc2VFcnJvci5yZWFzb24/bnVsbDpyZXNwLnJlc3BvbnNlWE1MfXNlbGYuX3Jlc3BvbnNlQXJncy5yZXNwPXJlc3Asc2VsZi5fZnVsZmlsbGVkPSEwLGZuKHJlc3ApLHNlbGYuX3N1Y2Nlc3NIYW5kbGVyKHJlc3ApO3doaWxlKHNlbGYuX2Z1bGZpbGxtZW50SGFuZGxlcnMubGVuZ3RoPjApcmVzcD1zZWxmLl9mdWxmaWxsbWVudEhhbmRsZXJzLnNoaWZ0KCkocmVzcCk7Y29tcGxldGUocmVzcCl9ZnVuY3Rpb24gZXJyb3IoZSx0LG4pe2U9c2VsZi5yZXF1ZXN0LHNlbGYuX3Jlc3BvbnNlQXJncy5yZXNwPWUsc2VsZi5fcmVzcG9uc2VBcmdzLm1zZz10LHNlbGYuX3Jlc3BvbnNlQXJncy50PW4sc2VsZi5fZXJyZWQ9ITA7d2hpbGUoc2VsZi5fZXJyb3JIYW5kbGVycy5sZW5ndGg+MClzZWxmLl9lcnJvckhhbmRsZXJzLnNoaWZ0KCkoZSx0LG4pO2NvbXBsZXRlKGUpfXRoaXMudXJsPXR5cGVvZiBvPT1cInN0cmluZ1wiP286by51cmwsdGhpcy50aW1lb3V0PW51bGwsdGhpcy5fZnVsZmlsbGVkPSExLHRoaXMuX3N1Y2Nlc3NIYW5kbGVyPWZ1bmN0aW9uKCl7fSx0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXJzPVtdLHRoaXMuX2Vycm9ySGFuZGxlcnM9W10sdGhpcy5fY29tcGxldGVIYW5kbGVycz1bXSx0aGlzLl9lcnJlZD0hMSx0aGlzLl9yZXNwb25zZUFyZ3M9e307dmFyIHNlbGY9dGhpcztmbj1mbnx8ZnVuY3Rpb24oKXt9LG8udGltZW91dCYmKHRoaXMudGltZW91dD1zZXRUaW1lb3V0KGZ1bmN0aW9uKCl7c2VsZi5hYm9ydCgpfSxvLnRpbWVvdXQpKSxvLnN1Y2Nlc3MmJih0aGlzLl9zdWNjZXNzSGFuZGxlcj1mdW5jdGlvbigpe28uc3VjY2Vzcy5hcHBseShvLGFyZ3VtZW50cyl9KSxvLmVycm9yJiZ0aGlzLl9lcnJvckhhbmRsZXJzLnB1c2goZnVuY3Rpb24oKXtvLmVycm9yLmFwcGx5KG8sYXJndW1lbnRzKX0pLG8uY29tcGxldGUmJnRoaXMuX2NvbXBsZXRlSGFuZGxlcnMucHVzaChmdW5jdGlvbigpe28uY29tcGxldGUuYXBwbHkobyxhcmd1bWVudHMpfSksdGhpcy5yZXF1ZXN0PWdldFJlcXVlc3QuY2FsbCh0aGlzLHN1Y2Nlc3MsZXJyb3IpfWZ1bmN0aW9uIHJlcXdlc3QoZSx0KXtyZXR1cm4gbmV3IFJlcXdlc3QoZSx0KX1mdW5jdGlvbiBub3JtYWxpemUoZSl7cmV0dXJuIGU/ZS5yZXBsYWNlKC9cXHI/XFxuL2csXCJcXHJcXG5cIik6XCJcIn1mdW5jdGlvbiBzZXJpYWwoZSx0KXt2YXIgbj1lLm5hbWUscj1lLnRhZ05hbWUudG9Mb3dlckNhc2UoKSxpPWZ1bmN0aW9uKGUpe2UmJiFlLmRpc2FibGVkJiZ0KG4sbm9ybWFsaXplKGUuYXR0cmlidXRlcy52YWx1ZSYmZS5hdHRyaWJ1dGVzLnZhbHVlLnNwZWNpZmllZD9lLnZhbHVlOmUudGV4dCkpfSxzLG8sdSxhO2lmKGUuZGlzYWJsZWR8fCFuKXJldHVybjtzd2l0Y2gocil7Y2FzZVwiaW5wdXRcIjovcmVzZXR8YnV0dG9ufGltYWdlfGZpbGUvaS50ZXN0KGUudHlwZSl8fChzPS9jaGVja2JveC9pLnRlc3QoZS50eXBlKSxvPS9yYWRpby9pLnRlc3QoZS50eXBlKSx1PWUudmFsdWUsKCFzJiYhb3x8ZS5jaGVja2VkKSYmdChuLG5vcm1hbGl6ZShzJiZ1PT09XCJcIj9cIm9uXCI6dSkpKTticmVhaztjYXNlXCJ0ZXh0YXJlYVwiOnQobixub3JtYWxpemUoZS52YWx1ZSkpO2JyZWFrO2Nhc2VcInNlbGVjdFwiOmlmKGUudHlwZS50b0xvd2VyQ2FzZSgpPT09XCJzZWxlY3Qtb25lXCIpaShlLnNlbGVjdGVkSW5kZXg+PTA/ZS5vcHRpb25zW2Uuc2VsZWN0ZWRJbmRleF06bnVsbCk7ZWxzZSBmb3IoYT0wO2UubGVuZ3RoJiZhPGUubGVuZ3RoO2ErKyllLm9wdGlvbnNbYV0uc2VsZWN0ZWQmJmkoZS5vcHRpb25zW2FdKX19ZnVuY3Rpb24gZWFjaEZvcm1FbGVtZW50KCl7dmFyIGU9dGhpcyx0LG4scj1mdW5jdGlvbih0LG4pe3ZhciByLGkscztmb3Iocj0wO3I8bi5sZW5ndGg7cisrKXtzPXRbYnlUYWddKG5bcl0pO2ZvcihpPTA7aTxzLmxlbmd0aDtpKyspc2VyaWFsKHNbaV0sZSl9fTtmb3Iobj0wO248YXJndW1lbnRzLmxlbmd0aDtuKyspdD1hcmd1bWVudHNbbl0sL2lucHV0fHNlbGVjdHx0ZXh0YXJlYS9pLnRlc3QodC50YWdOYW1lKSYmc2VyaWFsKHQsZSkscih0LFtcImlucHV0XCIsXCJzZWxlY3RcIixcInRleHRhcmVhXCJdKX1mdW5jdGlvbiBzZXJpYWxpemVRdWVyeVN0cmluZygpe3JldHVybiByZXF3ZXN0LnRvUXVlcnlTdHJpbmcocmVxd2VzdC5zZXJpYWxpemVBcnJheS5hcHBseShudWxsLGFyZ3VtZW50cykpfWZ1bmN0aW9uIHNlcmlhbGl6ZUhhc2goKXt2YXIgZT17fTtyZXR1cm4gZWFjaEZvcm1FbGVtZW50LmFwcGx5KGZ1bmN0aW9uKHQsbil7dCBpbiBlPyhlW3RdJiYhaXNBcnJheShlW3RdKSYmKGVbdF09W2VbdF1dKSxlW3RdLnB1c2gobikpOmVbdF09bn0sYXJndW1lbnRzKSxlfWZ1bmN0aW9uIGJ1aWxkUGFyYW1zKGUsdCxuLHIpe3ZhciBpLHMsbyx1PS9cXFtcXF0kLztpZihpc0FycmF5KHQpKWZvcihzPTA7dCYmczx0Lmxlbmd0aDtzKyspbz10W3NdLG58fHUudGVzdChlKT9yKGUsbyk6YnVpbGRQYXJhbXMoZStcIltcIisodHlwZW9mIG89PVwib2JqZWN0XCI/czpcIlwiKStcIl1cIixvLG4scik7ZWxzZSBpZih0JiZ0LnRvU3RyaW5nKCk9PT1cIltvYmplY3QgT2JqZWN0XVwiKWZvcihpIGluIHQpYnVpbGRQYXJhbXMoZStcIltcIitpK1wiXVwiLHRbaV0sbixyKTtlbHNlIHIoZSx0KX12YXIgd2luPXdpbmRvdyxkb2M9ZG9jdW1lbnQsaHR0cHNSZT0vXmh0dHAvLHR3b0h1bmRvPS9eKDIwXFxkfDEyMjMpJC8sYnlUYWc9XCJnZXRFbGVtZW50c0J5VGFnTmFtZVwiLHJlYWR5U3RhdGU9XCJyZWFkeVN0YXRlXCIsY29udGVudFR5cGU9XCJDb250ZW50LVR5cGVcIixyZXF1ZXN0ZWRXaXRoPVwiWC1SZXF1ZXN0ZWQtV2l0aFwiLGhlYWQ9ZG9jW2J5VGFnXShcImhlYWRcIilbMF0sdW5pcWlkPTAsY2FsbGJhY2tQcmVmaXg9XCJyZXF3ZXN0X1wiKyArKG5ldyBEYXRlKSxsYXN0VmFsdWUseG1sSHR0cFJlcXVlc3Q9XCJYTUxIdHRwUmVxdWVzdFwiLHhEb21haW5SZXF1ZXN0PVwiWERvbWFpblJlcXVlc3RcIixub29wPWZ1bmN0aW9uKCl7fSxpc0FycmF5PXR5cGVvZiBBcnJheS5pc0FycmF5PT1cImZ1bmN0aW9uXCI/QXJyYXkuaXNBcnJheTpmdW5jdGlvbihlKXtyZXR1cm4gZSBpbnN0YW5jZW9mIEFycmF5fSxkZWZhdWx0SGVhZGVycz17Y29udGVudFR5cGU6XCJhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWRcIixyZXF1ZXN0ZWRXaXRoOnhtbEh0dHBSZXF1ZXN0LGFjY2VwdDp7XCIqXCI6XCJ0ZXh0L2phdmFzY3JpcHQsIHRleHQvaHRtbCwgYXBwbGljYXRpb24veG1sLCB0ZXh0L3htbCwgKi8qXCIseG1sOlwiYXBwbGljYXRpb24veG1sLCB0ZXh0L3htbFwiLGh0bWw6XCJ0ZXh0L2h0bWxcIix0ZXh0OlwidGV4dC9wbGFpblwiLGpzb246XCJhcHBsaWNhdGlvbi9qc29uLCB0ZXh0L2phdmFzY3JpcHRcIixqczpcImFwcGxpY2F0aW9uL2phdmFzY3JpcHQsIHRleHQvamF2YXNjcmlwdFwifX0seGhyPWZ1bmN0aW9uKGUpe2lmKGUuY3Jvc3NPcmlnaW49PT0hMCl7dmFyIHQ9d2luW3htbEh0dHBSZXF1ZXN0XT9uZXcgWE1MSHR0cFJlcXVlc3Q6bnVsbDtpZih0JiZcIndpdGhDcmVkZW50aWFsc1wiaW4gdClyZXR1cm4gdDtpZih3aW5beERvbWFpblJlcXVlc3RdKXJldHVybiBuZXcgWERvbWFpblJlcXVlc3Q7dGhyb3cgbmV3IEVycm9yKFwiQnJvd3NlciBkb2VzIG5vdCBzdXBwb3J0IGNyb3NzLW9yaWdpbiByZXF1ZXN0c1wiKX1yZXR1cm4gd2luW3htbEh0dHBSZXF1ZXN0XT9uZXcgWE1MSHR0cFJlcXVlc3Q6bmV3IEFjdGl2ZVhPYmplY3QoXCJNaWNyb3NvZnQuWE1MSFRUUFwiKX0sZ2xvYmFsU2V0dXBPcHRpb25zPXtkYXRhRmlsdGVyOmZ1bmN0aW9uKGUpe3JldHVybiBlfX07cmV0dXJuIFJlcXdlc3QucHJvdG90eXBlPXthYm9ydDpmdW5jdGlvbigpe3RoaXMuX2Fib3J0ZWQ9ITAsdGhpcy5yZXF1ZXN0LmFib3J0KCl9LHJldHJ5OmZ1bmN0aW9uKCl7aW5pdC5jYWxsKHRoaXMsdGhpcy5vLHRoaXMuZm4pfSx0aGVuOmZ1bmN0aW9uKGUsdCl7cmV0dXJuIGU9ZXx8ZnVuY3Rpb24oKXt9LHQ9dHx8ZnVuY3Rpb24oKXt9LHRoaXMuX2Z1bGZpbGxlZD90aGlzLl9yZXNwb25zZUFyZ3MucmVzcD1lKHRoaXMuX3Jlc3BvbnNlQXJncy5yZXNwKTp0aGlzLl9lcnJlZD90KHRoaXMuX3Jlc3BvbnNlQXJncy5yZXNwLHRoaXMuX3Jlc3BvbnNlQXJncy5tc2csdGhpcy5fcmVzcG9uc2VBcmdzLnQpOih0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXJzLnB1c2goZSksdGhpcy5fZXJyb3JIYW5kbGVycy5wdXNoKHQpKSx0aGlzfSxhbHdheXM6ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX2Z1bGZpbGxlZHx8dGhpcy5fZXJyZWQ/ZSh0aGlzLl9yZXNwb25zZUFyZ3MucmVzcCk6dGhpcy5fY29tcGxldGVIYW5kbGVycy5wdXNoKGUpLHRoaXN9LGZhaWw6ZnVuY3Rpb24oZSl7cmV0dXJuIHRoaXMuX2VycmVkP2UodGhpcy5fcmVzcG9uc2VBcmdzLnJlc3AsdGhpcy5fcmVzcG9uc2VBcmdzLm1zZyx0aGlzLl9yZXNwb25zZUFyZ3MudCk6dGhpcy5fZXJyb3JIYW5kbGVycy5wdXNoKGUpLHRoaXN9LFwiY2F0Y2hcIjpmdW5jdGlvbihlKXtyZXR1cm4gdGhpcy5mYWlsKGUpfX0scmVxd2VzdC5zZXJpYWxpemVBcnJheT1mdW5jdGlvbigpe3ZhciBlPVtdO3JldHVybiBlYWNoRm9ybUVsZW1lbnQuYXBwbHkoZnVuY3Rpb24odCxuKXtlLnB1c2goe25hbWU6dCx2YWx1ZTpufSl9LGFyZ3VtZW50cyksZX0scmVxd2VzdC5zZXJpYWxpemU9ZnVuY3Rpb24oKXtpZihhcmd1bWVudHMubGVuZ3RoPT09MClyZXR1cm5cIlwiO3ZhciBlLHQsbj1BcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsMCk7cmV0dXJuIGU9bi5wb3AoKSxlJiZlLm5vZGVUeXBlJiZuLnB1c2goZSkmJihlPW51bGwpLGUmJihlPWUudHlwZSksZT09XCJtYXBcIj90PXNlcmlhbGl6ZUhhc2g6ZT09XCJhcnJheVwiP3Q9cmVxd2VzdC5zZXJpYWxpemVBcnJheTp0PXNlcmlhbGl6ZVF1ZXJ5U3RyaW5nLHQuYXBwbHkobnVsbCxuKX0scmVxd2VzdC50b1F1ZXJ5U3RyaW5nPWZ1bmN0aW9uKGUsdCl7dmFyIG4scixpPXR8fCExLHM9W10sbz1lbmNvZGVVUklDb21wb25lbnQsdT1mdW5jdGlvbihlLHQpe3Q9XCJmdW5jdGlvblwiPT10eXBlb2YgdD90KCk6dD09bnVsbD9cIlwiOnQsc1tzLmxlbmd0aF09byhlKStcIj1cIitvKHQpfTtpZihpc0FycmF5KGUpKWZvcihyPTA7ZSYmcjxlLmxlbmd0aDtyKyspdShlW3JdLm5hbWUsZVtyXS52YWx1ZSk7ZWxzZSBmb3IobiBpbiBlKWUuaGFzT3duUHJvcGVydHkobikmJmJ1aWxkUGFyYW1zKG4sZVtuXSxpLHUpO3JldHVybiBzLmpvaW4oXCImXCIpLnJlcGxhY2UoLyUyMC9nLFwiK1wiKX0scmVxd2VzdC5nZXRjYWxsYmFja1ByZWZpeD1mdW5jdGlvbigpe3JldHVybiBjYWxsYmFja1ByZWZpeH0scmVxd2VzdC5jb21wYXQ9ZnVuY3Rpb24oZSx0KXtyZXR1cm4gZSYmKGUudHlwZSYmKGUubWV0aG9kPWUudHlwZSkmJmRlbGV0ZSBlLnR5cGUsZS5kYXRhVHlwZSYmKGUudHlwZT1lLmRhdGFUeXBlKSxlLmpzb25wQ2FsbGJhY2smJihlLmpzb25wQ2FsbGJhY2tOYW1lPWUuanNvbnBDYWxsYmFjaykmJmRlbGV0ZSBlLmpzb25wQ2FsbGJhY2ssZS5qc29ucCYmKGUuanNvbnBDYWxsYmFjaz1lLmpzb25wKSksbmV3IFJlcXdlc3QoZSx0KX0scmVxd2VzdC5hamF4U2V0dXA9ZnVuY3Rpb24oZSl7ZT1lfHx7fTtmb3IodmFyIHQgaW4gZSlnbG9iYWxTZXR1cE9wdGlvbnNbdF09ZVt0XX0scmVxd2VzdH0pIiwiLyohXG4gICogUmVxd2VzdCEgQSBnZW5lcmFsIHB1cnBvc2UgWEhSIGNvbm5lY3Rpb24gbWFuYWdlclxuICAqIGxpY2Vuc2UgTUlUIChjKSBEdXN0aW4gRGlheiAyMDE0XG4gICogaHR0cHM6Ly9naXRodWIuY29tL2RlZC9yZXF3ZXN0XG4gICovXG5cbiFmdW5jdGlvbiAobmFtZSwgY29udGV4dCwgZGVmaW5pdGlvbikge1xuICBpZiAodHlwZW9mIG1vZHVsZSAhPSAndW5kZWZpbmVkJyAmJiBtb2R1bGUuZXhwb3J0cykgbW9kdWxlLmV4cG9ydHMgPSBkZWZpbml0aW9uKClcbiAgZWxzZSBpZiAodHlwZW9mIGRlZmluZSA9PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIGRlZmluZShkZWZpbml0aW9uKVxuICBlbHNlIGNvbnRleHRbbmFtZV0gPSBkZWZpbml0aW9uKClcbn0oJ3JlcXdlc3QnLCB0aGlzLCBmdW5jdGlvbiAoKSB7XG5cbiAgdmFyIHdpbiA9IHdpbmRvd1xuICAgICwgZG9jID0gZG9jdW1lbnRcbiAgICAsIGh0dHBzUmUgPSAvXmh0dHAvXG4gICAgLCBwcm90b2NvbFJlID0gLyheXFx3Kyk6XFwvXFwvL1xuICAgICwgdHdvSHVuZG8gPSAvXigyMFxcZHwxMjIzKSQvIC8vaHR0cDovL3N0YWNrb3ZlcmZsb3cuY29tL3F1ZXN0aW9ucy8xMDA0Njk3Mi9tc2llLXJldHVybnMtc3RhdHVzLWNvZGUtb2YtMTIyMy1mb3ItYWpheC1yZXF1ZXN0XG4gICAgLCBieVRhZyA9ICdnZXRFbGVtZW50c0J5VGFnTmFtZSdcbiAgICAsIHJlYWR5U3RhdGUgPSAncmVhZHlTdGF0ZSdcbiAgICAsIGNvbnRlbnRUeXBlID0gJ0NvbnRlbnQtVHlwZSdcbiAgICAsIHJlcXVlc3RlZFdpdGggPSAnWC1SZXF1ZXN0ZWQtV2l0aCdcbiAgICAsIGhlYWQgPSBkb2NbYnlUYWddKCdoZWFkJylbMF1cbiAgICAsIHVuaXFpZCA9IDBcbiAgICAsIGNhbGxiYWNrUHJlZml4ID0gJ3JlcXdlc3RfJyArICgrbmV3IERhdGUoKSlcbiAgICAsIGxhc3RWYWx1ZSAvLyBkYXRhIHN0b3JlZCBieSB0aGUgbW9zdCByZWNlbnQgSlNPTlAgY2FsbGJhY2tcbiAgICAsIHhtbEh0dHBSZXF1ZXN0ID0gJ1hNTEh0dHBSZXF1ZXN0J1xuICAgICwgeERvbWFpblJlcXVlc3QgPSAnWERvbWFpblJlcXVlc3QnXG4gICAgLCBub29wID0gZnVuY3Rpb24gKCkge31cblxuICAgICwgaXNBcnJheSA9IHR5cGVvZiBBcnJheS5pc0FycmF5ID09ICdmdW5jdGlvbidcbiAgICAgICAgPyBBcnJheS5pc0FycmF5XG4gICAgICAgIDogZnVuY3Rpb24gKGEpIHtcbiAgICAgICAgICAgIHJldHVybiBhIGluc3RhbmNlb2YgQXJyYXlcbiAgICAgICAgICB9XG5cbiAgICAsIGRlZmF1bHRIZWFkZXJzID0ge1xuICAgICAgICAgICdjb250ZW50VHlwZSc6ICdhcHBsaWNhdGlvbi94LXd3dy1mb3JtLXVybGVuY29kZWQnXG4gICAgICAgICwgJ3JlcXVlc3RlZFdpdGgnOiB4bWxIdHRwUmVxdWVzdFxuICAgICAgICAsICdhY2NlcHQnOiB7XG4gICAgICAgICAgICAgICcqJzogICd0ZXh0L2phdmFzY3JpcHQsIHRleHQvaHRtbCwgYXBwbGljYXRpb24veG1sLCB0ZXh0L3htbCwgKi8qJ1xuICAgICAgICAgICAgLCAneG1sJzogICdhcHBsaWNhdGlvbi94bWwsIHRleHQveG1sJ1xuICAgICAgICAgICAgLCAnaHRtbCc6ICd0ZXh0L2h0bWwnXG4gICAgICAgICAgICAsICd0ZXh0JzogJ3RleHQvcGxhaW4nXG4gICAgICAgICAgICAsICdqc29uJzogJ2FwcGxpY2F0aW9uL2pzb24sIHRleHQvamF2YXNjcmlwdCdcbiAgICAgICAgICAgICwgJ2pzJzogICAnYXBwbGljYXRpb24vamF2YXNjcmlwdCwgdGV4dC9qYXZhc2NyaXB0J1xuICAgICAgICAgIH1cbiAgICAgIH1cblxuICAgICwgeGhyID0gZnVuY3Rpb24obykge1xuICAgICAgICAvLyBpcyBpdCB4LWRvbWFpblxuICAgICAgICBpZiAob1snY3Jvc3NPcmlnaW4nXSA9PT0gdHJ1ZSkge1xuICAgICAgICAgIHZhciB4aHIgPSB3aW5beG1sSHR0cFJlcXVlc3RdID8gbmV3IFhNTEh0dHBSZXF1ZXN0KCkgOiBudWxsXG4gICAgICAgICAgaWYgKHhociAmJiAnd2l0aENyZWRlbnRpYWxzJyBpbiB4aHIpIHtcbiAgICAgICAgICAgIHJldHVybiB4aHJcbiAgICAgICAgICB9IGVsc2UgaWYgKHdpblt4RG9tYWluUmVxdWVzdF0pIHtcbiAgICAgICAgICAgIHJldHVybiBuZXcgWERvbWFpblJlcXVlc3QoKVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0Jyb3dzZXIgZG9lcyBub3Qgc3VwcG9ydCBjcm9zcy1vcmlnaW4gcmVxdWVzdHMnKVxuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIGlmICh3aW5beG1sSHR0cFJlcXVlc3RdKSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBYTUxIdHRwUmVxdWVzdCgpXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmV0dXJuIG5ldyBBY3RpdmVYT2JqZWN0KCdNaWNyb3NvZnQuWE1MSFRUUCcpXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAsIGdsb2JhbFNldHVwT3B0aW9ucyA9IHtcbiAgICAgICAgZGF0YUZpbHRlcjogZnVuY3Rpb24gKGRhdGEpIHtcbiAgICAgICAgICByZXR1cm4gZGF0YVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgZnVuY3Rpb24gc3VjY2VlZChyKSB7XG4gICAgdmFyIHByb3RvY29sID0gcHJvdG9jb2xSZS5leGVjKHIudXJsKTtcbiAgICBwcm90b2NvbCA9IChwcm90b2NvbCAmJiBwcm90b2NvbFsxXSkgfHwgd2luZG93LmxvY2F0aW9uLnByb3RvY29sO1xuICAgIHJldHVybiBodHRwc1JlLnRlc3QocHJvdG9jb2wpID8gdHdvSHVuZG8udGVzdChyLnJlcXVlc3Quc3RhdHVzKSA6ICEhci5yZXF1ZXN0LnJlc3BvbnNlO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlUmVhZHlTdGF0ZShyLCBzdWNjZXNzLCBlcnJvcikge1xuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XG4gICAgICAvLyB1c2UgX2Fib3J0ZWQgdG8gbWl0aWdhdGUgYWdhaW5zdCBJRSBlcnIgYzAwYzAyM2ZcbiAgICAgIC8vIChjYW4ndCByZWFkIHByb3BzIG9uIGFib3J0ZWQgcmVxdWVzdCBvYmplY3RzKVxuICAgICAgaWYgKHIuX2Fib3J0ZWQpIHJldHVybiBlcnJvcihyLnJlcXVlc3QpXG4gICAgICBpZiAoci5fdGltZWRPdXQpIHJldHVybiBlcnJvcihyLnJlcXVlc3QsICdSZXF1ZXN0IGlzIGFib3J0ZWQ6IHRpbWVvdXQnKVxuICAgICAgaWYgKHIucmVxdWVzdCAmJiByLnJlcXVlc3RbcmVhZHlTdGF0ZV0gPT0gNCkge1xuICAgICAgICByLnJlcXVlc3Qub25yZWFkeXN0YXRlY2hhbmdlID0gbm9vcFxuICAgICAgICBpZiAoc3VjY2VlZChyKSkgc3VjY2VzcyhyLnJlcXVlc3QpXG4gICAgICAgIGVsc2VcbiAgICAgICAgICBlcnJvcihyLnJlcXVlc3QpXG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gc2V0SGVhZGVycyhodHRwLCBvKSB7XG4gICAgdmFyIGhlYWRlcnMgPSBvWydoZWFkZXJzJ10gfHwge31cbiAgICAgICwgaFxuXG4gICAgaGVhZGVyc1snQWNjZXB0J10gPSBoZWFkZXJzWydBY2NlcHQnXVxuICAgICAgfHwgZGVmYXVsdEhlYWRlcnNbJ2FjY2VwdCddW29bJ3R5cGUnXV1cbiAgICAgIHx8IGRlZmF1bHRIZWFkZXJzWydhY2NlcHQnXVsnKiddXG5cbiAgICB2YXIgaXNBRm9ybURhdGEgPSB0eXBlb2YgRm9ybURhdGEgPT09ICdmdW5jdGlvbicgJiYgKG9bJ2RhdGEnXSBpbnN0YW5jZW9mIEZvcm1EYXRhKTtcbiAgICAvLyBicmVha3MgY3Jvc3Mtb3JpZ2luIHJlcXVlc3RzIHdpdGggbGVnYWN5IGJyb3dzZXJzXG4gICAgaWYgKCFvWydjcm9zc09yaWdpbiddICYmICFoZWFkZXJzW3JlcXVlc3RlZFdpdGhdKSBoZWFkZXJzW3JlcXVlc3RlZFdpdGhdID0gZGVmYXVsdEhlYWRlcnNbJ3JlcXVlc3RlZFdpdGgnXVxuICAgIGlmICghaGVhZGVyc1tjb250ZW50VHlwZV0gJiYgIWlzQUZvcm1EYXRhKSBoZWFkZXJzW2NvbnRlbnRUeXBlXSA9IG9bJ2NvbnRlbnRUeXBlJ10gfHwgZGVmYXVsdEhlYWRlcnNbJ2NvbnRlbnRUeXBlJ11cbiAgICBmb3IgKGggaW4gaGVhZGVycylcbiAgICAgIGhlYWRlcnMuaGFzT3duUHJvcGVydHkoaCkgJiYgJ3NldFJlcXVlc3RIZWFkZXInIGluIGh0dHAgJiYgaHR0cC5zZXRSZXF1ZXN0SGVhZGVyKGgsIGhlYWRlcnNbaF0pXG4gIH1cblxuICBmdW5jdGlvbiBzZXRDcmVkZW50aWFscyhodHRwLCBvKSB7XG4gICAgaWYgKHR5cGVvZiBvWyd3aXRoQ3JlZGVudGlhbHMnXSAhPT0gJ3VuZGVmaW5lZCcgJiYgdHlwZW9mIGh0dHAud2l0aENyZWRlbnRpYWxzICE9PSAndW5kZWZpbmVkJykge1xuICAgICAgaHR0cC53aXRoQ3JlZGVudGlhbHMgPSAhIW9bJ3dpdGhDcmVkZW50aWFscyddXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gZ2VuZXJhbENhbGxiYWNrKGRhdGEpIHtcbiAgICBsYXN0VmFsdWUgPSBkYXRhXG4gIH1cblxuICBmdW5jdGlvbiB1cmxhcHBlbmQgKHVybCwgcykge1xuICAgIHJldHVybiB1cmwgKyAoL1xcPy8udGVzdCh1cmwpID8gJyYnIDogJz8nKSArIHNcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZUpzb25wKG8sIGZuLCBlcnIsIHVybCkge1xuICAgIHZhciByZXFJZCA9IHVuaXFpZCsrXG4gICAgICAsIGNia2V5ID0gb1snanNvbnBDYWxsYmFjayddIHx8ICdjYWxsYmFjaycgLy8gdGhlICdjYWxsYmFjaycga2V5XG4gICAgICAsIGNidmFsID0gb1snanNvbnBDYWxsYmFja05hbWUnXSB8fCByZXF3ZXN0LmdldGNhbGxiYWNrUHJlZml4KHJlcUlkKVxuICAgICAgLCBjYnJlZyA9IG5ldyBSZWdFeHAoJygoXnxcXFxcP3wmKScgKyBjYmtleSArICcpPShbXiZdKyknKVxuICAgICAgLCBtYXRjaCA9IHVybC5tYXRjaChjYnJlZylcbiAgICAgICwgc2NyaXB0ID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ3NjcmlwdCcpXG4gICAgICAsIGxvYWRlZCA9IDBcbiAgICAgICwgaXNJRTEwID0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCdNU0lFIDEwLjAnKSAhPT0gLTFcblxuICAgIGlmIChtYXRjaCkge1xuICAgICAgaWYgKG1hdGNoWzNdID09PSAnPycpIHtcbiAgICAgICAgdXJsID0gdXJsLnJlcGxhY2UoY2JyZWcsICckMT0nICsgY2J2YWwpIC8vIHdpbGRjYXJkIGNhbGxiYWNrIGZ1bmMgbmFtZVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY2J2YWwgPSBtYXRjaFszXSAvLyBwcm92aWRlZCBjYWxsYmFjayBmdW5jIG5hbWVcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgdXJsID0gdXJsYXBwZW5kKHVybCwgY2JrZXkgKyAnPScgKyBjYnZhbCkgLy8gbm8gY2FsbGJhY2sgZGV0YWlscywgYWRkICdlbVxuICAgIH1cblxuICAgIHdpbltjYnZhbF0gPSBnZW5lcmFsQ2FsbGJhY2tcblxuICAgIHNjcmlwdC50eXBlID0gJ3RleHQvamF2YXNjcmlwdCdcbiAgICBzY3JpcHQuc3JjID0gdXJsXG4gICAgc2NyaXB0LmFzeW5jID0gdHJ1ZVxuICAgIGlmICh0eXBlb2Ygc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSAhPT0gJ3VuZGVmaW5lZCcgJiYgIWlzSUUxMCkge1xuICAgICAgLy8gbmVlZCB0aGlzIGZvciBJRSBkdWUgdG8gb3V0LW9mLW9yZGVyIG9ucmVhZHlzdGF0ZWNoYW5nZSgpLCBiaW5kaW5nIHNjcmlwdFxuICAgICAgLy8gZXhlY3V0aW9uIHRvIGFuIGV2ZW50IGxpc3RlbmVyIGdpdmVzIHVzIGNvbnRyb2wgb3ZlciB3aGVuIHRoZSBzY3JpcHRcbiAgICAgIC8vIGlzIGV4ZWN1dGVkLiBTZWUgaHR0cDovL2phdWJvdXJnLm5ldC8yMDEwLzA3L2xvYWRpbmctc2NyaXB0LWFzLW9uY2xpY2staGFuZGxlci1vZi5odG1sXG4gICAgICBzY3JpcHQuaHRtbEZvciA9IHNjcmlwdC5pZCA9ICdfcmVxd2VzdF8nICsgcmVxSWRcbiAgICB9XG5cbiAgICBzY3JpcHQub25sb2FkID0gc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgIGlmICgoc2NyaXB0W3JlYWR5U3RhdGVdICYmIHNjcmlwdFtyZWFkeVN0YXRlXSAhPT0gJ2NvbXBsZXRlJyAmJiBzY3JpcHRbcmVhZHlTdGF0ZV0gIT09ICdsb2FkZWQnKSB8fCBsb2FkZWQpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgICB9XG4gICAgICBzY3JpcHQub25sb2FkID0gc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IG51bGxcbiAgICAgIHNjcmlwdC5vbmNsaWNrICYmIHNjcmlwdC5vbmNsaWNrKClcbiAgICAgIC8vIENhbGwgdGhlIHVzZXIgY2FsbGJhY2sgd2l0aCB0aGUgbGFzdCB2YWx1ZSBzdG9yZWQgYW5kIGNsZWFuIHVwIHZhbHVlcyBhbmQgc2NyaXB0cy5cbiAgICAgIGZuKGxhc3RWYWx1ZSlcbiAgICAgIGxhc3RWYWx1ZSA9IHVuZGVmaW5lZFxuICAgICAgaGVhZC5yZW1vdmVDaGlsZChzY3JpcHQpXG4gICAgICBsb2FkZWQgPSAxXG4gICAgfVxuXG4gICAgLy8gQWRkIHRoZSBzY3JpcHQgdG8gdGhlIERPTSBoZWFkXG4gICAgaGVhZC5hcHBlbmRDaGlsZChzY3JpcHQpXG5cbiAgICAvLyBFbmFibGUgSlNPTlAgdGltZW91dFxuICAgIHJldHVybiB7XG4gICAgICBhYm9ydDogZnVuY3Rpb24gKCkge1xuICAgICAgICBzY3JpcHQub25sb2FkID0gc2NyaXB0Lm9ucmVhZHlzdGF0ZWNoYW5nZSA9IG51bGxcbiAgICAgICAgZXJyKHt9LCAnUmVxdWVzdCBpcyBhYm9ydGVkOiB0aW1lb3V0Jywge30pXG4gICAgICAgIGxhc3RWYWx1ZSA9IHVuZGVmaW5lZFxuICAgICAgICBoZWFkLnJlbW92ZUNoaWxkKHNjcmlwdClcbiAgICAgICAgbG9hZGVkID0gMVxuICAgICAgfVxuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFJlcXVlc3QoZm4sIGVycikge1xuICAgIHZhciBvID0gdGhpcy5vXG4gICAgICAsIG1ldGhvZCA9IChvWydtZXRob2QnXSB8fCAnR0VUJykudG9VcHBlckNhc2UoKVxuICAgICAgLCB1cmwgPSB0eXBlb2YgbyA9PT0gJ3N0cmluZycgPyBvIDogb1sndXJsJ11cbiAgICAgIC8vIGNvbnZlcnQgbm9uLXN0cmluZyBvYmplY3RzIHRvIHF1ZXJ5LXN0cmluZyBmb3JtIHVubGVzcyBvWydwcm9jZXNzRGF0YSddIGlzIGZhbHNlXG4gICAgICAsIGRhdGEgPSAob1sncHJvY2Vzc0RhdGEnXSAhPT0gZmFsc2UgJiYgb1snZGF0YSddICYmIHR5cGVvZiBvWydkYXRhJ10gIT09ICdzdHJpbmcnKVxuICAgICAgICA/IHJlcXdlc3QudG9RdWVyeVN0cmluZyhvWydkYXRhJ10pXG4gICAgICAgIDogKG9bJ2RhdGEnXSB8fCBudWxsKVxuICAgICAgLCBodHRwXG4gICAgICAsIHNlbmRXYWl0ID0gZmFsc2VcblxuICAgIC8vIGlmIHdlJ3JlIHdvcmtpbmcgb24gYSBHRVQgcmVxdWVzdCBhbmQgd2UgaGF2ZSBkYXRhIHRoZW4gd2Ugc2hvdWxkIGFwcGVuZFxuICAgIC8vIHF1ZXJ5IHN0cmluZyB0byBlbmQgb2YgVVJMIGFuZCBub3QgcG9zdCBkYXRhXG4gICAgaWYgKChvWyd0eXBlJ10gPT0gJ2pzb25wJyB8fCBtZXRob2QgPT0gJ0dFVCcpICYmIGRhdGEpIHtcbiAgICAgIHVybCA9IHVybGFwcGVuZCh1cmwsIGRhdGEpXG4gICAgICBkYXRhID0gbnVsbFxuICAgIH1cblxuICAgIGlmIChvWyd0eXBlJ10gPT0gJ2pzb25wJykgcmV0dXJuIGhhbmRsZUpzb25wKG8sIGZuLCBlcnIsIHVybClcblxuICAgIC8vIGdldCB0aGUgeGhyIGZyb20gdGhlIGZhY3RvcnkgaWYgcGFzc2VkXG4gICAgLy8gaWYgdGhlIGZhY3RvcnkgcmV0dXJucyBudWxsLCBmYWxsLWJhY2sgdG8gb3Vyc1xuICAgIGh0dHAgPSAoby54aHIgJiYgby54aHIobykpIHx8IHhocihvKVxuXG4gICAgaHR0cC5vcGVuKG1ldGhvZCwgdXJsLCBvWydhc3luYyddID09PSBmYWxzZSA/IGZhbHNlIDogdHJ1ZSlcbiAgICBzZXRIZWFkZXJzKGh0dHAsIG8pXG4gICAgc2V0Q3JlZGVudGlhbHMoaHR0cCwgbylcbiAgICBpZiAod2luW3hEb21haW5SZXF1ZXN0XSAmJiBodHRwIGluc3RhbmNlb2Ygd2luW3hEb21haW5SZXF1ZXN0XSkge1xuICAgICAgICBodHRwLm9ubG9hZCA9IGZuXG4gICAgICAgIGh0dHAub25lcnJvciA9IGVyclxuICAgICAgICAvLyBOT1RFOiBzZWVcbiAgICAgICAgLy8gaHR0cDovL3NvY2lhbC5tc2RuLm1pY3Jvc29mdC5jb20vRm9ydW1zL2VuLVVTL2lld2ViZGV2ZWxvcG1lbnQvdGhyZWFkLzMwZWYzYWRkLTc2N2MtNDQzNi1iOGE5LWYxY2ExOWI0ODEyZVxuICAgICAgICBodHRwLm9ucHJvZ3Jlc3MgPSBmdW5jdGlvbigpIHt9XG4gICAgICAgIHNlbmRXYWl0ID0gdHJ1ZVxuICAgIH0gZWxzZSB7XG4gICAgICBodHRwLm9ucmVhZHlzdGF0ZWNoYW5nZSA9IGhhbmRsZVJlYWR5U3RhdGUodGhpcywgZm4sIGVycilcbiAgICB9XG4gICAgb1snYmVmb3JlJ10gJiYgb1snYmVmb3JlJ10oaHR0cClcbiAgICBpZiAoc2VuZFdhaXQpIHtcbiAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBodHRwLnNlbmQoZGF0YSlcbiAgICAgIH0sIDIwMClcbiAgICB9IGVsc2Uge1xuICAgICAgaHR0cC5zZW5kKGRhdGEpXG4gICAgfVxuICAgIHJldHVybiBodHRwXG4gIH1cblxuICBmdW5jdGlvbiBSZXF3ZXN0KG8sIGZuKSB7XG4gICAgdGhpcy5vID0gb1xuICAgIHRoaXMuZm4gPSBmblxuXG4gICAgaW5pdC5hcHBseSh0aGlzLCBhcmd1bWVudHMpXG4gIH1cblxuICBmdW5jdGlvbiBzZXRUeXBlKGhlYWRlcikge1xuICAgIC8vIGpzb24sIGphdmFzY3JpcHQsIHRleHQvcGxhaW4sIHRleHQvaHRtbCwgeG1sXG4gICAgaWYgKGhlYWRlci5tYXRjaCgnanNvbicpKSByZXR1cm4gJ2pzb24nXG4gICAgaWYgKGhlYWRlci5tYXRjaCgnamF2YXNjcmlwdCcpKSByZXR1cm4gJ2pzJ1xuICAgIGlmIChoZWFkZXIubWF0Y2goJ3RleHQnKSkgcmV0dXJuICdodG1sJ1xuICAgIGlmIChoZWFkZXIubWF0Y2goJ3htbCcpKSByZXR1cm4gJ3htbCdcbiAgfVxuXG4gIGZ1bmN0aW9uIGluaXQobywgZm4pIHtcblxuICAgIHRoaXMudXJsID0gdHlwZW9mIG8gPT0gJ3N0cmluZycgPyBvIDogb1sndXJsJ11cbiAgICB0aGlzLnRpbWVvdXQgPSBudWxsXG5cbiAgICAvLyB3aGV0aGVyIHJlcXVlc3QgaGFzIGJlZW4gZnVsZmlsbGVkIGZvciBwdXJwb3NlXG4gICAgLy8gb2YgdHJhY2tpbmcgdGhlIFByb21pc2VzXG4gICAgdGhpcy5fZnVsZmlsbGVkID0gZmFsc2VcbiAgICAvLyBzdWNjZXNzIGhhbmRsZXJzXG4gICAgdGhpcy5fc3VjY2Vzc0hhbmRsZXIgPSBmdW5jdGlvbigpe31cbiAgICB0aGlzLl9mdWxmaWxsbWVudEhhbmRsZXJzID0gW11cbiAgICAvLyBlcnJvciBoYW5kbGVyc1xuICAgIHRoaXMuX2Vycm9ySGFuZGxlcnMgPSBbXVxuICAgIC8vIGNvbXBsZXRlIChib3RoIHN1Y2Nlc3MgYW5kIGZhaWwpIGhhbmRsZXJzXG4gICAgdGhpcy5fY29tcGxldGVIYW5kbGVycyA9IFtdXG4gICAgdGhpcy5fZXJyZWQgPSBmYWxzZVxuICAgIHRoaXMuX3Jlc3BvbnNlQXJncyA9IHt9XG5cbiAgICB2YXIgc2VsZiA9IHRoaXNcblxuICAgIGZuID0gZm4gfHwgZnVuY3Rpb24gKCkge31cblxuICAgIGlmIChvWyd0aW1lb3V0J10pIHtcbiAgICAgIHRoaXMudGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICB0aW1lZE91dCgpXG4gICAgICB9LCBvWyd0aW1lb3V0J10pXG4gICAgfVxuXG4gICAgaWYgKG9bJ3N1Y2Nlc3MnXSkge1xuICAgICAgdGhpcy5fc3VjY2Vzc0hhbmRsZXIgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9bJ3N1Y2Nlc3MnXS5hcHBseShvLCBhcmd1bWVudHMpXG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG9bJ2Vycm9yJ10pIHtcbiAgICAgIHRoaXMuX2Vycm9ySGFuZGxlcnMucHVzaChmdW5jdGlvbiAoKSB7XG4gICAgICAgIG9bJ2Vycm9yJ10uYXBwbHkobywgYXJndW1lbnRzKVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBpZiAob1snY29tcGxldGUnXSkge1xuICAgICAgdGhpcy5fY29tcGxldGVIYW5kbGVycy5wdXNoKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgb1snY29tcGxldGUnXS5hcHBseShvLCBhcmd1bWVudHMpXG4gICAgICB9KVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNvbXBsZXRlIChyZXNwKSB7XG4gICAgICBvWyd0aW1lb3V0J10gJiYgY2xlYXJUaW1lb3V0KHNlbGYudGltZW91dClcbiAgICAgIHNlbGYudGltZW91dCA9IG51bGxcbiAgICAgIHdoaWxlIChzZWxmLl9jb21wbGV0ZUhhbmRsZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgc2VsZi5fY29tcGxldGVIYW5kbGVycy5zaGlmdCgpKHJlc3ApXG4gICAgICB9XG4gICAgfVxuXG4gICAgZnVuY3Rpb24gc3VjY2VzcyAocmVzcCkge1xuICAgICAgdmFyIHR5cGUgPSBvWyd0eXBlJ10gfHwgcmVzcCAmJiBzZXRUeXBlKHJlc3AuZ2V0UmVzcG9uc2VIZWFkZXIoJ0NvbnRlbnQtVHlwZScpKSAvLyByZXNwIGNhbiBiZSB1bmRlZmluZWQgaW4gSUVcbiAgICAgIHJlc3AgPSAodHlwZSAhPT0gJ2pzb25wJykgPyBzZWxmLnJlcXVlc3QgOiByZXNwXG4gICAgICAvLyB1c2UgZ2xvYmFsIGRhdGEgZmlsdGVyIG9uIHJlc3BvbnNlIHRleHRcbiAgICAgIHZhciBmaWx0ZXJlZFJlc3BvbnNlID0gZ2xvYmFsU2V0dXBPcHRpb25zLmRhdGFGaWx0ZXIocmVzcC5yZXNwb25zZVRleHQsIHR5cGUpXG4gICAgICAgICwgciA9IGZpbHRlcmVkUmVzcG9uc2VcbiAgICAgIHRyeSB7XG4gICAgICAgIHJlc3AucmVzcG9uc2VUZXh0ID0gclxuICAgICAgfSBjYXRjaCAoZSkge1xuICAgICAgICAvLyBjYW4ndCBhc3NpZ24gdGhpcyBpbiBJRTw9OCwganVzdCBpZ25vcmVcbiAgICAgIH1cbiAgICAgIGlmIChyKSB7XG4gICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICBjYXNlICdqc29uJzpcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgcmVzcCA9IHdpbi5KU09OID8gd2luLkpTT04ucGFyc2UocikgOiBldmFsKCcoJyArIHIgKyAnKScpXG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICByZXR1cm4gZXJyb3IocmVzcCwgJ0NvdWxkIG5vdCBwYXJzZSBKU09OIGluIHJlc3BvbnNlJywgZXJyKVxuICAgICAgICAgIH1cbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdqcyc6XG4gICAgICAgICAgcmVzcCA9IGV2YWwocilcbiAgICAgICAgICBicmVha1xuICAgICAgICBjYXNlICdodG1sJzpcbiAgICAgICAgICByZXNwID0gclxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIGNhc2UgJ3htbCc6XG4gICAgICAgICAgcmVzcCA9IHJlc3AucmVzcG9uc2VYTUxcbiAgICAgICAgICAgICAgJiYgcmVzcC5yZXNwb25zZVhNTC5wYXJzZUVycm9yIC8vIElFIHRyb2xvbG9cbiAgICAgICAgICAgICAgJiYgcmVzcC5yZXNwb25zZVhNTC5wYXJzZUVycm9yLmVycm9yQ29kZVxuICAgICAgICAgICAgICAmJiByZXNwLnJlc3BvbnNlWE1MLnBhcnNlRXJyb3IucmVhc29uXG4gICAgICAgICAgICA/IG51bGxcbiAgICAgICAgICAgIDogcmVzcC5yZXNwb25zZVhNTFxuICAgICAgICAgIGJyZWFrXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgc2VsZi5fcmVzcG9uc2VBcmdzLnJlc3AgPSByZXNwXG4gICAgICBzZWxmLl9mdWxmaWxsZWQgPSB0cnVlXG4gICAgICBmbihyZXNwKVxuICAgICAgc2VsZi5fc3VjY2Vzc0hhbmRsZXIocmVzcClcbiAgICAgIHdoaWxlIChzZWxmLl9mdWxmaWxsbWVudEhhbmRsZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmVzcCA9IHNlbGYuX2Z1bGZpbGxtZW50SGFuZGxlcnMuc2hpZnQoKShyZXNwKVxuICAgICAgfVxuXG4gICAgICBjb21wbGV0ZShyZXNwKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRpbWVkT3V0KCkge1xuICAgICAgc2VsZi5fdGltZWRPdXQgPSB0cnVlXG4gICAgICBzZWxmLnJlcXVlc3QuYWJvcnQoKSAgICAgIFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGVycm9yKHJlc3AsIG1zZywgdCkge1xuICAgICAgcmVzcCA9IHNlbGYucmVxdWVzdFxuICAgICAgc2VsZi5fcmVzcG9uc2VBcmdzLnJlc3AgPSByZXNwXG4gICAgICBzZWxmLl9yZXNwb25zZUFyZ3MubXNnID0gbXNnXG4gICAgICBzZWxmLl9yZXNwb25zZUFyZ3MudCA9IHRcbiAgICAgIHNlbGYuX2VycmVkID0gdHJ1ZVxuICAgICAgd2hpbGUgKHNlbGYuX2Vycm9ySGFuZGxlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICBzZWxmLl9lcnJvckhhbmRsZXJzLnNoaWZ0KCkocmVzcCwgbXNnLCB0KVxuICAgICAgfVxuICAgICAgY29tcGxldGUocmVzcClcbiAgICB9XG5cbiAgICB0aGlzLnJlcXVlc3QgPSBnZXRSZXF1ZXN0LmNhbGwodGhpcywgc3VjY2VzcywgZXJyb3IpXG4gIH1cblxuICBSZXF3ZXN0LnByb3RvdHlwZSA9IHtcbiAgICBhYm9ydDogZnVuY3Rpb24gKCkge1xuICAgICAgdGhpcy5fYWJvcnRlZCA9IHRydWVcbiAgICAgIHRoaXMucmVxdWVzdC5hYm9ydCgpXG4gICAgfVxuXG4gICwgcmV0cnk6IGZ1bmN0aW9uICgpIHtcbiAgICAgIGluaXQuY2FsbCh0aGlzLCB0aGlzLm8sIHRoaXMuZm4pXG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogU21hbGwgZGV2aWF0aW9uIGZyb20gdGhlIFByb21pc2VzIEEgQ29tbW9uSnMgc3BlY2lmaWNhdGlvblxuICAgICAqIGh0dHA6Ly93aWtpLmNvbW1vbmpzLm9yZy93aWtpL1Byb21pc2VzL0FcbiAgICAgKi9cblxuICAgIC8qKlxuICAgICAqIGB0aGVuYCB3aWxsIGV4ZWN1dGUgdXBvbiBzdWNjZXNzZnVsIHJlcXVlc3RzXG4gICAgICovXG4gICwgdGhlbjogZnVuY3Rpb24gKHN1Y2Nlc3MsIGZhaWwpIHtcbiAgICAgIHN1Y2Nlc3MgPSBzdWNjZXNzIHx8IGZ1bmN0aW9uICgpIHt9XG4gICAgICBmYWlsID0gZmFpbCB8fCBmdW5jdGlvbiAoKSB7fVxuICAgICAgaWYgKHRoaXMuX2Z1bGZpbGxlZCkge1xuICAgICAgICB0aGlzLl9yZXNwb25zZUFyZ3MucmVzcCA9IHN1Y2Nlc3ModGhpcy5fcmVzcG9uc2VBcmdzLnJlc3ApXG4gICAgICB9IGVsc2UgaWYgKHRoaXMuX2VycmVkKSB7XG4gICAgICAgIGZhaWwodGhpcy5fcmVzcG9uc2VBcmdzLnJlc3AsIHRoaXMuX3Jlc3BvbnNlQXJncy5tc2csIHRoaXMuX3Jlc3BvbnNlQXJncy50KVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fZnVsZmlsbG1lbnRIYW5kbGVycy5wdXNoKHN1Y2Nlc3MpXG4gICAgICAgIHRoaXMuX2Vycm9ySGFuZGxlcnMucHVzaChmYWlsKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBgYWx3YXlzYCB3aWxsIGV4ZWN1dGUgd2hldGhlciB0aGUgcmVxdWVzdCBzdWNjZWVkcyBvciBmYWlsc1xuICAgICAqL1xuICAsIGFsd2F5czogZnVuY3Rpb24gKGZuKSB7XG4gICAgICBpZiAodGhpcy5fZnVsZmlsbGVkIHx8IHRoaXMuX2VycmVkKSB7XG4gICAgICAgIGZuKHRoaXMuX3Jlc3BvbnNlQXJncy5yZXNwKVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdGhpcy5fY29tcGxldGVIYW5kbGVycy5wdXNoKGZuKVxuICAgICAgfVxuICAgICAgcmV0dXJuIHRoaXNcbiAgICB9XG5cbiAgICAvKipcbiAgICAgKiBgZmFpbGAgd2lsbCBleGVjdXRlIHdoZW4gdGhlIHJlcXVlc3QgZmFpbHNcbiAgICAgKi9cbiAgLCBmYWlsOiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIGlmICh0aGlzLl9lcnJlZCkge1xuICAgICAgICBmbih0aGlzLl9yZXNwb25zZUFyZ3MucmVzcCwgdGhpcy5fcmVzcG9uc2VBcmdzLm1zZywgdGhpcy5fcmVzcG9uc2VBcmdzLnQpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLl9lcnJvckhhbmRsZXJzLnB1c2goZm4pXG4gICAgICB9XG4gICAgICByZXR1cm4gdGhpc1xuICAgIH1cbiAgLCAnY2F0Y2gnOiBmdW5jdGlvbiAoZm4pIHtcbiAgICAgIHJldHVybiB0aGlzLmZhaWwoZm4pXG4gICAgfVxuICB9XG5cbiAgZnVuY3Rpb24gcmVxd2VzdChvLCBmbikge1xuICAgIHJldHVybiBuZXcgUmVxd2VzdChvLCBmbilcbiAgfVxuXG4gIC8vIG5vcm1hbGl6ZSBuZXdsaW5lIHZhcmlhbnRzIGFjY29yZGluZyB0byBzcGVjIC0+IENSTEZcbiAgZnVuY3Rpb24gbm9ybWFsaXplKHMpIHtcbiAgICByZXR1cm4gcyA/IHMucmVwbGFjZSgvXFxyP1xcbi9nLCAnXFxyXFxuJykgOiAnJ1xuICB9XG5cbiAgZnVuY3Rpb24gc2VyaWFsKGVsLCBjYikge1xuICAgIHZhciBuID0gZWwubmFtZVxuICAgICAgLCB0ID0gZWwudGFnTmFtZS50b0xvd2VyQ2FzZSgpXG4gICAgICAsIG9wdENiID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgICAvLyBJRSBnaXZlcyB2YWx1ZT1cIlwiIGV2ZW4gd2hlcmUgdGhlcmUgaXMgbm8gdmFsdWUgYXR0cmlidXRlXG4gICAgICAgICAgLy8gJ3NwZWNpZmllZCcgcmVmOiBodHRwOi8vd3d3LnczLm9yZy9UUi9ET00tTGV2ZWwtMy1Db3JlL2NvcmUuaHRtbCNJRC04NjI1MjkyNzNcbiAgICAgICAgICBpZiAobyAmJiAhb1snZGlzYWJsZWQnXSlcbiAgICAgICAgICAgIGNiKG4sIG5vcm1hbGl6ZShvWydhdHRyaWJ1dGVzJ11bJ3ZhbHVlJ10gJiYgb1snYXR0cmlidXRlcyddWyd2YWx1ZSddWydzcGVjaWZpZWQnXSA/IG9bJ3ZhbHVlJ10gOiBvWyd0ZXh0J10pKVxuICAgICAgICB9XG4gICAgICAsIGNoLCByYSwgdmFsLCBpXG5cbiAgICAvLyBkb24ndCBzZXJpYWxpemUgZWxlbWVudHMgdGhhdCBhcmUgZGlzYWJsZWQgb3Igd2l0aG91dCBhIG5hbWVcbiAgICBpZiAoZWwuZGlzYWJsZWQgfHwgIW4pIHJldHVyblxuXG4gICAgc3dpdGNoICh0KSB7XG4gICAgY2FzZSAnaW5wdXQnOlxuICAgICAgaWYgKCEvcmVzZXR8YnV0dG9ufGltYWdlfGZpbGUvaS50ZXN0KGVsLnR5cGUpKSB7XG4gICAgICAgIGNoID0gL2NoZWNrYm94L2kudGVzdChlbC50eXBlKVxuICAgICAgICByYSA9IC9yYWRpby9pLnRlc3QoZWwudHlwZSlcbiAgICAgICAgdmFsID0gZWwudmFsdWVcbiAgICAgICAgLy8gV2ViS2l0IGdpdmVzIHVzIFwiXCIgaW5zdGVhZCBvZiBcIm9uXCIgaWYgYSBjaGVja2JveCBoYXMgbm8gdmFsdWUsIHNvIGNvcnJlY3QgaXQgaGVyZVxuICAgICAgICA7KCEoY2ggfHwgcmEpIHx8IGVsLmNoZWNrZWQpICYmIGNiKG4sIG5vcm1hbGl6ZShjaCAmJiB2YWwgPT09ICcnID8gJ29uJyA6IHZhbCkpXG4gICAgICB9XG4gICAgICBicmVha1xuICAgIGNhc2UgJ3RleHRhcmVhJzpcbiAgICAgIGNiKG4sIG5vcm1hbGl6ZShlbC52YWx1ZSkpXG4gICAgICBicmVha1xuICAgIGNhc2UgJ3NlbGVjdCc6XG4gICAgICBpZiAoZWwudHlwZS50b0xvd2VyQ2FzZSgpID09PSAnc2VsZWN0LW9uZScpIHtcbiAgICAgICAgb3B0Q2IoZWwuc2VsZWN0ZWRJbmRleCA+PSAwID8gZWwub3B0aW9uc1tlbC5zZWxlY3RlZEluZGV4XSA6IG51bGwpXG4gICAgICB9IGVsc2Uge1xuICAgICAgICBmb3IgKGkgPSAwOyBlbC5sZW5ndGggJiYgaSA8IGVsLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgZWwub3B0aW9uc1tpXS5zZWxlY3RlZCAmJiBvcHRDYihlbC5vcHRpb25zW2ldKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgICBicmVha1xuICAgIH1cbiAgfVxuXG4gIC8vIGNvbGxlY3QgdXAgYWxsIGZvcm0gZWxlbWVudHMgZm91bmQgZnJvbSB0aGUgcGFzc2VkIGFyZ3VtZW50IGVsZW1lbnRzIGFsbFxuICAvLyB0aGUgd2F5IGRvd24gdG8gY2hpbGQgZWxlbWVudHM7IHBhc3MgYSAnPGZvcm0+JyBvciBmb3JtIGZpZWxkcy5cbiAgLy8gY2FsbGVkIHdpdGggJ3RoaXMnPWNhbGxiYWNrIHRvIHVzZSBmb3Igc2VyaWFsKCkgb24gZWFjaCBlbGVtZW50XG4gIGZ1bmN0aW9uIGVhY2hGb3JtRWxlbWVudCgpIHtcbiAgICB2YXIgY2IgPSB0aGlzXG4gICAgICAsIGUsIGlcbiAgICAgICwgc2VyaWFsaXplU3VidGFncyA9IGZ1bmN0aW9uIChlLCB0YWdzKSB7XG4gICAgICAgICAgdmFyIGksIGosIGZhXG4gICAgICAgICAgZm9yIChpID0gMDsgaSA8IHRhZ3MubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGZhID0gZVtieVRhZ10odGFnc1tpXSlcbiAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBmYS5sZW5ndGg7IGorKykgc2VyaWFsKGZhW2pdLCBjYilcbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgIGZvciAoaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspIHtcbiAgICAgIGUgPSBhcmd1bWVudHNbaV1cbiAgICAgIGlmICgvaW5wdXR8c2VsZWN0fHRleHRhcmVhL2kudGVzdChlLnRhZ05hbWUpKSBzZXJpYWwoZSwgY2IpXG4gICAgICBzZXJpYWxpemVTdWJ0YWdzKGUsIFsgJ2lucHV0JywgJ3NlbGVjdCcsICd0ZXh0YXJlYScgXSlcbiAgICB9XG4gIH1cblxuICAvLyBzdGFuZGFyZCBxdWVyeSBzdHJpbmcgc3R5bGUgc2VyaWFsaXphdGlvblxuICBmdW5jdGlvbiBzZXJpYWxpemVRdWVyeVN0cmluZygpIHtcbiAgICByZXR1cm4gcmVxd2VzdC50b1F1ZXJ5U3RyaW5nKHJlcXdlc3Quc2VyaWFsaXplQXJyYXkuYXBwbHkobnVsbCwgYXJndW1lbnRzKSlcbiAgfVxuXG4gIC8vIHsgJ25hbWUnOiAndmFsdWUnLCAuLi4gfSBzdHlsZSBzZXJpYWxpemF0aW9uXG4gIGZ1bmN0aW9uIHNlcmlhbGl6ZUhhc2goKSB7XG4gICAgdmFyIGhhc2ggPSB7fVxuICAgIGVhY2hGb3JtRWxlbWVudC5hcHBseShmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICAgIGlmIChuYW1lIGluIGhhc2gpIHtcbiAgICAgICAgaGFzaFtuYW1lXSAmJiAhaXNBcnJheShoYXNoW25hbWVdKSAmJiAoaGFzaFtuYW1lXSA9IFtoYXNoW25hbWVdXSlcbiAgICAgICAgaGFzaFtuYW1lXS5wdXNoKHZhbHVlKVxuICAgICAgfSBlbHNlIGhhc2hbbmFtZV0gPSB2YWx1ZVxuICAgIH0sIGFyZ3VtZW50cylcbiAgICByZXR1cm4gaGFzaFxuICB9XG5cbiAgLy8gWyB7IG5hbWU6ICduYW1lJywgdmFsdWU6ICd2YWx1ZScgfSwgLi4uIF0gc3R5bGUgc2VyaWFsaXphdGlvblxuICByZXF3ZXN0LnNlcmlhbGl6ZUFycmF5ID0gZnVuY3Rpb24gKCkge1xuICAgIHZhciBhcnIgPSBbXVxuICAgIGVhY2hGb3JtRWxlbWVudC5hcHBseShmdW5jdGlvbiAobmFtZSwgdmFsdWUpIHtcbiAgICAgIGFyci5wdXNoKHtuYW1lOiBuYW1lLCB2YWx1ZTogdmFsdWV9KVxuICAgIH0sIGFyZ3VtZW50cylcbiAgICByZXR1cm4gYXJyXG4gIH1cblxuICByZXF3ZXN0LnNlcmlhbGl6ZSA9IGZ1bmN0aW9uICgpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkgcmV0dXJuICcnXG4gICAgdmFyIG9wdCwgZm5cbiAgICAgICwgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMClcblxuICAgIG9wdCA9IGFyZ3MucG9wKClcbiAgICBvcHQgJiYgb3B0Lm5vZGVUeXBlICYmIGFyZ3MucHVzaChvcHQpICYmIChvcHQgPSBudWxsKVxuICAgIG9wdCAmJiAob3B0ID0gb3B0LnR5cGUpXG5cbiAgICBpZiAob3B0ID09ICdtYXAnKSBmbiA9IHNlcmlhbGl6ZUhhc2hcbiAgICBlbHNlIGlmIChvcHQgPT0gJ2FycmF5JykgZm4gPSByZXF3ZXN0LnNlcmlhbGl6ZUFycmF5XG4gICAgZWxzZSBmbiA9IHNlcmlhbGl6ZVF1ZXJ5U3RyaW5nXG5cbiAgICByZXR1cm4gZm4uYXBwbHkobnVsbCwgYXJncylcbiAgfVxuXG4gIHJlcXdlc3QudG9RdWVyeVN0cmluZyA9IGZ1bmN0aW9uIChvLCB0cmFkKSB7XG4gICAgdmFyIHByZWZpeCwgaVxuICAgICAgLCB0cmFkaXRpb25hbCA9IHRyYWQgfHwgZmFsc2VcbiAgICAgICwgcyA9IFtdXG4gICAgICAsIGVuYyA9IGVuY29kZVVSSUNvbXBvbmVudFxuICAgICAgLCBhZGQgPSBmdW5jdGlvbiAoa2V5LCB2YWx1ZSkge1xuICAgICAgICAgIC8vIElmIHZhbHVlIGlzIGEgZnVuY3Rpb24sIGludm9rZSBpdCBhbmQgcmV0dXJuIGl0cyB2YWx1ZVxuICAgICAgICAgIHZhbHVlID0gKCdmdW5jdGlvbicgPT09IHR5cGVvZiB2YWx1ZSkgPyB2YWx1ZSgpIDogKHZhbHVlID09IG51bGwgPyAnJyA6IHZhbHVlKVxuICAgICAgICAgIHNbcy5sZW5ndGhdID0gZW5jKGtleSkgKyAnPScgKyBlbmModmFsdWUpXG4gICAgICAgIH1cbiAgICAvLyBJZiBhbiBhcnJheSB3YXMgcGFzc2VkIGluLCBhc3N1bWUgdGhhdCBpdCBpcyBhbiBhcnJheSBvZiBmb3JtIGVsZW1lbnRzLlxuICAgIGlmIChpc0FycmF5KG8pKSB7XG4gICAgICBmb3IgKGkgPSAwOyBvICYmIGkgPCBvLmxlbmd0aDsgaSsrKSBhZGQob1tpXVsnbmFtZSddLCBvW2ldWyd2YWx1ZSddKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBJZiB0cmFkaXRpb25hbCwgZW5jb2RlIHRoZSBcIm9sZFwiIHdheSAodGhlIHdheSAxLjMuMiBvciBvbGRlclxuICAgICAgLy8gZGlkIGl0KSwgb3RoZXJ3aXNlIGVuY29kZSBwYXJhbXMgcmVjdXJzaXZlbHkuXG4gICAgICBmb3IgKHByZWZpeCBpbiBvKSB7XG4gICAgICAgIGlmIChvLmhhc093blByb3BlcnR5KHByZWZpeCkpIGJ1aWxkUGFyYW1zKHByZWZpeCwgb1twcmVmaXhdLCB0cmFkaXRpb25hbCwgYWRkKVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIHNwYWNlcyBzaG91bGQgYmUgKyBhY2NvcmRpbmcgdG8gc3BlY1xuICAgIHJldHVybiBzLmpvaW4oJyYnKS5yZXBsYWNlKC8lMjAvZywgJysnKVxuICB9XG5cbiAgZnVuY3Rpb24gYnVpbGRQYXJhbXMocHJlZml4LCBvYmosIHRyYWRpdGlvbmFsLCBhZGQpIHtcbiAgICB2YXIgbmFtZSwgaSwgdlxuICAgICAgLCByYnJhY2tldCA9IC9cXFtcXF0kL1xuXG4gICAgaWYgKGlzQXJyYXkob2JqKSkge1xuICAgICAgLy8gU2VyaWFsaXplIGFycmF5IGl0ZW0uXG4gICAgICBmb3IgKGkgPSAwOyBvYmogJiYgaSA8IG9iai5sZW5ndGg7IGkrKykge1xuICAgICAgICB2ID0gb2JqW2ldXG4gICAgICAgIGlmICh0cmFkaXRpb25hbCB8fCByYnJhY2tldC50ZXN0KHByZWZpeCkpIHtcbiAgICAgICAgICAvLyBUcmVhdCBlYWNoIGFycmF5IGl0ZW0gYXMgYSBzY2FsYXIuXG4gICAgICAgICAgYWRkKHByZWZpeCwgdilcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBidWlsZFBhcmFtcyhwcmVmaXggKyAnWycgKyAodHlwZW9mIHYgPT09ICdvYmplY3QnID8gaSA6ICcnKSArICddJywgdiwgdHJhZGl0aW9uYWwsIGFkZClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0gZWxzZSBpZiAob2JqICYmIG9iai50b1N0cmluZygpID09PSAnW29iamVjdCBPYmplY3RdJykge1xuICAgICAgLy8gU2VyaWFsaXplIG9iamVjdCBpdGVtLlxuICAgICAgZm9yIChuYW1lIGluIG9iaikge1xuICAgICAgICBidWlsZFBhcmFtcyhwcmVmaXggKyAnWycgKyBuYW1lICsgJ10nLCBvYmpbbmFtZV0sIHRyYWRpdGlvbmFsLCBhZGQpXG4gICAgICB9XG5cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gU2VyaWFsaXplIHNjYWxhciBpdGVtLlxuICAgICAgYWRkKHByZWZpeCwgb2JqKVxuICAgIH1cbiAgfVxuXG4gIHJlcXdlc3QuZ2V0Y2FsbGJhY2tQcmVmaXggPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIGNhbGxiYWNrUHJlZml4XG4gIH1cblxuICAvLyBqUXVlcnkgYW5kIFplcHRvIGNvbXBhdGliaWxpdHksIGRpZmZlcmVuY2VzIGNhbiBiZSByZW1hcHBlZCBoZXJlIHNvIHlvdSBjYW4gY2FsbFxuICAvLyAuYWpheC5jb21wYXQob3B0aW9ucywgY2FsbGJhY2spXG4gIHJlcXdlc3QuY29tcGF0ID0gZnVuY3Rpb24gKG8sIGZuKSB7XG4gICAgaWYgKG8pIHtcbiAgICAgIG9bJ3R5cGUnXSAmJiAob1snbWV0aG9kJ10gPSBvWyd0eXBlJ10pICYmIGRlbGV0ZSBvWyd0eXBlJ11cbiAgICAgIG9bJ2RhdGFUeXBlJ10gJiYgKG9bJ3R5cGUnXSA9IG9bJ2RhdGFUeXBlJ10pXG4gICAgICBvWydqc29ucENhbGxiYWNrJ10gJiYgKG9bJ2pzb25wQ2FsbGJhY2tOYW1lJ10gPSBvWydqc29ucENhbGxiYWNrJ10pICYmIGRlbGV0ZSBvWydqc29ucENhbGxiYWNrJ11cbiAgICAgIG9bJ2pzb25wJ10gJiYgKG9bJ2pzb25wQ2FsbGJhY2snXSA9IG9bJ2pzb25wJ10pXG4gICAgfVxuICAgIHJldHVybiBuZXcgUmVxd2VzdChvLCBmbilcbiAgfVxuXG4gIHJlcXdlc3QuYWpheFNldHVwID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcbiAgICBvcHRpb25zID0gb3B0aW9ucyB8fCB7fVxuICAgIGZvciAodmFyIGsgaW4gb3B0aW9ucykge1xuICAgICAgZ2xvYmFsU2V0dXBPcHRpb25zW2tdID0gb3B0aW9uc1trXVxuICAgIH1cbiAgfVxuXG4gIHJldHVybiByZXF3ZXN0XG59KTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHJlcXdlc3QgPSByZXF1aXJlKFwiLi9ib3dlcl9jb21wb25lbnRzL3JlcXdlc3QvcmVxd2VzdC5qc1wiKTtcbnZhciBEZWxlZ2F0ZSA9IHJlcXVpcmUoXCIuL2Jvd2VyX2NvbXBvbmVudHMvZG9tLWRlbGVnYXRlL2xpYi9kZWxlZ2F0ZS5qc1wiKTtcbnZhciBoZWFkZXIgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcuby1oZWFkZXInKTtcbnZhciBteUZ0QnV0dG9uID0gaGVhZGVyLnF1ZXJ5U2VsZWN0b3IoJy5vLWhlYWRlci1idXR0b25bZGF0YS10YXJnZXQtcGFuZWw9XCJteWZ0XCJdJyk7XG52YXIgZGVmYXVsdFBhbmVsID0gaGVhZGVyLmdldEF0dHJpYnV0ZSgnZGF0YS1kZWZhdWx0LXBhbmVsJyk7XG52YXIgZGVsZWdhdGUgPSBuZXcgRGVsZWdhdGUoaGVhZGVyKTtcbnZhciBib2R5RGVsZWdhdGUgPSBuZXcgRGVsZWdhdGUoKTtcbnZhciBOb3RpZnkgPSByZXF1aXJlKCcuL3NyYy9qcy9Ob3RpZnknKTtcbnJlcXVpcmUoXCIuL2Jvd2VyX2NvbXBvbmVudHMvbmV4dC11c2VyLXByZWZlcmVuY2VzL3NyYy9tYWluLmpzXCIpO1xudmFyIFVzZXIgPSByZXF1aXJlKFwiLi9ib3dlcl9jb21wb25lbnRzL25leHQtdXNlci1tb2RlbC1jb21wb25lbnQvbWFpbi5qc1wiKTtcblxuZGVsZWdhdGUub24oJ2NsaWNrJywgJy5vLWhlYWRlci1idXR0b24tanMnLCBmdW5jdGlvbihldmVudCkge1xuXHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcblxuXHQvLyBIQUNLXG5cdHZhciB0YXJnZXRQYW5lbCA9IGV2ZW50LnRhcmdldC5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0LXBhbmVsJylcblx0XHR8fCBldmVudC50YXJnZXQucGFyZW50Tm9kZS5nZXRBdHRyaWJ1dGUoJ2RhdGEtdGFyZ2V0LXBhbmVsJylcblx0XHR8fCBkZWZhdWx0UGFuZWw7XG5cdHZhciBjdXJyZW50UGFuZWwgPSBoZWFkZXIuZ2V0QXR0cmlidXRlKCdkYXRhLXBhbmVsJyk7XG5cdGlmIChjdXJyZW50UGFuZWwgIT09IHRhcmdldFBhbmVsICYmIHRhcmdldFBhbmVsICE9PSBkZWZhdWx0UGFuZWwpIHtcblx0XHRib2R5RGVsZWdhdGUucm9vdChkb2N1bWVudC5ib2R5KTtcblx0XHRoZWFkZXIuc2V0QXR0cmlidXRlKCdkYXRhLXBhbmVsJywgdGFyZ2V0UGFuZWwpO1xuXHR9IGVsc2Uge1xuXHRcdGJvZHlEZWxlZ2F0ZS5yb290KCk7XG5cdFx0aWYgKGRlZmF1bHRQYW5lbCkge1xuXHRcdFx0aGVhZGVyLnNldEF0dHJpYnV0ZSgnZGF0YS1wYW5lbCcsIGRlZmF1bHRQYW5lbCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGhlYWRlci5yZW1vdmVBdHRyaWJ1dGUoJ2RhdGEtcGFuZWwnKTtcblx0XHR9XG5cdH1cbn0pO1xuXG5kZWxlZ2F0ZS5vbignY2xpY2snLCBmdW5jdGlvbihldmVudCkge1xuXHRldmVudC5zdG9wUHJvcGFnYXRpb24oKTtcbn0pO1xuXG5ib2R5RGVsZWdhdGUub24oJ2NsaWNrJywgZnVuY3Rpb24oZXZlbnQpIHtcblx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0ZXZlbnQuc3RvcFByb3BhZ2F0aW9uKCk7XG5cdGlmIChkZWZhdWx0UGFuZWwpIHtcblx0XHRoZWFkZXIuc2V0QXR0cmlidXRlKCdkYXRhLXBhbmVsJywgZGVmYXVsdFBhbmVsKTtcblx0fSBlbHNlIHtcblx0XHRoZWFkZXIucmVtb3ZlQXR0cmlidXRlKCdkYXRhLXBhbmVsJyk7XG5cdH1cbn0pO1xuXG5cbi8vIExpc3RlbiBmb3IgdGhlIG5vdGlmaWNhdGlvbiBwb2xsZXIgdG8gcmVwb3J0IHRoZSBudW1iZXIgb2YgbmV3IGl0ZW1zXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdub3RpZmljYXRpb25zOmxvYWQnLCBmdW5jdGlvbihlKSB7XG5cdHZhciBub3RpZmljYXRpb25zID0gZS5kZXRhaWw7XG5cdGlmIChwYXJzZUludChub3RpZmljYXRpb25zLmNvdW50LCAxMCkgPiAwKSB7XG5cdFx0ZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm5vdGlmeS1iYWRnZScpLnRleHRDb250ZW50ID0gXCIoXCIrbm90aWZpY2F0aW9ucy5jb3VudCtcIilcIjtcblx0fVxufSk7XG5cbmRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ25vdGlmaWNhdGlvbnM6bmV3JywgZnVuY3Rpb24oZSkge1xuXHR2YXIgZGF0YSA9IGUuZGV0YWlsO1xuXHRcblx0dmFyIGlkID0gZGF0YS5ub3RpZmljYXRpb25zWzBdLml0ZW07XG5cdHJlcXdlc3Qoe1xuXHRcdHVybDogJy8nICsgaWQsXG5cdFx0aGVhZGVyczoge1xuXHRcdFx0J0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcblx0XHRcdCdBY2NlcHQnOiAnYXBwbGljYXRpb24vanNvbidcblx0XHR9XG5cdH0pLnRoZW4oZnVuY3Rpb24ocmVzKSB7XG5cdFx0bmV3IE5vdGlmeSh7XG5cdFx0XHR0aXRsZTogJ05ldyBhcnRpY2xlIGluICcgKyBkYXRhLnN0cmVhbS5kaXNwbGF5VGV4dCxcblx0XHRcdGJvZHk6IHJlcy5oZWFkbGluZSxcblx0XHRcdGxpZmVzcGFuOiAxMDAwICogMTAsXG5cdFx0XHRvbmNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0bG9jYXRpb24uaHJlZiA9ICcvJyArIHJlcy5pZDtcblx0XHRcdH1cblx0XHR9KS5zaG93KCk7XG5cdH0pLmZhaWwoZnVuY3Rpb24oZXJyKSB7XG5cdFx0bmV3IE5vdGlmeSh7XG5cdFx0XHR0aXRsZTogJ05ldyBhcnRpY2xlIGluICcgKyBkYXRhLnN0cmVhbS5kaXNwbGF5VGV4dCxcblx0XHRcdGxpZmVzcGFuOiAxMDAwICogMTAsXG5cdFx0XHRvbmNsaWNrOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0bG9jYXRpb24uaHJlZiA9ICcvJyArIGRhdGEubm90aWZpY2F0aW9uc1swXS5pdGVtO1xuXHRcdFx0fVxuXHRcdH0pLnNob3coKTtcblx0fSk7XG5cblxufSk7XG5cbi8vIE1ha2UgdGhlIGZvbGxvdyBidXR0b24gdmlzaWJsZSAgXG5mdW5jdGlvbiBzZXRGb2xsb3dpbmdCdXR0b24gKCkge1xuXHR2YXIgdWlkID0gbmV3IFVzZXIoZG9jdW1lbnQuY29va2llKS5pZCgpO1xuXHRpZiAodWlkKSB7XG5cdFx0bXlGdEJ1dHRvbi5zZXRBdHRyaWJ1dGUoJ2hyZWYnLCAnL3VzZXJzLycgKyB1aWQgKyAnL2ZvbGxvd2luZy9uZXcnKTtcblx0XHRteUZ0QnV0dG9uLnRleHRDb250ZW50ID0gJ0ZvbGxvd2luZyc7XG5cdFx0bXlGdEJ1dHRvbi5pbnNlcnRBZGphY2VudEhUTUwoJ2JlZm9yZWVuZCcsICcgPHNwYW4gY2xhc3M9XCJub3RpZnktYmFkZ2VcIj48L3NwYW4+Jyk7XG5cdH1cbn1cblxuZnVuY3Rpb24gdHJhbnNpdGlvbk15RnRCdXR0b24gKHR5cGUpIHtcblxuXHRmdW5jdGlvbiBsaXN0ZW5lcigpIHtcblx0XHRteUZ0QnV0dG9uLmNsYXNzTGlzdC5yZW1vdmUoJ3RyYW5zaXRpb25pbmcnKTtcblx0XHRteUZ0QnV0dG9uLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3RyYW5zaXRpb25lbmQnLCBsaXN0ZW5lcik7XG5cdH1cblxuXHRteUZ0QnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ3RyYW5zaXRpb25lbmQnLCBsaXN0ZW5lcik7XG5cdG15RnRCdXR0b24uY2xhc3NMaXN0LmFkZCgndHJhbnNpdGlvbmluZycpO1xuXHRteUZ0QnV0dG9uLmNsYXNzTGlzdC5hZGQoJ215ZnQtLScgKyB0eXBlKTtcblx0bXlGdEJ1dHRvbi5vZmZzZXRXaWR0aDsgLy9mb3JjZXMgcmVwYWludFxuXG5cdG15RnRCdXR0b24uY2xhc3NMaXN0LnJlbW92ZSgnbXlmdC0tJyArIHR5cGUpO1xufVxuXG5kb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKCdmYXZvdXJpdGVzOmFkZCcsIGZ1bmN0aW9uIChlKSB7XG5cdHRyYW5zaXRpb25NeUZ0QnV0dG9uKCdhZGQtZmF2b3VyaXRlJyk7XG59KTtcblxuZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcignZmF2b3VyaXRlczpyZW1vdmUnLCBmdW5jdGlvbiAoZSkge1xuXHR0cmFuc2l0aW9uTXlGdEJ1dHRvbigncmVtb3ZlLWZhdm91cml0ZScpO1xufSk7XG5cbnZhciBkYXRhID0gcmVxdWlyZSgnLi9zcmMvdWJlci1pbmRleC5qc29uJykuZGF0YTtcblxuZnVuY3Rpb24gc3BsaXRBcnJheShhcnIsIGJ5KSB7XG5cdHJldHVybiBhcnIucmVkdWNlKGZ1bmN0aW9uKG91dCwgdmFsdWUsIGluZGV4KSB7XG5cdFx0dmFyIGNvbHVtbiA9IGluZGV4ICUgYnk7XG5cdFx0b3V0W2NvbHVtbl0gPSBvdXRbY29sdW1uXSB8fCBbXTtcblx0XHRvdXRbY29sdW1uXS5wdXNoKHZhbHVlKTtcblx0XHRyZXR1cm4gb3V0O1xuXHR9LFtdKTtcbn1cblxuLy8gU3BsaXQgdGhlIGRhdGEgaW50byBmb3VyIGNvbHVtbnMsIGFuZCBhZ2FpbiBpbnRvIDJcbmRhdGEgPSBzcGxpdEFycmF5KHNwbGl0QXJyYXkoZGF0YSwgNCksIDIpO1xuXG5oZWFkZXIucXVlcnlTZWxlY3RvcignLm8taGVhZGVyX19zZWNvbmRhcnktLW1lbnUtanMnKS5pbm5lckhUTUwgPSAnPHVsIGNsYXNzPVwidWJlci1pbmRleFwiPidcblx0KyBkYXRhLm1hcChmdW5jdGlvbihpdGVtKSB7XG5cdFx0cmV0dXJuICc8dWwgZGF0YS1vLWdyaWQtY29sc3Bhbj1cIjYgTTYgTDYgWEw2XCI+J1xuXHRcdFx0KyBpdGVtLm1hcChmdW5jdGlvbihpdGVtKSB7XG5cdFx0XHRcdHJldHVybiAnPHVsIGRhdGEtby1ncmlkLWNvbHNwYW49XCIxMiBNMTIgTDYgWEw2XCI+J1xuXHRcdFx0XHRcdCsgaXRlbS5tYXAoZnVuY3Rpb24oaXRlbSkge1xuXHRcdFx0XHRcdFx0cmV0dXJuICc8bGkgY2xhc3M9XCJ1YmVyLWluZGV4X190aXRsZVwiPidcblx0XHRcdFx0XHRcdFx0KyAnPGEgaHJlZj1cIicgKyBpdGVtLm5leHRVcmwgKyAnXCI+JyArIGl0ZW0udGl0bGUgKyAnPC9hPidcblx0XHRcdFx0XHRcdFx0KyAnPHVsIGNsYXNzPVwidWJlci1pbmRleF9fY2hpbGRyZW5cIj4nXG5cdFx0XHRcdFx0XHRcdCsgaXRlbS5uYXZpZ2F0aW9uSXRlbXMubWFwKGZ1bmN0aW9uKGNoaWxkKSB7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuICc8bGkgY2xhc3M9XCJ1YmVyLWluZGV4X19jaGlsZFwiPjxhIGhyZWY9XCInICsgY2hpbGQubmV4dFVybCArICdcIj4nICsgY2hpbGQudGl0bGUgKyAnPC9hPjwvbGk+Jztcblx0XHRcdFx0XHRcdFx0fSkuam9pbignJylcblx0XHRcdFx0XHRcdFx0KyAnPC91bD4nXG5cdFx0XHRcdFx0XHRcdCsgJzwvbGk+Jztcblx0XHRcdFx0XHR9KS5qb2luKCcnKVxuXHRcdFx0XHRcdCsgJzwvdWw+Jztcblx0XHRcdH0pLmpvaW4oJycpXG5cdFx0XHQrICc8L3VsPic7XG5cdH0pLmpvaW4oJycpXG5cdCsgJzwvdWw+Jztcblxuc2V0Rm9sbG93aW5nQnV0dG9uKCk7XG4iLCIvKipcbiAqIE1lc3NhZ2UgdGhlIHVzZXJcbiAqXG4gKiA+IG5ldyBOb3RpZnkoeyBodG1sOiBcIllvdSd2ZSBnb3QgbWFpbFwiLCBsaWZlc3BhY2U6IDEwMDAwIH0pLnNob3coKTtcbiAqXG4gKiBUT0RPXG4gKlxuICogIC0gVVggdG8gZGVhbCB3aXRoIG11bHRpcGxlIG1lc3NhZ2VzLlxuICogIC0gVzMgLyBDaHJvbWUgZGVza3RvcCBub3RpZmljYXRpb25zIHBlcm1pc3Npb24uXG4gKiAgLSBBY2tub3dsZWRnZW1lbnQgVVhcbiAqXG4gKi9cbnZhciBOb3RpZnkgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xuICAgIHRoaXMudGVtcGxhdGUgPSAnPGgzIGNsYXNzPVwibWVzc2FnZV9fdGl0bGVcIj4nICsgbWVzc2FnZS50aXRsZSArICc8aSBjbGFzcz1cIm1lc3NhZ2VfX2Nsb3NlIGljb24gaWNvbl9fY2xvc2VcIj48L2k+PC9oMz48c3BhbiBjbGFzcz1cIm1lc3NhZ2VfX2JvZHlcIj4nICsgbWVzc2FnZS5ib2R5ICsgJzwvc3Bhbj4nO1xuICAgIHRoaXMubGlmZXNwYW4gPSBtZXNzYWdlLmxpZmVzcGFuIHx8IDUwMDA7XG4gICAgdGhpcy5kb20gPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICB0aGlzLmRvbS5jbGFzc05hbWUgPSAnbWVzc2FnZV9fY29udGFpbmVyJ1xuICAgIHRoaXMuZG9tLmlubmVySFRNTCA9IHRoaXMudGVtcGxhdGU7IFxuICAgIHRoaXMuaGFzRGVza3RvcFBlcm1pc3Npb24gPSBmYWxzZTtcbiAgICB0aGlzLnJvb3QgPSBkb2N1bWVudC5ib2R5O1xuICAgIHRoaXMubWVzc2FnZSA9IG1lc3NhZ2U7XG59O1xuXG5mdW5jdGlvbiBjcmVhdGVOb3RpZmljYXRpb24obWVzc2FnZSkge1xuICAgIHZhciBub3RpZmljYXRpb24gPSBuZXcgTm90aWZpY2F0aW9uKG1lc3NhZ2UudGl0bGUsIHtib2R5OiBtZXNzYWdlLmJvZHl9KTtcbiAgICBub3RpZmljYXRpb24uYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCBtZXNzYWdlLm9uY2xpY2spO1xuICAgIHJldHVybiBub3RpZmljYXRpb247XG59XG5cbk5vdGlmeS5wcm90b3R5cGUuc2hvdyA9IGZ1bmN0aW9uICgpIHtcbiAgICBcbiAgICB2YXIgc2VsZiA9IHRoaXM7XG4gICAgLy8gZ3JhbnRlZFxuICAgIC8vVE9ETyAtIGVuYWJsZSB0aGlzIGFnYWluIG9uY2Ugd2UndmUgdGhvdWdodCBhYm91dCB0aGUgVVghXG4gICAgaWYgKGZhbHNlICYmIHdpbmRvdy5Ob3RpZmljYXRpb24gJiYgTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gPT09IFwiZ3JhbnRlZFwiKSB7XG4gICAgICAgIGNyZWF0ZU5vdGlmaWNhdGlvbihzZWxmLm1lc3NhZ2UpO1xuICAgIH0gZWxzZSBpZiAoZmFsc2UgJiYgd2luZG93Lk5vdGlmaWNhdGlvbiAmJiBOb3RpZmljYXRpb24ucGVybWlzc2lvbiAhPT0gXCJkZW5pZWRcIikge1xuICAgICAgXG4gICAgICAgIE5vdGlmaWNhdGlvbi5yZXF1ZXN0UGVybWlzc2lvbihmdW5jdGlvbiAoc3RhdHVzKSB7XG4gICAgICAgICAgICBpZiAoTm90aWZpY2F0aW9uLnBlcm1pc3Npb24gIT09IHN0YXR1cykge1xuICAgICAgICAgICAgICAgIE5vdGlmaWNhdGlvbi5wZXJtaXNzaW9uID0gc3RhdHVzO1xuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICAvLyBncmFudGVkXG4gICAgICAgICAgICBpZiAoc3RhdHVzID09PSBcImdyYW50ZWRcIikge1xuICAgICAgICAgICAgICAgIGNyZWF0ZU5vdGlmaWNhdGlvbihzZWxmLm1lc3NhZ2UpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICBzZWxmLnNob3dIdG1sTm90aWZpY2F0aW9uKCk7ICAgIFxuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICAvLyBkZW5pZWRcbiAgICB9IGVsc2Uge1xuICAgICAgICB0aGlzLnNob3dIdG1sTm90aWZpY2F0aW9uKCk7ICAgIFxuICAgIH1cbn07XG5cbk5vdGlmeS5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uICgpIHtcbiAgICAvLyBGSVhNRSBmb3JnZXQgaWYgSSBuZWVkIHRvIHJlbW92ZSBldmVudCBsaXN0ZW5lciA6KVxuICAgIHRoaXMuZG9tLnBhcmVudE5vZGUucmVtb3ZlQ2hpbGQodGhpcy5kb20pO1xufTtcblxuTm90aWZ5LnByb3RvdHlwZS5zaG93SHRtbE5vdGlmaWNhdGlvbiA9IGZ1bmN0aW9uICgpIHtcblxuICAgIHZhciBzZWxmID0gdGhpcztcblxuICAgIHRoaXMucm9vdC5hcHBlbmRDaGlsZCh0aGlzLmRvbSk7XG5cbiAgICAvLyBBdXRvbWF0aWNhbGx5IGRlc3Ryb3kgdGhlIGJveCBhZnRlciBhIGZldyBzZWNvbmRzXG4gICAgdmFyIHNlbGZEZXN0cnVjdCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICB9LCB0aGlzLmxpZmVzcGFuKTsgXG5cbiAgICAvLyBBY2tub3dsZWRnbWVudCBVSVxuICAgIHRoaXMuZG9tLnF1ZXJ5U2VsZWN0b3IoJy5tZXNzYWdlX19jbG9zZScpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgZnVuY3Rpb24gKCkge1xuICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHNlbGZEZXN0cnVjdCk7XG4gICAgfSk7XG5cbiAgICB0aGlzLmRvbS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGZ1bmN0aW9uIChlKSB7XG4gICAgICAgIGlmKGUudGFyZ2V0LmNsYXNzTmFtZS5pbmRleE9mKCdtZXNzYWdlX19jbG9zZScpID49IDApIHtcbiAgICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBzZWxmLm1lc3NhZ2Uub25jbGljaygpO1xuICAgICAgICBzZWxmLmRlc3Ryb3koKTtcbiAgICAgICAgY2xlYXJUaW1lb3V0KHNlbGZEZXN0cnVjdCk7XG4gICAgfSk7XG5cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTm90aWZ5OyIsIm1vZHVsZS5leHBvcnRzPXtcInN0YXR1c1wiOlwic3VjY2Vzc1wiLFwiZGF0YVwiOlt7XCJ0aXRsZVwiOlwiSG9tZVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbVwiLFwibmF2aWdhdGlvbkl0ZW1zXCI6W10sXCJuZXh0VXJsXCI6XCIvXCJ9LHtcInRpdGxlXCI6XCJVS1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS93b3JsZC91a1wiLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJCdXNpbmVzc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS93b3JsZC91ay9idXNpbmVzc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9lNDlkZDBiOC1mYmJjLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImU0OWRkMGI4LWZiYmMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6QnVzaW5lc3NcIn0se1widGl0bGVcIjpcIlVLIENvbXBhbmllc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvdWtcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvYmUwYzg0YTQtZjdlMi0xMWRmLWI3NzAtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJiZTBjODRhNC1mN2UyLTExZGYtYjc3MC0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkNvbXBhbmllc1wifV0sXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTp1a1wifSx7XCJ0aXRsZVwiOlwiV29ybGRcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGRcIixcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiQWZyaWNhXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3dvcmxkL2FmcmljYVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wNDJkNzdkNC1mYmJlLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjA0MmQ3N2Q0LWZiYmUtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6QWZyaWNhXCJ9LHtcInRpdGxlXCI6XCJFdXJvcGVcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGQvZXVyb3BlXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzAxMmJhODNhLWZiYmUtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJCcnVzc2Vsc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS93b3JsZC9ldXJvcGUvYnJ1c3NlbHNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvYjI5Yzk2MGMtZmJiZC0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJiMjljOTYwYy1mYmJkLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIn1dLFwidXVpZFwiOlwiMDEyYmE4M2EtZmJiZS0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpFdXJvcGVcIn0se1widGl0bGVcIjpcIlVLXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3dvcmxkL3VrXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzI4MzZlYmJlLWNkMjYtMTFkZS1hNzQ4LTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJCdXNpbmVzc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS93b3JsZC91ay9idXNpbmVzc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9lNDlkZDBiOC1mYmJjLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImU0OWRkMGI4LWZiYmMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiRWNvbm9teVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS93b3JsZC91ay9lY29ub215XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2Q5YTZiODMyLWZiYmMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZDlhNmI4MzItZmJiYy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJVSyBDb21wYW5pZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL3VrXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2JlMGM4NGE0LWY3ZTItMTFkZi1iNzcwLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiYmUwYzg0YTQtZjdlMi0xMWRmLWI3NzAtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJQb2xpdGljcyAmIFBvbGljeVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS93b3JsZC91ay9wb2xpdGljc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9lOGFmOGNiNC1mYmJjLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImU4YWY4Y2I0LWZiYmMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiU2NvdHRpc2ggaW5kZXBlbmRlbmNlXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2luZGVwdGgvc2NvdHRpc2gtaW5kZXBlbmRlbmNlXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzg0OTI4ZTFhLWNiNDEtMTFlMS1iODk2LTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiODQ5MjhlMWEtY2I0MS0xMWUxLWI4OTYtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJVSyBTbWFsbCBDb21wYW5pZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL3Vrc21hbGxlcmNvbXBhbmllc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9mMjEyYmQyNi1mN2RlLTExZGYtYjc3MC0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImYyMTJiZDI2LWY3ZGUtMTFkZi1iNzcwLTAwMTQ0ZmVhYjQ5YVwifV0sXCJ1dWlkXCI6XCIyODM2ZWJiZS1jZDI2LTExZGUtYTc0OC0wMDE0NGZlYWJkYzBcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOnVrXCJ9LHtcInRpdGxlXCI6XCJVUyAmIENhbmFkYVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS93b3JsZC91c1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8zNjIxMjdjOC1mYmJkLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiRWNvbm9teVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS93b3JsZC91cy9lY29ub215XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzI1NTVjNGU2LWZiYzUtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMjU1NWM0ZTYtZmJjNS0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJQb2xpdGljcyAmIFBvbGljeVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS93b3JsZC91cy9wb2xpdGljc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9lYjZjZjlkZS1mYmM0LTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImViNmNmOWRlLWZiYzQtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiU29jaWV0eVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS93b3JsZC91cy9zb2NpZXR5XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzE4YmU5OTkwLWZiYmQtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMThiZTk5OTAtZmJiZC0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJDYW5hZGFcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vd29ybGQvY2FuYWRhXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2VlNWI0NWNlLWZiYzQtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZWU1YjQ1Y2UtZmJjNC0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9XSxcInV1aWRcIjpcIjM2MjEyN2M4LWZiYmQtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6VVNcIn1dLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6d29ybGRcIn0se1widGl0bGVcIjpcIkNvbXBhbmllc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXNcIixcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiRW5lcmd5XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy9lbmVyZ3lcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNzUzYzU3ZWUtZjdlOC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIk1pbmluZ1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvbWluaW5nXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzcwOTBiMzNlLWY3ZTgtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNzA5MGIzM2UtZjdlOC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJPaWwgJiBHYXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL29pbC1nYXNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNmRmM2JlNWEtZjdlOC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI2ZGYzYmU1YS1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlV0aWxpdGllc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvdXRpbGl0aWVzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzcyZDViZjY4LWY3ZTgtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNzJkNWJmNjgtZjdlOC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCJ9XSxcInV1aWRcIjpcIjc1M2M1N2VlLWY3ZTgtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6RW5lcmd5XCJ9LHtcInRpdGxlXCI6XCJGaW5hbmNpYWxzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy9maW5hbmNpYWxzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2YzZWRiNjQ2LWY3ZTMtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJCYW5rc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvYmFua3NcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZjExNzRjMjAtZjdlMy0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmMTE3NGMyMC1mN2UzLTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkluc3VyYW5jZVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvaW5zdXJhbmNlXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2VkNmIxMjBhLWY3ZTMtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZWQ2YjEyMGEtZjdlMy0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJQcm9wZXJ0eVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvcHJvcGVydHlcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZDgzYTBhZTQtZjdlMy0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJkODNhMGFlNC1mN2UzLTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkZpbmFuY2lhbCBTZXJ2aWNlc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvZmluYW5jaWFsLXNlcnZpY2VzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2Q2MDgwZmFhLWY3ZTMtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZDYwODBmYWEtZjdlMy0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCJ9XSxcInV1aWRcIjpcImYzZWRiNjQ2LWY3ZTMtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6RmluYW5jaWFsc1wifSx7XCJ0aXRsZVwiOlwiSGVhbHRoXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy9oZWFsdGhcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMDdlZjc0ZWEtZjdlOS0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIkhlYWx0aCBDYXJlXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy9oZWFsdGgtY2FyZVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9mMDNhZTNkZS1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImYwM2FlM2RlLWY3ZTgtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiUGhhcm1hY2V1dGljYWxzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy9waGFybWFjZXV0aWNhbHNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZWUwMTQ4MzgtZjdlOC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJlZTAxNDgzOC1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn1dLFwidXVpZFwiOlwiMDdlZjc0ZWEtZjdlOS0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpIZWFsdGhcIn0se1widGl0bGVcIjpcIkluZHVzdHJpYWxzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy9pbmR1c3RyaWFsc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy80NDY0YWI4NC1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiQWVyb3NwYWNlICYgRGVmZW5jZVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvYWVyb3NwYWNlLWRlZmVuY2VcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMTBmNzJjZmUtZjdlNC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIxMGY3MmNmZS1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkF1dG9tb2JpbGVzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy9hdXRvbW9iaWxlc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8yNTg2YTk0Mi1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjI1ODZhOTQyLWY3ZTQtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiQmFzaWMgUmVzb3VyY2VzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy9iYXNpYy1yZXNvdXJjZXNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMTU0ZWMxYzItZjdlNC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIxNTRlYzFjMi1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkNoZW1pY2Fsc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvY2hlbWljYWxzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzBjMDYzNTI4LWY3ZTQtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMGMwNjM1MjgtZjdlNC0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJDb25zdHJ1Y3Rpb25cIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tcGFuaWVzL2NvbnN0cnVjdGlvblwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wNDU5NzAzOC1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjA0NTk3MDM4LWY3ZTQtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiSW5kdXN0cmlhbCBHb29kc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvaW5kdXN0cmlhbC1nb29kc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wZTU3ZjU4Mi1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjBlNTdmNTgyLWY3ZTQtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiU3VwcG9ydCBTZXJ2aWNlc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvc3VwcG9ydC1zZXJ2aWNlc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9hOTYwNmQ2Yy1hMGNmLTExZTEtODUxZi0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImE5NjA2ZDZjLWEwY2YtMTFlMS04NTFmLTAwMTQ0ZmVhYmRjMFwifV0sXCJ1dWlkXCI6XCI0NDY0YWI4NC1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkluZHVzdHJpYWxzXCJ9LHtcInRpdGxlXCI6XCJMdXh1cnkgMzYwXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy9sdXh1cnktMzYwXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzBkMmRmMmI2LWEyNDctMTFlMC1iYjA2LTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMGQyZGYyYjYtYTI0Ny0xMWUwLWJiMDYtMDAxNDRmZWFiZGMwXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpMdXh1cnkgMzYwXCJ9LHtcInRpdGxlXCI6XCJNZWRpYVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvbWVkaWFcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMDQ0MmE1NDgtZjdlMy0xMWRmLWI3NzAtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIwNDQyYTU0OC1mN2UzLTExZGYtYjc3MC0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOk1lZGlhXCJ9LHtcInRpdGxlXCI6XCJUZWNoXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy90ZWNobm9sb2d5XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2U5MDA3NDFjLWY3ZTgtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJTY2llbmNlXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3RlY2hub2xvZ3kvc2NpZW5jZVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy83N2I2OGQ5Ni1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjc3YjY4ZDk2LWY3ZTgtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiVGVjaCBCbG9nXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly9ibG9ncy5mdC5jb20vZnR0ZWNoaHViL1wifV0sXCJ1dWlkXCI6XCJlOTAwNzQxYy1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOlRlY2hub2xvZ3lcIn0se1widGl0bGVcIjpcIlRlbGVjb21zXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy90ZWxlY29tc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy82YjBkZDg0Yy1mN2U4LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjZiMGRkODRjLWY3ZTgtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6VGVsZWNvbXNcIn0se1widGl0bGVcIjpcIlRyYW5zcG9ydFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvdHJhbnNwb3J0XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzAyNTM2NjVlLWY3ZTQtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJBaXJsaW5lc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvYWlybGluZXNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZmE2ZGFjZjYtZjdlMy0xMWRmLThkOTEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmYTZkYWNmNi1mN2UzLTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlNoaXBwaW5nXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbXBhbmllcy9zaGlwcGluZ1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9mYzg5YmY4ZS1mN2UzLTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImZjODliZjhlLWY3ZTMtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiUmFpbFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21wYW5pZXMvcmFpbFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9mODYyZDRlYS1mN2UzLTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImY4NjJkNGVhLWY3ZTMtMTFkZi04ZDkxLTAwMTQ0ZmVhYjQ5YVwifV0sXCJ1dWlkXCI6XCIwMjUzNjY1ZS1mN2U0LTExZGYtOGQ5MS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOlRyYW5zcG9ydFwifV0sXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpjb21wYW5pZXNcIn0se1widGl0bGVcIjpcIk1hcmtldHNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbWFya2V0c1wiLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJGVGZtXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2Z0Zm1cIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZDYzNGQzMzAtNzg2Zi0xMWRmLTk0MmEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIlJlZ3VsYXRpb25cIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vZnRmbS9yZWd1bGF0aW9uXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzdkYzRjOTA0LTgxNTAtMTFlMC05MzYwLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiN2RjNGM5MDQtODE1MC0xMWUwLTkzNjAtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJFVEZzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2Z0Zm0vZXRmc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy82OWM5NTk2ZS03NGI0LTExZGYtYWVkNy0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjY5Yzk1OTZlLTc0YjQtMTFkZi1hZWQ3LTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiSW52ZXN0bWVudCBTdHJhdGVneVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9mdGZtL2ludmVzdG1lbnQtc3RyYXRlZ3lcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMDRmYWYxOWMtZmJjMi0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIwNGZhZjE5Yy1mYmMyLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlBlbnNpb25zXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2Z0Zm0vcGVuc2lvbnNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMDdlODM2NDQtZmJjMi0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIwN2U4MzY0NC1mYmMyLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlBlb3BsZVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9mdGZtL3Blb3BsZVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wZTgxMzBiZS1mYmMyLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjBlODEzMGJlLWZiYzItMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiT3BpbmlvblwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9mdGZtL29waW5pb25cIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMmEyZmFlNGEtZjAwOC0xMWUwLWJjOWQtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIyYTJmYWU0YS1mMDA4LTExZTAtYmM5ZC0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlZpZGVvXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly92aWRlby5mdC5jb20vZnRmbVwifV0sXCJ1dWlkXCI6XCJkNjM0ZDMzMC03ODZmLTExZGYtOTQyYS0wMDE0NGZlYWJkYzBcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkZUIEZ1bmQgTWFuYWdlbWVudFwifSx7XCJ0aXRsZVwiOlwiVHJhZGluZyBSb29tXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL21hcmtldHMvdHJhZGluZy1yb29tXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzI2OGQyNWJlLTg5YjItMTFkZi05ZWE2LTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJDbGVhcmluZyAmIFNldHRsZW1lbnRcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vZnQtdHJhZGluZy1yb29tL2NsZWFyaW5nLXNldHRsZW1lbnRcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZjk0MDUwMGUtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmOTQwNTAwZS1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkRldmVsb3BpbmcgTWFya2V0cyAmIEFzaWFcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vZnQtdHJhZGluZy1yb29tL2RldmVsb3BpbmctbWFya2V0cy1hc2lhXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2I2NjQ1N2U0LWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiYjY2NDU3ZTQtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJIaWdoIEZyZXF1ZW5jeSBUcmFkaW5nXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2Z0LXRyYWRpbmctcm9vbS9oaWdoLWZyZXF1ZW5jeS10cmFkaW5nXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2U1MTExMWQ0LTkzMTAtMTFlMi05NTkzLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZTUxMTExZDQtOTMxMC0xMWUyLTk1OTMtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJNYXJrZXRzIFJlZ3VsYXRpb25cIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vZnQtdHJhZGluZy1yb29tL21hcmtldHMtcmVndWxhdGlvblwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9jMjVhMDYzZS1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImMyNWEwNjNlLWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiVHJhZGluZyBUZWNobm9sb2d5XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2Z0LXRyYWRpbmctcm9vbS90cmFkaW5nLXRlY2hub2xvZ3lcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZGU3OWQzNTgtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJkZTc5ZDM1OC1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIlF1aWNrIFZpZXdcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vZnQtdHJhZGluZy1yb29tL3F1aWNrLXZpZXdcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZDBmNGJlM2MtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJkMGY0YmUzYy1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkNhcmJvbiBNYXJrZXRzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2Z0LXRyYWRpbmctcm9vbS9jYXJib24tbWFya2V0c1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy84Yzg2ODFhNi0yNGVhLTExZTEtOGJmOS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjhjODY4MWE2LTI0ZWEtMTFlMS04YmY5LTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiRXhjaGFuZ2VzIENvbnNvbGlkYXRpb25cIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vZnQtdHJhZGluZy1yb29tL2V4Y2hhbmdlcy1jb25zb2xpZGF0aW9uXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzRmNjMzZjk2LTlkN2YtMTFlMC05YTcwLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNGY2MzNmOTYtOWQ3Zi0xMWUwLTlhNzAtMDAxNDRmZWFiZGMwXCJ9XSxcInV1aWRcIjpcIjI2OGQyNWJlLTg5YjItMTFkZi05ZWE2LTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6RlQgVHJhZGluZyBSb29tXCJ9LHtcInRpdGxlXCI6XCJFcXVpdGllc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9tYXJrZXRzL2VxdWl0aWVzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2QzZWQ1Y2U4LWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJVU1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9tYXJrZXRzL3VzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2Y1OGY5Zjk2LWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZjU4ZjlmOTYtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJVS1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9tYXJrZXRzL3VrXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2ZiMjY4Zjk2LWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZmIyNjhmOTYtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJFdXJvcGVcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbWFya2V0cy9ldXJvcGVcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZGM2ZmVhNjYtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJkYzZmZWE2Ni1mYmEzLTExZGYtYjc5YS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkFzaWEtUGFjaWZpY1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9tYXJrZXRzL2FzaWFwYWNpZmljXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2M0ODM1ODBjLWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiYzQ4MzU4MGMtZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCJ9XSxcInV1aWRcIjpcImQzZWQ1Y2U4LWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6RXF1aXRpZXNcIn0se1widGl0bGVcIjpcIkN1cnJlbmNpZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbWFya2V0cy9jdXJyZW5jaWVzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzFkY2ZmNzIyLWYxYTgtMTFkZi1iYjVhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMWRjZmY3MjItZjFhOC0xMWRmLWJiNWEtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpDdXJyZW5jaWVzXCJ9LHtcInRpdGxlXCI6XCJDb21tb2RpdGllc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9tYXJrZXRzL2NvbW1vZGl0aWVzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzI1ZDQ1ZDY0LWYxYTgtMTFkZi1iYjVhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMjVkNDVkNjQtZjFhOC0xMWRmLWJiNWEtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpDb21tb2RpdGllc1wifV0sXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTptYXJrZXRzXCJ9LHtcInRpdGxlXCI6XCJHbG9iYWwgRWNvbm9teVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9nbG9iYWwtZWNvbm9teVwiLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJNYWNybyBTd2VlcFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9nbG9iYWxlY29ub215L21hY3JvLXN3ZWVwXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2RlMDg1YWU2LTA4ZTAtMTFlMy1hZDA3LTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiZGUwODVhZTYtMDhlMC0xMWUzLWFkMDctMDAxNDRmZWFiZGMwXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpUaGUgTWFjcm8gU3dlZXBcIn1dLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6Z2xvYmFsIGVjb25vbXlcIn0se1widGl0bGVcIjpcIkxleFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9sZXhcIixcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiTGV4IEluIGRlcHRoXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2xleC9pbmRlcHRoXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzBmYzZkODI4LWVjNWUtMTFlMS1hOTFjLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMGZjNmQ4MjgtZWM1ZS0xMWUxLWE5MWMtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpMZXggSW4gZGVwdGhcIn0se1widGl0bGVcIjpcIkJlc3Qgb2YgTGV4XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2xleC9iZXN0XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2FhMTRiODljLTJhNWMtMTFlMS05YmRiLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiYWExNGI4OWMtMmE1Yy0xMWUxLTliZGItMDAxNDRmZWFiZGMwXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpCZXN0IG9mIExleFwifV0sXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpsZXhcIn0se1widGl0bGVcIjpcIkNvbW1lbnRcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudFwiLFwibmF2aWdhdGlvbkl0ZW1zXCI6W3tcInRpdGxlXCI6XCJDb2x1bW5pc3RzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29sdW1uaXN0c1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9kNTQ5OGI3Mi1mNzE5LTExZGYtOGZlYi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiSmFuYW4gR2FuZXNoXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2phbmFuZ2FuZXNoXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzYxZTY4YjAyLWYzNjItMTFlMS05Y2E2LTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNjFlNjhiMDItZjM2Mi0xMWUxLTljYTYtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJKb2huIEdhcHBlclwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvbHVtbmlzdHMvam9obmdhcHBlclwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8zZTMzYTQ1ZS0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjNlMzNhNDVlLTNiYTQtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiQ2hyaXMgR2lsZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9jb2x1bW5pc3RzL2NocmlzLWdpbGVzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzRlZmFkN2JhLWNkMGEtMTFlMS05MmMxLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNGVmYWQ3YmEtY2QwYS0xMWUxLTkyYzEtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJKb2huIEtheVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvbHVtbmlzdHMvam9obmtheVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9mNmJjZjc4OC0zYmEzLTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImY2YmNmNzg4LTNiYTMtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiUm91bGEgS2hhbGFmXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29sdW1uaXN0cy9yb3VsYWtoYWxhZlwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy80Y2MyZTdmYS0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjRjYzJlN2ZhLTNiYTQtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiRWR3YXJkIEx1Y2VcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9jb2x1bW5pc3RzL2VkbHVjZVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8xMzc3ZjJjNC0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjEzNzdmMmM0LTNiYTQtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiSnVyZWsgTWFydGluXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29sdW1uaXN0cy9qdXJla21hcnRpblwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy80MDk3ODk0MC0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjQwOTc4OTQwLTNiYTQtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiSm9obiBNY0Rlcm1vdHRcIixcIndlYlVybFwiOlwiaHR0cDovL2Jsb2dzLmZ0LmNvbS9vZmYtbWVzc2FnZVwifSx7XCJ0aXRsZVwiOlwiV29sZmdhbmcgTXVuY2hhdVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvbHVtbmlzdHMvd29sZmdhbmdtdW5jaGF1XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzUyZTc2NGQwLTNiYTQtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNTJlNzY0ZDAtM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJEYXZpZCBQaWxsaW5nXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29sdW1uaXN0cy9kYXZpZHBpbGxpbmdcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNWFiZDdjYjItM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI1YWJkN2NiMi0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkluZ3JhbSBQaW5uXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29sdW1uaXN0cy9pbmdyYW1waW5uXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzQ1ZGYxNzc0LTU3YmEtMTFlMS1iMDg5LTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNDVkZjE3NzQtNTdiYS0xMWUxLWIwODktMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJMaXNhIFBvbGxhY2tcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9jb2x1bW5pc3RzL2xpc2EtcG9sbGFja1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy84ZjBmYjFkNC0yZjhlLTExZTQtODdkOS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjhmMGZiMWQ0LTJmOGUtMTFlNC04N2Q5LTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiR2lkZW9uIFJhY2htYW5cIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9jb2x1bW5pc3RzL2dpZGVvbnJhY2htYW5cIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMmUwZGUzM2MtM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIyZTBkZTMzYy0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIlJvYmVydCBTaHJpbXNsZXlcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vcm9iZXJ0LXNocmltc2xleS1ub3RlYm9va1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9mOWYyMTA2NC0zYmEzLTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImY5ZjIxMDY0LTNiYTMtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiR2FyeSBTaWx2ZXJtYW5cIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9jb2x1bW5pc3RzL2dhcnlzaWx2ZXJtYW5cIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMDIzMjdlOTQtM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIwMjMyN2U5NC0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIlBoaWxpcCBTdGVwaGVuc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvbHVtbmlzdHMvcGhpbGlwc3RlcGhlbnNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNDNmNjVlYTQtM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI0M2Y2NWVhNC0zYmE0LTExZTEtYTA5YS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkxhd3JlbmNlIFN1bW1lcnNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9jb2x1bW5pc3RzL2xhd3JlbmNlLXN1bW1lcnNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNjYyZWE1Y2EtM2M0YS0xMWUxLThkNzItMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI2NjJlYTVjYS0zYzRhLTExZTEtOGQ3Mi0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkdpbGxpYW4gVGV0dFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvbHVtbmlzdHMvZ2lsbGlhbi10ZXR0XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzljNGM4ZGMyLTNjM2UtMTFlMS04ZDcyLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiOWM0YzhkYzItM2MzZS0xMWUxLThkNzItMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJQYXR0aSBXYWxkbWVpclwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2NvbHVtbmlzdHMvcGF0dGktd2FsZG1laXJcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZDI3ZTkxYTQtMzk5NS0xMWU0LTkzZGEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJkMjdlOTFhNC0zOTk1LTExZTQtOTNkYS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIk1hcnRpbiBXb2xmXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29sdW1uaXN0cy9tYXJ0aW53b2xmXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzQ3YTQ4NGMyLTNiYTQtMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNDdhNDg0YzItM2JhNC0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCJ9XSxcInV1aWRcIjpcImQ1NDk4YjcyLWY3MTktMTFkZi04ZmViLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6Q29sdW1uaXN0c1wifSx7XCJ0aXRsZVwiOlwiVGhlIEJpZyBSZWFkXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvdGhlLWJpZy1yZWFkXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzBjNGUzNzU2LWY3MWMtMTFkZi05YjA2LTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMGM0ZTM3NTYtZjcxYy0xMWRmLTliMDYtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpUaGUgQmlnIFJlYWRcIn0se1widGl0bGVcIjpcIk9waW5pb25cIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vY29tbWVudC9vcGluaW9uXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzA3NWM2NDQ4LWY3MWMtMTFkZi05YjA2LTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMDc1YzY0NDgtZjcxYy0xMWRmLTliMDYtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpPcGluaW9uXCJ9LHtcInRpdGxlXCI6XCJGVCBWaWV3XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvZnQtdmlld1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wMjY5NGI1ZS1mNzFjLTExZGYtOWIwNi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjAyNjk0YjVlLWY3MWMtMTFkZi05YjA2LTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6RlQgVmlld1wifSx7XCJ0aXRsZVwiOlwiTGV0dGVyc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9jb21tZW50L2xldHRlcnNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZmU2OWMwZDgtZjcxYi0xMWRmLTliMDYtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmZTY5YzBkOC1mNzFiLTExZGYtOWIwNi0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkxldHRlcnNcIn0se1widGl0bGVcIjpcIkNvcnJlY3Rpb25zXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvY29ycmVjdGlvbnNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZjllOTcxYTItZjcxYi0xMWRmLTliMDYtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJmOWU5NzFhMi1mNzFiLTExZGYtOWIwNi0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkNvcnJlY3Rpb25zXCJ9LHtcInRpdGxlXCI6XCJPYml0dWFyaWVzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2NvbW1lbnQvb2JpdHVhcmllc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy84OTQyNDRiYS1mNzFiLTExZGYtOGZlYi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjg5NDI0NGJhLWY3MWItMTFkZi04ZmViLTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6T2JpdHVhcmllc1wifV0sXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpjb21tZW50XCJ9LHtcInRpdGxlXCI6XCJNYW5hZ2VtZW50XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL21hbmFnZW1lbnRcIixcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiQnVzaW5lc3MgRWR1Y2F0aW9uXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2J1c2luZXNzLWVkdWNhdGlvblwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9iMzRjODNiZS04MzY4LTExZGYtODQ1MS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiSm9pbiBPdXIgQ29tbXVuaXR5XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2J1c2luZXNzLWVkdWNhdGlvbi9jb21tdW5pdHlcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNjEyMDE1OWUtMTM0MC0xMWU0LTkyNWEtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI2MTIwMTU5ZS0xMzQwLTExZTQtOTI1YS0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIlJhbmtpbmdzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly9yYW5raW5ncy5mdC5jb20vYnVzaW5lc3NzY2hvb2xyYW5raW5ncy9yYW5raW5nc1wifSx7XCJ0aXRsZVwiOlwiQXBwbHlpbmcgZm9yIGEgTWFzdGVyc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9idXNpbmVzcy1lZHVjYXRpb24vYXBwbHlpbmctbWFzdGVycy1kZWdyZWVcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMjBjZGYwMWEtZmIyNC0xMWUwLWJlYmUtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIyMGNkZjAxYS1mYjI0LTExZTAtYmViZS0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkFwcGx5aW5nIGZvciBhbiBNQkFcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vYnVzaW5lc3MtZWR1Y2F0aW9uL2FwcGx5aW5nLW1iYVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy80NTY5NjQ2OC0xOGMyLTExZTQtYTUxYS0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjQ1Njk2NDY4LTE4YzItMTFlNC1hNTFhLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiRmluZGluZyBhIEpvYlwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9idXNpbmVzcy1lZHVjYXRpb24vZmluZGluZy1hLWpvYlwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9mODNjMjJlYS1lMDAyLTExZTMtOTUzNC0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImY4M2MyMmVhLWUwMDItMTFlMy05NTM0LTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiRXhlY3V0aXZlIEVkdWNhdGlvblwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9idXNpbmVzcy1lZHVjYXRpb24vZXhlY3V0aXZlLWVkdWNhdGlvblwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy82N2RhYmQ4YS1mZTE4LTExZGYtODUzYi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjY3ZGFiZDhhLWZlMTgtMTFkZi04NTNiLTAwMTQ0ZmVhYjQ5YVwifV0sXCJ1dWlkXCI6XCJiMzRjODNiZS04MzY4LTExZGYtODQ1MS0wMDE0NGZlYWJkYzBcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkJ1c2luZXNzIEVkdWNhdGlvblwifSx7XCJ0aXRsZVwiOlwiRW50cmVwcmVuZXVyc2hpcFwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9tYW5hZ2VtZW50L2VudHJlcHJlbmV1cnNoaXBcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNDEyNDEzNTAtZmVkNC0xMWRmLWFlODctMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIkJ1c2luZXNzIFNwZWFrXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2J1c2luZXNzLXNwZWFrXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzY4ZjRmMjI4LTVjYWMtMTFlMS1hYzgwLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNjhmNGYyMjgtNWNhYy0xMWUxLWFjODAtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJCdXNpbmVzcyBRdWVzdGlvbnNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vYnVzaW5lc3MtcXVlc3Rpb25zXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzg0NjQ0MDE4LTZlOGItMTFlMS1hODJkLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiODQ2NDQwMTgtNmU4Yi0xMWUxLWE4MmQtMDAxNDRmZWFiNDlhXCJ9XSxcInV1aWRcIjpcIjQxMjQxMzUwLWZlZDQtMTFkZi1hZTg3LTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6RW50cmVwcmVuZXVyc2hpcFwifSx7XCJ0aXRsZVwiOlwiVGhlIENvbm5lY3RlZCBCdXNpbmVzc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9yZXBvcnRzL3RoZS1jb25uZWN0ZWQtYnVzaW5lc3NcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMTcyZmU5NWUtNjlhYi0xMWUyLThkMDctMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIxNzJmZTk1ZS02OWFiLTExZTItOGQwNy0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOlRoZSBDb25uZWN0ZWQgQnVzaW5lc3NcIn1dLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6bWFuYWdlbWVudFwifSx7XCJ0aXRsZVwiOlwiUGVyc29uYWwgRmluYW5jZVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9wZXJzb25hbC1maW5hbmNlXCIsXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIkludmVzdG1lbnRzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3BlcnNvbmFsLWZpbmFuY2UvaW52ZXN0bWVudHNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMTNkZmUxYzYtZmM3Yy0xMWRmLWE5YzUtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIkRpcmVjdG9yc+KAmSBEZWFsc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9wZXJzb25hbC1maW5hbmNlL2RpcmVjdG9ycy1kZWFsc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy9mNjcxNWFiOC1jZDMyLTExZTItOTBlOC0wMDE0NGZlYWI3ZGVcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcImY2NzE1YWI4LWNkMzItMTFlMi05MGU4LTAwMTQ0ZmVhYjdkZVwifSx7XCJ0aXRsZVwiOlwiSW52ZXN0b3JzIENocm9uaWNsZVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9wZXJzb25hbC1maW5hbmNlL2ludmVzdG9ycy1jaHJvbmljbGVcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvZTFhM2NlNDAtY2QzMi0xMWUyLTkwZTgtMDAxNDRmZWFiN2RlXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCJlMWEzY2U0MC1jZDMyLTExZTItOTBlOC0wMDE0NGZlYWI3ZGVcIn0se1widGl0bGVcIjpcIkhvdyB0by4uLlwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9wZXJzb25hbC1maW5hbmNlL2hvd3RvXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzg0ZGE0NzI4LTJmZjAtMTFlMi1hZTdkLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiODRkYTQ3MjgtMmZmMC0xMWUyLWFlN2QtMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJNYWtlIHRoZSBNb3N0IG9mIEl0XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3BlcnNvbmFsLWZpbmFuY2UvbWFrZS10aGUtbW9zdC1vZi1pdFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy84YzkxNTlkZS0yZmYwLTExZTItYWU3ZC0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjhjOTE1OWRlLTJmZjAtMTFlMi1hZTdkLTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiTWFya2V0cyBJbnNpZ2h0XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL21hcmtldHMvaW5zaWdodFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8xMmRjMDZjNi0yYjIyLTExZTEtOGEzOC0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjEyZGMwNmM2LTJiMjItMTFlMS04YTM4LTAwMTQ0ZmVhYmRjMFwifV0sXCJ1dWlkXCI6XCIxM2RmZTFjNi1mYzdjLTExZGYtYTljNS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOkludmVzdG1lbnRzXCJ9LHtcInRpdGxlXCI6XCJUcmFkaW5nXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3BlcnNvbmFsLWZpbmFuY2UvdHJhZGluZy1odWJcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvOTY5NzJmYmUtMDhjZS0xMWUzLThiMzItMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI5Njk3MmZiZS0wOGNlLTExZTMtOGIzMi0wMDE0NGZlYWJkYzBcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOlRyYWRpbmcgSHViXCJ9LHtcInRpdGxlXCI6XCJUYXhcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vcGVyc29uYWwtZmluYW5jZS90YXhcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMWVjNzVmNGMtZmM3Yy0xMWRmLWE5YzUtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIxZWM3NWY0Yy1mYzdjLTExZGYtYTljNS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOlRheFwifSx7XCJ0aXRsZVwiOlwiTW9uZXkgTWF0dGVyc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS9wZXJzb25hbC1maW5hbmNlL21vbmV5LW1hdHRlcnNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMGNhY2Y4YzYtZmM3Yy0xMWRmLWE5YzUtMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIlRvcCBUaXBzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3BlcnNvbmFsLWZpbmFuY2UvbW9uZXktbWF0dGVycy90b3AtdGlwc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8wNzE4ZTk0Yy1mYzdjLTExZGYtYTljNS0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjA3MThlOTRjLWZjN2MtMTFkZi1hOWM1LTAwMTQ0ZmVhYjQ5YVwifV0sXCJ1dWlkXCI6XCIwY2FjZjhjNi1mYzdjLTExZGYtYTljNS0wMDE0NGZlYWI0OWFcIixcIm5leHRVcmxcIjpcIi9zZWFyY2g/cT1wYWdlOk1vbmV5IE1hdHRlcnNcIn1dLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6cGVyc29uYWwgZmluYW5jZVwifSx7XCJ0aXRsZVwiOlwiTGlmZSAmIEFydHNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbGlmZS1hcnRzXCIsXCJuYXZpZ2F0aW9uSXRlbXNcIjpbe1widGl0bGVcIjpcIk1hZ2F6aW5lXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL21hZ2F6aW5lXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzL2MxZTJlYTcwLTk2NmYtMTFkZi05Y2FhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiYzFlMmVhNzAtOTY2Zi0xMWRmLTljYWEtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpGVCBNYWdhemluZVwifSx7XCJ0aXRsZVwiOlwiTHVuY2ggd2l0aCB0aGUgRlRcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbGlmZS1hcnRzL2x1bmNoLXdpdGgtdGhlLWZ0XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzU5MDIyOTc0LTNiYTctMTFlMS1hMDlhLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNTkwMjI5NzQtM2JhNy0xMWUxLWEwOWEtMDAxNDRmZWFiZGMwXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpMdW5jaCB3aXRoIHRoZSBGVFwifSx7XCJ0aXRsZVwiOlwiU3R5bGVcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vbGlmZS1hcnRzL3N0eWxlXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzI5ZWNhY2IyLWZiYTMtMTFkZi1iNzlhLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMjllY2FjYjItZmJhMy0xMWRmLWI3OWEtMDAxNDRmZWFiNDlhXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpTdHlsZVwifSx7XCJ0aXRsZVwiOlwiVHJhdmVsXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3RyYXZlbFwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8xYTVkYTNiYy04OWIzLTExZGYtOWVhNi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcIm5hdmlnYXRpb25JdGVtc1wiOlt7XCJ0aXRsZVwiOlwiVUtcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vdHJhdmVsL3VrXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzU2MGQ3ZDIyLTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNTYwZDdkMjItNGE2Yy0xMWUwLTgyYWItMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJOb3J0aCBBbWVyaWNhXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3RyYXZlbC9ub3J0aC1hbWVyaWNhXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzNhYzdmMmNjLTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiM2FjN2YyY2MtNGE2Yy0xMWUwLTgyYWItMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJFdXJvcGVcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vdHJhdmVsL2V1cm9wZVwiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy8zODM5ZDAwYy00YTZjLTExZTAtODJhYi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjM4MzlkMDBjLTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiQXNpYSAmIEF1c3RyYWxpYVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS90cmF2ZWwvYXNpYS1hdXN0cmFsaWFcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNDBhNWU5OWMtNGE2Yy0xMWUwLTgyYWItMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI0MGE1ZTk5Yy00YTZjLTExZTAtODJhYi0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkFmcmljYVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS90cmF2ZWwvYWZyaWNhXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzUzYmI0M2Q4LTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNTNiYjQzZDgtNGE2Yy0xMWUwLTgyYWItMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJBbWVyaWNhc1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS90cmF2ZWwvYW1lcmljYXNcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvMjNkYWEwMjItMmZhYi0xMWUwLTgzNGYtMDAxNDRmZWFiZGMwXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCIyM2RhYTAyMi0yZmFiLTExZTAtODM0Zi0wMDE0NGZlYWJkYzBcIn0se1widGl0bGVcIjpcIkx1eHVyeVwiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS90cmF2ZWwvbHV4dXJ5XCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzU4MjhmM2RlLTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiNTgyOGYzZGUtNGE2Yy0xMWUwLTgyYWItMDAxNDRmZWFiNDlhXCJ9LHtcInRpdGxlXCI6XCJBZHZlbnR1cmVzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3RyYXZlbC9hZHZlbnR1cmVzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzhlMDgyYTJhLTJlZGMtMTFlMC05ODc3LTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiOGUwODJhMmEtMmVkYy0xMWUwLTk4NzctMDAxNDRmZWFiZGMwXCJ9LHtcInRpdGxlXCI6XCJDeWNsaW5nIEFkdmVudHVyZXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vdHJhdmVsL2N5Y2xpbmctYWR2ZW50dXJlc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy82Nzc3ODA3Mi1mMGMxLTExZTMtOWUyNi0wMDE0NGZlYWJkYzBcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjY3Nzc4MDcyLWYwYzEtMTFlMy05ZTI2LTAwMTQ0ZmVhYmRjMFwifSx7XCJ0aXRsZVwiOlwiV2ludGVyIFNwb3J0c1wiLFwid2ViVXJsXCI6XCJodHRwOi8vd3d3LmZ0LmNvbS90cmF2ZWwvd2ludGVyLXNwb3J0c1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy80MmRkNGVlZS00YTZjLTExZTAtODJhYi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjQyZGQ0ZWVlLTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiRmFtaWx5XCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3RyYXZlbC9mYW1pbHlcIixcImxpbmtzXCI6W3tcImhyZWZcIjpcImh0dHA6Ly9hcGkuZnQuY29tL3NpdGUvdjEvcGFnZXMvNWEzODZiZDItNGE2Yy0xMWUwLTgyYWItMDAxNDRmZWFiNDlhXCIsXCJyZWxcIjpcInNpdGUtcGFnZVwifV0sXCJ1dWlkXCI6XCI1YTM4NmJkMi00YTZjLTExZTAtODJhYi0wMDE0NGZlYWI0OWFcIn0se1widGl0bGVcIjpcIkNpdHkgQnJlYWtzXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL3RyYXZlbC9jaXR5LWJyZWFrc1wiLFwibGlua3NcIjpbe1wiaHJlZlwiOlwiaHR0cDovL2FwaS5mdC5jb20vc2l0ZS92MS9wYWdlcy80NGZhOWNlYS00YTZjLTExZTAtODJhYi0wMDE0NGZlYWI0OWFcIixcInJlbFwiOlwic2l0ZS1wYWdlXCJ9XSxcInV1aWRcIjpcIjQ0ZmE5Y2VhLTRhNmMtMTFlMC04MmFiLTAwMTQ0ZmVhYjQ5YVwifSx7XCJ0aXRsZVwiOlwiR3JlYXQgSm91cm5leXNcIixcIndlYlVybFwiOlwiaHR0cDovL3d3dy5mdC5jb20vdHJhdmVsL2dyZWF0LWpvdXJuZXlzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzM1NTQyY2EwLTFhZDItMTFlMy04N2RhLTAwMTQ0ZmVhYjdkZVwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiMzU1NDJjYTAtMWFkMi0xMWUzLTg3ZGEtMDAxNDRmZWFiN2RlXCJ9XSxcInV1aWRcIjpcIjFhNWRhM2JjLTg5YjMtMTFkZi05ZWE2LTAwMTQ0ZmVhYjQ5YVwiLFwibmV4dFVybFwiOlwiL3NlYXJjaD9xPXBhZ2U6VHJhdmVsXCJ9LHtcInRpdGxlXCI6XCJDb2x1bW5zXCIsXCJ3ZWJVcmxcIjpcImh0dHA6Ly93d3cuZnQuY29tL2xpZmUtYXJ0cy9jb2x1bW5pc3RzXCIsXCJsaW5rc1wiOlt7XCJocmVmXCI6XCJodHRwOi8vYXBpLmZ0LmNvbS9zaXRlL3YxL3BhZ2VzLzgwNWRiNDQ4LWEwY2UtMTFlMS04NTFmLTAwMTQ0ZmVhYmRjMFwiLFwicmVsXCI6XCJzaXRlLXBhZ2VcIn1dLFwidXVpZFwiOlwiODA1ZGI0NDgtYTBjZS0xMWUxLTg1MWYtMDAxNDRmZWFiZGMwXCIsXCJuZXh0VXJsXCI6XCIvc2VhcmNoP3E9cGFnZTpXZWVrZW5kIENvbHVtbmlzdHNcIn1dLFwibmV4dFVybFwiOm51bGx9XSxcImNvZGVcIjoyMDB9Il19
