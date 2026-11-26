#include "Net/OpenLegendSession.h"

#include "Net/OpenLegendDesktopLogin.h"
#include "Net/OpenLegendHttp.h"
#include "Net/OpenLegendWire.h"
#include "Dom/JsonObject.h"
#include "HAL/PlatformTime.h"
#include "Misc/Guid.h"
#include "Misc/DateTime.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

#define LOCTEXT_NAMESPACE "OpenLegendSession"

namespace
{
constexpr double EntryTimeout = 15;
constexpr double RequestTimeout = 30;
constexpr double EventStall = 45;
constexpr double RetryDelay = 6;
constexpr double PresenceInterval = 5;
constexpr int32 ReadSlots = 16;
constexpr int32 WriteSlots = 8;
// Temporary desktop receive-buffer ceiling pending device qualification. This counts
// bytes waiting on this client and is not a limit on resident world state or stream lifetime.
constexpr int32 WorldBuffer = 32 * 1024 * 1024;
constexpr int32 RouteBuffer = 2 * 1024 * 1024;
constexpr int32 BootstrapBuffer = 4096;

double Now()
{
    return FPlatformTime::Seconds();
}

bool IsAccessFailure(int32 Status)
{
    return Status == 401 || Status == 403;
}

bool HasMediaType(const FString& Type, const TCHAR* Expected)
{
    const int32 Length = FCString::Strlen(Expected);
    return Type.StartsWith(Expected, ESearchCase::IgnoreCase) &&
        (Type.Len() == Length || Type[Length] == TEXT(';'));
}

bool ValidOrigin(const FString& Origin)
{
    bool bHttps = Origin.StartsWith(TEXT("https://"), ESearchCase::CaseSensitive);
    FString Host = Origin.Mid(bHttps ? 8 : 7);
#if !UE_BUILD_SHIPPING
    bool bLoopback = Origin.StartsWith(TEXT("http://127.0.0.1:"), ESearchCase::CaseSensitive);
#else
    bool bLoopback = false;
#endif
    if ((!bHttps && !bLoopback) || Host.IsEmpty() || Host.Len() > 255)
    {
        return false;
    }
    for (TCHAR Unit : Host)
    {
        const bool bAsciiAlphanumeric = (Unit >= 'a' && Unit <= 'z') ||
            (Unit >= 'A' && Unit <= 'Z') || (Unit >= '0' && Unit <= '9');
        if (!bAsciiAlphanumeric && Unit != '.' && Unit != '-' && Unit != ':')
        {
            return false;
        }
    }
    return true;
}

const FJsonObject* Child(const FJsonObject& Parent, const TCHAR* Key)
{
    const TSharedPtr<FJsonObject>* Field = nullptr;
    return Parent.TryGetObjectField(Key, Field) ? Field->Get() : nullptr;
}

FString Field(const FJsonObject& Object, const TCHAR* Key)
{
    FString Text;
    Object.TryGetStringField(Key, Text);
    return Text;
}

TSharedPtr<const FJsonObject> JsonResponse(const FOpenLegendHttpCall::FDelivery& Received)
{
    return HasMediaType(Received.Type, TEXT("application/json")) ? OpenLegendWire::ReadObject(Received.Bytes) : nullptr;
}

bool IsStaleScope(const FOpenLegendHttpCall::FDelivery& Received)
{
    if (Received.Status != 403 && Received.Status != 409)
    {
        return false;
    }
    const auto Json = JsonResponse(Received);
    return Json && Field(*Json, TEXT("code")).Equals(TEXT("stale-scope"), ESearchCase::CaseSensitive);
}

bool Bool(const FJsonObject& Object, const TCHAR* Key)
{
    bool bValue = false;
    return Object.TryGetBoolField(Key, bValue) && bValue;
}

bool ReceiptRouteIsKnown(const FString& Route)
{
    return Route.Equals(TEXT("/api/command/receipt"), ESearchCase::CaseSensitive) ||
        Route.Equals(TEXT("/api/chat/receipt"), ESearchCase::CaseSensitive);
}

FString RecoveryKey(const FString& Origin, const TSharedPtr<const FJsonObject>& View)
{
    const auto* Access = View ? Child(*View, TEXT("access")) : nullptr;
    const FString Owner = Access ? Field(*Access, TEXT("commandRecoveryScope")) : FString();
    return OpenLegendWire::IsSessionCookie(Owner) ? TEXT("receipt ") + Origin + TEXT(" ") + Owner : FString();
}

bool ValidView(const FJsonObject& Object, const FString& Account, const FString& ExpectedWorld)
{
    uint64 Schema;
    uint64 Revision;
    double Cut;
    const auto* Access = Child(Object, TEXT("access"));
    const TArray<TSharedPtr<FJsonValue>>* Rows = nullptr;
    const FString World = Field(Object, TEXT("worldId"));
    return OpenLegendWire::ReadRevision(Object, TEXT("schemaVersion"), Schema) && Schema == 3 &&
        OpenLegendWire::ReadRevision(Object, TEXT("revision"), Revision) &&
        Object.TryGetNumberField(TEXT("evaluationCut"), Cut) && FMath::IsFinite(Cut) &&
        !World.IsEmpty() && (ExpectedWorld.IsEmpty() || World.Equals(ExpectedWorld, ESearchCase::CaseSensitive)) &&
        !Field(Object, TEXT("saveTimeline")).IsEmpty() &&
        Child(Object, TEXT("player")) && Child(Object, TEXT("clock")) &&
        Object.TryGetArrayField(TEXT("entities"), Rows) && Object.TryGetArrayField(TEXT("events"), Rows) &&
        Access && Field(*Access, TEXT("accountId")).Equals(Account, ESearchCase::CaseSensitive) &&
        !Field(*Access, TEXT("scope")).IsEmpty();
}
}

