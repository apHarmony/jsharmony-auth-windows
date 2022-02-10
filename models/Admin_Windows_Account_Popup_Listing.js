//var modelid = [current model id];
//var xmodel = [current model];

jsh.App[modelid] = new(function() {
  var _this = this;

  var apiGrid = new jsh.XAPI.Grid.Static(modelid);

  _this.getapi = function(xmodel, apitype){
    if(apitype=='grid') return apiGrid;
    else if(apitype=='form') return null;
  };

  _this.OnPopup = function(popupmodelid, parentmodelid, fieldid, onComplete){
    _this.userListing(onComplete);
  };

  _this.userListing = function(onComplete){
    var emodelid = '../_funcs/jsHarmonyAuthWindows/USER_LISTING';
    XForm.Get(emodelid, { }, { }, function (rslt) { //On Success
      apiGrid.dataset = rslt;
      if (onComplete) onComplete();
    }, function (err) {
      //Optionally, handle errors
      if(err) XExt.Alert('Error loading user listing: ' + err.toString());
      if (onComplete) onComplete();
    });
  };
});
