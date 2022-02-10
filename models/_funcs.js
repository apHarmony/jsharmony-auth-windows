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
var Helper = require('jsharmony/Helper');
var edge = require('edge-js');

var ListDomainUsers = edge.func(function() {/*
  #r "System.DirectoryServices.dll"

  using System.DirectoryServices;
  using System.Collections.Generic;
  using System.Threading.Tasks;

  public class Person
  {
    public string displayName;
    public string userPrincipalName;
    public string distinguishedName;
  }

  public class Startup
  {
    public async Task<object> Invoke(dynamic input)
    {
      string domain_controller = (string)input.domain_controller;
      string system_account_user_principal_name = (string)input.system_account_user_principal_name;
      string system_account_password = (string)input.system_account_password;
      string all_users_filter = (string)input.all_users_filter;

      DirectoryEntry de;
      if (domain_controller != null && system_account_user_principal_name != null && system_account_password != null) {
        de = new DirectoryEntry(domain_controller, system_account_user_principal_name, system_account_password);
      } else if (domain_controller != null) {
        de = new DirectoryEntry(domain_controller);
      } else {
        de = new DirectoryEntry();
      }

      DirectorySearcher ds = new DirectorySearcher(de);
      ds.Filter = all_users_filter;
      ds.PropertiesToLoad.Add("cn");
      ds.PropertiesToLoad.Add("userPrincipalName");
      ds.PropertiesToLoad.Add("displayName");
      ds.PropertiesToLoad.Add("distinguishedName");
      ds.PropertiesToLoad.Add("sAMAccountName");
      SearchResultCollection users = ds.FindAll();

      var output = new List<Person>();
      for (int r = 0; r < users.Count; r++) {
        SearchResult sr = users[r];

        ResultPropertyCollection props = sr.Properties;
        string cn = "";
        string displayName = "";
        string userPrincipalName = "";
        string distinguishedName = "";
        string sAMAccountName = "";
        if (props["cn"].Count > 0) cn = (string)props["cn"][0];
        if (props["userprincipalname"].Count > 0) userPrincipalName = (string)props["userprincipalname"][0];
        if (props["displayname"].Count > 0) displayName = (string)props["displayname"][0];
        if (props["distinguishedName"].Count > 0) distinguishedName = (string)props["distinguishedName"][0];
        if (props["sAMAccountName"].Count > 0) sAMAccountName = (string)props["sAMAccountName"][0];
        if(userPrincipalName == "") userPrincipalName = sAMAccountName;
        if(displayName == "") displayName = cn;
        if(cn == "") displayName = userPrincipalName;
        
        if (userPrincipalName != "") {
          var person = new Person() {
            displayName = displayName,
            userPrincipalName = userPrincipalName,
            distinguishedName = distinguishedName
          };
          output.Add(person);
        }
      }

      users.Dispose();

      return output;
    }
  }
*/});

module.exports = exports = function(module) {
  var funcs = this;
  var config = module.Config;
  var cacheValue;
  var cacheTimeStamp = 0;

  funcs.userListing = function(cb) {
    if (cacheValue && Date.now() - cacheTimeStamp < (5*60*1000)) {
      setTimeout(cb, 0, null, cacheValue);
      return;
    }
    ListDomainUsers({
      domain_controller: config.domain_controller,
      system_account_user_principal_name: config.system_account_user_principal_name,
      system_account_password: config.system_account_password,
      all_users_filter: config.all_users_filter,
    }, function(err, users) {
      if(err) return cb(err);
      _.forEach(users, function(user) {
        if (!user.distinguishedName) return;
        var parts = user.distinguishedName.split(',');
        parts.shift(); // drop user's main CN
        var dc_ou = _.partition(parts, function(part) {
          return part.slice(0,2) == 'DC';
        });
        var dcs = dc_ou[0];
        var ous = dc_ou[1];

        // DC parts are dotted (jsharmony.com)
        var doms = _.map(dcs, function(dc) {
          return dc.slice(3);
        });
        var domain = doms.join('.');

        //others parts are slashed like folders
        // mainly OU, but the default "Users" is a CN
        var names = _.map(ous, function(ou) {
          return ou.slice(3);
        });

        names.push(domain);
        user.folder = _.reverse(names).join('/');
      });
      cacheValue = users;
      cacheTimeStamp = Date.now();
      cb(null, users);
    });
  };

  funcs.req_userListing = function(req, res, next) {
    var verb = req.method.toLowerCase();
    var jsh = module.jsh;

    var model = jsh.getModel(req, 'jsHarmonyFactory/Admin/SysUser');

    if (!Helper.hasModelAction(req, model, 'IU')) { Helper.GenError(req, res, -11, 'Invalid Model Access'); return; }

    if (verb == 'get') {
      funcs.userListing(function (err, users) {
        if(err) return Helper.GenError(req, res, -99999, err.toString());
        res.end(JSON.stringify(users));
      });
    } else {
      return next();
    }
  };
};