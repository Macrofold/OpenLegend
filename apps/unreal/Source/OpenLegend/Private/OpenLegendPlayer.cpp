#include "OpenLegendPlayer.h"

#include "Algo/AnyOf.h"
#include "Algo/Compare.h"
#include "Algo/Find.h"
#include "Camera/CameraActor.h"
#include "Camera/CameraComponent.h"
#include "Components/DirectionalLightComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/GameViewportClient.h"
#include "Engine/LocalPlayer.h"
#include "Engine/GameInstance.h"
#include "Engine/World.h"
#include "EnhancedInputComponent.h"
#include "EnhancedInputSubsystems.h"
#include "Framework/Application/SlateApplication.h"
#include "GenericPlatform/GenericPlatformHttp.h"
#include "InputAction.h"
#include "InputKeyEventArgs.h"
#include "InputMappingContext.h"
#include "Misc/ConfigCacheIni.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"
#include "Misc/Guid.h"
#include "Net/OpenLegendSession.h"
#include "OpenLegendCoordinates.h"
#include "OpenLegendScene.h"
#include "OpenLegendNotes.h"
#include "OpenLegendPlaces.h"
#include "OpenLegendReading.h"
#include "OpenLegendTrade.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Input/SInputKeySelector.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Widgets/Layout/SBorder.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/SOverlay.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/SNullWidget.h"
#include "Widgets/Text/STextBlock.h"

using namespace OpenLegend;

namespace
{
    FString NewId()
    {
        return FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphensLower);
    }

    TArrayView<const FKey> WalkingKeys()
    {
        static const FKey Keys[] = {EKeys::W, EKeys::S, EKeys::A, EKeys::D};
        return MakeArrayView(Keys);
    }

    bool AvailableCameraKey(const FKey& Key)
    {
        return Key.IsValid() && !Key.IsMouseButton() && !Key.IsGamepadKey()
            && !Algo::Find(WalkingKeys(), Key)
            && Key != EKeys::Escape && Key != EKeys::Enter && Key != EKeys::Tab && Key != EKeys::SpaceBar;
    }

    FReply Done()
    {
        return FReply::Handled();
    }
}

AOpenLegendPlayer::AOpenLegendPlayer()
{
    bAutoManageActiveCameraTarget = false;
}

UOpenLegendSession* AOpenLegendPlayer::Session() const
{
    return GetGameInstance() ? GetGameInstance()->GetSubsystem<UOpenLegendSession>() : nullptr;
}

void AOpenLegendPlayer::BeginPlay()
{
    Super::BeginPlay();
    if (!IsLocalController()) return;
    Scene = GetWorld()->SpawnActor<AOpenLegendScene>();
    ViewCamera = GetWorld()->SpawnActor<ACameraActor>();
    if (ViewCamera)
    {
        ViewCamera->GetCameraComponent()->SetFieldOfView(70);
        SetViewTarget(ViewCamera);
    }
    if (auto* Light = GetWorld()->SpawnActor<ADirectionalLight>(FVector::ZeroVector, FRotator(-50, -45, 0)))
        Light->GetLightComponent()->SetIntensity(3.0);
    if (auto* Owner = Session())
    {
        ViewListener = Owner->OnViewChanged.AddUObject(this, &AOpenLegendPlayer::ApplyView);
        StatusListener = Owner->OnStatusChanged.AddWeakLambda(this, [this](const FText& Status)
        {
            SessionStatus = Status.ToString();
        });
        FString Origin, World;
        GConfig->GetString(TEXT("OpenLegend.Connection"), TEXT("Origin"), Origin, GGameIni);
        GConfig->GetString(TEXT("OpenLegend.Connection"), TEXT("World"), World, GGameIni);
#if !UE_BUILD_SHIPPING
        FParse::Value(FCommandLine::Get(), TEXT("OpenLegendOrigin="), Origin);
        FParse::Value(FCommandLine::Get(), TEXT("OpenLegendWorld="), World);
#endif
        if (!Origin.IsEmpty()) Owner->Connect(Origin, World);
        else SessionStatus = TEXT("Choose a configured Open Legend installation.");
    }
    BuildHud();
    ApplyInputMode();
    ApplyView();
    if (FSlateApplication::IsInitialized())
    {
        auto& Slate = FSlateApplication::Get();
        ActivationListener = Slate.OnApplicationActivationStateChanged().AddUObject(
            this, &AOpenLegendPlayer::OnApplicationActivationChanged);
        OnApplicationActivationChanged(Slate.IsActive());
    }
}

void AOpenLegendPlayer::EndPlay(const EEndPlayReason::Type Reason)
{
    if (FSlateApplication::IsInitialized())
        FSlateApplication::Get().OnApplicationActivationStateChanged().Remove(ActivationListener);
    ReleaseInput();
    if (Attack) Attack->Cancel();
    if (auto* Owner = Session())
    {
        Owner->SetPresent(false);
        Owner->OnViewChanged.Remove(ViewListener);
        Owner->OnStatusChanged.Remove(StatusListener);
    }
    if (Mapping)
    {
        if (auto* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer()))
            Subsystem->RemoveMappingContext(Mapping);
    }
    if (Hud && GetWorld() && GetWorld()->GetGameViewport())
        GetWorld()->GetGameViewport()->RemoveViewportWidgetContent(Hud.ToSharedRef());
    if (Scene) Scene->Destroy();
    if (ViewCamera) ViewCamera->Destroy();
    Super::EndPlay(Reason);
}

void AOpenLegendPlayer::SetupInputComponent()
{
    Super::SetupInputComponent();
    auto* Input = Cast<UEnhancedInputComponent>(InputComponent);
    auto* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer());
    if (!Input || !Subsystem) return;
    Mapping = NewObject<UInputMappingContext>(this);
    const auto Keys = WalkingKeys();
    for (int32 Axis = 0; Axis < Keys.Num(); ++Axis) BindKey(Keys[Axis], static_cast<EAxis>(Axis));
    auto Bind = [&](const FKey& Key, void (AOpenLegendPlayer::*Action)())
    {
        auto* Binding = NewObject<UInputAction>(Mapping);
        Mapping->MapKey(Binding, Key);
        Input->BindAction(Binding, ETriggerEvent::Started, this, Action);
    };
    FString SavedBinding;
    GConfig->GetString(TEXT("OpenLegend.Input"), TEXT("CycleCamera"), SavedBinding, GGameUserSettingsIni);
    const FKey Stored{FName(*SavedBinding)};
    CameraCycleKey = AvailableCameraKey(Stored) ? Stored : EKeys::X;
    CameraCycle = NewObject<UInputAction>(Mapping);
    Mapping->MapKey(CameraCycle, CameraCycleKey);
    Input->BindAction(CameraCycle, ETriggerEvent::Started, this, &AOpenLegendPlayer::CycleCamera);
    Bind(EKeys::Escape, &AOpenLegendPlayer::Escape);
    auto* Pointer = NewObject<UInputAction>(Mapping);
    Mapping->MapKey(Pointer, EKeys::LeftMouseButton);
    Input->BindAction(Pointer, ETriggerEvent::Started, this, &AOpenLegendPlayer::BeginPick);
    Input->BindAction(Pointer, ETriggerEvent::Completed, this, &AOpenLegendPlayer::EndPick);
    Input->BindAction(Pointer, ETriggerEvent::Canceled, this, &AOpenLegendPlayer::CancelPointerGesture);
    Subsystem->AddMappingContext(Mapping, 0);
}

bool AOpenLegendPlayer::InputKey(const FInputKeyEventArgs& Params)
{
    if (Params.Event == IE_Pressed && Algo::Find(WalkingKeys(), Params.Key))
        WalkPressedAt = Params.EventTimestamp;
    return Super::InputKey(Params);
}

void AOpenLegendPlayer::BindKey(const FKey& Key, EAxis Axis)
{
    auto* Action = NewObject<UInputAction>(Mapping);
    Mapping->MapKey(Action, Key);
    auto* Input = CastChecked<UEnhancedInputComponent>(InputComponent);
    Input->BindAction(Action, ETriggerEvent::Started, this, &AOpenLegendPlayer::PressAxis, Axis, true);
    Input->BindAction(Action, ETriggerEvent::Completed, this, &AOpenLegendPlayer::PressAxis, Axis, false);
    Input->BindAction(Action, ETriggerEvent::Canceled, this, &AOpenLegendPlayer::PressAxis, Axis, false);
}

