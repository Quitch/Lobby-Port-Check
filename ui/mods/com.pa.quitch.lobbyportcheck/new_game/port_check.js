(function () {
  try {
    lobbyPortCheck({
      isCreator: model.isGameCreator,
      hidden: model.isHiddenGame,
      awaitUpnp: true,
      insert: function (html) {
        $(".toolbar_user_mgmt").after(html);
      },
    });
  } catch (e) {
    console.error("Lobby Port Check: " + (e.stack || e.message || e));
  }
})();
