#pragma once

#include "OpenLegendJson.h"
#include "Templates/Function.h"

class SWidget;
class UOpenLegendSession;

struct FOpenLegendTradeActions
{
    TFunction<OpenLegend::FObject()> SelectedContact;
    TFunction<bool()> CanSubmit;
    TFunction<void(TSharedPtr<FJsonObject>)> Submit;
    TFunction<void()> Opened;
};

/** Reads terms only while open for the currently permitted contact. Submissions use the player's receipt owner. */
TSharedRef<SWidget> MakeOpenLegendTrade(UOpenLegendSession& Session, FOpenLegendTradeActions Actions);
