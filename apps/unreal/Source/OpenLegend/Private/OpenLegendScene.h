#pragma once

#include "GameFramework/Actor.h"
#include "OpenLegendJson.h"
#include "TimerManager.h"
#include "OpenLegendScene.generated.h"

class UAnimationAsset;
class ULineBatchComponent;
class UMeshComponent;
class UStaticMeshComponent;
class UStaticMesh;

UCLASS()
class AOpenLegendScene final : public AActor
{
    GENERATED_BODY()

public:
    AOpenLegendScene();
    void Apply(const OpenLegend::FObject& View);
    void Clear();
    void DisplaySelf(const FVector& Foot, double Yaw);
    void SetSightGuide(bool bEnabled);
    bool ConstrainStep(FVector& Foot, FString& Support, const FVector2D& Direction,
        double Metres, double Diameter, double Height, double MaxSlope) const;
    FString ContactAt(const FHitResult& Hit) const;
    OpenLegend::FObject CurrentContact(const FString& PublicId) const;
    // Build the selection choices only when the player opens the nearby view.
    TArray<TPair<FString, FString>> ContactChoices() const;
    uint64 CameraGeometryRevision() const { return GeometryRevision; }
    FString SupportAt(const FHitResult& Hit) const;
    FString BlockerAt(const FHitResult& Hit) const;

private:
    struct FSurface
    {
        FString Id;
        double MinX, MaxX, MinZ, MaxZ, Y, SlopeX, SlopeZ;
        bool bTerrain;
        TWeakObjectPtr<UPrimitiveComponent> Mesh;
        TArray<int32, TInlineAllocator<4>> SeamCandidates;
        bool Contains(const FVector& Point) const;
        double HeightAt(const FVector& Point) const;
        double DistanceToEdge(const FVector& Point, const FVector2D& Direction) const;
    };

    struct FBodyArt
    {
        TArray<TWeakObjectPtr<UMeshComponent>> Parts;
        TWeakObjectPtr<UAnimationAsset> Idle, Run;
        FTimerHandle IdleTimer;
        bool bMoving = false;
        FBox Bounds = FBox(ForceInit);
        FString Paths;
        FVector Offset = FVector::ZeroVector;
        double Height = 0;
    };

    struct FContact
    {
        TWeakObjectPtr<UStaticMeshComponent> Mesh;
        FVector Foot;
        double Heading = 0, Width = 0, Height = 0;
        OpenLegend::FObject Projection;
        FBodyArt Art;
    };

    struct FSight
    {
        FVector Foot;
        int32 Support = INDEX_NONE;
        double Radius = 0, Aperture = 0, Heading = 0, Eye = 0, ReferenceHeight = 0;
        bool operator==(const FSight&) const = default;
    };

    struct FSupportKeyFuncs : TDefaultMapHashableKeyFuncs<FString, int32, false>
    {
        // Authored support IDs are exact, including case.
        static bool Matches(const FString& A, const FString& B)
        {
            return A.Equals(B, ESearchCase::CaseSensitive);
        }
    };

    UPROPERTY()
    TObjectPtr<UStaticMesh> BodyShape;
    UPROPERTY()
    TObjectPtr<UStaticMesh> BoxShape;
    UPROPERTY()
    TObjectPtr<UStaticMeshComponent> OwnBody;
    UPROPERTY()
    TObjectPtr<ULineBatchComponent> SightOutline;
    TArray<TWeakObjectPtr<UPrimitiveComponent>> Geometry;
    TMap<TWeakObjectPtr<UPrimitiveComponent>, int32> PickableSupports;
    TMap<TWeakObjectPtr<UPrimitiveComponent>, FString> PickableBlockers;
    TMap<TWeakObjectPtr<UPrimitiveComponent>, FString> PickableContacts;
    TMap<FString, FContact> Contacts;
    TArray<FSurface> Surfaces;
    TMap<FString, int32, FDefaultSetAllocator, FSupportKeyFuncs> SupportIds;
    TArray<uint8> WalkableTiles;
    int32 MapWidth = 0, MapHeight = 0;
    double OwnHeight = 0, OwnWidth = 0;
    OpenLegend::FObject Map;
    OpenLegend::FObject ArtRelease;
    TArray<FString> ArtIdentity;
    TArray<FString> Models;
    // Each matching selection has one pair of public clips, shared by its wearers.
    UPROPERTY(Transient)
    TArray<TObjectPtr<UAnimationAsset>> LoadedClips;
    FBodyArt OwnArt;
    bool bUseArt = false;
    TSharedPtr<const FJsonValue> EntityRows;
    uint64 GeometryRevision = 0;
    FString World, Timeline, Scope;
    bool bHasGeometry = false;
    bool bSightGuide = false;
    TOptional<FSight> Sight;

    void BuildPublicScene(const OpenLegend::FObject& NewMap);
    bool LoadPublicGeometry(const OpenLegend::FObject& NewMap);
    void ClearGeometry();
    void ClearActors();
    // Select only from trusted cooked assets after checking the exact release.
    // Loads each currently observed body model on first use. Picking retains
    // the server-sized primitive even when the visual mesh replaces its draw.
    bool UpdateArt(FBodyArt& Art, UStaticMeshComponent& Body, const OpenLegend::FObject& Row,
        double Height);
    bool AllowsArt(const OpenLegend::FObject& Release) const;
    void ClearArt(FBodyArt& Art);
    static void AnimateBody(FBodyArt& Art, bool bMoving);
    void AnimateContact(const FString& Id, FBodyArt& Art);
    static void PlaceBody(UStaticMeshComponent& Body, FBodyArt& Art, const FVector& Foot,
        double Height, double Yaw);
    void AddSurface(FSurface Surface, UPrimitiveComponent* Shape);
    void IndexSupportSeams(int32 AuthoredCount);
    void CaptureSight(const OpenLegend::FObject& View, const OpenLegend::FObject& Player);
    void RefreshSightGuide();
    bool IsWalkable(const FSurface& Surface, const FVector& Point) const;
    bool TileWalkable(int32 X, int32 Z) const;
    bool TerrainSegment(const FVector& From, const FVector& To) const;
    bool SweepLeg(const FSurface& Surface, FVector& Foot, const FVector& Next,
        double Diameter, double Height) const;
    UStaticMeshComponent* Box(const FVector& Center, const FVector& Size, bool bMovement, bool bSight);
    UPrimitiveComponent* Prism(const FVector (&Top)[4], const FVector (&Bottom)[4], bool bMovement, bool bSight);
    UStaticMeshComponent* Body();
};
