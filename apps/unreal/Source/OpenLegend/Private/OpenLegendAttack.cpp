#include "OpenLegendAttack.h"

#include "HAL/PlatformTime.h"
#include "Misc/Guid.h"
#include "Net/OpenLegendWire.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Notifications/SProgressBar.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/Text/STextBlock.h"
#include "Styling/SlateColor.h"

using namespace OpenLegend;

namespace
{
constexpr double HoldSeconds = 0.15; // Desktop tap/hold split in the action input contract.
constexpr uint64 SafeSequence = 9007199254740991ULL;

bool SameAttackText(const FString& A, const FString& B)
{
    return A.Equals(B, ESearchCase::CaseSensitive);
}

FString NewCommandId()
{
    return FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphensLower);
}

bool IsRanged(const FObject& Source)
{
    return SameAttackText(String(Source, TEXT("kind")), TEXT("ranged"));
}

FString BoundAction(const FObject& Command)
{
    const FString Aim = String(Command, TEXT("aimId"));
    return Aim.IsEmpty() ? String(Command, TEXT("expectedActionId")) : Aim;
}

bool PutAim(FJsonObject& Command, const FObject& Source, const FOpenLegendAim& Aim)
{
    Command.RemoveField(TEXT("targetId"));
    Command.RemoveField(TEXT("bodyReference"));
    Command.RemoveField(TEXT("aimPoint"));
    Command.RemoveField(TEXT("aimBasis"));
    const bool bHasBody = !Aim.Contact.IsEmpty() && !Aim.BodyReference.IsEmpty();
    const bool bRanged = IsRanged(Source);
    const FString Rule = String(Source, TEXT("targetRule"));
    const bool bLeads = bRanged && Aim.bLiving && (SameAttackText(Rule, TEXT("living-actor"))
        || (SameAttackText(Rule, TEXT("living-animal")) && Aim.bAnimal));
    if ((!bRanged || bLeads) && bHasBody)
    {
        Command.SetStringField(TEXT("targetId"), Aim.Contact);
        Command.SetStringField(TEXT("bodyReference"), Aim.BodyReference);
        return true;
    }
    if (!bRanged || !Bool(Source, TEXT("pointFire"))
        || (!bHasBody && Aim.Surface.IsEmpty() && Aim.Shape.IsEmpty()))
        return false;
    Command.SetObjectField(TEXT("aimPoint"), EncodePoint(Aim.Position));
    auto Basis = MakeShared<FJsonObject>();
    if (bHasBody)
    {
        Command.SetStringField(TEXT("targetId"), Aim.Contact);
        Basis->SetStringField(TEXT("bodyReference"), Aim.BodyReference);
    }
    if (!Aim.Surface.IsEmpty()) Basis->SetStringField(TEXT("surfaceId"), Aim.Surface);
    if (!Aim.Shape.IsEmpty()) Basis->SetStringField(TEXT("shapeId"), Aim.Shape);
    Command.SetObjectField(TEXT("aimBasis"), MoveTemp(Basis));
    return true;
}

FString JoinLines(const TArray<FString>& Lines)
{
    TArray<FString> Content = Lines;
    Content.RemoveAll([](const FString& Line) { return Line.IsEmpty(); });
    return FString::Join(Content, TEXT("\n"));
}

FText ReviewSummary(const FObject& Display)
{
    TArray<FString> Lines {
        String(Display, TEXT("title")), String(Display, TEXT("description")), String(Display, TEXT("targetLabel"))
    };
    const auto Attack = Object(Display, TEXT("attack"));
    Lines.Add(String(Attack, TEXT("name")));
    Lines.Add(String(Attack, TEXT("tool")));
    for (const auto& Row : Array(Attack, TEXT("facts")))
    {
        const auto Fact = Record(Row);
        const FString Value = String(Fact, TEXT("value"));
        if (!Value.IsEmpty()) Lines.Add(String(Fact, TEXT("name")) + TEXT(" — ") + Value);
    }
    return FText::FromString(JoinLines(Lines));
}
}

FOpenLegendAttack::FOpenLegendAttack(FSubmit Send, TFunction<bool()> MaySend, TFunction<void()> ReviewOpened)
    : Submit(MoveTemp(Send)), CanSubmit(MoveTemp(MaySend)), OnReview(MoveTemp(ReviewOpened))
{
}

