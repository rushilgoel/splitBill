(function(){
  "use strict";
  var url         = require("url"),
      http        = require("http"),
      https       = require("https"),
      crypto      = require("crypto"),
      querystring = require("querystring");


  exports.Tools = function(globals){

    /*
     * Base function to make a request to the ordr.in api
     * host is the base uri, somehting like r-test.ordr.in
     * uri is a full uri string, so everthing after ordr.in
     * method is either GET or POST
     * data is any additional data to be included in the request body or query string
     * headers are additional headers beyond the X-NAAMA-Authentication
     */
    this.makeApiRequest = function(host, uri, method, reqData, headers, callback){
      var parsedHost = url.parse(host),
          requestOptions, transport;

      headers["X-NAAMA-CLIENT-AUTHENTICATION"] = "id=\"" + globals.apiKey + "\", version=\"1\"";
      reqData = querystring.stringify(reqData);

      if (method !== "GET"){
        headers["Content-Type"]   = 'application/x-www-form-urlencoded';
        headers["Content-Length"] = reqData.length;
      } else if (reqData.length !== 0){
        uri += "?" + reqData;
      }

      if( parsedHost.hasOwnProperty('protocol') ) {
        requestOptions = {
          host: parsedHost.hostname,
          port: parsedHost.port,
          path: uri,
          method: method,
          headers: headers
        };
        transport = parsedHost.protocol === 'http:' ? http : https;

      } else { 
        requestOptions = {
          host: host,
          port: 443,
          path: uri,
          method: method,
          headers: headers
        };
        transport = https;
      }

      var req = transport.request(requestOptions, function(res){
        var data = "";
        res.on("data", function(chunk){
          data += chunk;
        });
        res.on("end", function(){
          if (data === "Unauthorized"){
            return callback({
              error: 401,
              msg: "That user account doesn't exist, or you attempted to create an account that already exists"
            });
          }
          try{
            data = JSON.parse(data);
          }catch(e){
            return callback({
              error: 500,
              msg: "Bad response from server. Check response data"
            }, data);
          }
          if (data.hasOwnProperty('_err') && (data._err === 1)){
            return callback(data);
          } else if (res.statusCode === 404){ // node doesn't consider a 404 an error, but we need to call the callback with an error object
            return callback({error: 404, msg: "Not Found."});
          }
          if (globals.debug){
            return callback(false, data, {
              host: host,
              uri: uri,
              method: method,
              data: reqData,
              headers: headers
            });
          }
          return callback(false, data);
        });
      });
      if (method !== "GET"){
        req.write(reqData);
      }
      req.end();

      req.on("error", function(error){
        return callback(error); // for now just pass node's error through
      });
    };

    /*
     * Function to handle all authenticated requests
     * all params are the same as the makeApiRequest function except:
     * user: the user's email address
     * pass: a SHA256 hash of the users password
     */

    this.makeAuthenticatedApiRequest = function(host, uri, method, data, headers, user, pass, callback){
      var hash = crypto.createHash("SHA256");
      hash     = hash.update(pass + user + uri).digest("hex");

      headers["X-NAAMA-AUTHENTICATION"] = "username=\"" + user + "\", response=\"" + hash + "\", version=\"1\"";
      this.makeApiRequest(host, uri, method, data, headers, callback);
    };

    this.buildUriString = function(baseUri, params){
      for (var i = 0; i < params.length; i++){
        baseUri += "/" + encodeURIComponent(params[i]);
      }
      return baseUri;
    };

    this.parseDateTime = function(dateTime){
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
      }
      return {date:date, time:time, error:false};
    }
  };
}());
