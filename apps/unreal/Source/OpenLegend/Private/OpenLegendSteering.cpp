#include "OpenLegendSteering.h"

#include "OpenLegendCoordinates.h"
#include "OpenLegendScene.h"
#include "Net/OpenLegendSession.h"

using namespace OpenLegend;

namespace
{
    // End the gesture if unconfirmed turns fill the local history.
    constexpr int32 MaxSpans = 32;
    constexpr int64 MaxSequence = 9007199254740991LL;

    int64 ReadSequence(const FObject& Object, const TCHAR* Field)
    {
        const double Sequence = NumberOr(Object, Field, 0);
        return Sequence >= 0 && Sequence <= MaxSequence ? int64(Sequence) : 0;
    }
}

void FOpenLegendSteering::Clear(bool bKeepInputSequence, bool bKeepRelease)
{
    FOpenLegendSteering Next;
    if (bKeepInputSequence)
    {
        // A temporary gap drops the pose, gesture and callbacks. Keep only
        // enough to avoid reusing a sent ID if the same authority returns.
        Next.Epoch = MoveTemp(Epoch);
        Next.Token = MoveTemp(Token);
        Next.Sequence = Sequence;
        Next.RenewalSequence = RenewalSequence;
    }
    if (bKeepRelease)
    {
        Next.ReleaseLease = MoveTemp(ReleaseLease);
        Next.ReplyLifetime = MoveTemp(ReplyLifetime);
        Next.MovementGeneration = MovementGeneration + 1;
    }
    *this = MoveTemp(Next);
}

bool FOpenLegendSteering::CanSteer() const
{
    return bControlling && (!bAwaitingInputScope || Recovery == ERecovery::Waiting)
        && Ratio > 0 && Renewal > 0 && Expiry > 0 && MetersPerGameSecond > 0;
}

bool FOpenLegendSteering::ConsumeGestureInterruption()
{
    const bool bInterrupted = bGestureInterrupted;
    bGestureInterrupted = false;
    return bInterrupted;
}

