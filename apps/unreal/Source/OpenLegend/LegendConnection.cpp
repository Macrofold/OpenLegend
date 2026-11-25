// SPDX-License-Identifier: Apache-2.0
#include "LegendConnection.h"
#include "GenericPlatform/GenericPlatformHttp.h"
#include "Containers/StringConv.h"

THIRD_PARTY_INCLUDES_START
#include <curl/curl.h>
THIRD_PARTY_INCLUDES_END

namespace
{
constexpr int32 MaxResponseBytes = 16 * 1024 * 1024;

FString Decode(const TArray<uint8>& Bytes, int32 Size)
{
    if (!Size) return {};
    const FUTF8ToTCHAR Text(reinterpret_cast<const ANSICHAR*>(Bytes.GetData()), Size);
    return FString(Text.Length(), Text.Get());
}

struct FTransfer
{
    CURL* Handle = nullptr;
    curl_slist* Headers = nullptr;
    TArray<uint8> Bytes;
    TArray<char> Upload;
    bool bStream = false;
    double LastFrameAt = 0;
    int32 QueuedBytes = 0;
    TArray<FString> Frames;

    ~FTransfer()
    {
        if (Handle) curl_easy_cleanup(Handle);
        curl_slist_free_all(Headers);
    }
    void Header(const FString& Value)
    {
        Headers = curl_slist_append(Headers, TCHAR_TO_UTF8(*Value));
    }
    static size_t Receive(char* Buffer, size_t Size, size_t Count, void* Context)
    {
        FTransfer& Transfer = *static_cast<FTransfer*>(Context);
        const size_t Length = Size * Count;
        if (Length > static_cast<size_t>(MaxResponseBytes - Transfer.Bytes.Num() - Transfer.QueuedBytes)) return 0;
        const int32 Start = Transfer.Bytes.Num();
        Transfer.Bytes.Append(reinterpret_cast<const uint8*>(Buffer), static_cast<int32>(Length));
        if (Transfer.bStream)
        {
            // Frames are split before UTF-8 decoding so a packet can end inside a character.
            int32 FrameStart = 0;
            for (int32 I = FMath::Max(0, Start - 3); I + 1 < Transfer.Bytes.Num(); ++I)
            {
                if (Transfer.Bytes[I] != '\n') continue;
                int32 Next = I + 1;
                if (Transfer.Bytes[Next] == '\r') ++Next;
                if (!Transfer.Bytes.IsValidIndex(Next) || Transfer.Bytes[Next] != '\n') continue;
                if (Transfer.Frames.Num() >= 128) return 0;
                TArray<uint8> Frame(Transfer.Bytes.GetData() + FrameStart, I - FrameStart);
                Transfer.Frames.Add(Decode(Frame, Frame.Num()));
                Transfer.QueuedBytes += Next + 1 - FrameStart;
                FrameStart = Next + 1;
                I = Next;
            }
            if (FrameStart) Transfer.Bytes.RemoveAt(0, FrameStart, EAllowShrinking::No);
        }
        return Length;
    }
};
}

struct FLegendConnection::FImpl
{
    FString Origin;
    CURLM* Multi = nullptr;
    CURLSH* Cookies = nullptr;
    TUniquePtr<FTransfer> Operation;
    TUniquePtr<FTransfer> Stream;
    bool bInitialized = false;

    explicit FImpl(int32 Port) : Origin(FString::Printf(TEXT("http://127.0.0.1:%d"), Port))
    {
        bInitialized = curl_global_init(CURL_GLOBAL_DEFAULT) == CURLE_OK;
        if (!bInitialized) return;
        Multi = curl_multi_init();
        Cookies = curl_share_init();
        if (Cookies) curl_share_setopt(Cookies, CURLSHOPT_SHARE, CURL_LOCK_DATA_COOKIE);
    }
    void Remove(TUniquePtr<FTransfer>& Transfer)
    {
        if (!Transfer) return;
        curl_multi_remove_handle(Multi, Transfer->Handle);
        Transfer.Reset();
    }
    ~FImpl()
    {
        Remove(Operation);
        Remove(Stream);
        if (Cookies) curl_share_cleanup(Cookies);
        if (Multi) curl_multi_cleanup(Multi);
        if (bInitialized) curl_global_cleanup();
    }
    bool Start(TUniquePtr<FTransfer>& Slot, const FString& Path, const FString& Client,
               const FString& Scope, const FString& Json, bool bStream)
    {
        if (Slot || !Multi || !Cookies) return false;
        auto T = MakeUnique<FTransfer>();
        T->Handle = curl_easy_init();
        if (!T->Handle) return false;
        T->bStream = bStream;
        T->LastFrameAt = FPlatformTime::Seconds();
        CURL* H = T->Handle;
        curl_easy_setopt(H, CURLOPT_URL, TCHAR_TO_UTF8(*(Origin + Path)));
        curl_easy_setopt(H, CURLOPT_NOSIGNAL, 1L);
        curl_easy_setopt(H, CURLOPT_NOPROXY, "*");
        curl_easy_setopt(H, CURLOPT_FOLLOWLOCATION, 0L);
        curl_easy_setopt(H, CURLOPT_PROTOCOLS_STR, "http");
        curl_easy_setopt(H, CURLOPT_COOKIEFILE, "");
        curl_easy_setopt(H, CURLOPT_SHARE, Cookies);
        curl_easy_setopt(H, CURLOPT_CONNECTTIMEOUT_MS, 3000L);
        if (!bStream) curl_easy_setopt(H, CURLOPT_TIMEOUT_MS, 15000L);
        curl_easy_setopt(H, CURLOPT_WRITEFUNCTION, &FTransfer::Receive);
        curl_easy_setopt(H, CURLOPT_WRITEDATA, T.Get());
        T->Header(TEXT("X-OL-Client: ") + Client);
        if (bStream) T->Header(TEXT("Accept: text/event-stream"));
        if (!Json.IsEmpty())
        {
            T->Header(TEXT("Origin: ") + Origin);
            T->Header(TEXT("X-OL-Scope: ") + Scope);
            T->Header(TEXT("Content-Type: application/json"));
            FTCHARToUTF8 Bytes(*Json);
            T->Upload.Append(Bytes.Get(), Bytes.Length());
            curl_easy_setopt(H, CURLOPT_POSTFIELDSIZE, static_cast<long>(T->Upload.Num()));
            curl_easy_setopt(H, CURLOPT_POSTFIELDS, T->Upload.GetData());
        }
        curl_easy_setopt(H, CURLOPT_HTTPHEADER, T->Headers);
        if (curl_multi_add_handle(Multi, H) != CURLM_OK) return false;
        Slot = MoveTemp(T);
        return true;
    }
};

