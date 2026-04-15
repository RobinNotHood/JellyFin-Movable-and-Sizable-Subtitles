# JellyFin Movable and Sizable Subtitles

Better subtitle control for Jellyfin — **menu-driven**.

While watching anything on the Jellyfin web client, an **Aa ⇅** button appears in
the top-right. Click it to open a floating control panel with:

- **Position pad** — ↑ ↓ ← → arrow buttons to nudge the subtitles (hold to
  scroll, tap `⌂` to center horizontally).
- **Size** — `A−` / `A+` buttons with a live size readout.
- **Quick position presets** — one tap for `Top`, `Middle` or `Bottom`.
- **Reset all** — back to default position and size.
- Keyboard shortcut: <kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>.

The panel itself is draggable (grab the header) and remembers where you put
it. Position / size changes are remembered per browser across sessions.

### Advanced (off by default)

If you prefer direct manipulation, the plugin's admin page has opt-in toggles
to enable dragging the subtitle text with the mouse / touch, and resizing it
via scroll wheel or pinch — just like the subtitles themselves were a handle.

## Install (the same way you add any Jellyfin plugin repository)

In Jellyfin, go to **Dashboard → Plugins → Repositories → + New Repository** and add:

| Field           | Value                                                                                                     |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| Repository Name | `Movable and Sizable Subtitles`                                                                           |
| Repository URL  | `https://raw.githubusercontent.com/RobinNotHood/JellyFin-Movable-and-Sizable-Subtitles/main/manifest.json` |

Then go to **Catalog → General**, find *Movable and Sizable Subtitles*, click **Install**, and restart Jellyfin.

After the restart, open any video with subtitles and try dragging them.

## Manual install

1. Download the latest `movable-subtitles_*.zip` from the [Releases page](https://github.com/RobinNotHood/JellyFin-Movable-and-Sizable-Subtitles/releases).
2. Extract it into a new folder called `MovableSubtitles` inside your Jellyfin `plugins` directory:
   - Linux: `/var/lib/jellyfin/plugins/MovableSubtitles/`
   - Windows: `%ProgramData%\Jellyfin\Server\plugins\MovableSubtitles\`
   - Docker: `/config/plugins/MovableSubtitles/` (mapped volume)
3. Restart Jellyfin.

## Configuration

After installing, go to **Dashboard → Plugins → Movable and Sizable Subtitles** to toggle:

- Enable / disable the plugin
- Show the on-screen control panel
- (Advanced) allow dragging the subtitle text directly
- (Advanced) allow resizing via scroll / pinch on the subtitle text
- Remember position/size between sessions
- Default subtitle size (%)

## How it works

The plugin injects a single small `<script>` tag into the Jellyfin web client's `index.html`
pointing at `/MovableSubtitles/script.js`, which is served by the plugin itself. That script
attaches mouse / touch / wheel handlers to Jellyfin's built-in `.videoSubtitles` element.

Because the script is served by the plugin, **no changes are persisted to the web client's
files after uninstall** — just remove the plugin and restart to go back to stock behavior.

## Building from source

```sh
dotnet build Jellyfin.Plugin.MovableSubtitles/Jellyfin.Plugin.MovableSubtitles.csproj -c Release
```

The compiled `Jellyfin.Plugin.MovableSubtitles.dll` under
`Jellyfin.Plugin.MovableSubtitles/bin/Release/net8.0/` is the file Jellyfin loads.

## Compatibility

- Jellyfin 10.9.x and newer (target ABI `10.9.0.0`)
- .NET 8.0

## License

No license yet — all rights reserved by the authors.