bool FOpenLegendSteering::AcceptView(const FObject& View)
{
    if (!View)
    {
        Clear(true);
        return false;
    }

    const auto Player = Object(View, TEXT("player"));
    const auto Scope = Object(Player, TEXT("inputScope"));
    const auto Clock = Object(View, TEXT("clock"));
    const auto Profile = Object(Player, TEXT("steeringProfile"));
    const auto Progress = Object(Player, TEXT("steeringProgress"));
    const FString NewEpoch = String(Scope, TEXT("inputEpoch"));
    const FString NewToken = String(Scope, TEXT("movementInputToken"));
    const FString NewTimeline = String(View, TEXT("saveTimeline"));
    const FString NewActor = String(Player, TEXT("id"));
    const double NewLife = NumberOr(Player, TEXT("life"), 0);
    const bool bNewControl = Bool(Object(View, TEXT("access")), TEXT("controlling"));

    const double Now = FPlatformTime::Seconds();
    Integrate(Now);
    const bool bSameEpoch = NewEpoch.Equals(Epoch, ESearchCase::CaseSensitive);
    const bool bSameToken = bSameEpoch && NewToken.Equals(Token, ESearchCase::CaseSensitive);
    const bool bSameOwner = bSameEpoch && NewTimeline.Equals(Timeline, ESearchCase::CaseSensitive)
        && NewActor.Equals(Actor, ESearchCase::CaseSensitive) && NewLife == Life
        && bNewControl == bControlling;
    const bool bSameInput = bSameOwner && bSameToken;
    const bool bRecoveryToken = bSameOwner && !bSameToken && !NewToken.IsEmpty()
        && (Recovery != ERecovery::None || (bMoving && Now >= RenewThrough));
    if (!bSameInput)
    {
        const int64 LastRenewalSequence = RenewalSequence;
        // Replacing only movement preserves the independently held release.
        Clear(bSameToken, bSameOwner);
        if (bSameEpoch) RenewalSequence = LastRenewalSequence;
        LastIntegrated = Now;
    }
    Epoch = NewEpoch;
    Token = NewToken;
    Timeline = NewTimeline;
    Actor = NewActor;
    Life = NewLife;
    bControlling = bNewControl;
    const FVector PreviousFoot = ConfirmedFoot;
    const bool bPreviousPose = bPose;
    bPose = Point(Object(Player, TEXT("position")), ConfirmedFoot);
    ConfirmedYaw = ToSceneYaw(NumberOr(Player, TEXT("heading"), 0));
    Support = String(Player, TEXT("supportSurfaceId"));
    const auto BodySize = Object(Player, TEXT("bodySize"));
    Width = NumberOr(BodySize, TEXT("width"), 0);
    Height = NumberOr(BodySize, TEXT("height"), 0);
    MaxSlope = NumberOr(Profile, TEXT("maxSlope"), 0);
    MetersPerGameSecond = NumberOr(Profile, TEXT("metresPerGameSecond"), 0);
    Ratio = Bool(Clock, TEXT("paused")) ? 0
        : NumberOr(Clock, TEXT("speed"), 0) * NumberOr(Clock, TEXT("baseRatio"), 0);
    Renewal = NumberOr(Scope, TEXT("renewalIntervalMs"), 0) / 1000;
    Expiry = NumberOr(Scope, TEXT("expiryMs"), 0) / 1000;

    const int64 Retired = ReadSequence(Progress, TEXT("retiredThrough"));
    const auto Current = Object(Progress, TEXT("active"));
    const int64 NewActive = ReadSequence(Current, TEXT("sequence"));
    const double NewConfirmed = NumberOr(Current, TEXT("gameSeconds"), 0);
    if (bPreviousPose && bPose && !PreviousFoot.Equals(ConfirmedFoot, UE_DOUBLE_KINDA_SMALL_NUMBER))
        Blocked = FVector2D::ZeroVector;
    else if (NewActive != 0 && NewActive == Active && NewConfirmed > ConfirmedTime)
        if (const auto* Span = History.FindByPredicate([&](const FSpan& Part) { return Part.Sequence == NewActive; }))
            Blocked = Span->Direction;
    // Free only the credit Rust actually processed.
    const double NewTotal = NumberOr(Progress, TEXT("totalGameSeconds"), 0);
    const double NewlyProcessed = FMath::Max(0.0, NewTotal - ConfirmedTotal);
    ConfirmedTotal = FMath::Max(ConfirmedTotal, NewTotal);
    UnconfirmedGameSeconds = FMath::Max(0.0, UnconfirmedGameSeconds - NewlyProcessed);
    if (NewConfirmed > 0)
    {
        if (auto* Span = History.FindByPredicate([&](const FSpan& Part) { return Part.Sequence == NewActive; }))
            Span->Time = FMath::Max(Span->Time, NewConfirmed);
    }
    Active = NewActive;
    ConfirmedTime = NewConfirmed;
    if (bMoving && NewActive == Sequence) bDirectionAccepted = true;
    const bool bGestureRetired = bMoving && Retired >= Sequence;
    // An earlier idle view or a POST reply does not settle the stopped
    // gesture. Resume from the ordered pose that retires the stop or shows
    // a new idle movement token for the same controller.
    if (bPose && CanSteer() && Progress && !Current
        && (bRecoveryToken || (Recovery == ERecovery::Waiting && !bAwaitingInputScope && Retired >= Sequence)))
        Recovery = ERecovery::Ready;
    Sequence = FMath::Max(Sequence, FMath::Max(Retired, Active));
    History.RemoveAll([&](const FSpan& Span) { return Span.Sequence <= Retired; });
    if (bGestureRetired) Dispatched = FVector2D::ZeroVector;
    if (!CanSteer() || bGestureRetired)
    {
        History.Reset();
        bMoving = false;
        bDirectionAccepted = false;
        UnconfirmedGameSeconds = 0;
        Recovery = ERecovery::None;
    }
    if (Recovery != ERecovery::Waiting) StopToRetry = 0;
    return (bSameInput || Recovery == ERecovery::Ready) && CanSteer() && !bGestureRetired;
}

