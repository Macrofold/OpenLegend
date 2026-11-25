// SPDX-License-Identifier: Apache-2.0
#include "LegendPlay.h"
#include "LegendConnection.h"
#include "Camera/CameraActor.h"
#include "CanvasItem.h"
#include "Components/DirectionalLightComponent.h"
#include "Components/InstancedStaticMeshComponent.h"
#include "Dom/JsonObject.h"
#include "Engine/Canvas.h"
#include "Engine/DirectionalLight.h"
#include "Engine/Engine.h"
#include "Engine/StaticMesh.h"
#include "Engine/World.h"
#include "InputCoreTypes.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "Materials/MaterialInterface.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

DEFINE_LOG_CATEGORY_STATIC(LogLegendPlay, Log, All);

namespace
{
using FObject = TSharedPtr<FJsonObject>;
using FValues = TArray<TSharedPtr<FJsonValue>>;
FObject Parse(const FString& Text)
{
    FObject Out;
    FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Text), Out);
    return Out;
}
FObject Obj(const FObject& Parent, const TCHAR* Key)
{
    const FObject* Found = nullptr;
    return Parent && Parent->TryGetObjectField(Key, Found) ? *Found : nullptr;
}
const FValues* Array(const FObject& Parent, const TCHAR* Key)
{
    const FValues* Found = nullptr;
    if (Parent) Parent->TryGetArrayField(Key, Found);
    return Found;
}
FString Str(const FObject& O, const TCHAR* Key)
{
    FString Text;
    if (O) O->TryGetStringField(Key, Text);
    return Text;
}
bool Position(const FObject& Point, FVector& P)
{
    return Point && Point->TryGetNumberField(TEXT("x"), P.X) && Point->TryGetNumberField(TEXT("y"), P.Y)
        && Point->TryGetNumberField(TEXT("z"), P.Z) && !P.ContainsNaN();
}
FVector ToWorld(const FVector& P) { return FVector(-P.Z, P.X, P.Y) * 100.; }
FString Id() { return FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphensLower); }
bool Includes(const FValues* Values, const TCHAR* Key)
{
    return Values && Values->ContainsByPredicate([Key](const auto& Value)
    {
        FString Text;
        return Value && Value->TryGetString(Text) && Text == Key;
    });
}
void MergeFields(const FObject& Target, const FObject& Set, const FValues* Remove)
{
    if (Set) for (const auto& Pair : Set->Values) Target->SetField(Pair.Key, Pair.Value);
    if (Remove) for (const auto& Field : *Remove)
    {
        FString Key;
        if (Field->TryGetString(Key)) Target->RemoveField(Key);
    }
}
}

ALegendGameMode::ALegendGameMode()
{
    PlayerControllerClass = ALegendController::StaticClass();
    HUDClass = ALegendHUD::StaticClass();
    DefaultPawnClass = nullptr;
}

void ALegendController::CreateScene()
{
    WorldCamera = GetWorld()->SpawnActor<ACameraActor>();
    bAutoManageActiveCameraTarget = false;
    SetViewTarget(WorldCamera);
    auto* Sun = GetWorld()->SpawnActor<ADirectionalLight>();
    Sun->GetLightComponent()->SetMobility(EComponentMobility::Movable);
    Sun->SetActorRotation(FRotator(-65, -35, 0));
    Sun->GetLightComponent()->SetIntensity(5.0f);
    AActor* Geometry = GetWorld()->SpawnActor<AActor>();
    auto* Root = NewObject<USceneComponent>(Geometry);
    Geometry->SetRootComponent(Root);
    Root->RegisterComponent();
    auto* Material = LoadObject<UMaterialInterface>(nullptr, TEXT("/Engine/BasicShapes/BasicShapeMaterial.BasicShapeMaterial"));
    auto MakeMesh = [&](const TCHAR* Asset, FLinearColor Color)
    {
        auto* Component = NewObject<UInstancedStaticMeshComponent>(Geometry);
        Component->SetupAttachment(Root);
        Component->SetMobility(EComponentMobility::Movable);
        Component->SetCollisionEnabled(ECollisionEnabled::NoCollision);
        Component->SetStaticMesh(LoadObject<UStaticMesh>(nullptr, Asset));
        if (Material)
        {
            UMaterialInstanceDynamic* Tint = UMaterialInstanceDynamic::Create(Material, Geometry);
            Tint->SetVectorParameterValue(TEXT("Color"), Color);
            Component->SetMaterial(0, Tint);
        }
        Component->RegisterComponent();
        return Component;
    };
    const TCHAR* Cube = TEXT("/Engine/BasicShapes/Cube.Cube");
    PlayerMarker = MakeMesh(TEXT("/Engine/BasicShapes/Cone.Cone"), FLinearColor(0.98f, 0.55f, 0.12f));
    EntityMarkers = MakeMesh(TEXT("/Engine/BasicShapes/Sphere.Sphere"), FLinearColor(0.2f, 0.65f, 0.8f));
    Floors = MakeMesh(Cube, FLinearColor(0.22f, 0.34f, 0.22f));
    Blockers = MakeMesh(Cube, FLinearColor(0.33f, 0.27f, 0.2f));
}