bool FOpenLegendAttack::FOwner::operator==(const FOwner& Other) const
{
    return SameAttackText(World, Other.World) && SameAttackText(Save, Other.Save) && SameAttackText(Scope, Other.Scope)
        && SameAttackText(Actor, Other.Actor) && SameAttackText(Epoch, Other.Epoch) && SameAttackText(Token, Other.Token)
        && SameAttackText(HistoryEpoch, Other.HistoryEpoch);
}

FObject FOpenLegendAttack::Player() const { return Object(View, TEXT("player")); }
FObject FOpenLegendAttack::OwnAction() const { return Object(Player(), TEXT("action")); }

void FOpenLegendAttack::ResetAttempt()
{
    Attempt.Reset();
    Renewal.Reset();
    bPointerDown = false;
}

void FOpenLegendAttack::AcceptView(const FObject& Next)
{
    View = Next;
    const auto Own = Player();
    const auto Scope = Object(Own, TEXT("inputScope"));
    FOwner Current {
        String(View, TEXT("worldId")), String(View, TEXT("saveTimeline")),
        String(Object(View, TEXT("access")), TEXT("scope")), String(Own, TEXT("id")),
        String(Scope, TEXT("inputEpoch")), String(Scope, TEXT("attackInputToken")),
        String(View, TEXT("historyEpoch"))
    };
    uint64 CurrentNotice = 0;
    if (const auto NoticeRow = Object(Own, TEXT("attackModeNotice")))
        OpenLegendWire::ReadRevision(*NoticeRow, TEXT("noticeSequence"), CurrentNotice);
    if (!(Current == Owner))
    {
        const bool bSameInputs = SameAttackText(Current.Epoch, Owner.Epoch) && SameAttackText(Current.Token, Owner.Token);
        Owner = MoveTemp(Current);
        ResetAttempt();
        Review.Reset();
        ReviewedInStream.Reset();
        if (!bSameInputs) Sequence = 0;
        Notice = CurrentNotice;
        bMode = false;
        Message.Reset();
    }
    if (!CanAct())
    {
        ResetAttempt();
        Review.Reset();
        return;
    }
    if (CurrentNotice > Notice)
    {
        Notice = CurrentNotice;
        bMode = true;
    }
    const auto Action = OwnAction();
    const FString ActionId = String(Action, TEXT("id"));
    if (Attempt && !Attempt->ActionId.IsEmpty())
    {
        if (SameAttackText(ActionId, Attempt->ActionId))
        {
            const auto ExecutionView = Object(Action, TEXT("execution"));
            if (Attempt->bSeenInView && Renewal && !Bool(ExecutionView, TEXT("releaseRequested")))
                ResetAttempt();
            else if (!Renewal || Bool(ExecutionView, TEXT("releaseRequested")))
                Attempt->bSeenInView = true;
        }
        else if (Attempt->bSeenInView)
        {
            ResetAttempt();
        }
    }
    const auto Invitation = Object(Own, TEXT("attackReview"));
    const auto Display = Object(Invitation, TEXT("review"));
    FString ReviewId = String(Display, TEXT("id"));
    if (ReviewId.IsEmpty() && Review && Review->bPublished && Review->ConfirmId.IsEmpty())
        Review.Reset();
    if (!ReviewId.IsEmpty() && !SameAttackText(ReviewId, ReviewedInStream)
        && SameAttackText(ActionId, String(Invitation, TEXT("actionId"))))
    {
        ReviewedInStream = MoveTemp(ReviewId);
        OfferReview(Display, Object(Invitation, TEXT("command")), ActionId, true, true);
    }
    // The command response and the stream can arrive in either order. A
    // withdrawn selected body can never keep a clickable review here.
    if (Review && !ReviewTargetIsCurrent(Review->Command)) Review.Reset();
}

bool FOpenLegendAttack::CanAct(bool bWhilePaused) const
{
    return View && !Owner.Epoch.IsEmpty() && !Owner.Token.IsEmpty()
        && Bool(Object(View, TEXT("access")), TEXT("controlling")) && Bool(Player(), TEXT("alive"))
        && (bWhilePaused || !Bool(Object(View, TEXT("clock")), TEXT("paused")));
}