void FOpenLegendSteering::Integrate(double Now)
{
    if (bMoving && !History.IsEmpty() && History.Last().Sequence == Sequence)
    {
        const double Available = FMath::Max(0.0, Expiry * Ratio - UnconfirmedGameSeconds);
        const double Elapsed = FMath::Max(0.0, FMath::Min(Now, RenewThrough) - LastIntegrated);
        const double Advanced = FMath::Min(Elapsed * Ratio, Available);
        History.Last().Time += Advanced;
        UnconfirmedGameSeconds += Advanced;
    }
    LastIntegrated = Now;
}

bool FOpenLegendSteering::ReplyUsesCurrentInput(const FObject& Scope, const TCHAR* TokenField,
    const FString& CurrentToken) const
{
    return !Scope || (Epoch.Equals(String(Scope, TEXT("inputEpoch")), ESearchCase::CaseSensitive)
        && CurrentToken.Equals(String(Scope, TokenField), ESearchCase::CaseSensitive));
}

void FOpenLegendSteering::Interrupt(UOpenLegendSession& Session, double Now, bool bTryStop, bool bCanResume)
{
    if (bGestureInterrupted) return;
    Recovery = bCanResume ? ERecovery::Waiting : ERecovery::None;
    StopToRetry = 0;
    bGestureInterrupted = !bCanResume;
    bMoving = false;
    bDirectionAccepted = false;
    History.Reset();
    PendingTurnAt = 0;
    Pending = Dispatched = Blocked = FVector2D::ZeroVector;

    // Keep the authorized stream and reconcile from its ordered views. Ending
    // the last controlling stream tells Rust the player left. Keep prediction
    // credit charged until the live stream settles it or supplies a new token.
    if (bTryStop && bControlling && !bAwaitingInputScope) Change(Session, Now, FVector2D::ZeroVector);
}

void FOpenLegendSteering::WaitForInputScope(UOpenLegendSession& Session, double Now, const FObject& Scope)
{
    // Movement can expire inside the current epoch. An epoch change also
    // covers pause, loss of control and a replaced body, so end the hold.
    const bool bCanResume = (bMoving || Recovery != ERecovery::None)
        && Epoch.Equals(String(Scope, TEXT("inputEpoch")), ESearchCase::CaseSensitive);
    bAwaitingInputScope = true;
    Interrupt(Session, Now, false, bCanResume);
}

void FOpenLegendSteering::Change(UOpenLegendSession& Session, double Now, FVector2D Direction, double StartAge)
{
    if (Sequence >= MaxSequence || Epoch.IsEmpty() || Token.IsEmpty()) return;
    const bool bStop = Direction.IsNearlyZero();
    const bool bHadDirection = bMoving || !Dispatched.IsNearlyZero();
    if (!bStop && History.Num() >= MaxSpans)
    {
        // Unretired input may still be active even after a local key-up.
        Interrupt(Session, Now, true);
        return;
    }
    const int64 Sent = ++Sequence;
    const bool bAllowStopRetry = bStop && Recovery == ERecovery::Waiting;
    LastSend = Now;
    if (!SendDirection(Session, Direction, Sent, bHadDirection, bAllowStopRetry))
    {
        if (bAllowStopRetry) StopToRetry = Sent;
        else if (!bStop) Interrupt(Session, Now, bHadDirection);
        return;
    }
    Dispatched = Direction;
    PendingTurnAt = 0;
    bMoving = !bStop;
    bDirectionAccepted = false;
    RenewThrough = Now + Expiry;
    if (!bStop)
    {
        double Start = 0;
        if (!bHadDirection && History.IsEmpty() && StartAge > 0)
        {
            // Only the first span uses the time from key press to dispatch.
            // Later frames integrate from dispatch under the same lease.
            const double Credit = FMath::Max(0.0, Expiry * Ratio - UnconfirmedGameSeconds);
            Start = FMath::Min(StartAge * Ratio, Credit);
            UnconfirmedGameSeconds += Start;
        }
        History.Add({Sent, Direction, Start});
    }
}

