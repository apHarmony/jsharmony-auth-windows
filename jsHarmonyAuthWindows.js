/*
Copyright 2020 apHarmony

This file is part of jsHarmony.

jsHarmony is free software: you can redistribute it and/or modify
it under the terms of the GNU Lesser General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

jsHarmony is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Lesser General Public License for more details.

You should have received a copy of the GNU Lesser General Public License
along with this package.  If not, see <http://www.gnu.org/licenses/>.
*/

var _ = require('lodash');
var jsHarmonyModule = require('jsharmony/jsHarmonyModule');
var jsHarmonyAuthWindowsConfig = require('./jsHarmonyAuthWindowsConfig.js');
var AuthWindows = require('./lib/AuthWindows');
var funcs = require('./models/_funcs.js');

function jsHarmonyAuthWindows(name, options){
  options = _.extend({
    schema: 'jsharmony'
  }, options);

  var _this = this;
  jsHarmonyModule.call(this, name);
  _this.Config = new jsHarmonyAuthWindowsConfig();

  if(name) _this.name = name;
  _this.typename = 'jsHarmonyAuthWindows';

  _this.schema = options.schema;
  _this.funcs = new funcs(_this);
}

jsHarmonyAuthWindows.prototype = new jsHarmonyModule();

function getMainSite(jsh){
  if(jsh && jsh.Sites && jsh.Modules && jsh.Modules.jsHarmonyFactory){
    return jsh.Sites[jsh.Modules.jsHarmonyFactory.mainSiteID];
  }
  return undefined;
}

jsHarmonyAuthWindows.prototype.onModuleAdded = function(jsh){
  var _this = this;
  jsh.Config.onConfigLoaded.push(function(cb){
    var mainSite = getMainSite(_this.jsh);
    if(mainSite){
      if(!mainSite.private_apps) mainSite.private_apps = [];
      mainSite.private_apps.push({'/_funcs/jsHarmonyAuthWindows/USER_LISTING': _this.funcs.req_userListing});
    }
    return cb();
  });
};

jsHarmonyAuthWindows.prototype.Init = function(cb){
  var _this = this;
  var mainSite = getMainSite(_this.jsh);
  if (_this.Config.auto_bind_main_site_auth) {
    mainSite.Merge({
      auth: new AuthWindows(mainSite, _this.Config)
    });
  }
  if(cb) return cb();
};

module.exports = exports = jsHarmonyAuthWindows;