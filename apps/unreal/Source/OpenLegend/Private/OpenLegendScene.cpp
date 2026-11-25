#include "OpenLegendScene.h"

#include "Animation/AnimationAsset.h"
#include "Components/LineBatchComponent.h"
#include "Components/SkeletalMeshComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Engine/SkeletalMesh.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "Misc/ConfigCacheIni.h"
#include "OpenLegendCoordinates.h"
#include "ProceduralMeshComponent.h"
#include "UObject/ConstructorHelpers.h"

using namespace OpenLegend;

namespace
{
    constexpr ECollisionChannel Movement = ECC_GameTraceChannel1;
    constexpr ECollisionChannel Camera = ECC_Camera;
    constexpr ECollisionChannel PublicSight = ECC_GameTraceChannel2;
    // This is a numerical tolerance for coincident public planes in the preview.
    constexpr double SeamEpsilon = 0.00001;

    void SetSize(UStaticMeshComponent& Mesh, double Diameter, double Height)
    {
        const FVector Size = Mesh.GetStaticMesh()->GetBoundingBox().GetSize();
        Mesh.SetRelativeScale3D(FVector(100 * Diameter / Size.X,
            100 * Diameter / Size.Y, 100 * Height / Size.Z));
    }

    void SetPublicCollision(UPrimitiveComponent& Part, bool bMovement, bool bSight)
    {
        Part.SetCollisionEnabled(ECollisionEnabled::QueryOnly);
        Part.SetCollisionResponseToAllChannels(ECR_Ignore);
        Part.SetCollisionResponseToChannel(ECC_Visibility, ECR_Block);
        Part.SetCollisionResponseToChannel(Camera, ECR_Block);
        if (bMovement) Part.SetCollisionResponseToChannel(Movement, ECR_Block);
        if (bSight) Part.SetCollisionResponseToChannel(PublicSight, ECR_Block);
    }

    bool SameNumber(const FObject& A, const FObject& B, const TCHAR* Key)
    {
        double First, Second;
        return Number(A, Key, First) && Number(B, Key, Second) && First == Second;
    }

    bool SamePublicMap(const FObject& A, const FObject& B)
    {
        const auto ALayout = Object(A, TEXT("spatial"));
        const auto BLayout = Object(B, TEXT("spatial"));
        return String(ALayout, TEXT("disclosure")) == TEXT("public")
            && String(BLayout, TEXT("disclosure")) == TEXT("public")
            && SameNumber(ALayout, BLayout, TEXT("version"))
            && SameNumber(ALayout, BLayout, TEXT("revision"))
            && SameNumber(A, B, TEXT("width")) && SameNumber(A, B, TEXT("height"))
            && SameNumber(A, B, TEXT("seed"));
    }
}

AOpenLegendScene::AOpenLegendScene()
{
    SetRootComponent(CreateDefaultSubobject<USceneComponent>(TEXT("Scene")));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
    BodyShape = Sphere.Object;
    BoxShape = Cube.Object;
    if (GConfig)
    {
        const TCHAR* Section = TEXT("OpenLegend.Art");
        const TCHAR* Keys[] = {TEXT("OwnerKind"), TEXT("OwnerId"), TEXT("AssetId"),
            TEXT("RevisionId"), TEXT("ManifestSha256")};
        for (const TCHAR* Key : Keys)
        {
            FString Value;
            if (!GConfig->GetString(Section, Key, Value, GGameIni) || Value.IsEmpty())
            {
                ArtIdentity.Reset();
                break;
            }
            ArtIdentity.Add(MoveTemp(Value));
        }
        GConfig->GetArray(Section, TEXT("Model"), Models, GGameIni);
    }
}

bool AOpenLegendScene::FSurface::Contains(const FVector& P) const
{
    return P.X >= MinX - SeamEpsilon && P.X <= MaxX + SeamEpsilon
        && P.Z >= MinZ - SeamEpsilon && P.Z <= MaxZ + SeamEpsilon;
}

double AOpenLegendScene::FSurface::HeightAt(const FVector& P) const
{
    return Y + (P.X - MinX) * SlopeX + (P.Z - MinZ) * SlopeZ;
}

double AOpenLegendScene::FSurface::DistanceToEdge(const FVector& P, const FVector2D& Dir) const
{
    double Exit = TNumericLimits<double>::Max();
    if (Dir.X != 0)
        Exit = FMath::Min(Exit, ((Dir.X > 0 ? MaxX : MinX) - P.X) / Dir.X);
    if (Dir.Y != 0)
        Exit = FMath::Min(Exit, ((Dir.Y > 0 ? MaxZ : MinZ) - P.Z) / Dir.Y);
    return FMath::Max(0.0, Exit);
}

UStaticMeshComponent* AOpenLegendScene::Body()
{
    if (!BodyShape) return nullptr;
    auto* Mesh = NewObject<UStaticMeshComponent>(this);
    Mesh->SetStaticMesh(BodyShape);
    Mesh->SetCollisionEnabled(ECollisionEnabled::QueryOnly);
    Mesh->SetCollisionResponseToAllChannels(ECR_Ignore);
    Mesh->SetCollisionResponseToChannel(ECC_Visibility, ECR_Block);
    Mesh->SetupAttachment(GetRootComponent());
    Mesh->RegisterComponent();
    return Mesh;
}

UStaticMeshComponent* AOpenLegendScene::Box(const FVector& Center, const FVector& Size,
    bool bMovement, bool bSight)
{
    if (!BoxShape) return nullptr;
    auto* Mesh = NewObject<UStaticMeshComponent>(this);
    Mesh->SetStaticMesh(BoxShape);
    SetPublicCollision(*Mesh, bMovement, bSight);
    Mesh->SetupAttachment(GetRootComponent());
    Mesh->SetRelativeLocation(Center);
    Mesh->SetRelativeScale3D(Size / BoxShape->GetBoundingBox().GetSize());
    Mesh->RegisterComponent();
    Geometry.Add(Mesh);
    return Mesh;
}

