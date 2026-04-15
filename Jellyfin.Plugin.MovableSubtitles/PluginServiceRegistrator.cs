using Jellyfin.Plugin.MovableSubtitles.Services;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Hosting;

namespace Jellyfin.Plugin.MovableSubtitles;

/// <summary>
/// Registers plugin-scoped services so that the hosted index.html injector runs at startup.
/// </summary>
public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    /// <inheritdoc />
    public void RegisterServices(IServiceCollection serviceCollection, IServerApplicationHost applicationHost)
    {
        serviceCollection.TryAddEnumerable(
            ServiceDescriptor.Singleton<IHostedService, IndexHtmlInjectionService>());
    }
}
