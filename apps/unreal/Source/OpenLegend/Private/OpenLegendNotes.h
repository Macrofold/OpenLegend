#pragma once

#include "OpenLegendJson.h"
#include "Templates/Function.h"
#include "Templates/SharedPointer.h"

class SWidget;
class UOpenLegendSession;

/** Opens the scoped personal notes reader and writes through Rust's per-note revision check. */
TSharedRef<SWidget> MakeOpenLegendNotes(UOpenLegendSession& Session, TFunction<void()> Opened);

/** Edits the controlling observer's nickname for a currently permitted contact. */
TSharedRef<SWidget> MakeOpenLegendNickname(UOpenLegendSession& Session,
    TFunction<OpenLegend::FObject()> SelectedContact, TFunction<void()> Opened);