bool FOpenLegendAttack::CurrentAim(const FOpenLegendAim& Aim) const
{
    if (Aim.Contact.IsEmpty()) return !Aim.Surface.IsEmpty() || !Aim.Shape.IsEmpty();
    for (const auto& Value : Array(View, TEXT("entities")))
    {
        const auto Row = Record(Value);
        if (!SameAttackText(String(Row, TEXT("id")), Aim.Contact)) continue;
        const auto Observation = Object(Row, TEXT("observation"));
        return SameAttackText(String(Observation, TEXT("kind")), TEXT("current"))
            && SameAttackText(String(Observation, TEXT("modality")), TEXT("sight"))
            && !SameAttackText(String(Row, TEXT("bodyState")), TEXT("removed"))
            && (Aim.BodyReference.IsEmpty() || SameAttackText(String(Row, TEXT("bodyReference")), Aim.BodyReference));
    }
    return false;
}

bool FOpenLegendAttack::ReviewTargetIsCurrent(const FObject& Command) const
{
    FOpenLegendAim Selected {};
    Selected.Contact = String(Command, TEXT("targetId"));
    if (Selected.Contact.IsEmpty()) return true;
    Selected.BodyReference = String(Command, TEXT("bodyReference"));
    if (Selected.BodyReference.IsEmpty())
        Selected.BodyReference = String(Object(Command, TEXT("aimBasis")), TEXT("bodyReference"));
    return CurrentAim(Selected);
}

TSharedPtr<FJsonObject> FOpenLegendAttack::Execution(const TCHAR* Operation, uint64 InputSequence) const
{
    auto Result = MakeShared<FJsonObject>();
    Result->SetStringField(TEXT("operation"), Operation);
    Result->SetStringField(TEXT("inputEpoch"), Owner.Epoch);
    Result->SetStringField(TEXT("attackInputToken"), Owner.Token);
    Result->SetNumberField(TEXT("gestureSequence"), InputSequence);
    return Result;
}

FObject FOpenLegendAttack::OfferedRelease() const
{
    for (const auto& Choice : Array(OwnAction(), TEXT("controls")))
    {
        const auto Option = Record(Choice);
        const auto Command = Object(Option, TEXT("command"));
        const FString Kind = String(Command, TEXT("type"));
        if (SameAttackText(Kind, TEXT("release-strike")) || SameAttackText(Kind, TEXT("release-shot")))
            return Option;
    }
    return nullptr;
}

bool FOpenLegendAttack::CanBegin() const
{
    return bMode && CanAct() && !Attempt && !Review && !Renewal
        && !OfferedRelease() && CanSubmit() && Bool(Object(Player(), TEXT("attackSource")), TEXT("enabled"));
}

bool FOpenLegendAttack::CanPrepare() const
{
    return CanBegin() && Object(Object(Player(), TEXT("attackSource")), TEXT("profile"));
}

bool FOpenLegendAttack::CanRelease() const
{
    if (!CanAct() || Review || Renewal) return false;
    return Attempt ? !Attempt->FrozenAim && Attempt->ReleaseId.IsEmpty() && !Attempt->bCancelRequested
            && !Attempt->bBeginUnconfirmed
        : CanSubmit() && Bool(OfferedRelease(), TEXT("enabled"));
}

bool FOpenLegendAttack::CanCancel() const
{
    return CanAct(true) && (Review ? Review->ConfirmId.IsEmpty() && CanSubmit()
        : Attempt || Renewal || (OfferedRelease() && CanSubmit()));
}

bool FOpenLegendAttack::CanConfirm() const
{
    return Review && Review->ConfirmId.IsEmpty() && CanAct() && CanSubmit()
        && (!Review->bTimed || Sequence < SafeSequence);
}

bool FOpenLegendAttack::ShowsControls() const
{
    return bMode || Attempt || Review || OfferedRelease();
}

