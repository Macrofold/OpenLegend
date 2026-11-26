using UnrealBuildTool;

public class OpenLegend : ModuleRules
{
    public OpenLegend(ReadOnlyTargetRules target) : base(target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PublicDependencyModuleNames.AddRange(new[] { "Core", "CoreUObject", "Engine", "Json" });
        PrivateDependencyModuleNames.AddRange(new[]
        {
            "EnhancedInput", "HTTP", "InputCore", "Networking", "ProceduralMeshComponent",
            "Slate", "SlateCore", "Sockets", "SSL"
        });
        // Installed modular editors skip the bundled curl module's private
        // dependencies. This module uses curl directly and must link them.
        AddEngineThirdPartyPrivateStaticDependencies(target, "libcurl", "nghttp2", "OpenSSL", "zlib");
        if (target.Platform == UnrealTargetPlatform.Mac)
            PublicFrameworks.Add("Security");
        if (target.Platform == UnrealTargetPlatform.Win64)
            PublicSystemLibraries.AddRange(new[] { "Advapi32.lib", "Crypt32.lib" });
    }
}