void ALegendController::BeginPlay()
{
    Super::BeginPlay();
    if (!IsLocalController()) return;
    CreateScene();
    int32 Port = 3211;
    FParse::Value(FCommandLine::Get(), TEXT("OpenLegendPort="), Port);
    if (Port < 1 || Port > 65535)
    {
        Feedback = TEXT("Choose a local server port between 1 and 65535.");
        return;
    }
    Connection = MakeShared<FLegendConnection>(Port);
    Connection->OnReply = [this](int32 Status, const FString& Body) { Reply(Status, Body); };
    Connection->OnEvent = [this](const FString& Name, const FString& Body) { Event(Name, Body); };
    Connection->OnStreamLost = [this]() { Invalidate(TEXT("The world connection closed. Press R to reconnect."), false); };
    ReconnectWorld();
}
void ALegendController::EndPlay(const EEndPlayReason::Type Reason)
{
    if (Connection && bReady && bControlling && !Connection->IsBusy())
    {
        // Closing PIE normally gives up only this client's current generation. A busy
        // or abruptly terminated session uses the explicit recovery shown on re-entry.
        LeaveCharacter();
        Connection->Unsubscribe();
        Connection->OnReply = {};
        const double Deadline = FPlatformTime::Seconds() + .25;
        while (Connection->IsBusy() && FPlatformTime::Seconds() < Deadline)
        {
            Connection->Pump();
            if (Connection->IsBusy()) FPlatformProcess::SleepNoStats(.005f);
        }
    }
    Connection.Reset();
    Super::EndPlay(Reason);
}
void ALegendController::PlayerTick(float DeltaTime)
{
    Super::PlayerTick(DeltaTime);
    if (!Connection) return;
    Connection->Pump();
    if (bNeedsRead && !Connection->IsBusy()) ReadState();
    if (WasInputKeyJustPressed(EKeys::R)) ReconnectWorld();
    if (WasInputKeyJustPressed(EKeys::T) && bReady && bElsewhere) bConfirmTransfer = true;
    if (WasInputKeyJustPressed(EKeys::Escape)) bConfirmTransfer = false;
    if (WasInputKeyJustPressed(EKeys::Enter)) JoinWorld();
    if (WasInputKeyJustPressed(EKeys::L)) LeaveCharacter();
    if (WasInputKeyJustPressed(EKeys::P)) ResumeWorld();
    if (WasInputKeyJustPressed(EKeys::W) || WasInputKeyJustPressed(EKeys::Up)) WalkNorth();
    if (WasInputKeyJustPressed(EKeys::S) || WasInputKeyJustPressed(EKeys::Down)) WalkSouth();
    if (WasInputKeyJustPressed(EKeys::A) || WasInputKeyJustPressed(EKeys::Left)) WalkWest();
    if (WasInputKeyJustPressed(EKeys::D) || WasInputKeyJustPressed(EKeys::Right)) WalkEast();
}
void ALegendController::ClearView()
{
    bReady = false;
    bControlling = false;
    bElsewhere = false;
    bConfirmTransfer = false;
    bPaused = true;
    Revision = -1;
    Generation = 0;
    WirePosition = FVector::ZeroVector;
    Scope.Reset();
    Support.Reset();
    PlayerId.Reset();
    CommandEpoch.Reset();
    Subjects.Reset();
    Surfaces.Reset();
    if (PlayerMarker)
    {
        PlayerMarker->ClearInstances();
        EntityMarkers->ClearInstances();
        Floors->ClearInstances();
        Blockers->ClearInstances();
        WorldCamera->SetActorLocation(FVector::ZeroVector);
    }
}
void ALegendController::Invalidate(const FString& Reason, bool bRefresh)
{
    ++AccessSerial;
    Connection->Unsubscribe();
    bSubscribed = false;
    bNeedsRead = bRefresh;
    ClearView();
    Feedback = Reason;
}
void ALegendController::ReconnectWorld()
{
    if (!Connection || Connection->IsBusy()) return;
    Invalidate(TEXT("Connecting to your local world…"), false);
    Operation = EOperation::Login;
    RequestSerial = AccessSerial;
    if (!Connection->Request(TEXT("/auth/login"))) Feedback = TEXT("Connection unavailable. Press R to retry.");
}
void ALegendController::ReadState()
{
    bNeedsRead = false;
    Operation = EOperation::Read;
    RequestSerial = AccessSerial;
    if (!Connection->Request(TEXT("/api/state"))) Invalidate(TEXT("Couldn’t read the world. Press R to retry."), false);
}
void ALegendController::Write(EOperation Kind, const FString& Path, const FObject& Payload)
{
    if (!Connection || Connection->IsBusy() || !bReady || !bSubscribed) return;
    FString Body;
    FJsonSerializer::Serialize(Payload.ToSharedRef(), TJsonWriterFactory<>::Create(&Body));
    Operation = Kind;
    RequestSerial = AccessSerial;
    if (!Connection->Request(Path, Scope, Body)) Feedback = TEXT("The request could not be sent.");
}
void ALegendController::JoinWorld()
{
    if (!bReady || bControlling || (bElsewhere && !bConfirmTransfer)) return;
    bConfirmTransfer = false;
    Embody(EOperation::Join, bElsewhere ? TEXT("replace") : TEXT("acquire"));
}
void ALegendController::LeaveCharacter()
{
    if (bReady && bControlling) Embody(EOperation::Release, TEXT("release"));
}
void ALegendController::Embody(EOperation Kind, const FString& Action)
{
    FObject Request = MakeShared<FJsonObject>();
    Request->SetStringField(TEXT("operation"), Action);
    Request->SetStringField(TEXT("id"), Id());
    Request->SetNumberField(TEXT("expectedGeneration"), Generation);
    Write(Kind, TEXT("/api/embodiment"), Request);
}
void ALegendController::ResumeWorld()
{
    if (!bReady || !bControlling || !bPaused) return;
    FObject Request = MakeShared<FJsonObject>();
    Request->SetBoolField(TEXT("paused"), false);
    Request->SetStringField(TEXT("clientId"), Connection->ClientId);
    Request->SetNumberField(TEXT("presenceSequence"), ++Presence);
    Write(EOperation::Resume, TEXT("/api/control"), Request);
}
void ALegendController::WalkNorth() { Walk(0, -1); }
void ALegendController::WalkSouth() { Walk(0, 1); }
void ALegendController::WalkEast() { Walk(1, 0); }
void ALegendController::WalkWest() { Walk(-1, 0); }
void ALegendController::Walk(double DX, double DZ)
{
    if (!bReady || !bControlling || bPaused || Support.IsEmpty() || !CommandEpoch) return;
    FObject Point = MakeShared<FJsonObject>();
    const double X = WirePosition.X + DX * 2., Z = WirePosition.Z + DZ * 2.;
    double Y = WirePosition.Y;
    if (const FObject* Surface = Surfaces.Find(Support))
    {
        double MinX, MaxX, MinZ, MaxZ, BaseY, SlopeX = 0, SlopeZ = 0;
        const auto& S = *Surface;
        if (S->TryGetNumberField(TEXT("minX"), MinX) && S->TryGetNumberField(TEXT("maxX"), MaxX)
            && S->TryGetNumberField(TEXT("minZ"), MinZ) && S->TryGetNumberField(TEXT("maxZ"), MaxZ)
            && S->TryGetNumberField(TEXT("y"), BaseY))
        {
            if (X < MinX || X > MaxX || Z < MinZ || Z > MaxZ)
            {
                Feedback = TEXT("That step goes past the edge of this surface.");
                return;
            }
            S->TryGetNumberField(TEXT("slopeX"), SlopeX);
            S->TryGetNumberField(TEXT("slopeZ"), SlopeZ);
            Y = BaseY + (X - MinX) * SlopeX + (Z - MinZ) * SlopeZ;
        }
    }
    Point->SetNumberField(TEXT("x"), X);
    Point->SetNumberField(TEXT("y"), Y);
    Point->SetNumberField(TEXT("z"), Z);
    Point->SetStringField(TEXT("surfaceId"), Support);
    FObject Command = MakeShared<FJsonObject>();
    Command->SetStringField(TEXT("type"), TEXT("move"));
    Command->SetObjectField(TEXT("position"), Point);
    FObject Request = MakeShared<FJsonObject>();
    Request->SetField(TEXT("commandEpoch"), CommandEpoch);
    Request->SetStringField(TEXT("commandId"), Id());
    Request->SetObjectField(TEXT("command"), Command);
    Write(EOperation::Walk, TEXT("/api/command"), Request);
}

