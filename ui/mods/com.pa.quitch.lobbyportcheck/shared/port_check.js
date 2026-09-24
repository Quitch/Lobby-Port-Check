function lobbyPortCheck(scene) {
  var core = lobbyPortCheckCore;
  var localHost = ko
    .observable()
    .extend({ session: "lobbyportcheck_local_host" });
  var result = ko.observable("checking");
  var requestToken = 0;

  var port = ko.computed(function () {
    return core.resolvePort(model.gamePort());
  });

  var decision = ko.computed(function () {
    return core.decideState({
      localHost: localHost() === true,
      isCreator: scene.isCreator(),
      hidden: scene.hidden(),
      transport: api.net.effectiveLocalHostTransport(),
    });
  });

  var settled = ko.observable(decision());

  var state = ko.computed(function () {
    var decided = settled();
    return decided === "check" ? result() : decided;
  });

  var runCheck = function () {
    if (settled() !== "check") {
      return;
    }
    requestToken += 1;
    var token = requestToken;
    var checkedPort = port();
    var upnpAttempts = 0;
    var settle = function (outcome) {
      if (token === requestToken && settled() === "check") {
        result(outcome);
      }
    };
    var send = function () {
      $.ajax({
        url: "https://ifconfig.co/port/" + checkedPort,
        dataType: "json",
        headers: { Accept: "application/json" },
        timeout: 10000,
      })
        .done(function (body, textStatus, jqXHR) {
          settle(core.interpretResponse(checkedPort, jqXHR.status, body));
        })
        .fail(function () {
          settle("unknown");
        });
    };
    // The server maps the port through UPnP after it starts, and answers
    // upnp_status with "" until the router replies. See design.md.
    var awaitUpnp = function () {
      if (token !== requestToken) {
        return;
      }
      model.send_message("upnp_status", {}, function (success, status) {
        if (token !== requestToken) {
          return;
        }
        upnpAttempts += 1;
        if (core.upnpPending(success, status) && upnpAttempts < 10) {
          _.delay(awaitUpnp, 1000);
          return;
        }
        send();
      });
    };
    if (scene.awaitUpnp && api.net.effectiveLocalHostTransport() === "UPNP") {
      awaitUpnp();
    } else {
      send();
    }
  };
  var scheduleCheck = _.debounce(runCheck, 1000);

  decision.subscribe(function () {
    // Stock setPublicGame and setFriendsOnlyGame clear one flag before
    // setting the other, so the lobby reads as Private for a moment.
    // Acting a tick later sees only the settled value. See design.md.
    _.defer(function () {
      var decided = decision();
      if (decided === settled()) {
        return;
      }
      requestToken += 1;
      if (decided === "check") {
        result("checking");
        scheduleCheck();
      }
      settled(decided);
    });
  });

  // Scene mods load before registerWithCoherent defines model.send_message.
  if (settled() === "check") {
    scheduleCheck();
  }

  var label = ko.computed(function () {
    return core.label(state()) || core.label("unknown");
  });

  model.lobbyPortCheck = {
    visible: ko.computed(function () {
      return state() !== "hidden";
    }),
    state: state,
    glyph: ko.computed(function () {
      return label().glyph;
    }),
    text: ko.computed(function () {
      return loc(label().text, { port: port() });
    }),
  };

  scene.insert(
    loadHtml(
      "coui://ui/mods/com.pa.quitch.lobbyportcheck/shared/port_check.html"
    )
  );
}
