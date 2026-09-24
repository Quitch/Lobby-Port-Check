# CLAUDE.md

## What this is

Lobby Port Check is a client mod for Planetary Annihilation: TITANS. In the `new_game`
lobby it shows the host of a local server whether the server's port can be reached from
the internet, using `https://ifconfig.co/port/<n>`. There is no build step, only lint and
tests.

The base game install (a `media` folder under Steam's `.../Planetary Annihilation
Titans/`) is not part of this repo. If it is set up as an additional workspace root, its
own `CLAUDE.md` identifies it. Treat it as read-only reference. Never edit anything there.

## Architecture

[`docs/design.md`](docs/design.md) is the single design document: who sees the indicator
and why, the states, the debounce and stale-response rules, placement, and the WCAG 2.2
AAA decisions. Read it before changing anything.

- `local_host.js` (`connect_to_game`) records whether this client started a local server.
- `port_check_core.js` is pure logic with no DOM, exported to Node for the tests. It must
  load before `port_check.js`, so it comes first in the `new_game` scene list.
- `port_check.js` (`new_game`) wires knockout observables, sends the request and inserts
  `port_check.html` on its own line after `.toolbar_user_mgmt`.

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
