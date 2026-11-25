using UnrealBuildTool;

public class OpenLegendTarget : TargetRules
{
    public OpenLegendTarget(TargetInfo target) : base(target)
    {
        Type = TargetType.Game;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("OpenLegend");
    }
}