UPrimitiveComponent* AOpenLegendScene::Prism(
    const FVector (&Top)[4], const FVector (&Bottom)[4], bool bMovement, bool bSight)
{
    TArray<FVector> Hull;
    Hull.Reserve(8);
    FVector Center = FVector::ZeroVector;
    for (const auto& Face : {Top, Bottom})
    {
        for (int32 I = 0; I < 4; ++I)
        {
            Hull.Add(ToScene(Face[I]));
            Center += Hull.Last() / 8;
        }
    }

    TArray<FVector> Vertices, Normals;
    TArray<int32> Triangles;
    TArray<FVector2D> UV;
    Vertices.Reserve(24);
    Normals.Reserve(24);
    Triangles.Reserve(36);
    UV.Reserve(24);
    const int32 Faces[6][4] = {
        {0, 1, 2, 3}, {4, 7, 6, 5}, {0, 4, 5, 1},
        {1, 5, 6, 2}, {2, 6, 7, 3}, {3, 7, 4, 0},
    };
    for (const auto& Face : Faces)
    {
        const FVector& A = Hull[Face[0]];
        const FVector& B = Hull[Face[1]];
        const FVector& C = Hull[Face[2]];
        FVector Normal = FVector::CrossProduct(C - A, B - A).GetSafeNormal();
        if (Normal.IsNearlyZero()) continue;
        const bool bFlip = FVector::DotProduct(Normal, A - Center) < 0;
        if (bFlip) Normal = -Normal;
        const int32 Base = Vertices.Num();
        for (int32 I = 0; I < 4; ++I)
        {
            Vertices.Add(Hull[Face[I]]);
            Normals.Add(Normal);
        }
        UV.Append({{0, 0}, {1, 0}, {1, 1}, {0, 1}});
        if (bFlip) Triangles.Append({Base, Base + 2, Base + 1, Base, Base + 3, Base + 2});
        else Triangles.Append({Base, Base + 1, Base + 2, Base, Base + 2, Base + 3});
    }

    auto* Mesh = NewObject<UProceduralMeshComponent>(this);
    Mesh->SetupAttachment(GetRootComponent());
    Mesh->bUseComplexAsSimpleCollision = false;
    SetPublicCollision(*Mesh, bMovement, bSight);
    Mesh->CreateMeshSection_LinearColor(0, Vertices, Triangles, Normals, UV, {}, {}, false);
    Mesh->AddCollisionConvexMesh(MoveTemp(Hull));
    Mesh->RegisterComponent();
    Geometry.Add(Mesh);
    return Mesh;
}

void AOpenLegendScene::ClearGeometry()
{
    ++GeometryRevision;
    for (const auto& Part : Geometry)
        if (Part.IsValid()) Part->DestroyComponent();
    Geometry.Reset();
    PickableSupports.Reset();
    PickableBlockers.Reset();
    SupportIds.Reset();
    Surfaces.Reset();
    WalkableTiles.Reset();
    MapWidth = MapHeight = 0;
    Map.Reset();
    bHasGeometry = false;
    Sight.Reset();
    RefreshSightGuide();
}

bool AOpenLegendScene::AllowsArt(const FObject& Release) const
{
    if (!Release || ArtIdentity.Num() != 5) return false;
    const auto Owner = Object(Release, TEXT("owner"));
    return ArtIdentity[0].Equals(String(Owner, TEXT("kind")), ESearchCase::CaseSensitive)
        && ArtIdentity[1].Equals(String(Owner, TEXT("id")), ESearchCase::CaseSensitive)
        && ArtIdentity[2].Equals(String(Release, TEXT("assetId")), ESearchCase::CaseSensitive)
        && ArtIdentity[3].Equals(String(Release, TEXT("revisionId")), ESearchCase::CaseSensitive)
        && ArtIdentity[4].Equals(String(Release, TEXT("manifestSha256")), ESearchCase::CaseSensitive);
}

void AOpenLegendScene::ClearArt(FBodyArt& Art)
{
    if (auto* SceneWorld = GetWorld(); SceneWorld && Art.IdleTimer.IsValid())
        SceneWorld->GetTimerManager().ClearTimer(Art.IdleTimer);
    for (const auto& Part : Art.Parts)
        if (Part.IsValid()) Part->DestroyComponent();
    Art = {};
}

bool AOpenLegendScene::UpdateArt(FBodyArt& Art, UStaticMeshComponent& Body, const FObject& Row,
    double Height)
{
    FString Path;
    if (bUseArt && String(Row, TEXT("bodyState")).IsEmpty())
    {
        const FString Key = String(Row, TEXT("appearance")) + TEXT("|");
        const FString Family = String(Row, TEXT("kind")) + TEXT(":") + String(Row, TEXT("subtype")) + TEXT("|");
        for (const FString& Model : Models)
        {
            if (Model.StartsWith(Key, ESearchCase::CaseSensitive))
            {
                Path = Model.RightChop(Key.Len());
                break;
            }
            if (Model.StartsWith(Family, ESearchCase::CaseSensitive))
                Path = Model.RightChop(Family.Len());
        }
    }
    if (Path.Equals(Art.Paths, ESearchCase::CaseSensitive) && Height == Art.Height) return false;
    if (!Path.Equals(Art.Paths, ESearchCase::CaseSensitive))
    {
        ClearArt(Art);
        TArray<FString> Parts;
        Path.ParseIntoArray(Parts, TEXT("|"));
        if (Parts.Num() >= 3)
        {
            if (auto* Idle = LoadObject<UAnimationAsset>(nullptr, *Parts[0]))
            {
                LoadedClips.AddUnique(Idle);
                Art.Idle = Idle;
            }
            if (auto* Run = LoadObject<UAnimationAsset>(nullptr, *Parts[1]))
            {
                LoadedClips.AddUnique(Run);
                Art.Run = Run;
            }
        }
        for (int32 I = 2; I < Parts.Num(); ++I)
        {
            auto* Mesh = LoadObject<UObject>(nullptr, *Parts[I]);
            UMeshComponent* Visual = nullptr;
            if (auto* Skeletal = Cast<USkeletalMesh>(Mesh))
            {
                auto* Component = NewObject<USkeletalMeshComponent>(this);
                Component->SetSkeletalMeshAsset(Skeletal);
                Art.Bounds += Skeletal->GetBounds().GetBox();
                Visual = Component;
            }
            else if (auto* Static = Cast<UStaticMesh>(Mesh))
            {
                auto* Component = NewObject<UStaticMeshComponent>(this);
                Component->SetStaticMesh(Static);
                Art.Bounds += Static->GetBoundingBox();
                Visual = Component;
            }
            if (!Visual) break;
            Visual->SetCollisionEnabled(ECollisionEnabled::NoCollision);
            Visual->SetupAttachment(GetRootComponent());
            Visual->RegisterComponent();
            if (auto* Skeletal = Cast<USkeletalMeshComponent>(Visual))
            {
                if (auto* Idle = Art.Idle.Get()) Skeletal->PlayAnimation(Idle, true);
                else Skeletal->SetComponentTickEnabled(false);
            }
            Art.Parts.Add(Visual);
        }
        if (Art.Parts.Num() != Parts.Num() - 2
            || !Art.Idle.IsValid() || !Art.Run.IsValid() || Art.Bounds.GetSize().Z <= UE_DOUBLE_SMALL_NUMBER)
            ClearArt(Art);
        Art.Paths = Path;
        Body.SetVisibility(Art.Parts.IsEmpty());
        Body.SetCastShadow(Art.Parts.IsEmpty());
    }
    Art.Height = Height;
    if (!Art.Parts.IsEmpty())
    {
        const double Scale = Height * 100 / Art.Bounds.GetSize().Z;
        const FVector Center = Art.Bounds.GetCenter();
        Art.Offset = FVector(-Center.X, -Center.Y, -Art.Bounds.Min.Z) * Scale;
        for (const auto& Part : Art.Parts)
            if (Part.IsValid()) Part->SetWorldScale3D(FVector(Scale));
    }
    return true;
}