bool FOpenLegendSteering::SendDirection(UOpenLegendSession& Session, FVector2D Direction, int64 Sent,
    bool bHadDirection, bool bAllowStopRetry)
{
    const bool bStop = Direction.IsNearlyZero();
    auto Body = MakeShared<FJsonObject>();
    Body->SetStringField(TEXT("kind"), TEXT("steer"));
    Body->SetStringField(TEXT("inputEpoch"), Epoch);
    Body->SetStringField(TEXT("movementInputToken"), Token);
    Body->SetNumberField(TEXT("movementSequence"), Sent);
    auto Vector = MakeShared<FJsonObject>();
    Vector->SetNumberField(TEXT("x"), Direction.X);
    Vector->SetNumberField(TEXT("z"), Direction.Y);
    Body->SetObjectField(TEXT("direction"), Vector);

    return Session.Send(TEXT("/api/input"), MoveTemp(Body),
        [this, &Session, Lifetime = TWeakPtr<int>(ReplyLifetime), Generation = MovementGeneration,
            Sent, bStop, bHadDirection, bAllowStopRetry](int32 Status, FObject Result)
    {
        if (!Lifetime.IsValid() || Generation != MovementGeneration || Sequence != Sent) return;
        const auto Scope = Object(Result, TEXT("inputScope"));
        const bool bCurrentInput = ReplyUsesCurrentInput(Scope, TEXT("movementInputToken"), Token);
        if (!bCurrentInput)
        {
            WaitForInputScope(Session, FPlatformTime::Seconds(), Scope);
            return;
        }
        if (bStop)
        {
            // If neither the start nor its stop arrived, Rust has no live
            // movement to expire. The same zero can retire its sequence
            // without letting an older direction start when it arrives late.
            if (bAllowStopRetry && Recovery == ERecovery::Waiting && (!Result || Status == 503))
                StopToRetry = Sent;
            return;
        }
        // A lost, busy or duplicate reply can follow acceptance. Matching
        // progress or a successful renewal can still confirm the direction.
        if (!Result || Status == 503 || (Scope && String(Result, TEXT("code")) == TEXT("input-stale"))) return;
        if (Bool(Result, TEXT("ok"))) bDirectionAccepted = true;
        else if (!bDirectionAccepted) Interrupt(Session, FPlatformTime::Seconds(), bHadDirection);
    });
}

void FOpenLegendSteering::Stop(UOpenLegendSession& Session, double Now)
{
    Recovery = ERecovery::None;
    StopToRetry = 0;
    Integrate(Now);
    Pending = FVector2D::ZeroVector;
    Blocked = FVector2D::ZeroVector;
    PendingTurnAt = 0;
    if (bMoving || !Dispatched.IsNearlyZero()) Change(Session, Now, FVector2D::ZeroVector);
    bMoving = false;
    bDirectionAccepted = false;
    Dispatched = FVector2D::ZeroVector;
}

void FOpenLegendSteering::EndReleaseLease(const FObject& Result, const FReleaseRenewed& Notify)
{
    ReleaseLease.RenewThrough = 0;
    if (Notify) Notify(ReleaseLease.Input, Result);
}

