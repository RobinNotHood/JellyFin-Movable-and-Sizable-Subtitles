using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Controller;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MovableSubtitles.Services;

/// <summary>
/// On server start, patches the web client's index.html so that it loads
/// the plugin's client script (/MovableSubtitles/script.js).
///
/// The patch is idempotent: if the marker tag is already present, nothing happens.
/// </summary>
public class IndexHtmlInjectionService : IHostedService
{
    private const string InjectionMarker = "<!-- movable-subtitles-injection -->";
    private const string ScriptTag =
        InjectionMarker +
        "<script defer src=\"MovableSubtitles/script.js\"></script>";

    private readonly IServerApplicationPaths _appPaths;
    private readonly IServerApplicationHost _appHost;
    private readonly ILogger<IndexHtmlInjectionService> _logger;

    /// <summary>
    /// Initializes a new instance of the <see cref="IndexHtmlInjectionService"/> class.
    /// </summary>
    /// <param name="appPaths">Server application paths.</param>
    /// <param name="appHost">Server application host.</param>
    /// <param name="logger">Logger.</param>
    public IndexHtmlInjectionService(
        IServerApplicationPaths appPaths,
        IServerApplicationHost appHost,
        ILogger<IndexHtmlInjectionService> logger)
    {
        _appPaths = appPaths;
        _appHost = appHost;
        _logger = logger;
    }

    /// <inheritdoc />
    public Task StartAsync(CancellationToken cancellationToken)
    {
        try
        {
            var indexPath = ResolveIndexHtmlPath();
            if (indexPath == null)
            {
                _logger.LogWarning(
                    "Could not locate web client index.html; subtitle script will not be injected");
                return Task.CompletedTask;
            }

            Inject(indexPath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to inject Movable Subtitles script into web client");
        }

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;

    private string? ResolveIndexHtmlPath()
    {
        var candidates = new[]
        {
            _appPaths.WebPath,
            Path.Combine(AppContext.BaseDirectory, "jellyfin-web"),
            Path.Combine(_appPaths.ProgramSystemPath, "jellyfin-web")
        };

        foreach (var dir in candidates)
        {
            if (string.IsNullOrEmpty(dir))
            {
                continue;
            }

            var candidate = Path.Combine(dir, "index.html");
            if (File.Exists(candidate))
            {
                return candidate;
            }
        }

        return null;
    }

    private void Inject(string indexPath)
    {
        var content = File.ReadAllText(indexPath);
        if (content.Contains(InjectionMarker, StringComparison.Ordinal))
        {
            _logger.LogDebug("Movable Subtitles script tag already present in {Path}", indexPath);
            return;
        }

        var insertionIndex = content.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
        if (insertionIndex < 0)
        {
            _logger.LogWarning("index.html does not contain a </body> tag; skipping injection");
            return;
        }

        var patched = content.Insert(insertionIndex, ScriptTag);

        try
        {
            File.WriteAllText(indexPath, patched);
            _logger.LogInformation(
                "Injected Movable Subtitles script into {Path} (server {Version})",
                indexPath,
                _appHost.ApplicationVersionString);
        }
        catch (UnauthorizedAccessException)
        {
            _logger.LogWarning(
                "No write access to {Path}; run Jellyfin with permission to modify the web client",
                indexPath);
        }
    }
}