void AOpenLegendScene::AnimateBody(FBodyArt& Art, bool bMoving)
{
    if (Art.bMoving == bMoving) return;
    Art.bMoving = bMoving;
    auto* Clip = bMoving ? Art.Run.Get() : Art.Idle.Get();
    if (!Clip) return;
    for (const auto& Part : Art.Parts)
        if (auto* Skeletal = Cast<USkeletalMeshComponent>(Part.Get()))
            Skeletal->PlayAnimation(Clip, true);
}

void AOpenLegendScene::AnimateContact(const FString& Id, FBodyArt& Art)
{
    if (!Art.Run.IsValid()) return;
    AnimateBody(Art, true);
    // A contact can stop without another movement row. Keep the appearance
    // stationary and return to idle once the most recent observed step ages out.
    GetWorldTimerManager().SetTimer(Art.IdleTimer, FTimerDelegate::CreateWeakLambda(this, [this, Id]
    {
        if (auto* Contact = Contacts.Find(Id)) AnimateBody(Contact->Art, false);
    }), 0.3f, false);
}

void AOpenLegendScene::PlaceBody(UStaticMeshComponent& Body, FBodyArt& Art, const FVector& Foot,
    double Height, double Yaw)
{
    const FVector At = ToScene(Foot);
    const FRotator Rotation(0, Yaw, 0);
    Body.SetWorldLocationAndRotation(At + FVector(0, 0, Height * 50), Rotation);
    if (!Art.Parts.IsEmpty())
    {
        const FVector Origin = At + Rotation.RotateVector(Art.Offset);
        for (const auto& Part : Art.Parts)
            if (Part.IsValid()) Part->SetWorldLocationAndRotation(Origin, Rotation);
    }
}

void AOpenLegendScene::ClearActors()
{
    EntityRows.Reset();
    for (auto& Entry : Contacts)
    {
        ClearArt(Entry.Value.Art);
        if (Entry.Value.Mesh.IsValid()) Entry.Value.Mesh->DestroyComponent();
    }
    Contacts.Reset();
    PickableContacts.Reset();
    ClearArt(OwnArt);
    if (OwnBody) OwnBody->DestroyComponent();
    OwnBody = nullptr;
    OwnHeight = OwnWidth = 0;
    Sight.Reset();
    RefreshSightGuide();
}

void AOpenLegendScene::Clear()
{
    ClearActors();
    ClearGeometry();
    World.Reset();
    Timeline.Reset();
    Scope.Reset();
    ArtRelease.Reset();
    bUseArt = false;
}

void AOpenLegendScene::BuildPublicScene(const FObject& NewMap)
{
    ClearGeometry();
    if (!LoadPublicGeometry(NewMap))
        ClearGeometry();
    else
        bHasGeometry = true;
    Map = NewMap;
}

void AOpenLegendScene::AddSurface(FSurface Surface, UPrimitiveComponent* Shape)
{
    Surface.Mesh = Shape;
    const int32 Index = Surfaces.Add(MoveTemp(Surface));
    SupportIds.Add(Surfaces[Index].Id, Index);
    PickableSupports.Add(Shape, Index);
}

