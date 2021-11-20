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
    string windows_account = input.windows_account;
    string password = input.password;
    string authentication_filter = input.authentication_filter;
    try
    {
      DirectoryEntry de = new DirectoryEntry(domain_controller, windows_account, password);

      DirectorySearcher ds = new DirectorySearcher(de);
      ds.Filter = authentication_filter.Replace("{{userPrincipalName}}", "userPrincipalName");
      ds.PropertiesToLoad.Add("pwdLastSet");
      // we don't need to check disabled - login will fail if the account is disabled.
      SearchResult sr = ds.FindOne();

      if(sr == null){
        //Try sAMAccountName if userPrincipalName not found
        ds.Filter = authentication_filter.Replace("{{userPrincipalName}}", "sAMAccountName");
        sr = ds.FindOne();
      }

      String attr = "pwdLastSet";

      if (sr != null && sr.Properties[attr].Count > 0) {
        return (long)sr.Properties[attr][0];
      }

      return -1;
    }
    catch (System.DirectoryServices.DirectoryServicesCOMException)
    {
      return -2;
    }
  }
*/});

var ValidateUser = edge.func(function () {/*
  #r "System.DirectoryServices.dll"

  using System.DirectoryServices;

  async (dynamic input) => {
    string domain_controller = input.domain_controller;
    string system_account_user_principal_name = input.system_account_user_principal_name;
    string system_account_password = input.system_account_password;
    string authentication_filter = input.authentication_filter;
    DirectoryEntry de;
    if (domain_controller != null && system_account_user_principal_name != null && system_account_password != null) {
      de = new DirectoryEntry(domain_controller, system_account_user_principal_name, system_account_password);
    } else if (domain_controller != null) {
      de = new DirectoryEntry(domain_controller);
    } else {
      de = new DirectoryEntry();
    }

    DirectorySearcher ds = new DirectorySearcher(de);
    ds.Filter = authentication_filter.Replace("{{userPrincipalName}}", "userPrincipalName");
    ds.PropertiesToLoad.Add("pwdLastSet");
    ds.PropertiesToLoad.Add("userAccountControl");
    ds.PropertiesToLoad.Add("accountExpires");
    SearchResult sr = ds.FindOne();

    if(sr == null){
      //Try sAMAccountName if userPrincipalName not found
      ds.Filter = authentication_filter.Replace("{{userPrincipalName}}", "sAMAccountName");
      sr = ds.FindOne();
    }

    if (sr == null) {
      return -1;
    }

    const int ACCOUNTDISABLE = 0x0002;
    const int LOCKOUT = 0x0010;

    if (sr.Properties["userAccountControl"].Count > 0 && ((int)sr.Properties["userAccountControl"][0] & (ACCOUNTDISABLE|LOCKOUT)) != 0) {
      return -2;
    }

    DirectoryEntry dir =  sr.GetDirectoryEntry();
    string uacc = "msDS-User-Account-Control-Computed";
    dir.RefreshCache(new string[] {uacc});
    if (dir.Properties[uacc].Count > 0 && ((int)dir.Properties[uacc][0] & (ACCOUNTDISABLE|LOCKOUT)) != 0) {
      return -3;
    }

    if (sr.Properties["accountExpires"].Count > 0) {
      Int64 expiresTs = (Int64)sr.Properties["accountExpires"][0];
      if (expiresTs != 0 && expiresTs != Int64.MaxValue) {
        DateTime expiresDate = DateTime.FromFileTime(expiresTs);
        if (DateTime.Compare(expiresDate, DateTime.Now) < 0) {
          return -4;
        }
      }
    }

    if (sr.Properties["pwdLastSet"].Count > 0) {
      return (long)sr.Properties["pwdLastSet"][0];
    }

    return -5;
  }
*/});

