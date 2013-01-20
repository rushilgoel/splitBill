;!function(exports, undefined) {

  var isArray = Array.isArray ? Array.isArray : function _isArray(obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };
  var defaultMaxListeners = 10;

  function init() {
    this._events = new Object;
  }

  function configure(conf) {
    if (conf) {
      conf.delimiter && (this.delimiter = conf.delimiter);
      conf.wildcard && (this.wildcard = conf.wildcard);
      if (this.wildcard) {
        this.listenerTree = new Object;
      }
    }
  }

  function EventEmitter(conf) {
    this._events = new Object;
    configure.call(this, conf);
  }

  //
  // Attention, function return type now is array, always !
  // It has zero elements if no any matches found and one or more
  // elements (leafs) if there are matches
  //
  function searchListenerTree(handlers, type, tree, i) {
    if (!tree) {
      return [];
    }
    var listeners=[], leaf, len, branch, xTree, xxTree, isolatedBranch, endReached,
        typeLength = type.length, currentType = type[i], nextType = type[i+1];
    if (i === typeLength && tree._listeners) {
      //
      // If at the end of the event(s) list and the tree has listeners
      // invoke those listeners.
      //
      if (typeof tree._listeners === 'function') {
        handlers && handlers.push(tree._listeners);
        return [tree];
      } else {
        for (leaf = 0, len = tree._listeners.length; leaf < len; leaf++) {
          handlers && handlers.push(tree._listeners[leaf]);
        }
        return [tree];
      }
    }

    if ((currentType === '*' || currentType === '**') || tree[currentType]) {
      //
      // If the event emitted is '*' at this part
      // or there is a concrete match at this patch
      //
      if (currentType === '*') {
        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+1));
          }
        }
        return listeners;
      } else if(currentType === '**') {
        endReached = (i+1 === typeLength || (i+2 === typeLength && nextType === '*'));
        if(endReached && tree._listeners) {
          // The next element has a _listeners, add it to the handlers.
          listeners = listeners.concat(searchListenerTree(handlers, type, tree, typeLength));
        }

        for (branch in tree) {
          if (branch !== '_listeners' && tree.hasOwnProperty(branch)) {
            if(branch === '*' || branch === '**') {
              if(tree[branch]._listeners && !endReached) {
                listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], typeLength));
              }
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            } else if(branch === nextType) {
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i+2));
            } else {
              // No match on this one, shift into the tree but not in the type array.
              listeners = listeners.concat(searchListenerTree(handlers, type, tree[branch], i));
            }
          }
        }
        return listeners;
      }

      listeners = listeners.concat(searchListenerTree(handlers, type, tree[currentType], i+1));
    }

    xTree = tree['*'];
    if (xTree) {
      //
      // If the listener tree will allow any match for this part,
      // then recursively explore all branches of the tree
      //
      searchListenerTree(handlers, type, xTree, i+1);
    }
    
    xxTree = tree['**'];
    if(xxTree) {
      if(i < typeLength) {
        if(xxTree._listeners) {
          // If we have a listener on a '**', it will catch all, so add its handler.
          searchListenerTree(handlers, type, xxTree, typeLength);
        }
        
        // Build arrays of matching next branches and others.
        for(branch in xxTree) {
          if(branch !== '_listeners' && xxTree.hasOwnProperty(branch)) {
            if(branch === nextType) {
              // We know the next element will match, so jump twice.
              searchListenerTree(handlers, type, xxTree[branch], i+2);
            } else if(branch === currentType) {
              // Current node matches, move into the tree.
              searchListenerTree(handlers, type, xxTree[branch], i+1);
            } else {
              isolatedBranch = {};
              isolatedBranch[branch] = xxTree[branch];
              searchListenerTree(handlers, type, { '**': isolatedBranch }, i+1);
            }
          }
        }
      } else if(xxTree._listeners) {
        // We have reached the end and still on a '**'
        searchListenerTree(handlers, type, xxTree, typeLength);
      } else if(xxTree['*'] && xxTree['*']._listeners) {
        searchListenerTree(handlers, type, xxTree['*'], typeLength);
      }
    }

    return listeners;
  }

  function growListenerTree(type, listener) {

    type = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
    
    //
    // Looks for two consecutive '**', if so, don't add the event at all.
    //
    for(var i = 0, len = type.length; i+1 < len; i++) {
      if(type[i] === '**' && type[i+1] === '**') {
        return;
      }
    }

    var tree = this.listenerTree;
    var name = type.shift();

    while (name) {

      if (!tree[name]) {
        tree[name] = new Object;
      }

      tree = tree[name];

      if (type.length === 0) {

        if (!tree._listeners) {
          tree._listeners = listener;
        }
        else if(typeof tree._listeners === 'function') {
          tree._listeners = [tree._listeners, listener];
        }
        else if (isArray(tree._listeners)) {

          tree._listeners.push(listener);

          if (!tree._listeners.warned) {

            var m = defaultMaxListeners;
            
            if (typeof this._events.maxListeners !== 'undefined') {
              m = this._events.maxListeners;
            }

            if (m > 0 && tree._listeners.length > m) {

              tree._listeners.warned = true;
              console.error('(node) warning: possible EventEmitter memory ' +
                            'leak detected. %d listeners added. ' +
                            'Use emitter.setMaxListeners() to increase limit.',
                            tree._listeners.length);
              console.trace();
            }
          }
        }
        return true;
      }
      name = type.shift();
    }
    return true;
  };

  // By default EventEmitters will print a warning if more than
  // 10 listeners are added to it. This is a useful default which
  // helps finding memory leaks.
  //
  // Obviously not all Emitters should be limited to 10. This function allows
  // that to be increased. Set to zero for unlimited.

  EventEmitter.prototype.delimiter = '.';

  EventEmitter.prototype.setMaxListeners = function(n) {
    this._events || init.call(this);
    this._events.maxListeners = n;
  };

  EventEmitter.prototype.event = '';

  EventEmitter.prototype.once = function(event, fn) {
    this.many(event, 1, fn);
    return this;
  };

  EventEmitter.prototype.many = function(event, ttl, fn) {
    var self = this;

    if (typeof fn !== 'function') {
      throw new Error('many only accepts instances of Function');
    }

    function listener() {
      if (--ttl === 0) {
        self.off(event, listener);
      }
      fn.apply(this, arguments);
    };

    listener._origin = fn;

    this.on(event, listener);

    return self;
  };

  EventEmitter.prototype.emit = function() {
    this._events || init.call(this);

    var type = arguments[0];

    if (type === 'newListener') {
      if (!this._events.newListener) { return false; }
    }

    // Loop through the *_all* functions and invoke them.
    if (this._all) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
      for (i = 0, l = this._all.length; i < l; i++) {
        this.event = type;
        this._all[i].apply(this, args);
      }
    }

    // If there is no 'error' event listener then throw.
    if (type === 'error') {
      
      if (!this._all && 
        !this._events.error && 
        !(this.wildcard && this.listenerTree.error)) {

        if (arguments[1] instanceof Error) {
          throw arguments[1]; // Unhandled 'error' event
        } else {
          throw new Error("Uncaught, unspecified 'error' event.");
        }
        return false;
      }
    }

    var handler;

    if(this.wildcard) {
      handler = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handler, ns, this.listenerTree, 0);
    }
    else {
      handler = this._events[type];
    }

    if (typeof handler === 'function') {
      this.event = type;
      if (arguments.length === 1) {
        handler.call(this);
      }
      else if (arguments.length > 1)
        switch (arguments.length) {
          case 2:
            handler.call(this, arguments[1]);
            break;
          case 3:
            handler.call(this, arguments[1], arguments[2]);
            break;
          // slower
          default:
            var l = arguments.length;
            var args = new Array(l - 1);
            for (var i = 1; i < l; i++) args[i - 1] = arguments[i];
            handler.apply(this, args);
        }
      return true;
    }
    else if (handler) {
      var l = arguments.length;
      var args = new Array(l - 1);
      for (var i = 1; i < l; i++) args[i - 1] = arguments[i];

      var listeners = handler.slice();
      for (var i = 0, l = listeners.length; i < l; i++) {
        this.event = type;
        listeners[i].apply(this, args);
      }
      return (listeners.length > 0) || this._all;
    }
    else {
      return this._all;
    }

  };

  EventEmitter.prototype.on = function(type, listener) {
    
    if (typeof type === 'function') {
      this.onAny(type);
      return this;
    }

    if (typeof listener !== 'function') {
      throw new Error('on only accepts instances of Function');
    }
    this._events || init.call(this);

    // To avoid recursion in the case that type == "newListeners"! Before
    // adding it to the listeners, first emit "newListeners".
    this.emit('newListener', type, listener);

    if(this.wildcard) {
      growListenerTree.call(this, type, listener);
      return this;
    }

    if (!this._events[type]) {
      // Optimize the case of one listener. Don't need the extra array object.
      this._events[type] = listener;
    }
    else if(typeof this._events[type] === 'function') {
      // Adding the second element, need to change to array.
      this._events[type] = [this._events[type], listener];
    }
    else if (isArray(this._events[type])) {
      // If we've already got an array, just append.
      this._events[type].push(listener);

      // Check for listener leak
      if (!this._events[type].warned) {

        var m = defaultMaxListeners;
        
        if (typeof this._events.maxListeners !== 'undefined') {
          m = this._events.maxListeners;
        }

        if (m > 0 && this._events[type].length > m) {

          this._events[type].warned = true;
          console.error('(node) warning: possible EventEmitter memory ' +
                        'leak detected. %d listeners added. ' +
                        'Use emitter.setMaxListeners() to increase limit.',
                        this._events[type].length);
          console.trace();
        }
      }
    }
    return this;
  };

  EventEmitter.prototype.onAny = function(fn) {

    if(!this._all) {
      this._all = [];
    }

    if (typeof fn !== 'function') {
      throw new Error('onAny only accepts instances of Function');
    }

    // Add the function to the event listener collection.
    this._all.push(fn);
    return this;
  };

  EventEmitter.prototype.addListener = EventEmitter.prototype.on;

  EventEmitter.prototype.off = function(type, listener) {
    if (typeof listener !== 'function') {
      throw new Error('removeListener only takes instances of Function');
    }

    var handlers,leafs=[];

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);
    }
    else {
      // does not use listeners(), so no side effect of creating _events[type]
      if (!this._events[type]) return this;
      handlers = this._events[type];
      leafs.push({_listeners:handlers});
    }

    for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
      var leaf = leafs[iLeaf];
      handlers = leaf._listeners;
      if (isArray(handlers)) {

        var position = -1;

        for (var i = 0, length = handlers.length; i < length; i++) {
          if (handlers[i] === listener ||
            (handlers[i].listener && handlers[i].listener === listener) ||
            (handlers[i]._origin && handlers[i]._origin === listener)) {
            position = i;
            break;
          }
        }

        if (position < 0) {
          return this;
        }

        if(this.wildcard) {
          leaf._listeners.splice(position, 1)
        }
        else {
          this._events[type].splice(position, 1);
        }

        if (handlers.length === 0) {
          if(this.wildcard) {
            delete leaf._listeners;
          }
          else {
            delete this._events[type];
          }
        }
      }
      else if (handlers === listener ||
        (handlers.listener && handlers.listener === listener) ||
        (handlers._origin && handlers._origin === listener)) {
        if(this.wildcard) {
          delete leaf._listeners;
        }
        else {
          delete this._events[type];
        }
      }
    }

    return this;
  };

  EventEmitter.prototype.offAny = function(fn) {
    var i = 0, l = 0, fns;
    if (fn && this._all && this._all.length > 0) {
      fns = this._all;
      for(i = 0, l = fns.length; i < l; i++) {
        if(fn === fns[i]) {
          fns.splice(i, 1);
          return this;
        }
      }
    } else {
      this._all = [];
    }
    return this;
  };

  EventEmitter.prototype.removeListener = EventEmitter.prototype.off;

  EventEmitter.prototype.removeAllListeners = function(type) {
    if (arguments.length === 0) {
      !this._events || init.call(this);
      return this;
    }

    if(this.wildcard) {
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      var leafs = searchListenerTree.call(this, null, ns, this.listenerTree, 0);

      for (var iLeaf=0; iLeaf<leafs.length; iLeaf++) {
        var leaf = leafs[iLeaf];
        leaf._listeners = null;
      }
    }
    else {
      if (!this._events[type]) return this;
      this._events[type] = null;
    }
    return this;
  };

  EventEmitter.prototype.listeners = function(type) {
    if(this.wildcard) {
      var handlers = [];
      var ns = typeof type === 'string' ? type.split(this.delimiter) : type.slice();
      searchListenerTree.call(this, handlers, ns, this.listenerTree, 0);
      return handlers;
    }

    this._events || init.call(this);

    if (!this._events[type]) this._events[type] = [];
    if (!isArray(this._events[type])) {
      this._events[type] = [this._events[type]];
    }
    return this._events[type];
  };

  EventEmitter.prototype.listenersAny = function() {

    if(this._all) {
      return this._all;
    }
    else {
      return [];
    }

  };

  if (typeof define === 'function' && define.amd) {
    define(function() {
      return EventEmitter;
    });
  } else {
    exports.EventEmitter2 = EventEmitter; 
  }

}(typeof process !== 'undefined' && typeof process.title !== 'undefined' && typeof exports !== 'undefined' ? exports : window);
var ordrin = typeof ordrin === "object" ? ordrin : {};
if(!ordrin.hasOwnProperty("Tomato")){
  ordrin.Tomato = function Tomato(){
    var store = {};
    var namespace = {};

    var builtin = {Array:true, String:true, Number:true, Boolean:true, Object:true}

    function isCustomObject(obj){
      if(typeof obj === "object" && obj !== null){
        if(obj.constructor.name in builtin){
          return false;
        }
        return true;
      }
      return false;
    }

    function extend(obj, other){
      var result = obj;
      for(var prop in other){
        if(other.hasOwnProperty(prop)){
          result[prop] = other[prop];
        }
      }
      return result;
    }

    function shallowCopy(obj){
      var result = {};
      for(var prop in obj){
        if(obj.hasOwnProperty(prop)){
          result[prop] = obj[prop];
        }
      }
      return result;
    }
    
    function replacer(key, value){
      if(isCustomObject(value)){
        if(value.serialize instanceof Function){
          return value.serialize();
        } else {
          var copy = shallowCopy(value);
          copy.constructor = value.constructor.tomatoId;
          return copy;
        }
      }
      return value;
    }

    function reviver(key, value){
      if(value && typeof value === "object" && typeof value.constructor === "string"){
        var constructor = namespace[value.constructor];
        delete value.constructor;
        var result = new constructor();
        if(result.deserialize instanceof Function){
          result.deserialize(value);
          return result;
        } else {
          return extend(result, value);
        }
      } else {
        return value;
      }
    }

    this.register = function register(container, constructors){
      for(var i=0; i<constructors.length; i++){
        var constructor = constructors[i];
        if(namespace[constructor.tomatoId] !== constructor){
          var id = container + '.' + constructor.name;
          if(namespace.hasOwnProperty(id)){
            throw new Error("Cannot register "+constructor.name+" because you have already registered a constructor with that name");
          } else {
            namespace[id] = constructor;
            constructor.tomatoId = id;
          }
        }
      }
    }

    this.get = function(key){
      if(this.hasKey(key)){
        return JSON.parse(store[key].value, reviver);
      } else {
        return undefined;
      }
    }

    this.hasKey = function(key){
      return store.hasOwnProperty(key);
    }

    this.set = function(key, value){
      var val = {}
      val.value = JSON.stringify(value, replacer);
      store[key] = val;
      return value;
    }

    this.remove = function(key){
      delete store[key];
    }

    this.keys = function(){
      var keys = [];
      for(key in store){
        if(store.hasOwnProperty(key)){
          return keys;
        }
      }
    }
    if(typeof ordrin.init === "object"){
      for(var prop in ordrin.init){
        if(ordrin.init.hasOwnProperty(prop)){
          this.set(prop, ordrin.init[prop]);
        }
      }
    }
  }
}
var ordrin = typeof ordrin === "undefined" ? {} : ordrin;

