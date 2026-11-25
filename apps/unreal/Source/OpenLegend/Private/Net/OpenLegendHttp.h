#pragma once

#include "CoreMinimal.h"
#include "HAL/Runnable.h"
#include "HAL/ThreadSafeBool.h"
#include "HAL/CriticalSection.h"

class FRunnableThread;
struct curl_slist;

/** Curl and its request handles live on a single I/O thread. Data crosses to the game thread in bounded byte buffers. */
struct FOpenLegendHttpCall
{
    struct FDelivery
    {
        TArray<uint8> Bytes;
        FString Type;
        FString Cookie;
        int32 Status = 0;
        bool bDone = false;
    };

    FOpenLegendHttpCall(FString Url, FString Origin, FString Connection, FString Cookie,
                        FString Scope, FString Body, bool bPost, bool bEvents,
                        double Timeout, int32 BufferBytes);
    ~FOpenLegendHttpCall();
    FDelivery Take();
    void Cancel();

private:
    friend class FOpenLegendHttp;
    bool Begin(void* Multi);
    void End(void* Multi, bool bSucceeded);
    static SIZE_T ReadHeader(char* Text, SIZE_T Size, SIZE_T Count, void* Context);
    static SIZE_T ReadBody(char* Data, SIZE_T Size, SIZE_T Count, void* Context);

    const FString Url;
    const FString Origin;
    const FString Connection;
    const FString Cookie;
    const FString Scope;
    const FString Body;
    const bool bPost;
    const bool bEvents;
    const double Timeout;
    const int32 BufferBytes;
    FCriticalSection Lock;
    FDelivery Delivery;
    FThreadSafeBool bCanceled = false;
    void* Handle = nullptr;
    curl_slist* Headers = nullptr;
};

class FOpenLegendHttp final : private FRunnable
{
public:
    FOpenLegendHttp();
    ~FOpenLegendHttp() override;
    bool IsReady() const { return Thread != nullptr; }
    void Start(TSharedRef<FOpenLegendHttpCall, ESPMode::ThreadSafe> Call);
    void Wake();

private:
    uint32 Run() override;

    FCriticalSection Lock;
    TArray<TSharedRef<FOpenLegendHttpCall, ESPMode::ThreadSafe>> Pending;
    void* MultiHandle = nullptr;
    bool bCurlInitialized = false;
    FRunnableThread* Thread = nullptr;
    FThreadSafeBool bStop = false;
};
