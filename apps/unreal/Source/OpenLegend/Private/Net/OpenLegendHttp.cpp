#include "Net/OpenLegendHttp.h"

#include "HAL/RunnableThread.h"
#include "Interfaces/ISslCertificateManager.h"
#include "Misc/ScopeLock.h"
#include "Ssl.h"

THIRD_PARTY_INCLUDES_START
#include <curl/curl.h>
THIRD_PARTY_INCLUDES_END

namespace
{
CURLcode AddTrustRoots(CURL*, void* Context, void*)
{
    const ISslCertificateManager& Certificates = FSslModule::Get().GetCertificateManager();
    if (!Certificates.HasCertificatesAvailable())
    {
        return CURLE_SSL_CACERT_BADFILE;
    }
    Certificates.AddCertificatesToSslContext(static_cast<SSL_CTX*>(Context));
    return CURLE_OK;
}
}

FOpenLegendHttpCall::FOpenLegendHttpCall(FString InUrl, FString InOrigin, FString InConnection,
    FString InCookie, FString InScope, FString InBody, bool bInPost, bool bInEvents,
    double InTimeout, int32 InBufferBytes)
    : Url(MoveTemp(InUrl)), Origin(MoveTemp(InOrigin)), Connection(MoveTemp(InConnection)),
      Cookie(MoveTemp(InCookie)), Scope(MoveTemp(InScope)), Body(MoveTemp(InBody)),
      bPost(bInPost), bEvents(bInEvents), Timeout(InTimeout), BufferBytes(InBufferBytes)
{
}

FOpenLegendHttpCall::~FOpenLegendHttpCall()
{
    check(Handle == nullptr && Headers == nullptr);
}

void FOpenLegendHttpCall::Cancel()
{
    bCanceled = true;
}

FOpenLegendHttpCall::FDelivery FOpenLegendHttpCall::Take()
{
    FScopeLock Guard(&Lock);
    FDelivery Result;
    Result.Status = Delivery.Status;
    Result.bDone = Delivery.bDone;
    // A successful SSE response is incremental. An HTTP refusal stays owned by
    // this call through EOF so the session can read its complete reason.
    if (Delivery.bDone || (bEvents && Delivery.Status == 200 && !Delivery.Bytes.IsEmpty()))
    {
        Result.Type = Delivery.Type;
        Result.Bytes = MoveTemp(Delivery.Bytes);
        Result.Cookie = MoveTemp(Delivery.Cookie);
    }
    return Result;
}

