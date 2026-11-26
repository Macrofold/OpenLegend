#pragma once

#include "CoreMinimal.h"

class FSocket;

/** Owns one localhost callback with one PKCE challenge. It never holds a game session cookie. */
class FOpenLegendDesktopLogin
{
public:
    ~FOpenLegendDesktopLogin();
    bool Start(const FString& Origin, const FString& Invite);
    enum class EResult : uint8 { Waiting, Ready, Expired };
    EResult Poll(FString& Code);
    const FString& GetState() const { return State; }
    const FString& GetVerifier() const { return Verifier; }
    const FString& GetRedirectUri() const { return RedirectUri; }

private:
    void Close(FSocket*& Socket);
    FSocket* Listener = nullptr;
    FSocket* Client = nullptr;
    FString State;
    FString Verifier;
    FString RedirectUri;
    FString Host;
    TArray<uint8> Request;
    double Deadline = 0;
    double ClientDeadline = 0;
};

namespace OpenLegendCredentials
{
FString Load(const FString& Origin);
bool Save(const FString& Origin, const FString& Cookie);
void RemoveOwned(const FString& Origin, const FString& Cookie);
FString LoadPending(const FString& Key);
bool SavePending(const FString& Key, const FString& Encoded);
void RemovePending(const FString& Key, const FString& Expected);

}
