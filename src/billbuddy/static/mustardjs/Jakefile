var fs = require("fs");
var exec = require("child_process").exec;

task('templateLoader.js', function(){
  var Mustache;
  try{
    Mustache = require("./mustache/mustache.js");
  } catch(e) {
    function raiseError(error, stdout, stderr){
      console.log('stdout: ' + stdout);
      console.log('stderr: ' + stderr);
      if(error !== null){
        fail('error: ' + error);
      }
    }
    console.log("Downloading submodules");
    exec('git submodule update --init', raiseError);
    exec('git submodule update', raiseError);
    try{
      Mustache = require("./mustache/mustache.js");
    } catch(e) {
      fail("Could not load mustard; please update all submodules");
    }
  }
  var spaces = /\r?\n\s*/g;
  var data = {};
  var menu = fs.readFileSync("./templates/menu.html.mustache", "utf8");
  data.menu = menu.replace(spaces, "").replace(/"/g, "\\\"");
  var dialog = fs.readFileSync("./templates/dialog.html.mustache", "utf8");
  data.dialog = dialog.replace(spaces, "").replace(/"/g, "\\\"");
  var trayItem = fs.readFileSync("./templates/trayItem.html.mustache", "utf8");
  data.trayItem = trayItem.replace(spaces, "").replace(/"/g, "\\\"");
  var restaurants = fs.readFileSync("./templates/restaurants.html.mustache", "utf8");
  data.restaurants = restaurants.replace(spaces, "").replace(/"/g, "\\\"");
  var confirm = fs.readFileSync("./templates/confirm.html.mustache", "utf8");
  data.confirm = confirm.replace(spaces, "").replace(/"/g, "\\\"");
  data.mustache = fs.readFileSync("./mustache/mustache.js", "utf8");
  var input = fs.readFileSync("./script/templateLoader.js.mustache", "utf8");
  var output = Mustache.render(input, data).replace(/\r/g, "");
  fs.writeFileSync("./script/templateLoader.js", output, "utf8");
});

task('update-sub', function(submodule){
  function raiseError(error, stdout, stderr){
    console.log('stdout: ' + stdout);
    console.log('stderr: ' + stderr);
    if(error !== null){
      fail('error: ' + error);
    }
  }
  if(submodule){
    exec("git checkout master && git pull origin master", {cwd:"./"+submodule}, raiseError);
  } else {
    exec("git submodule foreach git checkout master", raiseError);
    exec("git submodule foreach git pull origin master", raiseError);
  }
});

task('revert-sub', function(submodule){
  submodule = submodule || "";
  exec("git submodule update "+submodule,
      function(error, stdout, stderr){
        if(error !== null){
          console.log('stdout: ' + stdout);
          console.log('stderr: ' + stderr);
          fail('error: ' + error);
        }
      });
});

task('mustard.js', ['templateLoader.js'], function(){
  var eventEmitter = fs.readFileSync("./eventEmitter/lib/eventemitter2.js");
  var tomato = fs.readFileSync("./tomato/tomato.js", "utf8");
  var api = fs.readFileSync("./api/api.js", "utf8");
  var templateLoader = fs.readFileSync("./script/templateLoader.js", "utf8");
  var mustard_base = fs.readFileSync("./script/mustard-base.js", "utf8");
  var output = (eventEmitter+tomato+api+templateLoader+mustard_base).replace(/\r/g, "");
  fs.writeFileSync("./script/mustard.js", output, "utf8");
});

task('mustard.min.js', ['mustard.js'], function(){
  var child = exec("uglifyjs --unsafe --lift-vars -o ./script/mustard.min.js  ./script/mustard.js",
                   function(error, stdout, stderr){
                     if(error !== null){
                       fail('error: ' + error);
                     }
                   });
});

task('main.min.css', function(){
  var child = exec("cleancss -o ./style/main.min.css ./style/main.css",
                   function(error, stdout, stderr){
                     if(error !== null){
                       fail('error: ' + error);
                     }
                   });
});

task('default', ['mustard.min.js', 'main.min.css'], function(){
  console.log("Finished building");
});
