using System.IO;
using System.Net.Mime;
using System.Reflection;
using Jellyfin.Plugin.MovableSubtitles.Configuration;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

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
    [Produces("application/javascript")]
    public IActionResult GetScript()
    {
        var assembly = typeof(Plugin).Assembly;
        var stream = assembly.GetManifestResourceStream(ScriptResourceName);
        if (stream == null)
        {
            return NotFound();
        }

        return File(stream, "application/javascript");
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

        return plugin.Configuration;
    }
}