bool AOpenLegendPlayer::WouldUseKeyboard() const
{
    return bWasActive && (!Composer || !Composer->HasKeyboardFocus())
        && (!ReadingPanel || !ReadingPanel->HasFocusedDescendants())
        && (!TradePanel || !TradePanel->HasFocusedDescendants())
        && (!NotesPanel || !NotesPanel->HasFocusedDescendants())
        && (!PlacesPanel || !PlacesPanel->HasFocusedDescendants())
        && (!NicknamePanel || !NicknamePanel->HasFocusedDescendants())
        && (!CameraBinding || !CameraBinding->GetIsSelectingKey());
}

void AOpenLegendPlayer::PressAxis(const FInputActionInstance&, EAxis Axis, bool bDown)
{
    if (Steering.ConsumeGestureInterruption()) ReleaseSteering();
    if (bDown && (!WouldUseKeyboard() || !Steering.CanSteer() || (Attack && Attack->BlocksSteering()))) return;
    // The action still owns admission. Use its local timestamp if the input
    // producer did not supply a raw hardware timestamp.
    if (bDown && WalkPressedAt == 0) WalkPressedAt = FPlatformTime::Cycles64();
    bKeys[static_cast<uint8>(Axis)] = bDown;
    bDirectionChanged = true;
    RefreshDirection();
}

void AOpenLegendPlayer::RefreshDirection()
{
    const FVector2D Local(int(bKeys[0]) - int(bKeys[1]), int(bKeys[3]) - int(bKeys[2]));
    const FVector2D SceneDirection = Local.GetSafeNormal().GetRotated(LookYaw);
    Direction = FVector2D(-SceneDirection.Y, SceneDirection.X);
    if (!Direction.IsNearlyZero()) Direction.Normalize();
}

void AOpenLegendPlayer::ReleaseInput()
{
    CancelPointerGesture();
    ReleaseSteering();
}

void AOpenLegendPlayer::ReleaseSteering()
{
    for (bool& Key : bKeys) Key = false;
    WalkPressedAt = 0;
    Direction = FVector2D::ZeroVector;
    bDirectionChanged = false;
    if (auto* Owner = Session()) Steering.Stop(*Owner, FPlatformTime::Seconds());
}

void AOpenLegendPlayer::OnApplicationActivationChanged(bool bActive)
{
    if (bWasActive == bActive) return;
    bWasActive = bActive;
    if (!bActive)
    {
        ReleaseInput();
        if (Attack) Attack->Cancel();
    }
    // Fence the previous view when the app returns, before the session ticker pumps callbacks.
    if (auto* Owner = Session()) Owner->SetPresent(bActive);
}

void AOpenLegendPlayer::PlayerTick(float DeltaSeconds)
{
    Super::PlayerTick(DeltaSeconds);
    auto* Owner = Session();
    if (!Owner || !ViewCamera || !Scene) return;
    bool bWalkKeyHeld = Algo::AnyOf(bKeys);
    if ((bWalkKeyHeld || bAttackPointerHeld) && !WouldUseKeyboard())
    {
        ReleaseInput();
        bWalkKeyHeld = false;
    }
    else if (bWalkKeyHeld && Attack && Attack->BlocksSteering())
    {
        ReleaseSteering();
        bWalkKeyHeld = false;
    }

    if (PointerPress)
    {
        const auto& Slate = FSlateApplication::Get();
        if (!CanPick() || FVector2D::DistSquared(*PointerPress, Slate.GetCursorPos())
                > Slate.GetDragTriggerDistanceSquared())
            CancelPick();
    }
    const bool bLooking = IsMouseLooking();
    const bool bOrbitDrag = !bLooking && ViewAngle == ECamera::Elevated && IsInputKeyDown(EKeys::RightMouseButton);
    if ((bLooking || bOrbitDrag) && WouldUseKeyboard())
    {
        float DeltaX = 0, DeltaY = 0;
        GetInputMouseDelta(DeltaX, DeltaY);
        LookYaw = FRotator::NormalizeAxis(LookYaw + DeltaX * 0.2);
        LookPitch = FMath::Clamp(LookPitch - DeltaY * 0.2, -75.0, 20.0);
        if (DeltaX != 0 && bLooking && ViewAngle == ECamera::Follow) RefreshDirection();
    }

    const double Now = FPlatformTime::Seconds();
    double StartAge = 0;
    if (bDirectionChanged && WalkPressedAt != 0)
    {
        const uint64 Sampled = FPlatformTime::Cycles64();
        if (Sampled > WalkPressedAt)
            StartAge = FMath::Min<double>(DeltaSeconds, FPlatformTime::ToSeconds64(Sampled - WalkPressedAt));
    }
    Steering.Update(*Owner, Now, Direction, bWalkKeyHeld, bDirectionChanged, StartAge,
        Attack ? Attack->PendingRelease() : nullptr, AttackRenewed);
    if (Steering.ConsumeGestureInterruption()) ReleaseSteering();
    WalkPressedAt = 0;
    bDirectionChanged = false;
    if (!Steering.HasPose()) return;
    FVector Foot;
    double Yaw;
    Steering.Preview(*Scene, Now, Foot, Yaw);
    Scene->DisplaySelf(Foot, Yaw);

    const FVector Ahead = FRotator(LookPitch, LookYaw, 0).Vector();
    const FVector Right = FRotator(0, LookYaw + 90, 0).Vector();
    const bool bShoulder = ViewAngle == ECamera::Shoulder;
    const double Distance = bShoulder ? 200 : ViewAngle == ECamera::Elevated ? 950 : 480;
    const FVector Pivot = ToScene(Foot) + FVector(0, 0, 150);
    const FVector Desired = Pivot - Ahead * Distance + (bShoulder ? 55 * Right : FVector::ZeroVector);
    const uint64 GeometryRevision = Scene->CameraGeometryRevision();
    if (!LastCameraTrace || LastCameraTrace->GeometryRevision != GeometryRevision
        || LastCameraTrace->Pivot != Pivot || LastCameraTrace->Desired != Desired)
    {
        FHitResult Obstruction;
        const bool bHit = GetWorld()->SweepSingleByChannel(Obstruction, Pivot, Desired,
            FQuat::Identity, ECC_Camera, FCollisionShape::MakeSphere(12));
        LastCameraTrace = FCameraTrace{Pivot, Desired, bHit ? Obstruction.Location : Desired, GeometryRevision};
    }
    const FRotator Rotation(LookPitch, LookYaw, 0);
    if (ViewCamera->GetActorLocation() != LastCameraTrace->Result || !ViewCamera->GetActorRotation().Equals(Rotation))
        ViewCamera->SetActorLocationAndRotation(LastCameraTrace->Result, Rotation);
}

