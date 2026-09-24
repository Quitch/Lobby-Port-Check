(function () {
  try {
    // is_local_game is also true for a player joining someone else's local
    // server. Only a start with local=true launches one here. See design.md.
    var localHost = ko
      .observable()
      .extend({ session: "lobbyportcheck_local_host" });
    localHost(
      $.url().param("action") === "start" && $.url().param("local") === "true"
    );
  } catch (e) {
    console.error("Lobby Port Check: " + (e.stack || e.message || e));
  }
})();
