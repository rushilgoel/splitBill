# Deliveratorjs - a server for Mustard powered food ordering websites

Deliveratorjs is a node.js module for easily inserting [Mustard](https://github.com/ordrin/ordrin-client) powered menus into web pages.

## Installation
Install from npm with

```sh
npm install deliveratorjs
```

## Quick Start

Deliverator requires [node.js](http://nodejs.org/#download), express (`npm install -g express`), and [git](http://git-scm.com/downloads).

You can create a basic express server using deliverator with these five simple steps:

1. Create an express server with deliverator in the folder you want to use with

    ```bash
    express myOrdrinApp
    cd myOrdrinApp
    npm install
    npm install deliveratorjs
    ```
     
2. Copy the contents of `node-modules/deliveratorjs/example` into `views`
3. In `app.js`, below the module dependencies, add the lines:
   
   ```js
   var options = {
     "apiKey" : "your API Key",
     "servers" : "test"
   }
   var deliverator = require("deliveratorjs")(options);
   ```

4. In `app.js`, add the following to the middlewares above `app.router`:

    ```js
    app.use(deliverator.html.addHtml);
    app.use(deliverator.injector);
    ```
    
5. In `app.js`, add the following lines after `app.get('/', routes.index);`:

    ```js
    app.get('/search', deliverator.html.getDefaultRestaurantListMiddleware("search", "/menu"));
    app.get('/menu/:rid', deliverator.html.getDefaultMenuMiddleware("menu"));
    ```
    
The index page of this server should have a form to search for restaurants near an address. If you fill in the form with a location we support, you will get a list of restaurats that will deliver to you and if you click on a restaurant's name you will get the menu for that restaurant.

## Usage
### Initialization

Deliverator takes the same initialization arguments as the [node Ordr.in wrapper](https://github.com/ordrin/api-node#initialization), with the additional argument `path`, which is a url path that deliverator will use that will not conflict with anything else and defaults to `"/ordrin"`. For example,

```js
var options = {
  apiKey = "YOUR-ORDRIN-API-KEY",
  restaurantUrl: "r.ordr.in",
  userUrl: "u.ordr.in",
  orderUrl: "o.ordr.in",
  path: "/deliverator"
};
var deliverator = require("deliveratorjs")(options);
```

### Rendering

The main purpose of Deliverator is to render pages as necessary to use them with Mustard. This includes properly linking to Mustard JavaScript and CSS and rendering pages server side. This rendering can be done at various levels of granularity, and uses external templates that can be edited. These functions are all members of `deliverator.html`.

#### Page Pieces

The most granular method of creating Deliverator pages is the functions to render chunks of pages to strings of HTML.

##### Head Data

Several functions render stuff that goes in the `<head>` tag. All of these include a `<link>` tag to load the Mustard CSS file and JavaScript code to load the Mustard JavaScript file. They also include JavaScript code to put data into the `ordrin` global variable, which Mustard uses for rendering and functionality.

###### Restaurant Head

```js
getSimpleRestaurantsHead(address, menuUri, dateTime)
getRestaurantsHead(address, menuUri, dateTime, render, data)
```

The first function puts into `ordrin` the data needed to request and render the list of restaurants. This should be used if you want Mustard to request the restaurant array and render it to the page client side.

The second sets that data and also inserts the array of restaurant data. This should be used if you want to do the data request and possibly render the page on the server before returning the response.

**Arguments**:

 - `address`: The address for food to be delivered to. SHould be an instance of [`ordrinAPI.address`](https://github.com/ordrin/api-node#data-structures) or equivalent.
 - `menuUri`: The base url for menu requests. Mustard assumes that requests to `menuUri/rid` will get responses with restaurant menus.
 - `dateTime`: The date and time of when the food should be delivered. Should be `"ASAP"` or a string of the form `MM-dd+HH:mm`.
 - `render`: A boolean that determines whether Mustard will render the restaurant list HTML client side. Should be true if the server will not render that HTML in the response.
 - `data`: An object containing a `restaurant` key mapping to an array of restaurant objects, as the [Delivery List API Call](http://ordr.in/docs/restaurant) returns.

###### Menu Head

```js
getSimpleHead(rid, address, dateTime)
getHead(rid, data, address, render, dateTime)
```

The first function puts into `ordrin` the data needed to request and render the menu. This should be used if you want Mustard to request the menu data and render the menu to the page client side.

The second sets that data and also inserts the menu data. This should be used if you want to do the data request and possibly render the page on the server before returning the response.

**Arguments:**

 - `rid`: The restaurant ID
 - `address`: The address for food to be delivered to. Should be an instance of [`ordrinAPI.address`](https://github.com/ordrin/api-node#data-structures) or equivalent.
 - `dateTime`: The date and time of when the food should be delivered. Should be `"ASAP"` or a string of the form `MM-dd+HH:mm`.
 - `data`: An object containing a `menu` key mapping to a menu array, as the [Restaurant Details API Call](http://ordr.in/docs/restaurant) returns.
 - `render`: A boolean that determines whether Mustard will render the menu HTML client side. Should be true if the server will not render that HTML in the response.

##### Rendered HTML

These functions return HTML that belongs in the body of their corresponding pages.

```js
getRestaurants(data)
getMenu(data)
```

**Keys for data in getRestaurants:**

 - `restaurants`: An array of restaurant objects as returned by the [Delivery List API Call](http://ordr.in/docs/restaurant).

In addition, each restaurant object should have a params key containing an object with the following keys:

 - `menu_uri`: The base url for menu requests. Mustard assumes that requests to `menuUri/rid` will get responses with restaurant menus.
 - `dateTime`: The date and time of when the food should be delivered. Should be `"ASAP"` or a string of the form `MM-dd+HH:mm`.
 - `addr`: The street address for delivery
 - `addr2`: The second line of the street address (optional)
 - `city`: The city for delivery
 - `state`: The state for delivery
 - `zip`: The zip code for delivery
 - `phone`: The phone number for delivery.
 
**Keys for data in getMenu:**

 - `menu`: A menu data array as returned in the [Restaurant Details API Call](http://ordr.in/docs/restaurant).
 - `address`: The address for food to be delivered to. Should be an instance of [`ordrinAPI.address`](https://github.com/ordrin/api-node#data-structures) or equivalent.
 - `deliveryTime`:  The date and time of when the food should be delivered. Should be `"ASAP"` or a string of the form `MM-dd+HH:mm`.

#### Whole Pages

A less granular method of creating Deliverator pages is a set of functions that send responses containing complete rendered pages.

##### Restaurant List Pages

```js
renderRestaurantsSimple(res, template, extra, address, menuUri, dateTime)
renderRestaurants(res, template, extra, address, menuUri, dateTime, renderList)
```

The first renders the page to pass as little data as possible into the response, so the client will have to request the restaurant data list and render the HTML.

The second renders the page with the data and possibly the rendered HTML, so the page will display quickly and the client will do as little work as possible to display the page.

**Arguments:**

 - `res`: The response variable that would be passed to an express middleware.
 - `template`: The name of a template to render into. This template should render the key `head` into the `<head>` tag and the key `restaurants` into a tag with the id `ordrinRestaurants`, if `restaurants` exists (`renderRestaurantsSimple` will not have that key).
 - `extra`: An object containing any extra data that should be rendered into the template.
 - `address`: The address for food to be delivered to. SHould be an instance of [`ordrinAPI.address`](https://github.com/ordrin/api-node#data-structures) or equivalent.
 - `menuUri`: The base url for menu requests. Mustard assumes that requests to `menuUri/rid` will get responses with restaurant menus.
 - `dateTime`: The date and time of when the food should be delivered. Should be `"ASAP"` or a string of the form `MM-dd+HH:mm`.
 - `renderList`: a boolean that determines whether Mustard or Deliverator will render the restaurant list. Deliverator will render it if `renderList` is truthy.

##### Menu Pages

```js
renderSimple(res, rid, template, extra, address, dateTime)
render(res, rid, template, extra, renderMenu, address, dateTime)
```

The first renders the page to pass as little data as possible into the response, so the client will have to request the restaurant data list and render the HTML.

The second renders the page with the data and possibly the rendered HTML, so the page will display quickly and the client will do as little work as possible to display the page.

**Arguments:**
 - `res`: The response variable that would be passed to an express middleware.
 - `rid`: The restaurant ID
 - `template`: The name of a template to render into. This template should render the key `head` into the `<head>` tag and the key `menu` into a tag with the id `ordrinMenu`, if `menu` exists (`renderSimple` will not have that key).
 - `extra`: An object containing any extra data that should be rendered into the template.
 - `address`: The address for food to be delivered to. SHould be an instance of [`ordrinAPI.address`](https://github.com/ordrin/api-node#data-structures) or equivalent.
 - `dateTime`: The date and time of when the food should be delivered. Should be `"ASAP"` or a string of the form `MM-dd+HH:mm`.
 - `renderMneu`: a boolean that determines whether Mustard or Deliverator will render the menu. Deliverator will render it if `renderMenu` is truthy.

#### Routes

```js
getDefaultRestaurantListMiddleware(template, menuUri, render_server, extra)
getDefaultMenuMiddleware(template, render_server, extra)
```

These return default route specific middlewares for restaurant lists and menus, respectively. They assume that menus can be requested at `menuUri/rid`, and both take the following query string parameters:

 - `dateTime`: The date and time of when the food should be delivered. Should be `"ASAP"` or a string of the form `MM-dd+HH:mm`.
 - `addr`: The street address for delivery
 - `addr2`: The second line of the street address (optional)
 - `city`: The city for delivery
 - `state`: The state for delivery
 - `zip`: The zip code for delivery
 - `phone`: The phone number for delivery.
 
**Arguments:**

 - `template`: The name of a template to render into, with the same requirements as in [restaurant list pages](#restaurant-list-pages) for the first function and [menu pages](#menu-pages) for the second.
 - `render_server`: Renders the entire page and requests the API data on the server if truthy, and all on the client otherwise.
 - `extra`: An object containing any extra data that should be rendered into the template.
 - `menuUri`: The base url for menu requests. Mustard assumes that requests to `menuUri/rid` will get responses with restaurant menus.

### Middlewares

#### Injector

The injector middleware serves auxillary Deliverator requests made to URIs starting with `path` as set when initializing. It will act as a proxy to the [Ordr.in API](http://ordr.in/developers/api) by forwarding any request that starts with `/path/api`. For any other path starting with `/path`, it will try to serve the corresponding file in `node_modules/mustard`.

You can use it in the app simply by calling

```js
app.use(deliverator.injector);
```

#### Use rendering object

The rendering object adder simply adds a reference to the rendering object to the request so that any middleware after it has a convenient reference to it.

You can use it in the app simply by calling

```js
app.use(deliverator.html.addHtml);
```