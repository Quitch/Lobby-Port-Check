"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const core = require("../ui/mods/com.pa.quitch.lobbyportcheck/new_game/port_check_core.js");

describe("resolvePort", () => {
  it("keeps a valid port", () => {
    assert.equal(core.resolvePort(20545), 20545);
    assert.equal(core.resolvePort(1), 1);
    assert.equal(core.resolvePort(65535), 65535);
  });

  it("accepts a numeric string", () => {
    assert.equal(core.resolvePort("20546"), 20546);
  });

  it("falls back to 20545 for anything else", () => {
    for (const raw of [
      undefined,
      null,
      "",
      "abc",
      "20545.5",
      "-1",
      0,
      65536,
      1.5,
      NaN,
      Infinity,
      true,
      {},
    ]) {
      assert.equal(core.resolvePort(raw), 20545, String(raw));
    }
  });
});

describe("decideState", () => {
  const base = {
    localHost: true,
    isCreator: true,
    hidden: false,
    transport: "TCP",
  };

  it("hides for a client that did not start the server", () => {
    assert.equal(core.decideState({ ...base, localHost: false }), "hidden");
  });

  it("hides for a player who is not the game creator", () => {
    assert.equal(core.decideState({ ...base, isCreator: false }), "hidden");
  });

  it("does not check a private lobby", () => {
    assert.equal(core.decideState({ ...base, hidden: true }), "private");
    assert.equal(
      core.decideState({ ...base, hidden: true, transport: "STEAM" }),
      "private"
    );
  });

  it("does not check Steam networking", () => {
    assert.equal(core.decideState({ ...base, transport: "STEAM" }), "steam");
  });

  it("checks an open lobby on TCP or UPnP", () => {
    assert.equal(core.decideState(base), "check");
    assert.equal(core.decideState({ ...base, transport: "UPNP" }), "check");
  });
});

describe("interpretResponse", () => {
  const ok = { ip: "203.0.113.1", port: 20545, reachable: true };

  it("reads open and closed", () => {
    assert.equal(core.interpretResponse(20545, 200, ok), "open");
    assert.equal(
      core.interpretResponse(20545, 200, { ...ok, reachable: false }),
      "closed"
    );
  });

  it("parses a JSON string body", () => {
    assert.equal(
      core.interpretResponse(20545, 200, JSON.stringify(ok)),
      "open"
    );
  });

  it("is unknown for any other status", () => {
    for (const status of [0, 204, 429, 500, "200"]) {
      assert.equal(core.interpretResponse(20545, status, ok), "unknown");
    }
  });

  it("is unknown for an unusable body", () => {
    for (const body of [
      undefined,
      null,
      "",
      "not json",
      "true",
      42,
      [],
      { ...ok, port: 20546 },
      { ...ok, port: "20545" },
      { ...ok, reachable: "true" },
      { ip: ok.ip, port: ok.port },
    ]) {
      assert.equal(
        core.interpretResponse(20545, 200, body),
        "unknown",
        JSON.stringify(body)
      );
    }
  });
});

describe("upnpPending", () => {
  it("waits while the server has no UPnP result", () => {
    for (const status of ["", undefined, null]) {
      assert.equal(core.upnpPending(true, status), true, String(status));
    }
  });

  it("waits when the request fails", () => {
    assert.equal(core.upnpPending(false, "OK"), true);
  });

  it("stops waiting on success or on a UPnP error", () => {
    assert.equal(core.upnpPending(true, "OK"), false);
    assert.equal(
      core.upnpPending(true, "Error 718: ConflictInMappingEntry"),
      false
    );
  });
});

describe("label", () => {
  const states = ["open", "closed", "unknown", "checking", "private", "steam"];

  it("gives every visible state a glyph and translatable text", () => {
    for (const state of states) {
      const label = core.label(state);
      assert.equal(typeof label.glyph, "string", state);
      assert.match(label.text, /^!LOC:/, state);
    }
  });

  it("never tells check results apart by colour alone", () => {
    const glyphs = ["open", "closed", "unknown", "checking"].map(
      (state) => core.label(state).glyph
    );
    assert.equal(new Set(glyphs).size, glyphs.length);
  });

  it("names the port in every check result", () => {
    for (const state of ["open", "closed", "unknown", "checking"]) {
      assert.match(core.label(state).text, /__port__/, state);
    }
  });

  it("has no label for the hidden state", () => {
    assert.equal(core.label("hidden"), undefined);
  });
});