bool FOpenLegendReceiptHandle::IsExpired() const
{
    constexpr int64 RetryWindow = 24 * 60 * 60;
    const int64 Now = FDateTime::UtcNow().ToUnixTimestamp();
    return CreatedAt <= 0 || CreatedAt > Now || Now - CreatedAt >= RetryWindow;
}

struct UOpenLegendSession::FResult
{
    int32 Code = 0;
    TSharedPtr<const FJsonObject> Json;
    FString Cookie;
};

struct UOpenLegendSession::FRequest
{
    TSharedPtr<FOpenLegendHttpCall, ESPMode::ThreadSafe> Call;
    FCompletion Done;
    uint64 ConnectionGeneration = 0;
    uint64 ViewGeneration = 0;
    bool bExpiresWithScope = false;
    bool bWrite = false;
};

UOpenLegendSession::UOpenLegendSession() = default;
// Keep the generated vtable helper out of line where the transport types are complete.
UOpenLegendSession::UOpenLegendSession(FVTableHelper& Helper) : Super(Helper) {}
UOpenLegendSession::~UOpenLegendSession() = default;

void UOpenLegendSession::Initialize(FSubsystemCollectionBase& Collection)
{
    Super::Initialize(Collection);
    Transport = MakeUnique<FOpenLegendHttp>();
    TickHandle = FTSTicker::GetCoreTicker().AddTicker(FTickerDelegate::CreateUObject(this, &UOpenLegendSession::Tick));
}

void UOpenLegendSession::Deinitialize()
{
    FTSTicker::GetCoreTicker().RemoveTicker(TickHandle);
    ResetConnection();
    Transport.Reset();
    Requests.Reset();
    Stream.Reset();
    Super::Deinitialize();
}

void UOpenLegendSession::ShowStatus(const FText& Text)
{
    Status = Text;
    OnStatusChanged.Broadcast(Status);
}

bool UOpenLegendSession::Connect(const FString& ConfiguredOrigin, const FString& ExpectedWorld)
{
    FString Selected = ConfiguredOrigin;
    Selected.RemoveFromEnd(TEXT("/"));
    if (!ValidOrigin(Selected))
    {
        ShowStatus(LOCTEXT("InvalidHost", "This game build has an invalid server address."));
        return false;
    }
    if (!Transport || !Transport->IsReady())
    {
        ShowStatus(LOCTEXT("TransportUnavailable", "Could not start the connection. Restart the game to try again."));
        return false;
    }
    ResetConnection();
    Origin = MoveTemp(Selected);
    ExpectedWorldId = ExpectedWorld;
    ConnectionId = FGuid::NewGuid().ToString(EGuidFormats::Digits);
    bProtocolReady = false;
    Cookie.Reset();
    ShowStatus(LOCTEXT("Connecting", "Connecting…"));
    return Bootstrap();
}

bool UOpenLegendSession::Bootstrap()
{
    const bool bStarted = Request(TEXT("/api/desktop/bootstrap"), nullptr, EntryTimeout, false, false, [this](FResult&& Result)
    {
        if (Result.Code == 0 || Result.Code >= 500)
        {
            RetryBootstrap();
            return;
        }
        if (Result.Code != 200 || !Result.Json ||
            !Field(*Result.Json, TEXT("protocol")).Equals(TEXT("openlegend-desktop-1"), ESearchCase::CaseSensitive))
        {
            ShowStatus(LOCTEXT("UpdateRequired", "This server needs a different game build."));
            return;
        }
        bProtocolReady = true;
        // Loopback development uses the existing explicit development sign-in route.
        if (Origin.StartsWith(TEXT("https://")))
        {
            Cookie = OpenLegendCredentials::Load(Origin);
        }
        Enter();
    });
    if (!bStarted)
    {
        RetryBootstrap();
    }
    return bStarted;
}

