"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const core = require("../ui/mods/com.pa.quitch.lobbyportcheck/shared/port_check_core.js");

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

describe("planCheck", () => {
  const minute = core.RECHECK_INTERVAL;
  const now = 1_000_000;
  const last = { port: 20545, sentAt: now - 10_000, result: "closed" };

  it("allows one request a minute", () => {
    assert.equal(minute, 60_000);
  });

  it("sends when nothing was sent before", () => {
    for (const stored of [undefined, null, "", 42, "x", {}, []]) {
      assert.deepEqual(
        core.planCheck(stored, 20545, now),
        { action: "send" },
        JSON.stringify(stored)
      );
    }
  });

  it("sends when the time of the last request is unusable", () => {
    for (const sentAt of ["999990", null, NaN, Infinity, -Infinity]) {
      assert.deepEqual(core.planCheck({ ...last, sentAt }, 20545, now), {
        action: "send",
      });
    }
  });

  it("sends a minute or more after the last request", () => {
    for (const sentAt of [now - minute, now - minute - 1, 0]) {
      assert.deepEqual(core.planCheck({ ...last, sentAt }, 20545, now), {
        action: "send",
      });
    }
  });

  it("sends when the last request is in the future", () => {
    assert.deepEqual(core.planCheck({ ...last, sentAt: now + 1 }, 20545, now), {
      action: "send",
    });
  });

  it("reuses the last result for the same port inside a minute", () => {
    for (const result of ["open", "closed", "unknown"]) {
      assert.deepEqual(core.planCheck({ ...last, result }, 20545, now), {
        action: "reuse",
        result,
      });
    }
    assert.deepEqual(
      core.planCheck({ ...last, sentAt: now - minute + 1 }, 20545, now),
      { action: "reuse", result: "closed" }
    );
    assert.deepEqual(core.planCheck({ ...last, sentAt: now }, 20545, now), {
      action: "reuse",
      result: "closed",
    });
  });

  it("waits out the minute when there is no result to reuse", () => {
    for (const result of [null, undefined, "checking", "private", "OPEN"]) {
      assert.deepEqual(core.planCheck({ ...last, result }, 20545, now), {
        action: "wait",
        delay: 50_000,
      });
    }
  });

  it("waits out the minute for a different port", () => {
    assert.deepEqual(core.planCheck(last, 20546, now), {
      action: "wait",
      delay: 50_000,
    });
    assert.deepEqual(core.planCheck({ ...last, port: "20545" }, 20545, now), {
      action: "wait",
      delay: 50_000,
    });
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
