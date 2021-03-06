require ["gamenode", "base"], ->
  client = new GameNodeClient(Skeleton)
  session = null
  initialPage = /(\d+)/.exec(window.location.hash)
  paginator = null
  
  if initialPage isnt null
    initialPage = parseInt(initialPage[1])
  else
    initialPage = 1
    window.location.hash = initialPage
    
  $(document).ready ->
    loginUrl = "login.html?next=" + document.location.pathname + document.location.search
    session = resumeSessionOrRedirect client, WARS_CLIENT_SETTINGS.gameServer, loginUrl, ->
      populateNavigation session
      populatePublicGames client

  updatePageControls = ->
    $("#firstPage").attr("href", "#" + paginator.firstPage()).toggle paginator.currentPage isnt paginator.firstPage()
    $("#lastPage").attr("href", "#" + paginator.lastPage()).toggle paginator.currentPage isnt paginator.lastPage()
    $("#prevPage").attr("href", "#" + paginator.prevPage()).toggle paginator.currentPage isnt paginator.firstPage()
    $("#nextPage").attr("href", "#" + paginator.nextPage()).toggle paginator.currentPage isnt paginator.lastPage()
    $(".pageLink").removeClass "current"
    $(".pageLink[page=\"" + paginator.currentPage + "\"]").addClass "current"
    
  populatePublicGames = (client) ->
    client.stub.publicGames null, (response) ->
      changePage = (e, page) ->
        e.preventDefault()
        paginator.setPage page
        window.location.hash = page
        updatePageControls()
      unless response.success
        alert "Error loading games! " + response.reason
        return
      games = $("#games tbody")
      paginator = new Paginator response.games, (-> games.empty()), (game) ->
        row = $("<tr></tr>")
        nameItem = $("<td></td>")
        mapItem = $("<td></td>")
        playersItem = $("<td></td>")
        gameRoundItem = $("<td></td>")
        name = $("<a></a>")
        map = $("<a></a>")
        players = $("<a></a>")
        gameRound = $("<a></a>")
        name.text game.name
        map.text game.map.name
        players.text game.numPlayers
        gameRound.text game.round
        nameItem.append name
        mapItem.append map
        playersItem.append players
        gameRoundItem.append gameRound
        row.append nameItem
        row.append mapItem
        row.append playersItem
        row.append gameRoundItem
        $("a", row).attr "href", "game.html?gameId=" + game.gameId
        games.append row

      paginator.setPage initialPage
      pages = $("#pages")

      numPages = paginator.pages() 
      for i in [1..numPages]
        pageLink = $("<a></a>")
        pageLink.text i
        pageLink.attr "href", "#" + i
        pageLink.attr "page", i
        pageLink.addClass "pageLink"
        pages.append pageLink

      updatePageControls()
      $(".pageLink").click (e) -> changePage e, parseInt($(this).attr("page"))
      $("#firstPage").click (e) -> changePage e, paginator.firstPage()
      $("#lastPage").click (e) -> changePage e, paginator.lastPage()
      $("#nextPage").click (e) -> changePage e, paginator.nextPage()
      $("#prevPage").click (e) -> changePage e, paginator.prevPage()
      $("#pageControls").hide()  if paginator.pages() is 1
