#pragma once

#include "CoreMinimal.h"
#include "OpenLegendJson.h"
#include "Templates/Function.h"
#include "Templates/SharedPointer.h"

class SWidget;
struct FSlateColor;

/** One permitted pick in wire coordinates (metres, vertical y). */
struct FOpenLegendAim
{
    FVector Position;
    FString Contact, BodyReference, Surface, Shape;
    bool bLiving = false, bAnimal = false;
};

/** Owns local attack input, presentation, and the exact transient release renewal.
 * The player submits commands and recovers their original receipts. Rust checks
 * current aim, installed rules, time, resources, and actual consequences.
 */
class FOpenLegendAttack final
{
public:
    using FSubmit = TFunction<bool(TSharedPtr<FJsonObject>, const FString&)>;
    FOpenLegendAttack(FSubmit Submit, TFunction<bool()> CanSubmit, TFunction<void()> OnReview);

    void AcceptView(const OpenLegend::FObject& Next);
    void Begin(const TOptional<FOpenLegendAim>& Aim);
    void Release(const TOptional<FOpenLegendAim>& Aim);
    void Prepare(const TOptional<FOpenLegendAim>& Aim);
    void ReleasePrepared(const TOptional<FOpenLegendAim>& Aim);
    void AttackNormally(const TOptional<FOpenLegendAim>& Aim);
    void Cancel();
    void Toggle();
    bool IsAttackMode() const { return bMode; }
    bool BlocksSteering() const { return Review.IsSet(); }
    bool CanToggle() const { return CanAct(); }
    bool CanBegin() const;
    bool CanPrepare() const;
    bool CanRelease() const;
    bool CanCancel() const;
    bool CanConfirm() const;
    bool ShowsControls() const;
    void ConfirmReview();

    OpenLegend::FObject PendingRelease() const { return Renewal; }
    /** Clear the exact release after its renewal owner reports local expiry or replaced input authority. */
    void AcceptRenewal(const OpenLegend::FObject& SentRelease, const OpenLegend::FObject& Result);
    /** Pass the flat original outcome, including a resolved receipt lookup.
     * Clear the previous completed command slot first. An uncertain result
     * clears automatic release while retaining its original request identity.
     */
    void AcceptCommandResult(const OpenLegend::FObject& OriginalEnvelope, int32 Status,
        const OpenLegend::FObject& Result);

    FText Status() const;
    FText ReviewText(const TCHAR* Field) const;
    TOptional<float> Timing();
    FSlateColor TimingColor();

private:
    struct FOwner
    {
        FString World, Save, Scope, Actor, Epoch, Token, HistoryEpoch;
        bool operator==(const FOwner& Other) const;
    };
    struct FAttempt
    {
        FString BeginId, ActionId, ReleaseId;
        FOpenLegendAim OriginalAim;
        OpenLegend::FObject Source, Profile;
        uint64 Sequence = 0;
        double DownAt = 0, Origin = 0;
        TOptional<FOpenLegendAim> FrozenAim;
        OpenLegend::FObject FrozenInput;
        bool bBeginUnconfirmed = false;
        bool bCancelRequested = false;
        bool bSeenInView = false;
    };
    struct FReview
    {
        OpenLegend::FObject Display, Command;
        FText Summary;
        FString Action, ConfirmId;
        uint64 ConfirmSequence = 0;
        bool bTimed = false, bPublished = false;
    };

    bool CanAct(bool bWhilePaused = false) const;
    bool CurrentAim(const FOpenLegendAim& Aim) const;
    bool ReviewTargetIsCurrent(const OpenLegend::FObject& Command) const;
    void ReleaseInternal(const TOptional<FOpenLegendAim>& Aim, bool bOrdinary);
    void SubmitRelease();
    void SubmitRecovered(const FOpenLegendAim& Aim, const FString& ActionId);
    bool CancelAction(const FString& ActionId, const FString& ReviewId = {});
    void OfferReview(const OpenLegend::FObject& Display, const OpenLegend::FObject& Command,
        const FString& Action, bool bTimed, bool bPublished);
    void AcceptPendingRelease(const OpenLegend::FObject& Result);
    void SetMessage(FString Message);
    TSharedPtr<FJsonObject> Execution(const TCHAR* Operation, uint64 Sequence) const;
    OpenLegend::FObject Player() const;
    OpenLegend::FObject OwnAction() const;
    OpenLegend::FObject OfferedRelease() const;
    void ResetAttempt();

    FSubmit Submit;
    TFunction<bool()> CanSubmit;
    TFunction<void()> OnReview;
    OpenLegend::FObject View, Renewal;
    FOwner Owner;
    TOptional<FAttempt> Attempt;
    TOptional<FReview> Review;
    FString ReviewedInStream, Message;
    uint64 Sequence = 0, Notice = 0;
    bool bMode = false, bPointerDown = false;
};

/** Consumes the player’s on-demand permitted scene pick for the explicit attack buttons. */
TSharedRef<SWidget> MakeOpenLegendAttackPanel(TSharedRef<FOpenLegendAttack> Attack,
    TFunction<TOptional<FOpenLegendAim>()> SampleAim);
