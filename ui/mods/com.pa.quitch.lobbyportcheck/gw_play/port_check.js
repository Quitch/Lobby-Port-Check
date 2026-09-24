(function () {
  try {
    lobbyPortCheck({
      isCreator: function () {
        return model.isCampaignHost() && model.gwCampaignActive();
      },
      hidden: function () {
        return model.visibilityMode() === "private";
      },
      // The gw_campaign server has no upnp_status handler and never answers
      // it. See design.md.
      awaitUpnp: false,
      insert: function (html) {
        $("#gw-campaign-settings .gw-settings-title-row").after(html);
      },
    });
  } catch (e) {
    console.error("Lobby Port Check: " + (e.stack || e.message || e));
  }
})();