void FOpenLegendAttack::Begin(const TOptional<FOpenLegendAim>& Aim)
{
    if (bMode && Attempt && CanRelease() && !Attempt->ActionId.IsEmpty())
    {
        bPointerDown = true;
        return;
    }
    if (!CanBegin() || Sequence >= SafeSequence) return;
    const auto Source = Object(Player(), TEXT("attackSource"));
    const auto Base = Object(Source, TEXT("command"));
    if (!Base || !Aim || !CurrentAim(*Aim))
    {
        SetMessage(TEXT("Aim at a visible subject or surface."));
        return;
    }
    auto Command = MakeShared<FJsonObject>(*Base);
    if (!PutAim(*Command, Source, *Aim))
    {
        SetMessage(TEXT("Choose an opponent in view."));
        return;
    }
    const FString BeginId = NewCommandId();
    const auto Profile = Object(Source, TEXT("profile"));
    Attempt.Emplace();
    Attempt->BeginId = BeginId;
    Attempt->Sequence = ++Sequence;
    Attempt->DownAt = FPlatformTime::Seconds();
    Attempt->Source = Source;
    Attempt->Profile = Profile;
    Attempt->OriginalAim = *Aim;
    bPointerDown = true;
    Message.Reset();
    if (!Profile) return;
    Command->SetObjectField(TEXT("execution"), Execution(TEXT("begin"), Sequence));
    if (!Submit(MoveTemp(Command), BeginId)) ResetAttempt();
}

void FOpenLegendAttack::Release(const TOptional<FOpenLegendAim>& Aim)
{
    if (!bPointerDown) return;
    bPointerDown = false;
    ReleaseInternal(Aim, false);
}

void FOpenLegendAttack::Prepare(const TOptional<FOpenLegendAim>& Aim)
{
    if (CanPrepare()) Begin(Aim);
    bPointerDown = false;
}

void FOpenLegendAttack::ReleasePrepared(const TOptional<FOpenLegendAim>& Aim)
{
    bPointerDown = false;
    if (Attempt) ReleaseInternal(Aim, false);
    else if (Aim) SubmitRecovered(*Aim, String(OwnAction(), TEXT("id")));
}

void FOpenLegendAttack::AttackNormally(const TOptional<FOpenLegendAim>& Aim)
{
    if (!Attempt) Begin(Aim);
    bPointerDown = false;
    if (!Attempt && CanRelease() && Aim)
        SubmitRecovered(*Aim, String(OwnAction(), TEXT("id")));
    else ReleaseInternal(Aim, true);
}

void FOpenLegendAttack::ReleaseInternal(const TOptional<FOpenLegendAim>& Aim, bool bOrdinary)
{
    if (Review || !CanAct()) return;
    if (!Attempt || !CanRelease()) return;
    if (!Aim || !CurrentAim(*Aim)
        || (!IsRanged(Attempt->Source) && (!SameAttackText(Aim->Contact, Attempt->OriginalAim.Contact)
            || !SameAttackText(Aim->BodyReference, Attempt->OriginalAim.BodyReference))))
    {
        Cancel();
        SetMessage(TEXT("Your original target is no longer under the aim point."));
        return;
    }
    auto Input = MakeShared<FJsonObject>();
    const double Period = NumberOr(Attempt->Profile, TEXT("periodSeconds"), 0);
    if (!bOrdinary && Attempt->Origin > 0 && Period > 0)
    {
        Input->SetStringField(TEXT("kind"), TEXT("timed-release"));
        Input->SetNumberField(TEXT("phase"), FMath::Fmod(
            FMath::Max(0.0, FPlatformTime::Seconds() - Attempt->Origin) / Period, 1.0));
    }
    else
    {
        Input->SetStringField(TEXT("kind"), TEXT("ordinary"));
    }
    Attempt->FrozenAim = *Aim;
    Attempt->FrozenInput = MoveTemp(Input);
    SubmitRelease();
}

