require(["Theme", "AnimatedMap", "GameLogic", "Color", "gamenode", "base", "lib/d3/d3", "ticker.js"],
        function(Theme, AnimatedMap, GameLogic, Color) {
  var client = new GameNodeClient(Skeleton);
  gameClient = client;
  var session = null;
  var inTurn = false;
  var inTurnNumber = 0;
  var gameLogic = null;
  var theme = null;
  var map = null;
  var ticker = null;
  var turnCounter = null;
  var oldUnits = {};
  var powerMap = null;
  var finished = false;
  var gameClient = null;
  var gameMap = null;

  var gameUIState = {
    stateName: "select"
  }

  var gameId = /[?&]gameId=([0-9a-f]+)/.exec(window.location.search);
  if(gameId !== null)
    gameId = gameId[1];
  else
    document.location = "/";

  $(document).ready(function() {
    var loginUrl = "login.html?next=" + document.location.pathname + document.location.search;
    session = resumeSessionOrRedirect(client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, function() {
      client.stub.subscribeGame(gameId);
      populateNavigation(session);
      if(gameId !== null) {
        client.stub.gameData(gameId, function(response) {
          if(response.success) {
            if(response.game.state == "pregame") {
              document.location = "pregame.html?gameId=" + gameId;
            }
            $("#spinner").show();
            initializeChat(client, gameId);
            initializeMenuControls();
            initializeGameTools();
            $("#round").text(response.game.roundNumber);
            if(response.author) {
              initializeAuthorTools();
            } else {
              $("#authorTools").hide();
            }

            initializeGame(response.game, response.author, response.turnRemaining);
          } else {
            alert("Error loading game!");
          }
        });
      }
    });
  });

  function initializeMenuControls() {
    $("#gameStatistics").attr("href", "gameStatistics.html?gameId=" + gameId);
  }

  function refreshFunds() {
    client.stub.myFunds(gameId, function(response) {
      if(response.success) {
        $("#funds").text(response.funds);
      } else {
        $("#funds").text("N/A");
      }
    });
  }

  function initializeGameTools() {
    $("#endTurn").click(function(e) {
      e.preventDefault();
      undoMove();

      $("#spinner").show();
      client.stub.endTurn(gameId, function(response) {
        if(!response.success) {
          alert(response.reason);
          $("#spinner").hide();
        }
      });
    });

    $("#surrender").click(function(e) {
      e.preventDefault();
      if(window.confirm("Are you sure you want to SURRENDER? This means you LOSE the game.")){
        $("#spinner").show();
        client.stub.surrender(gameId, function(response) {
          if(!response.success) {
            alert("Could not surrender! " + response.reason);
            $("#spinner").hide();
          }
        });
      };
    });

    $("#leaveGame").click(function(e) {
      e.preventDefault();
      if(window.confirm("Are you sure you want to leave the game?")){
        $("#spinner").show();
        client.stub.leaveGame(gameId, inTurnNumber, function(response) {
          if(!response.success) {
            alert("Could not leave game! " + response.reason);
            $("#spinner").hide();
          } else {
            document.location = "home.html";
          }
        });
      };
    });

    client.stub.emailNotifications(gameId, function(response) {
      if(response.success) {
        if(response.value) {
          $("#sendNotificationsStatus").text("off");
        }
      } else {
        $("#sendNotifications").hide();
      }
    });

    $("#sendNotifications").click(function(e) {
      e.preventDefault();
      var status = $("#sendNotifications i");
      var nextValue = !status.hasClass("icon-check");
      client.stub.setEmailNotifications(gameId, nextValue, function(response) {
        if(response.success) {
          status.removeClass(nextValue ? "icon-check-empty" : "icon-check");
          status.addClass(nextValue ? "icon-check" : "icon-check-empty");
        } else {
          alert("Could not change email notifications setting! " + response.reason);
        }
      });
    });

    var speeds = [{x:"1",t:"1x"},{x:"1.5",t:"1.5x"},{x:"2",t:"2x"},{x:"3",t:"3x"},{x:"4",t:"4x"},{x:"5",t:"5x"},{x:"0",t:"off"}];

    $("#animationSpeedPlus").click(function(e) {
      var current = $("#animationSpeed").text();
      for(var i = 0; i < speeds.length; ++i) {
        if(speeds[i].t === current) {
          if(i < speeds.length - 1) {
            map.animationSpeed = speeds[i + 1].x;
            map.animate = map.animationSpeed != 0;
            $("#animationSpeed").text(speeds[i + 1].t);
          }
        }
      }
    });

    $("#animationSpeedMinus").click(function(e) {
      var current = $("#animationSpeed").text();
      for(var i = 0; i < speeds.length; ++i) {
        if(speeds[i].t === current) {
          if(i > 0) {
            map.animationSpeed = speeds[i - 1].x;
            map.animate = map.animationSpeed != 0;
            $("#animationSpeed").text(speeds[i - 1].t);
          }
        }
      }
    });
  }

  function initializeAuthorTools() {

  }

  function formatTime(t) {
    var s = "";
    if(t >= 60*60) {
      var h = Math.floor(t/(60*60));
      if(h < 10) s += 0;
      s += h + ":";
    }
    if(t >= 60) {
      var m = Math.floor(t/60)%60;
      if(m < 10) s += 0;
      s += m + ":";
    }

    var sec = Math.ceil(t)%60;
    if(sec < 10) s += 0;
    s += sec;

    return s;
  }

  function setMenubarToPlayerColor(playerNumber) {
    var c = theme.getPlayerColor(inTurnNumber);
    var playerColor = Color.fromRgb(c.r, c.g, c.b);
    var hsl = playerColor.toHsl();
    var barColor = Color.fromHsl(hsl[0], hsl[1], 0.3);
    $("#menubar").css("background-color", barColor.toString());
  }
  
  function initializeGame(game, author, turnRemaining) {
    showGame(game, author, turnRemaining);

    client.skeleton.gameTurnChange = function(gameId, newTurn, newRound, turnRemaining) {
      $("#round").text(newRound);
      inTurnNumber = newTurn;
      $(".playerItem.inTurn").removeClass("inTurn");
      var playerInTurn = $('.playerItem[playerNumber="' + inTurnNumber + '"]');
      playerInTurn.addClass("inTurn");
      setMenubarToPlayerColor(inTurnNumber);
      if(playerInTurn.hasClass("isMe")) {
        initializeTurn();
      } else {
        finalizeTurn();
      }
      turnCounter = turnRemaining;
      updateStatistic();
    }

    client.skeleton.gameFinished = function(gameId) {
      $("#leaveGame").show();
      finalizeTurn();
      finished = true;
    }

    $("#mapCanvas").click(handleMapClick);
  }

  function showGame(game, author, turnRemaining) {
    $("#gameName").text(game.name);

    finished = game.state == "finished";
    if(!finished) {
      $("#leaveGame").hide();
    }

    if(turnRemaining === null) {
      $("#turnTimeItem").hide();
    } else {
      turnCounter = turnRemaining;
      setInterval(function() {
        $("#turnTime").text(formatTime(turnCounter));
        turnCounter = turnCounter > 0 ? turnCounter - 1 : 0;
      }, 1000);
    }

    client.stub.profile(function(response) {
      theme = new Theme(response.profile.settings.gameTheme);
      theme.load(function() {
        updateStatistic();
        client.stub.gameRules(gameId, function(rules) {
          map = new AnimatedMap("mapCanvas", 1.0, theme, rules);
          gameLogic = new GameLogic(map, rules);
          gameMap = map;

          map.doPreload(function() {
            inTurnNumber = game.inTurnNumber;
            setMenubarToPlayerColor(inTurnNumber);
            initializePlayers(game.players);
            initializeMessageTicker();
            refreshFunds();
            map.tiles = game.tiles;
            var mapSize = map.getMapDimensions();
            map.resize(mapSize.e(1), mapSize.e(2));
            map.refresh();
            map.initEntities();
            if(response.profile.settings.animationSpeed === undefined) {
              map.animationSpeed = 1;
              map.animate = true;
              $("#animationSpeedLabel").text("1x");
            } else if(response.profile.settings.animationSpeed > 0) {
              map.animationSpeed = parseFloat(response.profile.settings.animationSpeed);
              $("#animationSpeedLabel").text(response.profile.settings.animationSpeed + "x");
            } else {
              map.animate = false;
              $("#animationSpeedLabel").text("off");
            }



            $("#spinner").hide();
          });
        });
      });
    });
  }

  function initializeMessageTicker() {
    ticker = new MessageTicker($("#messageTicker"), map);
    var messageTicker = $("#messageTicker");
    var messageTickerContainer = $("#messageTickerContainer");

    var queue = [];

    client.skeleton.gameEvents = function(gameId, events) {
      var alreadyProcessing = queue.length != 0;
      for(var i = 0; i < events.length; ++i) {
        queue.push(events[i]);
      };


      $("#spinner").hide();
      ticker.showMessages(events);
      if(messageTickerContainer.css("display") == "none") {
        $("#showMessageTicker").addClass("highlight");
      }

      function processEvents(callback) {
        function nextEvent() {
          if(queue.length != 0) {
            processEvents(callback);
          } else {
            callback();
          }
        }

        var e = queue.shift();
        if(e.content)
          e = e.content;
        if(e.action == "move") {
          map.moveUnit(e.unit.unitId, e.tile.tileId, e.path, nextEvent);
        } else if(e.action == "wait") {
          map.waitUnit(e.unit.unitId, nextEvent);
        } else if(e.action == "attack") {
          map.attackUnit(e.attacker.unitId, e.target.unitId, e.damage, nextEvent);
        } else if(e.action == "counterattack") {
          map.counterattackUnit(e.attacker.unitId, e.target.unitId, e.damage, nextEvent);
        } else if(e.action == "capture") {
          map.captureTile(e.unit.unitId, e.tile.tileId, e.left, nextEvent);
        } else if(e.action == "captured") {
          map.capturedTile(e.unit.unitId, e.tile.tileId, nextEvent);
        } else if(e.action == "deploy") {
          map.deployUnit(e.unit.unitId, nextEvent);
        } else if(e.action == "undeploy") {
          map.undeployUnit(e.unit.unitId, nextEvent);
        } else if(e.action == "load") {
          map.loadUnit(e.unit.unitId, e.carrier.unitId, nextEvent);
        } else if(e.action == "unload") {
          map.unloadUnit(e.unit.unitId, e.carrier.unitId, e.tile.tileId, nextEvent);
        } else if(e.action == "destroyed") {
          map.destroyUnit(e.unit.unitId, nextEvent);
        } else if(e.action == "repair") {
          map.repairUnit(e.unit.unitId, e.newHealth, nextEvent);
        } else if(e.action == "build") {
          map.buildUnit(e.tile.tileId, e.unit, nextEvent);
        } else if(e.action == "regenerateCapturePoints") {
          map.regenerateCapturePointsTile(e.tile.tileId, e.newCapturePoints, nextEvent);
        } else if(e.action == "produceFunds") {
          map.produceFundsTile(e.tile.tileId, nextEvent);
        } else if(e.action == "beginTurn") {
          map.beginTurn(e.player, nextEvent);
        } else if(e.action == "endTurn") {
          map.endTurn(e.player, nextEvent);
        } else if(e.action == "turnTimeout") {
          map.turnTimeout(e.player, nextEvent);
        } else if(e.action == "finished") {
          map.finished(e.winner, nextEvent);
        } else if(e.action == "surrender") {
          map.surrender(e.player, nextEvent);
        }
      }

      if(!alreadyProcessing) {
        processEvents(function() {
          /*if(map.showPowerMap || map.showBorders) {
            map.powerMap = getPowerMap();
          }*/
        });
      }
    };

    client.stub.gameEvents(gameId, 0, 10, function(response) {
      if(!response.success) {
        alert("Could not get game events! " + response.reason);
      } else {
        ticker.setMessages(response.gameEvents, true);
      }
    });

    $("#showHideMessageTicker").click(function(e) {
      e.preventDefault();
      if(messageTicker.hasClass("small")) {
        messageTicker.removeClass("small");
        $("#content").css("bottom", messageTickerContainer.outerHeight());
      } else {
        messageTicker.addClass("small");
        $("#content").css("bottom", messageTickerContainer.outerHeight());
      }
      messageTicker.scrollTop(0);
    });

    $("#showMessageTicker").click(function(e) {
      e.preventDefault();
      messageTickerContainer.toggle();
      if(messageTickerContainer.css("display") == "none") {
        $("#showMessageTickerStatus").text("Show");
        $("#content").css("bottom", 0);
      } else {
        $("#showMessageTickerStatus").text("Hide");
        $("#showMessageTicker").removeClass("highlight");
        $("#content").css("bottom", messageTickerContainer.outerHeight());
      }
    });

    messageTicker.scroll(function(e) {
      if($(this).scrollTop() + $(this).innerHeight() >= this.scrollHeight - 16) {
        client.stub.gameEvents(gameId, messageTicker.children().length, 10, function(response) {
          if(!response.success) {
            alert("Could not get game events! " + response.reason);
          } else {
            ticker.showOldMessages(response.gameEvents);
          }
        });
      }
    });
  }

  function initializePlayers(players) {
    players.sort(function(a, b) { return a.playerNumber - b.playerNumber; });
    var playerList = $("#players");
    for(var i = 0; i < players.length; ++i) {
      var player = players[i];
      if(player.playerName === null) continue;

      var item = $("<li></li>");
      var number = $("<span></span>");
      var name = $("<span></span>");

      item.addClass("playerItem");
      if(player.playerNumber == inTurnNumber) {
        item.addClass("inTurn");
        if(player.isMe && !finished) {
          initializeTurn(player.playerNumber);
        } else {
          finalizeTurn();
        }
      }
      if(player.isMe) {
        item.addClass("isMe");
      }
      item.attr("playerNumber", player.playerNumber);

      number.text(player.playerNumber);
      number.css("background-color", theme.getPlayerColorString(player.playerNumber));
      number.addClass("playerNumber");

      name.text(player.playerName !== null ? player.playerName : "");
      name.addClass("playerName");

      item.append(number);
      item.append(name);

      if(player.isMe) {
        var star = $("<span>\u2605</span>");
        star.addClass("selfIndicator");
        item.append(star);
      }

      playerList.append(item);
    }
  }

  function initializeTurn() {
    inTurn = true;
    refreshFunds();
    $(".turnAction").show();
  }

  function finalizeTurn() {
    inTurn = false;
    refreshFunds();
    $(".turnAction").hide();
  }

  function handleMapClick(e) {
    if(finished) return;

    var buildMenu = $("#buildMenu");
    var canvas = $("#mapCanvas");
    var content = $("#content");
    var canvasPosition = {x: e.pageX - e.currentTarget.offsetLeft,
                          y: e.pageY - e.currentTarget.offsetTop};
    var windowPosition = {x: e.pageX, y: e.pageY};
    var hexCoords = map.coordToTile(canvasPosition.x, canvasPosition.y);
    var tilePosition = {x: hexCoords.e(1), y: hexCoords.e(2)};

    if(inTurn) {
      buildMenu.hide();
      if(gameUIState.stateName == "select") {
        handleSelectMapClick(tilePosition, canvasPosition);
      } else if(gameUIState.stateName == "move") {
        handleMoveMapClick(tilePosition, canvasPosition);
      } else if(gameUIState.stateName == "action") {
        handleActionMapClick();
      } else if(gameUIState.stateName == "attack") {
        handleAttackMapClick(tilePosition)
      } else if(gameUIState.stateName == "unloadUnit") {
        handleUnloadUnitMapClick();
      } else if(gameUIState.stateName == "unloadTarget") {
        handleUnloadTargetMapClick(tilePosition);
      }
    }
  }

  function handleSelectMapClick(tilePosition, canvasPosition) {
    if(gameLogic.tileHasMovableUnit(inTurnNumber, tilePosition.x, tilePosition.y)) {
      var movementOptions = gameLogic.unitMovementOptions(tilePosition.x, tilePosition.y);
      map.paintMovementMask(movementOptions);

      if(movementOptions.length > 1) {
        gameUIState = {
          stateName: "move",
          x: tilePosition.x,
          y: tilePosition.y,
          movementOptions: movementOptions
        };
      } else {
        map.hideOverlay();
        switchToActionState(tilePosition.x, tilePosition.y, tilePosition.x, tilePosition.y,
                            [{x: tilePosition.x, y: tilePosition.y}], movementOptions, canvasPosition);
      }
    } else if(gameLogic.tileCanBuild(inTurnNumber, tilePosition.x, tilePosition.y)) {
      var buildOptions = gameLogic.tileBuildOptions(tilePosition.x, tilePosition.y);
      showBuildMenu(buildOptions, canvasPosition, tilePosition);
    }
  }

  function handleMoveMapClick(tilePosition, canvasPosition) {
    map.refresh();
    var x = gameUIState.x;
    var y = gameUIState.y;
    var dx = tilePosition.x;
    var dy = tilePosition.y;
    var canMove = false;
    var path = null;

    for(var i = 0; i < gameUIState.movementOptions.length; ++i) {
      var option = gameUIState.movementOptions[i];
      if(option.pos.x == dx && option.pos.y == dy) {
        canMove = true;
        var node = option;
        path = [node.pos];
        while(node.prev) {
          path.push(node.prev.pos);
          node = node.prev;
        }
        path.reverse();
        break;
      }
    }

    if(!canMove) {
      gameUIState = {stateName: "select"};
      map.refresh();
    } else {
      var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
      map.showMoveUnit(unitId, path, function() {
        switchToActionState(x, y, dx, dy, path, gameUIState.movementOptions, canvasPosition);
      });
    }
  }

  function handleActionMapClick() {
    undoMove();
  }

  function handleAttackMapClick(tilePosition) {
    map.refresh();
    map.hideOverlay();
    var tx = tilePosition.x;
    var ty = tilePosition.y;
    var canAttack = false;

    for(var i = 0; i < gameUIState.attackOptions.length; ++i) {
      var option = gameUIState.attackOptions[i];
      if(option.pos.x == tx && option.pos.y == ty) {
        canAttack = true;
        break;
      }
    }

    if(!canAttack) {
      undoMove();
    } else {
      var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
      var destination = {x: gameUIState.dx, y: gameUIState.dy};
      var targetId = map.getTile(tx, ty).unit.unitId;
      $("#spinner").show();
      client.stub.moveAndAttack(gameId, unitId, destination, gameUIState.path, targetId, function(response) {
        if(!response.success) {
          alert(response.reason);
        }
        gameUIState = {stateName: "select"};
      });
    }
  }

  function handlUnloadUnitMapClick() {
    undoMove();
  }

  function handleUnloadTargetMapClick(tilePosition) {
    map.refresh();
    map.hideOverlay();
    var tx = tilePosition.x;
    var ty = tilePosition.y;
    var canUnload = false;

    for(var i = 0; i < gameUIState.unloadTargetOptions.length; ++i) {
      var option = gameUIState.unloadTargetOptions[i];
      if(option.x == tx && option.y == ty) {
        canUnload = true;
        break;
      }
    }

    if(!canUnload) {
      undoMove();
    } else {
      var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
      var destination = {x: gameUIState.dx, y: gameUIState.dy};
      var carriedUnitId = gameUIState.carriedUnitId;
      var unloadDestination = {x: tx, y: ty};
      $("#spinner").show();
      client.stub.moveAndUnload(gameId, unitId, destination, gameUIState.path, carriedUnitId, unloadDestination, function(response) {
        if(!response.success) {
          alert(response.reason);
        }
        gameUIState = {stateName: "select"};
      });
    }
  }

  function undoMove() {
    if(gameUIState.stateName !== "select") {
      var tile = map.getTile(gameUIState.x, gameUIState.y);
      if(tile && tile.unit && gameUIState.path) {
        var unitId = tile.unit.unitId;
        gameUIState.path.reverse();
        map.showMoveUnit(unitId, gameUIState.path);
      }
    }
    gameUIState = {stateName: "select"};
    map.refresh();
    map.hideOverlay();

    $("#actionMenu").hide();
    $("#unloadMenu").hide();
    $("#buildMenu").hide();
  }

  function switchToActionState(x, y, dx, dy, path, movementOptions, canvasPosition) {
    gameUIState = {
      stateName: "action",
      x: x,
      y: y,
      dx: dx,
      dy: dy,
      path: path
    }

    var actions = [];
    if(gameLogic.unitCanLoadInto(x, y, dx, dy)) {
      actions.push("load");
    } else {
      if(gameLogic.unitCanUnload(x, y, dx, dy))
        actions.push("unload");
      if(gameLogic.unitAttackOptions(x, y, dx, dy).length > 0)
        actions.push("attack");
      if(gameLogic.unitCanCapture(x, y, dx, dy))
        actions.push("capture");
      if(gameLogic.unitCanDeploy(x, y, dx, dy))
        actions.push("deploy");
      if(gameLogic.unitCanUndeploy(x, y, dx, dy))
        actions.push("undeploy");
      if(gameLogic.unitCanWait(x, y, dx, dy))
        actions.push("wait");
    }
    actions.push("cancel");
    showActionMenu(actions, canvasPosition);
  }

  function fitElement(numItems, itemWidth, itemHeight, content) {
    var gridOptimalWidth = Math.ceil(Math.sqrt(numItems));
    var gridOptimalHeight = Math.ceil(numItems / gridOptimalWidth);

    var optimalWidth = itemWidth * gridOptimalWidth;
    var optimalHeight = itemHeight * gridOptimalHeight;

    var maxWidth = content.width();
    var maxHeight = content.height();

    var width = optimalWidth;
    var height = optimalHeight;

    if(width > maxWidth) {
      var gridWidth = parseInt(maxWidth/itemWidth);
      var gridHeight = Math.ceil(numItems / gridWidth);
      width = gridWidth * itemWidth;
      height = gridHeight * itemHeight;
    }
    if(height > maxHeight) {
      height = maxHeight;
    }

    return {width: width, height: height};
  }

  function clampElement(left, top, width, height, content) {
    var minLeft = content.scrollLeft();
    var minTop = content.scrollTop();
    var maxRight = content.scrollLeft() + content.width();
    var maxBottom = content.scrollTop() + content.height();;

    if(left < minLeft) {
      left = minLeft;
    } else if(left + width > maxRight) {
      left = maxRight - width;
    }

    if(top < minTop) {
      top = minTop;
    } else if(top + height > maxBottom) {
      top = maxBottom - height;
    }

    return {left: left, top: top};
  }

  function showActionMenu(actions, canvasPosition) {
    var actionMenu = $("#actionMenu");
    var content = $("#content");
    var size = fitElement(actions.length, 48, 48, content);
    var optimalLeft = canvasPosition.x;
    var optimalTop = canvasPosition.y;
    var position = clampElement(optimalLeft, optimalTop, size.width, size.height, content);
    actionMenu.empty();
    actionMenu.width(size.width);
    actionMenu.height(size.height);
    actionMenu.css("left", position.left)
    actionMenu.css("top", position.top)
    actionMenu.show();

    var actionMap = {
      attack: {img:theme.getAttackIconUrl(), name:"Attack", action:"attack"},
      deploy: {img:theme.getDeployIconUrl(), name:"Deploy", action:"deploy"},
      undeploy: {img:theme.getUndeployIconUrl(), name:"Undeploy", action:"undeploy"},
      capture: {img:theme.getCaptureIconUrl(), name:"Capture", action:"capture"},
      wait: {img:theme.getWaitIconUrl(), name:"Wait", action:"wait"},
      load: {img:theme.getLoadIconUrl(), name:"Load", action:"load"},
      unload: {img:theme.getUnloadIconUrl(), name:"Unload", action:"unload"},
      cancel: {img:theme.getCancelIconUrl(), name:"Cancel", action:"cancel"}
    }

    for(var i = 0; i < actions.length; ++i) {
      var action = actionMap[actions[i]];
      var item = $("<img></img>");
      item.addClass("actionItem");
      item.attr("src", action.img);
      item.attr("alt", action.name);
      item.attr("action", action.action);
      actionMenu.append(item);
    }

    $(".actionItem").click(function(e) {
      var action = $(this).attr("action");
      actionMenu.hide();

      function resetUI(response) {
        if(!response.success) {
          alert(response.reason);
        }
        map.refresh();
        gameUIState = {stateName: "select"};
      }

      if(action == "cancel") {
        undoMove();
      } else if(action == "attack") {
        gameUIState = {
          stateName: "attack",
          attackOptions: gameLogic.unitAttackOptions(gameUIState.x, gameUIState.y, gameUIState.dx, gameUIState.dy),
          x: gameUIState.x,
          y: gameUIState.y,
          dx: gameUIState.dx,
          dy: gameUIState.dy,
          path: gameUIState.path
        };
        map.paintAttackMask(gameUIState.attackOptions);

      } else if(action == "wait") {
        var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
        var destination = {x: gameUIState.dx, y: gameUIState.dy};
        $("#spinner").show();
        client.stub.moveAndWait(gameId, unitId, destination, gameUIState.path, resetUI);
      } else if(action == "capture") {
        var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
        var destination = {x: gameUIState.dx, y: gameUIState.dy};
        $("#spinner").show();
        client.stub.moveAndCapture(gameId, unitId, destination, gameUIState.path, resetUI);
      } else if(action == "deploy") {
        var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
        var destination = {x: gameUIState.dx, y: gameUIState.dy};
        $("#spinner").show();
        client.stub.moveAndDeploy(gameId, unitId, destination, gameUIState.path, resetUI);
      } else if(action == "undeploy") {
        var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
        $("#spinner").show();
        client.stub.undeploy(gameId, unitId, resetUI);
      } else if(action == "load") {
        var unitId = map.getTile(gameUIState.x, gameUIState.y).unit.unitId;
        var carrierId = map.getTile(gameUIState.dx, gameUIState.dy).unit.unitId;
        $("#spinner").show();
        client.stub.moveAndLoadInto(gameId, unitId, carrierId, gameUIState.path, resetUI);
      } else if(action == "unload") {
        gameUIState = {
          stateName: "unloadUnit",
          unloadOptions: gameLogic.unitUnloadOptions(gameUIState.x, gameUIState.y, gameUIState.dx, gameUIState.dy),
          x: gameUIState.x,
          y: gameUIState.y,
          dx: gameUIState.dx,
          dy: gameUIState.dy,
          path: gameUIState.path
        };
        showUnloadMenu(gameUIState.unloadOptions, canvasPosition);
      }
    });
  }

  function showUnloadMenu(units, canvasPosition) {
    var unloadMenu = $("#unloadMenu");
    var content = $("#content");
    var size = fitElement(units.length, theme.settings.image.width + 12, theme.settings.image.height + 12, content);
    var optimalLeft = canvasPosition.x;
    var optimalTop = canvasPosition.y;
    var position = clampElement(optimalLeft, optimalTop, size.width, size.height, content);
    unloadMenu.empty();
    unloadMenu.width(size.width);
    unloadMenu.height(size.height);
    unloadMenu.css("left", position.left)
    unloadMenu.css("top", position.top)
    unloadMenu.show();

    for(var i = 0; i < units.length; ++i) {
      var unit = units[i];
      var item = $('<span></span>');
      item.css("background-image", "url('" + theme.getSpriteSheetUrl() + "')");
      item.addClass("sprite");
      item.css("width", theme.settings.image.width);
      item.css("height", theme.settings.image.height);
      var pos = theme.getUnitCoordinates(unit.type, inTurnNumber);
      item.css("background-position", -pos.x + "px " + -pos.y + "px")
      item.addClass("unloadItem");
      item.attr("unitId", unit.unitId);
      unloadMenu.append(item);
    }

    $(".unloadItem").click(function(e) {
      var carriedUnitId = $(this).attr("unitId");
      var unloadTargetOptions = gameLogic.unitUnloadTargetOptions(gameUIState.x, gameUIState.y, gameUIState.dx,
                                                                  gameUIState.dy, carriedUnitId);
      gameUIState = {
        stateName: "unloadTarget",
        unloadTargetOptions: unloadTargetOptions,
        carriedUnitId: carriedUnitId,
        x: gameUIState.x,
        y: gameUIState.y,
        dx: gameUIState.dx,
        dy: gameUIState.dy,
        path: gameUIState.path
      };
      map.paintUnloadMask(unloadTargetOptions);
      unloadMenu.hide();
    });
  }

  function showBuildMenu(buildOptions, canvasPosition, tilePosition) {
    var buildMenu = $("#buildMenu");
    var content = $("#content");

    var size = fitElement(buildOptions.length, 140, 140, content);
    var optimalLeft = canvasPosition.x - size.width/2;
    var optimalTop = canvasPosition.y - size.height/2;
    var position = clampElement(optimalLeft, optimalTop, size.width, size.height, content);

    buildMenu.empty();
    buildMenu.width(size.width);
    buildMenu.height(size.height);
    buildMenu.css("left", position.left)
    buildMenu.css("top", position.top)
    buildMenu.show();

    for(var i = 0; i < buildOptions.length; ++i) {
      var unitType = buildOptions[i];
      var buildItem = $("<span></span>");
      buildItem.addClass("buildItem");
      buildItem.attr("unitTypeId", unitType.id);

      var unitPrice = $('<span></span>');
      unitPrice.text(unitType.price);
      unitPrice.addClass('price');

      var unitName = $('<span></span>');
      unitName.text(unitType.name);
      unitName.addClass('name');

      var unitImage = $('<div></div>');
      unitImage.css("background-image", "url('" + theme.getSpriteSheetUrl() + "')");
      unitImage.addClass("sprite");
      var pos = theme.getUnitCoordinates(unitType.id, inTurnNumber);
      unitImage.css("background-position", -pos.x + "px " + -pos.y + "px");
      unitImage.css("width", theme.settings.image.width);
      unitImage.css("height", theme.settings.image.height);
      buildItem.append(unitPrice);
      buildItem.append(unitImage);
      buildItem.append(unitName);

      var funds = parseInt($("#funds").text());

      if(parseInt(unitType.price) <= funds) {
        buildItem.click(function() {
          var unitTypeId = parseInt($(this).attr("unitTypeId"));
          $("#spinner").show();
          client.stub.build(gameId, unitTypeId, {x: tilePosition.x, y: tilePosition.y}, function(response) {
            if(response.success) {
              refreshFunds();
            } else {
              alert("Error building unit! " + response.reason);
            }
            buildMenu.hide();
          });
        });
      } else {
        buildItem.addClass("disabled");
      }

      buildMenu.append(buildItem);
    }
  }

  function updateStatistic() {
    client.stub.gameLatestStatistic(gameId, function(response) {
      if(response.latestStatistic === null)
        return;

      var latestStatistic = response.latestStatistic;
      var container = d3.select("#gameStatistic");
      container.selectAll("div").remove();

      var data = latestStatistic.content.sort(function(a, b){return a.playerNumber - b.playerNumber;});

      function addChart(container, data, property, icon) {
        var chart = container.append("div").attr("class", "statisticBarChart").attr("chartProperty", property);
        chart.append("div").attr("class", "label").append("i").attr("class", "icon-" + icon);

        // Needed to have all the chart elements laid out correctly before adding content
        //setTimeout(function() {
          var width = $(".statisticBarChart[chartProperty=\"" + property + "\"]").innerWidth() - 10;
          var height = 8;
          var totalValue = d3.sum(data, function(d){ return d[property]; });
          var scale = d3.scale.linear()
            .domain([0, totalValue])
            .range(["0px", width + "px"]);

          chart.selectAll(".bar")
            .data(data)
            .enter().append("div")
              .style("width", function(d) { 
                var foo = scale(d[property]); 
                return foo;
              })
              .style("height", height + "px")
              .style("background-color", function(d) { return theme.getPlayerColorString(d.playerNumber); })
              .attr("class", function(d) { return "bar"})
              .attr("title", function(d){ return Math.round(100*d[property]/totalValue) + "%" });
        //}, 0);
      }

      addChart(container, data, "score", "trophy");
      addChart(container, data, "power", "chevron-up");
      addChart(container, data, "property", "globe");
    });
  }

  function getPowerMap() {
    if(powerMap === null) {
      powerMap = gameLogic.getPowerMap();
    }
    return powerMap;
  }
});