void ALegendController::Reply(int32 Status, const FString& Body)
{
    const EOperation Kind = Operation;
    Operation = EOperation::None;
    if (RequestSerial != AccessSerial) return;
    if (Kind == EOperation::Login)
    {
        if (Status == 302 || Status == 303 || Status == 200) bNeedsRead = true;
        else Invalidate(TEXT("Couldn’t sign in. Start the local server, then press R."), false);
        return;
    }
    if (Status == 401 || Status == 403)
    {
        Invalidate(TEXT("Access changed. Press R to sign in again."), false);
        return;
    }
    if (Kind == EOperation::Read)
    {
        if (Status != 200 || !Snapshot(Parse(Body)))
            Invalidate(TEXT("Couldn’t read a current world view. Press R to reconnect."), false);
        return;
    }
    if (Kind == EOperation::None) return;
    const FObject Response = Parse(Body);
    bool bAccepted = false;
    const bool bHasDecision = Response && Response->TryGetBoolField(TEXT("ok"), bAccepted);
    if (Status < 200 || Status >= 300 || (bHasDecision && !bAccepted))
    {
        Feedback = Status == 0 ? TEXT("No reply. Checking the world before your next action.")
                               : TEXT("The world declined that action.");
    }
    else Feedback.Empty();
    UE_LOG(LogLegendPlay, Display, TEXT("Native world action %d returned HTTP %d"), static_cast<int32>(Kind), Status);
    // Read-only reconciliation. Never repeat a write after a lost response.
    if (Kind == EOperation::Join || Kind == EOperation::Release || Status == 409)
        Invalidate(Feedback, true);
    else if (Kind != EOperation::Walk || Status != 200 || (bHasDecision && !bAccepted)) bNeedsRead = true;
}

