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

  //Automatically overwrite the main site config to use windows auth
  this.auto_bind_main_site_auth = true;
  //Domain controller address if required; "LDAP://servername"
  this.domain_controller = null;
  //If login is required to read, An account that can login to the ldap server and read pwdLastSet and userAccountControl, e.g. ldap@your.domain
  this.system_account_user_principal_name = null;
  //Password for above account
  this.system_account_password = null;
  //LDAP query to find a user by their sys_user_windows_account name

  this.authentication_filter = '(&(objectClass=user)({{userPrincipalName}}={{windows_account}}))'; // username@your.domain
  // On first authentication, {{userPrincipalName}} will be replaced with "userPrincipalName"
  // On failed authentication, {{userPrincipalName}} will be replaced with "sAMAccountName" (for alternative validation)

  // If requiring the user to be a member of a group:
  // this.authentication_filter = "(&(objectClass=user)({{userPrincipalName}}={{windows_account}})(memberof:1.2.840.113556.1.4.1941:=CN=jsHarmony Users,OU=Department,DC=YOUR,DC=DOMAIN))" // username@your.domain, member of group

  //LDAP query to find all applicable users - used ONLY in account management to list accounts, not during authentication.
  this.all_users_filter = '(&(objectcategory=person)(objectClass=user))';

  //Cache session verification with the ldap server (e.g., account has not been disabled or had it's password changed). With no cache, verification will be done per-request (e.g. each js/css/image to render a page)
  this.authentication_cache_expiration = 60;

  this.debug_params = {
    log_auth_timing: false, //Record time to contact ldap server to log/console
  };

  // Future //
  //Expire session if the user has not accessed the system in this many seconds
  //this.idle_session_timeout = 24 * 60 * 60; // seconds (ex: 24 hours)
  //Expire session if it has been at least this many seconds since the last full login
  // e.g. they used it every day but have not provided a password in a long time.
  //this.maximum_session_duration = 90 * 24 * 60 * 60; // seconds (ex: 90 days)
}

jsHarmonyAuthWindowsConfig.prototype = new jsHarmonyConfig.Base();

jsHarmonyAuthWindowsConfig.prototype.Init = function(cb, jsh){
  if(cb) return cb();
};

exports = module.exports = jsHarmonyAuthWindowsConfig;