void AOpenLegendPlayer::ApplyView()
{
    auto* Owner = Session();
    const auto View = Owner ? Owner->GetView() : nullptr;
    const bool bKeepGesture = Steering.AcceptView(View);
    if (Attack) Attack->AcceptView(View);
    if (Scene)
    {
        const uint64 Before = Scene->CameraGeometryRevision();
        Scene->Apply(View);
        if (Before != Scene->CameraGeometryRevision()) Steering.RecheckBlockedDirection();
    }
    const FString Timeline = String(View, TEXT("saveTimeline"));
    const auto Access = Object(View, TEXT("access"));
    const FString Scope = String(Access, TEXT("scope"));
    const bool bScopeChanged = !Timeline.Equals(SelectedTimeline, ESearchCase::CaseSensitive)
        || !Scope.Equals(SelectionScope, ESearchCase::CaseSensitive);
    if (!bKeepGesture || bScopeChanged) ReleaseSteering();
    if (!View)
    {
        if (Owner && Owner->IsViewTemporarilyUnavailable())
        {
            if (bScopeChanged) SuspendSpeechDraft();
        }
        else SuspendedSpeechDraft.Reset();
    }
    if (bScopeChanged)
    {
        CancelPick();
        bAttackPointerHeld = false;
        Outcome.Reset();
        ReplyWords.Reset();
        FailedReplyId.Reset();
        FailedReplyMessage.Reset();
        ReplyJobs.Reset();
        if (View && Receipt && !ReceiptOwnerMatches(View)) FinishReceipt();
        bCheckedReceipt = false;
        SelectedTimeline = Timeline;
        SelectionScope = Scope;
        PrivateDraftScope = String(Access, TEXT("privateDraftScope"));
        ClearSelection();
        bLookReady = false;
    }
    // Keep the sign-in, take-control and resume controls reachable before play.
    const bool bCanCapture = Steering.CanControl() && Steering.HasPose()
        && !Bool(Object(View, TEXT("clock")), TEXT("paused"));
    if (bCanCapture != bCanCaptureMouse)
    {
        bCanCaptureMouse = bCanCapture;
        ApplyInputMode();
    }
    UpdateRecentSpeech(View);
    ApplyReplyJobs(View);
    if (!View)
    {
        bSending = false;
        return;
    }
    const bool bRestore = !bCheckedReceipt && !Receipt;
    bCheckedReceipt = true;
    if (bRestore && Owner->LoadPendingReceipt(ReceiptRoute, Receipt, ReceiptHandle))
    {
        ReceiptTimeline = Timeline;
        ReceiptOwner = String(Access, TEXT("commandRecoveryScope"));
    }
    if (bScopeChanged && Receipt)
    {
        Outcome = TEXT("A previous request may have finished. Check its result.");
    }
    if (bScopeChanged) RestoreSpeechDraft();
    if (bChoosingContact) RefreshContactChoices(View);
    if (CatalogueKey.IsSet() && !CatalogueIsCurrent(View))
    {
        ClearSelection(true);
        ShowOfferMessage(TEXT("Actions changed. Open Actions again."));
    }
    if (!Target.IsEmpty())
    {
        const auto Body = Scene ? Scene->CurrentContact(Target) : nullptr;
        if (!Body)
        {
            ClearSelection(true);
        }
        else
        {
            TargetName = String(Body, TEXT("name"));
            const FString Revision = String(Body, TEXT("contextActionRevision"));
            if (!TargetRevision.Equals(Revision, ESearchCase::CaseSensitive))
            {
                TargetRevision = Revision;
                ++SelectionGeneration;
                ++ComposerGeneration;
                bMaySpeak = false;
                if (Choices)
                {
                    Choices->ClearChildren();
                    Choices->AddSlot().AutoHeight()[
                        SNew(STextBlock).Text(FText::FromString(TEXT("Actions changed. Select the target again.")))];
                }
            }
        }
    }
    if (!bLookReady)
    {
        LookYaw = ToSceneYaw(NumberOr(Object(View, TEXT("player")), TEXT("heading"), 0));
        bLookReady = true;
    }
}

void AOpenLegendPlayer::ApplyInputMode()
{
    const bool bLooking = IsMouseLooking();
    bShowMouseCursor = !bLooking;
    if (bLooking)
    {
        FInputModeGameOnly Mode;
        Mode.SetConsumeCaptureMouseDown(true);
        SetInputMode(Mode);
    }
    else
    {
        FInputModeGameAndUI Mode;
        Mode.SetHideCursorDuringCapture(false);
        Mode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
        SetInputMode(Mode);
    }
}

void AOpenLegendPlayer::SetCameraBinding(const FInputChord& Input)
{
    if (!CameraCycle || !Mapping || !AvailableCameraKey(Input.Key))
    {
        CameraBinding->SetSelectedKey(FInputChord(CameraCycleKey));
        Outcome = TEXT("Choose a keyboard key that is free.");
        return;
    }
    Mapping->UnmapKey(CameraCycle, CameraCycleKey);
    CameraCycleKey = Input.Key;
    Mapping->MapKey(CameraCycle, CameraCycleKey);
    if (auto* Subsystem = ULocalPlayer::GetSubsystem<UEnhancedInputLocalPlayerSubsystem>(GetLocalPlayer()))
    {
        FModifyContextOptions Options;
        Options.bIgnoreAllPressedKeysUntilRelease = true;
        Subsystem->RequestRebuildControlMappings(Options);
    }
    GConfig->SetString(TEXT("OpenLegend.Input"), TEXT("CycleCamera"), *CameraCycleKey.ToString(), GGameUserSettingsIni);
    GConfig->Flush(false, GGameUserSettingsIni);
}

void AOpenLegendPlayer::CycleCamera()
{
    if (!WouldUseKeyboard()) return;
    SelectCamera(static_cast<ECamera>((int(ViewAngle) + 1) % 3));
}

void AOpenLegendPlayer::SelectCamera(ECamera Angle)
{
    if (bAttackPointerHeld) return;
    CancelPick();
    ViewAngle = Angle;
    LookPitch = ViewAngle == ECamera::Elevated ? -58 : -12;
    bMouseLook = ViewAngle != ECamera::Elevated;
    ApplyInputMode();
}

void AOpenLegendPlayer::FreePointer()
{
    CancelPick();
    if (Composer && Composer->HasKeyboardFocus())
    {
        FSlateApplication::Get().SetAllUserFocusToGameViewport();
        return;
    }
    bMouseLook = false;
    ApplyInputMode();
}

void AOpenLegendPlayer::Escape()
{
    CancelPointerGesture();
    if (Attack) Attack->Cancel();
    FreePointer();
}

bool AOpenLegendPlayer::CanPick() const
{
    return !IsMouseLooking() && Steering.CanControl() && WouldUseKeyboard() && Scene;
}

void AOpenLegendPlayer::BeginPick()
{
    if (Attack && Attack->IsAttackMode() && WouldUseKeyboard())
    {
        bAttackPointerHeld = true;
        Attack->Begin(SampleAttackAim());
        return;
    }
    // Slate's drag threshold uses screen units. GetMousePosition returns
    // viewport pixels and is needed only for the final scene trace.
    if (CanPick()) PointerPress = FVector2D(FSlateApplication::Get().GetCursorPos());
}

void AOpenLegendPlayer::CancelPick()
{
    PointerPress.Reset();
}

void AOpenLegendPlayer::CancelPointerGesture()
{
    CancelPick();
    if (bAttackPointerHeld && Attack) Attack->Cancel();
    bAttackPointerHeld = false;
}

TOptional<AOpenLegendPlayer::FSelectionHit> AOpenLegendPlayer::TraceSelection(const FVector2D& Screen) const
{
    if (!Scene) return {};
    FHitResult Surface, Visible;
    const bool bHit = GetHitResultAtScreenPosition(Screen, ECC_Visibility, false, Surface);
    // Prefer the visible contact only when it is in front of the public cover.
    if (GetHitResultAtScreenPosition(Screen, ECC_Visibility, true, Visible)
        && (!bHit || Visible.GetComponent() == Surface.GetComponent() || Visible.Distance <= Surface.Distance))
    {
        FString Contact = Scene->ContactAt(Visible);
        if (!Contact.IsEmpty()) return FSelectionHit{ToWorld(Visible.ImpactPoint), MoveTemp(Contact), {}, {}};
    }
    if (!bHit) return {};
    return FSelectionHit{ToWorld(Surface.ImpactPoint), Scene->ContactAt(Surface),
        Scene->SupportAt(Surface), Scene->BlockerAt(Surface)};
}

TOptional<FOpenLegendAim> AOpenLegendPlayer::SampleAttackAim() const
{
    if (!Steering.CanControl() || !Scene) return {};
    FVector2D Screen;
    if (IsMouseLooking())
    {
        int32 Width = 0, Height = 0;
        GetViewportSize(Width, Height);
        if (Width <= 0 || Height <= 0) return {};
        Screen = FVector2D(Width * 0.5, Height * 0.5);
    }
    else if (!GetMousePosition(Screen.X, Screen.Y)) return {};
    const auto Hit = TraceSelection(Screen);
    if (!Hit) return {};
    FOpenLegendAim Aim;
    Aim.Position = Hit->Position;
    Aim.Contact = Hit->Contact;
    Aim.Surface = Hit->Surface;
    Aim.Shape = Hit->Blocker;
    if (const auto Body = Scene->CurrentContact(Hit->Contact))
    {
        Aim.BodyReference = String(Body, TEXT("bodyReference"));
        const auto State = Body->TryGetField(TEXT("bodyState"));
        Aim.bLiving = !Aim.BodyReference.IsEmpty() && (!State || State->IsNull());
        Aim.bAnimal = Aim.bLiving && String(Body, TEXT("kind")) == TEXT("animal");
    }
    if (Aim.Contact.IsEmpty() && Aim.Surface.IsEmpty() && Aim.Shape.IsEmpty()) return {};
    return Aim;
}

