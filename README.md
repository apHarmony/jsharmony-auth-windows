# ======================
# jsharmony-auth-windows
# ======================

Replaces password authentication with Active Directory/LDAP based authentication in jsharmony-factory projects.

## Installation

npm install jsharmony-auth-windows --save

## Initial Configuration

Add to your config file
```
var jsHarmonyAuthWindows = require('jsharmony-auth-windows');

....

  var authWindows = new jsHarmonyAuthWindows();
  jsh.AddModule(authWindows);

  var configAuth = config.modules['jsHarmonyAuthWindows'];
  if (configAuth) {
    configAuth.auto_bind_main_site = false;  //REQUIRED to bootstrap the admin account binding
    configAuth.mainsalt = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";   //REQUIRED: Use a 60+ mixed character string    //configAuth.domain_controller = "LDAP://servername";
    //configAuth.system_account_user_principal_name = "ldap@your.domain";
    //configAuth.system_account_password = "password";
    //configAuth.cache_authentication_seconds = 60;
    //configAuth.debug_params.log_timing = true;
  }
```

If you are adding to an existing site, run the DB Script jsHarmonyAuthWindows.init.core.init. You will need to restart the server to see the new field in schema viewer.

Go into the "Administration/System Users" menu and configure the `Windows Account`, e.g. `jdoe@your.domain` for at least the administrator account. This field will be required to login once the module is enabled.

Enable the module

`configAuth.auto_bind_main_site = true;`

Login with your *jsharmoy email* and *domain passwword*

## Superlogin and client sites

If using superuser login-as-user on a client site with password auth, you mush use the admin account's local password rather than it's domain account password to log in.