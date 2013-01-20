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
    return tomato.get("tip");
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