void AOpenLegendScene::IndexSupportSeams(int32 AuthoredCount)
{
    const auto JoinIfCoincident = [&](int32 I, int32 J)
    {
        auto& A = Surfaces[I];
        auto& B = Surfaces[J];
        const double MinX = FMath::Max(A.MinX, B.MinX);
        const double MaxX = FMath::Min(A.MaxX, B.MaxX);
        const double MinZ = FMath::Max(A.MinZ, B.MinZ);
        const double MaxZ = FMath::Min(A.MaxZ, B.MaxZ);
        if (MinX > MaxX + 2 * SeamEpsilon || MinZ > MaxZ + 2 * SeamEpsilon) return;

        // The height difference is linear over the overlap. Extrema only
        // occur at corners. Pad the domain for Contains's coordinate allowance.
        double Lowest = TNumericLimits<double>::Max(), Highest = -Lowest;
        for (const double X : {MinX - SeamEpsilon, MaxX + SeamEpsilon})
        for (const double Z : {MinZ - SeamEpsilon, MaxZ + SeamEpsilon})
        {
            const FVector Point(X, 0, Z);
            const double Difference = A.HeightAt(Point) - B.HeightAt(Point);
            Lowest = FMath::Min(Lowest, Difference);
            Highest = FMath::Max(Highest, Difference);
        }
        if (Lowest <= 2 * SeamEpsilon && Highest >= -2 * SeamEpsilon)
        {
            A.SeamCandidates.Add(J);
            B.SeamCandidates.Add(I);
        }
    };

    // Authored supports can span arbitrary parts of the finite scene.
    for (int32 I = 0; I < AuthoredCount; ++I)
        for (int32 J = I + 1; J < Surfaces.Num(); ++J)
            JoinIfCoincident(I, J);

    // Generated supports each cover one tile. In release order the only
    // possible earlier neighbours are the three above and the one to the left.
    TMap<FIntPoint, int32> EarlierTiles;
    EarlierTiles.Reserve(Surfaces.Num() - AuthoredCount);
    const FIntPoint PriorNeighbours[] = {{-1, -1}, {0, -1}, {1, -1}, {-1, 0}};
    for (int32 I = AuthoredCount; I < Surfaces.Num(); ++I)
    {
        const auto& Surface = Surfaces[I];
        const FIntPoint Tile(FMath::RoundToInt(Surface.MinX + 0.5), FMath::RoundToInt(Surface.MinZ + 0.5));
        for (const auto& Offset : PriorNeighbours)
            if (const int32* Earlier = EarlierTiles.Find(Tile + Offset))
                JoinIfCoincident(*Earlier, I);
        EarlierTiles.Add(Tile, I);
    }
}

bool AOpenLegendScene::LoadPublicGeometry(const FObject& NewMap)
{
    const auto Layout = Object(NewMap, TEXT("spatial"));
    const auto& Authored = Array(Layout, TEXT("surfaces"));
    const auto& Tiles = Array(NewMap, TEXT("tiles"));
    double Width, Depth, Revision;
    // These match the admitted geometry release's finite map dimensions and layout version.
    if (String(Layout, TEXT("disclosure")) != TEXT("public") || NumberOr(Layout, TEXT("version"), 0) != 1
        || !Number(Layout, TEXT("revision"), Revision) || Revision < 0
        || !Number(NewMap, TEXT("width"), Width) || Width < 2 || Width > 128
        || !Number(NewMap, TEXT("height"), Depth) || Depth < 2 || Depth > 128
        || FMath::FloorToDouble(Width) != Width || FMath::FloorToDouble(Depth) != Depth
        || Tiles.Num() != Depth || Authored.IsEmpty() || Authored.Num() > 32) return false;
    MapWidth = static_cast<int32>(Width);
    MapHeight = static_cast<int32>(Depth);
    WalkableTiles.Reserve(MapWidth * MapHeight);

    for (const auto& Entry : Authored)
    {
        const auto RecordValue = Record(Entry);
        FSurface Surface{};
        Surface.Id = String(RecordValue, TEXT("id"));
        Surface.bTerrain = Bool(RecordValue, TEXT("terrain"));
        double Thickness, Base = 0;
        const bool bSolidBase = Number(RecordValue, TEXT("solidBase"), Base);
        if (Surface.Id.IsEmpty() || SupportIds.Contains(Surface.Id)
            || !Number(RecordValue, TEXT("minX"), Surface.MinX)
            || !Number(RecordValue, TEXT("maxX"), Surface.MaxX)
            || !Number(RecordValue, TEXT("minZ"), Surface.MinZ)
            || !Number(RecordValue, TEXT("maxZ"), Surface.MaxZ)
            || !Number(RecordValue, TEXT("y"), Surface.Y)
            || !Number(RecordValue, TEXT("slopeX"), Surface.SlopeX)
            || !Number(RecordValue, TEXT("slopeZ"), Surface.SlopeZ)
            || !Number(RecordValue, TEXT("thickness"), Thickness)
            || Surface.MinX >= Surface.MaxX || Surface.MinZ >= Surface.MaxZ || Thickness <= 0)
            return false;
        FVector Top[] = {{Surface.MinX, 0, Surface.MinZ}, {Surface.MaxX, 0, Surface.MinZ},
            {Surface.MaxX, 0, Surface.MaxZ}, {Surface.MinX, 0, Surface.MaxZ}};
        FVector Bottom[4];
        for (int32 I = 0; I < 4; ++I)
        {
            Top[I].Y = Surface.HeightAt(Top[I]);
            Bottom[I] = Top[I];
            Bottom[I].Y = bSolidBase ? Base : Top[I].Y - Thickness;
            if (Bottom[I].Y > Top[I].Y) return false;
        }
        UPrimitiveComponent* Shape = nullptr;
        if (BoxShape && Surface.SlopeX == 0 && Surface.SlopeZ == 0 && Top[0].Y > Bottom[0].Y)
        {
            // Level slabs share the cube's collision resource. A sloped support
            // uses its own convex hull so it keeps the actual walkable plane.
            const FVector Min = Bottom[0], Max = Top[2];
            Shape = Box(ToScene((Min + Max) / 2), ToScene(Max - Min).GetAbs(), true, true);
        }
        else
        {
            Shape = Prism(Top, Bottom, true, true);
        }
        AddSurface(MoveTemp(Surface), Shape);
    }

    int32 Pieces = 0;
    auto AddBox = [&](const FString& Id, const FObject& Bounds, bool bMovement, bool bSight)
    {
        FVector Min, Max;
        if (++Pieces > 256 || !Point(Object(Bounds, TEXT("min")), Min)
            || !Point(Object(Bounds, TEXT("max")), Max)
            || Min.X >= Max.X || Min.Y >= Max.Y || Min.Z >= Max.Z)
            return false;
        auto* Shape = Box(ToScene((Min + Max) / 2), ToScene(Max - Min).GetAbs(), bMovement, bSight);
        if (Shape && bSight && !Id.IsEmpty()) PickableBlockers.Add(Shape, Id);
        return Shape != nullptr;
    };
    for (const auto& Entry : Array(Layout, TEXT("blockers")))
    {
        const auto Blocker = Record(Entry);
        if (!Blocker) return false;
        const FString Id = String(Blocker, TEXT("id"));
        const bool bMovement = Bool(Blocker, TEXT("movement"));
        const bool bSight = Bool(Blocker, TEXT("sight"));
        if (const auto Panel = Object(Blocker, TEXT("panel")))
        {
            double Thickness;
            const auto& Corners = Array(Panel, TEXT("corners"));
            if (++Pieces > 256 || Corners.Num() != 4 || !Number(Panel, TEXT("thickness"), Thickness)
                || Thickness <= 0)
                return false;
            FVector Top[4], Bottom[4];
            for (int32 I = 0; I < 4; ++I)
                if (!Point(Record(Corners[I]), Top[I])) return false;
            const FVector Normal = FVector::CrossProduct(Top[1] - Top[0], Top[3] - Top[0]).GetSafeNormal();
            if (Normal.IsNearlyZero()) return false;
            for (int32 I = 0; I < 4; ++I)
                Bottom[I] = Top[I] - Normal * Thickness;
            if (auto* Shape = Prism(Top, Bottom, bMovement, bSight); Shape && bSight && !Id.IsEmpty())
                PickableBlockers.Add(Shape, Id);
        }
        else if (const auto& Boxes = Array(Blocker, TEXT("boxes")); !Boxes.IsEmpty())
        {
            for (const auto& Bounds : Boxes)
                if (!AddBox(Id, Record(Bounds), bMovement, bSight)) return false;
        }
        else if (!AddBox(Id, Object(Blocker, TEXT("bounds")), bMovement, bSight)) return false;
    }

    const auto Definitions = Object(NewMap, TEXT("terrain"));
    if (!Definitions) return false;
    for (int32 Z = 0; Z < MapHeight; ++Z)
    {
        if (!Tiles[Z] || Tiles[Z]->Type != EJson::Array) return false;
        const auto& Row = Tiles[Z]->AsArray();
        if (Row.Num() != MapWidth) return false;
        for (int32 X = 0; X < MapWidth; ++X)
        {
            if (!Row[X] || Row[X]->Type != EJson::String) return false;
            const auto Terrain = Object(Definitions, *Row[X]->AsString());
            bool bWalkable;
            if (!Terrain || !Terrain->TryGetBoolField(TEXT("walkable"), bWalkable)) return false;
            WalkableTiles.Add(bWalkable);
            const auto Solid = Object(Terrain, TEXT("solid"));
            if (!Solid) continue;

            double Height;
            if (++Pieces > 256 || !Number(Solid, TEXT("height"), Height) || Height <= 0)
                return false;
            double Low = TNumericLimits<double>::Max(), High = -Low;
            const auto AuthoredSurfaces = MakeArrayView(Surfaces).Left(Authored.Num());
            for (const double DX : {-0.5, 0.5})
            for (const double DZ : {-0.5, 0.5})
            {
                const FVector Foot(FMath::Clamp(X + DX, 0.0, double(MapWidth - 1)), 0,
                    FMath::Clamp(Z + DZ, 0.0, double(MapHeight - 1)));
                const FSurface* Surface = AuthoredSurfaces.FindByPredicate(
                    [&](const FSurface& S) { return S.bTerrain && S.Contains(Foot); });
                const double Y = Surface ? Surface->HeightAt(Foot) : 0;
                Low = FMath::Min(Low, Y);
                High = FMath::Max(High, Y);
            }
            High += Height;
            const bool bMovement = Bool(Solid, TEXT("movement"));
            auto* Shape = Box(ToScene(FVector(X, (Low + High) / 2, Z)),
                FVector(100, 100, (High - Low) * 100), bMovement, Bool(Solid, TEXT("sight")));
            if (!Shape) return false;
            if (bMovement)
            {
                FString Id = FString::Printf(TEXT("terrain-solid:%d:%d"), X, Z);
                if (SupportIds.Contains(Id)) return false;
                AddSurface({MoveTemp(Id), X - 0.5, X + 0.5, Z - 0.5, Z + 0.5, High, 0, 0, false, {}}, Shape);
            }
        }
    }
    IndexSupportSeams(Authored.Num());
    return true;
}