void FOpenLegendSteering::Update(UOpenLegendSession& Session, double Now,
    const FVector2D& Wanted, bool bWalkKeyHeld, bool bKeyChange, double StartAge,
    const FObject& PendingRelease, const FReleaseRenewed& ReleaseRenewed)
{
    Integrate(Now);
    bool bMovementChanged = false;
    if (Wanted.IsNearlyZero())
    {
        // Opposing keys cancel the direction without ending the hold.
        if ((!bWalkKeyHeld && Recovery != ERecovery::None)
            || (bControlling && (bMoving || !Dispatched.IsNearlyZero())))
            Stop(Session, Now);
    }
    else if (CanSteer() && !bGestureInterrupted && Recovery != ERecovery::Waiting)
    {
        if (bMoving && Now >= RenewThrough)
        {
            Interrupt(Session, Now, true, true);
        }
        else
        {
            const bool bChangedDirection = !Wanted.Equals(Dispatched, UE_DOUBLE_SMALL_NUMBER);
            if (!Pending.Equals(Wanted, UE_DOUBLE_SMALL_NUMBER))
            {
                if (!bChangedDirection) PendingTurnAt = 0;
                else if (PendingTurnAt == 0) PendingTurnAt = Now;
                Pending = Wanted;
                if (!Wanted.Equals(Blocked, UE_DOUBLE_KINDA_SMALL_NUMBER)) RecheckBlockedDirection();
            }
            const bool bResuming = Recovery == ERecovery::Ready;
            if (bChangedDirection && (bResuming || bKeyChange || (bMoving && Now - LastSend >= Renewal)))
            {
                Recovery = ERecovery::None;
                Change(Session, Now, Wanted, bResuming ? 0 : StartAge);
                bMovementChanged = true;
            }
        }
    }
    if (StopToRetry != 0 && Now - LastSend >= Renewal)
    {
        const int64 Sent = StopToRetry;
        StopToRetry = 0;
        if (Recovery == ERecovery::Waiting && !bAwaitingInputScope && Sent == Sequence)
            SendDirection(Session, FVector2D::ZeroVector, Sent, false, false);
    }
    if (ReleaseLease.Input != PendingRelease)
    {
        ReleaseLease = {};
        ReleaseLease.Input = PendingRelease;
        if (PendingRelease && Expiry > 0) ReleaseLease.RenewThrough = Now + Expiry;
    }
    if (ReleaseLease.RenewThrough > 0 && Now >= ReleaseLease.RenewThrough)
        EndReleaseLease(nullptr, ReleaseRenewed);
    if (!bControlling || Epoch.IsEmpty() || Renewal <= 0 || RenewalSequence >= MaxSequence) return;
    const bool bRenewMovement = CanSteer() && bMoving && !bMovementChanged && Now - LastSend >= Renewal;
    const bool bRenewRelease = ReleaseLease.RenewThrough > Now && Now - ReleaseLease.LastSend >= Renewal;
    if (!bRenewMovement && !bRenewRelease) return;

    auto Body = MakeShared<FJsonObject>();
    Body->SetStringField(TEXT("kind"), TEXT("renew"));
    Body->SetStringField(TEXT("inputEpoch"), Epoch);
    const int64 Renewed = ++RenewalSequence;
    Body->SetNumberField(TEXT("renewalSequence"), Renewed);
    const int64 Sent = Sequence;
    if (bRenewMovement)
    {
        auto Movement = MakeShared<FJsonObject>();
        Movement->SetStringField(TEXT("movementInputToken"), Token);
        Movement->SetNumberField(TEXT("movementSequence"), Sent);
        Body->SetObjectField(TEXT("movement"), Movement);
        LastSend = Now;
    }
    const FObject Release = bRenewRelease ? ReleaseLease.Input : nullptr;
    if (Release)
    {
        Body->SetObjectField(TEXT("pendingRelease"), MakeShared<FJsonObject>(*Release));
        ReleaseLease.LastSend = Now;
    }
    const bool bSent = Session.Send(TEXT("/api/input"), Body,
        [this, &Session, Lifetime = TWeakPtr<int>(ReplyLifetime), Generation = MovementGeneration,
            Sent, Renewed, Now, bRenewMovement, Release, OnRelease = ReleaseRenewed](int32, FObject Result)
    {
        if (!Lifetime.IsValid()) return;
        const double ReceivedAt = FPlatformTime::Seconds();
        const auto Scope = Object(Result, TEXT("inputScope"));
        // Rust tracks the two original renewal sequences independently.
        // A late or repeated request can yield a negative result even if the
        // lease is live. Only a positive result can advance its local deadline.
        if (Release && Release == ReleaseLease.Input && ReceivedAt < ReleaseLease.RenewThrough)
        {
            const bool bCurrentRelease = ReplyUsesCurrentInput(Scope, TEXT("attackInputToken"),
                String(Release, TEXT("attackInputToken")));
            if (Scope && bCurrentRelease && Bool(Result, TEXT("releaseAccepted")))
                ReleaseLease.RenewThrough = FMath::Max(ReleaseLease.RenewThrough, Now + Expiry);
            else if (!bCurrentRelease && Renewed == ReleaseLease.LastRenewal)
                EndReleaseLease(Result, OnRelease);
        }
        if (!bRenewMovement || Generation != MovementGeneration || Sequence != Sent || !bMoving) return;
        const bool bCurrentInput = ReplyUsesCurrentInput(Scope, TEXT("movementInputToken"), Token);
        if (Scope && bCurrentInput && Bool(Result, TEXT("movementAccepted")))
        {
            bDirectionAccepted = true;
            if (ReceivedAt < RenewThrough) RenewThrough = FMath::Max(RenewThrough, Now + Expiry);
        }
        else if (!bCurrentInput && Renewed == LastMovementRenewal)
        {
            WaitForInputScope(Session, ReceivedAt, Scope);
        }
    });
    if (bSent)
    {
        if (bRenewMovement) LastMovementRenewal = Renewed;
        if (Release) ReleaseLease.LastRenewal = Renewed;
    }
}

