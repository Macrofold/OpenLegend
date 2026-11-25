// SPDX-License-Identifier: Apache-2.0
#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "GameFramework/HUD.h"
#include "GameFramework/PlayerController.h"
#include "LegendPlay.generated.h"

class ACameraActor;
class FLegendConnection;
class FJsonObject;
class FJsonValue;
class UInstancedStaticMeshComponent;

UCLASS()
class ALegendGameMode : public AGameModeBase
{
    GENERATED_BODY()
public:
    ALegendGameMode();
};

UCLASS()
class ALegendHUD : public AHUD
{
    GENERATED_BODY()
    virtual void DrawHUD() override;
};

UCLASS()
class ALegendController : public APlayerController
{
    GENERATED_BODY()
public:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type Reason) override;
    virtual void PlayerTick(float DeltaTime) override;

    UFUNCTION(Exec) void JoinWorld();
    UFUNCTION(Exec) void LeaveCharacter();
    UFUNCTION(Exec) void ResumeWorld();
    UFUNCTION(Exec) void WalkNorth();
    UFUNCTION(Exec) void WalkSouth();
    UFUNCTION(Exec) void WalkEast();
    UFUNCTION(Exec) void WalkWest();
    UFUNCTION(Exec) void ReconnectWorld();
    FString Instructions() const;
    const FString& GetFeedback() const { return Feedback; }

private:
    enum class EOperation { None, Login, Read, Join, Release, Resume, Walk };
    EOperation Operation = EOperation::None;
    TSharedPtr<FLegendConnection> Connection;
    FString Scope, Support, PlayerId, Feedback;
    TSharedPtr<FJsonValue> CommandEpoch;
    int64 Generation = 0, Revision = -1, Presence = 0;
    uint64 AccessSerial = 0, RequestSerial = 0;
    bool bControlling = false, bElsewhere = false, bPaused = true, bReady = false;
    bool bSubscribed = false, bNeedsRead = false;
    bool bConfirmTransfer = false;
    FVector WirePosition = FVector::ZeroVector;
    TMap<FString, TSharedPtr<FJsonObject>> Subjects;
    TMap<FString, TSharedPtr<FJsonObject>> Surfaces;
    UPROPERTY() TObjectPtr<ACameraActor> WorldCamera;
    UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> PlayerMarker;
    UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> EntityMarkers;
    UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Floors;
    UPROPERTY() TObjectPtr<UInstancedStaticMeshComponent> Blockers;

    void CreateScene();
    void ClearView();
    void ReadState();
    void Walk(double DX, double DZ);
    void Embody(EOperation Kind, const FString& Action);
    void Write(EOperation Kind, const FString& Path, const TSharedPtr<FJsonObject>& Payload);
    void Reply(int32 Status, const FString& Body);
    void Event(const FString& Name, const FString& Data);
    bool Snapshot(const TSharedPtr<FJsonObject>& View);
    bool Patch(const TSharedPtr<FJsonObject>& Change);
    void RefreshScene(bool bSubjects);
    void DrawMap(const TSharedPtr<FJsonObject>& Map);
    void Invalidate(const FString& Reason, bool bRefresh);
};