void AOpenLegendScene::Apply(const FObject& View)
{
    const FString NewWorld = String(View, TEXT("worldId"));
    const FString NewTimeline = String(View, TEXT("saveTimeline"));
    const FString NewScope = String(Object(View, TEXT("access")), TEXT("scope"));
    if (!View || NewWorld.IsEmpty() || NewTimeline.IsEmpty() || NewScope.IsEmpty())
    {
        Clear();
        return;
    }
    if (!World.Equals(NewWorld, ESearchCase::CaseSensitive)
        || !Timeline.Equals(NewTimeline, ESearchCase::CaseSensitive))
    {
        Clear();
        World = NewWorld;
        Timeline = NewTimeline;
    }
    if (!Scope.Equals(NewScope, ESearchCase::CaseSensitive))
    {
        ClearActors();
        Scope = NewScope;
    }
    const auto NewMap = Object(View, TEXT("map"));
    if (NewMap != Map)
    {
        if (bHasGeometry && SamePublicMap(NewMap, Map)) Map = NewMap;
        else BuildPublicScene(NewMap);
    }

    const auto Release = Object(View, TEXT("presentationRelease"));
    if (ArtRelease != Release)
    {
        ArtRelease = Release;
        const bool bAllowed = AllowsArt(Release);
        if (bAllowed != bUseArt)
        {
            bUseArt = bAllowed;
            // Force re-evaluation even if the permission update reused the body rows.
            EntityRows.Reset();
            for (auto& Entry : Contacts) Entry.Value.Projection.Reset();
        }
    }
    const auto Player = Object(View, TEXT("player"));
    CaptureSight(View, Player);
    const auto PlayerSize = Object(Player, TEXT("bodySize"));
    double Width, Height;
    if (String(Player, TEXT("bodyState")) == TEXT("removed") || !Number(PlayerSize, TEXT("width"), Width)
        || !Number(PlayerSize, TEXT("height"), Height) || Width <= 0 || Height <= 0)
    {
        ClearArt(OwnArt);
        if (OwnBody) OwnBody->DestroyComponent();
        OwnBody = nullptr;
        OwnHeight = OwnWidth = 0;
    }
    else
    {
        if (!OwnBody)
        {
            OwnBody = Body();
            if (OwnBody) OwnBody->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        }
        if (OwnBody && (Width != OwnWidth || Height != OwnHeight))
        {
            SetSize(*OwnBody, Width, Height);
            OwnWidth = Width;
            OwnHeight = Height;
        }
        if (OwnBody) UpdateArt(OwnArt, *OwnBody, Player, Height);
    }

    const auto Rows = View->TryGetField(TEXT("entities"));
    if (Rows == EntityRows) return;
    EntityRows = Rows;
    const auto& Entities = Array(View, TEXT("entities"));
    TSet<FString> Visible;
    Visible.Reserve(Entities.Num());
    for (const auto& Value : Entities)
    {
        const auto Source = Record(Value);
        const FString Id = String(Source, TEXT("id"));
        if (Id.IsEmpty()) continue;

        // The patch adapter preserves unchanged row objects. Only re-decode
        // changed authorized contacts, even when another body changed this array.
        auto* Existing = Contacts.Find(Id);
        if (Existing && Existing->Projection == Source)
        {
            Visible.Add(Id);
            continue;
        }
        const auto Observation = Object(Source, TEXT("observation"));
        if (String(Observation, TEXT("kind")) != TEXT("current")
            || String(Observation, TEXT("modality")) != TEXT("sight")
            || String(Source, TEXT("bodyState")) == TEXT("removed")) continue;
        const auto Size = Object(Source, TEXT("bodySize"));
        FVector Foot;
        double Heading;
        if (!Point(Object(Source, TEXT("position")), Foot)
            || !Number(Size, TEXT("width"), Width) || !Number(Size, TEXT("height"), Height)
            || !Number(Source, TEXT("heading"), Heading) || Width <= 0 || Height <= 0) continue;
        Visible.Add(Id);
        auto& Contact = Existing ? *Existing : Contacts.Add(Id);
        const bool bNew = !Contact.Mesh.IsValid();
        if (bNew)
        {
            Contact.Mesh = Body();
            if (Contact.Mesh.IsValid()) PickableContacts.Add(Contact.Mesh.Get(), Id);
        }
        if (auto* Mesh = Contact.Mesh.Get())
        {
            const bool bSizeChanged = bNew || Width != Contact.Width || Height != Contact.Height;
            if (bSizeChanged) SetSize(*Mesh, Width, Height);
            const bool bArtChanged = UpdateArt(Contact.Art, *Mesh, Source, Height);
            const bool bMoved = !bNew && !Foot.Equals(Contact.Foot, UE_DOUBLE_KINDA_SMALL_NUMBER);
            if (bArtChanged || bSizeChanged || bMoved || Heading != Contact.Heading)
                PlaceBody(*Mesh, Contact.Art, Foot, Height, ToSceneYaw(Heading));
            if (bMoved) AnimateContact(Id, Contact.Art);
        }
        Contact.Foot = Foot;
        Contact.Heading = Heading;
        Contact.Width = Width;
        Contact.Height = Height;
        Contact.Projection = Source;
    }
    for (auto It = Contacts.CreateIterator(); It; ++It)
    {
        if (Visible.Contains(It.Key())) continue;
        ClearArt(It.Value().Art);
        if (auto* Mesh = It.Value().Mesh.Get())
        {
            PickableContacts.Remove(Mesh);
            Mesh->DestroyComponent();
        }
        It.RemoveCurrent();
    }
}

