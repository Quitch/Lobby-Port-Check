# Lobby Port Check

When you host a game on your own computer, other players can only join if they can reach
your game server's port from the internet. Normally you only find out that they cannot
when someone fails to join.

Lobby Port Check shows the host whether the port is open. In a multiplayer or AI skirmish
lobby it sits on its own line under the **Open to** buttons. In a Galactic War co-op
session (**Call for Reinforcements**) it sits in the lobby panel between **Title** and
**Open to:**.

| You see                                              | What it means                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| ✔ Port 20545 open                                    | Players on the internet can reach your server.                      |
| ✖ Port 20545 closed: players may not be able to join | Your router or firewall blocks the port. Forward it, or use Steam.  |
| ? Port 20545 status unknown                          | The check failed. It does not say anything about the port.          |
| ⋯ Checking port 20545                                | The check is running.                                               |
| — Private: port not checked                          | Nobody else can join a private lobby, so there is nothing to check. |
| — Steam networking: no open port needed              | Steam carries the connection, so no port has to be open.            |

The mod checks when you open the lobby to Friends or Public, and again each time you
change it from Private to Friends or Public. A Galactic War co-op lobby opens as Public,
so it checks straight away. Changing between Friends and Public does not
check again. Only the host sees the indicator, and only for a server running on their own
computer.

## Privacy

To check the port, the mod asks [ifconfig.co](https://ifconfig.co) to connect to your
public IP address on that port. So each check sends a request from your computer to
ifconfig.co, which sees your IP address. The mod never shows your IP address on screen, so
it is safe to stream the lobby.

## Requirements

- Planetary Annihilation: TITANS or Classic
- Community Mods

## Licence

[MIT](LICENSE)