(function(){
  "use strict";

  function getXhr() { 
    if (window.XMLHttpRequest) {
      // Chrome, Firefox, IE7+, Opera, Safari
      return new XMLHttpRequest(); 
    } 
    // IE6
    try { 
      // The latest stable version. It has the best security, performance, 
      // reliability, and W3C conformance. Ships with Vista, and available 
      // with other OS's via downloads and updates. 
      return new ActiveXObject('MSXML2.XMLHTTP.6.0');
    } catch (e) { 
      try { 
        // The fallback.
        return new ActiveXObject('MSXML2.XMLHTTP.3.0');
      } catch (e) { 
        alert('This browser is not AJAX enabled.'); 
        return null;
      } 
    }
  }

  function stringifyPrimitive(value){
    switch(typeof value){
      case 'string' : return value;
      case 'boolean' : return value ? 'true' : 'false';
      case 'number' : return isFinite(value) ? value : '';
      default : return '';
    }
  }

  function escape(value){
    return encodeURIComponent(value).replace('%20', '+');
  }

  function stringify(obj){
    return Object.keys(obj).map(function(k) {
      if(Array.isArray(obj[k])){
        return obj[k].map(function(v){
          return escape(stringifyPrimitive(k))+'='+escape(stringifyPrimitive(v));
        });
      } else {
        return escape(stringifyPrimitive(k))+'='+escape(stringifyPrimitive(obj[k]));
      }
    }).join('&');
  }

  function formatExpirationMonth(expirationMonth){
    if (String(expirationMonth).length == 1){
      expirationMonth = "0" + String(expirationMonth);
    }
    return expirationMonth;
  }

  function parseDateTime(dateTime){
    var date, time;
    if(dateTime instanceof Date){
      date = String(dateTime.getMonth() + 1) + "-" +  String(dateTime.getDate());
      time = dateTime.getHours() + ":" + dateTime.getMinutes();
    } else {
      if(typeof dateTime !== "string" && ! dateTime instanceof String){
        return {error:true};
      }
      var match = dateTime.match(/(\d{2}-\d{2})\+(\d{2}:\d{2})/);
      if(match){
        date = match[1];
        time = match[2];
      } else if(dateTime.toUpperCase() === "ASAP") {
        date = "ASAP";
        time = "";
      } else {
        return {error:true};
      }
      return {date:date, time:time, error:false};
    }
  }
  
  /*
   * Base function to make a request to the ordr.in api
   * host is the base uri, somehting like r-test.ordr.in
   * uri is a full uri string, so everthing after ordr.in
   * method is either GET or POST
   * data is any additional data to be included in the request body or query string
   * headers are additional headers beyond the X-NAAMA-Authentication
   */
  function makeApiRequest(host, uri, method, data, callback){
    data = stringify(data);

    var req = getXhr();
    req.onreadystatechange = function(){
      if(req.readyState === 4){
        if(req.status !== 200){
          callback({error: req.status, msg: req.statusText}, null);
          return;
        }
        callback(null, JSON.parse(req.response));
      }
    }
    req.open(method, host+uri, false);

    if (method != "GET"){
      req.setRequestHeader("Content-Type", 'application/x-www-form-urlencoded');
    }

    req.send(data);
  }

  function buildUriString(baseUri, params){
    for (var i = 0; i < params.length; i++){
      baseUri += "/" + encodeURIComponent(params[i]);
    }
    return baseUri;
  }

  var Restaurant = function Restaurant(restaurantUrl){
    /*
     * function to make all restaurant api requests
     * uri is the base uri so something like /dl, include the /
     * params are all parameters that go in the url. Note that this is different than the data
     * data is the data that goes either after the ? in a get request, or in the post body
     * method is either GET or POST (case-sensitive)
     */
    this.makeRestaurantRequest = function makeRestaurantRequest(uri, params, data, method, callback){
      var uriString = buildUriString(uri, params);
      
      makeApiRequest(restaurantUrl, uriString, method, data, callback);
    }
  }
  Restaurant.prototype.getDeliveryList = function getDeliveryList(dateTime, address, callback){
    dateTime = this.parseDateTime(dateTime);

    if(dateTime === null){
      callback({msg:"Invalid delivery time: "+JSON.stringify(deliveryTime)});
    }

    var params = [
      dateTime,
      address.zip,
      address.city,
      address.addr
    ];

    this.makeRestaurantRequest("/dl", params, {}, "GET", callback);
  }

  Restaurant.prototype.getDeliveryCheck = function getDeliveryCheck(restaurantId, dateTime, address, callback){
    dateTime = this.parseDateTime(dateTime);

    if(dateTime === null){
      callback({msg:"Invalid delivery time: "+JSON.stringify(deliveryTime)});
    }

    var params = [
      restaurantId,
      dateTime,
      address.zip,
      address.city,
      address.addr
    ]

    this.makeRestaurantRequest("/dc", params, {}, "GET", callback);
  }

  Restaurant.prototype.getFee = function getFee(restaurantId, subtotal, tip, dateTime, address, callback){
    dateTime = this.parseDateTime(dateTime);

    if(dateTime === null){
      callback({msg:"Invalid delivery time: "+JSON.stringify(deliveryTime)});
    }

    var params = [
      restaurantId,
      subtotal,
      tip,
      dateTime,
      address.zip,
      address.city,
      address.addr
    ]

    this.makeRestaurantRequest("/fee", params, {}, "GET", callback);
  }

  Restaurant.prototype.getDetails = function getDetails(restaurantId, callback){
    this.makeRestaurantRequest("/rd", [restaurantId], {}, "GET", callback);
  }
  
  Restaurant.prototype.parseDateTime = function rest_parseDateTime(dateTime, callback){
    var delivery = parseDateTime(dateTime);
    if(delivery.error){
      return null;
    } else {
      if(delivery.date === "ASAP"){
        return "ASAP";
      } else {
        return delivery.date+'+'+delivery.time;
      }
    }
  }

  // one validation error for a specific field. Used in ValidationError class
  var FieldError = function FieldError(field, msg){
    this.field = field;
    this.msg   = msg;
  }

  // extends the Error object, and is thrown whenever an Object fails validation. Can contain multiple field errors.
  var ValidationError = function ValidationError(name, msg, errors){
    Error.apply(this, arguments);
    this.fields = {};
  }

  // takes an array of FieldErrors and adds them to the field object
  ValidationError.prototype.addFields = function addFields(fieldErrors){
    for (var i = 0; i < fieldErrors.length; i++){
      this.fields[fieldErrors[i].field] = fieldErrors[i].msg;
    }
  }

  var Order = function Order(orderUrl){
    this.placeOrder = function placeOrder(restaurantId, tray, tip, deliveryTime, firstName, lastName, address, creditCard, email, callback){
      var params = [
        restaurantId
      ];

      var delivery = parseDateTime(deliveryTime);
      if(delivery.error){
        callback({msg:"Invalid delivery time: "+JSON.stringify(deliveryTime)});
        return;
      }

      var data = {
        tray: tray.buildTrayString(),
        tip: tip,
        delivery_date: delivery.date,
        delivery_time: delivery.time,
        first_name: firstName,
        last_name: lastName,
        addr: address.addr,
        city: address.city,
        state: address.state,
        zip: address.zip,
        phone: address.phone,
        card_name: creditCard.name,
        card_number: creditCard.number,
        card_cvc: creditCard.cvc,
        card_expiry: creditCard.formatExpirationDate(),
        card_bill_addr: creditCard.billAddress.addr,
        card_bill_addr2: creditCard.billAddress.addr2,
        card_bill_city: creditCard.billAddress.city,
        card_bill_state: creditCard.billAddress.state,
        card_bill_zip: creditCard.billAddress.zip,
        em: email,
        type: "res"
      };

      var uriString = buildUriString("/o", params);
      makeApiRequest(orderUrl, uriString, "POST",  data, callback);
    }
  }

  var Address = function Address(addr, city, state, zip, phone, addr2){
    this.addr  = addr;
    this.city  = city;
    this.state = state;
    this.zip   = zip;
    this.phone = String(phone).replace(/[^\d]/g, ''); // remove all non-number, and stringify
    this.addr2 = addr2;


    var validate = function validate(){
      var fieldErrors = [];
      // validate state
      if (/^[A-Z]{2}$/.test(this.state) == false){
        fieldErrors.push(new FieldError("state", "Invalid State format. It should be two upper case letters."));
      }
      // validate zip
      if (/^\d{5}$/.test(this.zip) == false){
        fieldErrors.push(new FieldError("zip", "Invalid Zip code. Should be 5 numbers"));
      }
      // validate phone number
      formatPhoneNumber();
      if (this.phone.length != 12){
        fieldErrors.push(new FieldError("phone", "Invalid Phone number. Should be 10 digits"));
      }
      if (fieldErrors.length != 0){
        var error = new ValidationError("Validation Error", "Check field errors for more details");
        error.addFields(fieldErrors);
        throw error;
      }
    }

    var formatPhoneNumber = function formatPhoneNumber(){
      this.phone = this.phone.substring(0, 3) + "-" + this.phone.substring(3, 6) + "-" + this.phone.substring(6);
    }
    validate();
  }

  var CreditCard = function CreditCard(name, expiryMonth, expiryYear, billAddress, number, cvc){
    this.name        = name;
    this.expiryMonth = formatExpirationMonth(expiryMonth);
    this.expiryYear  = expiryYear;
    this.billAddress = billAddress;
    this.number      = String(number);
    this.cvc         = cvc;

    validate = function validate(){
      var fieldErrors = [];
      // validate card number
      if (!checkLuhn()){
        fieldErrors.push(new FieldError("number", "Invalid Credit Card Number"));
      }
      // determine the type of card for cvc check
      this.type        = creditCardType();
      // validate cvc
      var cvcExpression = /^\d{3}$/;
      if (this.type == "amex"){
        cvcExpression = /^\d{4}$/;
      }
      if (cvcExpression.test(this.cvc) == false){
        fieldErrors.push(new FieldError("cvc", "Invalid cvc"));
      }

      // validate expiration year
      if (/^\d{4}$/.test(this.expiryYear) == false){
        fieldErrors.push(new FieldError("expiryYear", "Expiration Year must be 4 digits"));
      }

      // validate expiration month
      if (/^\d{2}$/.test(this.expiryMonth) == false){
        fieldErrors.push(new FieldError("expiryMonth", "Expiration Month must be 2 digits"));
      }

      if (this.name.length == 0){
        fieldErrors.push(new FieldError("name", "Name can not be blank"));
      }

      if (fieldErrors.length != 0){
        var error = new ValidationError("Validation Error", "Check fields object for more details");
        error.addFields(fieldErrors);
        throw error;
      }
    }

    // credit card validation checksum. From http://typicalprogrammer.com/?p=4
    var checkLuhn = function checkLuhn(){
      // digits 0-9 doubled with nines cast out
      var doubled = [0, 2, 4, 6, 8, 1, 3, 5, 7, 9];

      // remove non-digit characters
      this.number = this.number.replace(/[^\d]/g, '');
      var digits = this.number.split('');

      // alternate between summing the digits
      // or the result of doubling the digits and
      // casting out nines (see Luhn description)
      var alt = false;
      var total = 0;
      while (digits.length)
      {
        var d = Number(digits.pop());
        total += (alt ? doubled[d] : d);
        alt = !alt;
      }
      return total % 10 == 0;
    }

    // credit card tpype check. From http://typicalprogrammer.com/?p=4
    var creditCardType = function creditCardType(){
      // regular expressions to match common card types
      // delete or comment out cards not athis.numberepted
      // see: www.merriampark.com/anatomythis.number.htm
      var cardpatterns = {
        'visa'       : /^(4\d{12})|(4\d{15})$/,
        'mastercard' : /^5[1-5]\d{14}$/,
        'discover'   : /^6011\d{12}$/,
        'amex'       : /^3[47]\d{13}$/,
        'diners'     : /^(30[0-5]\d{11})|(3[68]\d{12})$/
      };

      // return type of credit card
      // or 'unknown' if no match

      for (var type in cardpatterns){
        if (cardpatterns[type].test(this.number))
          return type;
      }
      return 'unknown';
    }

    this.formatExpirationDate = function formatExpirationDate(){
      return this.expiryMonth + "/" + this.expiryYear;
    }

    validate();
  }

  function toCents(value){
    if(value.indexOf('.') < 0){
      return (+value)*100;
    } else {
      var match = value.match(/(\d*)\.(\d{2})\d*$/);
      if(match){
        return +(match[1]+match[2]);
      } else {
        match = value.match(/(\d*)\.(\d)$/);
        if(match){
          return +(match[1]+match[2])*10;
        } else {
          console.log(value+" is not an amount of money");
        }
      }
    }
  }

  function toDollars(value){
    if( !value ) {
      return '0.00';
    }

    var cents = value.toString();
    while(cents.length<3){
      cents = '0'+cents;
    }
    var index = cents.length - 2;
    return cents.substring(0, index) + '.' + cents.substring(index);
  }

  var Option = function Option(id, name, price){
    this.id = id;
    if(name !== undefined){
      this.name = name;
    }
    if(price !== undefined){
      this.price = toCents(price);
    }
  }

  var nextId = 0;

  var TrayItem = function TrayItem(id, quantity, options, name, price){
    if(id !== undefined){
      this.id  = id;
      this.quantity = +quantity;
      for(var i=0; i<options.length; i++){
        if(!isNaN(options[i])){
          options[i] = new Option(options[i]);
        }
        if(options[i].price){
          options[i].totalPrice = toDollars(options[i].price * quantity);
        }
      }
      this.trayItemId = nextId++;
      this.options  = options;
      if(name !== undefined){
        this.name = name;
      }
      if(price !== undefined){
        this.price = toCents(price);
        this.quantityPrice = toDollars(this.quantity * this.price);
      }
    }
  }

  TrayItem.prototype.getOptionIds = function getOptionIds(){
    var ids = [];
    for(var i=0; i<this.options.length; i++){
      ids.push(this.options[i].id);
    }
    return ids;
  }

  TrayItem.prototype.hasOptionSelected = function hasOptionSelected(id){
    for(var i=0; i<this.options.length; i++){
      if(this.options[i].id == id){
        return true;
      }
    }
    return false;
  }
  
  TrayItem.prototype.buildItemString = function buildItemString(){
    var string = this.id + "/" + this.quantity;
    string += "," + this.getOptionIds().join(',');
    return string;
  }

  TrayItem.prototype.getTotalPrice = function getTotalPrice(){
    var price = this.price;
    for(var i=0; i<this.options.length; i++){
      price += this.options[i].price;
    }
    return price*this.quantity;
  }

  var Tray = function Tray(items){
    this.items = items || {};
  };

  Tray.prototype.buildTrayString = function buildTrayString(){
    var string = "";
    for (var id in this.items){
      if(this.items.hasOwnProperty(id)){
        string += "+" + this.items[id].buildItemString();
      }
    }
    return string.substring(1); // remove that first plus
  }

  Tray.prototype.addItem = function addItem(item){
    this.items[item.trayItemId] = item;
  }

  Tray.prototype.removeItem = function removeItem(id){
    var removed = this.items[id];
    if(removed){
      delete this.items[id];
      return removed;
    }
  }

  Tray.prototype.getSubtotal = function getSubtotal(){
    var subtotal = 0;
    for(var id in this.items){
      if(this.items.hasOwnProperty(id)){
        subtotal += this.items[id].getTotalPrice();
      }
    }
    return subtotal;
  }

  Tray.prototype.getTotal = function getTotal(fee, tax, tip){
    return this.getSubtotal() + toCents(fee) + toCents(tax) + toCents(tip);
  }

  function buildItem(itemString){
    var re = /(\d+)\/(\d+)((,\d)*)/;
    var match = re.exec(itemString);
    if(match){
      var itemId = match[1];
      var quantity = match[2];
      var opts = match[3].substring(1).split(',');
      var options = [];
      for(var i=0; i<opts.length; i++){
        options.push(new Option(opts[i]));
      }
      return new TrayItem(itemId, quantity, options);
    }
    return null;
  }

  function buildTray(trayString){
    var items = {};
    if(typeof trayString === "string" || trayString instanceof String){
      var itemStrings = trayString.split('+');
      for(var i=0; i<itemStrings.length; i++){
        var item = buildItem(itemStrings[i]);
        if(item){
          items[item.trayItemId] = item;
        }
      }
    }
    return new Tray(items);
  }

  var init = function(){
    return {
      restaurant: new Restaurant(ordrin.restaurantUrl),
      order: new Order(ordrin.orderUrl),
      Address: Address,
      CreditCard: CreditCard,
      Option: Option,
      TrayItem: TrayItem,
      Tray: Tray,
      buildTray: buildTray
    };
  };

  ordrin.api = init();
  
}());
var  ordrin = (ordrin instanceof Object) ? ordrin : {};