void AOpenLegendPlayer::EndPick()
{
    if (bAttackPointerHeld && Attack)
    {
        bAttackPointerHeld = false;
        Attack->Release(SampleAttackAim());
        return;
    }
    const auto Press = PointerPress;
    CancelPick();
    const auto& Slate = FSlateApplication::Get();
    FVector2D Cursor;
    if (!Press || !CanPick() || FVector2D::DistSquared(*Press, Slate.GetCursorPos())
            > Slate.GetDragTriggerDistanceSquared()
        || !GetMousePosition(Cursor.X, Cursor.Y)) return;

    const auto Hit = TraceSelection(Cursor);
    if (Hit && !Hit->Contact.IsEmpty())
    {
        OpenOffers(Hit->Contact);
        return;
    }
    if (bChoosingContact || CatalogueKey.IsSet() || !Target.IsEmpty())
    {
        ClearSelection();
        return;
    }
    if (!Hit || Hit->Surface.IsEmpty()) return;
    auto Command = MakeShared<FJsonObject>();
    Command->SetStringField(TEXT("type"), TEXT("move"));
    auto Destination = EncodePoint(Hit->Position);
    Destination->SetStringField(TEXT("surfaceId"), Hit->Surface);
    Command->SetObjectField(TEXT("position"), Destination);
    SubmitCommand(Command);
}

bool AOpenLegendPlayer::SelectionIsCurrent(uint64 Generation) const
{
    return Generation == SelectionGeneration && !Target.IsEmpty() && Scene && Scene->CurrentContact(Target);
}

void AOpenLegendPlayer::ClearSelection(bool bKeepUnaddressedDraft)
{
    ++SelectionGeneration;
    ++ComposerGeneration;
    bChoosingContact = false;
    ListedContacts.Reset();
    ListedEntityRows.Reset();
    CatalogueKey.Reset();
    CatalogueContacts.Reset();
    CatalogueEntityRows.Reset();
    Target.Reset();
    TargetRevision.Reset();
    TargetName.Reset();
    DraftTarget.Reset();
    bMaySpeak = false;
    bReply = false;
    if (Choices) Choices->ClearChildren();
    if (!bKeepUnaddressedDraft || !bUnaddressedSpeechDraft)
    {
        ++DraftRevision;
        bUnaddressedSpeechDraft = false;
        if (Composer) Composer->SetText(FText::GetEmpty());
    }
}

void AOpenLegendPlayer::BrowseContacts()
{
    const auto* Owner = Session();
    if (!Owner || !Steering.CanControl() || !Scene) return;
    ClearSelection(true);
    ReleaseInput();
    FreePointer();
    bChoosingContact = true;
    RefreshContactChoices(Owner->GetView());
}

void AOpenLegendPlayer::RefreshContactChoices(const FObject& View)
{
    if (!Choices || !Scene || !View) return;
    const auto Rows = View->TryGetField(TEXT("entities"));
    if (Rows && Rows == ListedEntityRows.Pin()) return;
    ListedEntityRows = Rows;
    auto Current = Scene->ContactChoices();
    const bool bSame = Algo::Compare(Current, ListedContacts, [](const auto& A, const auto& B)
    {
        return A.Key.Equals(B.Key, ESearchCase::CaseSensitive) && A.Value.Equals(B.Value, ESearchCase::CaseSensitive);
    });
    if (bSame && Choices->NumSlots() != 0) return;
    ListedContacts = MoveTemp(Current);
    Choices->ClearChildren();
    for (const auto& Entry : ListedContacts)
    {
        Choices->AddSlot().AutoHeight()[
            SNew(SButton).Text(Entry.Value.IsEmpty() ? FText::FromString(TEXT("Unidentified contact"))
                    : FText::FromString(Entry.Value))
            .OnClicked_Lambda([this, Id = Entry.Key]
            {
                if (bChoosingContact && Steering.CanControl()) OpenOffers(Id);
                return Done();
            })];
    }
    if (ListedContacts.IsEmpty())
        Choices->AddSlot().AutoHeight()[SNew(STextBlock).Text(FText::FromString(TEXT("Nothing in view.")))];
}

void AOpenLegendPlayer::BrowseActions()
{
    const auto* Owner = Session();
    const auto View = Owner ? Owner->GetView() : nullptr;
    if (!View || !Steering.CanControl()) return;
    ClearSelection(true);
    ReleaseInput();
    FreePointer();
    CatalogueKey = ReadCatalogueKey(View);
    auto Context = MakeShared<FJsonObject>();
    Context->SetBoolField(TEXT("catalogue"), true);
    RequestOffers(MoveTemp(Context));
}

AOpenLegendPlayer::FCatalogueKey AOpenLegendPlayer::ReadCatalogueKey(const FObject& View)
{
    const auto Player = Object(View, TEXT("player"));
    return {
        NumberOr(Player, TEXT("life"), -1),
        NumberOr(Player, TEXT("knowledgeRevision"), -1),
        NumberOr(Player, TEXT("inventoryRevision"), -1),
        Bool(Object(View, TEXT("clock")), TEXT("paused"))
    };
}

bool AOpenLegendPlayer::CatalogueIsCurrent(const FObject& View)
{
    if (!CatalogueKey || !View || !Steering.CanControl() || *CatalogueKey != ReadCatalogueKey(View))
        return false;
    const auto Rows = View->TryGetField(TEXT("entities"));
    if (Rows && Rows == CatalogueEntityRows.Pin()) return true;
    // Only the contacts named by these offers need checking. A stream update
    // that shares the same entity rows needs no contact walk or menu request.
    for (const auto& Contact : CatalogueContacts)
    {
        const auto Body = Scene ? Scene->CurrentContact(Contact.Key) : nullptr;
        if (!Body || !Contact.Value.Equals(String(Body, TEXT("contextActionRevision")), ESearchCase::CaseSensitive))
            return false;
    }
    CatalogueEntityRows = Rows;
    return true;
}

bool AOpenLegendPlayer::OffersAreCurrent(uint64 Generation)
{
    auto* Owner = Session();
    return Owner && Steering.CanControl() && Generation == SelectionGeneration
        && (CatalogueKey.IsSet() ? CatalogueIsCurrent(Owner->GetView()) : SelectionIsCurrent(Generation));
}

void AOpenLegendPlayer::OpenOffers(const FString& Contact)
{
    const auto TargetBody = Scene ? Scene->CurrentContact(Contact) : nullptr;
    if (!Session() || !TargetBody) return;
    const FString Draft = Composer && DraftTarget.Equals(Contact, ESearchCase::CaseSensitive)
        ? Composer->GetText().ToString() : FString();
    ClearSelection(true);
    if (Composer && !Draft.IsEmpty())
    {
        DraftTarget = Contact;
        Composer->SetText(FText::FromString(Draft));
    }
    Target = Contact;
    TargetName = String(TargetBody, TEXT("name"));
    TargetRevision = String(TargetBody, TEXT("contextActionRevision"));
    auto Context = MakeShared<FJsonObject>();
    Context->SetStringField(TEXT("targetId"), Contact);
    RequestOffers(MoveTemp(Context));
}