void UOpenLegendSession::RetryBootstrap()
{
    ReconnectAt = Now() + RetryDelay;
    bReconnect = true;
    ShowStatus(LOCTEXT("WaitingForServer", "Waiting for the game server…"));
}

bool UOpenLegendSession::SignIn(const FString& Invitation)
{
    if (!bProtocolReady || bSigningIn || View || !Cookie.IsEmpty())
    {
        return false;
    }
    // A sign-out can still finish on the server. Its delayed status no longer
    // belongs to this newer sign-in attempt.
    ++Generation;
#if !UE_BUILD_SHIPPING
    if (Origin.StartsWith(TEXT("http://127.0.0.1:")))
    {
        bSigningIn = Request(TEXT("/auth/login"), nullptr, EntryTimeout, false, false, [this](FResult&& Result)
        {
            bSigningIn = false;
            if (Result.Code == 303 && OpenLegendWire::IsSessionCookie(Result.Cookie))
            {
                Cookie = MoveTemp(Result.Cookie);
                Enter();
            }
            else
            {
                ShowStatus(LOCTEXT("LocalUnavailable", "The development sign-in could not finish."));
            }
        });
        return bSigningIn;
    }
#endif
    Login = MakeUnique<FOpenLegendDesktopLogin>();
    if (!Login->Start(Origin, Invitation))
    {
        Login.Reset();
        ShowStatus(LOCTEXT("SignInUnavailable", "Unable to open sign-in."));
        return false;
    }
    bSigningIn = true;
    ShowStatus(LOCTEXT("SignInBrowser", "Continue sign-in in your browser."));
    return true;
}

void UOpenLegendSession::SignOut()
{
    // A signed-out client can still be waiting for the server's bootstrap.
    if (!bProtocolReady) return;
    const FString Key = RecoveryKey(Origin, View);
    if (!Key.IsEmpty())
    {
        OpenLegendCredentials::RemovePending(Key, OpenLegendCredentials::LoadPending(Key));
    }
    ResetConnection();
    OpenLegendCredentials::RemoveOwned(Origin, Cookie);
    bool bDispatched = false;
    if (!Cookie.IsEmpty())
    {
        bDispatched = Request(TEXT("/api/session/logout"), MakeShared<FJsonObject>(), EntryTimeout, true,
            false, [this](FResult&& Result)
            {
                ShowStatus(Result.Code >= 200 && Result.Code < 300 ?
                    LOCTEXT("SignedOut", "Signed out.") :
                    LOCTEXT("LocalSignOutUnconfirmed", "Signed out here. Server sign-out is unconfirmed."));
            });
    }
    const bool bHadSession = !Cookie.IsEmpty();
    Cookie.Reset();
    if (!bDispatched)
    {
        ShowStatus(bHadSession ? LOCTEXT("LocalSignOut", "Signed out here. Server sign-out is unconfirmed.") :
            LOCTEXT("NoSession", "Signed out."));
    }
}

void UOpenLegendSession::Disconnect()
{
    ResetConnection();
    Cookie.Reset();
    bProtocolReady = false;
    ShowStatus(LOCTEXT("Disconnected", "Disconnected."));
}

void UOpenLegendSession::ResetConnection()
{
    ++Generation;
    bSigningIn = false;
    bReconnect = false;
    bControlPending = false;
    bTriedControl = false;
    bPresencePending = false;
    NextPresenceAt = 0;
    EntryDeadline = 0;
    ReconnectAt = 0;
    PresenceSequence = 0;
    AccountId.Reset();
    StreamScope.Reset();
    Login.Reset();
    for (const auto& RequestEntry : Requests)
    {
        RequestEntry->Call->Cancel();
    }
    if (Stream)
    {
        Stream->Cancel();
    }
    if (Transport)
    {
        Transport->Wake();
    }
    EventReader.Reset();
    Publish(nullptr);
}

