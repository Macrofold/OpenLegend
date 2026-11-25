#include "Net/OpenLegendDesktopLogin.h"

#include "Net/OpenLegendWire.h"
#include "HAL/PlatformProcess.h"
#include "HAL/PlatformTime.h"
#include "IPAddress.h"
#include "Misc/Base64.h"
#include "Misc/Paths.h"
#include "SocketSubsystem.h"
#include "Sockets.h"
#include "SocketTypes.h"

THIRD_PARTY_INCLUDES_START
// OpenSSL's UI typedef conflicts with Unreal's namespace of the same name.
#define UI OPENSSL_UI
#include <openssl/evp.h>
#include <openssl/rand.h>
#undef UI
#if PLATFORM_MAC
#include <Security/Security.h>
#include <fcntl.h>
#include <sys/file.h>
#include <sys/stat.h>
#include <unistd.h>
#endif
THIRD_PARTY_INCLUDES_END

#if PLATFORM_WINDOWS
#include "Windows/AllowWindowsPlatformTypes.h"
#include "Windows/WindowsHWrapper.h"
#include <dpapi.h>
#include <wincred.h>
#include "Windows/HideWindowsPlatformTypes.h"
#endif

namespace
{
constexpr auto CallbackPath = TEXT("/openlegend/auth/callback");

FString Base64Url(const uint8* Bytes, uint32 Size)
{
    FString Text = FBase64::Encode(Bytes, Size);
    Text.ReplaceInline(TEXT("+"), TEXT("-"));
    Text.ReplaceInline(TEXT("/"), TEXT("_"));
    while (Text.RemoveFromEnd(TEXT("="))) {}
    return Text;
}

FString RandomText()
{
    uint8 Bytes[32];
    return RAND_bytes(Bytes, UE_ARRAY_COUNT(Bytes)) == 1 ? Base64Url(Bytes, UE_ARRAY_COUNT(Bytes)) : FString();
}

bool RedirectCode(const FString& Request, const FString& ExpectedHost, const FString& ExpectedState, FString& Code)
{
    TArray<FString> Lines;
    Request.ParseIntoArrayLines(Lines, false);
    if (Lines.IsEmpty() || !Lines[0].RemoveFromEnd(TEXT(" HTTP/1.1"), ESearchCase::CaseSensitive))
    {
        return false;
    }
    const FString Prefix = FString(TEXT("GET ")) + CallbackPath + TEXT("?");
    if (!Lines[0].RemoveFromStart(Prefix, ESearchCase::CaseSensitive))
    {
        return false;
    }
    bool bCorrectHost = false;
    for (int32 Index = 1; Index < Lines.Num(); ++Index)
    {
        FString Header = Lines[Index];
        if (Header.RemoveFromStart(TEXT("Host:"), ESearchCase::IgnoreCase))
        {
            if (bCorrectHost || Header.TrimStartAndEnd() != ExpectedHost)
            {
                return false;
            }
            bCorrectHost = true;
        }
    }
    TArray<FString> Fields;
    Lines[0].ParseIntoArray(Fields, TEXT("&"), false);
    FString State;
    Code.Reset();
    for (const FString& Field : Fields)
    {
        FString Key;
        FString Value;
        if (!Field.Split(TEXT("="), &Key, &Value))
        {
            return false;
        }
        if (Key.Equals(TEXT("state"), ESearchCase::CaseSensitive) && State.IsEmpty())
        {
            State = Value;
        }
        else if (Key.Equals(TEXT("code"), ESearchCase::CaseSensitive) && Code.IsEmpty())
        {
            Code = Value;
        }
        else
        {
            return false;
        }
    }
    return bCorrectHost && Fields.Num() == 2 && State.Equals(ExpectedState, ESearchCase::CaseSensitive) &&
        OpenLegendWire::IsSessionCookie(Code);
}

// A maximum-sized 16 KiB gameplay request plus the pending record metadata.
constexpr int32 MaxVaultBytes = 17 * 1024;

#if PLATFORM_MAC
// The lock contains no credentials. Use the account's OS temp directory so different
// installs of the client serialize changes to the same Keychain entry.
class FStoreLock
{
public:
    FStoreLock()
    {
        const FString Path = FPaths::Combine(FPlatformProcess::UserTempDir(), TEXT("openlegend-desktop-keychain.lock"));
        Descriptor = open(TCHAR_TO_UTF8(*Path), O_CREAT | O_CLOEXEC | O_NOFOLLOW | O_RDWR, 0600);
        struct stat File {};
        bHeld = Descriptor >= 0 && fstat(Descriptor, &File) == 0 &&
            S_ISREG(File.st_mode) && File.st_uid == geteuid() && flock(Descriptor, LOCK_EX | LOCK_NB) == 0;
    }
    ~FStoreLock()
    {
        if (Descriptor >= 0)
        {
            close(Descriptor);
        }
    }
    bool IsHeld() const { return bHeld; }

private:
    int Descriptor = -1;
    bool bHeld = false;
};

CFMutableDictionaryRef Entry(const FString& Origin)
{
    CFMutableDictionaryRef Query = CFDictionaryCreateMutable(nullptr, 0,
        &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
    CFStringRef Environment = CFStringCreateWithCString(nullptr, TCHAR_TO_UTF8(*Origin), kCFStringEncodingUTF8);
    CFDictionarySetValue(Query, kSecClass, kSecClassGenericPassword);
    CFDictionarySetValue(Query, kSecAttrService, CFSTR("ai.openlegend.desktop"));
    CFDictionarySetValue(Query, kSecAttrAccount, Environment);
    CFRelease(Environment);
    return Query;
}

FString LoadEntry(const FString& Origin, bool* bReadable = nullptr)
{
    CFMutableDictionaryRef Query = Entry(Origin);
    CFDictionarySetValue(Query, kSecReturnData, kCFBooleanTrue);
    CFDictionarySetValue(Query, kSecMatchLimit, kSecMatchLimitOne);
    CFTypeRef Value = nullptr;
    FString Cookie;
    const OSStatus Status = SecItemCopyMatching(Query, &Value);
    const auto Bytes = Status == errSecSuccess && Value && CFGetTypeID(Value) == CFDataGetTypeID()
        ? static_cast<CFDataRef>(Value) : nullptr;
    const CFIndex Length = Bytes ? CFDataGetLength(Bytes) : 0;
    const bool bValid = Length > 0 && Length <= MaxVaultBytes;
    if (bValid)
    {
        FUTF8ToTCHAR Text(reinterpret_cast<const ANSICHAR*>(CFDataGetBytePtr(Bytes)), static_cast<int32>(Length));
        Cookie = FString(Text.Length(), Text.Get());
    }
    if (bReadable)
    {
        *bReadable = bValid || Status == errSecItemNotFound;
    }
    if (Value)
    {
        CFRelease(Value);
    }
    CFRelease(Query);
    return Cookie;
}
#elif PLATFORM_WINDOWS
class FStoreLock
{
public:
    FStoreLock()
    {
        Mutex = ::CreateMutexW(nullptr, false, L"Local\\OpenLegendDesktopCredential");
        if (Mutex)
        {
            const uint32 Result = ::WaitForSingleObject(Mutex, 0);
            bHeld = Result == WAIT_OBJECT_0 || Result == WAIT_ABANDONED;
        }
    }
    ~FStoreLock()
    {
        if (Mutex)
        {
            if (bHeld)
            {
                ::ReleaseMutex(Mutex);
            }
            ::CloseHandle(Mutex);
        }
    }
    bool IsHeld() const { return bHeld; }

private:
    void* Mutex = nullptr;
    bool bHeld = false;
};

FString CredentialTarget(const FString& Origin)
{
    return TEXT("OpenLegend desktop ") + Origin;
}

FString PartName(int32 Index)
{
    return FString::Printf(TEXT("OpenLegend_Receipt_%02d"), Index);
}

DATA_BLOB Blob(const void* Bytes, int32 Count)
{
    return {static_cast<decltype(DATA_BLOB::cbData)>(Count),
        const_cast<uint8*>(static_cast<const uint8*>(Bytes))};
}

FString DecodeVaultData(const void* Data, int32 Count)
{
    if (!Data || Count <= 0 || Count > MaxVaultBytes) return {};
    const FUTF8ToTCHAR Text(reinterpret_cast<const ANSICHAR*>(Data), Count);
    return FString(Text.Length(), Text.Get());
}

FString DecodeVaultEntry(const FString& Origin, const CREDENTIALW& Entry)
{
    if (!Entry.CredentialBlob || Entry.CredentialBlobSize == 0
        || Entry.CredentialBlobSize > CRED_MAX_CREDENTIAL_BLOB_SIZE)
        return {};
    if (Entry.AttributeCount == 0)
        return DecodeVaultData(Entry.CredentialBlob, Entry.CredentialBlobSize);
    if (!Entry.Attributes || Entry.AttributeCount > CRED_MAX_ATTRIBUTES) return {};

    // Credential attributes are not used as secret plaintext storage. The
    // entire record is protected by the user's DPAPI key and bound to this entry.
    constexpr int32 PartWidth = CRED_MAX_VALUE_SIZE;
    const int32 Parts = Entry.AttributeCount;
    TArray<uint8> Ciphertext;
    const int32 First = Entry.CredentialBlobSize;
    Ciphertext.SetNumUninitialized(First + Parts * PartWidth);
    FMemory::Memcpy(Ciphertext.GetData(), Entry.CredentialBlob, First);
    uint64 Seen = 0;
    int32 Size = 0;
    for (int32 Offset = 0; Offset < Parts; ++Offset)
    {
        const auto& Part = Entry.Attributes[Offset];
        if (!Part.Keyword || !Part.Value || Part.ValueSize == 0 || Part.ValueSize > PartWidth) return {};
        const FString Keyword(Part.Keyword);
        int32 Index = 0;
        if (!LexTryParseString(Index, *Keyword.Right(2)) || Index < 0 || Index >= Parts
            || !Keyword.Equals(PartName(Index), ESearchCase::CaseSensitive)
            || (Seen & (uint64(1) << Index)) || (Index < Parts - 1 && Part.ValueSize != PartWidth))
            return {};
        Seen |= uint64(1) << Index;
        const int32 Start = First + Index * PartWidth;
        FMemory::Memcpy(Ciphertext.GetData() + Start, Part.Value, Part.ValueSize);
        if (Index == Parts - 1) Size = Start + Part.ValueSize;
    }
    auto Input = Blob(Ciphertext.GetData(), Size);
    const FTCHARToUTF8 Scope(*Origin, Origin.Len());
    auto Binding = Blob(Scope.Get(), Scope.Length());
    DATA_BLOB Plaintext{};
    if (!::CryptUnprotectData(&Input, nullptr, &Binding, nullptr, nullptr,
        CRYPTPROTECT_UI_FORBIDDEN, &Plaintext)) return {};
    const FString Text = Plaintext.cbData <= MaxVaultBytes
        ? DecodeVaultData(Plaintext.pbData, Plaintext.cbData) : FString();
    if (Plaintext.pbData)
    {
        ::SecureZeroMemory(Plaintext.pbData, Plaintext.cbData);
        ::LocalFree(Plaintext.pbData);
    }
    return Text;
}

bool WriteVaultEntry(const FString& Origin, const FTCHARToUTF8& Bytes)
{
    FString Target = CredentialTarget(Origin);
    CREDENTIALW Entry{};
    Entry.Type = CRED_TYPE_GENERIC;
    Entry.TargetName = Target.GetCharArray().GetData();
    Entry.Persist = CRED_PERSIST_LOCAL_MACHINE;
    if (Bytes.Length() <= CRED_MAX_CREDENTIAL_BLOB_SIZE)
    {
        Entry.CredentialBlob = Blob(Bytes.Get(), Bytes.Length()).pbData;
        Entry.CredentialBlobSize = Bytes.Length();
        return ::CredWriteW(&Entry, 0) != 0;
    }

    auto Plaintext = Blob(Bytes.Get(), Bytes.Length());
    const FTCHARToUTF8 Scope(*Origin, Origin.Len());
    auto Binding = Blob(Scope.Get(), Scope.Length());
    DATA_BLOB Protected{};
    if (!::CryptProtectData(&Plaintext, nullptr, &Binding, nullptr, nullptr,
        CRYPTPROTECT_UI_FORBIDDEN, &Protected)) return false;
    constexpr int32 Maximum = CRED_MAX_CREDENTIAL_BLOB_SIZE + CRED_MAX_ATTRIBUTES * CRED_MAX_VALUE_SIZE;
    bool bWritten = false;
    if (Protected.cbData > 1 && Protected.cbData <= Maximum)
    {
        // One OS write commits the original receipt as a whole, with no
        // separate records to recover if the process dies mid-write.
        Entry.CredentialBlob = Protected.pbData;
        const int32 Count = Protected.cbData;
        int32 At = FMath::Min<int32>(Count - 1, CRED_MAX_CREDENTIAL_BLOB_SIZE);
        Entry.CredentialBlobSize = At;
        FString Names[CRED_MAX_ATTRIBUTES];
        CREDENTIAL_ATTRIBUTEW Attributes[CRED_MAX_ATTRIBUTES]{};
        while (At < Count)
        {
            const int32 Index = Entry.AttributeCount++;
            Names[Index] = PartName(Index);
            auto& Part = Attributes[Index];
            Part.Keyword = Names[Index].GetCharArray().GetData();
            Part.ValueSize = FMath::Min<int32>(Count - At, CRED_MAX_VALUE_SIZE);
            Part.Value = Protected.pbData + At;
            At += Part.ValueSize;
        }
        Entry.Attributes = Attributes;
        bWritten = ::CredWriteW(&Entry, 0) != 0;
    }
    ::LocalFree(Protected.pbData);
    return bWritten;
}

FString LoadEntry(const FString& Origin, bool* bReadable = nullptr)
{
    PCREDENTIALW Entry = nullptr;
    if (!::CredReadW(*CredentialTarget(Origin), CRED_TYPE_GENERIC, 0, &Entry))
    {
        if (bReadable)
        {
            *bReadable = ::GetLastError() == ERROR_NOT_FOUND;
        }
        return {};
    }
    const FString Cookie = DecodeVaultEntry(Origin, *Entry);
    if (bReadable)
    {
        *bReadable = !Cookie.IsEmpty();
    }
    ::CredFree(Entry);
    return Cookie;
}
#endif
}

FOpenLegendDesktopLogin::~FOpenLegendDesktopLogin()
{
    Close(Client);
    Close(Listener);
}

void FOpenLegendDesktopLogin::Close(FSocket*& Socket)
{
    if (Socket)
    {
        ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM)->DestroySocket(Socket);
        Socket = nullptr;
    }
}