void AOpenLegendPlayer::RequestOffers(TSharedPtr<FJsonObject> Context)
{
    auto* Owner = Session();
    if (!Owner || !Choices) return;
    const uint64 Selection = SelectionGeneration;
    ShowOfferMessage(TEXT("Opening actions…"));
    const bool bSent = Owner->Send(TEXT("/api/actions"), MoveTemp(Context),
        [Weak = TWeakObjectPtr(this), Selection](int32 Status, FObject Result)
    {
        auto* Self = Weak.Get();
        if (!Self || !Self->Choices || !Self->OffersAreCurrent(Selection)) return;
        if (Status != 200 || !Bool(Result, TEXT("ok")))
        {
            const FString Reason = String(Result, TEXT("message"));
            Self->ShowOfferMessage(Reason.IsEmpty() ? TEXT("Could not open actions. Open them again.") : Reason);
            return;
        }
        Self->Choices->ClearChildren();
        const bool bCatalogue = Self->CatalogueKey.IsSet();
        const auto View = Self->Session()->GetView();
        const FString PlayerId = String(Object(View, TEXT("player")), TEXT("id"));
        for (const auto& Value : Array(Object(Result, TEXT("catalogue")), TEXT("actions")))
        {
            const auto Choice = Record(Value);
            const bool bEnabled = Bool(Choice, TEXT("enabled"));
            const FString Label = String(Choice, TEXT("label"));
            const auto Intent = Object(Choice, TEXT("intent"));
            const FString Kind = String(Intent, TEXT("kind"));
            const auto Command = Kind == TEXT("command") ? Object(Intent, TEXT("command")) : nullptr;
            const FString Contact = String(Intent, TEXT("npcId"));
            const bool bConversation = !bCatalogue && Kind == TEXT("compose")
                && String(Intent, TEXT("mode")) == TEXT("chat")
                && Contact.Equals(Self->Target, ESearchCase::CaseSensitive);
            if (Label.IsEmpty() || (!Command && !bConversation && Kind != TEXT("unavailable"))) continue;
            if (bCatalogue)
            {
                const FString Subject = String(Choice, TEXT("targetId"));
                if (!Subject.IsEmpty() && !Subject.Equals(PlayerId, ESearchCase::CaseSensitive))
                {
                    const auto Body = Self->Scene ? Self->Scene->CurrentContact(Subject) : nullptr;
                    if (!Body) continue;
                    Self->CatalogueContacts.FindOrAdd(Subject) = String(Body, TEXT("contextActionRevision"));
                }
            }
            FString Detail = bEnabled ? FString() : String(Choice, TEXT("reason"));
            for (const auto& Fact : Array(Choice, TEXT("facts")))
            {
                if (!Fact || Fact->Type != EJson::Array) continue;
                const auto& Pair = Fact->AsArray();
                if (Pair.Num() == 2 && Pair[0]->Type == EJson::String && Pair[1]->Type == EJson::String)
                {
                    if (!Detail.IsEmpty()) Detail += TEXT("\n");
                    Detail += Pair[0]->AsString() + TEXT(" — ") + Pair[1]->AsString();
                }
            }
            Self->Choices->AddSlot().AutoHeight()[
                SNew(SVerticalBox)
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SButton).Text(FText::FromString(Label))
                    .IsEnabled_Lambda([Weak, bEnabled, bConversation, bCommand = Command.IsValid()]
                    {
                        const auto* Player = Weak.Get();
                        return Player && bEnabled && (bConversation || (bCommand && Player->CanSubmitCommand()));
                    })
                    .OnClicked_Lambda([Weak, Contact, Selection, Command, bConversation, bEnabled]
                    {
                        auto* Player = Weak.Get();
                        if (!Player || !bEnabled || !Player->OffersAreCurrent(Selection)) return Done();
                        if (bConversation) Player->OpenComposer(Contact);
                        else if (Command) Player->SubmitCommand(MakeShared<FJsonObject>(*Command));
                        return Done();
                    })]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(STextBlock).Text(FText::FromString(Detail)).AutoWrapText(true)
                    .Visibility(Detail.IsEmpty() ? EVisibility::Collapsed : EVisibility::HitTestInvisible)]
            ];
        }
        if (Self->Choices->NumSlots() == 0) Self->ShowOfferMessage(TEXT("No actions are available here."));
    });
    if (!bSent) ShowOfferMessage(TEXT("Could not open actions. Open them again."));
}

void AOpenLegendPlayer::ShowOfferMessage(const FString& Message)
{
    if (Choices)
    {
        Choices->ClearChildren();
        Choices->AddSlot().AutoHeight()[SNew(STextBlock).Text(FText::FromString(Message)).AutoWrapText(true)];
    }
}

bool AOpenLegendPlayer::CanSubmitCommand() const
{
    return Steering.CanControl() && !bSending && (!Receipt || ReceiptHandle.IsExpired());
}

bool AOpenLegendPlayer::SubmitCommand(TSharedPtr<FJsonObject> Command, const FString& CommandId)
{
    auto* Owner = Session();
    const auto View = Owner ? Owner->GetView() : nullptr;
    if (!View || !CanSubmitCommand() || ExpireReceipt()) return false;
    const FString Epoch = String(View, TEXT("commandEpoch"));
    if (Epoch.IsEmpty()) return false;
    Receipt = MakeShared<FJsonObject>();
    Receipt->SetStringField(TEXT("commandId"), CommandId.IsEmpty() ? NewId() : CommandId);
    Receipt->SetStringField(TEXT("commandEpoch"), Epoch);
    Receipt->SetObjectField(TEXT("command"), Command);
    ReceiptRoute = TEXT("/api/command/receipt");
    if (!RetainReceipt(View)) return false;
    SubmittedDraft.Reset();
    if (String(Command, TEXT("type")) == TEXT("say")) SubmittedDraft = DraftRevision;
    return SendRetainedRequest(TEXT("/api/command"), Receipt);
}

void AOpenLegendPlayer::OpenComposer(const FString& Contact)
{
    if (!Session() || !Composer || !Scene || !Scene->CurrentContact(Contact)
        || !Target.Equals(Contact, ESearchCase::CaseSensitive)) return;
    if (bUnaddressedSpeechDraft)
    {
        // A newly chosen recipient is different from the address of any
        // pending request that began before the interruption.
        bUnaddressedSpeechDraft = false;
        ++DraftRevision;
    }
    DraftTarget = Contact;
    FreePointer();
    ReleaseInput();
    FSlateApplication::Get().SetKeyboardFocus(Composer);
    ReadSpeechAvailability();
}

void AOpenLegendPlayer::SuspendSpeechDraft()
{
    if (!Composer || (DraftTarget.IsEmpty() && !bUnaddressedSpeechDraft)
        || PrivateDraftScope.IsEmpty() || SelectedTimeline.IsEmpty()) return;
    FText Text = Composer->GetText();
    if (!Text.IsEmpty())
    {
        SuspendedSpeechDraft = FSuspendedSpeechDraft{
            PrivateDraftScope, SelectedTimeline, DraftTarget, MoveTemp(Text), DraftRevision};
    }
}

void AOpenLegendPlayer::RestoreSpeechDraft()
{
    if (!SuspendedSpeechDraft) return;
    const FSuspendedSpeechDraft Draft = MoveTemp(*SuspendedSpeechDraft);
    SuspendedSpeechDraft.Reset();
    if (!Composer || !Scene || !Draft.Owner.Equals(PrivateDraftScope, ESearchCase::CaseSensitive)
        || !Draft.Timeline.Equals(SelectedTimeline, ESearchCase::CaseSensitive)) return;
    Composer->SetText(Draft.Text);
    // Restoring the same text is not a player edit. Keep the pending send
    // bound to it only if the player had not already changed that draft.
    if (SubmittedDraft && *SubmittedDraft == Draft.Revision) SubmittedDraft = DraftRevision;
    const auto Contact = Draft.Target.IsEmpty() ? nullptr : Scene->CurrentContact(Draft.Target);
    if (!Contact)
    {
        // A new control grant or sight lease can replace a public contact.
        // Keep the player's words without assuming who they apply to.
        bUnaddressedSpeechDraft = true;
        if (!Receipt) Outcome = TEXT("Choose a person to use your draft.");
        return;
    }
    DraftTarget = Draft.Target;
    Target = Draft.Target;
    TargetName = String(Contact, TEXT("name"));
    TargetRevision = String(Contact, TEXT("contextActionRevision"));
    if (Steering.CanControl()) ReadSpeechAvailability();
}

void AOpenLegendPlayer::ReadSpeechAvailability()
{
    const uint64 Selection = SelectionGeneration;
    const uint64 Draft = ++ComposerGeneration;
    bMaySpeak = false;
    bReply = false;
    const FString Route = TEXT("/api/player-interaction/availability?mode=speak&targetId=")
        + FGenericPlatformHttp::UrlEncode(DraftTarget);
    const bool bStarted = Session()->Read(Route, [Weak = TWeakObjectPtr(this), Selection, Draft](int32, FObject Result)
    {
        auto* Self = Weak.Get();
        if (!Self || !Self->SelectionIsCurrent(Selection) || Self->ComposerGeneration != Draft) return;
        Self->bMaySpeak = Bool(Result, TEXT("available"));
        Self->bReply = Bool(Result, TEXT("reply"));
        if (!Self->Receipt)
            Self->Outcome = Result ? String(Result, TEXT("reason")) : TEXT("Could not check speech. Choose Speak again.");
    });
    if (!bStarted && !Receipt) Outcome = TEXT("Could not check speech. Choose Speak again.");
}