bool ALegendController::Snapshot(const FObject& V)
{
    const FObject Access = Obj(V, TEXT("access")), PlayerView = Obj(V, TEXT("player")), Clock = Obj(V, TEXT("clock"));
    const FString NewScope = Str(Access, TEXT("scope"));
    const FValues* Entities = Array(V, TEXT("entities"));
    int64 NewRevision = -1, NewGeneration = -1;
    bool Control = false, Elsewhere = false, Paused = true;
    FVector Point = FVector::ZeroVector;
    if (NewScope.IsEmpty() || !V->TryGetNumberField(TEXT("revision"), NewRevision)
        || !Access->TryGetNumberField(TEXT("controlGeneration"), NewGeneration)
        || !Access->TryGetBoolField(TEXT("controlling"), Control) || !Access->TryGetBoolField(TEXT("controlledElsewhere"), Elsewhere)
        || !Clock || !Clock->TryGetBoolField(TEXT("paused"), Paused)
        || !Position(Obj(PlayerView, TEXT("position")), Point) || !Entities) return false;
    if (bReady && NewScope == Scope && NewRevision < Revision) return true;
    const bool bFirst = !bReady || NewScope != Scope;
    if (bReady && NewScope != Scope) Invalidate({}, false);
    Scope = NewScope;
    Revision = NewRevision;
    Generation = NewGeneration;
    bControlling = Control;
    bElsewhere = Elsewhere;
    if (!Elsewhere) bConfirmTransfer = false;
    bPaused = Paused;
    WirePosition = Point;
    Support = Str(PlayerView, TEXT("supportSurfaceId"));
    PlayerId = Str(PlayerView, TEXT("id"));
    CommandEpoch = V->TryGetField(TEXT("commandEpoch"));
    if (CommandEpoch && CommandEpoch->Type != EJson::String) CommandEpoch.Reset();
    Subjects.Reset();
    for (const auto& Value : *Entities)
    {
        const FObject* Entity = nullptr;
        if (!Value->TryGetObject(Entity)) return false;
        const FString Key = Str(*Entity, TEXT("id"));
        if (Key.IsEmpty()) return false;
        Subjects.Add(Key, *Entity);
    }
    if (!bSubscribed)
    {
        bSubscribed = Connection->Subscribe(Scope, Revision);
        if (!bSubscribed) return false;
    }
    bReady = true;
    DrawMap(Obj(V, TEXT("map")));
    RefreshScene(true);
    if (bFirst)
    {
        Feedback.Empty();
        UE_LOG(LogLegendPlay, Display, TEXT("Native world view received. Visible entities: %d. Public surfaces: %d. Controlling: %d. Paused: %d."),
               Subjects.Num(), Surfaces.Num(), bControlling, bPaused);
    }
    return true;
}