FLegendConnection::FLegendConnection(int32 Port)
    : ClientId(FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphensLower)), Impl(MakeUnique<FImpl>(Port)) {}
FLegendConnection::~FLegendConnection() = default;
bool FLegendConnection::IsBusy() const { return Impl->Operation.IsValid(); }
bool FLegendConnection::Request(const FString& Path, const FString& Scope, const FString& Json)
{
    return Impl->Start(Impl->Operation, Path, ClientId, Scope, Json, false);
}
bool FLegendConnection::Subscribe(const FString& Scope, int64 Revision)
{
    const FString Path = FString::Printf(TEXT("/api/events?client=%s&scope=%s&revision=%lld"),
        *ClientId, *FGenericPlatformHttp::UrlEncode(Scope), Revision);
    return Impl->Start(Impl->Stream, Path, ClientId, {}, {}, true);
}
void FLegendConnection::Unsubscribe() { Impl->Remove(Impl->Stream); }
void FLegendConnection::Pump()
{
    if (!Impl->Multi) return;
    int Remaining = 0;
    curl_multi_perform(Impl->Multi, &Remaining);
    bool bStreamEnded = false;
    bool bReplied = false;
    int32 Status = 0;
    FString Body;
    TArray<FString> Frames;
    if (Impl->Stream)
    {
        Frames = MoveTemp(Impl->Stream->Frames);
        Impl->Stream->QueuedBytes = 0;
    }
    int Pending = 0;
    while (CURLMsg* Message = curl_multi_info_read(Impl->Multi, &Pending))
    {
        if (Message->msg != CURLMSG_DONE) continue;
        if (Impl->Operation && Message->easy_handle == Impl->Operation->Handle)
        {
            if (Message->data.result == CURLE_OK)
            {
                long HttpStatus = 0;
                curl_easy_getinfo(Message->easy_handle, CURLINFO_RESPONSE_CODE, &HttpStatus);
                Status = static_cast<int32>(HttpStatus);
                Body = Decode(Impl->Operation->Bytes, Impl->Operation->Bytes.Num());
            }
            Impl->Remove(Impl->Operation);
            bReplied = true;
        }
        else if (Impl->Stream && Message->easy_handle == Impl->Stream->Handle)
        {
            Impl->Remove(Impl->Stream);
            bStreamEnded = true;
        }
    }
    // Callbacks may open/cancel a request. Finish consuming libcurl messages first.
    for (const FString& Frame : Frames)
    {
        if (!Impl->Stream) break;
        FString Name, Data;
        bool bHeartbeat = false;
        TArray<FString> Lines;
        Frame.ParseIntoArrayLines(Lines);
        for (FString& Line : Lines)
        {
            if (Line.RemoveFromStart(TEXT("event:"))) Name = Line.TrimStart();
            else if (Line.RemoveFromStart(TEXT("data:"))) Data += Line.TrimStart() + TEXT("\n");
            else if (Line.StartsWith(TEXT(":"))) bHeartbeat = true;
        }
        if (bHeartbeat || !Data.IsEmpty()) Impl->Stream->LastFrameAt = FPlatformTime::Seconds();
        if (!Data.IsEmpty() && OnEvent) OnEvent(Name, Data);
    }
    if (Impl->Stream && FPlatformTime::Seconds() - Impl->Stream->LastFrameAt > 45.)
    {
        Impl->Remove(Impl->Stream);
        bStreamEnded = true;
    }
    if (bStreamEnded && OnStreamLost) OnStreamLost();
    if (bReplied && OnReply) OnReply(Status, Body);
}
