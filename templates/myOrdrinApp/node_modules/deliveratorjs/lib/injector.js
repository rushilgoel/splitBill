(function(){
  "use strict";

  var fs = require('fs');
  var mime = require("mime");
  
  function injector(path, ordrinApi){
    var apiRegex = new RegExp("^"+path+"/api(/[^?]+)");
    var fileRegex = new RegExp("^"+path+"/([^?]+)");

    var realInjector = function(req, res, next){
      var match = apiRegex.exec(req.path);
      if(match){
        var callback = function(err, data){
          res.setHeader('Content-Type', 'application/json');
          if(err){
            res.send(err)
          } else {
            res.send(data);
          }
        }
        switch(match[1].replace(/^\//, '').split('/')[0]){
        case "o" : ordrinApi.order.makeOrderRequest(match[1], [], req.body, req.method, callback); break;
        default: ordrinApi.restaurant.makeRestaurantRequest(match[1], [], {}, req.method, callback);
        }
      } else {
        var fileMatch = fileRegex.exec(req.path);
        if(fileMatch){
          path = __dirname + "/../node_modules/mustard/"+fileMatch[1];
          fs.readFile(path, "utf8", function(err, data){
            if(err){
              next(err);
            } else {
              var type = mime.lookup(req.path);
              var charset = mime.charsets.lookup(type);
              res.setHeader('Content-Type', type+(charset?';chrarset='+charset:''));
              res.send(data);
            }
          });
        } else {
          next();
        }
      }
    }
    return realInjector;
  };

  module.exports = injector;
})();