bool UOpenLegendSession::Request(const FString& Route, const TSharedPtr<FJsonObject>& Body, double Timeout,
    bool bAuthenticated, bool bScoped, FCompletion Completion)
{
    if (!Transport || !Transport->IsReady() || Origin.IsEmpty() ||
        !(Route.StartsWith(TEXT("/api/"), ESearchCase::CaseSensitive) || Route == TEXT("/auth/login")) ||
        Route.Contains(TEXT("\r")) || Route.Contains(TEXT("\n")) || Route.Contains(TEXT("\\")) ||
        Route.Contains(TEXT("#")) || Route.Contains(TEXT("..")) ||
        (bAuthenticated && !OpenLegendWire::IsSessionCookie(Cookie)))
    {
        return false;
    }
    FString RequestScope = bScoped ? CurrentScope() : FString();
    if (bScoped && RequestScope.IsEmpty())
    {
        return false;
    }
    const bool bWrite = Body.IsValid();
    int32 Used = 0;
    for (const auto& Entry : Requests)
    {
        Used += Entry->bWrite == bWrite;
    }
    if (Used >= (bWrite ? WriteSlots : ReadSlots))
    {
        return false;
    }
    auto Entry = MakeUnique<FRequest>();
    const int32 Limit = Route == TEXT("/api/state") ? WorldBuffer :
        Route == TEXT("/api/desktop/bootstrap") ? BootstrapBuffer : RouteBuffer;
    Entry->Call = MakeShared<FOpenLegendHttpCall, ESPMode::ThreadSafe>(
        Origin + Route, Origin, ConnectionId, bAuthenticated ? Cookie : FString(), MoveTemp(RequestScope),
        Body ? OpenLegendWire::WriteObject(*Body) : FString(), bWrite, false, Timeout, Limit);
    Entry->Done = MoveTemp(Completion);
    Entry->ConnectionGeneration = Generation;
    Entry->ViewGeneration = ScopeGeneration;
    // A fresh state read establishes a scope and sends no old scope header.
    // Its result still belongs to the acquisition attempt that started it.
    Entry->bExpiresWithScope = bScoped || Route == TEXT("/api/state");
    Entry->bWrite = bWrite;
    Transport->Start(Entry->Call.ToSharedRef());
    Requests.Add(MoveTemp(Entry));
    return true;
}

bool UOpenLegendSession::Send(const FString& Route, TSharedPtr<FJsonObject> Body, FReply Completion)
{
    if (!View || !Body || Route == TEXT("/api/session/logout"))
    {
        return false;
    }
    const bool bInput = Route == TEXT("/api/input");
    return Request(Route, Body, bInput ? 1.0 : RequestTimeout, true, true,
        [Completion = MoveTemp(Completion)](FResult&& Result)
        {
            if (Completion)
            {
                Completion(Result.Code, MoveTemp(Result.Json));
            }
        });
}

bool UOpenLegendSession::Read(const FString& Route, FReply Completion)
{
    return View && Request(Route, nullptr, EntryTimeout, true, true, [Completion = MoveTemp(Completion)](FResult&& Result)
    {
        if (Completion)
        {
            Completion(Result.Code, MoveTemp(Result.Json));
        }
    });
}

bool UOpenLegendSession::StorePendingReceipt(
    const FString& Route, const FJsonObject& Body, FOpenLegendReceiptHandle& Handle)
{
    FOpenLegendReceiptHandle Pending;
    Pending.Key = RecoveryKey(Origin, View);
    if (Pending.Key.IsEmpty() || !ReceiptRouteIsKnown(Route))
    {
        return false;
    }
    const FString Timeline = Field(*View, TEXT("saveTimeline"));
    if (Timeline.IsEmpty())
    {
        return false;
    }
    Pending.CreatedAt = FDateTime::UtcNow().ToUnixTimestamp();
    FJsonObject Record;
    Record.SetStringField(TEXT("id"), FGuid::NewGuid().ToString(EGuidFormats::Digits));
    Record.SetStringField(TEXT("route"), Route);
    Record.SetStringField(TEXT("timeline"), Timeline);
    Record.SetNumberField(TEXT("created"), static_cast<double>(Pending.CreatedAt));
    Record.SetObjectField(TEXT("body"), MakeShared<FJsonObject>(Body));
    Pending.Encoded = OpenLegendWire::WriteObject(Record);
    if (!OpenLegendCredentials::SavePending(Pending.Key, Pending.Encoded))
    {
        return false;
    }
    Handle = MoveTemp(Pending);
    return true;
}