bool FOpenLegendHttpCall::Begin(void* Multi)
{
    if (bCanceled)
    {
        return false;
    }
    auto* Easy = curl_easy_init();
    if (!Easy)
    {
        return false;
    }
    Handle = Easy;
    curl_easy_setopt(Easy, CURLOPT_URL, TCHAR_TO_UTF8(*Url));
    curl_easy_setopt(Easy, CURLOPT_PROTOCOLS_STR, "https,http");
    curl_easy_setopt(Easy, CURLOPT_FOLLOWLOCATION, 0L);
    curl_easy_setopt(Easy, CURLOPT_SSL_VERIFYPEER, 1L);
    curl_easy_setopt(Easy, CURLOPT_SSL_VERIFYHOST, 2L);
    curl_easy_setopt(Easy, CURLOPT_CAINFO, static_cast<const char*>(nullptr));
    curl_easy_setopt(Easy, CURLOPT_CAPATH, static_cast<const char*>(nullptr));
    curl_easy_setopt(Easy, CURLOPT_SSL_CTX_FUNCTION, &AddTrustRoots);
    curl_easy_setopt(Easy, CURLOPT_NOSIGNAL, 1L);
    curl_easy_setopt(Easy, CURLOPT_CONNECTTIMEOUT_MS, 15000L);
    curl_easy_setopt(Easy, CURLOPT_SUPPRESS_CONNECT_HEADERS, 1L);
    curl_easy_setopt(Easy, CURLOPT_ACCEPT_ENCODING, "");
    if (Timeout > 0)
    {
        curl_easy_setopt(Easy, CURLOPT_TIMEOUT_MS, static_cast<long>(Timeout * 1000));
    }
    if (bPost)
    {
        const FTCHARToUTF8 Encoded(*Body, Body.Len());
        curl_easy_setopt(Easy, CURLOPT_POST, 1L);
        curl_easy_setopt(Easy, CURLOPT_POSTFIELDSIZE_LARGE, static_cast<curl_off_t>(Encoded.Length()));
        curl_easy_setopt(Easy, CURLOPT_COPYPOSTFIELDS, Encoded.Get());
    }
    const auto Header = [this](const FString& Line)
    {
        auto* Appended = curl_slist_append(Headers, TCHAR_TO_UTF8(*Line));
        if (!Appended)
        {
            return false;
        }
        Headers = Appended;
        return true;
    };
    if (!Header(bEvents ? TEXT("Accept: text/event-stream") : TEXT("Accept: application/json")) ||
        (!Connection.IsEmpty() && !Header(TEXT("x-ol-client: ") + Connection)) ||
        (!Cookie.IsEmpty() && !Header(TEXT("Cookie: ol_session=") + Cookie)) ||
        (!Scope.IsEmpty() && !Header(TEXT("x-ol-scope: ") + Scope)) ||
        (bPost && (!Header(TEXT("Origin: ") + Origin) || !Header(TEXT("Content-Type: application/json")))))
    {
        return false;
    }
    curl_easy_setopt(Easy, CURLOPT_HTTPHEADER, Headers);
    curl_easy_setopt(Easy, CURLOPT_HEADERFUNCTION, &ReadHeader);
    curl_easy_setopt(Easy, CURLOPT_HEADERDATA, this);
    curl_easy_setopt(Easy, CURLOPT_WRITEFUNCTION, &ReadBody);
    curl_easy_setopt(Easy, CURLOPT_WRITEDATA, this);
    curl_easy_setopt(Easy, CURLOPT_PRIVATE, this);
    return curl_multi_add_handle(static_cast<CURLM*>(Multi), Easy) == CURLM_OK;
}

void FOpenLegendHttpCall::End(void* Multi, bool bSucceeded)
{
    if (Handle)
    {
        if (Multi)
        {
            curl_multi_remove_handle(static_cast<CURLM*>(Multi), Handle);
        }
        curl_easy_cleanup(Handle);
        Handle = nullptr;
    }
    curl_slist_free_all(Headers);
    Headers = nullptr;
    FScopeLock Guard(&Lock);
    if (!bSucceeded || bCanceled)
    {
        Delivery.Status = 0;
        Delivery.Bytes.Reset();
        Delivery.Cookie.Reset();
    }
    Delivery.bDone = true;
}

SIZE_T FOpenLegendHttpCall::ReadHeader(char* Text, SIZE_T Size, SIZE_T Count, void* Context)
{
    auto& Call = *static_cast<FOpenLegendHttpCall*>(Context);
    const SIZE_T Length = Size * Count;
    if (Call.bCanceled || Length > 32768)
    {
        return 0;
    }
    const FUTF8ToTCHAR Converted(Text, static_cast<int32>(Length));
    FString Line(Converted.Length(), Converted.Get());
    FScopeLock Guard(&Call.Lock);
    if (Line.StartsWith(TEXT("HTTP/")))
    {
        int32 FirstSpace;
        if (Line.FindChar(TEXT(' '), FirstSpace))
        {
            const int32 Code = FCString::Atoi(*Line.Mid(FirstSpace + 1, 3));
            if (Code >= 200)
            {
                Call.Delivery.Status = Code;
            }
        }
    }
    else if (Line.RemoveFromStart(TEXT("Content-Type:"), ESearchCase::IgnoreCase))
    {
        Call.Delivery.Type = Line.TrimStartAndEnd();
    }
    else if (!Call.bEvents && Line.RemoveFromStart(TEXT("Set-Cookie:"), ESearchCase::IgnoreCase))
    {
        Line.TrimStartAndEndInline();
        if (Line.RemoveFromStart(TEXT("ol_session="), ESearchCase::CaseSensitive))
        {
            int32 End;
            if (Line.FindChar(TEXT(';'), End))
            {
                Line.LeftInline(End);
            }
            Call.Delivery.Cookie = MoveTemp(Line);
        }
    }
    return Length;
}

