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

var jsHarmonyConfig = require('jsharmony/jsHarmonyConfig');
var path = require('path');

function jsHarmonyAuthWindowsConfig(){
  //jsHarmony Auth Windows module path
  this.moduledir = path.dirname(module.filename);

  this.auto_bind_main_site = true;
  this.domain_controller = null;
  this.system_account_user_principal_name = null;
  this.system_account_password = null;
  this.cache_authentication_seconds = 60;

  this.debug_params = {
    log_auth_timing: false,
  };
}

jsHarmonyAuthWindowsConfig.prototype = new jsHarmonyConfig.Base();

jsHarmonyAuthWindowsConfig.prototype.Init = function(cb, jsh){
  if(cb) return cb();
}

exports = module.exports = jsHarmonyAuthWindowsConfig;