bool UOpenLegendSession::LoadPendingReceipt(
    FString& Route, TSharedPtr<FJsonObject>& Body, FOpenLegendReceiptHandle& Handle)
{
    FOpenLegendReceiptHandle Pending;
    Pending.Key = RecoveryKey(Origin, View);
    if (Pending.Key.IsEmpty())
    {
        return false;
    }
    Pending.Encoded = OpenLegendCredentials::LoadPending(Pending.Key);
    if (Pending.Encoded.IsEmpty())
    {
        return false;
    }
    TSharedPtr<FJsonObject> Record;
    uint64 Created;
    const bool bDecoded = FJsonSerializer::Deserialize(TJsonReaderFactory<>::Create(Pending.Encoded), Record)
        && Record && OpenLegendWire::ReadRevision(*Record, TEXT("created"), Created);
    if (bDecoded)
    {
        Pending.CreatedAt = static_cast<int64>(Created);
    }
    FString StoredRoute;
    const TSharedPtr<FJsonObject>* Payload = nullptr;
    if (!bDecoded || Pending.IsExpired() ||
        !Field(*Record, TEXT("timeline")).Equals(Field(*View, TEXT("saveTimeline")), ESearchCase::CaseSensitive) ||
        !Record->TryGetStringField(TEXT("route"), StoredRoute) || !ReceiptRouteIsKnown(StoredRoute) ||
        !Record->TryGetObjectField(TEXT("body"), Payload))
    {
        ClearPendingReceipt(Pending);
        return false;
    }
    Body = *Payload;
    Route = MoveTemp(StoredRoute);
    Handle = MoveTemp(Pending);
    return true;
}

void UOpenLegendSession::ClearPendingReceipt(const FOpenLegendReceiptHandle& Handle)
{
    if (!Handle.Key.IsEmpty())
    {
        OpenLegendCredentials::RemovePending(Handle.Key, Handle.Encoded);
    }
}

FString UOpenLegendSession::CurrentScope() const
{
    if (View)
    {
        if (const auto* Access = Child(*View, TEXT("access")))
        {
            return Field(*Access, TEXT("scope"));
        }
    }
    return StreamScope;
}

void UOpenLegendSession::Enter()
{
    if (Cookie.IsEmpty())
    {
        ShowStatus(LOCTEXT("SignIn", "Sign in to play."));
        return;
    }
    ShowStatus(LOCTEXT("Entering", "Joining your world…"));
    if (!Request(TEXT("/api/session"), nullptr, EntryTimeout, true, false, [this](FResult&& Result)
    {
        if (Result.Code == 401)
        {
            OpenLegendCredentials::RemoveOwned(Origin, Cookie);
            Cookie.Reset();
            ShowStatus(LOCTEXT("SessionExpired", "Sign in again to play."));
            return;
        }
        AccountId = Result.Json ? Field(*Result.Json, TEXT("accountId")) : FString();
        if (Result.Code != 200 || AccountId.IsEmpty())
        {
            EndEvents(Result.Code, Result.Code == 200);
            return;
        }
        ReadState();
    }))
    {
        EndEvents(0);
    }
}

void UOpenLegendSession::ReadState()
{
    if (EntryDeadline <= Now())
    {
        EntryDeadline = Now() + EntryTimeout;
    }
    if (!Request(TEXT("/api/state"), nullptr, FMath::Max(0.001, EntryDeadline - Now()), true, false,
        [this](FResult&& Result)
    {
        if (Result.Code == 503 && EntryDeadline - Now() > 0.35)
        {
            bReconnect = true;
            ReconnectAt = Now() + 0.35;
            return;
        }
        EntryDeadline = 0;
        if (Result.Code != 200 || !Result.Json || !ValidView(*Result.Json, AccountId, ExpectedWorldId))
        {
            EndEvents(Result.Code, Result.Code == 200);
            return;
        }
        const auto* Access = Child(*Result.Json, TEXT("access"));
        StreamScope = Field(*Access, TEXT("scope"));
        uint64 ControlGeneration = 0;
        if (!bTriedControl && bPresent && !Bool(*Access, TEXT("controlling")) &&
            !Bool(*Access, TEXT("controlledElsewhere")) &&
            OpenLegendWire::ReadRevision(*Access, TEXT("controlGeneration"), ControlGeneration))
        {
            bTriedControl = true;
            auto Body = MakeShared<FJsonObject>();
            Body->SetStringField(TEXT("id"), FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphensLower));
            Body->SetStringField(TEXT("operation"), TEXT("acquire"));
            Body->SetNumberField(TEXT("expectedGeneration"), static_cast<double>(ControlGeneration));
            if (Request(TEXT("/api/embodiment"), Body, EntryTimeout, true, true, [this](FResult&&)
            {
                ReadState();
            }))
            {
                return;
            }
        }
        OpenEvents(*Result.Json);
    }))
    {
        EndEvents(0);
    }
}

