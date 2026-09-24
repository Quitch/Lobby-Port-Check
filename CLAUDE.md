# CLAUDE.md

## What this is

Lobby Port Check is a client mod for Planetary Annihilation: TITANS. In the `new_game`
lobby and the Galactic War co-op lobby panel (`gw_play`) it shows the host of a local server
whether the server's port can be reached from the internet, using `https://ifconfig.co/port/<n>`. There is no build step, only lint and
tests.

The base game install (a `media` folder under Steam's `.../Planetary Annihilation
Titans/`) is not part of this repo. If it is set up as an additional workspace root, its
own `CLAUDE.md` identifies it. Treat it as read-only reference. Never edit anything there.

## Architecture

[`docs/design.md`](docs/design.md) is the single design document: who sees the indicator
and why, the states, the debounce and stale-response rules, placement, and the WCAG 2.2
AAA decisions. Read it before changing anything.

- `local_host.js` (`connect_to_game`) records whether this client started a local server.
- `shared/` holds what both lobby scenes load. Each scene list in `modinfo.json` loads
  `port_check_core.js`, then `shared/port_check.js`, then the scene's own `port_check.js`.
- `shared/port_check_core.js` is pure logic with no DOM, exported to Node for the tests.
- `shared/port_check.js` defines `lobbyPortCheck(scene)`, which wires knockout
  observables, sends the request and inserts `shared/port_check.html`.
- `new_game/port_check.js` and `gw_play/port_check.js` are adapters: they tell
  `lobbyPortCheck` who the creator is, whether the lobby is private, whether to wait for
  UPnP, and where the indicator goes.

## Constraints

Shipped `ui/**` must be ES5 / Chrome 40 safe: no `let`, arrow functions, template
literals or `class`. A parse error takes out the whole script, not the line.
`eslint.config.mjs` is the whitelist and is exhaustive — no entry means no. lodash is
3.9.3, so v4 names are absent. CSS is checked against `chrome 40` by
`stylelint.config.mjs`. Beat stock styles by specificity, not `!important`.

Every text colour in `port_check.css` must reach 7:1 against the indicator background;
`test/contrast.test.js` enforces it.

## Comments

The code carries comments only where the code itself cannot explain something: base-game
or engine behaviour, a bug workaround, a dependency outside the mod, or a counter-intuitive
ordering. Past a line or two, a comment is documentation and belongs in
[`docs/design.md`](docs/design.md) instead.

## Verifying a change

`npm run verify` is the pre-submit gate and is what CI runs: `lint:js`, `lint:css`,
`lint:md`, `format:check`, `validate:json`, `test:coverage` (80% line floor on
`port_check_core.js`).

Nothing here starts PA. Every behavioural claim needs the game loaded with the mod
enabled — see the list at the end of [`docs/design.md`](docs/design.md).

## Release

`CHANGELOG.md` keeps an `## Unreleased` heading while work is in progress. The working
copy's identifier is `com.pa.quitch.lobbyportcheck-dev`; the `coui://` paths use the bare
id, so the released identifier is the bare id too. The version appears in `modinfo.json`
and `sonar-project.properties`, and they must agree.