void AOpenLegendScene::DisplaySelf(const FVector& Foot, double Yaw)
{
    if (!OwnBody) return;
    const FVector Location = ToScene(Foot) + FVector(0, 0, OwnHeight * 50);
    const FRotator Rotation(0, Yaw, 0);
    const bool bMoved = !OwnBody->GetComponentLocation().Equals(Location, UE_DOUBLE_KINDA_SMALL_NUMBER);
    if (bMoved || !OwnBody->GetComponentRotation().Equals(Rotation))
        PlaceBody(*OwnBody, OwnArt, Foot, OwnHeight, Yaw);
    else if (!OwnArt.Parts.IsEmpty())
    {
        const FVector At = ToScene(Foot) + Rotation.RotateVector(OwnArt.Offset);
        for (const auto& Part : OwnArt.Parts)
            if (Part.IsValid() &&
                (Part->GetComponentLocation() != At || !Part->GetComponentRotation().Equals(Rotation)))
                Part->SetWorldLocationAndRotation(At, Rotation);
    }
    AnimateBody(OwnArt, bMoved);
}

void AOpenLegendScene::SetSightGuide(bool bEnabled)
{
    if (bEnabled == bSightGuide) return;
    bSightGuide = bEnabled;
    RefreshSightGuide();
}

void AOpenLegendScene::CaptureSight(const FObject& View, const FObject& Player)
{
    const auto Vision = Object(View, TEXT("vision"));
    const auto& Heights = Array(Vision, TEXT("targetHeights"));
    TOptional<FSight> Next;
    FSight Facts;
    if (bHasGeometry && Bool(Vision, TEXT("enabled")) && Point(Object(Player, TEXT("position")), Facts.Foot)
        && Number(Vision, TEXT("radius"), Facts.Radius) && Facts.Radius > 0
        && Number(Vision, TEXT("fieldOfViewRadians"), Facts.Aperture) && Facts.Aperture > 0
        && Number(Vision, TEXT("eyeHeight"), Facts.Eye)
        && Heights.IsValidIndex(1) && Heights[1] && Heights[1]->Type == EJson::Number)
    {
        const int32* Support = SupportIds.Find(String(Player, TEXT("supportSurfaceId")));
        Facts.ReferenceHeight = Heights[1]->AsNumber();
        // An all-around sense provides no heading. Directional shapes must
        // use the measured heading and never follow predicted or camera yaw.
        if (Support && FMath::IsFinite(Facts.ReferenceHeight) && (Facts.Aperture >= UE_DOUBLE_TWO_PI
            || Number(Vision, TEXT("heading"), Facts.Heading)))
        {
            // A geometry rebuild discards the guide before replacing its supports.
            Facts.Support = *Support;
            Next = MoveTemp(Facts);
        }
    }
    if (Next != Sight)
    {
        Sight = MoveTemp(Next);
        if (bSightGuide) RefreshSightGuide();
    }
}

