#include "Net/OpenLegendWire.h"

#include "Dom/JsonObject.h"
#include "GenericPlatform/GenericPlatformHttp.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

namespace
{
using FValue = TSharedPtr<FJsonValue>;
using FRows = TArray<FValue>;

const FJsonObject* Object(const FValue& Value)
{
    const TSharedPtr<FJsonObject>* Result = nullptr;
    return Value && Value->TryGetObject(Result) && Result && *Result ? Result->Get() : nullptr;
}

bool OptionalList(const FJsonObject& Source, const TCHAR* Field, const FRows*& Rows)
{
    Rows = nullptr;
    return !Source.HasField(Field) || Source.TryGetArrayField(Field, Rows);
}

bool MergeObject(const FJsonObject& Existing, const FJsonObject* Set, const FRows* Remove, FJsonObject& Next)
{
    Next.Values = Existing.Values;
    if (Remove)
    {
        for (const FValue& Entry : *Remove)
        {
            FString Name;
            if (!Entry || Entry->Type != EJson::String || !Entry->TryGetString(Name) ||
                !Next.HasField(Name) || (Set && Set->HasField(Name)))
            {
                return false;
            }
            Next.RemoveField(Name);
        }
    }
    if (Set)
    {
        for (const auto& Field : Set->Values)
        {
            Next.Values.Add(Field.Key, Field.Value);
        }
    }
    return true;
}

bool ApplyRows(const FRows& Existing, const FJsonObject& Delta, bool bEntities, FRows& Next)
{
    const FRows* Remove;
    const FRows* Add;
    const FRows* Update;
    const FRows* Order;
    if (!OptionalList(Delta, TEXT("remove"), Remove) ||
        !OptionalList(Delta, bEntities ? TEXT("add") : TEXT("upsert"), Add) ||
        !OptionalList(Delta, TEXT("update"), Update) ||
        !OptionalList(Delta, TEXT("order"), Order))
    {
        return false;
    }

    TMap<FString, FValue> Rows;
    Rows.Reserve(Existing.Num());
    TArray<FString> ExistingOrder;
    if (!Order)
    {
        ExistingOrder.Reserve(Existing.Num());
    }
    for (const FValue& Value : Existing)
    {
        const FJsonObject* Row = Object(Value);
        FString Id;
        if (!Row || !Row->TryGetStringField(TEXT("id"), Id) || Id.IsEmpty() || Rows.Contains(Id))
        {
            return false;
        }
        Rows.Add(Id, Value);
        if (!Order)
        {
            ExistingOrder.Add(Id);
        }
    }
    TSet<FString> Changed;
    if (Remove)
    {
        for (const FValue& Entry : *Remove)
        {
            FString Id;
            if (!Entry || Entry->Type != EJson::String || !Entry->TryGetString(Id) ||
                Changed.Contains(Id) || Rows.Remove(Id) != 1)
            {
                return false;
            }
            Changed.Add(Id);
        }
    }
    if (Add)
    {
        for (const FValue& Entry : *Add)
        {
            const FJsonObject* Row = Object(Entry);
            FString Id;
            if (!Row || !Row->TryGetStringField(TEXT("id"), Id) || Id.IsEmpty() ||
                Changed.Contains(Id) || (bEntities && Rows.Contains(Id)))
            {
                return false;
            }
            Changed.Add(Id);
            if (!Order && !Rows.Contains(Id))
            {
                ExistingOrder.Add(Id);
            }
            Rows.Add(Id, Entry);
        }
    }
    if (Update)
    {
        if (!bEntities)
        {
            return false;
        }
        for (const FValue& Entry : *Update)
        {
            const FJsonObject* Change = Object(Entry);
            FString Id;
            const FRows* Drop;
            const TSharedPtr<FJsonObject>* Set = nullptr;
            if (!Change || !Change->TryGetStringField(TEXT("id"), Id) || Changed.Contains(Id) ||
                !OptionalList(*Change, TEXT("remove"), Drop) ||
                (Change->HasField(TEXT("set")) && !Change->TryGetObjectField(TEXT("set"), Set)) ||
                (Set && (*Set)->HasField(TEXT("id"))))
            {
                return false;
            }
            auto* Value = Rows.Find(Id);
            const FJsonObject* Before = Value ? Object(*Value) : nullptr;
            auto After = MakeShared<FJsonObject>();
            if (!Before || !MergeObject(*Before, Set ? Set->Get() : nullptr, Drop, *After))
            {
                return false;
            }
            for (const TCHAR* Required : { TEXT("id"), TEXT("observation"), TEXT("name"), TEXT("kind"),
                TEXT("subtype"), TEXT("position"), TEXT("supportSurfaceId"), TEXT("heading"),
                TEXT("appearance"), TEXT("radius"), TEXT("status") })
            {
                if (!After->HasField(Required))
                {
                    return false;
                }
            }
            Changed.Add(Id);
            *Value = MakeShared<FJsonValueObject>(After);
        }
    }

    Next.Reserve(Rows.Num());
    if (Order)
    {
        for (const FValue& Entry : *Order)
        {
            FString Id;
            FValue Found;
            if (!Entry || Entry->Type != EJson::String || !Entry->TryGetString(Id) ||
                !Rows.RemoveAndCopyValue(Id, Found))
            {
                return false;
            }
            Next.Add(MoveTemp(Found));
        }
        return Rows.IsEmpty();
    }
    for (const FString& Id : ExistingOrder)
    {
        if (FValue* Found = Rows.Find(Id))
        {
            Next.Add(*Found);
        }
    }
    return Next.Num() == Rows.Num();
}

// UE's stock JSON writer stops a string at its first NUL. Length-based escaping keeps that
// unit, isolated UTF-16 surrogates and a literal backslash-u distinct on the Rust wire.
void WriteString(FString& Output, FStringView Text)
{
    static_assert(sizeof(TCHAR) == 2, "The desktop wire expects UTF-16 TCHAR.");
    Output.AppendChar(TEXT('"'));
    for (int32 Index = 0; Index < Text.Len(); ++Index)
    {
        const uint16 Unit = static_cast<uint16>(Text[Index]);
        if (Unit == '"' || Unit == '\\')
        {
            Output.AppendChar(TEXT('\\'));
            Output.AppendChar(Unit);
        }
        else if (Unit < 32 || Unit > 126)
        {
            constexpr TCHAR Hex[] = TEXT("0123456789abcdef");
            const TCHAR Escape[] = { TEXT('\\'), TEXT('u'), Hex[Unit >> 12], Hex[(Unit >> 8) & 15],
                Hex[(Unit >> 4) & 15], Hex[Unit & 15] };
            Output.AppendChars(Escape, UE_ARRAY_COUNT(Escape));
        }
        else
        {
            Output.AppendChar(Unit);
        }
    }
    Output.AppendChar(TEXT('"'));
}

void WriteValue(FString& Output, const FJsonValue& Value);

void WriteFields(FString& Output, const FJsonObject& ObjectValue)
{
    Output.AppendChar(TEXT('{'));
    bool bFirst = true;
    for (const auto& Field : ObjectValue.Values)
    {
        if (!bFirst)
        {
            Output.AppendChar(TEXT(','));
        }
        bFirst = false;
        WriteString(Output, Field.Key.ToView());
        Output.AppendChar(TEXT(':'));
        WriteValue(Output, *Field.Value);
    }
    Output.AppendChar(TEXT('}'));
}

void WriteValue(FString& Output, const FJsonValue& Value)
{
    switch (Value.Type)
    {
    case EJson::Object:
        WriteFields(Output, *Value.AsObject());
        return;
    case EJson::Array:
    {
        Output.AppendChar(TEXT('['));
        const auto& Elements = Value.AsArray();
        for (int32 Index = 0; Index < Elements.Num(); ++Index)
        {
            if (Index > 0)
            {
                Output.AppendChar(TEXT(','));
            }
            WriteValue(Output, *Elements[Index]);
        }
        Output.AppendChar(TEXT(']'));
        return;
    }
    case EJson::String:
        WriteString(Output, Value.AsString());
        return;
    case EJson::Number:
        Output += FString::Printf(TEXT("%.17g"), Value.AsNumber());
        return;
    case EJson::Boolean:
        Output += Value.AsBool() ? TEXT("true") : TEXT("false");
        return;
    default:
        Output += TEXT("null");
    }
}
}