void ALegendController::Event(const FString& Name, const FString& Data)
{
    if (Name == TEXT("access-changed"))
    {
        Invalidate(TEXT("Your access changed. Checking the world…"), true);
        return;
    }
    if (Name == TEXT("reset") || Name == TEXT("patch"))
    {
        const FObject Frame = Parse(Data);
        const bool bApplied = Name == TEXT("reset") ? Snapshot(Frame) : Patch(Frame);
        if (!bApplied) Invalidate(TEXT("Refreshing your view…"), true);
    }
}
bool ALegendController::Patch(const FObject& P)
{
    int64 Schema = 0, Base = -1, Next = -1;
    if (!P || !bReady || !P->TryGetNumberField(TEXT("schemaVersion"), Schema) || Schema != 3
        || Str(P, TEXT("scope")) != Scope || !P->TryGetNumberField(TEXT("baseRevision"), Base)
        || !P->TryGetNumberField(TEXT("revision"), Next)) return false;
    if (Next <= Revision) return true;
    if (Base != Revision) return false;
    const FObject Fields = Obj(P, TEXT("view")), Remove = Obj(P, TEXT("remove"));
    const FValues* RemovedView = Array(Remove, TEXT("view"));
    for (const TCHAR* Key : {TEXT("access"), TEXT("map"), TEXT("commandEpoch")})
        if ((Fields && Fields->HasField(Key)) || P->HasField(Key) || Includes(RemovedView, Key)) return false;
    const FObject PlayerView = Obj(P, TEXT("player"));
    if (Includes(Array(Remove, TEXT("player")), TEXT("position")) || Includes(Array(Remove, TEXT("clock")), TEXT("paused"))) return false;
    if (Includes(Array(Remove, TEXT("player")), TEXT("supportSurfaceId"))) Support.Empty();
    if (PlayerView && PlayerView->HasField(TEXT("position")) && !Position(Obj(PlayerView, TEXT("position")), WirePosition)) return false;
    if (PlayerView && PlayerView->HasField(TEXT("supportSurfaceId"))) Support = Str(PlayerView, TEXT("supportSurfaceId"));
    const FObject Clock = Obj(P, TEXT("clock"));
    if (Clock && Clock->HasField(TEXT("paused")) && !Clock->TryGetBoolField(TEXT("paused"), bPaused)) return false;
    const FObject Changes = Obj(P, TEXT("entities"));
    if (const FValues* Gone = Array(Changes, TEXT("remove")))
        for (const auto& V : *Gone) { FString Key; if (!V->TryGetString(Key)) return false; Subjects.Remove(Key); }
    if (const FValues* Added = Array(Changes, TEXT("add")))
        for (const auto& V : *Added)
        {
            const FObject* E = nullptr;
            if (!V->TryGetObject(E)) return false;
            const FString Key = Str(*E, TEXT("id"));
            if (Key.IsEmpty()) return false;
            Subjects.Add(Key, *E);
        }
    if (const FValues* Updated = Array(Changes, TEXT("update")))
        for (const auto& V : *Updated)
        {
            const FObject* E = nullptr;
            if (!V->TryGetObject(E)) return false;
            FObject* Existing = Subjects.Find(Str(*E, TEXT("id")));
            if (!Existing) return false;
            MergeFields(*Existing, Obj(*E, TEXT("set")), Array(*E, TEXT("remove")));
        }
    Revision = Next;
    if (PlayerView || Changes) RefreshScene(Changes.IsValid());
    return true;
}

