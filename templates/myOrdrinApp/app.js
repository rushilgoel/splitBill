
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , user = require('./routes/user')
  , http = require('http')
  , path = require('path');

var options = {
 "apiKey" : "WoUgWjr9pBrJVAZdtQLIUi2nXvXEujWegL4PnGZ717M",
 "servers" : "test",
  restaurantUrl: "r.ordr.in",
  userUrl: "u.ordr.in",
  orderUrl: "o.ordr.in",
  //path: "/deliverator",
}
var deliverator = require("deliveratorjs")(options);

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(deliverator.html.addHtml);
  app.use(deliverator.injector);
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/search', deliverator.html.getDefaultRestaurantListMiddleware("search", "/menu"));
app.get('/menu/:rid', deliverator.html.getDefaultMenuMiddleware("menu"));
app.get('/users', user.list);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