TSharedPtr<FJsonObject> OpenLegendWire::ReadObject(const TArray<uint8>& Bytes)
{
    if (Bytes.IsEmpty())
    {
        return nullptr;
    }
    const FUTF8ToTCHAR Text(reinterpret_cast<const ANSICHAR*>(Bytes.GetData()), Bytes.Num());
    auto Reader = TJsonReaderFactory<>::Create(FString(Text.Length(), Text.Get()));
    TSharedPtr<FJsonObject> Result;
    return FJsonSerializer::Deserialize(Reader, Result) ? Result : nullptr;
}

FString OpenLegendWire::WriteObject(const FJsonObject& Value)
{
    FString Text;
    WriteFields(Text, Value);
    return Text;
}

bool OpenLegendWire::ReadRevision(const FJsonObject& ObjectValue, const TCHAR* Field, uint64& Revision)
{
    double Value;
    if (!ObjectValue.TryGetNumberField(Field, Value) || !FMath::IsFinite(Value) ||
        Value < 0.0 || Value > 9007199254740991.0 || FMath::FloorToDouble(Value) != Value)
    {
        return false;
    }
    Revision = static_cast<uint64>(Value);
    return true;
}

bool OpenLegendWire::IsSessionCookie(const FString& Value)
{
    return Value.Len() == 64 && Value.FindLastCharByPredicate([](TCHAR Unit)
    {
        return !((Unit >= TEXT('0') && Unit <= TEXT('9')) || (Unit >= TEXT('a') && Unit <= TEXT('f')));
    }) == INDEX_NONE;
}