void AOpenLegendPlayer::Say()
{
    auto* Owner = Session();
    const auto View = Owner ? Owner->GetView() : nullptr;
    if (View && bUnaddressedSpeechDraft)
    {
        Outcome = TEXT("Choose a person to use your draft.");
        return;
    }
    if (!View || !Composer || !bMaySpeak || !Scene || !Scene->CurrentContact(DraftTarget)) return;
    const FString Line = Composer->GetText().ToString();
    if (Line.IsEmpty()) return;
    if (!bReply)
    {
        auto Command = MakeShared<FJsonObject>();
        Command->SetStringField(TEXT("type"), TEXT("say"));
        Command->SetStringField(TEXT("text"), Line);
        Command->SetStringField(TEXT("targetId"), DraftTarget);
        SubmitCommand(Command);
        return;
    }
    auto Request = MakeShared<FJsonObject>();
    Request->SetStringField(TEXT("npcId"), DraftTarget);
    Request->SetStringField(TEXT("text"), Line);
    SubmitConversation(TEXT("/api/chat"), Request, true);
}

void AOpenLegendPlayer::SubmitConversation(const TCHAR* Route, TSharedPtr<FJsonObject> Request, bool bSubmitDraft)
{
    auto* Owner = Session();
    const auto View = Owner ? Owner->GetView() : nullptr;
    if (!View || bSending || !Steering.CanControl() || ExpireReceipt() || Receipt) return;
    const FString Id = NewId();
    Request->SetStringField(TEXT("requestId"), Id);
    Receipt = MakeShared<FJsonObject>();
    ReceiptRoute = TEXT("/api/chat/receipt");
    Receipt->SetStringField(TEXT("requestId"), Id);
    Receipt->SetStringField(TEXT("timeline"), String(View, TEXT("saveTimeline")));
    if (!RetainReceipt(View)) return;
    SubmittedDraft.Reset();
    if (bSubmitDraft)
    {
        SubmittedDraft = DraftRevision;
        ReplyWords = String(Request, TEXT("text"));
        FailedReplyId.Reset();
        FailedReplyMessage.Reset();
    }
    SendRetainedRequest(Route, MoveTemp(Request));
}

bool AOpenLegendPlayer::CanRetryConversation() const
{
    const auto* Owner = Session();
    const auto View = Owner ? Owner->GetView() : nullptr;
    return !FailedReplyId.IsEmpty() && Steering.CanControl() && !bSending && !Receipt
        && Bool(Object(View, TEXT("access")), TEXT("canRetryNpcReplies"));
}

void AOpenLegendPlayer::RetryConversation()
{
    if (!CanRetryConversation()) return;
    auto Request = MakeShared<FJsonObject>();
    Request->SetStringField(TEXT("originalRequestId"), FailedReplyId);
    // Only the explicit player action creates a new attempt; both sends use the same receipt route.
    SubmitConversation(TEXT("/api/chat/retry"), Request, false);
}

void AOpenLegendPlayer::ApplyReplyJobs(const FObject& View)
{
    if (PendingJob.IsEmpty() || !ReceiptOwnerMatches(View)) return;
    const auto Ai = Object(View, TEXT("ai"));
    const auto Jobs = Ai ? Ai->TryGetField(TEXT("jobs")) : nullptr;
    if (!Jobs || Jobs == ReplyJobs.Pin()) return;
    ReplyJobs = Jobs;
    // Match only our acknowledged request. If it leaves the recent list,
    // the original receipt remains available through Check result.
    for (const auto& Entry : Array(Ai, TEXT("jobs")))
    {
        const auto Job = Record(Entry);
        if (String(Job, TEXT("id")).Equals(PendingJob, ESearchCase::CaseSensitive))
        {
            FinishReply(String(Job, TEXT("status")), String(Job, TEXT("message")));
            return;
        }
    }
}

bool AOpenLegendPlayer::FinishReply(const FString& Status, const FString& Message)
{
    const bool bFailed = Status == TEXT("failed");
    if (!bFailed && Status != TEXT("completed") && Status != TEXT("cancelled") && Status != TEXT("stale"))
        return false;
    if (bFailed)
    {
        FailedReplyId = PendingJob;
        FailedReplyMessage = Message;
    }
    Outcome = Message.IsEmpty() && Status == TEXT("completed") ? TEXT("Reply completed.") : Message;
    FinishReceipt();
    return true;
}

bool AOpenLegendPlayer::RetainReceipt(const FObject& View)
{
    if (!Session()->StorePendingReceipt(ReceiptRoute, *Receipt, ReceiptHandle))
    {
        Receipt.Reset();
        Outcome = TEXT("The request could not be kept for recovery. It was not sent.");
        return false;
    }
    ReceiptOwner = String(Object(View, TEXT("access")), TEXT("commandRecoveryScope"));
    ReceiptTimeline = String(View, TEXT("saveTimeline"));
    return true;
}

bool AOpenLegendPlayer::SendRetainedRequest(const TCHAR* Route, TSharedPtr<FJsonObject> Body)
{
    auto* Owner = Session();
    bSending = Owner && Owner->Send(Route, MoveTemp(Body),
        [Weak = TWeakObjectPtr(this), Original = Receipt](int32 Status, FObject Result)
        {
            if (auto* Self = Weak.Get(); Self && Self->Receipt == Original) Self->FinishRequest(Status, Result);
        });
    if (bSending)
    {
        Outcome = TEXT("Sending request…");
        return true;
    }
    FinishReceipt();
    Outcome = TEXT("Could not send the request. Try again.");
    return false;
}

bool AOpenLegendPlayer::ReceiptOwnerMatches(const FObject& View) const
{
    return View && String(View, TEXT("saveTimeline")).Equals(ReceiptTimeline, ESearchCase::CaseSensitive)
        && String(Object(View, TEXT("access")), TEXT("commandRecoveryScope"))
            .Equals(ReceiptOwner, ESearchCase::CaseSensitive);
}

bool AOpenLegendPlayer::ExpireReceipt()
{
    if (!Receipt || !ReceiptHandle.IsExpired()) return false;
    FinishReceipt();
    Outcome = TEXT("The original result could not be confirmed. Your game may already reflect it.");
    return true;
}

void AOpenLegendPlayer::FinishReceipt()
{
    if (auto* Owner = Session()) Owner->ClearPendingReceipt(ReceiptHandle);
    ReceiptHandle = {};
    Receipt.Reset();
    bSending = false;
    PendingJob.Reset();
    if (FailedReplyId.IsEmpty()) ReplyWords.Reset();
    SubmittedDraft.Reset();
}

void AOpenLegendPlayer::FinishRequest(int32 Status, const FObject& Result)
{
    bSending = false;
    const FObject Original = ReceiptRoute == TEXT("/api/command/receipt") ? Receipt : nullptr;
    const FString Message = String(Result, TEXT("message"));
    if (Status == 0 || Status >= 500 || !Result)
    {
        Outcome = TEXT("The result is unconfirmed. Check the original request.");
        if (Attack && Original) Attack->AcceptCommandResult(Original, Status, Result);
        return;
    }
    const FString State = String(Result, TEXT("status"));
    const FString Code = String(Result, TEXT("code"));
    if (State == TEXT("unknown") || Code == TEXT("unconfirmed")
        || Code == TEXT("expired") || Code == TEXT("idempotency-conflict"))
    {
        Outcome = Message.IsEmpty() ? TEXT("The result is unconfirmed. Check the original request.") : Message;
        if (Attack && Original) Attack->AcceptCommandResult(Original, Status, Result);
        return;
    }
    const FString Job = String(Result, TEXT("jobId"));
    if (!Job.IsEmpty())
    {
        PendingJob = Job;
        FailedReplyId.Reset();
        FailedReplyMessage.Reset();
    }
    const FString JobStatus = String(Result, TEXT("jobStatus"));
    const bool bAccepted = Bool(Result, TEXT("ok")) || !JobStatus.IsEmpty();
    Outcome = Message.IsEmpty() ? (bAccepted ? TEXT("Request accepted.") : TEXT("Request refused.")) : Message;
    if (bAccepted && Composer && SubmittedDraft && *SubmittedDraft == DraftRevision)
    {
        bUnaddressedSpeechDraft = false;
        Composer->SetText(FText::GetEmpty());
        SubmittedDraft.Reset();
    }
    if (JobStatus == TEXT("queued") || JobStatus == TEXT("judging") || JobStatus == TEXT("generating"))
    {
        // The final stream update can arrive before this HTTP response.
        ReplyJobs.Reset();
        if (const auto* Owner = Session()) ApplyReplyJobs(Owner->GetView());
        return;
    }
    if (!PendingJob.IsEmpty() && FinishReply(JobStatus, Message)) return;
    FinishReceipt();
    if (Attack && Original) Attack->AcceptCommandResult(Original, Status, Result);
}

