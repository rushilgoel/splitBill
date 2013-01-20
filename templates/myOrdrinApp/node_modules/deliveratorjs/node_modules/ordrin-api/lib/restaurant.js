(function(){
  "use strict";
  var toolsLib = require("./tools.js");

  exports.Restaurant = function(globals){
    var tools    = new toolsLib.Tools(globals);


    this.getDeliveryList = function(dateTime, address, callback){
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

    this.getDeliveryCheck = function(restaurantId, dateTime, address, callback){
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

    this.getFee = function(restaurantId, subtotal, tip, dateTime, address, callback){
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

    this.getDetails = function(restaurantId, callback){
      this.makeRestaurantRequest("/rd", [restaurantId], {}, "GET", callback);
    }

    /*
     * function to make all restaurant api requests
     * uri is the base uri so something like /dl, include the /
     * params are all parameters that go in the url. Note that this is different than the data
     * data is the data that goes either after the ? in a get request, or in the post body
     * method is either GET or POST (case-sensitive)
     */

    this.makeRestaurantRequest = function(uri, params, data, method, callback){
      var uriString = tools.buildUriString(uri, params);
      
      tools.makeApiRequest(globals.restaurantUrl, uriString, method, data, {}, callback);
    }

    this.parseDateTime = function(dateTime, callback){
      var delivery = tools.parseDateTime(dateTime);
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
  }
}());
