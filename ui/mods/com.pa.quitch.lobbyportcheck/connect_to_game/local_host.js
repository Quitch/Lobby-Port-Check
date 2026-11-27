(function () {
  try {
    // is_local_game is also true for a player joining someone else's local
    // server. Only a start with local=true launches one here. See design.md.
    var started =
      $.url().param("action") === "start" && $.url().param("local") === "true";
    var localHost = ko
      .observable()
      .extend({ session: "lobbyportcheck_local_host" });
    // gw_play passes the setting it read at load, which the session key
    // only start.js syncs can contradict. See design.md.
    var transport = ko
      .observable()
      .extend({ session: "lobbyportcheck_transport" });
    localHost(started);
    transport(
      started
        ? lobbyPortCheckCore.startTransport(
            $.url().param("params"),
            api.net.effectiveLocalHostTransport()
          )
        : null
    );
  } catch (e) {
    console.error("Lobby Port Check: " + (e.stack || e.message || e));
  }
})();