void FOpenLegendAttack::SubmitRelease()
{
    if (!Attempt || !Attempt->FrozenAim || !CanAct() || !CanSubmit()
        || (Attempt->Profile && Attempt->ActionId.IsEmpty())) return;
    const FOpenLegendAim Aim = MoveTemp(*Attempt->FrozenAim);
    Attempt->FrozenAim.Reset();
    if (!CurrentAim(Aim))
    {
        Cancel();
        SetMessage(TEXT("Your aim is no longer visible."));
        return;
    }
    if (!Attempt->Profile)
    {
        const auto Base = Object(Attempt->Source, TEXT("command"));
        auto Command = MakeShared<FJsonObject>(*Base);
        if (PutAim(*Command, Attempt->Source, Aim)) Submit(MoveTemp(Command), Attempt->BeginId);
        ResetAttempt();
        return;
    }
    auto Command = MakeShared<FJsonObject>();
    if (IsRanged(Attempt->Source))
    {
        Command->SetStringField(TEXT("type"), TEXT("release-shot"));
        Command->SetStringField(TEXT("aimId"), Attempt->ActionId);
        if (!PutAim(*Command, Attempt->Source, Aim))
        {
            Cancel();
            return;
        }
    }
    else
    {
        Command->SetStringField(TEXT("type"), TEXT("release-strike"));
        Command->SetStringField(TEXT("expectedActionId"), Attempt->ActionId);
    }
    auto Input = Execution(TEXT("release"), Attempt->Sequence);
    Input->SetStringField(TEXT("beginCommandId"), Attempt->BeginId);
    Command->SetObjectField(TEXT("execution"), Input);
    Input->SetObjectField(TEXT("input"), MakeShared<FJsonObject>(*Attempt->FrozenInput));
    Attempt->FrozenInput.Reset();
    Attempt->ReleaseId = NewCommandId();
    if (!Submit(MoveTemp(Command), Attempt->ReleaseId)) Attempt->ReleaseId.Reset();
}

void FOpenLegendAttack::SubmitRecovered(const FOpenLegendAim& Aim, const FString& ActionId)
{
    if (Attempt || !CanRelease() || ActionId.IsEmpty() || !SameAttackText(ActionId, String(OwnAction(), TEXT("id"))))
        return;
    const auto Offered = Object(OfferedRelease(), TEXT("command"));
    if (!Offered) return;
    auto Command = MakeShared<FJsonObject>(*Offered);
    if (SameAttackText(String(Offered, TEXT("type")), TEXT("release-shot"))
        && (!CurrentAim(Aim) || !PutAim(*Command, Object(Player(), TEXT("attackSource")), Aim)))
    {
        SetMessage(TEXT("Choose a visible place to aim."));
        return;
    }
    Submit(MoveTemp(Command), NewCommandId());
}

bool FOpenLegendAttack::CancelAction(const FString& ActionId, const FString& ReviewId)
{
    if ((ActionId.IsEmpty() && ReviewId.IsEmpty()) || !CanAct(true) || !CanSubmit()) return false;
    auto Command = MakeShared<FJsonObject>();
    Command->SetStringField(TEXT("type"), TEXT("cancel"));
    if (!ActionId.IsEmpty()) Command->SetStringField(TEXT("expectedActionId"), ActionId);
    if (!ReviewId.IsEmpty()) Command->SetStringField(TEXT("lethalReviewId"), ReviewId);
    return Submit(MoveTemp(Command), NewCommandId());
}

void FOpenLegendAttack::Cancel()
{
    bPointerDown = false;
    Renewal.Reset();
    if (Review)
    {
        if (CancelAction(Review->Action, String(Review->Display, TEXT("id"))))
        {
            Review.Reset();
            ResetAttempt();
        }
        return;
    }
    if (!Attempt)
    {
        if (OfferedRelease()) CancelAction(String(OwnAction(), TEXT("id")));
    }
    else if (Attempt->Profile)
    {
        Attempt->bCancelRequested = true;
        Attempt->FrozenAim.Reset();
        Attempt->FrozenInput.Reset();
        if (CancelAction(Attempt->ActionId)) ResetAttempt();
    }
    else ResetAttempt();
}

void FOpenLegendAttack::Toggle()
{
    if (!CanAct()) return;
    if (bMode) Cancel();
    bMode = !bMode;
    Message.Reset();
}

void FOpenLegendAttack::OfferReview(const FObject& Display, const FObject& Command,
    const FString& Action, bool bTimed, bool bPublished)
{
    if (!Display || !Command || !CanAct() || String(Display, TEXT("id")).IsEmpty()
        || !ReviewTargetIsCurrent(Command)) return;
    if (Review && SameAttackText(String(Review->Display, TEXT("id")), String(Display, TEXT("id")))) return;
    Renewal.Reset();
    bPointerDown = false;
    if (Attempt)
    {
        Attempt->FrozenAim.Reset();
        Attempt->FrozenInput.Reset();
    }
    Review = FReview {Display, Command, ReviewSummary(Display), Action, FString(), 0, bTimed, bPublished};
    if (OnReview) OnReview();
}