void AOpenLegendPlayer::ShowConversationReceipt()
{
    auto* Owner = Session();
    const auto View = Owner ? Owner->GetView() : nullptr;
    if (bSending || !Receipt || !ReceiptOwnerMatches(View) || ExpireReceipt()) return;
    bSending = Owner->Send(ReceiptRoute, Receipt, [Weak = TWeakObjectPtr(this), Lookup = Receipt](int32 Status, FObject Result)
    {
        auto* Self = Weak.Get();
        // The ordered stream may already have resolved this exact request.
        if (!Self || Self->Receipt != Lookup) return;
        Self->bSending = false;
        const FString State = String(Result, TEXT("status"));
        const bool bCurrent = Status == 200 && String(Result, TEXT("scope"))
            .Equals(Self->SelectionScope, ESearchCase::CaseSensitive);
        if (bCurrent && State == TEXT("resolved"))
        {
            if (const auto Original = Object(Result, TEXT("result")))
            {
                Self->FinishRequest(Status, Original);
                return;
            }
        }
        Self->Outcome = bCurrent ? String(Result, TEXT("message")) : FString();
        if (Self->Outcome.IsEmpty()) Self->Outcome = TEXT("The original result is still unconfirmed.");
        if (bCurrent && (State == TEXT("expired") || State == TEXT("unavailable"))) Self->FinishReceipt();
    });
    Outcome = bSending ? TEXT("Checking the original result…") : TEXT("Could not check the result. Try again.");
}

void AOpenLegendPlayer::CancelConversation()
{
    auto* Owner = Session();
    if (!Owner || !Owner->GetView()) return;
    if (PendingJob.IsEmpty())
    {
        Outcome = Receipt && ReceiptRoute == TEXT("/api/chat/receipt")
            ? TEXT("Check the original result before cancelling its reply.")
            : TEXT("There is no pending reply to cancel.");
        return;
    }
    auto Request = MakeShared<FJsonObject>();
    Request->SetStringField(TEXT("jobId"), PendingJob);
    const bool bStarted = Owner->Send(TEXT("/api/ai/cancel"), Request,
        [Weak = TWeakObjectPtr(this), Job = PendingJob](int32, FObject Result)
    {
        if (auto* Self = Weak.Get(); Self && Self->PendingJob.Equals(Job, ESearchCase::CaseSensitive))
        {
            Self->Outcome = String(Result, TEXT("message"));
            if (Self->Outcome.IsEmpty()) Self->Outcome = TEXT("Cancellation is unconfirmed. Check the original result.");
        }
    });
    if (!bStarted) Outcome = TEXT("Could not request cancellation. Try again.");
}

FText AOpenLegendPlayer::HudLine() const
{
    const auto* Owner = Session();
    const auto View = Owner ? Owner->GetView() : nullptr;
    if (!View) return FText::FromString(SessionStatus);
    FString Top = String(Object(View, TEXT("presentation")), TEXT("worldName"));
    if (!TargetName.IsEmpty()) Top += TEXT("  |  ") + TargetName;
    if (Bool(Object(View, TEXT("access")), TEXT("controlledElsewhere")))
        Top += TEXT("\nAnother session controls this character.");
    if (!Outcome.IsEmpty()) Top += TEXT("\n") + Outcome;
    return FText::FromString(Top);
}

void AOpenLegendPlayer::UpdateRecentSpeech(const FObject& View)
{
    const auto SharedEvents = View ? View->TryGetField(TEXT("events")) : nullptr;
    if (SharedEvents && SpeechEvents.Pin() == SharedEvents) return;
    SpeechEvents = SharedEvents;
    LatestSpeech = FText::GetEmpty();
    const auto& Events = Array(View, TEXT("events"));
    for (int Index = Events.Num() - 1; Index >= 0; --Index)
    {
        const auto Event = Record(Events[Index]);
        const auto Speech = Object(Event, TEXT("speech"));
        const FString Perception = String(Speech, TEXT("perception"));
        if (Perception != TEXT("heard") && Perception != TEXT("self")) continue;
        bool bDisplay = true;
        const auto Presentation = Object(Event, TEXT("presentation"));
        if (Presentation && Presentation->TryGetBoolField(TEXT("displayToPlayer"), bDisplay) && !bDisplay)
            continue;
        const FString Line = String(Object(Event, TEXT("speechPresentation")), TEXT("personalText"));
        if (Line.IsEmpty()) continue;
        LatestSpeech = FText::FromString(Line);
        return;
    }
}

void AOpenLegendPlayer::TogglePause()
{
    auto* Owner = Session();
    const auto View = Owner ? Owner->GetView() : nullptr;
    if (!View || !Steering.CanControl()) return;
    auto Request = MakeShared<FJsonObject>();
    Request->SetBoolField(TEXT("paused"), !Bool(Object(View, TEXT("clock")), TEXT("paused")));
    ReleaseInput();
    Owner->Send(TEXT("/api/control"), Request, [Weak = TWeakObjectPtr(this)](int32, FObject Result)
    {
        if (auto* Self = Weak.Get()) Self->Outcome = String(Result, TEXT("message"));
    });
}

