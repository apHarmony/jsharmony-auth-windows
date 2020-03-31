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

var crypto = require('crypto');
var edge = require('edge-js');
var HelperFS = require('jsharmony/lib/HelperFS.js');

var AuthenticateUser = edge.func(function () {/*
  #r "System.DirectoryServices.dll"
 
  using System.DirectoryServices;

  async (dynamic input) => {
    string domain_controller = input.domain_controller;
    string userPrincipalName = input.userPrincipalName;
    string password = input.password;
    try
    {
      //DirectoryEntry has a 0-argument constructor, so we are allowing domain_controller to be null and crossing our fingers
      DirectoryEntry de = new DirectoryEntry(domain_controller, userPrincipalName, password);

      DirectorySearcher ds = new DirectorySearcher(de);
      ds.Filter = String.Format("(&(objectClass=user)(userPrincipalName={0}))", userPrincipalName);
      ds.PropertiesToLoad.Add("pwdLastSet");
      SearchResult sr = ds.FindOne();

      String attr = "pwdLastSet";

      if (sr.Properties[attr].Count > 0) {
        return (long)sr.Properties[attr][0];
      }

      return 0;
    }
    catch (System.DirectoryServices.DirectoryServicesCOMException)
    {
      return 0;
    }
  }
*/});

var ValidateUser = edge.func(function () {/*
  #r "System.DirectoryServices.dll"
 
  using System.DirectoryServices;

  async (dynamic input) => {
    string userPrincipalName = input.userPrincipalName;
    string domain_controller = input.domain_controller;
    string system_account_user_principal_name = input.system_account_user_principal_name;
    string system_account_password = input.system_account_password;
    DirectoryEntry de;
    if (domain_controller != null && system_account_user_principal_name != null && system_account_password != null) {
      de = new DirectoryEntry(domain_controller, system_account_user_principal_name, system_account_password);
    } else if (domain_controller != null) {
      de = new DirectoryEntry(domain_controller);
    } else {
      de = new DirectoryEntry();
    }

    DirectorySearcher ds = new DirectorySearcher(de);
    ds.Filter = String.Format("(&(objectClass=user)(userPrincipalName={0}))", userPrincipalName);
    ds.PropertiesToLoad.Add("pwdLastSet");
    SearchResult sr = ds.FindOne();

    if (sr == null) {
      return 0;
    }

    String attr = "pwdLastSet";

    if (sr.Properties[attr].Count > 0) {
      return (long)sr.Properties[attr][0];
    }

    return 0;
  }
*/});

var AuthWindows = function(){
  var auth_salt = HelperFS.staticSalt('static_login'); // FIXME
  var dummyTime = Date.now();
  // most methods are filled with database-backed defaults if not defined.
  return {
    salt: auth_salt,
    allow_insecure_http_logins: false,
    sql_auth: "auth_windows_main_sql_auth",
    sql_login: "auth_windows_main_sql_login",
    sql_superlogin: "auth_windows_main_sql_superlogin",
    sql_loginsuccess: "main_sql_loginsuccess",
    on_passwordreset: null,
    on_authenticate: function(req, jsh, user_info, cb){
      var config = jsh.Modules['jsHarmonyAuthWindows'].Config;
      if (config.debug_params.log_timing) console.time('authenticate');
      var xpassword = '';
      if ('password' in req.body) xpassword = req.body.password;
      var userPrincipalName = user_info['sys_user_windows_account'];
      AuthenticateUser({
        domain_controller: config.domain_controller,
        userPrincipalName: userPrincipalName,
        password: xpassword
      }, function (error, pwdLastSet) {
        if (config.debug_params.log_timing) if (config.debug_params.log_timing)console.timeEnd('authenticate');
        if (error) return cb(error);
        if (pwdLastSet != 0){
          var token = crypto.createHash('sha1').update(userPrincipalName + pwdLastSet + auth_salt).digest('hex');
          cb(null, token);
        } else {
          cb('Invalid windows auth');
        }
      });
    },
    on_validate: function(req, jsh, user_info, cb){
      var config = jsh.Modules['jsHarmonyAuthWindows'].Config;
      if (config.debug_params.log_timing) console.time('validate');
      var userPrincipalName = user_info['sys_user_windows_account'];
      ValidateUser({
        domain_controller: config.domain_controller,
        system_account_user_principal_name: config.system_account_user_principal_name,
        system_account_password: config.system_account_password,
        userPrincipalName: userPrincipalName
      }, function (error, pwdLastSet) {
        if (config.debug_params.log_timing) console.timeEnd('validate');
        if (error) return cb(error);
        var token = crypto.createHash('sha1').update(userPrincipalName + pwdLastSet + auth_salt).digest('hex');
        cb(null, token);
      });
    },
  };
};

exports = module.exports = AuthWindows;
