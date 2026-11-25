#pragma once

#include "GameFramework/PlayerController.h"
#include "Net/OpenLegendSession.h"
#include "OpenLegendAttack.h"
#include "OpenLegendSteering.h"
#include "OpenLegendPlayer.generated.h"

class ACameraActor;
class AOpenLegendScene;
class SButton;
class SEditableTextBox;
class SInputKeySelector;
struct FInputChord;
class SVerticalBox;
class SWidget;
class UInputAction;
class UInputMappingContext;
struct FInputActionInstance;

UCLASS()
class AOpenLegendPlayer final : public APlayerController
{
    GENERATED_BODY()

public:
    AOpenLegendPlayer();

protected:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type Reason) override;
    virtual void SetupInputComponent() override;
    virtual void PlayerTick(float DeltaSeconds) override;
    virtual bool InputKey(const FInputKeyEventArgs& Params) override;

private:
    enum class ECamera : uint8 { Follow, Elevated, Shoulder };
    enum class EAxis : uint8 { Forward, Back, Left, Right };
    UPROPERTY()
    TObjectPtr<ACameraActor> ViewCamera;
    UPROPERTY()
    TObjectPtr<AOpenLegendScene> Scene;
    UPROPERTY()
    TObjectPtr<UInputMappingContext> Mapping;
    UPROPERTY()
    TObjectPtr<UInputAction> CameraCycle;
    FKey CameraCycleKey;
    TSharedPtr<SInputKeySelector> CameraBinding;
    TSharedPtr<SWidget> Hud;
    TSharedPtr<SWidget> ReadingPanel, TradePanel, NotesPanel, PlacesPanel, NicknamePanel;
    TSharedPtr<SEditableTextBox> Composer;
    TSharedPtr<SButton> CheckResult;
    TSharedPtr<SVerticalBox> Choices;
    bool bChoosingContact = false;
    TArray<TPair<FString, FString>> ListedContacts;
    TWeakPtr<FJsonValue> ListedEntityRows;
    struct FCatalogueKey
    {
        double Life, Knowledge, Inventory;
        bool bPaused;
        bool operator==(const FCatalogueKey&) const = default;
    };
    TOptional<FCatalogueKey> CatalogueKey;
    TMap<FString, FString> CatalogueContacts;
    TWeakPtr<FJsonValue> CatalogueEntityRows;
    FOpenLegendSteering Steering;
    TSharedPtr<FOpenLegendAttack> Attack;
    FOpenLegendSteering::FReleaseRenewed AttackRenewed;
    bool bAttackPointerHeld = false;
    FDelegateHandle ViewListener, StatusListener, ActivationListener;

    ECamera ViewAngle = ECamera::Follow;
    double LookYaw = 0, LookPitch = -12;
    struct FCameraTrace
    {
        FVector Pivot, Desired, Result;
        uint64 GeometryRevision;
    };
    TOptional<FCameraTrace> LastCameraTrace;
    TOptional<FVector2D> PointerPress;
    bool bMouseLook = true, bCanCaptureMouse = false, bLookReady = false, bShowSight = false;
    bool bWasActive = false;
    bool bKeys[4]{};
    bool bDirectionChanged = false;
    uint64 WalkPressedAt = 0;
    FVector2D Direction = FVector2D::ZeroVector;
    FString Target, TargetName, TargetRevision;
    uint64 SelectionGeneration = 0, ComposerGeneration = 0;
    FString SelectedTimeline, SelectionScope, PrivateDraftScope;
    FString Outcome, SessionStatus;
    FText LatestSpeech;
    TWeakPtr<FJsonValue> SpeechEvents;
    TWeakPtr<FJsonValue> ConversationEvents;
    OpenLegend::FObject RetrySpeech;
    FString DraftTarget, PendingJob;
    FString ReceiptRoute, ReceiptOwner, ReceiptTimeline;
    FOpenLegendReceiptHandle ReceiptHandle;
    TSharedPtr<FJsonObject> Receipt;
    bool bSending = false;
    bool bCheckedReceipt = false;
    bool bReply = false;
    bool bMaySpeak = false;
    bool bUnaddressedSpeechDraft = false;
    uint64 DraftRevision = 0;
    TOptional<uint64> SubmittedDraft;
    struct FSuspendedSpeechDraft
    {
        FString Owner, Timeline, Target;
        FText Text;
        uint64 Revision;
    };
    TOptional<FSuspendedSpeechDraft> SuspendedSpeechDraft;

    UOpenLegendSession* Session() const;
    void ApplyView();
    void OnApplicationActivationChanged(bool bActive);
    void ApplyInputMode();
    bool IsMouseLooking() const { return bMouseLook && bCanCaptureMouse; }
    void BuildHud();
    void BindKey(const FKey& Key, EAxis Axis);
    void PressAxis(const FInputActionInstance& Instance, EAxis Axis, bool bDown);
    void RefreshDirection();
    void ReleaseInput();
    void ReleaseSteering();
    void CycleCamera();
    void SetCameraBinding(const FInputChord& Input);
    void SelectCamera(ECamera Angle);
    void FreePointer();
    void Escape();
    bool CanPick() const;
    void BeginPick();
    void EndPick();
    void CancelPick();
    void CancelPointerGesture();
    struct FSelectionHit
    {
        FVector Position;
        FString Contact, Surface, Blocker;
    };
    TOptional<FSelectionHit> TraceSelection(const FVector2D& Screen) const;
    TOptional<FOpenLegendAim> SampleAttackAim() const;
    void BrowseContacts();
    void RefreshContactChoices(const OpenLegend::FObject& View);
    void BrowseActions();
    static FCatalogueKey ReadCatalogueKey(const OpenLegend::FObject& View);
    bool CatalogueIsCurrent(const OpenLegend::FObject& View);
    bool OffersAreCurrent(uint64 Generation);
    void OpenOffers(const FString& Contact);
    /** Requests and displays the scoped options for the current selection. The caller owns the selection lifetime. */
    void RequestOffers(TSharedPtr<FJsonObject> Context);
    void ShowOfferMessage(const FString& Message);
    bool CanSubmitCommand() const;
    bool SubmitCommand(TSharedPtr<FJsonObject> Command, const FString& CommandId = {});
    void OpenComposer(const FString& Contact);
    void SuspendSpeechDraft();
    void RestoreSpeechDraft();
    /** Reads current speech and reply eligibility for the selected, permitted contact. */
    void ReadSpeechAvailability();
    void Say();
    void SubmitConversation(const TCHAR* Route, TSharedPtr<FJsonObject> Request, bool bSubmitDraft);
    void RetryConversation();
    bool CanRetryConversation() const;
    void ApplyConversation(const OpenLegend::FObject& View);
    bool RetainReceipt(const OpenLegend::FObject& View);
    /** Sends an admitted write. Its completion belongs only to the exact retained lookup. */
    bool SendRetainedRequest(const TCHAR* Route, TSharedPtr<FJsonObject> Body);
    bool ReceiptOwnerMatches(const OpenLegend::FObject& View) const;
    bool ExpireReceipt();
    void FinishReceipt();
    void FinishRequest(int32 Status, const OpenLegend::FObject& Result);
    void ShowConversationReceipt();
    void CancelConversation();
    void ClearSelection(bool bKeepUnaddressedDraft = false);
    bool WouldUseKeyboard() const;
    bool SelectionIsCurrent(uint64 Generation) const;
    FText HudLine() const;
    FText HeardSpeech() const { return LatestSpeech; }
    void UpdateRecentSpeech(const OpenLegend::FObject& View);
    void TogglePause();
};
