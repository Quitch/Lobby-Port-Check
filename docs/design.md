# Design

## The question

A player-hosted server listens on a TCP port (default 20545). Joiners over TCP or UPnP
reach it only if the port is reachable from the internet. The host cannot test that from
their own machine: a connection to their own public IP says nothing about the router's
forwarding. So the mod asks an outside service, `https://ifconfig.co/port/<n>`, which
connects back to the **caller's** public IP. The request therefore has to come from the
machine that runs the server.

## Who sees the indicator

Three conditions, all required:

1. **This client started the server.** `is_local_game` and `game_server_type === 'local'`
   are also true for a player who joins someone else's player-hosted game
   (`server_browser.js`, `helpers.js`), so they cannot answer this. Every start and join
   passes through `connect_to_game`, where `local_host.js` writes the session key
   `lobbyportcheck_local_host` from `action=start&local=true`. It writes on every load,
   so a later join clears the flag. AI skirmish takes the same route
   (`start.js` `navToAISkirmish`) and is not special-cased: its lobby starts Private and
   the host can open it to humans.
2. **This client is the game creator** (`model.isGameCreator`). After a host transfer the
   old host still runs the server but can no longer change privacy, and the new host does
   not run it, so neither sees the indicator.
3. The stock `.toolbar_user_mgmt` is `visible: canChangeSettings`, which already hides
   the row from everyone else.

A reconnect reaches `connect_to_game` without `action=start`, which clears the flag. The
host then sees no indicator until the next start. That fails safe.

## States

`port_check_core.js` holds the decisions with no DOM or engine access, so Node can test
it. `decideState` returns `hidden`, `private`, `steam` or `check`, in that order of
precedence. `check` resolves to `checking`, then `open`, `closed` or `unknown`.

- **STEAM transport** (`api.net.effectiveLocalHostTransport()`): Steam carries the
  connection, so no port needs to be open, and the mod does not check.
- **Friends and Public** both decide `check`, so switching between them changes nothing
  and sends no request. Private to either one does.
- **Transient Private:** stock `setPublicGame` and `setFriendsOnlyGame` clear one flag
  before they set the other, so `isHiddenGame` is true for a moment on every Friends to
  Public switch. The decision is acted on a tick later (`_.defer`), and only when the
  settled value differs from the last one acted on. Without that, Friends to Public sent
  a request and flashed "Private" for a frame.
- **Debounce:** entering `check` shows `checking` at once and sends the request after 1 s
  of quiet, so quick toggling sends one request. If the lobby is already open when the
  scene loads, the check runs at once.
- **Stale responses:** every change of decision and every request bumps a token. A
  response whose token is no longer current, or that arrives while the decision is not
  `check`, is dropped.

`interpretResponse` returns `open` or `closed` only for HTTP 200 with an object body whose
`port` equals the port asked about and whose `reachable` is a boolean. Anything else,
including timeouts (10 s), 429 rate limiting and no network, is `unknown`. An `unknown`
never claims anything about the port.

The port comes from the session key `gamePort`, which `connect_to_game.js` sets from the
server's `ServerPort`. A missing or invalid value falls back to 20545.

## Placement

The indicator has its own right-aligned line, inserted after `.toolbar_user_mgmt` in the
same `td.controls` cell. It does not go in the toolbar row itself: that row is a fixed
48px with Add Slot floated left and the Tag picker and privacy toggles floated right,
and the stock "Tag:" label sits `position: absolute` 40px outside its group. At 1904px
wide only about 16px is spare, so any indicator there pushes "Tag:" into Add Slot, and
less wide windows have less room. The extra line takes its height from the roster below,
whose cell is `height: 100%`. `loadSceneMods('new_game')` runs before `ko.applyBindings`,
so the inserted markup is bound with the rest of the page.

## Accessibility (WCAG 2.2 AAA)

- **1.4.1 Use of colour:** each state has its own glyph and its own words. The glyph is
  `aria-hidden`; the words carry the meaning.
- **1.4.6 / 1.4.11 contrast:** the indicator draws its own solid `#000` background, so its
  contrast does not depend on the lobby art behind it. `test/contrast.test.js` reads
  `port_check.css` and fails below 7:1 for text or 3:1 for the border. Current values:

  | Use          | Colour    | Ratio on `#000` |
  | ------------ | --------- | --------------- |
  | Neutral text | `#e0e0e0` | 15.91:1         |
  | Open         | `#6ee07a` | 12.61:1         |
  | Closed       | `#ff8a80` | 9.20:1          |
  | Unknown      | `#ffd54f` | 14.88:1         |
  | Border       | `#808080` | 5.32:1          |

- **1.4.12 text spacing:** no fixed height; the label does not wrap.
- **1.4.13 content on hover:** the only tooltip is the user-agent `title`, which repeats
  the visible text. Nothing needs hover.
- **2.2.2 / 2.3.3 motion:** no animation, transition or flashing. "Checking" is static.
- **3.1.5 reading level:** plain wording, wrapped in `loc("!LOC:…")` so Mod Translations
  can supply translations.
- **4.1.3 status messages:** `role="status"`, `aria-live="polite"`, `aria-atomic="true"`.
  Coherent UI has no screen reader, but the semantics carry over to CEF.
- The indicator is not interactive, so target size and focus criteria do not apply.

## Privacy

The request goes to ifconfig.co, which sees the host's public IP. The mod never shows the
IP (streamers). The README says so.

## Tooling and the Chrome 40 constraint

PA's UI is Coherent UI on Chrome 40. Shipped JS is ES5 plus the few later features Chrome
40 has.

- In `eslint.config.mjs`, `ecmaVersion` is a parser setting, not a claim about PA.
  `es-x/restrict-to-es5` bans everything post-ES5, and a whitelist turns back on only
  what Chrome 40 shipped. The inversion is deliberate: a feature missing from the list is
  unavailable.
- `stylelint.config.mjs` and `.browserslistrc` check CSS against `chrome 40`: the
  `stylelint-no-unsupported-browser-features` plugin checks each declaration, and
  hand-written lists cover at-rules, selectors and notation.
- `port_check.js` and `local_host.js` are engine and DOM wiring that Node cannot load, so
  Sonar excludes them from coverage. The logic they call is in `port_check_core.js`,
  which the tests measure against an 80% line floor.

## Verification in game

`npm run verify` cannot see the engine. In game, with the mod enabled:

1. Multiplayer, Create Game (local): the lobby shows "Private: port not checked".
2. Public: Checking, then Open, Closed or Unknown.
3. Friends to Public sends no request. Public to Private to Public checks again.
4. `server_local_host_transport` set to `STEAM`: "Steam networking: no open port needed".
5. The service unreachable: Unknown.
6. A joining client sees no indicator, including after a host transfer.
7. AI skirmish: starts Private; Public checks as in a multiplayer lobby.
