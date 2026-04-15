# JellyFin Movable and Sizable Subtitles

Better subtitle control for Jellyfin.

While watching anything on the Jellyfin web client you can:

- **Drag** the subtitles with mouse or touch to reposition them anywhere on the video.
- **Scroll / pinch** on the subtitles to resize them live.
- **Double-click / double-tap** to reset to the default position and size.
- (Optional) remember position and size per user across sessions.

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
- Allow dragging
- Allow resizing (scroll + pinch)
- Remember position/size between sessions
- Default font size (%)

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
