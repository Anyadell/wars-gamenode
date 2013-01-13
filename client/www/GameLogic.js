// Generated by CoffeeScript 1.4.0
(function() {
  var GameLogic, all, any, find, findIndex;

  findIndex = function(l, p) {
    var e, i, _i, _len;
    for (i = _i = 0, _len = l.length; _i < _len; i = ++_i) {
      e = l[i];
      if (p(e)) {
        return i;
      }
    }
    return null;
  };

  find = function(l, p) {
    var i;
    i = findIndex(l, p);
    if (i !== null) {
      return l[i];
    } else {
      return null;
    }
  };

  any = function(l, p) {
    return find(l, p) !== null;
  };

  all = function(l, p) {
    return find(l, function(i) {
      return !p(i);
    }) === null;
  };

  GameLogic = (function() {

    function GameLogic(map, rules) {
      this.map = map;
      this.rules = rules;
    }

    return GameLogic;

  })();

  if (typeof exports !== "undefined") {
    exports.GameLogic = GameLogic;
  }

  if (typeof define !== "undefined" && define !== null) {
    define(function() {
      return GameLogic;
    });
  }

  GameLogic.prototype.getNeighborTiles = function(mapArray, x, y) {
    var a, adjacent, neighbors, _i, _len;
    adjacent = [
      {
        x: x - 1,
        y: y
      }, {
        x: x,
        y: y - 1
      }, {
        x: x + 1,
        y: y
      }, {
        x: x,
        y: y + 1
      }, {
        x: x + 1,
        y: y - 1
      }, {
        x: x - 1,
        y: y + 1
      }
    ];
    neighbors = [];
    for (_i = 0, _len = adjacent.length; _i < _len; _i++) {
      a = adjacent[_i];
      if (mapArray[a.y] && mapArray[a.y][a.x]) {
        neighbors.push(a);
      }
    }
    return neighbors;
  };

  GameLogic.prototype.getDistance = function(x1, y1, x2, y2) {
    var diagonal, distance;
    distance = 0;
    if (x1 < x2 && y1 > y2) {
      diagonal = Math.min(x2 - x1, y1 - y2);
      x1 += diagonal;
      y1 -= diagonal;
      distance += diagonal;
    } else if (x1 > x2 && y1 < y2) {
      diagonal = Math.min(x1 - x2, y2 - y1);
      x2 += diagonal;
      y2 -= diagonal;
      distance += diagonal;
    }
    distance += Math.abs(x2 - x1);
    distance += Math.abs(y2 - y1);
    return distance;
  };

  GameLogic.prototype.tileHasMovableUnit = function(player, x, y) {
    var tile;
    tile = this.map.getTile(x, y);
    if (!tile || !tile.unit) {
      return false;
    } else if (tile.unit.owner !== player) {
      return false;
    }
    return !tile.unit.moved;
  };

  GameLogic.prototype.tileCanBuild = function(player, x, y) {
    var tile;
    tile = this.map.getTile(x, y);
    if (!(tile != null) || tile.owner !== player || (tile.unit != null)) {
      return false;
    } else {
      return this.rules.terrains[tile.type].buildTypes.length !== 0;
    }
  };

  GameLogic.prototype.tileBuildOptions = function(x, y) {
    var buildOptions, canBuild, terrain, tile, unitId, unitType, _ref;
    tile = this.map.getTile(x, y);
    terrain = this.rules.terrains[tile.type];
    buildOptions = [];
    _ref = this.rules.units;
    for (unitId in _ref) {
      unitType = _ref[unitId];
      canBuild = false;
      if (all(terrain.buildTypes, function(buildType) {
        return buildType !== unitType.unitClass;
      })) {
        continue;
      }
      if (any(this.rules.bannedUnits, function(bannedUnit) {
        return bannedUnit === unitType.id;
      })) {
        continue;
      }
      buildOptions.push(unitType);
    }
    return buildOptions;
  };

  GameLogic.prototype.unitCanMovePath = function(x, y, dx, dy, path) {
    var cost, left, mapArray, node, prev, tile, unit, unitMovementType, unitType, _i, _len, _ref;
    if (x === dx && y === dy) {
      return true;
    }
    mapArray = this.map.getMapArray();
    unit = mapArray[y][x].unit;
    if (unit === null) {
      return false;
    }
    if (unit.deployed && (x !== dx || y !== dy)) {
      return false;
    }
    unitType = this.rules.units[unit.type];
    unitMovementType = this.rules.movementTypes[unitType.movementType];
    left = unitType.movement;
    prev = path[0];
    _ref = path.slice(1);
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      node = _ref[_i];
      if (this.getDistance(prev.x, prev.y, node.x, node.y) !== 1) {
        return false;
      }
      tile = mapArray[node.y][node.x];
      if (!(tile != null)) {
        return false;
      }
      if (tile.unit !== null && tile.unit.owner !== unit.owner) {
        return false;
      }
      cost = 1;
      if (tile.type in unitMovementType.effectMap) {
        cost = unitMovementType.effectMap[tile.type];
      }
      if (!(cost != null) || cost > left) {
        return false;
      }
      left -= cost;
      prev = node;
    }
    return true;
  };

  GameLogic.prototype.unitCanMoveTo = function(x, y, dx, dy) {
    var addNode, cost, current, existing, from, mapArray, neighbor, neighbors, next, node, path, previous, tile, unit, unitMovementType, unitType, _i, _len;
    addNode = function(node) {
      var isBefore, next, pos;
      isBefore = function(a, b) {
        return a.left > b.left || (a.left === b.left && a.distance < b.distance);
      };
      if (next === null || isBefore(node, next)) {
        node.next = next;
        return next = node;
      } else {
        pos = next;
        while (pos.next !== null && isBefore(pos.next, node)) {
          pos = pos.next;
        }
        node.next = pos.next;
        return pos.next = node;
      }
    };
    mapArray = this.map.getMapArray();
    unit = mapArray[y][x].unit;
    if (!(unit != null)) {
      return null;
    }
    unitType = this.rules.units[unit.type];
    if (unit.deployed && (x !== dx || y !== dy)) {
      return false;
    }
    unitMovementType = this.rules.movementTypes[unitType.movementType];
    from = {};
    next = {
      tile: mapArray[y][x],
      left: unitType.movement,
      next: null,
      from: null,
      distance: this.getDistance(x, y, dx, dy)
    };
    while (next !== null) {
      current = next;
      next = current.next;
      if (!(from[current.tile.y] != null)) {
        from[current.tile.y] = {};
      }
      from[current.tile.y][current.tile.x] = current.from;
      if (current.tile.x === dx && current.tile.y === dy) {
        path = [];
        while (current !== null) {
          path.push({
            x: current.tile.x,
            y: current.tile.y
          });
          current = from[current.tile.y][current.tile.x];
        }
        return path.reverse();
      }
      neighbors = this.getNeighborTiles(mapArray, current.tile.x, current.tile.y);
      for (_i = 0, _len = neighbors.length; _i < _len; _i++) {
        neighbor = neighbors[_i];
        tile = mapArray[neighbor.y][neighbor.x];
        if (!(tile != null)) {
          continue;
        }
        if ((from[tile.y] != null) && (from[tile.y][tile.x] != null)) {
          continue;
        }
        if (tile.unit !== null && tile.unit.owner !== unit.owner) {
          continue;
        }
        cost = 1;
        if (tile.type in unitMovementType.effectMap) {
          cost = unitMovementType.effectMap[tile.type];
        }
        if (!(cost != null) || cost > current.left) {
          continue;
        }
        previous = null;
        existing = next;
        while (existing !== null && (existing.tile.x !== tile.x || existing.tile.y !== tile.y)) {
          previous = existing;
          existing = existing.next;
        }
        node = {
          tile: tile,
          left: current.left - cost,
          next: null,
          from: current,
          distance: this.getDistance(tile.x, tile.y, dx, dy)
        };
        if (existing === null) {
          addNode(node);
        } else {
          if (existing.left < node.left) {
            if (previous === null) {
              next = existing.next;
            } else {
              previous.next = existing.next;
            }
            existing.next = null;
            addNode(node);
          }
        }
      }
    }
    return false;
  };

  GameLogic.prototype.getPath = function(movementTypeId, playerNumber, x, y, dx, dy, maxCostPerNode, maxCost, acceptNextTo) {
    var addNode, cost, current, existing, from, mapArray, neighbor, neighbors, next, node, path, previous, tile, unitMovementType, _i, _len;
    console.log("getPath");
    addNode = function(node) {
      var isBefore, next, pos;
      isBefore = function(a, b) {
        return a.cost < b.cost || (a.cost === b.cost && a.distance < b.distance);
      };
      if (next === null || isBefore(node, next)) {
        node.next = next;
        return next = node;
      } else {
        pos = next;
        while (pos.next !== null && isBefore(pos.next, node)) {
          pos = pos.next;
        }
        node.next = pos.next;
        return pos.next = node;
      }
    };
    mapArray = this.map.getMapArray();
    unitMovementType = this.rules.movementTypes[movementTypeId];
    from = {};
    next = {
      tile: mapArray[y][x],
      cost: 0,
      next: null,
      from: null,
      distance: this.getDistance(x, y, dx, dy)
    };
    while (next !== null) {
      current = next;
      next = current.next;
      if (!(current.tile.y in from)) {
        from[current.tile.y] = {};
      }
      from[current.tile.y][current.tile.x] = current.from;
      if (this.getDistance(current.tile.x, current.tile.y, dx, dy) <= (acceptNextTo ? 1 : 0)) {
        path = [];
        while (current !== null) {
          path.push({
            x: current.tile.x,
            y: current.tile.y,
            cost: current.cost
          });
          current = from[current.tile.y][current.tile.x];
        }
        return path.reverse();
      }
      neighbors = this.getNeighborTiles(mapArray, current.tile.x, current.tile.y);
      for (_i = 0, _len = neighbors.length; _i < _len; _i++) {
        neighbor = neighbors[_i];
        tile = mapArray[neighbor.y][neighbor.x];
        if (!(tile != null)) {
          continue;
        }
        if ((from[tile.y] != null) && (from[tile.y][tile.x] != null)) {
          continue;
        }
        if (tile.unit !== null && tile.unit.owner !== playerNumber) {
          continue;
        }
        cost = 1;
        if (tile.type in unitMovementType.effectMap) {
          cost = unitMovementType.effectMap[tile.type];
        }
        if (cost === null || ((maxCostPerNode != null) && maxCostPerNode < cost) || ((maxCost != null) && maxCost < cost + current.cost)) {
          continue;
        }
        previous = null;
        existing = next;
        while (existing !== null && (existing.tile.x !== tile.x || existing.tile.y !== tile.y)) {
          previous = existing;
          existing = existing.next;
        }
        node = {
          tile: tile,
          cost: current.cost + cost,
          next: null,
          from: current,
          distance: this.getDistance(tile.x, tile.y, dx, dy)
        };
        if (existing === null) {
          addNode(node);
        } else if (existing.cost > node.cost) {
          if (previous === null) {
            next = existing.next;
          } else {
            previous.next = existing.next;
          }
          existing.next = null;
          addNode(node);
        }
      }
    }
    return false;
  };

  GameLogic.prototype.unitMovementOptions = function(x, y) {
    var bfsQueue, cost, destinationIndex, destinationOptions, mapArray, movementOptions, neighbor, neighbors, newNode, node, nodeIndex, targetTile, tile, unit, unitMovementType, unitType, _i, _len;
    mapArray = this.map.getMapArray();
    unit = mapArray[y][x].unit;
    if (!(unit != null)) {
      return null;
    }
    unitType = this.rules.units[unit.type];
    if (unit.deployed) {
      return [
        {
          pos: {
            x: x,
            y: y
          },
          prev: null,
          n: unitType.movement
        }
      ];
    }
    unitMovementType = this.rules.movementTypes[unitType.movementType];
    movementOptions = [];
    destinationOptions = [];
    bfsQueue = [
      {
        pos: {
          x: x,
          y: y
        },
        prev: null,
        n: unitType.movement
      }
    ];
    while (bfsQueue.length !== 0) {
      node = bfsQueue.shift();
      nodeIndex = findIndex(movementOptions, function(o) {
        return o.pos.x === node.pos.x && o.pos.y === node.pos.y;
      });
      if ((nodeIndex != null) && movementOptions[nodeIndex].n >= node.n) {
        continue;
      }
      targetTile = mapArray[node.pos.y][node.pos.x];
      if (!(targetTile.unit != null) || (node.pos.x === x && node.pos.y === y) || this.unitCanLoadInto(x, y, node.pos.x, node.pos.y)) {
        destinationIndex = findIndex(destinationOptions, function(o) {
          return o.pos.x === node.pos.x && o.pos.y === node.pos.y;
        });
        if (destinationIndex === null) {
          destinationOptions.push(node);
        } else {
          destinationOptions[destinationIndex] = node;
        }
      }
      if (nodeIndex === null) {
        movementOptions.push(node);
      } else {
        movementOptions[nodeIndex] = node;
      }
      if (node.n === 0) {
        continue;
      }
      neighbors = this.getNeighborTiles(mapArray, node.pos.x, node.pos.y);
      for (_i = 0, _len = neighbors.length; _i < _len; _i++) {
        neighbor = neighbors[_i];
        if (node.prev !== null && neighbor.x === node.prev.pos.x && neighbor.y === node.prev.pos.y) {
          continue;
        }
        tile = mapArray[neighbor.y][neighbor.x];
        cost = 1;
        if (tile.type in unitMovementType.effectMap) {
          cost = unitMovementType.effectMap[tile.type];
        }
        if (cost === null) {
          continue;
        }
        if (cost > node.n) {
          continue;
        }
        if ((tile.unit != null) && tile.unit.owner !== unit.owner) {
          continue;
        }
        newNode = {
          pos: {
            x: neighbor.x,
            y: neighbor.y
          },
          prev: node,
          n: node.n - cost
        };
        bfsQueue.push(newNode);
      }
    }
    return destinationOptions;
  };

  GameLogic.prototype.calculateAttackPower = function(unit, distance, targetArmor) {
    var primaryPower, primaryWeapon, secondaryPower, secondaryWeapon, unitType, weaponPower;
    unitType = this.rules.units[unit.type];
    primaryPower = null;
    secondaryPower = null;
    primaryWeapon = this.rules.weapons[unitType.primaryWeapon];
    secondaryWeapon = this.rules.weapons[unitType.secondaryWeapon];
    weaponPower = function(w) {
      if (!(w != null) || !(distance in w.rangeMap) || !(targetArmor.id in w.powerMap) || (w.requireDeployed && !unit.deployed)) {
        return null;
      }
      return parseInt(w.rangeMap[distance] * w.powerMap[targetArmor.id] / 100);
    };
    primaryPower = weaponPower(primaryWeapon);
    secondaryPower = weaponPower(secondaryWeapon);
    if (primaryPower == null) {
      return secondaryPower;
    } else if (secondaryPower == null) {
      return primaryPower;
    } else {
      return Math.max(primaryPower, secondaryPower);
    }
  };

  GameLogic.prototype.calculateDamage = function(unit, unitTile, target, targetTile) {
    var distance, power, targetArmor, targetDefense, targetTileType, targetUnitType, weaponPower;
    targetUnitType = this.rules.units[target.type];
    targetArmor = this.rules.armors[targetUnitType.armor];
    distance = this.getDistance(targetTile.x, targetTile.y, unitTile.x, unitTile.y);
    weaponPower = this.calculateAttackPower(unit, distance, targetArmor);
    if (weaponPower == null) {
      return null;
    }
    targetTileType = this.rules.terrains[targetTile.type];
    targetDefense = targetTileType.defense;
    if (targetTile.type in targetUnitType.defenseMap) {
      targetDefense = targetUnitType.defenseMap[targetTile.type];
    }
    power = parseInt(unit.health * weaponPower * parseInt(100 - targetDefense * target.health / 100) / 100 / 100);
    return Math.max(power, 1);
  };

  GameLogic.prototype.unitAttackOptions = function(x1, y1, x2, y2) {
    var attackFromTile, attackOptions, mapArray, power, targetTile, targetUnit, tile, tx, ty, unit, unitType;
    attackOptions = [];
    tile = this.map.getTile(x1, y1);
    attackFromTile = this.map.getTile(x2, y2);
    unit = tile.unit;
    if (unit === undefined) {
      return null;
    }
    unitType = this.rules.units[unit.type];
    mapArray = this.map.getMapArray();
    for (ty in mapArray) {
      for (tx in mapArray[ty]) {
        targetTile = mapArray[ty][tx];
        if (targetTile.unit == null) {
          continue;
        }
        targetUnit = targetTile.unit;
        if (targetUnit.owner === unit.owner) {
          continue;
        }
        power = this.calculateDamage(unit, attackFromTile, targetUnit, targetTile);
        if (power !== null) {
          attackOptions.push({
            pos: {
              x: tx,
              y: ty
            },
            power: power
          });
        }
      }
    }
    return attackOptions;
  };

  GameLogic.prototype.unitCanCapture = function(x1, y1, x2, y2) {
    var capturable, flag, flagName, targetTile, targetTileType, tile, unit, unitType, _i, _j, _len, _len1, _ref, _ref1;
    tile = this.map.getTile(x1, y1);
    unit = tile.unit;
    unitType = this.rules.units[unit.type];
    targetTile = this.map.getTile(x2, y2);
    targetTileType = this.rules.terrains[targetTile.type];
    if (targetTile.owner === unit.owner) {
      return false;
    }
    capturable = false;
    _ref = targetTileType.flags;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      flagName = _ref[_i];
      flag = this.rules.terrainFlags[flagName];
      if (flag.name === "Capturable") {
        capturable = true;
        break;
      }
    }
    if (!capturable) {
      return false;
    }
    _ref1 = unitType.flags;
    for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
      flagName = _ref1[_j];
      flag = this.rules.unitFlags[flagName];
      if (flag.name === "Capture") {
        return true;
      }
    }
    return false;
  };

  GameLogic.prototype.unitCanWait = function(x1, y1, x2, y2) {
    var targetTile;
    targetTile = this.map.getTile(x2, y2);
    return !(targetTile.unit != null) || x1 === x2 && y1 === y2;
  };

  GameLogic.prototype.unitCanDeploy = function(x1, y1, x2, y2) {
    var targetTile, tile, unit, unitType;
    tile = this.map.getTile(x1, y1);
    unit = tile.unit;
    if (unit.deployed) {
      return false;
    }
    targetTile = this.map.getTile(x2, y2);
    if ((targetTile.unit != null) && (x1 !== x2 || y1 !== y2)) {
      return false;
    }
    unitType = this.rules.units[unit.type];
    return ((unitType.primaryWeapon != null) && this.rules.weapons[unitType.primaryWeapon].requireDeployed) || ((unitType.secondaryWeapon != null) && this.rules.weapons[unitType.secondaryWeapon].requireDeployed);
  };

  GameLogic.prototype.unitCanUndeploy = function(x, y) {
    var tile, unit;
    tile = this.map.getTile(x, y);
    unit = tile.unit;
    return unit.deployed;
  };

  GameLogic.prototype.unitCanLoadInto = function(x1, y1, x2, y2) {
    var otherUnit, otherUnitType, targetTile, tile, unit, unitType;
    tile = this.map.getTile(x1, y1);
    unit = tile.unit;
    unitType = this.rules.units[unit.type];
    targetTile = this.map.getTile(x2, y2);
    otherUnit = targetTile.unit;
    if (!(otherUnit != null) || otherUnit.unitId === unit.unitId) {
      return false;
    }
    otherUnitType = this.rules.units[otherUnit.type];
    return otherUnit.owner === unit.owner && otherUnit.carriedUnits.length < otherUnitType.carryNum && unitType.unitClass in otherUnitType.carryClasses;
  };

  GameLogic.prototype.unitCanUnload = function(x1, y1, x2, y2) {
    var carriedUnit, carriedUnitMovementType, carriedUnitType, fromTile, mapArray, neighbor, neighbors, tile, toTile, unit, _i, _j, _len, _len1, _ref;
    mapArray = this.map.getMapArray();
    tile = mapArray[y1][x1];
    unit = tile.unit;
    if (!((unit.carriedUnits != null) && unit.carriedUnits.length !== 0)) {
      return false;
    }
    fromTile = mapArray[y2][x2];
    neighbors = this.getNeighborTiles(mapArray, fromTile.x, fromTile.y);
    _ref = unit.carriedUnits;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      carriedUnit = _ref[_i];
      carriedUnitType = this.rules.units[carriedUnit.type];
      carriedUnitMovementType = this.rules.movementTypes[carriedUnitType.movementType];
      if (fromTile.type in carriedUnitMovementType.effectMap && (!(carriedUnitMovementType.effectMap[fromTile.type] != null) || carriedUnitMovementType.effectMap[fromTile.type] > carriedUnitType.movement)) {
        continue;
      }
      for (_j = 0, _len1 = neighbors.length; _j < _len1; _j++) {
        neighbor = neighbors[_j];
        toTile = mapArray[neighbor.y][neighbor.x];
        if ((toTile.unit != null) && !((x1 !== x2 || y1 !== y2) && (neighbor.x === x1 && neighbor.y === y1))) {
          continue;
        }
        if ((!(toTile.type in carriedUnitMovementType.effectMap)) || ((carriedUnitMovementType.effectMap[toTile.type] != null) && carriedUnitMovementType.effectMap[toTile.type] <= carriedUnitType.movement)) {
          return true;
        }
      }
    }
    return false;
  };

  GameLogic.prototype.unitUnloadOptions = function(x1, y1, x2, y2) {
    var carriedUnit, carriedUnitMovementType, carriedUnitType, fromTile, mapArray, neighbor, neighbors, tile, toTile, unit, unloadOptions, _i, _j, _len, _len1, _ref;
    mapArray = this.map.getMapArray();
    tile = mapArray[y1][x1];
    unit = tile.unit;
    if (unit.carriedUnits.length === 0) {
      return [];
    }
    fromTile = mapArray[y2][x2];
    neighbors = this.getNeighborTiles(mapArray, fromTile.x, fromTile.y);
    unloadOptions = [];
    _ref = unit.carriedUnits;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      carriedUnit = _ref[_i];
      carriedUnitType = this.rules.units[carriedUnit.type];
      carriedUnitMovementType = this.rules.movementTypes[carriedUnitType.movementType];
      if (fromTile.type in carriedUnitMovementType.effectMap && (!(carriedUnitMovementType.effectMap[fromTile.type] != null) || carriedUnitMovementType.effectMap[fromTile.type] > carriedUnitType.movement)) {
        continue;
      }
      for (_j = 0, _len1 = neighbors.length; _j < _len1; _j++) {
        neighbor = neighbors[_j];
        toTile = mapArray[neighbor.y][neighbor.x];
        if ((toTile.unit != null) && !((x1 !== x2 || y1 !== y2) && (neighbor.x === x1 && neighbor.y === y1))) {
          continue;
        }
        if ((!(toTile.type in carriedUnitMovementType.effectMap)) || ((carriedUnitMovementType.effectMap[toTile.type] != null) && carriedUnitMovementType.effectMap[toTile.type] <= carriedUnitType.movement)) {
          unloadOptions.push(carriedUnit);
          break;
        }
      }
    }
    return unloadOptions;
  };

  GameLogic.prototype.unitUnloadTargetOptions = function(x1, y1, x2, y2, unitId) {
    var carriedUnit, carriedUnitMovementType, carriedUnitType, cu, fromTile, mapArray, neighbor, neighbors, tile, toTile, unit, unloadOptions, _i, _j, _len, _len1, _ref;
    mapArray = this.map.getMapArray();
    tile = mapArray[y1][x1];
    unit = tile.unit;
    if (unit.carriedUnits.length === 0) {
      return [];
    }
    fromTile = mapArray[y2][x2];
    neighbors = this.getNeighborTiles(mapArray, fromTile.x, fromTile.y);
    unloadOptions = [];
    carriedUnit = null;
    carriedUnitType = null;
    carriedUnitMovementType = null;
    _ref = unit.carriedUnits;
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      cu = _ref[_i];
      if (cu.unitId === unitId) {
        carriedUnit = cu;
        carriedUnitType = this.rules.units[carriedUnit.type];
        carriedUnitMovementType = this.rules.movementTypes[carriedUnitType.movementType];
      }
    }
    if (carriedUnit === null) {
      return null;
    }
    if (fromTile.type in carriedUnitMovementType.effectMap && (carriedUnitMovementType.effectMap[fromTile.type] === null || carriedUnitMovementType.effectMap[fromTile.type] > carriedUnitType.movement)) {
      return null;
    }
    for (_j = 0, _len1 = neighbors.length; _j < _len1; _j++) {
      neighbor = neighbors[_j];
      toTile = mapArray[neighbor.y][neighbor.x];
      if ((toTile.unit != null) && ((x1 === x2 && y1 === y2) || (neighbor.x !== x1 || neighbor.y !== y1))) {
        continue;
      }
      if ((!(toTile.type in carriedUnitMovementType.effectMap)) || (carriedUnitMovementType.effectMap[toTile.type] !== null && carriedUnitMovementType.effectMap[toTile.type] <= carriedUnitType.movement)) {
        unloadOptions.push(neighbor);
      }
    }
    return unloadOptions;
  };

  GameLogic.prototype.getPowerMap = function() {
    var ai, attackOption, attackOptions, distance, ii, influence, influenceDivisor, influenceTile, influenceTiles, mapArray, mi, movementOption, movementOptions, newTile, powerMap, powerMapTile, tx, ty, unit, unitType, x, y;
    mapArray = this.map.getMapArray();
    powerMap = {
      tiles: [],
      maxValue: 0
    };
    for (y in mapArray) {
      powerMap.tiles.push([]);
      for (x in mapArray[y]) {
        powerMap.tiles[y].push({
          maxValue: 0,
          maxValuePlayer: 0,
          values: {}
        });
      }
    }
    for (y in mapArray) {
      y = parseInt(y);
      for (x in mapArray[y]) {
        x = parseInt(x);
        unit = mapArray[y][x].unit;
        if (unit == null) {
          continue;
        }
        unitType = this.rules.units[unit.type];
        movementOptions = this.unitMovementOptions(x, y);
        if (movementOptions == null) {
          continue;
        }
        influenceTiles = [];
        influenceDivisor = 0;
        for (mi in movementOptions) {
          movementOption = movementOptions[mi];
          attackOptions = [];
          for (ty in mapArray) {
            ty = parseInt(ty);
            for (tx in mapArray[ty]) {
              tx = parseInt(tx);
              distance = this.getDistance(movementOption.pos.x, movementOption.pos.y, tx, ty);
              if (((unitType.primaryWeapon != null) && (!this.rules.weapons[unitType.primaryWeapon].requireDeployed || unit.deployed) && distance in this.rules.weapons[unitType.primaryWeapon].rangeMap) || ((unitType.secondaryWeapon != null) && (!this.rules.weapons[unitType.secondaryWeapon].requireDeployed || unit.deployed) && distance in this.rules.weapons[unitType.secondaryWeapon].rangeMap)) {
                attackOptions.push({
                  x: tx,
                  y: ty
                });
              }
            }
          }
          for (ai in attackOptions) {
            influenceDivisor += 1;
            attackOption = attackOptions[ai];
            newTile = true;
            for (ii in influenceTiles) {
              influenceTile = influenceTiles[ii];
              if (influenceTile.pos.x === attackOption.x && influenceTile.pos.y === attackOption.y) {
                influenceTile.n += 1;
                newTile = false;
              }
            }
            if (newTile) {
              influenceTiles.push({
                pos: {
                  x: attackOption.x,
                  y: attackOption.y
                },
                n: 1
              });
            }
          }
        }
        for (ii in influenceTiles) {
          influenceTile = influenceTiles[ii];
          powerMapTile = powerMap.tiles[influenceTile.pos.y][influenceTile.pos.x];
          if (!(unit.owner in powerMapTile.values)) {
            powerMapTile.values[unit.owner] = 0.0;
          }
          influence = unit.health * influenceTile.n * unitType.price / influenceDivisor / 100;
          powerMapTile.values[unit.owner] += influence;
          if (powerMapTile.values[unit.owner] > powerMapTile.maxValue) {
            powerMapTile.maxValue = powerMapTile.values[unit.owner];
            powerMapTile.maxValuePlayer = unit.owner;
            if (powerMapTile.values[unit.owner] > powerMap.maxValue) {
              powerMap.maxValue = powerMapTile.values[unit.owner];
            }
          } else if (powerMapTile.values[unit.owner] === powerMapTile.maxValue && unit.owner !== powerMapTile.maxValuePlayer) {
            powerMapTile.maxValue = powerMapTile.values[unit.owner];
            powerMapTile.maxValuePlayer = 0;
          }
        }
      }
    }
    return powerMap;
  };

}).call(this);
