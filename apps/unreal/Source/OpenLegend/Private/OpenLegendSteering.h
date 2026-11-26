#pragma once

#include "OpenLegendJson.h"

class AOpenLegendScene;
class UOpenLegendSession;

class FOpenLegendSteering
{
public:
    // False ends the old gesture. The controller clears its held keys and releases a still-live lease.
    bool AcceptView(const OpenLegend::FObject& View);
    // Notify the release owner when its exact local lease expires or Rust replaces its input scope.
    using FReleaseRenewed = TFunction<void(const OpenLegend::FObject&, const OpenLegend::FObject&)>;
    void Update(UOpenLegendSession& Session, double Now, const FVector2D& Wanted,
        bool bWalkKeyHeld, bool bKeyChange, double StartAge,
        const OpenLegend::FObject& PendingRelease, const FReleaseRenewed& ReleaseRenewed);
    void Preview(const AOpenLegendScene& Scene, double Now, FVector& Foot, double& Yaw) const;
    void RecheckBlockedDirection() { Blocked = FVector2D::ZeroVector; }
    bool HasPose() const { return bPose; }
    bool CanControl() const { return bControlling; }
    // An eligible controller can keep its held direction while Update waits for recovery.
    bool CanSteer() const;
    // Clear held keys when the interruption cannot preserve movement intent.
    bool ConsumeGestureInterruption();
    void Stop(UOpenLegendSession& Session, double Now);

private:
    struct FSpan
    {
        int64 Sequence;
        FVector2D Direction;
        double Time;
    };
    struct FReleaseLease
    {
        OpenLegend::FObject Input;
        double LastSend = 0, RenewThrough = 0;
        int64 LastRenewal = 0;
    };

    FString Epoch, Token, Timeline, Support, Actor;
    double Life = 0;
    FVector ConfirmedFoot = FVector::ZeroVector;
    double ConfirmedYaw = 0;
    double Ratio = 0, MetersPerGameSecond = 0, Width = 0, Height = 0, MaxSlope = 0;
    double Renewal = 0, Expiry = 0, LastIntegrated = 0, LastSend = 0, RenewThrough = 0;
    double UnconfirmedGameSeconds = 0;
    double PendingTurnAt = 0;
    int64 Sequence = 0, RenewalSequence = 0, LastMovementRenewal = 0, Active = 0;
    double ConfirmedTime = 0, ConfirmedTotal = 0;
    TArray<FSpan> History;
    FVector2D Pending = FVector2D::ZeroVector;
    FVector2D Dispatched = FVector2D::ZeroVector;
    FVector2D Blocked = FVector2D::ZeroVector;
    bool bPose = false, bControlling = false, bMoving = false, bDirectionAccepted = false;
    enum class ERecovery : uint8 { None, Waiting, Ready };
    ERecovery Recovery = ERecovery::None;
    int64 StopToRetry = 0;
    bool bGestureInterrupted = false, bAwaitingInputScope = false;
    FReleaseLease ReleaseLease;
    uint64 MovementGeneration = 0;
    TSharedPtr<int> ReplyLifetime = MakeShared<int>(0);

    void Clear(bool bKeepInputSequence, bool bKeepRelease = false);
    void Integrate(double Now);
    void Change(UOpenLegendSession& Session, double Now, FVector2D Direction, double StartAge = 0);
    // Send one scoped POST. Only the first recovery stop can schedule an identical retry.
    bool SendDirection(UOpenLegendSession& Session, FVector2D Direction, int64 Sent,
        bool bHadDirection, bool bAllowStopRetry);
    void Interrupt(UOpenLegendSession& Session, double Now, bool bTryStop, bool bCanResume = false);
    void WaitForInputScope(UOpenLegendSession& Session, double Now, const OpenLegend::FObject& Scope);
    void EndReleaseLease(const OpenLegend::FObject& Result, const FReleaseRenewed& Notify);
    bool ReplyUsesCurrentInput(const OpenLegend::FObject& Scope, const TCHAR* TokenField,
        const FString& CurrentToken) const;
};