bool FOpenLegendDesktopLogin::Start(const FString& Origin, const FString& Invite)
{
    State = RandomText();
    Verifier = RandomText();
    const FTCHARToUTF8 VerifierBytes(*Verifier);
    uint8 Digest[32];
    unsigned Length = 0;
    if (State.IsEmpty() || Verifier.IsEmpty() ||
        EVP_Digest(VerifierBytes.Get(), VerifierBytes.Length(), Digest, &Length, EVP_sha256(), nullptr) != 1 ||
        Length != UE_ARRAY_COUNT(Digest))
    {
        return false;
    }

    auto* Sockets = ISocketSubsystem::Get(PLATFORM_SOCKETSUBSYSTEM);
    auto Address = Sockets->CreateInternetAddr();
    bool bAddressValid = false;
    Address->SetIp(TEXT("127.0.0.1"), bAddressValid);
    Address->SetPort(0);
    Listener = Sockets->CreateSocket(NAME_Stream, TEXT("OpenLegendSignIn"), FNetworkProtocolTypes::IPv4);
    if (!bAddressValid || !Listener || !Listener->SetNonBlocking(true) || !Listener->Bind(*Address) ||
        !Listener->Listen(1))
    {
        return false;
    }
    Listener->GetAddress(*Address);
    if (Address->GetPort() <= 0)
    {
        return false;
    }
    Host = FString::Printf(TEXT("127.0.0.1:%d"), Address->GetPort());
    RedirectUri = TEXT("http://") + Host + CallbackPath;
    FString Url = Origin + TEXT("/auth/desktop/start?redirectUri=") + OpenLegendWire::UrlEncode(RedirectUri) +
        TEXT("&state=") + State + TEXT("&challenge=") + Base64Url(Digest, Length);
    if (!Invite.IsEmpty())
    {
        if (!OpenLegendWire::IsSessionCookie(Invite))
        {
            return false;
        }
        Url += TEXT("&invite=") + Invite;
    }
    Deadline = FPlatformTime::Seconds() + 300;
    FString Error;
    FPlatformProcess::LaunchURL(*Url, nullptr, &Error);
    return Error.IsEmpty();
}

