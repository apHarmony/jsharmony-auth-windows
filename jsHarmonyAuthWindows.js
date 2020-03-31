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

var jsHarmonyModule = require('jsharmony/jsHarmonyModule');
var jsHarmonyFactory = require('jsharmony-factory');
var jsHarmonyAuthWindowsConfig = require('./jsHarmonyAuthWindowsConfig.js');
var AuthWindows = require('./lib/AuthWindows');

function jsHarmonyAuthWindows(name, options){
  options = options || {};
  options.schema = options.schema || 'jsharmony';

  var _this = this;
  jsHarmonyModule.call(this, name);
  _this.Config = new jsHarmonyAuthWindowsConfig();

  if(name) _this.name = name;
  _this.typename = 'jsHarmonyAuthWindows';

  _this.schema = options.schema;
}

jsHarmonyAuthWindows.prototype = new jsHarmonyModule()

jsHarmonyAuthWindows.prototype.onModuleAdded = function(jsh){
  var _this = this;
}

jsHarmonyAuthWindows.prototype.Init = function(cb){
  var _this = this;
  if (_this.Config.auto_bind_main_site) {
    _this.jsh.Sites[_this.jsh.Modules.jsHarmonyFactory.mainSiteID].Merge({
      auth: new AuthWindows(),
    });
  }
  if(cb) return cb();
}

module.exports = exports = jsHarmonyAuthWindows;