void UOpenLegendSession::AcquireControl(bool bReplace)
{
    const auto* Access = View ? Child(*View, TEXT("access")) : nullptr;
    uint64 ControlGeneration;
    if (!bPresent || bControlPending || !Access || Bool(*Access, TEXT("controlling")) ||
        (!bReplace && Bool(*Access, TEXT("controlledElsewhere"))) ||
        !OpenLegendWire::ReadRevision(*Access, TEXT("controlGeneration"), ControlGeneration))
    {
        return;
    }
    auto Body = MakeShared<FJsonObject>();
    Body->SetStringField(TEXT("id"), FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphensLower));
    Body->SetNumberField(TEXT("expectedGeneration"), static_cast<double>(ControlGeneration));
    Body->SetStringField(TEXT("operation"), bReplace ? TEXT("replace") : TEXT("acquire"));
    bControlPending = Request(TEXT("/api/embodiment"), Body, EntryTimeout, true, true, [this](FResult&&)
    {
        bTriedControl = true;
        Refresh();
    });
}

void UOpenLegendSession::CancelScopedRequests()
{
    ++ScopeGeneration;
    for (const auto& Entry : Requests)
    {
        if (Entry->bExpiresWithScope)
        {
            Entry->Call->Cancel();
        }
    }
    if (Stream)
    {
        Stream->Cancel();
    }
    Transport->Wake();
}

void UOpenLegendSession::Refresh()
{
    CancelScopedRequests();
    StreamScope.Reset();
    bPresencePending = false;
    bControlPending = false;
    EventReader.Reset();
    bReconnect = true;
    ReconnectAt = Now();
    Publish(nullptr, true);
}

void UOpenLegendSession::OpenEvents(const FJsonObject& InitialState)
{
    uint64 Revision;
    if (Stream || StreamScope.IsEmpty() || !OpenLegendWire::ReadRevision(InitialState, TEXT("revision"), Revision))
    {
        EndEvents(0, true);
        return;
    }
    EventReader = MakeUnique<FOpenLegendEventReader>();
    EventDeadline = Now() + EntryTimeout;
    const FString Route = FString::Printf(TEXT("/api/events?client=%s&scope=%s&revision=%llu"),
        *ConnectionId, *OpenLegendWire::UrlEncode(StreamScope), static_cast<unsigned long long>(Revision));
    Stream = MakeShared<FOpenLegendHttpCall, ESPMode::ThreadSafe>(
        Origin + Route, Origin, ConnectionId, Cookie, StreamScope, FString(), false, true, 0.0, WorldBuffer);
    Transport->Start(Stream.ToSharedRef());
}

void UOpenLegendSession::EndEvents(int32 Code, bool bIncompatible)
{
    CancelScopedRequests();
    EventReader.Reset();
    StreamScope.Reset();
    bPresencePending = false;
    bControlPending = false;
    bReconnect = bProtocolReady && !Cookie.IsEmpty() && !IsAccessFailure(Code) && Code != 204 && !bIncompatible;
    ReconnectAt = Now() + RetryDelay;
    if (Code == 401)
    {
        OpenLegendCredentials::RemoveOwned(Origin, Cookie);
        Cookie.Reset();
        ShowStatus(LOCTEXT("Expired", "Sign in again to play."));
    }
    else if (Code == 403)
    {
        ShowStatus(LOCTEXT("GrantRequired", "This account has no access to play here."));
    }
    else if (bIncompatible)
    {
        ShowStatus(LOCTEXT("BadState", "This game build could not read the current world."));
    }
    else if (Code == 204)
    {
        ShowStatus(LOCTEXT("PlayUnavailable", "This world closed the connection."));
    }
    else
    {
        ShowStatus(LOCTEXT("Reconnecting", "Connection interrupted. Reconnecting…"));
    }
    Publish(nullptr, bReconnect);
}

void UOpenLegendSession::Publish(TSharedPtr<const FJsonObject> Next, bool bTemporaryLoss)
{
    const bool bDiscardSuspendedView = bViewTemporarilyUnavailable && !bTemporaryLoss;
    bViewTemporarilyUnavailable = bTemporaryLoss;
    if (Next || View || bDiscardSuspendedView)
    {
        View = MoveTemp(Next);
        OnViewChanged.Broadcast();
    }
}

