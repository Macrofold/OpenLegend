// SPDX-License-Identifier: Apache-2.0
#pragma once

#include "CoreMinimal.h"

/** One loopback server and memory-only session per play session. Pump and callbacks run on the game thread. */
class FLegendConnection
{
public:
    FLegendConnection(int32 Port);
    ~FLegendConnection();

    void Pump();
    bool Request(const FString& Path, const FString& Scope = {}, const FString& Json = {});
    bool Subscribe(const FString& Scope, int64 Revision);
    void Unsubscribe();
    bool IsBusy() const;

    const FString ClientId;
    TFunction<void(int32, const FString&)> OnReply;
    TFunction<void(const FString&, const FString&)> OnEvent;
    TFunction<void()> OnStreamLost;

private:
    struct FImpl;
    TUniquePtr<FImpl> Impl;
};
