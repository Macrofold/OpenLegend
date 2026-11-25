#include "OpenLegendPlaces.h"

#include "Net/OpenLegendSession.h"
#include "Net/OpenLegendWire.h"
#include "OpenLegendJson.h"
#include "OpenLegendMap.h"
#include "HAL/PlatformTime.h"
#include "Misc/Guid.h"
#include "Widgets/Images/SThrobber.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Input/SComboBox.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Widgets/Input/SMultiLineEditableTextBox.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/Text/STextBlock.h"

namespace
{
using namespace OpenLegend;

struct FPlaceKey
{
    FString World, Save, Scope, Actor, Epoch, Places;

    bool IsUsable() const
    {
        return !World.IsEmpty() && !Save.IsEmpty() && !Scope.IsEmpty() && !Actor.IsEmpty() && !Epoch.IsEmpty();
    }
    bool SameOwner(const FPlaceKey& Other) const
    {
        return World.Equals(Other.World, ESearchCase::CaseSensitive)
            && Save.Equals(Other.Save, ESearchCase::CaseSensitive)
            && Scope.Equals(Other.Scope, ESearchCase::CaseSensitive)
            && Actor.Equals(Other.Actor, ESearchCase::CaseSensitive);
    }
    bool SamePrivateRead(const FPlaceKey& Other) const
    {
        return SameOwner(Other) && Epoch.Equals(Other.Epoch, ESearchCase::CaseSensitive);
    }
    bool operator==(const FPlaceKey& Other) const
    {
        return SamePrivateRead(Other)
            && Places.Equals(Other.Places, ESearchCase::CaseSensitive);
    }
};

FPlaceKey ReadKey(const FObject& View)
{
    return {
        String(View, TEXT("worldId")), String(View, TEXT("saveTimeline")),
        String(Object(View, TEXT("access")), TEXT("scope")),
        String(Object(View, TEXT("player")), TEXT("id")), String(View, TEXT("historyEpoch")),
        String(Object(View, TEXT("cartography")), TEXT("placesRevision"))
    };
}

struct FPlaceReference
{
    FString Id, Source, Revision;

    explicit FPlaceReference(const FObject& Row)
        : Id(String(Row, TEXT("id"))), Source(String(Row, TEXT("sourceId"))),
          Revision(String(Row, TEXT("revision"))) {}

    bool IsUsable() const { return !Id.IsEmpty() && !Source.IsEmpty() && !Revision.IsEmpty(); }
    bool operator==(const FPlaceReference& Other) const
    {
        return Id.Equals(Other.Id, ESearchCase::CaseSensitive)
            && Source.Equals(Other.Source, ESearchCase::CaseSensitive)
            && Revision.Equals(Other.Revision, ESearchCase::CaseSensitive);
    }
    TSharedPtr<FJsonObject> Body() const
    {
        auto Result = MakeShared<FJsonObject>();
        Result->SetStringField(TEXT("id"), Id);
        Result->SetStringField(TEXT("sourceId"), Source);
        Result->SetStringField(TEXT("revision"), Revision);
        return Result;
    }
};

enum class EMarkerWrite { Place, Remove, Note };

struct FMarkerDraft
{
    FString Id, Icon, Label, Note;
    FVector2D Point;
    uint64 Revision = 0;
    TOptional<uint64> NoteRevision;
    bool bNew = false;
};

struct FMarkerCheck
{
    FMarkerDraft Draft;
    EMarkerWrite Write;
};

struct FPlaceNoteCheck
{
    FPlaceReference Place;
    FString PageStart, Query, Generation, Text;
    uint64 Before = 0;
};

class SOpenLegendPlaces final : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SOpenLegendPlaces) {}
        SLATE_ARGUMENT(UOpenLegendSession*, Session)
        SLATE_ARGUMENT(TFunction<void()>, OnOpen)
        SLATE_ARGUMENT(TFunction<bool()>, CanSubmitCommand)
        SLATE_ARGUMENT(TFunction<void(TSharedPtr<FJsonObject>)>, SubmitCommand)
    SLATE_END_ARGS()

    void Construct(const FArguments& Args)
    {
        Session = Args._Session;
        OnOpen = Args._OnOpen;
        CanSubmit = Args._CanSubmitCommand;
        Submit = Args._SubmitCommand;
        ChildSlot[
            SNew(SVerticalBox)
            + SVerticalBox::Slot().AutoHeight()[
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot().AutoWidth()[
                    SNew(SButton).Text_Lambda([this] {
                        return FText::FromString(Object(View(), TEXT("cartography"))
                            ? TEXT("Map and places") : TEXT("Known places"));
                    })
                    .IsEnabled_Lambda([this] {
                        return !bOpen && !ActiveRead && Session.IsValid() && Session->GetView().IsValid();
                    })
                    .OnClicked(this, &SOpenLegendPlaces::Open)]
                + SHorizontalBox::Slot().AutoWidth()[
                    SNew(SButton).Text(FText::FromString(TEXT("Close map")))
                    .Visibility(this, &SOpenLegendPlaces::PanelVisibility)
                    .IsEnabled_Lambda([this] { return !bNoteDirty && !MarkerDraft && !ActiveRead; })
                    .OnClicked(this, &SOpenLegendPlaces::Close)]]
            + SVerticalBox::Slot().AutoHeight()[
                SNew(SVerticalBox).Visibility(this, &SOpenLegendPlaces::PanelVisibility)
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SHorizontalBox)
                    + SHorizontalBox::Slot().FillWidth(1)[
                        SAssignNew(Search, SEditableTextBox)
                        .HintText(FText::FromString(TEXT("Search places and markers")))
                        .ClearKeyboardFocusOnCommit(false)
                        .OnTextCommitted_Lambda([this](const FText&, ETextCommit::Type Reason)
                        {
                            if (Reason == ETextCommit::OnEnter) SearchPlaces();
                        })]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Search")))
                        .IsEnabled(this, &SOpenLegendPlaces::CanNavigate)
                        .OnClicked(this, &SOpenLegendPlaces::SearchPlaces)]]
                + SVerticalBox::Slot().AutoHeight()[
                    SAssignNew(Map, SOpenLegendMap)
                    .Visibility(this, &SOpenLegendPlaces::MapVisibility)
                    .AccessibleText(FText::FromString(TEXT("Map. Use arrow keys to pan. Use the list to find places and markers.")))
                    .Select([this](FVector2D Point, int32 Pin) { SelectMap(Point, Pin); })]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SHorizontalBox).Visibility(this, &SOpenLegendPlaces::MapVisibility)
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Zoom in")))
                        .OnClicked_Lambda([this] { Map->ZoomBy(1.4); return FReply::Handled(); })]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Zoom out")))
                        .OnClicked_Lambda([this] { Map->ZoomBy(1.0 / 1.4); return FReply::Handled(); })]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Find me")))
                        .OnClicked_Lambda([this] {
                            FVector2D Point;
                            if (ReadMapPoint(Object(Object(View(), TEXT("player")), TEXT("position")), Point))
                                Map->Focus(Point);
                            return FReply::Handled();
                        })]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Add marker")))
                        .IsEnabled_Lambda([this] { return CanNavigate() && CanWriteMarkers() && Map->CentrePoint().IsSet(); })
                        .OnClicked_Lambda([this] { return EditMarker({}); })]]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(STextBlock).Text_Lambda([this] { return Status; }).AutoWrapText(true)]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SThrobber).Visibility_Lambda([this]
                    {
                        return ActiveRead && FPlatformTime::Seconds() - Started >= 0.5
                            ? EVisibility::HitTestInvisible : EVisibility::Collapsed;
                    })]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SBox).MaxDesiredHeight(215)[
                        SAssignNew(Scroll, SScrollBox)
                        + SScrollBox::Slot()[SAssignNew(Rows, SVerticalBox)]]]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SHorizontalBox)
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Refresh")))
                        .IsEnabled(this, &SOpenLegendPlaces::CanNavigate)
                        .OnClicked(this, &SOpenLegendPlaces::Navigate, false)]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Check note")))
                        .Visibility_Lambda([this] {
                            return PendingNote ? EVisibility::Visible : EVisibility::Collapsed;
                        })
                        .IsEnabled(this, &SOpenLegendPlaces::CanRead)
                        .OnClicked_Lambda([this] { CheckNote(); return FReply::Handled(); })]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Check marker")))
                        .Visibility_Lambda([this] { return MarkerReadback ? EVisibility::Visible : EVisibility::Collapsed; })
                        .IsEnabled(this, &SOpenLegendPlaces::CanRead)
                        .OnClicked_Lambda([this] { CheckMarker(); return FReply::Handled(); })]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("More places")))
                        .IsEnabled_Lambda([this] { return CanNavigate() && !Cursor.IsEmpty() && !Inspection; })
                        .OnClicked(this, &SOpenLegendPlaces::Navigate, true)]]]
        ];
        if (auto* Owner = Session.Get())
        {
            ViewChanged = Owner->OnViewChanged.AddSP(SharedThis(this), &SOpenLegendPlaces::OnViewChanged);
        }
    }

    ~SOpenLegendPlaces() override
    {
        if (auto* Owner = Session.Get()) Owner->OnViewChanged.Remove(ViewChanged);
    }

