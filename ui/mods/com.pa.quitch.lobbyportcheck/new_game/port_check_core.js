var lobbyPortCheckCore = (function () {
  var DEFAULT_PORT = 20545;

  var LABELS = {
    open: { glyph: "✔", text: "!LOC:Port __port__ open" },
    closed: {
      glyph: "✖",
      text: "!LOC:Port __port__ closed: players may not be able to join",
    },
    unknown: { glyph: "?", text: "!LOC:Port __port__ status unknown" },
    checking: { glyph: "⋯", text: "!LOC:Checking port __port__" },
    private: { glyph: "—", text: "!LOC:Private: port not checked" },
    steam: {
      glyph: "—",
      text: "!LOC:Steam networking: no open port needed",
    },
  };

  function resolvePort(raw) {
    if (typeof raw !== "number" && typeof raw !== "string") {
      return DEFAULT_PORT;
    }
    if (typeof raw === "string" && !/^\s*\d+\s*$/.test(raw)) {
      return DEFAULT_PORT;
    }
    var port = Number(raw);
    if (port % 1 !== 0 || port < 1 || port > 65535) {
      return DEFAULT_PORT;
    }
    return port;
  }

  function decideState(input) {
    if (!input.localHost || !input.isCreator) {
      return "hidden";
    }
    if (input.hidden) {
      return "private";
    }
    if (input.transport === "STEAM") {
      return "steam";
    }
    return "check";
  }

  function interpretResponse(port, status, body) {
    if (status !== 200) {
      return "unknown";
    }
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch (e) {
        return "unknown";
      }
    }
    if (!body || typeof body !== "object") {
      return "unknown";
    }
    if (body.port !== port || typeof body.reachable !== "boolean") {
      return "unknown";
    }
    return body.reachable ? "open" : "closed";
  }

  function label(state) {
    return LABELS[state];
  }

  return {
    DEFAULT_PORT: DEFAULT_PORT,
    resolvePort: resolvePort,
    decideState: decideState,
    interpretResponse: interpretResponse,
    label: label,
  };
})();

if (typeof module !== "undefined") {
  module.exports = lobbyPortCheckCore;
}
