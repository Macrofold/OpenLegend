using UnrealBuildTool;

public class OpenLegendEditorTarget : TargetRules
{
    public OpenLegendEditorTarget(TargetInfo target) : base(target)
    {
        Type = TargetType.Editor;
        DefaultBuildSettings = BuildSettingsVersion.Latest;
        IncludeOrderVersion = EngineIncludeOrderVersion.Latest;
        ExtraModuleNames.Add("OpenLegend");
    }
}