FOpenLegendDesktopLogin::EResult FOpenLegendDesktopLogin::Poll(FString& Code)
{
    const double Now = FPlatformTime::Seconds();
    if (!Listener || Now >= Deadline)
    {
        return EResult::Expired;
    }
    if (Client && Now >= ClientDeadline)
    {
        Close(Client);
        Request.Reset();
    }
    if (!Client)
    {
        bool bPending = false;
        if (!Listener->HasPendingConnection(bPending) || !bPending)
        {
            return EResult::Waiting;
        }
        Client = Listener->Accept(TEXT("OpenLegendSignInCallback"));
        if (!Client || !Client->SetNonBlocking(true))
        {
            Close(Client);
            return EResult::Waiting;
        }
        ClientDeadline = Now + 2;
    }
    uint8 Chunk[2048];
    int32 Count = 0;
    if (Client->Recv(Chunk, UE_ARRAY_COUNT(Chunk), Count) && Count > 0)
    {
        Request.Append(Chunk, Count);
    }
    if (Request.Num() > 8192)
    {
        Close(Client);
        Request.Reset();
        return EResult::Waiting;
    }
    for (int32 I = 0; I + 3 < Request.Num(); ++I)
    {
        if (FMemory::Memcmp(Request.GetData() + I, "\r\n\r\n", 4) != 0)
        {
            continue;
        }
        const FUTF8ToTCHAR Text(reinterpret_cast<const ANSICHAR*>(Request.GetData()), I);
        const bool bValid = RedirectCode(FString(Text.Length(), Text.Get()), Host, State, Code);
        const ANSICHAR* Response = bValid
            ? "HTTP/1.1 200 OK\r\nCache-Control: no-store\r\nReferrer-Policy: no-referrer\r\nContent-Type: text/plain; charset=utf-8\r\nConnection: close\r\n\r\nReturn to Open Legend to continue."
            : "HTTP/1.1 400 Bad Request\r\nCache-Control: no-store\r\nConnection: close\r\nContent-Length: 0\r\n\r\n";
        int32 Sent = 0;
        Client->Send(reinterpret_cast<const uint8*>(Response), FCStringAnsi::Strlen(Response), Sent);
        Close(Client);
        Request.Reset();
        return bValid ? EResult::Ready : EResult::Waiting;
    }
    return EResult::Waiting;
}

