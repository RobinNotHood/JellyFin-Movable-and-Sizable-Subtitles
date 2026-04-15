using MediaBrowser.Model.Plugins;

namespace Jellyfin.Plugin.MovableSubtitles.Configuration;

/// <summary>
/// Plugin configuration for Movable and Sizable Subtitles.
/// </summary>
public class PluginConfiguration : BasePluginConfiguration
{
    /// <summary>
    /// Initializes a new instance of the <see cref="PluginConfiguration"/> class.
    /// </summary>
    public PluginConfiguration()
    {
        Enabled = true;
        AllowDrag = true;
        AllowResize = true;
        DefaultFontSize = 100;
        RememberPosition = true;
    }

    /// <summary>
    /// Gets or sets a value indicating whether the plugin is enabled on the web client.
    /// </summary>
    public bool Enabled { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the user can drag subtitles with the mouse / touch.
    /// </summary>
    public bool AllowDrag { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the user can resize subtitles via scroll wheel / pinch.
    /// </summary>
    public bool AllowResize { get; set; }

    /// <summary>
    /// Gets or sets the default font size as a percentage (50-300).
    /// </summary>
    public int DefaultFontSize { get; set; }

    /// <summary>
    /// Gets or sets a value indicating whether the last position is remembered across sessions.
    /// </summary>
    public bool RememberPosition { get; set; }
}