private:
    EVisibility PanelVisibility() const { return bOpen ? EVisibility::Visible : EVisibility::Collapsed; }
    EVisibility MapVisibility() const { return Map && Map->HasBounds() ? EVisibility::Visible : EVisibility::Collapsed; }
    bool CanRead() const { return bOpen && Key.IsUsable() && !ActiveRead; }
    bool CanNavigate() const { return CanRead() && !bNoteDirty && !MarkerDraft; }

    FObject View() const { return Session.IsValid() ? Session->GetView() : nullptr; }

    FReply Open()
    {
        if (bOpen || ActiveRead) return FReply::Handled();
        Key = ReadKey(View());
        if (!Key.IsUsable()) return FReply::Handled();
        bOpen = true;
        Map->SetView(View());
        RenderPlaces();
        if (OnOpen) OnOpen();
        Navigate(false);
        return FReply::Handled();
    }

    FReply Close()
    {
        bOpen = false;
        PendingNote.Reset();
        ClearMarker();
        MarkerReadback.Reset();
        ClearPage();
        Map->ResetView();
        Cartography.Reset();
        Query.Reset();
        Search->SetText(FText::GetEmpty());
        return FReply::Handled();
    }

    void ClearPage()
    {
        ++PageGeneration;
        Cursor.Reset();
        PageStart.Reset();
        PlacesGeneration.Reset();
        Places.Reset();
        Inspection.Reset();
        ClearEditor();
        Status = FText::GetEmpty();
        Rows->ClearChildren();
        Scroll->ScrollToStart();
        UpdatePins();
    }

    void OnViewChanged()
    {
        if (!bOpen)
        {
            if (ActiveRead && !Key.SameOwner(ReadKey(View()))) ActiveRead = 0;
            return;
        }
        const auto Current = View();
        const auto Next = ReadKey(Current);
        if (!Next.SameOwner(Key))
        {
            // Scope replacement cancels the previous session callback.
            ActiveRead = 0;
            Close();
        }
        else
        {
            Map->SetView(Current);
            if (Next != Key && Next.SamePrivateRead(Key) && bNoteDirty && !ActiveRead && !PendingNote)
            {
                Places.Reset();
                UpdatePins();
                RefreshMarkerRows();
                if (!bStaleDraft)
                {
                    bStaleDraft = true;
                    Status = FText::FromString(TEXT("Known places changed. Discard your draft and reopen the place before saving."));
                }
                return;
            }
            if (!Next.SamePrivateRead(Key))
            {
                PendingNote.Reset();
                MarkerReadback.Reset();
                ClearMarker();
            }
            if (Next != Key)
            {
                Key = Next;
                if (MarkerDraft)
                {
                    // A place refresh must not remove a marker editor within its owner scope.
                    Places.Reset();
                    Cursor.Reset();
                    UpdatePins();
                }
                else
                {
                    ClearPage();
                    RenderPlaces();
                }
                Status = FText::FromString(TEXT("Known places changed. Refresh to see them."));
            }
            RefreshMarkerRows();
        }
        Key = Next;
    }

    FReply SearchPlaces()
    {
        if (CanNavigate())
        {
            FString NewQuery = Search->GetText().ToString();
            if (!Query.Equals(NewQuery, ESearchCase::CaseSensitive))
            {
                ClearPage();
                Query = MoveTemp(NewQuery);
            }
            Navigate(false);
        }
        return FReply::Handled();
    }

    FReply Navigate(bool bMore)
    {
        if (!CanNavigate() || (bMore && (Cursor.IsEmpty() || Inspection))) return FReply::Handled();
        if (Inspection) RenderPlaces();
        auto Request = MakeShared<FJsonObject>();
        if (!Query.IsEmpty()) Request->SetStringField(TEXT("query"), Query);
        const FString RequestedCursor = bMore ? Cursor : FString();
        if (bMore) Request->SetStringField(TEXT("cursor"), RequestedCursor);
        Read(TEXT("/api/known-places"), MoveTemp(Request), {}, RequestedCursor);
        return FReply::Handled();
    }

    FReply Inspect(FPlaceReference Reference)
    {
        if (CanNavigate())
        {
            for (const auto& Place : Places)
            {
                FVector2D Point;
                if (FPlaceReference(Place) == Reference && ReadMapPoint(Object(Place, TEXT("position")), Point))
                {
                    Map->Focus(Point);
                    break;
                }
            }
            Read(TEXT("/api/known-places/inspect"), Reference.Body(), Reference);
        }
        return FReply::Handled();
    }

    /** One on-demand scoped read at a time. Only the current page or exact selection owns a response. */
    void Read(const TCHAR* Route, TSharedPtr<FJsonObject> Body, TOptional<FPlaceReference> Selected,
        FString RequestedCursor = {})
    {
        auto* Owner = Session.Get();
        if (!Owner) return;
        const uint64 Read = ++ReadSequence;
        ActiveRead = Read;
        Started = FPlatformTime::Seconds();
        Status = FText::GetEmpty();
        const uint64 Generation = PageGeneration;
        const bool bSent = Owner->Send(Route, MoveTemp(Body),
            [Weak = TWeakPtr<SOpenLegendPlaces>(SharedThis(this)), Read, Generation,
                Selected = MoveTemp(Selected), RequestedCursor = MoveTemp(RequestedCursor)](int32 StatusCode, FObject Result)
            {
                if (auto Panel = Weak.Pin())
                    Panel->Finish(Read, Generation, StatusCode, Result, Selected, RequestedCursor);
            });
        if (!bSent)
        {
            ActiveRead = 0;
            Status = FText::FromString(TEXT("Could not open known places. Try refreshing."));
        }
    }

    void Finish(uint64 Read, uint64 Generation, int32 StatusCode, const FObject& Result,
        const TOptional<FPlaceReference>& Selected, const FString& RequestedCursor)
    {
        if (ActiveRead != Read) return;
        ActiveRead = 0;
        if (!bOpen || PageGeneration != Generation || Key != ReadKey(View())) return;
        const auto Place = Object(Result, TEXT("place"));
        const TArray<TSharedPtr<FJsonValue>>* Entries = nullptr;
        const bool bMatches = Result && (Selected ? FPlaceReference(Place) == *Selected
            : Result->TryGetArrayField(TEXT("entries"), Entries)
                && String(Result, TEXT("worldId")).Equals(Key.World, ESearchCase::CaseSensitive));
        if (StatusCode != 200 || !Bool(Result, TEXT("ok")) || !bMatches)
        {
            const FString Message = String(Result, TEXT("message"));
            Status = FText::FromString(Message.IsEmpty() ? TEXT("Could not open known places. Try refreshing.") : Message);
            return;
        }
        if (Selected)
        {
            Inspection = Result;
            RenderInspection(Place);
            return;
        }
        Cursor = String(Result, TEXT("next"));
        PageStart = RequestedCursor;
        PlacesGeneration = String(Result, TEXT("generation"));
        Places.Reset();
        for (const auto& Entry : *Entries)
        {
            const auto Row = Record(Entry);
            if (FPlaceReference(Row).IsUsable()) Places.Add(Row);
        }
        RenderPlaces();
        if (Places.IsEmpty()) Status = FText::FromString(Query.IsEmpty()
            ? TEXT("No known places on this page.") : TEXT("No matching places on this page."));
    }

    void AddLine(const FString& Text)
    {
        if (!Text.IsEmpty()) Rows->AddSlot().AutoHeight()[
            SNew(STextBlock).Text(FText::FromString(Text)).AutoWrapText(true)];
    }

    void RenderPlaces()
    {
        Inspection.Reset();
        ClearEditor();
        Rows->ClearChildren();
        Scroll->ScrollToStart();
        for (const auto& Place : Places)
        {
            const FString Label = String(Place, TEXT("label"));
            if (Label.IsEmpty()) continue;
            Rows->AddSlot().AutoHeight()[
                SNew(SButton).Text(FText::FromString(Label))
                .IsEnabled(this, &SOpenLegendPlaces::CanNavigate)
                .OnClicked(this, &SOpenLegendPlaces::Inspect, FPlaceReference(Place))];
            AddLine(String(Place, TEXT("locationLabel")));
        }
        Cartography = Object(View(), TEXT("cartography"));
        const auto& Markers = Array(Cartography, TEXT("markers"));
        if (!Markers.IsEmpty()) AddLine(TEXT("Your map markers"));
        for (const auto& Entry : Markers)
        {
            const auto Marker = Record(Entry);
            const FString Label = String(Marker, TEXT("label"));
            const auto Note = Object(Marker, TEXT("note"));
            if (Label.IsEmpty() || (!Query.IsEmpty() && !Label.Contains(Query)
                && !String(Note, TEXT("text")).Contains(Query))) continue;
            Rows->AddSlot().AutoHeight()[
                SNew(SButton).Text(FText::FromString(Label))
                .IsEnabled(this, &SOpenLegendPlaces::CanNavigate)
                .OnClicked(this, &SOpenLegendPlaces::EditMarker, String(Marker, TEXT("id")))];
        }
        UpdatePins();
    }

    void RefreshMarkerRows()
    {
        const auto Next = Object(View(), TEXT("cartography"));
        if (&Array(Next, TEXT("markers")) == &Array(Cartography, TEXT("markers"))) return;
        if (MarkerDraft || Inspection)
        {
            Cartography = Next;
            UpdatePins();
        }
        else
        {
            RenderPlaces();
        }
    }

    void UpdatePins()
    {
        TArray<FMapPin> Pins;
        PinRows.Reset();
        const auto Add = [&](const FObject& Row, const FObject& Location, bool bMarker)
        {
            FVector2D Point;
            if (!ReadMapPoint(Location, Point)) return;
            Pins.Add({Point, bMarker});
            PinRows.Add(Row);
        };
        for (const auto& Place : Places) Add(Place, Object(Place, TEXT("position")), false);
        for (const auto& Value : Array(Cartography, TEXT("markers")))
        {
            const auto Marker = Record(Value);
            Add(Marker, Marker, true);
        }
        Map->SetPins(MoveTemp(Pins));
    }

    void SelectMap(FVector2D Point, int32 Pin)
    {
        if (!CanRead()) return;
        if (MarkerDraft && bPlacingMarker)
        {
            PlaceMarker(Point);
            return;
        }
        if (!CanNavigate() || !PinRows.IsValidIndex(Pin)) return;
        const FObject Row = PinRows[Pin];
        if (FPlaceReference Reference(Row); Reference.IsUsable()) Inspect(MoveTemp(Reference));
        else EditMarker(String(Row, TEXT("id")));
    }

    static FObject FindMarker(const FObject& Map, const FString& Id)
    {
        for (const auto& Value : Array(Map, TEXT("markers")))
        {
            const auto Marker = Record(Value);
            if (SameWireText(Id, String(Marker, TEXT("id")))) return Marker;
        }
        return nullptr;
    }

    bool CanWriteMarkers() const
    {
        const auto Current = View();
        const auto MapData = Object(Current, TEXT("cartography"));
        return MapData && Key.SamePrivateRead(ReadKey(Current)) &&
            Bool(Object(Current, TEXT("access")), TEXT("controlling")) && !MarkerReadback;
    }

    void ClearMarker()
    {
        MarkerDraft.Reset();
        bPlacingMarker = false;
        Map->SetDraft({});
    }

    FReply EditMarker(FString Id)
    {
        if (!CanNavigate()) return FReply::Handled();
        const auto Current = Object(View(), TEXT("cartography"));
        uint64 Revision = 0;
        if (!Current || !OpenLegendWire::ReadRevision(*Current, TEXT("revision"), Revision))
            return FReply::Handled();
        FMarkerDraft Draft;
        Draft.Revision = Revision;
        Draft.bNew = Id.IsEmpty();
        if (Draft.bNew)
        {
            const auto Centre = Map->CentrePoint();
            const auto& Icons = Array(Current, TEXT("markerIcons"));
            uint64 Maximum = 0;
            if (!CanWriteMarkers() || !Centre || Icons.IsEmpty()
                || !OpenLegendWire::ReadRevision(*Current, TEXT("maxMarkers"), Maximum))
                return FReply::Handled();
            if (static_cast<uint64>(Array(Current, TEXT("markers")).Num()) >= Maximum)
            {
                Status = FText::FromString(TEXT("Your map is full. Delete a marker before adding another."));
                return FReply::Handled();
            }
            Draft.Id = TEXT("map-") + FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphensLower);
            Draft.Icon = String(Record(Icons[0]), TEXT("id"));
            Draft.Point = *Centre;
            bPlacingMarker = true;
        }
        else
        {
            const auto Existing = FindMarker(Current, Id);
            if (!ReadMapPoint(Existing, Draft.Point)) return FReply::Handled();
            Draft.Id = MoveTemp(Id);
            Draft.Icon = String(Existing, TEXT("icon"));
            Draft.Label = String(Existing, TEXT("label"));
            uint64 CurrentRevision = 0;
            uint64 NoteLimit = 0;
            const auto Note = Object(Existing, TEXT("note"));
            if (OpenLegendWire::ReadRevision(*Current, TEXT("noteCharacters"), NoteLimit))
            {
                if (Note && OpenLegendWire::ReadRevision(*Note, TEXT("revision"), CurrentRevision))
                    Draft.Note = String(Note, TEXT("text"));
                Draft.NoteRevision = CurrentRevision;
            }
            Map->Focus(Draft.Point);
        }
        MarkerDraft = MoveTemp(Draft);
        Map->SetDraft(MarkerDraft->Point);
        Status = bPlacingMarker ? FText::FromString(TEXT("Click the map to place your marker, or use the map centre."))
            : FText::GetEmpty();
        RenderMarker(Current);
        return FReply::Handled();
    }

    void PlaceMarker(FVector2D Point)
    {
        if (!MarkerDraft || !bPlacingMarker || !CanRead() || !CanWriteMarkers() || !Map->Contains(Point)) return;
        MarkerDraft->Point = Point;
        Map->SetDraft(Point);
        bPlacingMarker = false;
        Status = FText::GetEmpty();
    }

    void RenderMarker(const FObject& Current)
    {
        Inspection.Reset();
        ClearEditor();
        Rows->ClearChildren();
        Scroll->ScrollToStart();
        if (!MarkerDraft) return;
        if (!CanWriteMarkers())
        {
            AddLine(MarkerDraft->Label);
            AddLine(MarkerDraft->Note);
        }
        else
        {
            MarkerIcons.Reset();
            TSharedPtr<FJsonValue> SelectedIcon;
            for (const auto& Value : Array(Current, TEXT("markerIcons")))
            {
                if (SameWireText(String(Record(Value), TEXT("id")), MarkerDraft->Icon)) SelectedIcon = Value;
                MarkerIcons.Add(Value);
            }
            Rows->AddSlot().AutoHeight()[
                SNew(SEditableTextBox).HintText(FText::FromString(TEXT("Marker name")))
                .Text(FText::FromString(MarkerDraft->Label))
                .IsReadOnly_Lambda([this] { return !CanRead() || !CanWriteMarkers(); })
                .OnTextChanged_Lambda([this](const FText& Text) { if (MarkerDraft) MarkerDraft->Label = Text.ToString(); })];
            Rows->AddSlot().AutoHeight()[
                SNew(SComboBox<TSharedPtr<FJsonValue>>)
                .OptionsSource(&MarkerIcons).InitiallySelectedItem(SelectedIcon)
                .IsEnabled_Lambda([this] { return CanRead() && CanWriteMarkers(); })
                .OnGenerateWidget_Lambda([](TSharedPtr<FJsonValue> Value) {
                    return SNew(STextBlock).Text(FText::FromString(String(Record(Value), TEXT("label"))));
                })
                .OnSelectionChanged_Lambda([this](TSharedPtr<FJsonValue> Value, ESelectInfo::Type) {
                    if (MarkerDraft && Value) MarkerDraft->Icon = String(Record(Value), TEXT("id"));
                })
                [SNew(STextBlock).Text_Lambda([this] {
                    if (MarkerDraft)
                        for (const auto& Value : MarkerIcons)
                        {
                            const auto Option = Record(Value);
                            if (SameWireText(String(Option, TEXT("id")), MarkerDraft->Icon))
                                return FText::FromString(String(Option, TEXT("label")));
                        }
                    return FText::GetEmpty();
                })]];
            Rows->AddSlot().AutoHeight()[
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot().AutoWidth()[
                    SNew(SButton).Text(FText::FromString(TEXT("Move marker")))
                    .IsEnabled_Lambda([this] { return CanRead() && CanWriteMarkers() && !bPlacingMarker; })
                    .OnClicked_Lambda([this] {
                        bPlacingMarker = true;
                        Status = FText::FromString(TEXT("Click the map to move your marker, or use the map centre."));
                        return FReply::Handled();
                    })]
                + SHorizontalBox::Slot().AutoWidth()[
                    SNew(SButton).Text(FText::FromString(TEXT("Use map centre")))
                    .IsEnabled_Lambda([this] { return CanRead() && CanWriteMarkers() && bPlacingMarker; })
                    .OnClicked_Lambda([this] {
                        if (const auto Point = Map->CentrePoint()) PlaceMarker(*Point);
                        return FReply::Handled();
                    })]];
            Rows->AddSlot().AutoHeight()[
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot().AutoWidth()[
                    SNew(SButton).Text(FText::FromString(TEXT("Save marker")))
                    .IsEnabled_Lambda([this] {
                        return MarkerDraft && CanRead() && CanWriteMarkers() && !bPlacingMarker
                            && !MarkerDraft->Label.TrimStartAndEnd().IsEmpty() && !MarkerDraft->Icon.IsEmpty();
                    })
                    .OnClicked(this, &SOpenLegendPlaces::SaveMarker, EMarkerWrite::Place)]
                + SHorizontalBox::Slot().AutoWidth()[
                    SNew(SButton).Text(FText::FromString(TEXT("Delete marker")))
                    .Visibility_Lambda([this] { return MarkerDraft && !MarkerDraft->bNew
                        ? EVisibility::Visible : EVisibility::Collapsed; })
                    .IsEnabled_Lambda([this] { return CanRead() && CanWriteMarkers(); })
                    .OnClicked(this, &SOpenLegendPlaces::SaveMarker, EMarkerWrite::Remove)]];
            if (MarkerDraft->NoteRevision)
            {
                AddLine(TEXT("Your note"));
                Rows->AddSlot().AutoHeight()[
                    SNew(SMultiLineEditableTextBox).Text(FText::FromString(MarkerDraft->Note))
                    .AutoWrapText(true)
                    .IsReadOnly_Lambda([this] { return !CanRead() || !CanWriteMarkers(); })
                    .OnTextChanged_Lambda([this](const FText& Text) { if (MarkerDraft) MarkerDraft->Note = Text.ToString(); })];
                Rows->AddSlot().AutoHeight()[
                    SNew(SButton).Text(FText::FromString(TEXT("Save note")))
                    .IsEnabled_Lambda([this] { return CanRead() && CanWriteMarkers(); })
                    .OnClicked(this, &SOpenLegendPlaces::SaveMarker, EMarkerWrite::Note)];
            }
        }
        Rows->AddSlot().AutoHeight()[
            SNew(SButton).Text(FText::FromString(TEXT("Back to places")))
            .IsEnabled(this, &SOpenLegendPlaces::CanRead)
            .OnClicked_Lambda([this] {
                ClearMarker();
                RenderPlaces();
                Status = FText::GetEmpty();
                return FReply::Handled();
            })];
    }

    FReply SaveMarker(EMarkerWrite Write)
    {
        auto* Owner = Session.Get();
        if (!Owner || !MarkerDraft || !CanRead() || !CanWriteMarkers()) return FReply::Handled();
        const auto Current = Object(View(), TEXT("cartography"));
        uint64 Revision = 0;
        FString Generation;
        FString Epoch;
        if (!Current || !OpenLegendWire::ReadRevision(*Current, TEXT("revision"), Revision)
            || !Key.Epoch.Split(TEXT(":"), &Generation, &Epoch) || Generation.IsEmpty())
            return FReply::Handled();
        if (Revision != MarkerDraft->Revision)
        {
            Status = FText::FromString(TEXT("The map changed. Reopen this marker before saving."));
            return FReply::Handled();
        }

        auto Body = MakeShared<FJsonObject>();
        Body->SetStringField(TEXT("worldId"), Key.World);
        Body->SetStringField(TEXT("generation"), Generation);
        const TCHAR* Route = TEXT("/api/map/marker");
        if (Write == EMarkerWrite::Note)
        {
            if (!MarkerDraft->NoteRevision) return FReply::Handled();
            Route = TEXT("/api/knowledge");
            auto Subject = MakeShared<FJsonObject>();
            Subject->SetStringField(TEXT("kind"), TEXT("map-marker"));
            Subject->SetStringField(TEXT("markerId"), MarkerDraft->Id);
            Body->SetObjectField(TEXT("subjectId"), MoveTemp(Subject));
            Body->SetStringField(TEXT("actorId"), Key.Actor);
            Body->SetNumberField(TEXT("expectedRevision"), *MarkerDraft->NoteRevision);
            Body->SetStringField(TEXT("text"), MarkerDraft->Note);
        }
        else
        {
            Body->SetStringField(TEXT("id"), MarkerDraft->Id);
            Body->SetNumberField(TEXT("expectedRevision"), MarkerDraft->Revision);
            if (Write == EMarkerWrite::Remove) Body->SetBoolField(TEXT("remove"), true);
            else
            {
                if (bPlacingMarker || !Map->Contains(MarkerDraft->Point)) return FReply::Handled();
                Body->SetStringField(TEXT("label"), MarkerDraft->Label.TrimStartAndEnd());
                Body->SetStringField(TEXT("icon"), MarkerDraft->Icon);
                Body->SetNumberField(TEXT("x"), MarkerDraft->Point.X);
                Body->SetNumberField(TEXT("z"), MarkerDraft->Point.Y);
            }
        }
        const uint64 Save = ++ReadSequence;
        ActiveRead = Save;
        Started = FPlatformTime::Seconds();
        Status = FText::GetEmpty();
        if (!Owner->Send(Route, MoveTemp(Body),
            [Weak = TWeakPtr<SOpenLegendPlaces>(SharedThis(this)), Save, Before = Key, Write](int32 Code, FObject Result)
            {
                if (const auto Panel = Weak.Pin()) Panel->FinishMarker(Save, Before, Write, Code, Result);
            }))
        {
            ActiveRead = 0;
            Status = FText::FromString(TEXT("The change wasn't sent. Try again."));
        }
        return FReply::Handled();
    }

    void FinishMarker(uint64 Id, const FPlaceKey& Before, EMarkerWrite Write, int32 Code, const FObject& Result)
    {
        if (ActiveRead != Id) return;
        ActiveRead = 0;
        if (!bOpen || !MarkerDraft || !Before.SamePrivateRead(ReadKey(View()))) return;
        if (Code == 200 && Bool(Result, TEXT("ok")))
        {
            ClearMarker();
            RenderPlaces();
            Status = FText::FromString(Write == EMarkerWrite::Remove ? TEXT("Marker deleted.")
                : Write == EMarkerWrite::Note ? TEXT("Note saved.") : TEXT("Marker saved."));
            return;
        }
        if (Code == 0 || Code >= 500 || (Write == EMarkerWrite::Note && Code != 200))
        {
            MarkerReadback = FMarkerCheck{*MarkerDraft, Write};
            ClearMarker();
            RenderPlaces();
            CheckMarker();
            return;
        }
        const auto Reason = String(Result, TEXT("message"));
        Status = FText::FromString(Reason.IsEmpty() ? TEXT("Could not save the change.") : Reason);
    }

    void CheckMarker()
    {
        auto* Owner = Session.Get();
        if (!Owner || !MarkerReadback || !CanRead()) return;
        const uint64 Check = ++ReadSequence;
        ActiveRead = Check;
        Started = FPlatformTime::Seconds();
        Status = FText::FromString(TEXT("Save unconfirmed. Checking the current map."));
        if (!Owner->Read(TEXT("/api/state"),
            [Weak = TWeakPtr<SOpenLegendPlaces>(SharedThis(this)), Check, Before = Key](int32 Code, FObject Result)
            {
                if (const auto Panel = Weak.Pin()) Panel->FinishMarkerCheck(Check, Before, Code, Result);
            }))
        {
            ActiveRead = 0;
            Status = FText::FromString(TEXT("Save unconfirmed. Use Check marker to try again."));
        }
    }

    void FinishMarkerCheck(uint64 Id, const FPlaceKey& Before, int32 Code, const FObject& Result)
    {
        if (ActiveRead != Id) return;
        ActiveRead = 0;
        if (!bOpen || !MarkerReadback || !Before.SamePrivateRead(ReadKey(View()))) return;
        const auto MapData = Object(Result, TEXT("cartography"));
        if (Code != 200 || !MapData || !Before.SamePrivateRead(ReadKey(Result)))
        {
            Status = FText::FromString(TEXT("Save unconfirmed. Use Check marker to try again."));
            return;
        }
        const auto& [Draft, Write] = *MarkerReadback;
        const auto Marker = FindMarker(MapData, Draft.Id);
        const auto Note = Object(Marker, TEXT("note"));
        FVector2D Point;
        const bool bMatches = Write == EMarkerWrite::Remove ? !Marker
            : Write == EMarkerWrite::Note ? Marker && SameWireText(String(Note, TEXT("text")), Draft.Note)
            : ReadMapPoint(Marker, Point) && Point == Draft.Point
                && SameWireText(String(Marker, TEXT("icon")), Draft.Icon)
                && SameWireText(String(Marker, TEXT("label")), Draft.Label.TrimStartAndEnd());
        MarkerReadback.Reset();
        Status = FText::FromString(bMatches
            ? TEXT("The current map matches your change. Its save is still unconfirmed.")
            : TEXT("The current map differs from your change. Check the marker before editing again."));
    }

    void RenderInspection(const FObject& Place)
    {
        ClearEditor();
        Rows->ClearChildren();
        Scroll->ScrollToStart();
        AddLine(String(Place, TEXT("label")));
        AddLine(String(Place, TEXT("description")));
        AddLine(String(Place, TEXT("locationLabel")));
        AddLine(String(Inspection, TEXT("moveDescription")));
        const auto Movement = Object(Inspection, TEXT("move"));
        const FString Label = String(Movement, TEXT("label"));
        AddLine(String(Movement, TEXT("reason")));
        if (!Label.IsEmpty() && Object(Movement, TEXT("command")))
        {
            Rows->AddSlot().AutoHeight()[
                SNew(SButton).Text(FText::FromString(Label))
                .IsEnabled_Lambda([this] { return CanMove(); })
                .OnClicked_Lambda([this]
                {
                    if (CanMove() && Key == ReadKey(View()))
                    {
                        const auto Command = Object(Object(Inspection, TEXT("move")), TEXT("command"));
                        if (Command) Submit(MakeShared<FJsonObject>(*Command));
                    }
                    return FReply::Handled();
                })];
        }
        BuildNoteEditor(FPlaceReference(Place));
        Rows->AddSlot().AutoHeight()[
            SNew(SButton).Text(FText::FromString(TEXT("Back to places")))
            .IsEnabled(this, &SOpenLegendPlaces::CanNavigate)
            .OnClicked_Lambda([this]
            {
                if (CanNavigate()) RenderPlaces();
                return FReply::Handled();
            })];
    }

    void ClearEditor()
    {
        NoteEditor.Reset();
        NoteRevision.Reset();
        NoteBaseText.Reset();
        bNoteDirty = bStaleDraft = false;
    }

    bool CanEditNote() const
    {
        const auto Current = View();
        uint64 NoteCharacters = 0;
        const auto MapData = Object(Current, TEXT("cartography"));
        return !PlacesGeneration.IsEmpty() && NoteRevision.IsSet() && !PendingNote && !bStaleDraft
            && Bool(Object(Current, TEXT("access")), TEXT("controlling"))
            && MapData && OpenLegendWire::ReadRevision(*MapData, TEXT("noteCharacters"), NoteCharacters);
    }

    void BuildNoteEditor(const FPlaceReference& Selection)
    {
        // The list owns the private note; inspection separately establishes
        // that this exact source is usable. Never infer a new empty note.
        const auto* Base = Places.FindByPredicate([&Selection](const FObject& Row)
        {
            return FPlaceReference(Row) == Selection;
        });
        const auto Note = Base ? Object(*Base, TEXT("note")) : nullptr;
        uint64 Revision = 0;
        if (!Note || !Note->TryGetStringField(TEXT("text"), NoteBaseText)
            || !OpenLegendWire::ReadRevision(*Note, TEXT("revision"), Revision)) return;
        NoteRevision = Revision;
        if (!CanEditNote())
        {
            AddLine(NoteBaseText);
            return;
        }
        AddLine(TEXT("Your note"));
        Rows->AddSlot().AutoHeight()[
            SAssignNew(NoteEditor, SMultiLineEditableTextBox)
            .Text(FText::FromString(NoteBaseText))
            .AutoWrapText(true)
            .IsReadOnly_Lambda([this] { return !CanRead() || !CanEditNote(); })
            .OnTextChanged_Lambda([this](const FText& Text) {
                bNoteDirty = !NoteBaseText.Equals(Text.ToString(), ESearchCase::CaseSensitive);
            })];
        Rows->AddSlot().AutoHeight()[
            SNew(SHorizontalBox)
            + SHorizontalBox::Slot().AutoWidth()[
                SNew(SButton).Text(FText::FromString(TEXT("Save note")))
                .IsEnabled_Lambda([this] { return bNoteDirty && CanRead() && CanEditNote(); })
                .OnClicked(this, &SOpenLegendPlaces::SaveNote)]
            + SHorizontalBox::Slot().AutoWidth()[
                SNew(SButton).Text(FText::FromString(TEXT("Discard changes")))
                .IsEnabled_Lambda([this] { return bNoteDirty && CanRead(); })
                .OnClicked_Lambda([this]
                {
                    if (CanRead() && NoteEditor)
                    {
                        NoteEditor->SetText(FText::FromString(NoteBaseText));
                        bNoteDirty = bStaleDraft = false;
                        Status = FText::GetEmpty();
                        OnViewChanged();
                    }
                    return FReply::Handled();
                })]];
    }

    FReply SaveNote()
    {
        auto* Owner = Session.Get();
        const FPlaceReference Selection(Object(Inspection, TEXT("place")));
        if (!Owner || !Selection.IsUsable() || !NoteEditor || !bNoteDirty || !CanRead()
            || !CanEditNote() || Key != ReadKey(View())) return FReply::Handled();
        const auto Text = NoteEditor->GetText().ToString();
        auto Request = MakeShared<FJsonObject>();
        Request->SetStringField(TEXT("actorId"), Key.Actor);
        Request->SetStringField(TEXT("worldId"), Key.World);
        Request->SetStringField(TEXT("generation"), PlacesGeneration);
        auto Subject = MakeShared<FJsonObject>();
        Subject->SetStringField(TEXT("kind"), TEXT("place"));
        Subject->SetStringField(TEXT("placeId"), Selection.Id);
        Request->SetObjectField(TEXT("subjectId"), MoveTemp(Subject));
        Request->SetObjectField(TEXT("place"), Selection.Body());
        Request->SetNumberField(TEXT("expectedRevision"), *NoteRevision);
        Request->SetStringField(TEXT("text"), Text);
        PendingNote.Emplace(FPlaceNoteCheck{Selection, PageStart, Query, PlacesGeneration, Text, *NoteRevision});
        const uint64 Save = ++ReadSequence;
        ActiveRead = Save;
        Started = FPlatformTime::Seconds();
        Status = FText::GetEmpty();
        const bool bSent = Owner->Send(TEXT("/api/knowledge"), MoveTemp(Request),
            [Weak = TWeakPtr<SOpenLegendPlaces>(SharedThis(this)), Save, Before = Key](int32 Code, FObject Result)
            {
                if (const auto Panel = Weak.Pin())
                    Panel->FinishNoteSave(Save, Before, Code, Result);
            });
        if (!bSent)
        {
            ActiveRead = 0;
            PendingNote.Reset();
            Status = FText::FromString(TEXT("The note wasn't sent. Try saving again."));
        }
        return FReply::Handled();
    }

    void FinishNoteSave(uint64 Id, const FPlaceKey& Before, int32 Code, const FObject& Result)
    {
        if (ActiveRead != Id) return;
        ActiveRead = 0;
        if (!bOpen || !PendingNote || !Key.SamePrivateRead(Before) || Key != ReadKey(View())) return;
        if (Code == 200 && Bool(Result, TEXT("ok")))
        {
            PendingNote.Reset();
            ClearPage();
            Status = FText::FromString(TEXT("Note saved. Refresh places to see it."));
        }
        else if (Code != 200 || !Result)
        {
            // Even a refused response can come from the private read after
            // the save. Its status alone cannot establish the write outcome.
            ClearPage();
            CheckNote();
        }
        else
        {
            const FString Reason = String(Result, TEXT("message"));
            PendingNote.Reset();
            // An explicit length refusal leaves the old note and private
            // source intact. Keep this draft so it can be shortened.
            if (!String(Result, TEXT("code")).Equals(TEXT("knowledge-overflow"), ESearchCase::CaseSensitive))
                ClearPage();
            Status = FText::FromString(Reason.IsEmpty()
                ? TEXT("Could not save the note. Refresh places before editing again.") : Reason);
        }
    }

    void CheckNote()
    {
        auto* Owner = Session.Get();
        if (!Owner || !PendingNote || !CanRead()) return;
        auto Request = MakeShared<FJsonObject>();
        if (!PendingNote->Query.IsEmpty()) Request->SetStringField(TEXT("query"), PendingNote->Query);
        if (!PendingNote->PageStart.IsEmpty()) Request->SetStringField(TEXT("cursor"), PendingNote->PageStart);
        const uint64 Check = ++ReadSequence;
        ActiveRead = Check;
        Started = FPlatformTime::Seconds();
        Status = FText::FromString(TEXT("The save is unconfirmed. Checking your current note."));
        const bool bSent = Owner->Send(TEXT("/api/known-places"), MoveTemp(Request),
            [Weak = TWeakPtr<SOpenLegendPlaces>(SharedThis(this)), Check, Before = Key](int32 Code, FObject Result)
            {
                if (const auto Panel = Weak.Pin()) Panel->FinishNoteCheck(Check, Before, Code, Result);
            });
        if (!bSent)
        {
            ActiveRead = 0;
            Status = FText::FromString(TEXT("The save is unconfirmed. Use Check note to read it again."));
        }
    }

    void FinishNoteCheck(uint64 Id, const FPlaceKey& Before, int32 Code, const FObject& Result)
    {
        if (ActiveRead != Id) return;
        ActiveRead = 0;
        if (!bOpen || !PendingNote || !Key.SamePrivateRead(Before) || Key != ReadKey(View())) return;
        if (Before != Key)
        {
            Status = FText::FromString(TEXT("Known places changed while checking. Use Check note to read it again."));
            return;
        }
        if (Code == 200 && Bool(Result, TEXT("ok"))
            && String(Result, TEXT("worldId")).Equals(Key.World, ESearchCase::CaseSensitive)
            && String(Result, TEXT("generation")).Equals(PendingNote->Generation, ESearchCase::CaseSensitive))
        {
            for (const auto& Value : Array(Result, TEXT("entries")))
            {
                const auto Place = Record(Value);
                if (FPlaceReference(Place) != PendingNote->Place) continue;
                const auto Note = Object(Place, TEXT("note"));
                uint64 Revision = 0;
                FString Text;
                if (!Note || !Note->TryGetStringField(TEXT("text"), Text)
                    || !OpenLegendWire::ReadRevision(*Note, TEXT("revision"), Revision)) break;
                const bool bHasChanges = Revision > PendingNote->Before
                    && Text.Equals(PendingNote->Text, ESearchCase::CaseSensitive);
                PendingNote.Reset();
                Status = FText::FromString(bHasChanges
                    ? TEXT("The current note contains your changes. Refresh places to read it.")
                    : TEXT("The current note differs from your changes. Refresh places to read it."));
                return;
            }
        }
        Status = FText::FromString(TEXT("The save is unconfirmed. Reopen Known places to find the current note."));
    }

    bool CanMove() const
    {
        return CanNavigate() && !Bool(Object(View(), TEXT("clock")), TEXT("paused"))
            && Bool(Object(Inspection, TEXT("move")), TEXT("enabled"))
            && CanSubmit && CanSubmit() && Submit;
    }

    TWeakObjectPtr<UOpenLegendSession> Session;
    FDelegateHandle ViewChanged;
    TFunction<void()> OnOpen;
    TFunction<bool()> CanSubmit;
    TFunction<void(TSharedPtr<FJsonObject>)> Submit;
    TSharedPtr<SOpenLegendMap> Map;
    TSharedPtr<SEditableTextBox> Search;
    TSharedPtr<SMultiLineEditableTextBox> NoteEditor;
    TSharedPtr<SVerticalBox> Rows;
    TSharedPtr<SScrollBox> Scroll;
    FText Status;
    FPlaceKey Key;
    FString Cursor, Query, PageStart, PlacesGeneration, NoteBaseText;
    TOptional<uint64> NoteRevision;
    TOptional<FPlaceNoteCheck> PendingNote;
    TArray<FObject> Places;
    FObject Inspection, Cartography;
    TOptional<FMarkerDraft> MarkerDraft;
    TOptional<FMarkerCheck> MarkerReadback;
    TArray<TSharedPtr<FJsonValue>> MarkerIcons;
    TArray<FObject> PinRows;
    bool bPlacingMarker = false;
    uint64 PageGeneration = 0, ReadSequence = 0, ActiveRead = 0;
    double Started = 0;
    bool bOpen = false, bNoteDirty = false, bStaleDraft = false;
};
}

TSharedRef<SWidget> MakeOpenLegendPlaces(
    UOpenLegendSession& Session,
    TFunction<void()> OnOpen,
    TFunction<bool()> CanSubmitCommand,
    TFunction<void(TSharedPtr<FJsonObject>)> SubmitCommand)
{
    return SNew(SOpenLegendPlaces).Session(&Session)
        .OnOpen(MoveTemp(OnOpen)).CanSubmitCommand(MoveTemp(CanSubmitCommand)).SubmitCommand(MoveTemp(SubmitCommand));
}
