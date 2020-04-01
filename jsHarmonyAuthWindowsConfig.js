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

  //Session token salt for main site
  this.mainsalt = '';   //REQUIRED: Use a 60+ mixed character string
  //Automatically overwrite the main site config to use windows auth
  this.auto_bind_main_site = true;
  //Domain controller address if required; "LDAP://servername"
  this.domain_controller = null;
  //If login is required to read, An account that can login to the ldap server and read pwdLastSet and userAccountControl, e.g. ldap@your.domain
  this.system_account_user_principal_name = null;
  //Password for above account
  this.system_account_password = null;
  //Cache session verification with the ldap server (e.g., account has not been disabled or had it's password changed). With no cache, verification will be done per-request (e.g. each js/css/image to render a page)
  this.cache_authentication_seconds = 60;

  this.debug_params = {
    log_auth_timing: false, //Record time to contact ldap server to log/console
  };
}

jsHarmonyAuthWindowsConfig.prototype = new jsHarmonyConfig.Base();

jsHarmonyAuthWindowsConfig.prototype.Init = function(cb, jsh){
  if(cb) return cb();
}

exports = module.exports = jsHarmonyAuthWindowsConfig;