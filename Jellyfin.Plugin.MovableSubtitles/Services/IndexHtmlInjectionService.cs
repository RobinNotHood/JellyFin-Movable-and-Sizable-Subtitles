using System;
using System.IO;
using System.Reflection;
using System.Text.RegularExpressions;
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
/// The patch is idempotent: if the marker tag is already present but for a
/// different version, the stale tag is rewritten to include the current
/// plugin version as a cache-busting query string.
/// </summary>
public class IndexHtmlInjectionService : IHostedService
{
    private const string InjectionMarker = "<!-- movable-subtitles-injection";
    private static readonly Regex ExistingTagRegex = new(
        @"<!-- movable-subtitles-injection[^>]*-->[\s\S]*?</script>",
        RegexOptions.Compiled);

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
        var pluginVersion = GetPluginVersion();
        var scriptTag =
            $"<!-- movable-subtitles-injection v{pluginVersion} -->" +
            $"<script defer src=\"MovableSubtitles/script.js?v={pluginVersion}\"></script>";

        // If our tag is already present, replace it so that updates pick up the
        // new version (via the ?v= query string) and old stale tags get pruned.
        var existing = ExistingTagRegex.Match(content);
        string patched;
        if (existing.Success)
        {
            if (existing.Value == scriptTag)
            {
                _logger.LogDebug(
                    "Movable Subtitles v{Version} script tag already present in {Path}",
                    pluginVersion,
                    indexPath);
                return;
            }

            patched = content.Substring(0, existing.Index)
                + scriptTag
                + content.Substring(existing.Index + existing.Length);
        }
        else
        {
            var insertionIndex = content.LastIndexOf("</body>", StringComparison.OrdinalIgnoreCase);
            if (insertionIndex < 0)
            {
                _logger.LogWarning("index.html does not contain a </body> tag; skipping injection");
                return;
            }

            patched = content.Insert(insertionIndex, scriptTag);
        }

        try
        {
            File.WriteAllText(indexPath, patched);
            _logger.LogInformation(
                "Injected Movable Subtitles v{Version} script into {Path} (server {Server})",
                pluginVersion,
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

    private static string GetPluginVersion()
    {
        var version = typeof(IndexHtmlInjectionService).Assembly
            .GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion
            ?? typeof(IndexHtmlInjectionService).Assembly.GetName().Version?.ToString()
            ?? "dev";

        // Trim any "+git…" suffix that might be appended by the build.
        var plus = version.IndexOf('+');
        return plus >= 0 ? version.Substring(0, plus) : version;
    }
}