void AOpenLegendScene::RefreshSightGuide()
{
    const FSight* Facts = bSightGuide && bHasGeometry && Sight.IsSet() ? &Sight.GetValue() : nullptr;
    const FSurface* Surface = Facts ? &Surfaces[Facts->Support] : nullptr;
    if (!Surface || !Surface->Contains(Facts->Foot))
    {
        if (SightOutline) SightOutline->Flush();
        return;
    }
    if (!SightOutline)
    {
        SightOutline = NewObject<ULineBatchComponent>(this);
        SightOutline->SetupAttachment(GetRootComponent());
        SightOutline->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        SightOutline->RegisterComponent();
        SightOutline->SetComponentTickEnabled(false);
    }
    auto& Lines = SightOutline->BatchedLines;
    const FVector Eye = ToScene(Facts->Foot + FVector(0, Facts->Eye, 0));
    const FVector Anchor = ToScene(Facts->Foot);
    const double Aperture = FMath::Min(Facts->Aperture, double(UE_DOUBLE_TWO_PI));
    const bool bDirectional = Facts->Aperture < UE_DOUBLE_TWO_PI;
    // A bounded outline on the current support. This only queries public
    // collision and never selects contacts, grants sight, or wakes the host.
    constexpr int32 Samples = 32;
    // This component belongs exclusively to the outline. Replace its lines with
    // the same storage and invalidate the render state once for the whole outline.
    Lines.Reset(Samples + 2);
    const FLinearColor Color(0.1f, 0.8f, 0.7f);
    constexpr float Lift = 1.5f;
    const auto Line = [&](const FVector& Start, const FVector& End)
    {
        Lines.Emplace(Start + FVector(0, 0, Lift), End + FVector(0, 0, Lift),
            Color, -1.0f, 1.5f, SDPG_World);
    };
    FVector Previous = Anchor;
    for (int32 I = 0; I <= Samples; ++I)
    {
        const double Angle = Facts->Heading + Aperture * (double(I) / Samples - 0.5);
        const FVector2D Dir(FMath::Sin(Angle), FMath::Cos(Angle));
        const double Distance = FMath::Min(Facts->Radius, Surface->DistanceToEdge(Facts->Foot, Dir));
        FVector End = Facts->Foot + FVector(Dir.X, 0, Dir.Y) * Distance;
        End.Y = Surface->HeightAt(End);
        FHitResult Hit;
        if (GetWorld()->LineTraceSingleByChannel(Hit, Eye,
            ToScene(End + FVector(0, Facts->ReferenceHeight, 0)), PublicSight))
        {
            End = FMath::Lerp(Facts->Foot, End, double(Hit.Time));
            End.Y = Surface->HeightAt(End);
        }
        const FVector Next = ToScene(End);
        if (I != 0 || bDirectional) Line(Previous, Next);
        Previous = Next;
    }
    if (bDirectional) Line(Previous, Anchor);
    SightOutline->MarkRenderStateDirty();
}

bool AOpenLegendScene::TileWalkable(int32 X, int32 Z) const
{
    return X >= 0 && X < MapWidth && Z >= 0 && Z < MapHeight
        && WalkableTiles[Z * MapWidth + X];
}

bool AOpenLegendScene::IsWalkable(const FSurface& Surface, const FVector& P) const
{
    return !Surface.bTerrain || (P.X >= -SeamEpsilon && P.X <= MapWidth - 1 + SeamEpsilon
        && P.Z >= -SeamEpsilon && P.Z <= MapHeight - 1 + SeamEpsilon
        && TileWalkable(FMath::RoundToInt(P.X), FMath::RoundToInt(P.Z)));
}

bool AOpenLegendScene::TerrainSegment(const FVector& From, const FVector& To) const
{
    // Tile centres are integral metres in the public map. Cross boundaries at half
    // metres, including side neighbours at a diagonal corner.
    int32 X = FMath::RoundToInt(From.X), Z = FMath::RoundToInt(From.Z);
    const int32 EndX = FMath::RoundToInt(To.X), EndZ = FMath::RoundToInt(To.Z);
    const FVector Delta = To - From;
    const int32 SX = Delta.X >= 0 ? 1 : -1;
    const int32 SZ = Delta.Z >= 0 ? 1 : -1;
    const double Never = TNumericLimits<double>::Max();
    while (TileWalkable(X, Z))
    {
        if (X == EndX && Z == EndZ) return true;
        const double TX = X == EndX ? Never : (X + 0.5 * SX - From.X) / Delta.X;
        const double TZ = Z == EndZ ? Never : (Z + 0.5 * SZ - From.Z) / Delta.Z;
        if (FMath::Min(TX, TZ) >= 1) return TileWalkable(EndX, EndZ);
        if (TX == TZ && (!TileWalkable(X + SX, Z) || !TileWalkable(X, Z + SZ))) return false;
        if (TX <= TZ) X += SX;
        if (TZ <= TX) Z += SZ;
    }
    return false;
}