UOpenLegendSession::EStreamEvent UOpenLegendSession::StageEvent(
    const FString& Event, const TArray<uint8>& Text, bool bClosed, TSharedPtr<const FJsonObject>& Current) const
{
    if (Event.Equals(TEXT("access-changed"), ESearchCase::CaseSensitive))
    {
        return EStreamEvent::AccessChanged;
    }
    if (bClosed || (Text.IsEmpty() && Event.IsEmpty()))
    {
        return EStreamEvent::Accepted;
    }
    TSharedPtr<const FJsonObject> Json = OpenLegendWire::ReadObject(Text);
    if (!Json)
    {
        return EStreamEvent::Invalid;
    }
    TSharedPtr<const FJsonObject> Next;
    if (Event.Equals(TEXT("reset"), ESearchCase::CaseSensitive))
    {
        if (!ValidView(*Json, AccountId, ExpectedWorldId))
        {
            return EStreamEvent::Invalid;
        }
        if (!Field(*Child(*Json, TEXT("access")), TEXT("scope")).Equals(StreamScope, ESearchCase::CaseSensitive)
            || (Current && !Field(*Current, TEXT("saveTimeline")).Equals(
                Field(*Json, TEXT("saveTimeline")), ESearchCase::CaseSensitive)))
        {
            return EStreamEvent::AccessChanged;
        }
        if (Current)
        {
            uint64 Before = 0;
            uint64 After = 0;
            OpenLegendWire::ReadRevision(*Current, TEXT("revision"), Before);
            OpenLegendWire::ReadRevision(*Json, TEXT("revision"), After);
            if (After < Before)
            {
                return EStreamEvent::Invalid;
            }
        }
        Next = MoveTemp(Json);
    }
    else if (Event.Equals(TEXT("patch"), ESearchCase::CaseSensitive) && Current)
    {
        Next = OpenLegendWire::Apply(*Current, *Json);
    }
    if (!Next)
    {
        return EStreamEvent::Invalid;
    }
    Current = MoveTemp(Next);
    return EStreamEvent::Accepted;
}

void UOpenLegendSession::SetPresent(bool bNowPresent)
{
    if (bPresent == bNowPresent)
    {
        return;
    }
    bPresent = bNowPresent;
    NextPresenceAt = 0;
    if (bNowPresent && bProtocolReady && !Cookie.IsEmpty() && !AccountId.IsEmpty())
    {
        // The fresh view reestablishes scope for both input and the next presence write.
        bTriedControl = false;
        Refresh();
    }
    else
    {
        Presence();
    }
}

void UOpenLegendSession::Presence()
{
    const auto* Access = View ? Child(*View, TEXT("access")) : nullptr;
    if (bPresencePending || Now() < NextPresenceAt || !Access || !Bool(*Access, TEXT("controlling")))
    {
        return;
    }
    auto Body = MakeShared<FJsonObject>();
    Body->SetStringField(TEXT("clientId"), ConnectionId);
    Body->SetBoolField(TEXT("visible"), bPresent);
    Body->SetNumberField(TEXT("sequence"), static_cast<double>(++PresenceSequence));
    bPresencePending = Request(TEXT("/api/presence"), Body, PresenceInterval, true, true, [this](FResult&&)
    {
        bPresencePending = false;
    });
    NextPresenceAt = Now() + PresenceInterval;
}

void UOpenLegendSession::PumpEvents()
{
    if (!Stream)
    {
        return;
    }
    auto Received = Stream->Take();
    if (Received.bDone)
    {
        Stream.Reset();
    }
    if (!EventReader)
    {
        return;
    }
    if (Received.Status >= 300 || Received.Status == 204)
    {
        if (Received.bDone)
        {
            // Scope may change between the state read and opening this stream.
            // Reacquire at the normal reconnect cadence instead of refusing entry.
            EndEvents(IsStaleScope(Received) ? 0 : Received.Status);
        }
        else if (Now() >= EventDeadline)
        {
            EndEvents(0);
        }
        return;
    }
    if ((Received.bDone && Received.Bytes.IsEmpty()) || Now() >= EventDeadline)
    {
        EndEvents(0);
        return;
    }
    if (Received.Bytes.IsEmpty())
    {
        return;
    }
    EStreamEvent Outcome = EStreamEvent::Accepted;
    bool bComplete = false;
    auto Next = View;
    // Rust can send its last permission notice before curl sees EOF.
    // Apply the full ordered chain before notifying any subscribers.
    const bool bParsed = Received.Status == 200 && HasMediaType(Received.Type, TEXT("text/event-stream"))
        && EventReader->Append(MoveTemp(Received.Bytes), WorldBuffer,
            [this, &Next, &Outcome, &bComplete, bClosed = Received.bDone](
                const FString& Event, const TArray<uint8>& Text)
            {
                bComplete = true;
                Outcome = StageEvent(Event, Text, bClosed, Next);
                return Outcome == EStreamEvent::Accepted;
            });
    if (Outcome == EStreamEvent::AccessChanged)
    {
        // One fresh scoped read. A refusal ends its reconnect.
        Refresh();
    }
    else if (!bParsed || Received.bDone)
    {
        EndEvents(0);
    }
    else if (bComplete && Next)
    {
        EventDeadline = Now() + EventStall;
        if (Next != View)
        {
            const bool bFirst = !View;
            Publish(MoveTemp(Next));
            if (bFirst && View)
            {
                ShowStatus(FText::GetEmpty());
                NextPresenceAt = 0;
            }
        }
    }
}