FString OpenLegendCredentials::Load(const FString& Origin)
{
#if PLATFORM_MAC || PLATFORM_WINDOWS
    FString Cookie = LoadEntry(Origin);
    if (OpenLegendWire::IsSessionCookie(Cookie))
    {
        return Cookie;
    }
#endif
    return {};
}

namespace
{
bool StoreEntry(const FString& Origin, const FString& Text)
{
    const FTCHARToUTF8 Bytes(*Text, Text.Len());
    if (Bytes.Length() == 0 || Bytes.Length() > MaxVaultBytes)
    {
        return false;
    }
#if PLATFORM_MAC
    CFMutableDictionaryRef Query = Entry(Origin);
    CFDataRef Data = CFDataCreate(nullptr, reinterpret_cast<const UInt8*>(Bytes.Get()), Bytes.Length());
    const void* Key = kSecValueData;
    const void* Value = Data;
    CFDictionaryRef Update = CFDictionaryCreate(nullptr, &Key, &Value, 1,
        &kCFTypeDictionaryKeyCallBacks, &kCFTypeDictionaryValueCallBacks);
    OSStatus Result = SecItemUpdate(Query, Update);
    if (Result == errSecItemNotFound)
    {
        CFDictionarySetValue(Query, kSecValueData, Data);
        Result = SecItemAdd(Query, nullptr);
    }
    CFRelease(Update);
    CFRelease(Data);
    CFRelease(Query);
    return Result == errSecSuccess;
#elif PLATFORM_WINDOWS
    return WriteVaultEntry(Origin, Bytes);
#else
    return false;
#endif
}

void DeleteEntry(const FString& Origin)
{
#if PLATFORM_MAC
    CFMutableDictionaryRef Query = Entry(Origin);
    SecItemDelete(Query);
    CFRelease(Query);
#elif PLATFORM_WINDOWS
    ::CredDeleteW(*CredentialTarget(Origin), CRED_TYPE_GENERIC, 0);
#endif
}
}

