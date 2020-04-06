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
var crypto = require('crypto');
var edge = require('edge-js');

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
      // we don't need to check disabled - login will fail if the account is disabled.
      SearchResult sr = ds.FindOne();

      if(sr == null){
        //Try sAMAccountName is userPrincipalName not found
        ds.Filter = String.Format("(&(objectClass=user)(sAMAccountName={0}))", userPrincipalName);
        sr = ds.FindOne();
      }

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
    ds.PropertiesToLoad.Add("userAccountControl");
    SearchResult sr = ds.FindOne();

    if (sr == null) {
      return 0;
    }

    const int ACCOUNTDISABLE = 0x0002;

    if (sr.Properties["userAccountControl"].Count > 0 && ((int)sr.Properties["userAccountControl"][0] & ACCOUNTDISABLE) == ACCOUNTDISABLE) {
      return 0;
    }

    if (sr.Properties["pwdLastSet"].Count > 0) {
      return (long)sr.Properties["pwdLastSet"][0];
    }

    return 0;
  }
*/});

var VerifyConfig = function(config){
  function verify_config(x, _caption) { if (!x || (_.isObject(x) && _.isEmpty(x))) { console.log('*** Missing app.config.js setting: ' + _caption); return false; } return true; }
  var good_config = true;
  var required_fields = [];
  _.each(required_fields, function (val) { good_config &= verify_config(config[val], "config.modules['jsHarmonyAuthWindows']." + val); });
  if (!good_config) { console.log('\r\n*** Invalid config, could not start server ***\r\n'); process.exit(1); }
}

var AuthWindows = function(jshsite, config){
  VerifyConfig(config);
  var cache = {};

  var authenticate = function(req, jsh, user_info, password, cb){
    if (config.debug_params.log_auth_timing) console.time('authenticate');
    var userPrincipalName = user_info['sys_user_windows_account'];
    AuthenticateUser({
      domain_controller: config.domain_controller,
      userPrincipalName: userPrincipalName,
      password: password
    }, function (error, pwdLastSet) {
      if (config.debug_params.log_auth_timing) console.timeEnd('authenticate');
      if (error) return cb(error);
      if (pwdLastSet != 0){
        var token = crypto.createHash('sha1').update(userPrincipalName + pwdLastSet + jshsite.auth.salt).digest('hex');
        cache[userPrincipalName] = {
          timeStamp: Date.now(),
          token: token,
        };
        cb(null, token);
      } else {
        delete cache[userPrincipalName];
        cb('Invalid Username or Password');
      }
    });
  }

  var getTrustedToken = function(req, jsh, user_info, cb){
    var userPrincipalName = user_info['sys_user_windows_account'];
    if (config.cache_authentication_seconds
     && cache[userPrincipalName]
     && Date.now() - cache[userPrincipalName].timeStamp < config.cache_authentication_seconds*1000) {
      return cb(null, cache[userPrincipalName].token);
    }
    if (config.debug_params.log_auth_timing) console.time('getTrustedToken');
    ValidateUser({
      domain_controller: config.domain_controller,
      system_account_user_principal_name: config.system_account_user_principal_name,
      system_account_password: config.system_account_password,
      userPrincipalName: userPrincipalName
    }, function (error, pwdLastSet) {
      if (config.debug_params.log_auth_timing) console.timeEnd('getTrustedToken');
      if (error) return cb(error);
      if (pwdLastSet != 0){
        var token = crypto.createHash('sha1').update(userPrincipalName + pwdLastSet + jshsite.auth.salt).digest('hex');
        cache[userPrincipalName] = {
          timeStamp: Date.now(),
          token: token,
        };
        cb(null, token);
      } else {
        delete cache[userPrincipalName];
        cb('Windows auth has expired');
      }
    });
  }

  // most methods are filled with database-backed defaults if not defined.
  return {
    sql_auth: "auth_windows_main_sql_auth",
    sql_login: "auth_windows_main_sql_login",
    sql_superlogin: "auth_windows_main_sql_superlogin",
    sql_loginsuccess: "main_sql_loginsuccess",
    on_passwordreset: null,
    validatePassword: authenticate,
    validateSuperPassword: authenticate,
    getTrustedToken: getTrustedToken,
  };
};

exports = module.exports = AuthWindows;