void FOpenLegendAttack::ConfirmReview()
{
    if (!CanConfirm()) return;
    auto Command = MakeShared<FJsonObject>(*Review->Command);
    Command->SetStringField(TEXT("lethalReviewId"), String(Review->Display, TEXT("id")));
    if (Review->bTimed)
    {
        Review->ConfirmSequence = ++Sequence;
        Command->SetObjectField(TEXT("execution"), Execution(TEXT("confirm-review"), Sequence));
    }
    Review->ConfirmId = NewCommandId();
    if (!Submit(MoveTemp(Command), Review->ConfirmId)) Review->ConfirmId.Reset();
}

void FOpenLegendAttack::AcceptPendingRelease(const FObject& Result)
{
    if (!Attempt || Attempt->ActionId.IsEmpty()
        || !Bool(Object(Result, TEXT("execution")), TEXT("releaseRequested")))
    {
        ResetAttempt();
        return;
    }
    Attempt->bSeenInView = false;
    auto Pending = MakeShared<FJsonObject>();
    Pending->SetStringField(TEXT("attackInputToken"), Owner.Token);
    Pending->SetNumberField(TEXT("gestureSequence"), Attempt->Sequence);
    Pending->SetStringField(TEXT("beginCommandId"), Attempt->BeginId);
    Pending->SetStringField(TEXT("actionId"), Attempt->ActionId);
    Renewal = MoveTemp(Pending);
}

void FOpenLegendAttack::AcceptRenewal(const FObject& SentRelease, const FObject& Result)
{
    if (SentRelease && SentRelease == Renewal)
    {
        ResetAttempt();
        if (!Bool(Result, TEXT("movementAccepted"))) SetMessage(String(Result, TEXT("message")));
    }
}

void FOpenLegendAttack::AcceptCommandResult(const FObject& Envelope, int32 StatusCode, const FObject& Result)
{
    const FString Id = String(Envelope, TEXT("commandId"));
    const auto Command = Object(Envelope, TEXT("command"));
    if (!CanAct(true) || Id.IsEmpty() || !Command) return;
    const bool bConfirming = Review && SameAttackText(Id, Review->ConfirmId);
    const bool bBeginning = Attempt && SameAttackText(Id, Attempt->BeginId);
    const bool bReleasing = Attempt && SameAttackText(Id, Attempt->ReleaseId);
    if (!Result || StatusCode == 0 || StatusCode >= 500 || SameAttackText(String(Result, TEXT("code")), TEXT("unconfirmed")))
    {
        if (Attempt && (bBeginning || bReleasing || bConfirming))
        {
            Attempt->bBeginUnconfirmed = true;
            Attempt->FrozenAim.Reset();
            Attempt->FrozenInput.Reset();
        }
        return;
    }
    if (const auto Scope = Object(Result, TEXT("inputScope")); Scope
        && (!SameAttackText(String(Scope, TEXT("inputEpoch")), Owner.Epoch)
            || !SameAttackText(String(Scope, TEXT("attackInputToken")), Owner.Token)))
    {
        return;
    }
    if (const auto Display = Object(Result, TEXT("lethalReview")))
    {
        const bool bTimed = bBeginning || bReleasing || (bConfirming && Review->bTimed);
        const auto Original = bConfirming ? Review->Command : Command;
        if (bConfirming) Review.Reset();
        OfferReview(Display, Original, BoundAction(Original), bTimed, false);
        if (Attempt && Attempt->bCancelRequested) Cancel();
        return;
    }
    const bool bAccepted = Bool(Result, TEXT("ok"));
    bool bPrepared = bBeginning && bAccepted;
    if (bConfirming)
    {
        const FString Operation = String(Object(Review->Command, TEXT("execution")), TEXT("operation"));
        bPrepared = bAccepted && Attempt && SameAttackText(Operation, TEXT("begin"));
        if (Attempt && Review->ConfirmSequence) Attempt->Sequence = Review->ConfirmSequence;
        Review.Reset();
    }
    if (bPrepared && Attempt)
    {
        Attempt->ActionId = String(Result, TEXT("actionId"));
        Attempt->Profile = Object(Object(Result, TEXT("execution")), TEXT("profile"));
        if (Attempt->ActionId.IsEmpty() || !Attempt->Profile)
        {
            ResetAttempt();
            return;
        }
        if (Attempt->bCancelRequested)
        {
            if (CancelAction(Attempt->ActionId)) ResetAttempt();
        }
        else if (Attempt->bBeginUnconfirmed)
        {
            // A recovered Begin can be released deliberately from the new
            // current view. Recovery never extends the old button gesture.
            ResetAttempt();
        }
        else SubmitRelease();
        return;
    }
    if (Attempt && Attempt->bCancelRequested && (bReleasing || bConfirming))
    {
        if (CancelAction(Attempt->ActionId)) ResetAttempt();
        return;
    }
    if (bAccepted && (bReleasing || bConfirming) && Attempt)
        AcceptPendingRelease(Result);
    else if (bBeginning || bReleasing || bConfirming)
        ResetAttempt();
}

