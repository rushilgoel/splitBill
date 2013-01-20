(function(){
  "use strict";

  var ordrin = require("ordrin-api");
  
  function deliverator(options){
    var path = typeof options.path === "undefined" ? "/ordrin" : options.path;
    var Html = require("./lib/html.js");
    var injector = require("./lib/injector.js");
    var ordrinApi = ordrin.init(options);
    return {html: new Html(path, ordrinApi),
            injector : injector(path, ordrinApi)};
  }
  module.exports = deliverator;
})();
