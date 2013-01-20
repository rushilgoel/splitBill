# Mustard - client side food ordering

Mustard is a library that makes it easy to add Ordr.in powered food ordering to any website. This currently involves displaying a list of restaurants, an interactive menu, and a confirmation page.

## Installation

Mustard currently must be served by a server that proxies the [Ordr.in API](http://ordr.in/developers/api) or can make requests to the API and insert the result into the page. Currently, we provide the node module [deliveratorjs](https://github.com/ordrin/deliveratorjs), which provides this and other functionality.

## Quick start

The minimal page that will serve an menu is the following (assuming that `mustard.js` is in `/ordrin/script` and `main.css` is in `/ordrin/style`):

```html
<!Doctype html>
<html>
  <head>
    <link href="/ordrin/style/main.css" rel="stylesheet" type="text/css">
    <!--[if lt IE 9]><script src="http://html5shim.googlecode.com/svn/trunk/html5.js"></script><![endif]-->
    <script>
      var ordrin = typeof ordrin==="undefined"?{}:ordrin;
      var ordrin = typeof ordrin==="undefined"?{}:ordrin;
      ordrin.init.rid = 141; // the restaurant's ordr.in ID
      ordrin.init.page = "menu";
      ordrin.init.render = true;
      ordrin.restaurantUrl = ordrin.orderUrl = location.origin+"path/to/api/proxy";
      (function(){
        var ow = document.createElement('script'); ow.type = 'text/javascript'; ow.async = true;
        ow.src = '/ordrin/script/mustard.js';
        var s = document.getElementsByTagName('script')[0];
        s.parentNode.insertBefore(ow, s);  
      })();
    </script>
  </head>
  <body>
    <div id="ordrinMenu"></div>
  </body>
</html>
```

A few things to note about the page:

1. We only support loading Mustard asynchronously.
2. Currently, all parameters must be passed to Mustard by assigning to keys in the `ordrin` javascript object.
3. For Mustard to function, the menu HTML must be in a `<div>` with the id `ordrinMenu`. If Mustard is rendering the menu, as in this example, the `<div>` should be empty as its contents will be overwritten.

### No Proxy

If you want to make this quick start page but don't have a server that proxies the Ordr.in API, you can still render the page by adding only a couple of lines of code to the script tag in the quick start page. After the line that sets the `ordrin` variable, the following two lines should be added:

```js
ordrin.init.noProxy = true;
ordrin.init.menu = {{{data}}};
```

Fill in `{{{data}}}` by making a request to the restaurant details function of the [Restaurant API](http://ordr.in/developers/restaurant) and replacing `{{{data}}}` with the value of the `menu` key in the repsonse to that API call.

In this case, the `restaurantUrl` and `orderUrl` variables are not needed and will not have any effect, so the line setting them is not required.

### Resources

Mustard includes the [JavaScript Ordr.in API wrapper](https://github.com/ordrin/api-js), [tomato](https://github.com/ordrin/tomato) (our persistence library), [Mustache](https://github.com/janl/mustache.js) (in `ordrin.Mustache`) and [EventEmitter2](https://github.com/hij1nx/EventEmitter2).

Once Mustard initializes its instance of EventEmitter2, it will call `ordrin.emitterLoaded` with that instance and then delete `ordrin.emitterLoaded`.

### Interface

This is a summary of the interface to Mustard. More detail can be found in the next section

#### Initialization
Mustard may use the following values if they are set in `ordrin.init` *before* Mustard loads:

 - [`address`](#delivery-address)
 - [`deliveryTime`](#delivery-datetime)
 - [`page`](#page)
 - [`render`](#render)
 - [`noProxy`](#no-proxy-1)
 - [`restaurantsTemplate`](#restaurant-list-template)
 - [`menu_uri`](#menu-uri-root)
 - [`rid`](#restaurant-id)
 - [`menu`](#menu)
 - [`menuTemplate`](#menu-template)
 - [`dialogTemplate`](#dialog-template)
 - [`trayItemTemplate`](#tray-item-template)
 - [`tray`](#tray)
 - [`tip`](#tip)

#### Mustard interface
After Mustard has loaded, it will emit an event `moduleLoaded.mustard` with a reference to `ordrin.mustard`, which will have the following functions:

 - [`getRid()`](#restaurant-id)
 - [`getMenu()`](#menu)
 - [`getAddress()`](#delivery-address)
 - [`setAddress(address)`](#delivery-address)
 - [`getDeliveryTime()`](#delivery-datetime)
 - [`setDeliveryTime(deliveryTime)`](#delivery-datetime)
 - [`getTray()`](#tray)
 - [`setTray(tray)`](#tray)
 - [`getTip()`](#tip)
 - [`setRestaurant(rid, [menu])`](#menu)

### The Pages

Mustard can render three pages: a list of restaurants, a menu, and a confirmation page.

Both pages currently use the following values. Many can be initialized in `ordrin.init`, and some can be accessed through `ordrin.mustard`

#### Delivery address
The address that food should be delivered to. This should be an instance of `ordrin.api.Address`

Direct: `ordrin.init.address`

Accessors: `ordrin.mustard.getAddress()`, `ordrin.mustard.setAddress()` 

#### Delivery date/time
The time at which the food should be delivered. This should be either the string `ASAP`, a string of the form `MM-dd+HH:mm`, or a `Date` object in the future.

Init: `ordrin.init.deliveryTime`

Accessors: `ordrin.mustard.getDeliveryTime()`, `ordrin.mustard.setDeliveryTime()`

#### Page
Tells Mustard what to do with when the page loads. The value should be `"menu"` to process the menu or `"restaurants"` to process the restaurant list.

Init: `ordrin.init.page`

#### Render
Tells Mustard whether it should create the HTML and put it in the page, or use what is already there.

Init: `ordrin.init.render`

#### No Proxy
Mustard will not make any API requests if this value is truthy.

Init: `ordrin.init.noProxy`

### Restaurant List

Mustard will render a restaurant list into  a `<div>` with the id `ordrinRestaurants` when it loads if `page` is set to `restaurants`. After Mustard has loaded, a new restaurant list can be rendered into the same `<div>` by calling `ordrin.mustard.setAddress()` or `ordrin.mustard.setDeliveryTime()`

#### Menu
A menu in the same structure as the value of the `menu` key in the return value of the [Restaurant API](http://ordr.in/developers/restaurant) details function. If this is not provided before Mustard loads, Mustard will attempt to download it from the API using the restaurant ID.

Direct: `ordrin.init.menu`

Accessors: `ordrin.mustard.getMenu()`

#### Tray
A tray of items. An instance of `Tray`.

Init: `ordrin.init.tray`

Accessor: `ordrin.mustard.getTray()`, `ordrin.mustard.setTray()`

#### Tip
The tip as an integer number of cents.

Direct: `ordrin.init.tip`

Accessor: `ordrin.mustard.getTip()`

This page also uses the following values:

#### Restaurant List
The list of restuarant objects in the same form as the return value of the delivery list request in the [Restaurant API](http://ordr.in/developers/restaurant). If this is not provided before Mustard loads, Mustard will attempt to download it from the API using the `address` and `dateTime`.

#### Restaurant List Template
A string containing a [Mustache](https://github.com/janl/mustache.js) template for rendering the list of restaurants. The default is at `templates/restaurants.html.mustache`

Init: `ordrin.init.restaurantsTemplate`

#### Menu URI root
Init: `ordrin.init.menu_uri`

### Menu

Mustard will render a menu into a `<div>` with the id `ordrinMenu` when if loads if `page` is set to `"menu"`. After Mustard has loaded, a new menu can be loaded into he same `<div>` by calling `ordrin.mustard.setRestaurant()`

This page also uses the following values:

#### Restaurant ID
Ordr.in's ID number for the restaurant

Init: `ordrin.init.rid`

Accessors: `ordrin.mustard.getRid()`

#### Menu Template
A string containing a [Mustache](https://github.com/janl/mustache.js) template for rendering the menu. The default is at `templates/menu.html.mustache`.

Init: `ordrin.init.menuTemplate`

#### Dialog Template
A string containing a [Mustache](https://github.com/janl/mustache.js) template for rendering the dialog box for selecting item options and quantity. The default is at `templates/dialog.html.mustache`.

Init: `ordrin.init.dialogTemplate`

#### Tray Item Template
A string containing a [Mustache](https://github.com/janl/mustache.js) template for rendering an item in the tray. The default is at `templates/trayItem.html.mustache`.

Init: `ordrin.init.trayItemTemplate`

### Confirm

Mustard will render a confirmation page into a `<div>` with teh id `ordrinConfirm` when it loads if `"confirm"`.

This page also uses the following values:

#### Confirm Template
A string containing a [Mustache](https://github.com/janl/mustache.js) template for rendering the confirmation page. The default is at `templates/confirm.html.mustache`.

Init: `ordrin.init.confirmTemplate`