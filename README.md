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
    configAuth.auto_bind_main_site_auth = false;  //REQUIRED to automatically integrate with jsHarmony Factory
      // Value must be 'true' to use the module, but must be 'false' initially to allow system configuration.

    configAuth.domain_controller = "LDAP://servername"; //REQUIRED for authentication
    //configAuth.system_account_user_principal_name = "ldap@your.domain";
    //configAuth.system_account_password = "password";

    //this.authentication_filter = "(&(objectClass=user)({{userPrincipalName}}={{windows_account}}))" // username@your.domain
    // On first authentication, {{userPrincipalName}} will be replaced with userPrincipalName
    // On failed authentication, {{userPrincipalName}} will be replaced with sAMAccountName (for alternative validation)

    // If requiring the user to be a member of a group:
    // this.authentication_filter = "(&(objectClass=user)({{userPrincipalName}}={{windows_account}})(memberof:1.2.840.113556.1.4.1941:=CN=jsHarmony Users,OU=Department,DC=YOUR,DC=DOMAIN))" // username@your.domain, member of group

    //configAuth.all_users_filter = "(&(objectcategory=person)(objectClass=user))";
    // or configAuth.all_users_filter = "(&(objectcategory=person)(objectClass=user)(memberof:1.2.840.113556.1.4.1941:=CN=jsHarmony Users,OU=Department,DC=YOUR,DC=DOMAIN))"; // members of a group
    //configAuth.idle_session_timeout = 24 * 60 * 60; // seconds (ex: 24 hours)
    //configAuth.maximum_session_duration = 90 * 24 * 60 * 60; // seconds (ex: 90 days)
    //configAuth.authentication_cache_expiration = 60;
    //configAuth.debug_params.log_timing = true;
  }
```

If you are adding to an existing site, run the DB Script jsHarmonyAuthWindows.init.core.init. You will need to restart the server to see the new field in schema viewer.

Go into the "Administration/System Users" menu and configure the `Windows Account`, e.g. `jdoe@your.domain` for at least the administrator account. This field will be required to login once the module is enabled.

Enable the module

`configAuth.auto_bind_main_site_auth = true;`

Login with your *jsharmoy email* and *domain passwword*

## Superlogin and client sites

If using superuser login-as-user on a client site with password auth, you must use the admin account's local password rather than it's domain account password to log in.