SIZE_T FOpenLegendHttpCall::ReadBody(char* Data, SIZE_T Size, SIZE_T Count, void* Context)
{
    auto& Call = *static_cast<FOpenLegendHttpCall*>(Context);
    const SIZE_T Length = Size * Count;
    FScopeLock Guard(&Call.Lock);
    if (Call.bCanceled || Length > static_cast<SIZE_T>(Call.BufferBytes - Call.Delivery.Bytes.Num()))
    {
        return 0;
    }
    Call.Delivery.Bytes.Append(reinterpret_cast<const uint8*>(Data), static_cast<int32>(Length));
    return Length;
}

FOpenLegendHttp::FOpenLegendHttp()
{
    if (curl_global_init(CURL_GLOBAL_DEFAULT) == CURLE_OK)
    {
        // Load the engine's initialized trust store while still on the game thread.
        FSslModule::Get();
        bCurlInitialized = true;
        MultiHandle = curl_multi_init();
        if (MultiHandle)
        {
            Thread = FRunnableThread::Create(this, TEXT("OpenLegendNetwork"));
        }
    }
}

FOpenLegendHttp::~FOpenLegendHttp()
{
    bStop = true;
    Wake();
    if (Thread)
    {
        Thread->WaitForCompletion();
        delete Thread;
    }
    if (MultiHandle)
    {
        curl_multi_cleanup(static_cast<CURLM*>(MultiHandle));
    }
    if (bCurlInitialized)
    {
        curl_global_cleanup();
    }
}

void FOpenLegendHttp::Start(TSharedRef<FOpenLegendHttpCall, ESPMode::ThreadSafe> Call)
{
    {
        FScopeLock Guard(&Lock);
        Pending.Add(MoveTemp(Call));
    }
    Wake();
}

void FOpenLegendHttp::Wake()
{
    // The handle outlives the worker. Curl allows this call from the game thread,
    // including before the worker enters its next poll.
    if (MultiHandle)
    {
        curl_multi_wakeup(static_cast<CURLM*>(MultiHandle));
    }
}

uint32 FOpenLegendHttp::Run()
{
    auto* Multi = static_cast<CURLM*>(MultiHandle);
    TMap<void*, TSharedRef<FOpenLegendHttpCall, ESPMode::ThreadSafe>> Active;
    while (!bStop)
    {
        TArray<TSharedRef<FOpenLegendHttpCall, ESPMode::ThreadSafe>> Ready;
        {
            FScopeLock Guard(&Lock);
            Swap(Pending, Ready);
        }
        for (const auto& Call : Ready)
        {
            if (Call->Begin(Multi))
            {
                Active.Add(Call->Handle, Call);
            }
            else
            {
                Call->End(Multi, false);
            }
        }
        for (auto It = Active.CreateIterator(); It; ++It)
        {
            if (It.Value()->bCanceled)
            {
                It.Value()->End(Multi, false);
                It.RemoveCurrent();
            }
        }
        int Running = 0;
        if (curl_multi_perform(Multi, &Running) != CURLM_OK)
        {
            for (auto& Pair : Active)
            {
                Pair.Value->End(Multi, false);
            }
            Active.Reset();
            continue;
        }
        int PendingMessages;
        while (CURLMsg* Message = curl_multi_info_read(Multi, &PendingMessages))
        {
            if (Message->msg == CURLMSG_DONE)
            {
                if (auto* Call = Active.Find(Message->easy_handle))
                {
                    auto* Easy = Message->easy_handle;
                    const bool bSucceeded = Message->data.result == CURLE_OK;
                    (*Call)->End(Multi, bSucceeded);
                    Active.Remove(Easy);
                }
            }
        }
        // Curl wakes for socket progress, its own shorter deadlines, or new work.
        curl_multi_poll(Multi, nullptr, 0, 1000, nullptr);
    }
    for (auto& Pair : Active)
    {
        Pair.Value->End(Multi, false);
    }
    return 0;
}