void AOpenLegendPlayer::BuildHud()
{
    auto Button = [](const TCHAR* Name, FOnClicked Click)
    {
        return SNew(SButton).Text(FText::FromString(Name)).OnClicked(Click);
    };

    const auto Weak = TWeakObjectPtr(this);
    const auto CanSubmit = [Weak]
    {
        const auto* Player = Weak.Get();
        return Player && Player->CanSubmitCommand();
    };
    const auto Submit = [Weak](TSharedPtr<FJsonObject> Command)
    {
        if (auto* Player = Weak.Get()) Player->SubmitCommand(MoveTemp(Command));
    };
    const auto Inspect = [Weak]
    {
        if (auto* Player = Weak.Get())
        {
            Player->ReleaseInput();
            Player->FreePointer();
        }
    };
    auto* Owner = Session();
    ReadingPanel = Owner ? MakeOpenLegendReading(*Owner, CanSubmit, Submit) : SNullWidget::NullWidget;
    const auto SelectedContact = [Weak]
    {
        const auto* Player = Weak.Get();
        return Player && Player->Scene && Player->Steering.CanControl()
            ? Player->Scene->CurrentContact(Player->Target) : nullptr;
    };
    TradePanel = Owner ? MakeOpenLegendTrade(*Owner, {SelectedContact, CanSubmit, Submit, Inspect})
        : SNullWidget::NullWidget;
    NicknamePanel = Owner ? MakeOpenLegendNickname(*Owner, SelectedContact, Inspect)
        : SNullWidget::NullWidget;
    NotesPanel = Owner ? MakeOpenLegendNotes(*Owner, Inspect) : SNullWidget::NullWidget;
    PlacesPanel = Owner ? MakeOpenLegendPlaces(*Owner, Inspect, CanSubmit, Submit) : SNullWidget::NullWidget;
    Attack = MakeShared<FOpenLegendAttack>(
        [Weak](TSharedPtr<FJsonObject> Command, const FString& Id)
        {
            auto* Player = Weak.Get();
            return Player && Player->SubmitCommand(MoveTemp(Command), Id);
        },
        CanSubmit,
        [Weak]
        {
            if (auto* Player = Weak.Get())
            {
                Player->CancelPick();
                Player->bAttackPointerHeld = false;
                Player->ReleaseSteering();
                Player->FreePointer();
            }
        });
    AttackRenewed = [WeakAttack = TWeakPtr<FOpenLegendAttack>(Attack)](const FObject& Sent, const FObject& Result)
    {
        if (const auto Owner = WeakAttack.Pin()) Owner->AcceptRenewal(Sent, Result);
    };
    const auto AttackPanel = MakeOpenLegendAttackPanel(Attack.ToSharedRef(), [Weak]
    {
        const auto* Player = Weak.Get();
        return Player ? Player->SampleAttackAim() : TOptional<FOpenLegendAim>{};
    });
    const auto ReadableHud =
        SNew(SVerticalBox)
        + SVerticalBox::Slot().AutoHeight()[
            SNew(STextBlock).Text(TAttribute<FText>::Create(TAttribute<FText>::FGetter::CreateUObject(this, &AOpenLegendPlayer::HudLine))).AutoWrapText(true)]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot().AutoWidth()[Button(TEXT("Sign in"), FOnClicked::CreateWeakLambda(this, [this]
            { if (Session()) Session()->SignIn(); return Done(); }))]
            + SHorizontalBox::Slot().AutoWidth()[Button(TEXT("Take control"), FOnClicked::CreateWeakLambda(this, [this]
            { if (Session()) Session()->AcquireControl(true); return Done(); }))]
            + SHorizontalBox::Slot().AutoWidth()[Button(TEXT("Play / Pause"), FOnClicked::CreateWeakLambda(this, [this]
            { TogglePause(); return Done(); }))]
            + SHorizontalBox::Slot().AutoWidth()[Button(TEXT("Sign out"), FOnClicked::CreateWeakLambda(this, [this]
            { FinishReceipt(); if (Session()) Session()->SignOut(); return Done(); }))]
        ]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot().AutoWidth()[Button(TEXT("Follow"), FOnClicked::CreateWeakLambda(this, [this]
            { SelectCamera(ECamera::Follow); return Done(); }))]
            + SHorizontalBox::Slot().AutoWidth()[Button(TEXT("Elevated"), FOnClicked::CreateWeakLambda(this, [this]
            { SelectCamera(ECamera::Elevated); return Done(); }))]
            + SHorizontalBox::Slot().AutoWidth()[Button(TEXT("Shoulder"), FOnClicked::CreateWeakLambda(this, [this]
            { SelectCamera(ECamera::Shoulder); return Done(); }))]
            + SHorizontalBox::Slot().AutoWidth()[Button(TEXT("Sight"), FOnClicked::CreateWeakLambda(this, [this]
            { bShowSight = !bShowSight; if (Scene) Scene->SetSightGuide(bShowSight); return Done(); }))]
            + SHorizontalBox::Slot().AutoWidth()[
                SAssignNew(CameraBinding, SInputKeySelector)
                .SelectedKey(FInputChord(CameraCycleKey))
                .AllowModifierKeys(false)
                .OnIsSelectingKeyChanged_Lambda([this]
                {
                    if (CameraBinding->GetIsSelectingKey()) ReleaseInput();
                })
                .OnKeySelected(SInputKeySelector::FOnKeySelected::CreateUObject(this, &AOpenLegendPlayer::SetCameraBinding))]
        ]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(SButton).Text(FText::FromString(TEXT("Resume mouse look")))
            .Visibility_Lambda([this]
            {
                return bCanCaptureMouse && !bMouseLook && ViewAngle != ECamera::Elevated
                    ? EVisibility::Visible : EVisibility::Collapsed;
            })
            .OnClicked_Lambda([this]
            {
                bMouseLook = true;
                ApplyInputMode();
                return Done();
            })]
        + SVerticalBox::Slot().AutoHeight()[ReadingPanel.ToSharedRef()]
        + SVerticalBox::Slot().AutoHeight()[NotesPanel.ToSharedRef()]
        + SVerticalBox::Slot().AutoHeight()[PlacesPanel.ToSharedRef()]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot().AutoWidth()[
                SNew(SButton).Text(FText::FromString(TEXT("In view")))
                .IsEnabled_Lambda([this] { return Steering.CanControl(); })
                .OnClicked_Lambda([this] { BrowseContacts(); return Done(); })]
            + SHorizontalBox::Slot().AutoWidth()[
                SNew(SButton).Text(FText::FromString(TEXT("Actions")))
                .IsEnabled_Lambda([this] { return Steering.CanControl(); })
                .OnClicked_Lambda([this] { BrowseActions(); return Done(); })]
            + SHorizontalBox::Slot().AutoWidth()[
                SNew(SButton).Text(FText::FromString(TEXT("Close")))
                .Visibility_Lambda([this] {
                    return Choices && Choices->NumSlots() != 0 ? EVisibility::Visible : EVisibility::Collapsed;
                })
                .OnClicked_Lambda([this] { ClearSelection(); return Done(); })]]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(SBox).MaxDesiredHeight(190)[SNew(SScrollBox)
            + SScrollBox::Slot()[SAssignNew(Choices, SVerticalBox)]]]
        + SVerticalBox::Slot().AutoHeight()[NicknamePanel.ToSharedRef()]
        + SVerticalBox::Slot().AutoHeight()[TradePanel.ToSharedRef()]
        + SVerticalBox::Slot().AutoHeight()[AttackPanel]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(STextBlock).Text(FText::FromString(TEXT("Recent speech")))]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(STextBlock).Text(TAttribute<FText>::Create(TAttribute<FText>::FGetter::CreateUObject(this, &AOpenLegendPlayer::HeardSpeech))).AutoWrapText(true)]
        + SVerticalBox::Slot().AutoHeight()[
            SAssignNew(Composer, SEditableTextBox)
            .IsEnabled_Lambda([this] { return !DraftTarget.IsEmpty() || bUnaddressedSpeechDraft; })
            .OnTextChanged_Lambda([this](const FText&) { ++DraftRevision; })
            .ClearKeyboardFocusOnCommit(false)
            .OnTextCommitted_Lambda([this](const FText&, ETextCommit::Type Reason)
            {
                if (Reason != ETextCommit::OnEnter) return;
                Say();
                // Slate normally drops focus on Enter. Keep recovery in the keyboard path.
                if (Receipt && CheckResult) FSlateApplication::Get().SetKeyboardFocus(CheckResult);
            })]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot().AutoWidth()[Button(TEXT("Speak"), FOnClicked::CreateWeakLambda(this, [this]
            { Say(); return Done(); }))]
            + SHorizontalBox::Slot().AutoWidth()[
                SAssignNew(CheckResult, SButton).Text(FText::FromString(TEXT("Check result")))
                .OnClicked_Lambda([this] { ShowConversationReceipt(); return Done(); })]
            + SHorizontalBox::Slot().AutoWidth()[Button(TEXT("Cancel reply"), FOnClicked::CreateWeakLambda(this, [this]
            { CancelConversation(); return Done(); }))]
        ]
        + SVerticalBox::Slot().AutoHeight()[
            SNew(SVerticalBox)
            .Visibility_Lambda([this] { return CanRetryConversation() ? EVisibility::Visible : EVisibility::Collapsed; })
            + SVerticalBox::Slot().AutoHeight()[
                SNew(STextBlock).AutoWrapText(true).Text_Lambda([this]
                {
                    return FText::FromString(ReplyWords.IsEmpty()
                        ? FailedReplyMessage : FailedReplyMessage + TEXT("\n") + ReplyWords);
                })]
            + SVerticalBox::Slot().AutoHeight()[
                SNew(SButton).Text(FText::FromString(TEXT("Retry reply")))
                .OnClicked_Lambda([this] { RetryConversation(); return Done(); })]
        ];

    Hud = SNew(SOverlay).Visibility(EVisibility::SelfHitTestInvisible)
        + SOverlay::Slot().HAlign(HAlign_Left).VAlign(VAlign_Top)[
            SNew(SBox).WidthOverride(380)[SNew(SBorder).Padding(8)[ReadableHud]]]
        + SOverlay::Slot().HAlign(HAlign_Center).VAlign(VAlign_Center)[
            SNew(STextBlock).Text(FText::FromString(TEXT("+")))
            .Visibility_Lambda([this]
            {
                return IsMouseLooking() && ViewAngle == ECamera::Shoulder && Steering.HasPose()
                    ? EVisibility::HitTestInvisible : EVisibility::Collapsed;
            })];
    if (auto* Viewport = GetWorld()->GetGameViewport())
        Viewport->AddViewportWidgetContent(Hud.ToSharedRef());
}