FString OpenLegendWire::UrlEncode(const FString& Text)
{
    return FGenericPlatformHttp::UrlEncode(Text);
}

TSharedPtr<const FJsonObject> OpenLegendWire::Apply(const FJsonObject& Current, const FJsonObject& Patch)
{
    const TSharedPtr<FJsonObject>* Access = nullptr;
    FString Scope;
    FString CurrentScope;
    uint64 Base;
    uint64 Now;
    uint64 NextRevision;
    uint64 Version;
    double Cut;
    double BeforeCut;
    if (!Current.TryGetObjectField(TEXT("access"), Access) ||
        !(*Access)->TryGetStringField(TEXT("scope"), CurrentScope) ||
        !Patch.TryGetStringField(TEXT("scope"), Scope) || !Scope.Equals(CurrentScope, ESearchCase::CaseSensitive) ||
        !ReadRevision(Patch, TEXT("schemaVersion"), Version) || Version != 3 ||
        !ReadRevision(Patch, TEXT("baseRevision"), Base) ||
        !ReadRevision(Current, TEXT("revision"), Now) || Base != Now ||
        !ReadRevision(Patch, TEXT("revision"), NextRevision) || NextRevision <= Now ||
        !Patch.TryGetNumberField(TEXT("evaluationCut"), Cut) || !FMath::IsFinite(Cut) ||
        !Current.TryGetNumberField(TEXT("evaluationCut"), BeforeCut) || Cut < BeforeCut)
    {
        return nullptr;
    }

    auto Next = MakeShared<FJsonObject>();
    const TSharedPtr<FJsonObject>* Remove = nullptr;
    const FRows* RemoveView = nullptr;
    if (Patch.HasField(TEXT("remove")) &&
        (!Patch.TryGetObjectField(TEXT("remove"), Remove) || !OptionalList(**Remove, TEXT("view"), RemoveView)))
    {
        return nullptr;
    }
    if (!MergeObject(Current, nullptr, RemoveView, *Next))
    {
        return nullptr;
    }
    for (const TCHAR* Field : { TEXT("access"), TEXT("schemaVersion"), TEXT("worldId"),
        TEXT("saveTimeline"), TEXT("player"), TEXT("clock"), TEXT("entities"), TEXT("events") })
    {
        if (!Next->HasField(Field))
        {
            return nullptr;
        }
    }

    for (const TCHAR* Key : { TEXT("player"), TEXT("clock"), TEXT("ai") })
    {
        const TSharedPtr<FJsonObject>* Delta = nullptr;
        const TSharedPtr<FJsonObject>* Before = nullptr;
        const FRows* Drop = nullptr;
        if ((Remove && !OptionalList(**Remove, Key, Drop)) ||
            (Patch.HasField(Key) && !Patch.TryGetObjectField(Key, Delta)))
        {
            return nullptr;
        }
        if (Delta || Drop)
        {
            if (!Current.TryGetObjectField(Key, Before))
            {
                return nullptr;
            }
            auto Merged = MakeShared<FJsonObject>();
            if (!MergeObject(**Before, Delta ? Delta->Get() : nullptr, Drop, *Merged))
            {
                return nullptr;
            }
            Next->SetObjectField(Key, Merged);
        }
    }
    for (const TCHAR* Key : { TEXT("entities"), TEXT("events") })
    {
        if (Patch.HasField(Key))
        {
            const TSharedPtr<FJsonObject>* Delta = nullptr;
            const FRows* Before = nullptr;
            FRows Rows;
            if (!Patch.TryGetObjectField(Key, Delta) || !Current.TryGetArrayField(Key, Before) ||
                !ApplyRows(*Before, **Delta, FCString::Strcmp(Key, TEXT("entities")) == 0, Rows))
            {
                return nullptr;
            }
            Next->SetArrayField(Key, MoveTemp(Rows));
        }
    }
    for (const TCHAR* Key : { TEXT("evaluationCut"), TEXT("sightConfirmedThrough"),
        TEXT("communicationReferences"), TEXT("recipes"), TEXT("commandEpoch"), TEXT("historyEpoch"),
        TEXT("worldEventsRevision"), TEXT("historyRevision"), TEXT("narrator"), TEXT("conversation"),
        TEXT("milestones"), TEXT("persistence"), TEXT("cartography"), TEXT("revision") })
    {
        if (const FValue Change = Patch.TryGetField(Key))
        {
            if (RemoveView && !Next->HasField(Key) && Current.HasField(Key))
            {
                return nullptr;
            }
            Next->SetField(Key, Change);
        }
    }
    return Next;
}