bool UOpenLegendSession::Tick(float)
{
    const auto IsCurrent = [this](const FRequest& Entry)
    {
        return Entry.ConnectionGeneration == Generation
            && (!Entry.bExpiresWithScope || Entry.ViewGeneration == ScopeGeneration);
    };
    // Remove completed network ownership before invoking user code, which may open another request.
    TArray<TPair<TUniquePtr<FRequest>, FOpenLegendHttpCall::FDelivery>> Done;
    int32 Refusal = 0;
    for (int32 I = Requests.Num() - 1; I >= 0; --I)
    {
        auto& Entry = Requests[I];
        auto Received = Entry->Call->Take();
        if (!Received.bDone)
        {
            continue;
        }
        if (Entry->bExpiresWithScope && IsCurrent(*Entry))
        {
            if (Received.Status == 401)
            {
                Refusal = 401;
            }
            else if (Refusal == 0 && IsStaleScope(Received))
            {
                Refusal = Received.Status;
            }
        }
        Done.Emplace(MoveTemp(Entry), MoveTemp(Received));
        Requests.RemoveAtSwap(I, 1, EAllowShrinking::No);
    }
    if (Refusal != 0)
    {
        // A refusal at final disclosure says nothing about a write's outcome.
        // Fence this scope before rendering any queued stream updates or delivering
        // request callbacks. Original receipts remain available to the fresh view.
        EndEvents(Refusal == 401 ? 401 : 0);
    }
    PumpEvents();
    for (auto& Pair : Done)
    {
        const auto& Entry = Pair.Key;
        if (IsCurrent(*Entry))
        {
            auto& Received = Pair.Value;
            FResult Result;
            Result.Code = Received.Status;
            Result.Json = JsonResponse(Received);
            Result.Cookie = MoveTemp(Received.Cookie);
            Entry->Done(MoveTemp(Result));
        }
    }

    if (bReconnect && !Stream && Now() >= ReconnectAt)
    {
        bReconnect = false;
        if (!bProtocolReady)
        {
            Bootstrap();
        }
        else if (AccountId.IsEmpty())
        {
            Enter();
        }
        else
        {
            ReadState();
        }
    }
    if (Login)
    {
        FString Code;
        switch (Login->Poll(Code))
        {
        case FOpenLegendDesktopLogin::EResult::Expired:
            Login.Reset();
            bSigningIn = false;
            ShowStatus(LOCTEXT("LoginExpired", "Sign-in expired. Try again."));
            break;
        case FOpenLegendDesktopLogin::EResult::Ready:
        {
            auto Body = MakeShared<FJsonObject>();
            Body->SetStringField(TEXT("code"), Code);
            Body->SetStringField(TEXT("state"), Login->GetState());
            Body->SetStringField(TEXT("verifier"), Login->GetVerifier());
            Body->SetStringField(TEXT("redirectUri"), Login->GetRedirectUri());
            Login.Reset();
            bSigningIn = Request(TEXT("/api/session/desktop/exchange"), Body, EntryTimeout, false, false,
                [this](FResult&& Result)
            {
                bSigningIn = false;
                if (Result.Code != 200 || !Result.Json || !Bool(*Result.Json, TEXT("ok")) ||
                    !OpenLegendWire::IsSessionCookie(Result.Cookie))
                {
                    ShowStatus(LOCTEXT("SignInFailed", "Sign-in could not finish. Try again."));
                    return;
                }
                Cookie = MoveTemp(Result.Cookie);
                if (!OpenLegendCredentials::Save(Origin, Cookie))
                {
                    ShowStatus(LOCTEXT("SessionOnly", "Signed in for this session. Your device could not save sign-in."));
                }
                Enter();
            });
            if (!bSigningIn)
            {
                ShowStatus(LOCTEXT("SignInStartFailed", "Unable to finish sign-in. Try again."));
            }
            break;
        }
        case FOpenLegendDesktopLogin::EResult::Waiting:
            break;
        }
    }
    Presence();
    return true;
}

#undef LOCTEXT_NAMESPACE