void FOpenLegendAttack::SetMessage(FString Text) { Message = MoveTemp(Text); }

FText FOpenLegendAttack::Status() const
{
    if (!Message.IsEmpty()) return FText::FromString(Message);
    if (Renewal) return FText::FromString(TEXT("Release requested."));
    if (Attempt && Attempt->bCancelRequested) return FText::FromString(TEXT("Waiting for the original result before cancelling."));
    if (Attempt && Attempt->bBeginUnconfirmed) return FText::FromString(TEXT("Check the original result before continuing."));
    const auto Source = Object(Player(), TEXT("attackSource"));
    const bool bOwnAction = OfferedRelease().IsValid();
    const auto Read = bOwnAction ? OwnAction() : Source;
    return FText::FromString(JoinLines({
        String(Read, TEXT("label")),
        String(Read, bOwnAction ? TEXT("detail") : TEXT("reason")),
        String(Object(Attempt ? Attempt->Profile : Object(Source, TEXT("profile")), TEXT("labels")), TEXT("instruction"))
    }));
}

FText FOpenLegendAttack::ReviewText(const TCHAR* Field) const
{
    if (!Review) return FText::GetEmpty();
    return FCString::Strcmp(Field, TEXT("summary")) == 0
        ? Review->Summary : FText::FromString(String(Review->Display, Field));
}

TOptional<float> FOpenLegendAttack::Timing()
{
    if (!Attempt || Attempt->ActionId.IsEmpty() || Attempt->FrozenAim || Attempt->bCancelRequested
        || Attempt->bBeginUnconfirmed || !Attempt->ReleaseId.IsEmpty() || Review)
        return {};
    const double Now = FPlatformTime::Seconds();
    const double Period = NumberOr(Attempt->Profile, TEXT("periodSeconds"), 0);
    if (Period <= 0 || Now - Attempt->DownAt < HoldSeconds) return {};
    if (Attempt->Origin == 0) Attempt->Origin = Now;
    const double Phase = FMath::Fmod((Now - Attempt->Origin) / Period, 1.0);
    return static_cast<float>(1.0 - FMath::Abs(2.0 * Phase - 1.0));
}

FSlateColor FOpenLegendAttack::TimingColor()
{
    const auto Radius = Timing();
    if (!Radius || !Attempt) return FSlateColor::UseForeground();
    const double Deviation = FMath::Abs(*Radius - NumberOr(Attempt->Profile, TEXT("center"), 0));
    // This band is feedback for choosing a release time. Only the server
    // assesses the submitted sample and records its effect.
    if (Deviation <= NumberOr(Attempt->Profile, TEXT("greenWidth"), 0)) return FLinearColor::Green;
    if (Deviation <= NumberOr(Attempt->Profile, TEXT("ordinaryWidth"), 0)) return FLinearColor::Yellow;
    return FSlateColor::UseForeground();
}