bool FOpenLegendEventReader::Append(TArray<uint8>&& Incoming, int32 BufferBytes, FDispatch Dispatch)
{
    if (Incoming.Num() > BufferBytes - Buffered.Num() - Data.Num())
    {
        return false;
    }
    if (Buffered.IsEmpty())
    {
        Buffered = MoveTemp(Incoming);
    }
    else
    {
        Buffered.Append(Incoming);
    }
    for (; Scanned < Buffered.Num(); ++Scanned)
    {
        const uint8 Byte = Buffered[Scanned];
        if (bSkipLineFeed)
        {
            bSkipLineFeed = false;
            if (Byte == '\n')
            {
                LineStart = Scanned + 1;
                continue;
            }
        }
        if (Byte != '\r' && Byte != '\n')
        {
            continue;
        }
        bSkipLineFeed = Byte == '\r';
        int32 Length = Scanned - LineStart;
        const uint8* Line = Buffered.GetData() + LineStart;
        if (bFirstLine)
        {
            bFirstLine = false;
            if (Length >= 3 && Line[0] == 0xef && Line[1] == 0xbb && Line[2] == 0xbf)
            {
                Line += 3;
                Length -= 3;
            }
        }
        LineStart = Scanned + 1;
        if (Length == 0)
        {
            if ((bHasData || bComment) && !Dispatch(Event, Data))
            {
                return false;
            }
            Event.Reset();
            if (Data.GetAllocatedSize() > 256 * 1024)
            {
                Data.Empty();
            }
            else
            {
                Data.Reset();
            }
            bHasData = false;
            bComment = false;
            continue;
        }
        if (*Line == ':')
        {
            bComment = true;
            continue;
        }
        const auto SkipSpace = [](const uint8*& Value, int32& Count)
        {
            if (Count > 0 && *Value == ' ')
            {
                ++Value;
                --Count;
            }
        };
        if (Length >= 6 && FMemory::Memcmp(Line, "event:", 6) == 0)
        {
            const uint8* Value = Line + 6;
            int32 Size = Length - 6;
            SkipSpace(Value, Size);
            const FUTF8ToTCHAR Name(reinterpret_cast<const ANSICHAR*>(Value), Size);
            Event = FString(Name.Length(), Name.Get());
        }
        else if (Length >= 5 && FMemory::Memcmp(Line, "data:", 5) == 0)
        {
            const uint8* Value = Line + 5;
            int32 Size = Length - 5;
            SkipSpace(Value, Size);
            if (bHasData)
            {
                Data.Add('\n');
            }
            bHasData = true;
            Data.Append(Value, Size);
        }
    }
    if (LineStart > 0)
    {
        const EAllowShrinking Shrink = Buffered.GetAllocatedSize() > 256 * 1024
            ? EAllowShrinking::Yes : EAllowShrinking::No;
        Buffered.RemoveAt(0, LineStart, Shrink);
        Scanned -= LineStart;
        LineStart = 0;
    }
    return true;
}
