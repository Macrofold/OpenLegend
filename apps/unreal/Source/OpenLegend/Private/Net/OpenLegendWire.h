#pragma once

#include "CoreMinimal.h"

class FJsonObject;

namespace OpenLegendWire
{
TSharedPtr<FJsonObject> ReadObject(const TArray<uint8>& Bytes);
FString WriteObject(const FJsonObject& Object);
TSharedPtr<const FJsonObject> Apply(const FJsonObject& Current, const FJsonObject& Patch);
bool ReadRevision(const FJsonObject& Object, const TCHAR* Field, uint64& Revision);
bool IsSessionCookie(const FString& Value);
FString UrlEncode(const FString& Text);
}

/** Frames a single Rust game subscription. Bytes and incomplete frames belong to this connection. */
class FOpenLegendEventReader
{
public:
    using FDispatch = TFunctionRef<bool(const FString&, const TArray<uint8>&)>;
    bool Append(TArray<uint8>&& Incoming, int32 BufferBytes, FDispatch Dispatch);

private:
    TArray<uint8> Buffered;
    TArray<uint8> Data;
    FString Event;
    int32 LineStart = 0;
    int32 Scanned = 0;
    bool bComment = false;
    bool bHasData = false;
    bool bFirstLine = true;
    bool bSkipLineFeed = false;
};
