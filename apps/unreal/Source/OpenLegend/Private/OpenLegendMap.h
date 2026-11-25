#pragma once

#include "OpenLegendJson.h"
#include "Styling/SlateBrush.h"
#include "Widgets/SLeafWidget.h"

struct FStreamableHandle;

namespace OpenLegend
{
bool ReadMapPoint(const FObject& Record, FVector2D& Point);

struct FMapPin
{
    FVector2D Point;
    bool bMarker;
};

class SOpenLegendMap final : public SLeafWidget
{
public:
    SLATE_BEGIN_ARGS(SOpenLegendMap) {}
        SLATE_ARGUMENT(TFunction<void(FVector2D, int32)>, Select)
    SLATE_END_ARGS()

    void Construct(const FArguments& Args);
    void SetView(const FObject& View);
    void ResetView();
    void SetPins(TArray<FMapPin> Next);
    void SetDraft(TOptional<FVector2D> Point);
    void Focus(FVector2D Point);
    void ZoomBy(double Factor);
    bool HasBounds() const { return bValidBounds; }
    bool Contains(FVector2D Point) const;
    TOptional<FVector2D> CentrePoint() const;

private:
    FVector2D ComputeDesiredSize(float LayoutScaleMultiplier) const override;
    int32 OnPaint(const FPaintArgs& Args, const FGeometry& Geometry, const FSlateRect& Culling,
        FSlateWindowElementList& Elements, int32 Layer, const FWidgetStyle& Style, bool bEnabled) const override;
    bool SupportsKeyboardFocus() const override { return true; }
    FReply OnKeyDown(const FGeometry& Geometry, const FKeyEvent& Event) override;
    FReply OnMouseButtonDown(const FGeometry& Geometry, const FPointerEvent& Event) override;
    FReply OnMouseButtonUp(const FGeometry& Geometry, const FPointerEvent& Event) override;
    FReply OnMouseMove(const FGeometry& Geometry, const FPointerEvent& Event) override;
    FReply OnMouseWheel(const FGeometry& Geometry, const FPointerEvent& Event) override;
    void OnMouseCaptureLost(const FCaptureLostEvent& Event) override;

    void UpdateArt(const FObject& Art, const FObject& Release);
    void FinishTextureLoad();
    FVector2D PictureSize(FVector2D Viewport) const;
    FVector2D Normalized(FVector2D Point) const;
    void PanTo(FVector2D Point);

    TFunction<void(FVector2D, int32)> Select;
    FObject LastArt, LastRelease;
    FString MapFile, MapTexture;
    TArray<FString> ReleaseIdentity;
    TSharedPtr<FStreamableHandle> TextureHandle;
    FSlateBrush Picture;
    TArray<FMapPin> Pins;
    TOptional<FVector2D> Player, Draft, DragStart;
    FVector2D Min, Max, Center = FVector2D(0.5, 0.5), StartCenter;
    double Zoom = 1.0, Heading = 0.0;
    bool bValidBounds = false, bDragged = false;
};
}
