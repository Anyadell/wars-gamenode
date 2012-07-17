define([], function() {

  function Theme(themeName) {
    this.themeName = themeName;
    this.settings = {}
  }

  Theme.prototype.load = function(callback) {
    var that = this;
    $.getJSON("/img/themes/" + this.themeName + "/settings.json", function(data) {
      that.settings = data;
      
      var sheet = that.settings.sheet;
      var image = that.settings.image;
      var sheetLayout = that.settings.sheetLayout;
      
      var coords = {};
      for(var i = 0; i < sheetLayout.length; ++i) {
        var name = sheetLayout[i];
        if(name !== null) {
          coords[name] = { 
            x: Math.floor(i % sheet.cols) * image.width,
            y: Math.floor(i / sheet.cols) * image.height
          }
        }
      }
      
      that.settings.sprites = coords;
      
      callback();
    });
  }

  Theme.prototype.getSpriteSheetUrl = function() {
    return "/img/themes/" + this.themeName + "/" + this.settings.sheet.filename;
  }

  Theme.prototype.getCoordinates = function(name) {
    if(name === null || name === undefined)
      return null;
    
    return this.settings.sprites[name];
  }

  Theme.prototype.getTileCoordinates = function(tileType, tileSubtype, tileOwner) {
    return this.getCoordinates(this.settings.tiles[tileType][tileSubtype][tileOwner].hex);
  }
  
  Theme.prototype.getTilePropCoordinates = function(tileType, tileSubtype, tileOwner) {
    return this.getCoordinates(this.settings.tiles[tileType][tileSubtype][tileOwner].prop);
  }
  
  Theme.prototype.getTileOffset = function(tileType, tileSubtype, tileOwner) {
    return this.settings.tiles[tileType][tileSubtype][tileOwner].offset;
  }

  Theme.prototype.getUnitCoordinates = function(unitType, unitOwner) {
    return this.getCoordinates(this.settings.units[unitType][unitOwner]);
  }
  
  Theme.prototype.getHealthNumberCoordinates = function(healthNumber) {
    //return SPRITE_SHEET_MAP[SPRITE_GUI][GUI_IMAGES_HEALTH][healthNumber];
    return null;
  }

  Theme.prototype.getPlayerColor = function(playerNumber) {
    if(playerNumber < this.settings.playerColors.length) {
      return this.settings.playerColors[playerNumber];
    } else {
      return this.settings.playerColors[0];
    }
  }

  Theme.prototype.getPlayerColorString = function(playerNumber) {
    var c = this.getPlayerColor(playerNumber);
    return "rgb(" + c.r + "," + c.g + "," + c.b + ")";
  }

  Theme.prototype.getNumberOfUnitTypes = function() {
    return this.settings.units.length;
  }

  Theme.prototype.getNumberOfUnitOwners = function(unitType) {
    return this.settings.units[unitType].length;
  }

  Theme.prototype.getNumberOfTileTypes = function() {
    return this.settings.tiles.length;
  }

  Theme.prototype.getNumberOfTileSubtypes = function(tileType) {
    return this.settings.tiles[tileType].length;
  }

  Theme.prototype.getNumberOfTileOwners = function(tileType, tileSubtype) {
    return this.settings.tiles[tileType][tileSubtype].length;
  }

  Theme.prototype.getAttackIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_attack.png";
  }

  Theme.prototype.getDeployIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_deploy.png";
  }

  Theme.prototype.getUndeployIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_undeploy.png";
  }

  Theme.prototype.getCaptureIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_capture.png";
  }

  Theme.prototype.getWaitIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_wait.png";
  }

  Theme.prototype.getLoadIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_load.png";
  }

  Theme.prototype.getUnloadIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_unload.png";
  }

  Theme.prototype.getCancelIconUrl = function() {
    return "/img/themes/" + this.themeName + "/gui/action_cancel.png";
  }

  Theme.prototype.getEraserIconUrl = function() {
    return "/img/themes/" + this.themeName + "/nothing.png";
  }
  
  return Theme;
});