TSharedRef<SWidget> MakeOpenLegendAttackPanel(TSharedRef<FOpenLegendAttack> Attack,
    TFunction<TOptional<FOpenLegendAim>()> SampleAim)
{
    auto Visibility = [Attack] { return Attack->ShowsControls() ? EVisibility::Visible : EVisibility::Collapsed; };
    auto ReviewVisibility = [Attack] { return Attack->BlocksSteering() ? EVisibility::Visible : EVisibility::Collapsed; };
    return SNew(SVerticalBox)
        + SVerticalBox::Slot().AutoHeight()[
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot().AutoWidth()[
                SNew(SButton).Text_Lambda([Attack]
                {
                    return FText::FromString(Attack->IsAttackMode() ? TEXT("Leave attack mode") : TEXT("Attack mode"));
                }).IsEnabled_Lambda([Attack] { return Attack->CanToggle(); })
                .OnClicked_Lambda([Attack] { Attack->Toggle(); return FReply::Handled(); })]
            + SHorizontalBox::Slot().AutoWidth()[
                SNew(SButton).Text(FText::FromString(TEXT("Attack normally"))).Visibility_Lambda(Visibility)
                .IsEnabled_Lambda([Attack] { return Attack->CanBegin() || Attack->CanRelease(); })
                .OnClicked_Lambda([Attack, SampleAim] { Attack->AttackNormally(SampleAim()); return FReply::Handled(); })]
            + SHorizontalBox::Slot().AutoWidth()[
                SNew(SButton).Text(FText::FromString(TEXT("Cancel attack"))).Visibility_Lambda([Attack, Visibility]
                {
                    return Attack->BlocksSteering() ? EVisibility::Collapsed : Visibility();
                }).IsEnabled_Lambda([Attack] { return Attack->CanCancel(); })
                .OnClicked_Lambda([Attack] { Attack->Cancel(); return FReply::Handled(); })]]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(SHorizontalBox).Visibility_Lambda([Attack, Visibility]
            {
                return Attack->BlocksSteering() ? EVisibility::Collapsed : Visibility();
            })
            + SHorizontalBox::Slot().AutoWidth()[
                SNew(SButton).Text(FText::FromString(TEXT("Prepare")))
                .IsEnabled_Lambda([Attack] { return Attack->CanPrepare(); })
                .OnClicked_Lambda([Attack, SampleAim] { Attack->Prepare(SampleAim()); return FReply::Handled(); })]
            + SHorizontalBox::Slot().AutoWidth()[
                SNew(SButton).Text(FText::FromString(TEXT("Release")))
                .IsEnabled_Lambda([Attack] { return Attack->CanRelease(); })
                .OnClicked_Lambda([Attack, SampleAim] { Attack->ReleasePrepared(SampleAim()); return FReply::Handled(); })]]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(STextBlock).AutoWrapText(true).Visibility_Lambda(Visibility)
            .Text_Lambda([Attack] { return Attack->Status(); })]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(SProgressBar).Visibility_Lambda([Attack]
            {
                return Attack->Timing() ? EVisibility::HitTestInvisible : EVisibility::Collapsed;
            }).Percent_Lambda([Attack] { return Attack->Timing(); })
            .FillColorAndOpacity_Lambda([Attack] { return Attack->TimingColor(); })]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(SVerticalBox).Visibility_Lambda(ReviewVisibility)
            + SVerticalBox::Slot().AutoHeight()[
                SNew(STextBlock).AutoWrapText(true).Text_Lambda([Attack] { return Attack->ReviewText(TEXT("summary")); })]
            + SVerticalBox::Slot().AutoHeight()[
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot().AutoWidth()[
                    SNew(SButton).Text_Lambda([Attack] { return Attack->ReviewText(TEXT("confirmLabel")); })
                    .IsEnabled_Lambda([Attack] { return Attack->CanConfirm(); })
                    .OnClicked_Lambda([Attack] { Attack->ConfirmReview(); return FReply::Handled(); })]
                + SHorizontalBox::Slot().AutoWidth()[
                    SNew(SButton).Text_Lambda([Attack] { return Attack->ReviewText(TEXT("cancelLabel")); })
                    .IsEnabled_Lambda([Attack] { return Attack->CanCancel(); })
                    .OnClicked_Lambda([Attack] { Attack->Cancel(); return FReply::Handled(); })]]];
}
