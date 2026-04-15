using System.Net.Mime;
using Jellyfin.Plugin.MovableSubtitles.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Net.Http.Headers;

namespace Jellyfin.Plugin.MovableSubtitles.Api;

/// <summary>
/// Serves the client-side script and the (public) effective config so the script
/// knows whether it should activate.
/// </summary>
[ApiController]
[Route("MovableSubtitles")]
[AllowAnonymous]
public class MovableSubtitlesController : ControllerBase
{
    private const string ScriptResourceName =
        "Jellyfin.Plugin.MovableSubtitles.Web.movable-subtitles.js";

    /// <summary>
    /// Returns the movable-subtitles client script.
    /// </summary>
    /// <returns>JavaScript file.</returns>
    [HttpGet("script.js")]
    public IActionResult GetScript()
    {
        var assembly = typeof(Plugin).Assembly;
        var stream = assembly.GetManifestResourceStream(ScriptResourceName);
        if (stream == null)
        {
            return NotFound();
        }

        // no-cache so that browsers pick up new content after a plugin update,
        // charset=utf-8 so that the UI arrow glyphs (↑ ↓ ← →) render correctly
        // when the web client is served with strict MIME handling.
        Response.Headers[HeaderNames.CacheControl] = "no-cache, no-store, must-revalidate";
        Response.Headers[HeaderNames.Pragma] = "no-cache";
        Response.Headers[HeaderNames.Expires] = "0";
        return File(stream, "application/javascript; charset=utf-8");
    }

    /// <summary>
    /// Returns the plugin configuration as JSON so the client script knows which
    /// features to enable.
    /// </summary>
    /// <returns>Plugin configuration.</returns>
    [HttpGet("config")]
    [Produces(MediaTypeNames.Application.Json)]
    public ActionResult<PluginConfiguration> GetConfig()
    {
        var plugin = Plugin.Instance;
        if (plugin == null)
        {
            return NotFound();
        }

        Response.Headers[HeaderNames.CacheControl] = "no-cache, no-store, must-revalidate";
        return plugin.Configuration;
    }
}