(function(){
  menuTemplate = "<ul class=\"menuList\">{{#menu}}<li class=\"menuCategory\" data-mgid=\"{{id}}\"><div class=\"menu-hd\"><p class=\"header itemListName\">{{name}}</p></div><ul class=\"itemList menu main-menu\">{{#children}}<li class=\"mi\" data-listener=\"menuItem\" data-miid=\"{{id}}\"><p class=\"name\">{{name}}</p><p><span class=\"price\">{{price}}</span></p></li>{{/children}}</ul></li>{{/menu}}</ul><div class=\"trayContainer\"><div class=\"yourTray\">Your Tray</div><div class=\"addressContainer\"><b>Delivery Address:</b><div class=\"address\">{{#address}}{{addr}}<br>{{#addr2}}{{this}}<br>{{/addr2}}{{city}}, {{state}} {{zip}}<br>{{phone}}<br><div class=\"link\" data-listener=\"editAddress\">Edit</div>{{/address}}{{^address}}<div class=\"link\" data-listener=\"editAddress\">Please enter your address</div>{{/address}}</div><div class=\"addressForm hidden\"><form name=\"ordrinAddress\"><label>Street Address 1: <input type=\"text\" name=\"addr\" placeholder=\"Street Address 1\"></label><span class=\"addrError\"></span></br><label>Street Address 2: <input type=\"text\" name=\"addr2\" placeholder=\"Street Address 2\"></label><span class=\"addr2Error\"></span></br><label>City: <input type=\"text\" name=\"city\" placeholder=\"City\"></label><span class=\"cityError\"></span></br><label>State: <input type=\"text\" name=\"state\" placeholder=\"State\"></label><span class=\"stateError\"></span></br><label>Zip Code: <input type=\"text\" name=\"zip\" placeholder=\"Zip Code\"></label><span class=\"zipError\"></span></br><label>Phone Number: <input type=\"tel\" name=\"phone\" placeholder=\"Phone Number\"></label><span class=\"phoneError\"></span></br><input type=\"button\" class=\"buttonRed\" value=\"Update\" data-listener=\"updateAddress\"></form></div></div><div class=\"dateTimeContainer\"><b>Delivery Date/Time:</b><div class=\"dateTime\">{{deliveryTime}}</div><div class=\"link\" data-listener=\"editDeliveryTime\">Edit</div><div class=\"dateTimeForm hidden\"><form name=\"ordrinDateTime\"><label>Date<select name=\"date\" class=\"ordrinDateSelect\"><option value=\"ASAP\" selected=\"selected\">ASAP</option></select></label><div class=\"timeForm hidden\"><label>Time<select name=\"time\"><option value=\"12:00\" selected=\"selected\">12:00</option><option value=\"12:15\">12:15</option><option value=\"12:30\">12:30</option><option value=\"12:45\">12:45</option><option value=\"01:00\">01:00</option> <option value=\"01:15\">01:15</option> <option value=\"01:30\">01:30</option><option value=\"01:45\">01:45</option><option value=\"02:00\">02:00</option><option value=\"02:15\">02:15</option><option value=\"02:30\">02:30</option><option value=\"02:45\">02:45</option><option value=\"03:00\">03:00</option><option value=\"03:15\">03:15</option><option value=\"03:30\">03:30</option><option value=\"03:45\">03:45</option><option value=\"04:00\">04:00</option><option value=\"04:15\">04:15</option><option value=\"04:30\">04:30</option><option value=\"04:45\">04:45</option><option value=\"05:00\">05:00</option><option value=\"05:15\">05:15</option><option value=\"05:30\">05:30</option><option value=\"05:45\">05:45</option><option value=\"06:00\">06:00</option><option value=\"06:15\">06:15</option><option value=\"06:30\">06:30</option><option value=\"06:45\">06:45</option><option value=\"07:00\">07:00</option><option value=\"07:15\">07:15</option><option value=\"07:30\">07:30</option><option value=\"07:45\">07:45</option><option value=\"08:00\">08:00</option><option value=\"08:15\">08:15</option><option value=\"08:30\">08:30</option><option value=\"08:45\">08:45</option><option value=\"09:00\">09:00</option><option value=\"09:15\">09:15</option><option value=\"09:30\">09:30</option><option value=\"10:00\">10:00</option><option value=\"10:15\">10:15</option><option value=\"10:30\">10:30</option><option value=\"10:45\">10:45</option><option value=\"11:00\">11:00</option><option value=\"11:15\">11:15</option><option value=\"11:30\">11:30</option><option value=\"11:45\">11:45</option></select></label><select name=\"ampm\"><option value=\"PM\" selected>PM</option><option value=\"AM\">AM</option></select></div><input type=\"button\" class=\"smButtonRed\" value=\"Update\" data-listener=\"updateDateTime\"></form></div></div><ul class=\"tray\"></ul><div class=\"subtotal\">Subtotal: <span class=\"subtotalValue\">0.00</span></div><div class=\"tip\">Tip: <span class=\"tipValue\">0.00</span><input type=\"number\" min=\"0.00\" step=\"0.01\" value=\"0.00\" class=\"tipInput\"><input type=\"button\" value=\"Update\" data-listener=\"updateTray\"></div>{{^noProxy}}<div class=\"fee\">Fee: <span class=\"feeValue\">0.00</span></div><div class=\"tax\">Tax: <span class=\"taxValue\">0.00</span></div>{{/noProxy}}<div class=\"total\">Total: <span class=\"totalValue\">0.00</span></div><form name=\"ordrinOrder\" type=\"GET\" action=\"{{confirmUrl}}\"><input type=\"hidden\" name=\"addr\"><input type=\"hidden\" name=\"addr2\"><input type=\"hidden\" name=\"city\"><input type=\"hidden\" name=\"state\"><input type=\"hidden\" name=\"zip\"><input type=\"hidden\" name=\"phone\"><input type=\"hidden\" name=\"dateTime\"><input type=\"hidden\" name=\"tray\"><input type=\"hidden\" name=\"tip\"><input type=\"hidden\" name=\"rid\"><input type=\"button\" value=\"Order\" data-listener=\"confirmOrder\" class=\"buttonRed\"></form></div><!-- Menu Item Dialog --><div class=\"optionsDialog popup-container hidden\"></div><div class=\"dialogBg fade-to-gray hidden\"></div><div class=\"errorDialog popup-container hidden\"><div class=\"dialog popup-box-container\"><div class=\"close-popup-box\"><img class=\"closeDialog\" data-listener=\"closeError\" src=\"https://fb.ordr.in/images/popup-close.png\" /></div><span class=\"errorMsg\"></span></div></div><div class=\"errorBg fade-to-gray hidden\"></div>";
  dialogTemplate = "<div class=\"popup-box-container dialog\"><div class=\"close-popup-box\"><img class=\"closeDialog\" data-listener=\"closeDialog\" src=\"https://fb.ordr.in/images/popup-close.png\" /></div><div class=\"mItem-add-to-tray popup-content\"><div class=\"menu-hd\"><div class=\"boxright\"><h1 class=\"big-col itemTitle\">{{name}}</h1><p class=\"slim-col itemPrice\">{{price}}</p></div><div class=\"clear\"></div></div><p class=\"desc dialogDescription\">{{descrip}}</p></div><div class=\"optionContainer\"><ul class=\"optionCategoryList\">{{#children}}<li data-mogid=\"{{id}}\" class=\"optionCategory\"><span class=\"header\">{{name}}</span><span class=\"error\"></span><ul class=\"optionList\">{{#children}}<li class=\"option\" data-moid=\"{{id}}\"><input type=\"checkbox\" class=\"optionCheckbox\" data-listener=\"optionCheckbox\" /><span class=\"optionName\">{{name}}</span><span class=\"optionPrice\">{{price}}</span></li>{{/children}}</ul><div class=\"clear\"></div></li>{{/children}}</ul>      </div><label for=\"itemQuantity\">Quantity: </label><input type=\"number\" class=\"itemQuantity\" value=\"1\" min=\"1\" /><br /><input type=\"submit\" class=\"buttonRed\" data-listener=\"addToTray\" value=\"Add to Tray\" /></div>";
  trayItemTemplate = "<li class=\"trayItem\" data-listener=\"editTrayItem\" data-miid=\"{{id}}\" data-tray-id=\"{{trayItemId}}\"><div class=\"trayItemRemove\" data-listener=\"removeTrayItem\">X</div><span class=\"trayItemName\">{{name}}</span><span class=\"trayItemPrice\">{{quantityPrice}}</span><span class=\"trayItemQuantity\">({{quantity}})</span><ul>{{#options}}<li class=\"trayOption\"><span class=\"trayOptionName\">{{name}}</span><span class=\"trayOptionPrice\">{{totalPrice}}</span></li>{{/options}}</ul></li>";
  restaurantsTemplate = "<article class=\"restaurant-container\"><div><ul class=\"restaurants\">{{#restaurants}}<li><div class=\"rest-info big-col\"><section class=\"detail-col\"><a href=\"{{#params}}menu{{/params}}/{{id}}{{#params}}?time={{dateTime}}&addr={{addr}}&city={{city}}&state={{state}}&zip={{zip}}&phone={{phone}}&addr2={{addr2}}{{/params}}\"><h1 class=\"restaurant\">{{na}}</h1></a><p class=\"address\">{{ad}}</p><p>Expected delivery time: {{del}} minutes</p><p>Minimum order amount: ${{mino}}</p><ul>{{#cu}}{{.}},{{/cu}}</ul><p>This restaurant will{{^is_delivering}} <b>not</b>{{/is_delivering}} deliver to this address at this time</p></section></div></li>{{/restaurants}}</ul></div></article>";
  confirmTemplate = "<div class=\"trayContainer\"><div class=\"addressContainer\"><b>Delivery Address:</b><div class=\"address\">{{#address}}{{addr}}<br>{{addr2}}<br>{{city}}, {{state}} {{zip}}<br>{{phone}}<br><div class=\"link\" data-listener=\"editAddress\">Edit</div>{{/address}}{{^address}}<div class=\"link\" data-listener=\"editAddress\">Please enter your address</div>{{/address}}</div><div class=\"addressForm hidden\"><form name=\"ordrinAddress\"><label>Street Address 1: <input type=\"text\" name=\"addr\" placeholder=\"Street Address 1\"></label><span class=\"addrError\"></span></br><label>Street Address 2: <input type=\"text\" name=\"addr2\" placeholder=\"Street Address 2\"></label><span class=\"addr2Error\"></span></br><label>City: <input type=\"text\" name=\"city\" placeholder=\"City\"></label><span class=\"cityError\"></span></br><label>State: <input type=\"text\" name=\"state\" placeholder=\"State\"></label><span class=\"stateError\"></span></br><label>Zip Code: <input type=\"text\" name=\"zip\" placeholder=\"Zip Code\"></label><span class=\"zipError\"></span></br><label>Phone Number: <input type=\"tel\" name=\"phone\" placeholder=\"Phone Number\"></label><span class=\"phoneError\"></span></br><input type=\"button\" class=\"buttonRed\" value=\"Update\" data-listener=\"updateAddress\"></form></div></div><div class=\"dateTimeContainer\"><b>Delivery Date/Time:</b><div class=\"dateTime\">{{deliveryTime}}</div><div class=\"link\" data-listener=\"editDeliveryTime\">Edit</div><div class=\"dateTimeForm hidden\"><form name=\"ordrinDateTime\"><label>Date<select name=\"date\" class=\"ordrinDateSelect\"><option value=\"ASAP\" selected=\"selected\">ASAP</option></select></label><div class=\"timeForm hidden\"><label>Time<select name=\"time\"><option value=\"12:00\" selected=\"selected\">12:00</option><option value=\"12:15\">12:15</option><option value=\"12:30\">12:30</option><option value=\"12:45\">12:45</option><option value=\"01:00\">01:00</option> <option value=\"01:15\">01:15</option> <option value=\"01:30\">01:30</option><option value=\"01:45\">01:45</option><option value=\"02:00\">02:00</option><option value=\"02:15\">02:15</option><option value=\"02:30\">02:30</option><option value=\"02:45\">02:45</option><option value=\"03:00\">03:00</option><option value=\"03:15\">03:15</option><option value=\"03:30\">03:30</option><option value=\"03:45\">03:45</option><option value=\"04:00\">04:00</option><option value=\"04:15\">04:15</option><option value=\"04:30\">04:30</option><option value=\"04:45\">04:45</option><option value=\"05:00\">05:00</option><option value=\"05:15\">05:15</option><option value=\"05:30\">05:30</option><option value=\"05:45\">05:45</option><option value=\"06:00\">06:00</option><option value=\"06:15\">06:15</option><option value=\"06:30\">06:30</option><option value=\"06:45\">06:45</option><option value=\"07:00\">07:00</option><option value=\"07:15\">07:15</option><option value=\"07:30\">07:30</option><option value=\"07:45\">07:45</option><option value=\"08:00\">08:00</option><option value=\"08:15\">08:15</option><option value=\"08:30\">08:30</option><option value=\"08:45\">08:45</option><option value=\"09:00\">09:00</option><option value=\"09:15\">09:15</option><option value=\"09:30\">09:30</option><option value=\"10:00\">10:00</option><option value=\"10:15\">10:15</option><option value=\"10:30\">10:30</option><option value=\"10:45\">10:45</option><option value=\"11:00\">11:00</option><option value=\"11:15\">11:15</option><option value=\"11:30\">11:30</option><option value=\"11:45\">11:45</option></select></label><select name=\"ampm\"><option value=\"PM\" selected>PM</option><option value=\"AM\">AM</option></select></div><input type=\"button\" class=\"smButtonRed\" value=\"Update\" data-listener=\"updateDateTime\"></form></div></div><ul class=\"tray\"></ul><div class=\"subtotal\">Subtotal: <span class=\"subtotalValue\">0.00</span></div><div class=\"tip\">Tip: <span class=\"tipValue\">0.00</span><input type=\"number\" min=\"0.00\" step=\"0.01\" value=\"0.00\" class=\"tipInput\"><input type=\"button\" value=\"Update\" data-listener=\"updateTray\"></div>{{^noProxy}}<div class=\"fee\">Fee: <span class=\"feeValue\">0.00</span></div><div class=\"tax\">Tax: <span class=\"taxValue\">0.00</span></div>{{/noProxy}}<div class=\"total\">Total: <span class=\"totalValue\">0.00</span></div><form name=\"ordrinCheckout\" type=\"POST\" action=\"{{checkoutUri}}\">{{!#address}}<input type=\"hidden\" name=\"addr\" value=\"{{addr}}\"><input type=\"hidden\" name=\"addr2\" value=\"{{addr2}}\"><input type=\"hidden\" name=\"city\" value=\"{{city}}\"><input type=\"hidden\" name=\"state\" value=\"{{state}}\"><input type=\"hidden\" name=\"zip\" value=\"{{zip}}\"><input type=\"hidden\" name=\"phone\" value=\"{{phone}}\">{{!/address}}<input type=\"hidden\" name=\"rid\" value=\"{{rid}}\"{{!#tray}}<!-- Make sure to change value after changing tray --><input type=\"hidden\" name=\"tray\" value=\"{{buildTrayString}}\">{{!/tray}}<input type=\"submit\" value=\"Checkout\" class=\"buttonRed\"></form></div><!-- Menu Item Dialog --><div class=\"optionsDialog popup-container hidden\"></div><div class=\"dialogBg fade-to-gray hidden\"></div><div class=\"errorDialog popup-container hidden\"><div class=\"dialog popup-box-container\"><div class=\"close-popup-box\"><img class=\"closeDialog\" data-listener=\"closeError\" src=\"https://fb.ordr.in/images/popup-close.png\" /></div><span class=\"errorMsg\"></span></div></div><div class=\"errorBg fade-to-gray hidden\"></div>";

  if(ordrin.hasOwnProperty("tomato")){
    if(!ordrin.tomato.hasKey("menuTemplate")){
      ordrin.tomato.set("menuTemplate", menuTemplate);
    }
    if(!ordrin.tomato.hasKey("dialogTemplate")){
      ordrin.tomato.set("dialogTemplate", dialogTemplate);
    }
    if(!ordrin.tomato.hasKey("trayItemTemplate")){
      ordrin.tomato.set("trayItemTemplate", trayItemTemplate);
    }
    if(!ordrin.tomato.hasKey("restaurantsTemplate")){
      ordrin.tomato.set("restaurantsTemplate", restaurantsTemplate);
    }
    if(!ordrin.tomato.hasKey("confirmTemplate")){
      ordrin.tomato.set("confirmTemplate", confirmTemplate);
    }
  } else {
    if(!ordrin.init.hasOwnProperty("menuTemplate")){
      ordrin.init.menuTemplate = menuTemplate;
    }
    if(!ordrin.init.hasOwnProperty("dialogTemplate")){
      ordrin.init.dialogTemplate = dialogTemplate;
    }
    if(!ordrin.init.hasOwnProperty("trayItemTemplate")){
      ordrin.init.trayItemTemplate = trayItemTemplate;
    }
    if(!ordrin.init.hasOwnProperty("restaurantsTemplate")){
      ordrin.init.restaurantsTemplate = restaurantsTemplate;
    }
    if(!ordrin.init.hasOwnProperty("confirmTemplate")){
      ordrin.init.confirmTemplate = confirmTemplate;
    }
  }

  /*!
 * mustache.js - Logic-less {{mustache}} templates with JavaScript
 * http://github.com/janl/mustache.js
 */

/*global define: false*/

var Mustache;

(function (exports) {
  if (typeof module !== "undefined" && typeof module.exports !== "undefined") {
    module.exports = exports; // CommonJS
  } else if (typeof define === "function") {
    define(exports); // AMD
  } else {
    Mustache = exports; // <script>
  }
}((function () {
  var exports = {};

  exports.name = "mustache.js";
  exports.version = "0.5.2";
  exports.tags = ["{{", "}}"];

  exports.parse = parse;
  exports.clearCache = clearCache;
  exports.compile = compile;
  exports.compilePartial = compilePartial;
  exports.render = render;

  exports.Scanner = Scanner;
  exports.Context = Context;
  exports.Renderer = Renderer;

  // This is here for backwards compatibility with 0.4.x.
  exports.to_html = function (template, view, partials, send) {
    var result = render(template, view, partials);

    if (typeof send === "function") {
      send(result);
    } else {
      return result;
    }
  };

  var whiteRe = /\s*/;
  var spaceRe = /\s+/;
  var nonSpaceRe = /\S/;
  var eqRe = /\s*=/;
  var curlyRe = /\s*\}/;
  var tagRe = /#|\^|\/|>|\{|&|=|!/;

  // Workaround for https://issues.apache.org/jira/browse/COUCHDB-577
  // See https://github.com/janl/mustache.js/issues/189
  function testRe(re, string) {
    return RegExp.prototype.test.call(re, string);
  }

  function isWhitespace(string) {
    return !testRe(nonSpaceRe, string);
  }

  var isArray = Array.isArray || function (obj) {
    return Object.prototype.toString.call(obj) === "[object Array]";
  };

  // OSWASP Guidelines: escape all non alphanumeric characters in ASCII space.
  var jsCharsRe = /[\x00-\x2F\x3A-\x40\x5B-\x60\x7B-\xFF\u2028\u2029]/gm;

  function quote(text) {
    var escaped = text.replace(jsCharsRe, function (c) {
      return "\\u" + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
    });

    return '"' + escaped + '"';
  }

  function escapeRe(string) {
    return string.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
  }

  var entityMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': '&quot;',
    "'": '&#39;',
    "/": '&#x2F;'
  };

  function escapeHtml(string) {
    return String(string).replace(/[&<>"'\/]/g, function (s) {
      return entityMap[s];
    });
  }

  // Export these utility functions.
  exports.isWhitespace = isWhitespace;
  exports.isArray = isArray;
  exports.quote = quote;
  exports.escapeRe = escapeRe;
  exports.escapeHtml = escapeHtml;

  function Scanner(string) {
    this.string = string;
    this.tail = string;
    this.pos = 0;
  }

  /**
   * Returns `true` if the tail is empty (end of string).
   */
  Scanner.prototype.eos = function () {
    return this.tail === "";
  };

  /**
   * Tries to match the given regular expression at the current position.
   * Returns the matched text if it can match, the empty string otherwise.
   */
  Scanner.prototype.scan = function (re) {
    var match = this.tail.match(re);

    if (match && match.index === 0) {
      this.tail = this.tail.substring(match[0].length);
      this.pos += match[0].length;
      return match[0];
    }

    return "";
  };

  /**
   * Skips all text until the given regular expression can be matched. Returns
   * the skipped string, which is the entire tail if no match can be made.
   */
  Scanner.prototype.scanUntil = function (re) {
    var match, pos = this.tail.search(re);

    switch (pos) {
    case -1:
      match = this.tail;
      this.pos += this.tail.length;
      this.tail = "";
      break;
    case 0:
      match = "";
      break;
    default:
      match = this.tail.substring(0, pos);
      this.tail = this.tail.substring(pos);
      this.pos += pos;
    }

    return match;
  };

  function Context(view, parent) {
    this.view = view;
    this.parent = parent;
    this.clearCache();
  }

  Context.make = function (view) {
    return (view instanceof Context) ? view : new Context(view);
  };

  Context.prototype.clearCache = function () {
    this._cache = {};
  };

  Context.prototype.push = function (view) {
    return new Context(view, this);
  };

  Context.prototype.lookup = function (name) {
    var value = this._cache[name];

    if (!value) {
      if (name === ".") {
        value = this.view;
      } else {
        var context = this;

        while (context) {
          if (name.indexOf(".") > 0) {
            var names = name.split("."), i = 0;

            value = context.view;

            while (value && i < names.length) {
              value = value[names[i++]];
            }
          } else {
            value = context.view[name];
          }

          if (value != null) {
            break;
          }

          context = context.parent;
        }
      }

      this._cache[name] = value;
    }

    if (typeof value === "function") {
      value = value.call(this.view);
    }

    return value;
  };

  function Renderer() {
    this.clearCache();
  }

  Renderer.prototype.clearCache = function () {
    this._cache = {};
    this._partialCache = {};
  };

  Renderer.prototype.compile = function (tokens, tags) {
    if (typeof tokens === "string") {
      tokens = parse(tokens, tags);
    }

    var fn = compileTokens(tokens),
        self = this;

    return function (view) {
      return fn(Context.make(view), self);
    };
  };

  Renderer.prototype.compilePartial = function (name, tokens, tags) {
    this._partialCache[name] = this.compile(tokens, tags);
    return this._partialCache[name];
  };

  Renderer.prototype.render = function (template, view) {
    var fn = this._cache[template];

    if (!fn) {
      fn = this.compile(template);
      this._cache[template] = fn;
    }

    return fn(view);
  };

  Renderer.prototype._section = function (name, context, callback) {
    var value = context.lookup(name);

    switch (typeof value) {
    case "object":
      if (isArray(value)) {
        var buffer = "";

        for (var i = 0, len = value.length; i < len; ++i) {
          buffer += callback(context.push(value[i]), this);
        }

        return buffer;
      }

      return value ? callback(context.push(value), this) : "";
    case "function":
      // TODO: The text should be passed to the callback plain, not rendered.
      var sectionText = callback(context, this),
          self = this;

      var scopedRender = function (template) {
        return self.render(template, context);
      };

      return value.call(context.view, sectionText, scopedRender) || "";
    default:
      if (value) {
        return callback(context, this);
      }
    }

    return "";
  };

  Renderer.prototype._inverted = function (name, context, callback) {
    var value = context.lookup(name);

    // From the spec: inverted sections may render text once based on the
    // inverse value of the key. That is, they will be rendered if the key
    // doesn't exist, is false, or is an empty list.
    if (value == null || value === false || (isArray(value) && value.length === 0)) {
      return callback(context, this);
    }

    return "";
  };

  Renderer.prototype._partial = function (name, context) {
    var fn = this._partialCache[name];

    if (fn) {
      return fn(context);
    }

    return "";
  };

  Renderer.prototype._name = function (name, context, escape) {
    var value = context.lookup(name);

    if (typeof value === "function") {
      value = value.call(context.view);
    }

    var string = (value == null) ? "" : String(value);

    if (escape) {
      return escapeHtml(string);
    }

    return string;
  };

  /**
   * Low-level function that compiles the given `tokens` into a
   * function that accepts two arguments: a Context and a
   * Renderer. Returns the body of the function as a string if
   * `returnBody` is true.
   */
  function compileTokens(tokens, returnBody) {
    var body = ['""'];
    var token, method, escape;

    for (var i = 0, len = tokens.length; i < len; ++i) {
      token = tokens[i];

      switch (token.type) {
      case "#":
      case "^":
        method = (token.type === "#") ? "_section" : "_inverted";
        body.push("r." + method + "(" + quote(token.value) + ", c, function (c, r) {\n" +
          "  " + compileTokens(token.tokens, true) + "\n" +
          "})");
        break;
      case "{":
      case "&":
      case "name":
        escape = token.type === "name" ? "true" : "false";
        body.push("r._name(" + quote(token.value) + ", c, " + escape + ")");
        break;
      case ">":
        body.push("r._partial(" + quote(token.value) + ", c)");
        break;
      case "text":
        body.push(quote(token.value));
        break;
      }
    }

    // Convert to a string body.
    body = "return " + body.join(" + ") + ";";

    // Good for debugging.
    // console.log(body);

    if (returnBody) {
      return body;
    }

    // For great evil!
    return new Function("c, r", body);
  }

  function escapeTags(tags) {
    if (tags.length === 2) {
      return [
        new RegExp(escapeRe(tags[0]) + "\\s*"),
        new RegExp("\\s*" + escapeRe(tags[1]))
      ];
    }

    throw new Error("Invalid tags: " + tags.join(" "));
  }

  /**
   * Forms the given linear array of `tokens` into a nested tree structure
   * where tokens that represent a section have a "tokens" array property
   * that contains all tokens that are in that section.
   */
  function nestTokens(tokens) {
    var tree = [];
    var collector = tree;
    var sections = [];
    var token, section;

    for (var i = 0; i < tokens.length; ++i) {
      token = tokens[i];

      switch (token.type) {
      case "#":
      case "^":
        token.tokens = [];
        sections.push(token);
        collector.push(token);
        collector = token.tokens;
        break;
      case "/":
        if (sections.length === 0) {
          throw new Error("Unopened section: " + token.value);
        }

        section = sections.pop();

        if (section.value !== token.value) {
          throw new Error("Unclosed section: " + section.value);
        }

        if (sections.length > 0) {
          collector = sections[sections.length - 1].tokens;
        } else {
          collector = tree;
        }
        break;
      default:
        collector.push(token);
      }
    }

    // Make sure there were no open sections when we're done.
    section = sections.pop();

    if (section) {
      throw new Error("Unclosed section: " + section.value);
    }

    return tree;
  }

  /**
   * Combines the values of consecutive text tokens in the given `tokens` array
   * to a single token.
   */
  function squashTokens(tokens) {
    var lastToken;

    for (var i = 0; i < tokens.length; ++i) {
      var token = tokens[i];

      if (lastToken && lastToken.type === "text" && token.type === "text") {
        lastToken.value += token.value;
        tokens.splice(i--, 1); // Remove this token from the array.
      } else {
        lastToken = token;
      }
    }
  }

  /**
   * Breaks up the given `template` string into a tree of token objects. If
   * `tags` is given here it must be an array with two string values: the
   * opening and closing tags used in the template (e.g. ["<%", "%>"]). Of
   * course, the default is to use mustaches (i.e. Mustache.tags).
   */
  function parse(template, tags) {
    tags = tags || exports.tags;

    var tagRes = escapeTags(tags);
    var scanner = new Scanner(template);

    var tokens = [],      // Buffer to hold the tokens
        spaces = [],      // Indices of whitespace tokens on the current line
        hasTag = false,   // Is there a {{tag}} on the current line?
        nonSpace = false; // Is there a non-space char on the current line?

    // Strips all whitespace tokens array for the current line
    // if there was a {{#tag}} on it and otherwise only space.
    var stripSpace = function () {
      if (hasTag && !nonSpace) {
        while (spaces.length) {
          tokens.splice(spaces.pop(), 1);
        }
      } else {
        spaces = [];
      }

      hasTag = false;
      nonSpace = false;
    };

    var type, value, chr;

    while (!scanner.eos()) {
      value = scanner.scanUntil(tagRes[0]);

      if (value) {
        for (var i = 0, len = value.length; i < len; ++i) {
          chr = value.charAt(i);

          if (isWhitespace(chr)) {
            spaces.push(tokens.length);
          } else {
            nonSpace = true;
          }

          tokens.push({type: "text", value: chr});

          if (chr === "\n") {
            stripSpace(); // Check for whitespace on the current line.
          }
        }
      }

      // Match the opening tag.
      if (!scanner.scan(tagRes[0])) {
        break;
      }

      hasTag = true;
      type = scanner.scan(tagRe) || "name";

      // Skip any whitespace between tag and value.
      scanner.scan(whiteRe);

      // Extract the tag value.
      if (type === "=") {
        value = scanner.scanUntil(eqRe);
        scanner.scan(eqRe);
        scanner.scanUntil(tagRes[1]);
      } else if (type === "{") {
        var closeRe = new RegExp("\\s*" + escapeRe("}" + tags[1]));
        value = scanner.scanUntil(closeRe);
        scanner.scan(curlyRe);
        scanner.scanUntil(tagRes[1]);
      } else {
        value = scanner.scanUntil(tagRes[1]);
      }

      // Match the closing tag.
      if (!scanner.scan(tagRes[1])) {
        throw new Error("Unclosed tag at " + scanner.pos);
      }

      tokens.push({type: type, value: value});

      if (type === "name" || type === "{" || type === "&") {
        nonSpace = true;
      }

      // Set the tags for the next time around.
      if (type === "=") {
        tags = value.split(spaceRe);
        tagRes = escapeTags(tags);
      }
    }

    squashTokens(tokens);

    return nestTokens(tokens);
  }

  // The high-level clearCache, compile, compilePartial, and render functions
  // use this default renderer.
  var _renderer = new Renderer();

  /**
   * Clears all cached templates and partials.
   */
  function clearCache() {
    _renderer.clearCache();
  }

  /**
   * High-level API for compiling the given `tokens` down to a reusable
   * function. If `tokens` is a string it will be parsed using the given `tags`
   * before it is compiled.
   */
  function compile(tokens, tags) {
    return _renderer.compile(tokens, tags);
  }

  /**
   * High-level API for compiling the `tokens` for the partial with the given
   * `name` down to a reusable function. If `tokens` is a string it will be
   * parsed using the given `tags` before it is compiled.
   */
  function compilePartial(name, tokens, tags) {
    return _renderer.compilePartial(name, tokens, tags);
  }

  /**
   * High-level API for rendering the `template` using the given `view`. The
   * optional `partials` object may be given here for convenience, but note that
   * it will cause all partials to be re-compiled, thus hurting performance. Of
   * course, this only matters if you're going to render the same template more
   * than once. If so, it is best to call `compilePartial` before calling this
   * function and to leave the `partials` argument blank.
   */
  function render(template, view, partials) {
    if (partials) {
      for (var name in partials) {
        compilePartial(name, partials[name]);
      }
    }

    return _renderer.render(template, view);
  }

  return exports;
}())));

  ordrin.Mustache = Mustache;
})();
var  ordrin = (ordrin instanceof Object) ? ordrin : {};

