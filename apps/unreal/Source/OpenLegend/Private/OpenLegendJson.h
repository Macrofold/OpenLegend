#pragma once

#include "Dom/JsonObject.h"

namespace OpenLegend
{
    using FObject = TSharedPtr<const FJsonObject>;

    inline bool SameWireText(const FString& First, const FString& Second)
    {
        return First.Equals(Second, ESearchCase::CaseSensitive);
    }

    inline FObject Object(const FObject& Parent, const TCHAR* Key)
    {
        const TSharedPtr<FJsonObject>* Field = nullptr;
        return Parent && Parent->TryGetObjectField(Key, Field) ? FObject(*Field) : nullptr;
    }

    inline FString String(const FObject& Parent, const TCHAR* Key)
    {
        FString Value;
        if (Parent) Parent->TryGetStringField(Key, Value);
        return Value;
    }

    inline bool Number(const FObject& Parent, const TCHAR* Key, double& Value)
    {
        return Parent && Parent->TryGetNumberField(Key, Value) && FMath::IsFinite(Value);
    }

    inline double NumberOr(const FObject& Parent, const TCHAR* Key, double Default)
    {
        double Value;
        return Number(Parent, Key, Value) ? Value : Default;
    }

    inline bool Bool(const FObject& Parent, const TCHAR* Key)
    {
        bool Value = false;
        return Parent && Parent->TryGetBoolField(Key, Value) && Value;
    }

    inline bool Point(const FObject& Object, FVector& Value)
    {
        return Number(Object, TEXT("x"), Value.X) && Number(Object, TEXT("y"), Value.Y)
            && Number(Object, TEXT("z"), Value.Z);
    }

    inline TSharedRef<FJsonObject> EncodePoint(const FVector& Point)
    {
        auto Result = MakeShared<FJsonObject>();
        Result->SetNumberField(TEXT("x"), Point.X);
        Result->SetNumberField(TEXT("y"), Point.Y);
        Result->SetNumberField(TEXT("z"), Point.Z);
        return Result;
    }

    inline const TArray<TSharedPtr<FJsonValue>>& Array(const FObject& Parent, const TCHAR* Key)
    {
        static const TArray<TSharedPtr<FJsonValue>> Empty;
        const TArray<TSharedPtr<FJsonValue>>* Value = nullptr;
        return Parent && Parent->TryGetArrayField(Key, Value) ? *Value : Empty;
    }

    inline FObject Record(const TSharedPtr<FJsonValue>& Value)
    {
        return Value && Value->Type == EJson::Object ? FObject(Value->AsObject()) : nullptr;
    }
}
