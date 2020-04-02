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
  }

  public class Startup
  {
    public async Task<object> Invoke(dynamic input)
    {
      string domain_controller = (string)input.domain_controller;
      string system_account_user_principal_name = (string)input.system_account_user_principal_name;
      string system_account_password = (string)input.system_account_password;

      DirectoryEntry de;
      if (domain_controller != null && system_account_user_principal_name != null && system_account_password != null) {
        de = new DirectoryEntry(domain_controller, system_account_user_principal_name, system_account_password);
      } else if (domain_controller != null) {
        de = new DirectoryEntry(domain_controller);
      } else {
        de = new DirectoryEntry();
      }

      DirectorySearcher ds = new DirectorySearcher(de);
      ds.Filter = string.Format("(&(objectClass=user))");
      ds.PropertiesToLoad.Add("userPrincipalName");
      ds.PropertiesToLoad.Add("displayName");
      SearchResultCollection users = ds.FindAll();

      var output = new List<Person>();
      for (int r = 0; r < users.Count; r++) {
        SearchResult sr = users[r];

        ResultPropertyCollection props = sr.Properties;
        if (props["userprincipalname"].Count > 0 && props["displayname"].Count > 0) {
          var person = new Person() {
            displayName = (string)props["displayname"][0],
            userPrincipalName = (string)props["userprincipalname"][0]
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

  funcs.userListing = function(cb) {
    ListDomainUsers({
      domain_controller: config.domain_controller,
      system_account_user_principal_name: config.system_account_user_principal_name,
      system_account_password: config.system_account_password,
    }, cb);
  }

  funcs.req_userListing = function(req, res, next) {
    var verb = req.method.toLowerCase();
    var appsrv = this;
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
  }
}