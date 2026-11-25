#pragma once

#include "Templates/Function.h"
#include "Templates/SharedPointer.h"

class FJsonObject;
class SWidget;
class UOpenLegendSession;

/** Reads permitted pages on demand and sends inventory choices through the caller's recoverable command owner. */
TSharedRef<SWidget> MakeOpenLegendReading(UOpenLegendSession& Session, TFunction<bool()> CanSubmitCommand,
    TFunction<void(TSharedPtr<FJsonObject>)> SubmitCommand);