var VerifyConfig = function(config){
  function verify_config(x, _caption) { if (!x || (_.isObject(x) && _.isEmpty(x))) { console.log('*** Missing app.config.js setting: ' + _caption); return false; } return true; }
  var good_config = true;
  var required_fields = ['domain_controller'];
  _.each(required_fields, function (val) { good_config &= verify_config(config[val], "config.modules['jsHarmonyAuthWindows']." + val); });
  if (!good_config) { console.log('\r\n*** Invalid config, could not start server ***\r\n'); process.exit(1); }
}

var AuthWindows = function(jshsite, config){
  VerifyConfig(config);
  var sessionStore = {};

  var escapeLDAP = function(str){
    return str.replace(/[\\#+<>,;"=]/g, "\\$&");
  }

  var validatePassword = function(req, jsh, user_info, password, cb){
    var windows_account = (user_info['sys_user_windows_account']||'').toString();
    if(!windows_account){
      delete sessionStore[sessionKey];
      return cb('Invalid Username or Password');
    }

    if (config.debug_params.log_auth_timing) console.time('validatePassword');
    var sessionKey = user_info['sys_user_email'];
    var authentication_filter = config.authentication_filter.replace('{{windows_account}}', escapeLDAP(windows_account));
    AuthenticateUser({
      authentication_filter: authentication_filter,
      domain_controller: config.domain_controller,
      windows_account: windows_account,
      password: password
    }, function (error, pwdLastSet) {
      if (config.debug_params.log_auth_timing) console.timeEnd('validatePassword');
      if (error) return cb(error);
      if (pwdLastSet > 0){
        var token = crypto.createHash('sha1').update(windows_account + pwdLastSet + jshsite.auth.salt).digest('hex');
        sessionStore[sessionKey] = {
          validationTime: Date.now(),
          loginTime: Date.now(),
          accessTime: Date.now(),
          token: token,
        };
        cb(null, token);
      } else {
        delete sessionStore[sessionKey];
        cb('Invalid Username or Password');
      }
    });
  }

  var getTrustedToken = function(req, jsh, user_info, cb){
    var sessionKey = user_info['sys_user_email'];
    var session = sessionStore[sessionKey];
    if (!session) {
      session = sessionStore[sessionKey] = {
        validationTime: 0,
        loginTime: 0,
        accessTime: 0,
        token: null,
      };
    }
    var windows_account = (user_info['sys_user_windows_account']||'').toString();
    if(!windows_account) return cb('Invalid windows account');
    var authentication_filter = config.authentication_filter.replace('{{windows_account}}', escapeLDAP(windows_account));
    /*
    // Future //
    //idle_session_timeout and maximum_session_duration requires cache based on user * session id
    if (config.idle_session_timeout
     && (Date.now() - session.accessTime > config.idle_session_timeout*1000)) {
        delete sessionStore[sessionKey];
        return cb('Session exceeded maximum idle time');
    }
    if (config.maximum_session_duration
     && (Date.now() - session.loginTime > config.maximum_session_duration*1000)) {
        delete sessionStore[sessionKey];
        return cb('Session exceeded maximum duration');
    }
    */
    if (config.authentication_cache_expiration
     && session.token
     && (Date.now() - session.validationTime < config.authentication_cache_expiration*1000)) {
      session.accessTime = Date.now();
      return cb(null, session.token);
    }
    if (config.debug_params.log_auth_timing) console.time('getTrustedToken');
    ValidateUser({
      domain_controller: config.domain_controller,
      system_account_user_principal_name: config.system_account_user_principal_name,
      system_account_password: config.system_account_password,
      authentication_filter: authentication_filter
    }, function (error, pwdLastSet) {
      if (config.debug_params.log_auth_timing) console.timeEnd('getTrustedToken');
      if (error) return cb(error);
      if (pwdLastSet > 0){
        var token = crypto.createHash('sha1').update(windows_account + pwdLastSet + jshsite.auth.salt).digest('hex');
        session.accessTime = Date.now();
        session.validationTime = Date.now();
        session.token = token;
        cb(null, token);
      } else {
        delete sessionStore[sessionKey];
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
    validatePassword: validatePassword,
    validateSuperPassword: validatePassword,
    getTrustedToken: getTrustedToken,
  };
};

exports = module.exports = AuthWindows;
