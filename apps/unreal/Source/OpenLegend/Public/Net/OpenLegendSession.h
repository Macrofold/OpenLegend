#pragma once

#include "Containers/Ticker.h"
#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "OpenLegendSession.generated.h"

class FJsonObject;
class FOpenLegendDesktopLogin;
class FOpenLegendHttp;
struct FOpenLegendHttpCall;
class FOpenLegendEventReader;

/** The exact pending record owned by the local credential vault. */
struct FOpenLegendReceiptHandle
{
    bool IsExpired() const;

private:
    friend class UOpenLegendSession;
    FString Key;
    FString Encoded;
    int64 CreatedAt = 0;
};

DECLARE_MULTICAST_DELEGATE(FOpenLegendViewChanged);
DECLARE_MULTICAST_DELEGATE_OneParam(FOpenLegendStatusChanged, const FText&);

/** Owns the authenticated connection independently of a level or widget. All public calls run on the game thread. */
UCLASS()
class OPENLEGEND_API UOpenLegendSession final : public UGameInstanceSubsystem
{
    GENERATED_BODY()

public:
    UOpenLegendSession();
    UOpenLegendSession(FVTableHelper& Helper);
    ~UOpenLegendSession() override;
    void Initialize(FSubsystemCollectionBase& Collection) override;
    void Deinitialize() override;

    using FReply = TFunction<void(int32, TSharedPtr<const FJsonObject>)>;

    bool Connect(const FString& ConfiguredOrigin, const FString& ExpectedWorld = FString());
    bool SignIn(const FString& Invitation = FString());
    void SignOut();
    void Disconnect();
    void AcquireControl(bool bReplace);
    void SetPresent(bool bPresent);
    TSharedPtr<const FJsonObject> GetView() const { return View; }
    const FText& GetStatus() const { return Status; }
    // A draft can be set aside until another view confirms its private owner.
    bool IsViewTemporarilyUnavailable() const { return bViewTemporarilyUnavailable; }

    // Delivery failure after dispatch has status 0, which leaves the remote outcome unknown.
    // Before sending a consequential operation, retain its original recovery identity in its owner.
    bool Send(const FString& Route, TSharedPtr<FJsonObject> Body, FReply Completion = {});
    bool Read(const FString& Route, FReply Completion);

    // Commit the viewing owner's one pending record to the local vault before dispatch.
    bool StorePendingReceipt(const FString& ReceiptRoute, const FJsonObject& Body, FOpenLegendReceiptHandle& Handle);
    // Load the current viewing owner's unexpired vault record to recover it.
    bool LoadPendingReceipt(FString& ReceiptRoute, TSharedPtr<FJsonObject>& Body, FOpenLegendReceiptHandle& Handle);
    // Remove only the exact record, even after the view has changed or disconnected.
    void ClearPendingReceipt(const FOpenLegendReceiptHandle& Handle);

    FOpenLegendViewChanged OnViewChanged;
    FOpenLegendStatusChanged OnStatusChanged;

private:
    struct FRequest;
    struct FResult;
    enum class EStreamEvent { Accepted, Invalid, AccessChanged };
    using FCompletion = TFunction<void(FResult&&)>;

    bool Request(const FString& Route, const TSharedPtr<FJsonObject>& Body, double Timeout,
                 bool bAuthenticated, bool bScoped, FCompletion Completion);
    bool Tick(float Delta);
    void ResetConnection();
    void CancelScopedRequests();
    void ShowStatus(const FText& Text);
    bool Bootstrap();
    void RetryBootstrap();
    void Enter();
    void ReadState();
    void Refresh();
    void OpenEvents(const FJsonObject& InitialState);
    void PumpEvents();
    void EndEvents(int32 Code, bool bIncompatible = false);
    void Publish(TSharedPtr<const FJsonObject> Next, bool bTemporaryLoss = false);
    EStreamEvent StageEvent(const FString& Event, const TArray<uint8>& Text, bool bClosed,
                           TSharedPtr<const FJsonObject>& Current) const;
    void Presence();
    FString CurrentScope() const;

    TUniquePtr<FOpenLegendHttp> Transport;
    TUniquePtr<FOpenLegendDesktopLogin> Login;
    TUniquePtr<FOpenLegendEventReader> EventReader;
    TArray<TUniquePtr<FRequest>> Requests;
    TSharedPtr<FOpenLegendHttpCall, ESPMode::ThreadSafe> Stream;
    TSharedPtr<const FJsonObject> View;
    FTSTicker::FDelegateHandle TickHandle;
    FText Status;
    FString Origin;
    FString ExpectedWorldId;
    FString ConnectionId;
    FString Cookie;
    FString AccountId;
    FString StreamScope;
    uint64 Generation = 0;
    uint64 ScopeGeneration = 0;
    uint64 PresenceSequence = 0;
    double ReconnectAt = 0;
    double EventDeadline = 0;
    double NextPresenceAt = 0;
    double EntryDeadline = 0;
    bool bProtocolReady = false;
    bool bPresent = false;
    bool bViewTemporarilyUnavailable = false;
    bool bPresencePending = false;
    bool bControlPending = false;
    bool bTriedControl = false;
    bool bReconnect = false;
    bool bSigningIn = false;
};
