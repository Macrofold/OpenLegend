#include "OpenLegendMap.h"

#include "Engine/AssetManager.h"
#include "Engine/StreamableManager.h"
#include "Engine/Texture2D.h"
#include "Input/Events.h"
#include "Input/Reply.h"
#include "Misc/ConfigCacheIni.h"
#include "Rendering/DrawElements.h"
#include "Styling/CoreStyle.h"

namespace OpenLegend
{
bool ReadMapPoint(const FObject& Record, FVector2D& Point)
{
    return Number(Record, TEXT("x"), Point.X) && Number(Record, TEXT("z"), Point.Y);
}

void SOpenLegendMap::Construct(const FArguments& Args)
{
    Select = Args._Select;
    const TCHAR* Section = TEXT("OpenLegend.Art");
    if (!GConfig || !GConfig->GetString(Section, TEXT("MapFile"), MapFile, GGameIni)
        || !GConfig->GetString(Section, TEXT("MapTexture"), MapTexture, GGameIni)) return;
    for (const TCHAR* Key : {TEXT("OwnerKind"), TEXT("OwnerId"), TEXT("AssetId"),
         TEXT("RevisionId"), TEXT("ManifestSha256")})
    {
        FString Value;
        if (!GConfig->GetString(Section, Key, Value, GGameIni) || Value.IsEmpty()) break;
        ReleaseIdentity.Add(MoveTemp(Value));
    }
}

void SOpenLegendMap::SetView(const FObject& View)
{
    const auto Art = Object(Object(View, TEXT("cartography")), TEXT("art"));
    const auto Release = Object(View, TEXT("presentationRelease"));
    const bool bArtChanged = Art != LastArt || Release != LastRelease;
    if (bArtChanged) UpdateArt(Art, Release);
    const auto Self = Object(View, TEXT("player"));
    FVector2D Point;
    TOptional<FVector2D> Next;
    if (ReadMapPoint(Object(Self, TEXT("position")), Point)) Next = Point;
    const double NextHeading = NumberOr(Self, TEXT("heading"), 0.0);
    if (bArtChanged || Next != Player || NextHeading != Heading)
    {
        Player = Next;
        Heading = NextHeading;
        Invalidate(EInvalidateWidgetReason::Paint);
    }
}

void SOpenLegendMap::ResetView()
{
    SetView(nullptr);
    Pins.Reset();
    Draft.Reset();
    Center = FVector2D(0.5, 0.5);
    Zoom = 1.0;
    DragStart.Reset();
}

void SOpenLegendMap::UpdateArt(const FObject& Art, const FObject& Release)
{
    if (Art == LastArt && Release == LastRelease) return;
    const FString File = String(Art, TEXT("path"));
    const bool bNewFile = !SameWireText(File, String(LastArt, TEXT("path"))) || Release != LastRelease;
    const bool bHadBounds = bValidBounds;
    LastArt = Art;
    LastRelease = Release;
    const auto Bounds = Object(Art, TEXT("bounds"));
    bValidBounds = Number(Bounds, TEXT("minX"), Min.X) && Number(Bounds, TEXT("minZ"), Min.Y)
        && Number(Bounds, TEXT("maxX"), Max.X) && Number(Bounds, TEXT("maxZ"), Max.Y)
        && FMath::IsFinite(Max.X - Min.X) && FMath::IsFinite(Max.Y - Min.Y) && Max.X > Min.X && Max.Y > Min.Y;

    if (!bNewFile && bValidBounds == bHadBounds) return;
    Picture.SetResourceObject(nullptr);
    if (TextureHandle) TextureHandle->CancelHandle();
    TextureHandle.Reset();
    const auto Owner = Object(Release, TEXT("owner"));
    if (bValidBounds && ReleaseIdentity.Num() == 5 && SameWireText(File, MapFile) && !MapTexture.IsEmpty()
        && SameWireText(ReleaseIdentity[0], String(Owner, TEXT("kind")))
        && SameWireText(ReleaseIdentity[1], String(Owner, TEXT("id")))
        && SameWireText(ReleaseIdentity[2], String(Release, TEXT("assetId")))
        && SameWireText(ReleaseIdentity[3], String(Release, TEXT("revisionId")))
        && SameWireText(ReleaseIdentity[4], String(Release, TEXT("manifestSha256"))))
    {
        TextureHandle = UAssetManager::GetStreamableManager().RequestAsyncLoad(
            FSoftObjectPath(MapTexture), FStreamableDelegate::CreateSP(SharedThis(this), &SOpenLegendMap::FinishTextureLoad));
    }
}

void SOpenLegendMap::FinishTextureLoad()
{
    if (TextureHandle)
    {
        Picture.SetResourceObject(Cast<UTexture2D>(TextureHandle->GetLoadedAsset()));
        Invalidate(EInvalidateWidgetReason::Paint);
    }
}

void SOpenLegendMap::SetPins(TArray<FMapPin> Next)
{
    Pins = MoveTemp(Next);
    Invalidate(EInvalidateWidgetReason::Paint);
}

void SOpenLegendMap::SetDraft(TOptional<FVector2D> Point)
{
    Draft = Point;
    Invalidate(EInvalidateWidgetReason::Paint);
}

bool SOpenLegendMap::Contains(FVector2D Point) const
{
    return bValidBounds && Point.X >= Min.X && Point.X <= Max.X && Point.Y >= Min.Y && Point.Y <= Max.Y;
}

TOptional<FVector2D> SOpenLegendMap::CentrePoint() const
{
    return bValidBounds ? TOptional<FVector2D>(FVector2D(FMath::Lerp(Min.X, Max.X, Center.X), FMath::Lerp(Max.Y, Min.Y, Center.Y))) : TOptional<FVector2D>();
}

FVector2D SOpenLegendMap::Normalized(FVector2D Point) const
{
    const auto Span = Max - Min;
    return FVector2D((Point.X - Min.X) / Span.X, (Max.Y - Point.Y) / Span.Y);
}

void SOpenLegendMap::PanTo(FVector2D Point)
{
    const double Border = 0.5 / Zoom;
    Center.X = FMath::Clamp(Point.X, Border, 1.0 - Border);
    Center.Y = FMath::Clamp(Point.Y, Border, 1.0 - Border);
    Invalidate(EInvalidateWidgetReason::Paint);
}

void SOpenLegendMap::Focus(FVector2D Point)
{
    if (!Contains(Point)) return;
    Zoom = FMath::Max(Zoom, 2.0);
    PanTo(Normalized(Point));
}

void SOpenLegendMap::ZoomBy(double Factor)
{
    Zoom = FMath::Clamp(Zoom * Factor, 1.0, 8.0);
    PanTo(Center);
}

FVector2D SOpenLegendMap::ComputeDesiredSize(float LayoutScaleMultiplier) const
{
    return FVector2D(240, 185);
}

FVector2D SOpenLegendMap::PictureSize(FVector2D Viewport) const
{
    double Aspect = (Max.X - Min.X) / (Max.Y - Min.Y);
    if (const auto* Texture = Cast<UTexture2D>(Picture.GetResourceObject()); Texture && Texture->GetSizeY() > 0)
        Aspect = static_cast<double>(Texture->GetSizeX()) / Texture->GetSizeY();
    const double Height = FMath::Min(Viewport.Y, Viewport.X / Aspect) * Zoom;
    return FVector2D(Aspect * Height, Height);
}

int32 SOpenLegendMap::OnPaint(const FPaintArgs& Args, const FGeometry& Geometry,
    const FSlateRect& Culling, FSlateWindowElementList& Elements, int32 Layer, const FWidgetStyle& Style,
    bool bEnabled) const
{
    const auto Size = Geometry.GetLocalSize();
    const FSlateBrush* White = FCoreStyle::Get().GetBrush(TEXT("WhiteBrush"));
    const auto Box = [&](int32 Level, FVector2D Position, FVector2D Extent, const FSlateBrush* Brush, FLinearColor Color)
    {
        FSlateDrawElement::MakeBox(Elements, Level, Geometry.ToPaintGeometry(
            Extent, FSlateLayoutTransform(Position)), Brush, ESlateDrawEffect::None, Color);
    };
    Box(Layer, FVector2D::ZeroVector, Size, White, FLinearColor(0.035, 0.047, 0.046));
    if (!bValidBounds || Size.X <= 0 || Size.Y <= 0) return Layer;
    const auto Extent = PictureSize(Size);
    const auto TopLeft = Size * 0.5 - Center * Extent;
    Elements.PushClip(FSlateClippingZone(Geometry));
    if (Picture.GetResourceObject()) Box(Layer + 1, TopLeft, Extent, &Picture, FLinearColor::White);
    else
    {
        Box(Layer + 1, TopLeft, Extent, White, FLinearColor(0.13, 0.17, 0.16));
        for (int32 Line = 1; Line < 8; ++Line)
        {
            const auto GridColor = FLinearColor(0.23, 0.28, 0.25);
            Box(Layer + 2, TopLeft + FVector2D(Extent.X * Line / 8, 0),
                FVector2D(1, Extent.Y), White, GridColor);
            Box(Layer + 2, TopLeft + FVector2D(0, Extent.Y * Line / 8),
                FVector2D(Extent.X, 1), White, GridColor);
        }
    }
    const auto Pin = [&](FVector2D Point, double Radius, FLinearColor Color, int32 Level)
    {
        if (!Contains(Point)) return;
        const auto Pixel = TopLeft + Normalized(Point) * Extent;
        if (Pixel.X + Radius < 0 || Pixel.Y + Radius < 0 || Pixel.X - Radius > Size.X || Pixel.Y - Radius > Size.Y)
            return;
        const FVector2D Half(Radius, Radius);
        Box(Level, Pixel - Half, Half * 2, White, FLinearColor(0.052, 0.065, 0.058));
        Box(Level + 1, Pixel - Half + FVector2D(1, 1), (Half - FVector2D(1, 1)) * 2, White, Color);
    };
    for (const auto& Entry : Pins)
        Pin(Entry.Point, 4, Entry.bMarker ? FLinearColor(0.91, 0.71, 0.24) : FLinearColor(0.42, 0.71, 0.49), Layer + 3);
    if (Draft) Pin(*Draft, 5, FLinearColor(1, 0.91, 0.55), Layer + 5);
    if (Player && Contains(*Player))
    {
        Pin(*Player, 5, FLinearColor(0.78, 0.92, 0.98), Layer + 7);
        const FVector2D Tip = TopLeft + Normalized(*Player) * Extent;
        const FVector2D Direction(FMath::Sin(Heading) * Extent.X / (Max.X - Min.X),
            -FMath::Cos(Heading) * Extent.Y / (Max.Y - Min.Y));
        const auto End = Tip + Direction.GetSafeNormal() * 12;
        const TArray<FVector2D> Line{Tip, End};
        FSlateDrawElement::MakeLines(Elements, Layer + 9, Geometry.ToPaintGeometry(),
            Line, ESlateDrawEffect::None, FLinearColor(0.78, 0.92, 0.98), true, 2.0f);
    }
    Elements.PopClip();
    return Layer + 9;
}

FReply SOpenLegendMap::OnKeyDown(const FGeometry& Geometry, const FKeyEvent& Event)
{
    if (!bValidBounds) return FReply::Unhandled();
    const double Step = 0.08 / Zoom;
    const FKey Key = Event.GetKey();
    if (Key == EKeys::Left) PanTo(Center - FVector2D(Step, 0));
    else if (Key == EKeys::Right) PanTo(Center + FVector2D(Step, 0));
    else if (Key == EKeys::Up) PanTo(Center - FVector2D(0, Step));
    else if (Key == EKeys::Down) PanTo(Center + FVector2D(0, Step));
    else return FReply::Unhandled();
    return FReply::Handled();
}

FReply SOpenLegendMap::OnMouseButtonDown(const FGeometry& Geometry, const FPointerEvent& Event)
{
    if (!bValidBounds || Event.GetEffectingButton() != EKeys::LeftMouseButton) return FReply::Unhandled();
    DragStart = Geometry.AbsoluteToLocal(Event.GetScreenSpacePosition());
    StartCenter = Center;
    bDragged = false;
    return FReply::Handled().SetUserFocus(SharedThis(this), EFocusCause::Mouse).CaptureMouse(SharedThis(this));
}

FReply SOpenLegendMap::OnMouseButtonUp(const FGeometry& Geometry, const FPointerEvent& Event)
{
    if (!DragStart || Event.GetEffectingButton() != EKeys::LeftMouseButton) return FReply::Unhandled();
    DragStart.Reset();
    const auto Size = Geometry.GetLocalSize();
    if (bValidBounds && !bDragged && Select && Size.X > 0 && Size.Y > 0)
    {
        const auto Local = Geometry.AbsoluteToLocal(Event.GetScreenSpacePosition());
        const auto Extent = PictureSize(Size);
        const auto Relative = Local - Size * 0.5 + Center * Extent;
        const FVector2D Normal(Relative.X / Extent.X, Relative.Y / Extent.Y);
        const FVector2D Point(Min.X + Normal.X * (Max.X - Min.X), Max.Y - Normal.Y * (Max.Y - Min.Y));
        if (Contains(Point) && Local.X >= 0 && Local.X <= Size.X && Local.Y >= 0 && Local.Y <= Size.Y)
        {
            int32 Hit = INDEX_NONE;
            double Distance = 8 * 8;
            for (int32 Index = 0; Index < Pins.Num(); ++Index)
            {
                if (!Contains(Pins[Index].Point)) continue;
                const double Candidate = FVector2D::DistSquared(Relative, Normalized(Pins[Index].Point) * Extent);
                if (Candidate < Distance)
                {
                    Hit = Index;
                    Distance = Candidate;
                }
            }
            Select(Point, Hit);
        }
    }
    return FReply::Handled().ReleaseMouseCapture();
}

FReply SOpenLegendMap::OnMouseMove(const FGeometry& Geometry, const FPointerEvent& Event)
{
    const auto Size = Geometry.GetLocalSize();
    if (!DragStart || !bValidBounds || Size.X <= 0 || Size.Y <= 0) return FReply::Unhandled();
    const auto Delta = Geometry.AbsoluteToLocal(Event.GetScreenSpacePosition()) - *DragStart;
    bDragged = bDragged || Delta.SizeSquared() >= 4 * 4;
    if (bDragged)
    {
        const auto Extent = PictureSize(Size);
        PanTo(StartCenter - FVector2D(Delta.X / Extent.X, Delta.Y / Extent.Y));
    }
    return FReply::Handled();
}

FReply SOpenLegendMap::OnMouseWheel(const FGeometry& Geometry, const FPointerEvent& Event)
{
    if (!bValidBounds) return FReply::Unhandled();
    ZoomBy(FMath::Pow(1.2, Event.GetWheelDelta()));
    return FReply::Handled();
}

void SOpenLegendMap::OnMouseCaptureLost(const FCaptureLostEvent& Event)
{
    DragStart.Reset();
    SLeafWidget::OnMouseCaptureLost(Event);
}
}