void FOpenLegendSteering::Preview(const AOpenLegendScene& Scene, double Now,
    FVector& Foot, double& Yaw) const
{
    Foot = ConfirmedFoot;
    Yaw = ConfirmedYaw;
    if (History.IsEmpty() || Ratio <= 0 || Width <= 0 || Height <= 0
        || MetersPerGameSecond <= 0 || Support.IsEmpty()) return;

    FString CurrentSupport = Support;
    // A slower clock or credited progress on an earlier direction can leave
    // more time in the replay history than fits into the current lease.
    double Remaining = Expiry * Ratio;
    for (const auto& Span : History)
    {
        if (Remaining <= 0) break;
        const double Unprocessed = Span.Time - (Span.Sequence == Active ? ConfirmedTime : 0);
        if (Unprocessed <= 0) continue;
        const double Seconds = FMath::Min(Unprocessed, Remaining);
        Remaining -= Seconds;
        const double Turning = bMoving && Span.Sequence == Sequence && PendingTurnAt > 0
            ? FMath::Clamp((Now - PendingTurnAt) * Ratio, 0.0, Unprocessed) : 0;
        const double Straight = FMath::Min(Seconds, Unprocessed - Turning);
        const auto Apply = [&](FVector2D Direction, double Duration)
        {
            if (Duration <= 0) return true;
            if (Direction.Equals(Blocked, UE_DOUBLE_KINDA_SMALL_NUMBER)) return false;
            if (!Scene.ConstrainStep(Foot, CurrentSupport, Direction,
                Duration * MetersPerGameSecond, Width, Height, MaxSlope)) return false;
            Yaw = FMath::RadiansToDegrees(FMath::Atan2(-Direction.X, Direction.Y));
            return true;
        };
        if (!Apply(Span.Direction, Straight) || !Apply(Pending, Seconds - Straight)) return;
    }
}