bool OpenLegendCredentials::Save(const FString& Origin, const FString& Cookie)
{
#if PLATFORM_MAC || PLATFORM_WINDOWS
    FStoreLock Lock;
    return Lock.IsHeld() && OpenLegendWire::IsSessionCookie(Cookie) && StoreEntry(Origin, Cookie);
#else
    return false;
#endif
}

void OpenLegendCredentials::RemoveOwned(const FString& Origin, const FString& Cookie)
{
    RemovePending(Origin, Cookie);
}

FString OpenLegendCredentials::LoadPending(const FString& Key)
{
#if PLATFORM_MAC || PLATFORM_WINDOWS
    return LoadEntry(Key);
#else
    return {};
#endif
}

bool OpenLegendCredentials::SavePending(const FString& Key, const FString& Encoded)
{
#if PLATFORM_MAC || PLATFORM_WINDOWS
    FStoreLock Lock;
    if (!Lock.IsHeld())
    {
        return false;
    }
    bool bReadable = false;
    return LoadEntry(Key, &bReadable).IsEmpty() && bReadable && StoreEntry(Key, Encoded);
#else
    return false;
#endif
}

void OpenLegendCredentials::RemovePending(const FString& Key, const FString& Expected)
{
#if PLATFORM_MAC || PLATFORM_WINDOWS
    FStoreLock Lock;
    if (Lock.IsHeld() && !Expected.IsEmpty() && LoadEntry(Key).Equals(Expected, ESearchCase::CaseSensitive))
    {
        DeleteEntry(Key);
    }
#endif
}