bool AOpenLegendScene::SweepLeg(const FSurface& Surface, FVector& Foot, const FVector& Next,
    double Diameter, double Height) const
{
    const double Radius = Diameter * 50;
    const double HalfHeight = Height * 50;
    const FVector Center(0, 0, HalfHeight);
    const auto Shape = FCollisionShape::MakeCapsule(Radius, FMath::Max(Radius, HalfHeight));
    FCollisionQueryParams Query;
    Query.AddIgnoredComponent(Surface.Mesh);
    for (int32 Attempt = 0; Attempt <= Surfaces.Num(); ++Attempt)
    {
        FHitResult Hit;
        if (!GetWorld()->SweepSingleByChannel(Hit, ToScene(Foot) + Center,
            ToScene(Next) + Center, FQuat::Identity, Movement, Shape, Query))
        {
            Foot = Next;
            return true;
        }
        const int32* Touched = PickableSupports.Find(Hit.GetComponent());
        if (Touched)
        {
            const FSurface& Neighbour = Surfaces[*Touched];
            const auto Above = [&](const FVector& P)
            {
                const FVector Nearest(FMath::Clamp(P.X, Neighbour.MinX, Neighbour.MaxX), P.Y,
                    FMath::Clamp(P.Z, Neighbour.MinZ, Neighbour.MaxZ));
                return P.Y + SeamEpsilon >= Neighbour.HeightAt(Nearest);
            };
            const auto AtEdges = [&](double A, double B, double Min, double Max)
            {
                if (A == B) return true;
                for (const double Edge : {Min, Max})
                {
                    const double Alpha = (Edge - A) / (B - A);
                    if (Alpha > 0 && Alpha < 1 && !Above(FMath::Lerp(Foot, Next, Alpha))) return false;
                }
                return true;
            };
            if (Above(Foot) && Above(Next) && AtEdges(Foot.X, Next.X, Neighbour.MinX, Neighbour.MaxX)
                && AtEdges(Foot.Z, Next.Z, Neighbour.MinZ, Neighbour.MaxZ))
            {
                Query.AddIgnoredComponent(Neighbour.Mesh);
                continue;
            }
        }
        if (!Hit.bStartPenetrating)
        {
            const double Length = FVector::Distance(Foot, Next);
            const double Travel = FMath::Max(0.0, double(Hit.Time) - SeamEpsilon / FMath::Max(Length, SeamEpsilon));
            Foot = FMath::Lerp(Foot, Next, Travel);
        }
        return false;
    }
    return false;
}

bool AOpenLegendScene::ConstrainStep(FVector& Foot, FString& Support, const FVector2D& Dir,
    double Metres, double Diameter, double Height, double MaxSlope) const
{
    const int32* Index = SupportIds.Find(Support);
    if (!bHasGeometry || !Index || Dir.IsNearlyZero() || Dir.ContainsNaN()
        || !FMath::IsFinite(Metres) || Metres <= 0 || Diameter <= 0 || Height <= 0 || MaxSlope < 0)
        return false;
    const double Limit = MaxSlope * MaxSlope;
    const auto Eligible = [&](const FSurface& S)
    {
        return S.Contains(Foot) && IsWalkable(S, Foot)
            && FMath::Square(S.SlopeX) + FMath::Square(S.SlopeZ) <= Limit
            && FMath::Abs(Foot.Y - S.HeightAt(Foot)) <= SeamEpsilon;
    };
    const FSurface* Surface = &Surfaces[*Index];
    // Every successful transition moves into another finite patch. Never find
    // a new floor solely by testing which one is above or below the camera.
    for (int32 Leg = 0; Leg < Surfaces.Num() && Eligible(*Surface); ++Leg)
    {
        const double Rise = Surface->SlopeX * Dir.X + Surface->SlopeZ * Dir.Y;
        const double AlongPlane = FMath::Sqrt(1 + Rise * Rise);
        const double Requested = Metres / AlongPlane;
        const double Step = FMath::Min(Requested, Surface->DistanceToEdge(Foot, Dir));
        FVector Next = Foot + FVector(Dir.X, 0, Dir.Y) * Step;
        Next.Y = Surface->HeightAt(Next);
        if (!IsWalkable(*Surface, Next) || (Surface->bTerrain && !TerrainSegment(Foot, Next)))
            return false;
        if (Step > 0 && !SweepLeg(*Surface, Foot, Next, Diameter, Height)) return false;
        if (Requested <= Step + SeamEpsilon) return true;

        Metres -= Step * AlongPlane;
        const FSurface* Candidate = nullptr;
        for (const int32 Neighbour : Surface->SeamCandidates)
        {
            const auto& NextSupport = Surfaces[Neighbour];
            if (Eligible(NextSupport) && NextSupport.DistanceToEdge(Foot, Dir) > SeamEpsilon)
            {
                Candidate = &NextSupport;
                break;
            }
        }
        if (!Candidate) return false;
        Surface = Candidate;
        Support = Surface->Id;
        Foot.Y = Surface->HeightAt(Foot);
    }
    return false;
}

FString AOpenLegendScene::ContactAt(const FHitResult& Hit) const
{
    const auto* Id = PickableContacts.Find(Hit.GetComponent());
    return Id ? *Id : FString();
}

FObject AOpenLegendScene::CurrentContact(const FString& PublicId) const
{
    const auto* Contact = Contacts.Find(PublicId);
    return Contact ? Contact->Projection : nullptr;
}

TArray<TPair<FString, FString>> AOpenLegendScene::ContactChoices() const
{
    TArray<TPair<FString, FString>> Choices;
    Choices.Reserve(Contacts.Num());
    for (const auto& Entry : Contacts)
    {
        FString Name = String(Entry.Value.Projection, TEXT("name"));
        if (Name.IsEmpty()) Name = String(Entry.Value.Projection, TEXT("description"));
        Choices.Emplace(Entry.Key, MoveTemp(Name));
    }
    Choices.Sort([](const auto& A, const auto& B)
    {
        const int32 NameOrder = A.Value.Compare(B.Value);
        return NameOrder != 0 ? NameOrder < 0 : A.Key.Compare(B.Key, ESearchCase::CaseSensitive) < 0;
    });
    return Choices;
}

FString AOpenLegendScene::SupportAt(const FHitResult& Hit) const
{
    const auto* Index = PickableSupports.Find(Hit.GetComponent());
    if (!Index) return FString();
    const auto& Surface = Surfaces[*Index];
    const FVector Foot = ToWorld(Hit.ImpactPoint);
    return Surface.Contains(Foot) && FMath::Abs(Foot.Y - Surface.HeightAt(Foot)) <= SeamEpsilon
        && IsWalkable(Surface, Foot) ? Surface.Id : FString();
}

FString AOpenLegendScene::BlockerAt(const FHitResult& Hit) const
{
    if (const auto* Id = PickableBlockers.Find(Hit.GetComponent())) return *Id;
    return {};
}
