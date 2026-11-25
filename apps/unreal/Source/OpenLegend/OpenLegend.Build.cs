// SPDX-License-Identifier: Apache-2.0
using UnrealBuildTool;

public class OpenLegend : ModuleRules
{
    public OpenLegend(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
        PrivateDependencyModuleNames.AddRange(new[] {
            "Core", "CoreUObject", "Engine", "HTTP", "InputCore", "Json",
            "libcurl", "nghttp2", "OpenSSL", "zlib"
        });
    }
}
