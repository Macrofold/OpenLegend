#pragma once

#include "Templates/Function.h"
#include "Templates/SharedPointer.h"

class FJsonObject;
class SWidget;
class UOpenLegendSession;

/** Opens the current character's private place reader. Movement uses the supplied command receipt owner. */
TSharedRef<SWidget> MakeOpenLegendPlaces(
    UOpenLegendSession& Session,
    TFunction<void()> OnOpen,
    TFunction<bool()> CanSubmitCommand,
    TFunction<void(TSharedPtr<FJsonObject>)> SubmitCommand);