void ALegendController::DrawMap(const FObject& Map)
{
    Surfaces.Reset();
    Floors->ClearInstances();
    Blockers->ClearInstances();
    const FObject Spatial = Obj(Map, TEXT("spatial"));
    if (Str(Spatial, TEXT("disclosure")) != TEXT("public")) return;
    if (const FValues* Visible = Array(Spatial, TEXT("surfaces")))
        for (const auto& Value : *Visible)
        {
            const FObject* Object = nullptr;
            if (!Value->TryGetObject(Object)) continue;
            const FObject& S = *Object;
            double X0, X1, Z0, Z1, Y, SX = 0, SZ = 0;
            if (!S->TryGetNumberField(TEXT("minX"), X0) || !S->TryGetNumberField(TEXT("maxX"), X1)
                || !S->TryGetNumberField(TEXT("minZ"), Z0) || !S->TryGetNumberField(TEXT("maxZ"), Z1)
                || !S->TryGetNumberField(TEXT("y"), Y) || X1 <= X0 || Z1 <= Z0) continue;
            S->TryGetNumberField(TEXT("slopeX"), SX);
            S->TryGetNumberField(TEXT("slopeZ"), SZ);
            Surfaces.Add(Str(S, TEXT("id")), S);
            const double DX = X1 - X0, DZ = Z1 - Z0;
            const FVector Center = ToWorld({X0 + DX / 2, Y + (SX * DX + SZ * DZ) / 2, Z0 + DZ / 2});
            const FVector Normal = FVector(SZ, -SX, 1).GetSafeNormal();
            const FQuat Rotation = FQuat::FindBetweenNormals(FVector::UpVector, Normal);
            Floors->AddInstance(FTransform(Rotation, Center - Normal * 5, FVector(DZ * FMath::Sqrt(1 + SZ*SZ), DX * FMath::Sqrt(1 + SX*SX), .1)));
        }
    if (const FValues* Visible = Array(Spatial, TEXT("blockers")))
        for (const auto& Value : *Visible)
        {
            const FObject* Object = nullptr;
            if (!Value->TryGetObject(Object)) continue;
            const FObject Bounds = Obj(*Object, TEXT("bounds"));
            FVector Low, High;
            if (!Position(Obj(Bounds, TEXT("min")), Low) || !Position(Obj(Bounds, TEXT("max")), High)) continue;
            const FVector Size = (ToWorld(High) - ToWorld(Low)).GetAbs() / 100.;
            Blockers->AddInstance(FTransform(FQuat::Identity, ToWorld((Low + High) * .5), Size));
        }
}
void ALegendController::RefreshScene(bool bSubjects)
{
    const FVector Here = ToWorld(WirePosition);
    const FTransform Marker(FQuat::Identity, Here + FVector(0, 0, 90), FVector(.65, .65, 1.8));
    if (!PlayerMarker->GetInstanceCount()) PlayerMarker->AddInstance(Marker);
    else PlayerMarker->UpdateInstanceTransform(0, Marker, false, true);
    const FVector CameraOffset(-830, 0, 850);
    WorldCamera->SetActorLocationAndRotation(Here + CameraOffset, (-CameraOffset).Rotation());
    if (!bSubjects) return;
    EntityMarkers->ClearInstances();
    for (const auto& Pair : Subjects)
    {
        if (Pair.Key == PlayerId) continue;
        const FObject Observation = Obj(Pair.Value, TEXT("observation"));
        if (Str(Observation, TEXT("kind")) != TEXT("current") || Str(Observation, TEXT("modality")) != TEXT("sight")) continue;
        FVector Where;
        if (!Position(Obj(Pair.Value, TEXT("position")), Where)) continue;
        EntityMarkers->AddInstance(FTransform(FQuat::Identity, ToWorld(Where) + FVector(0, 0, 55), FVector(.65, .65, 1.1)));
    }
}
FString ALegendController::Instructions() const
{
    if (!bReady) return {};
    if (bControlling)
    {
        if (bPaused) return TEXT("World paused   ·   P  Resume   ·   L  Leave character");
        return TEXT("W A S D or arrow keys  Walk a short step   ·   L  Leave character");
    }
    if (bConfirmTransfer) return TEXT("Move control here and stop the other window’s controls?   Enter  Confirm   ·   Esc  Cancel");
    if (bElsewhere) return TEXT("You’re watching. Your character is controlled in another window.   T  Move control here");
    return TEXT("You’re watching.   Enter  Control your character");
}
void ALegendHUD::DrawHUD()
{
    Super::DrawHUD();
    const auto* Controller = Cast<ALegendController>(PlayerOwner);
    if (!Canvas || !Controller) return;
    const FString Instructions = Controller->Instructions();
    const FString Feedback = Controller->GetFeedback();
    const float Scale = FMath::Clamp(Canvas->ClipX / 1200.f, .75f, 1.35f);
    const float X = 20 * Scale, Y = 22 * Scale;
    const float Width = Canvas->ClipX - 2 * X;
    // Canvas wraps the instruction at the viewport edge, including long transfer prompts.
    Canvas->SetDrawColor(FColor::White);
    UFont* Font = GEngine->GetMediumFont();
    float Offset = 0;
    for (const FString& Line : {Instructions, Feedback})
    {
        if (Line.IsEmpty()) continue;
        FCanvasTextItem Item(FVector2D(X, Y + Offset), FText::FromString(Line), Font, FLinearColor::White);
        Item.Scale = FVector2D(Scale);
        Item.EnableShadow(FLinearColor::Black, FVector2D(1.5, 1.5));
        TArray<FWrappedStringElement> Lines;
        FTextSizingParameters Size(0, 0, Width, 0, Font);
        Size.Scaling = FVector2D(Scale);
        Canvas->WrapString(Size, 0, Line, Lines);
        for (const auto& Wrapped : Lines)
        {
            DrawRect(FLinearColor(0.016f, 0.023f, 0.025f, .82f), X - 6 * Scale, Y + Offset - 3 * Scale,
                     Wrapped.LineExtent.X + 12 * Scale, FMath::Max(24 * Scale, static_cast<float>(Wrapped.LineExtent.Y) + 6 * Scale));
            Item.Text = FText::FromString(Wrapped.Value);
            Canvas->DrawItem(Item, X, Y + Offset);
            Offset += 24 * Scale;
        }
    }
}