if(!ordrin.hasOwnProperty("tomato")){
  ordrin.tomato = new ordrin.Tomato();
}

if(!ordrin.hasOwnProperty("emitter")){
  ordrin.emitter = new EventEmitter2({wildcard:true});
  if(typeof ordrin.emitterLoaded === "function"){
    ordrin.emitterLoaded(ordrin.emitter);
    delete ordrin.emitterLoaded;
  }
}

(function(tomato, emitter, api, Mustache){
  "use strict";

  var page = tomato.get("page");

  if(!tomato.hasKey("render")){
    tomato.set("render", true);
  }

  var render = tomato.get("render");

  var noProxy = tomato.get("noProxy");

  var delivery;

  var tray;

  var elements = {}; // variable to store elements so we don't have to continually DOM them

  var allItems;

  var Option = api.Option;
  var TrayItem = api.TrayItem;
  var Tray = api.Tray;
  var Address = api.Address;

  function deliveryCheck(){
    if(!noProxy){
      api.restaurant.getDeliveryCheck(getRid(), getDeliveryTime(), getAddress(), function(err, data){
        if(err){
          handleError(err);
        } else {
          console.log(data);
          delivery = data.delivery;
          if(data.delivery === 0){
            handleError(data);
          }
        }
      });
    } else {
      delivery = true;
    }
  }
  
  function getRid(){
    return tomato.get("rid");
  }

  function ridExists(){
    return tomato.hasKey("rid");
  }

  function setRid(rid){
    tomato.set("rid", rid);
  }

  function getMenu(){
    return tomato.get("menu");
  }

  function menuExists(){
    return tomato.hasKey("menu");
  }
  
  function setMenu(menu){
    tomato.set("menu", menu);
    allItems = extractAllItems(menu);
  }

  function getAddress(){
    return tomato.get("address");
  }

  function addressExists(){
    return tomato.hasKey("address");
  }

  var addressTemplate="{{addr}}<br>{{#addr2}}{{this}}<br>{{/addr2}}{{city}}, {{state}} {{zip}}<br>{{phone}}<br><a data-listener=\"editAddress\">Edit</a>";

  function setAddress(address){
    tomato.set("address", address);
    switch(page){
      case "menu":
        var addressHtml = Mustache.render(addressTemplate, address);
        getElementsByClassName(elements.menu, "address")[0].innerHTML = addressHtml;
        deliveryCheck();
        break;
      case "restaurants": downloadRestaurants(); break;
      default: break;
    }
  }

  function getDeliveryTime(){
    return tomato.get("deliveryTime");
  }

  function deliveryTimeExists(){
    return tomato.hasKey("deliveryTime");
  }

  function setDeliveryTime(deliveryTime){
    tomato.set("deliveryTime", deliveryTime);
    switch(page){
      case "menu": getElementsByClassName(elements.menu, "dateTime")[0].innerHTML = deliveryTime; deliveryCheck(); break;
      case "restaurants": downloadRestaurants(); break;
      default: break;
    }
  }

  function getTray(){
    return tomato.get("tray");
  }

  function trayExists(){
    return tomato.hasKey("tray")
  }

  function setTray(newTray){
    tray = newTray;
    tomato.set("tray", tray);
  }

  function getTip(){
    return tomato.get("tip") ? tomato.get("tip") : 0.00;
  }

  function setRestaurant(rid, newMenu){
    setRid(rid);
    if(newMenu){
      setMenu(newMenu);
      renderMenu(newMenu);
    } else {
      if(!noProxy){
        api.restaurant.getDetails(rid, function(err, data){
          setMenu(data.menu);
          renderMenu(data.menu);
        });
      }
    }
  }

  function processNewMenuPage(){
    getElements();
    populateAddressForm();
    initializeDateForm();
    if(trayExists()){
      var tray = getTray();
      for(var prop in tray.items){
        if(tray.items.hasOwnProperty(prop)){
          addTrayItemNode(tray.items[prop]);
        }
      }
    } else {
      setTray(new Tray());
    }
    listen("click", document.body, clicked);
    listen("change", getElementsByClassName(elements.menu, "ordrinDateSelect")[0], dateSelected);
    updateFee();
  }

  function renderMenu(menuData){
    var data = {menu:menuData, deliveryTime:getDeliveryTime()};
    data.confirmUrl = tomato.get("confirmUrl");
    if(tomato.hasKey("address")){
      data.address = getAddress();
    }
    var menuHtml = Mustache.render(tomato.get("menuTemplate"), data);
    document.getElementById("ordrinMenu").innerHTML = menuHtml;
    processNewMenuPage();
  }

  function initMenuPage(){
    if(render){
      setRestaurant(getRid(), getMenu());
    } else {
      if(menuExists()){
        setMenu(getMenu());
      } else {
        api.restaurant.getDetails(getRid(), function(err, data){
          setMenu(data.menu);
        });
      }
      processNewMenuPage();
    }
  }

  function buildItemFromString(itemString){
    var re = /(\d+)\/(\d+)((,\d+)*)/;
    var match = re.exec(itemString);
    if(match){
      var id = match[1];
      var quantity = match[2];
      var options = [];
      if(match[3]){
        var opts = match[3].substring(1).split(',');
        for(var i=0; i<opts.length; i++){
          var optId = opts[i];
          var optName = allItems[optId].name;
          var optPrice = allItems[optId].price;
          options.push(new Option(optId, optName, optPrice));
        }
      }
      var name = allItems[id].name;
      var price = allItems[id].price;
      return new TrayItem(id, quantity, options, name, price);
    }
  }

  function buildTrayFromString(trayString){
    var items = {};
    if(typeof trayString === "string" || trayString instanceof String){
      var itemStrings = trayString.split('+');
      for(var i=0; i<itemStrings.length; i++){
        var item = buildItemFromString(itemStrings[i]);
        if(item){
          items[item.trayItemId] = item;
        }
      }
    }
    return new Tray(items);
  }

  function renderConfirm(tray){
    var data = {deliveryTime:getDeliveryTime(), address:getAddress()};
    data.tray = tray;
    data.checkoutUri = tomato.get("checkoutUri");
    data.rid = getRid();
    var confirmHtml = Mustache.render(tomato.get("confirmTemplate"), data);
    var confirmDiv = document.getElementById("ordrinConfirm");
    confirmDiv.innerHTML = confirmHtml;
    processNewMenuPage();
  }

  function initConfirmPage(){
    if(menuExists()){
      if(!trayExists()){
        setTray(buildTrayFromString(tomato.get("trayString")));
      }
      renderConfirm(getTray());
    } else {
      api.restaurant.getDetails(getRid(), function(err, data){
        setMenu(data.menu);
        if(!trayExists()){
          setTray(buildTrayFromString(tomato.get("trayString")));
        }
        renderConfirm(getTray());
      });
    }
  }

  function renderRestaurants(restaurants){
    var params = {};
    var address = getAddress(), deliveryTime = getDeliveryTime();
    for(var prop in address){
      if(address.hasOwnProperty(prop)){
        params[prop] = encodeURIComponent(address[prop] || '');
      }
    }
    params.dateTime = deliveryTime;
    for(var i=0; i<restaurants.length; i++){
      restaurants[i].params = params;
    }
    var data = {restaurants:restaurants};
    var restaurantsHtml = Mustache.render(tomato.get("restaurantsTemplate"), data);
    document.getElementById("ordrinRestaurants").innerHTML = restaurantsHtml;
  }

  function downloadRestaurants(){
    if(!noProxy){
      api.restaurant.getDeliveryList(getDeliveryTime(), getAddress(), function(err, data){
        for(var i=0; i<data.length; i++){
          data[i].is_delivering = !!(data[i].is_delivering);
        }
        renderRestaurants(data);
      });
    }
  }

  function initRestaurantsPage(){
    if(render){
      if(tomato.hasKey("restaurants")){
        renderRestaurants(tomato.get("restaurants"));
      } else {
        downloadRestaurants();
      }
    }
  }



  function addTrayItem(item){
    tray.addItem(item);
    tomato.set("tray", tray);
    emitter.emit("tray.add", item);
  }

  function removeTrayItem(id){
    var removed = tray.removeItem(id);
    tomato.set("tray", tray);
    emitter.emit("tray.remove", removed);
  }

  function dateSelected(){
    if(document.forms["ordrinDateTime"].date.value === "ASAP"){
      hideElement(getElementsByClassName(elements.menu, "timeForm")[0]);
    } else {
      unhideElement(getElementsByClassName(elements.menu, "timeForm")[0]);
    }
  }

  //All prices should be in cents

  function toCents(value){
    if(value.indexOf('.') < 0){
      return (+value)*100;
    } else {
      var match = value.match(/(\d*)\.(\d{2})\d*$/);
      if(match){
        return +(match[1]+match[2]);
      } else {
        match = value.match(/(\d*)\.(\d)$/);
        if(match){
          return +(match[1]+match[2])*10;
        } else {
          console.log(value+" is not an amount of money");
        }
      }
    }
  }

  function toDollars(value){
    if( !value ) {
      return '0.00';
    }

    var cents = value.toString();
    while(cents.length<3){
      cents = '0'+cents;
    }
    var index = cents.length - 2;
    return cents.substring(0, index) + '.' + cents.substring(index);
  }

  tomato.register("ordrinApi", [Option, TrayItem, Tray, Address])

  function updateTip(){
    var tip = toCents(getElementsByClassName(elements.menu, "tipInput")[0].value+"");
    tomato.set("tip", tip);
    updateFee();
  }

  function updateFee(){
    var subtotal = getTray().getSubtotal();
    getElementsByClassName(elements.menu, "subtotalValue")[0].innerHTML = toDollars(subtotal);
    var tip = getTip();
    getElementsByClassName(elements.menu, "tipValue")[0].innerHTML = toDollars(tip);
    if(noProxy){
      var total = subtotal + tip;
      getElementsByClassName(elements.menu, "totalValue")[0].innerHTML = toDollars(total);
    } else {
      api.restaurant.getFee(getRid(), toDollars(subtotal), toDollars(tip), getDeliveryTime(), getAddress(), function(err, data){
        if(err){
          handleError(err);
        } else {
          // Check what to do with fee and tax values
          getElementsByClassName(elements.menu, "feeValue")[0].innerHTML = data.fee;
          getElementsByClassName(elements.menu, "taxValue")[0].innerHTML = data.tax;
          var total = subtotal + tip + toCents(data.fee) + toCents(data.tax);
          getElementsByClassName(elements.menu, "totalValue")[0].innerHTML = toDollars(total);
          delivery = data.delivery;
          if(data.delivery === 0){
            handleError({delivery:0, msg:data.msg});
          }
        }
      });
    }
  }

  function hideElement(element){
    element.className += " hidden";
  }

  function unhideElement(element){
    element.className = element.className.replace(/\s?\bhidden\b\s?/g, ' ').replace(/(\s){2,}/g, '$1');
  }

  function toggleHideElement(element){
    if(/\bhidden\b/.test(element.className)){
      unhideElement(element);
    } else {
      hideElement(element);
    }
  }

  function showErrorDialog(msg){
    // show background
    elements.errorBg.className = elements.errorBg.className.replace("hidden", "");

    getElementsByClassName(elements.errorDialog, "errorMsg")[0].innerHTML = msg;
    // show the dialog
    elements.errorDialog.className = elements.errorDialog.className.replace("hidden", "");
  }

  function hideErrorDialog(){
    hideElement(elements.errorBg)
    hideElement(elements.errorDialog)
    clearNode(getElementsByClassName(elements.errorDialog, "errorMsg")[0]);
  }
  
  function listen(evnt, elem, func) {
    if (elem.addEventListener)  // W3C DOM
      elem.addEventListener(evnt,func,false);
    else if (elem.attachEvent) { // IE DOM
      var r = elem.attachEvent("on"+evnt, func);
      return r;
    }
  }

  function goUntilParent(node, targetClass){
    var re = new RegExp("\\b"+targetClass+"\\b")
    if (node.className.match(re) === null){
      while(node.parentNode !== document){
        node = node.parentNode;
        if (node.className.match(re) !== null){
          break;
        }
      }
      return node;
    } else {
      return node;
    }
  }

  function clearNode(node){
    while(node.firstChild){
      node.removeChild(node.firstChild);
    }
  }

  function extractAllItems(itemList){
    var items = {};
    var item;
    for(var i=0; i<itemList.length; i++){
      item = itemList[i];
      items[item.id] = item;
      if(typeof item.children !== "undefined"){
        var children = extractAllItems(item.children);
        for(var id in children){
          if(children.hasOwnProperty(id)){
            items[id] = children[id];
          }
        }
      }
      else{
        item.children = false;
      }
      if(typeof item.descrip === "undefined"){
        item.descrip = "";
      }
    }
    return items;
  }

  function populateAddressForm(){
    if(addressExists()){
      var address = getAddress();
      var form = document.forms["ordrinAddress"];
      form.addr.value = address.addr || '';
      form.addr2.value = address.addr2 || '';
      form.city.value = address.city || '';
      form.state.value = address.state || '';
      form.zip.value = address.zip || '';
      form.phone.value = address.phone || '';
    }
  }

  function padLeft(number, size, c){
    if(typeof c === "undefined"){
      c = "0";
    }
    var str = ''+number;
    var len = str.length
    for(var i=0; i<size-len; i++){
      str = c+str;
    }
    return str;
  }

  function initializeDateForm(){
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "June", "July", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var form = document.forms["ordrinDateTime"];
    var date = new Date();
    var option = document.createElement("option");
    option.setAttribute("value", padLeft(date.getMonth()+1, 2)+'-'+padLeft(date.getDate(), 2));
    option.innerHTML = "Today, "+days[date.getDay()];
    form.date.appendChild(option);
    
    option = document.createElement("option");
    date.setDate(date.getDate()+1);
    option.setAttribute("value", padLeft(date.getMonth()+1, 2)+'-'+padLeft(date.getDate(), 2));
    option.innerHTML = "Tomorrow, "+days[date.getDay()];
    form.date.appendChild(option);
    
    option = document.createElement("option");
    date.setDate(date.getDate()+1);
    option.setAttribute("value", padLeft(date.getMonth()+1, 2)+'-'+padLeft(date.getDate(), 2));
    option.innerHTML = months[date.getMonth()]+" "+date.getDate()+', '+days[date.getDay()];
    form.date.appendChild(option);
  }

  function clicked(event){
    if (typeof event.srcElement == "undefined"){
      event.srcElement = event.target;
    }
    // call the appropiate function based on what element was actually clicked
    var routes = {  
      menuItem    : createDialogBox,
      editTrayItem : createEditDialogBox,
      closeDialog : hideDialogBox,
      addToTray : addDialogItemToTray,
      removeTrayItem : removeTrayItemFromNode,
      optionCheckbox : validateCheckbox,
      updateTray : updateTip,
      updateAddress : saveAddressForm,
      editAddress : showAddressForm,
      updateDateTime : saveDateTimeForm,
      editDeliveryTime : showDateTimeForm,
      closeError : hideErrorDialog,
      confirmOrder : confirmOrder
    }
    var node = event.srcElement;
    while(!node.hasAttribute("data-listener")){
      if(node.tagName.toUpperCase() === "HTML"){
        return;
      }
      node = node.parentNode;
    }
    var name = node.getAttribute("data-listener");

    if (typeof routes[name] != "undefined"){
      routes[name](node);
    }
  }

  function confirmOrder(){
    var form = document.forms.ordrinOrder;
    if(!addressExists()){
      handleError({msg:"No address set"});
      return;
    }
    if(!delivery){
      handleError({msg:"The restaurant will not deliver this order at this time"});
      return;
    }
    var address = getAddress()
    form.addr.value = address.addr || '';
    form.addr2.value = address.addr2 || '';
    form.city.value = address.city || '';
    form.state.value = address.state || '';
    form.zip.value = address.zip || '';
    form.phone.value = address.phone || '';
    form.dateTime.value = getDeliveryTime();
    form.tray.value = getTray().buildTrayString();
    form.tip.value = tomato.get("tip");
    form.rid.value = getRid();
    form.submit();
  }

  function showAddressForm(){
    toggleHideElement(getElementsByClassName(elements.menu, "addressForm")[0]);
  }

  function showDateTimeForm(){
    toggleHideElement(getElementsByClassName(elements.menu, "dateTimeForm")[0]);
    dateSelected();
  }

  function saveDateTimeForm(){
    var form = document.forms["ordrinDateTime"];
    var date = form.date.value;
    if(date === "ASAP"){
      setDeliveryTime("ASAP");
    } else {
      var split = form.time.value.split(":");
      var hours = split[0]==="12"?0:+split[0];
      var minutes = +split[1];
      if(form.ampm.value === "PM"){
        hours += 12;
      }
      
      var time = padLeft(hours,2)+":"+padLeft(minutes,2);
      setDeliveryTime(date+"+"+time);
    }
    hideElement(getElementsByClassName(elements.menu, "dateTimeForm")[0]);
  }

  function saveAddressForm(){
    var form = document.forms["ordrinAddress"];
    var inputs = ['addr', 'addr2', 'city', 'state', 'zip', 'phone'];
    for(var i=0; i<inputs.length; i++){
      getElementsByClassName(elements.menu, inputs[i]+"Error")[0].innerHTML = '';
    }
    try {
      var address = new api.Address(form.addr.value, form.city.value, form.state.value, form.zip.value, form.phone.value, form.addr2.value);
      setAddress(address);
      populateAddressForm();
      hideElement(getElementsByClassName(elements.menu, "addressForm")[0]);
    } catch(e){
      console.log(e.stack);
      if(typeof e.fields !== "undefined"){
        var keys = Object.keys(e.fields);
        for(var i=0; i<keys.length; i++){
          getElementsByClassName(elements.menu, keys[i]+"Error")[0].innerHTML = e.fields[keys[i]];
        }
      }
    }
  }

  function getChildWithClass(node, className){
    var re = new RegExp("\\b"+className+"\\b");
    for(var i=0; i<node.children.length; i++){
      if(re.test(node.children[i].className)){
        return node.children[i];
      }
    }
  }

  function getElementsByClassName(node, className){
    if(typeof node.getElementsByClassName !== "undefined"){
      return node.getElementsByClassName(className);
    }
    var re = new RegExp("\\b"+className+"\\b");
    var nodes = [];
    for(var i=0; i<node.children.length; i++){
      var child = node.children[i];
      if(re.test(child.className)){
        nodes.push(child);
      }
      nodes = nodes.concat(getElementsByClassName(child, className));
    }
    return nodes;
  }

  function createDialogBox(node){
    var itemId = node.getAttribute("data-miid");
    buildDialogBox(itemId);
    showDialogBox();
  }

  function createEditDialogBox(node){
    var itemId = node.getAttribute("data-miid");
    var trayItemId = node.getAttribute("data-tray-id");
    var trayItem = getTray().items[trayItemId];
    buildDialogBox(itemId);
    var options = getElementsByClassName(elements.dialog, "option");
    for(var i=0; i<options.length; i++){
      var optId = options[i].getAttribute("data-moid");
      var checkbox = getElementsByClassName(options[i], "optionCheckbox")[0];
      checkbox.checked = trayItem.hasOptionSelected(optId);
    }
    var button = getElementsByClassName(elements.dialog, "buttonRed")[0];
    button.setAttribute("value", "Save to Tray");
    var quantity = getElementsByClassName(elements.dialog, "itemQuantity")[0];
    quantity.setAttribute("value", trayItem.quantity);
    elements.dialog.setAttribute("data-tray-id", trayItemId);
    showDialogBox();
  }

  function buildDialogBox(id){
    elements.dialog.innerHTML = Mustache.render(tomato.get("dialogTemplate"), allItems[id]);
    elements.dialog.setAttribute("data-miid", id);
  }
  
  function showDialogBox(){
    // show background
    elements.dialogBg.className = elements.dialogBg.className.replace("hidden", "");

    // show the dialog
    elements.dialog.className = elements.dialog.className.replace("hidden", "");
  }

  function hideDialogBox(){
    elements.dialogBg.className   += " hidden";
    clearNode(elements.dialog);
    elements.dialog.removeAttribute("data-tray-id");
  }

  function removeTrayItemFromNode(node){
    var item = goUntilParent(node, "trayItem");
    removeTrayItem(item.getAttribute("data-tray-id"));
  }

  function validateGroup(groupNode){
    var group = allItems[groupNode.getAttribute("data-mogid")];
    var min = +(group.min_child_select);
    var max = +(group.max_child_select);
    var checkBoxes = getElementsByClassName(groupNode, "optionCheckbox");
    var checked = 0;
    var errorNode = getChildWithClass(groupNode, "error");
    clearNode(errorNode);
    for(var j=0; j<checkBoxes.length; j++){
      if(checkBoxes[j].checked){
        checked++;
      }
    }
    if(checked<min){
      error = true;
      var errorText = "You must select at least "+min+" options";
      var error = document.createTextNode(errorText);
      errorNode.appendChild(error);
      return false;
    }
    if(max>0 && checked>max){
      error = true;
      var errorText = "You must select at most "+max+" options";
      var error = document.createTextNode(errorText);
      errorNode.appendChild(error);
      return false;
    }
    return true;
  }

  function validateCheckbox(node){
    var category = goUntilParent(node, "optionCategory");
    validateGroup(category);
  }

  function createItemFromDialog(){
    var id = elements.dialog.getAttribute("data-miid");
    var quantity = getElementsByClassName(elements.dialog, "itemQuantity")[0].value;
    if(quantity<1){
      quantity = 1;
    }

    var error = false;
    var categories = getElementsByClassName(elements.dialog, "optionCategory");
    for(var i=0; i<categories.length; i++){
      if(!validateGroup(categories[i])){
        error = true;
      }
    }

    if(error){
      return;
    }
    var options = [];
    var checkBoxes = getElementsByClassName(elements.dialog, "optionCheckbox");
    for(var i=0; i<checkBoxes.length; i++){
      if(checkBoxes[i].checked){
        var listItem = goUntilParent(checkBoxes[i], "option")
        var optionId = listItem.getAttribute("data-moid");
        var optionName = allItems[optionId].name;
        var optionPrice = allItems[optionId].price;
        var option = new Option(optionId, optionName, optionPrice)
        options.push(option);
      }
    }
    var itemName = allItems[id].name;
    var itemPrice = allItems[id].price;
    var trayItem =  new TrayItem(id, quantity, options, itemName, itemPrice);
    if(elements.dialog.hasAttribute("data-tray-id")){
      trayItem.trayItemId = +(elements.dialog.getAttribute("data-tray-id"));
    }
    return trayItem;
  }

  function addDialogItemToTray(){
    var trayItem = createItemFromDialog();
    addTrayItem(trayItem);
    hideDialogBox();
    if(!delivery){
      handleError({msg:"The restaurant will not deliver to this address at the chosen time"});
    }
  }

  function getElements(){
    switch(page ){
    case "menu":
      var menu          = document.getElementById("ordrinMenu");
      elements.menu     = menu;
      elements.dialog   = getElementsByClassName(menu, "optionsDialog")[0];
      elements.dialogBg = getElementsByClassName(menu, "dialogBg")[0];
      elements.errorDialog = getElementsByClassName(menu, "errorDialog")[0];
      elements.errorBg = getElementsByClassName(menu, "errorBg")[0];
      elements.tray     = getElementsByClassName(menu, "tray")[0];
      break;
    case "confirm":
      var confirm          = document.getElementById("ordrinConfirm");
      elements.menu     = confirm;
      elements.dialog   = getElementsByClassName(confirm, "optionsDialog")[0];
      elements.dialogBg = getElementsByClassName(confirm, "dialogBg")[0];
      elements.errorDialog = getElementsByClassName(confirm, "errorDialog")[0];
      elements.errorBg = getElementsByClassName(confirm, "errorBg")[0];
      elements.tray     = getElementsByClassName(confirm, "tray")[0];
      break;
    }
  }

  function handleError(error){
    console.log(error);
    if(typeof error === "object" && typeof error.msg !== "undefined"){
      showErrorDialog(error.msg);
    } else {
      showErrorDialog(JSON.stringify(error));
    }
  }

  function renderItemHtml(item){
    var html = Mustache.render(tomato.get("trayItemTemplate"), item);
    var div = document.createElement("div");
    div.innerHTML = html;
    return div.firstChild;
  }

  function addTrayItemNode(item){
    var newNode = renderItemHtml(item);
    var pageTrayItems = getElementsByClassName(elements.tray, "trayItem");
    for(var i=0; i<pageTrayItems.length; i++){
      if(+(pageTrayItems[i].getAttribute("data-tray-id"))===item.trayItemId){
        elements.tray.replaceChild(newNode, pageTrayItems[i]);
        return;
      }
    }
    elements.tray.appendChild(newNode);
  }

  function removeTrayItemNode(removed){
    var children = elements.tray.children;
    for(var i=0; i<children.length; i++){
      if(+(children[i].getAttribute("data-tray-id")) === removed.trayItemId){
        elements.tray.removeChild(children[i]);
        break;
      }
    }
  }

  function init(){
    if(!deliveryTimeExists()){
      setDeliveryTime("ASAP");
    }
    switch(page){
      case "menu": initMenuPage(); break;
      case "restaurants": initRestaurantsPage(); break;
      case "confirm": initConfirmPage(); break;
    }
    if(!emitter.listeners("mustard.error").length){
      emitter.on("mustard.error", handleError);
    }
    ordrin.mustard = {
      getRid : getRid,
      getMenu : getMenu,
      getAddress : getAddress,
      setAddress : setAddress,
      getDeliveryTime : getDeliveryTime,
      setDeliveryTime : setDeliveryTime,
      getTray : getTray,
      setTray : setTray,
      getTip : getTip,
      setRestaurant : setRestaurant
    };
    emitter.on("tray.add", addTrayItemNode);
    emitter.on("tray.remove", removeTrayItemNode);
    emitter.on("tray.*", updateFee);
    emitter.emit("moduleLoaded.mustard", ordrin.mustard);
  };
  
  init();
})(ordrin.tomato, ordrin.emitter, ordrin.api, ordrin.Mustache);
