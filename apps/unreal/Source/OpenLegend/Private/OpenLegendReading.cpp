#include "OpenLegendReading.h"

#include "Net/OpenLegendSession.h"
#include "Net/OpenLegendWire.h"
#include "OpenLegendJson.h"
#include "Containers/StaticArray.h"
#include "HAL/PlatformTime.h"
#include "Widgets/Images/SThrobber.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Widgets/Input/SSpinBox.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/SNullWidget.h"
#include "Widgets/Text/STextBlock.h"

namespace
{
using namespace OpenLegend;

enum class EReading : uint8 { Closed, Events, Journal, Inventory, Character };

struct FReadKey
{
    FString Scope;
    FString Timeline;
    FString Epoch;
    FString Revision;
    FString Disclosure;
    TStaticArray<double, 3> Details{-1.0, -1.0, -1.0};
    bool bCanUseInventory = false;
    bool bPaused = false;

    bool SameOwner(const FReadKey& Other) const
    {
        return Scope.Equals(Other.Scope, ESearchCase::CaseSensitive)
            && Timeline.Equals(Other.Timeline, ESearchCase::CaseSensitive);
    }

    bool operator==(const FReadKey& Other) const
    {
        return SameOwner(Other) && Epoch.Equals(Other.Epoch, ESearchCase::CaseSensitive)
            && Revision.Equals(Other.Revision, ESearchCase::CaseSensitive)
            && Disclosure.Equals(Other.Disclosure, ESearchCase::CaseSensitive) && Details == Other.Details
            && bCanUseInventory == Other.bCanUseInventory && bPaused == Other.bPaused;
    }
};

struct FCarriedMove
{
    FString Item, Source, Actor, Group;
    uint64 Revision = 0, Placement = 0, Available = 0;
    bool bBag = false;
};

// One explicitly opened, scoped destination read. Rust supplies each exact
// container revision and still validates capacity, access and ancestry at commit.
class SOpenLegendCarriedMove final : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SOpenLegendCarriedMove) {}
        SLATE_ARGUMENT(UOpenLegendSession*, Session)
        SLATE_ARGUMENT(FCarriedMove, Move)
        SLATE_ARGUMENT(TFunction<bool()>, CanSubmit)
        SLATE_ARGUMENT(TFunction<void(TSharedPtr<FJsonObject>)>, Submit)
    SLATE_END_ARGS()

    void Construct(const FArguments& Args)
    {
        Session = Args._Session;
        Move = Args._Move;
        CanSubmit = Args._CanSubmit;
        Submit = Args._Submit;
        ChildSlot[
            SNew(SVerticalBox)
            + SVerticalBox::Slot().AutoHeight()[
                SNew(STextBlock).Text_Lambda([this] { return Status; }).AutoWrapText(true)]
            + SVerticalBox::Slot().AutoHeight()[SAssignNew(Rows, SVerticalBox)]];
    }

    void Start()
    {
        // A bag's item revision is separate from its contents revision.
        // Read the exact current bag only when someone requests a move.
        if (Move.bBag) Read(Move.Item, FString(), true);
        else Read(Move.Actor);
    }

private:
    void Read(const FString& Container, const FString& Cursor = {}, bool bSource = false)
    {
        auto* Owner = Session.Get();
        if (!Owner || bLoading || bSubmitted || !CanSubmit()) return;
        Rows->ClearChildren();
        Status = FText::FromString(TEXT("Opening inventory…"));
        auto Body = MakeShared<FJsonObject>();
        Body->SetStringField(TEXT("containerId"), Container);
        Body->SetStringField(TEXT("filter"), TEXT("containers"));
        if (!Cursor.IsEmpty()) Body->SetStringField(TEXT("cursor"), Cursor);
        bLoading = Owner->Send(TEXT("/api/inventory"), Body,
            [Weak = TWeakPtr<SOpenLegendCarriedMove>(SharedThis(this)), Container, bSource](int32 Code, FObject Result)
        {
            if (const auto Self = Weak.Pin()) Self->Finish(Code, Result, Container, bSource);
        });
        if (!bLoading) Status = FText::FromString(TEXT("Could not open this container."));
    }

    void Finish(int32 Code, const FObject& Result, const FString& Container, bool bSource)
    {
        bLoading = false;
        if (!CanSubmit())
        {
            Status = FText::FromString(TEXT("Choose where to move this item again."));
            return;
        }
        const auto Target = Object(Result, TEXT("container"));
        const auto& Path = Array(Result, TEXT("breadcrumbs"));
        uint64 Revision = 0;
        if (Code != 200 || !Bool(Result, TEXT("ok")) || !Target
            || !String(Target, TEXT("id")).Equals(Container, ESearchCase::CaseSensitive)
            || Path.IsEmpty() || !String(Record(Path[0]), TEXT("id")).Equals(Move.Actor, ESearchCase::CaseSensitive)
            || !OpenLegendWire::ReadRevision(*Target, TEXT("revision"), Revision))
        {
            const FString Message = String(Result, TEXT("message"));
            Status = FText::FromString(Message.IsEmpty() ? TEXT("Could not open this container.") : Message);
            return;
        }
        if (bSource)
        {
            ContentsRevision = Revision;
            Read(Move.Actor);
            return;
        }
        if (Path.ContainsByPredicate([this](const auto& Entry) {
            return String(Record(Entry), TEXT("id")).Equals(Move.Item, ESearchCase::CaseSensitive);
        }))
        {
            Status = FText::FromString(TEXT("Choose a different container."));
            return;
        }
        Status = FText::FromString(Container.Equals(Move.Actor, ESearchCase::CaseSensitive)
            ? TEXT("Your belongings") : String(Target, TEXT("name")));
        if (Path.Num() > 1)
        {
            const FString Parent = String(Record(Path[Path.Num() - 2]), TEXT("id"));
            if (!Parent.IsEmpty()) Button(TEXT("Back"), [this, Parent] { Read(Parent); });
        }
        for (const auto& Entry : Array(Result, TEXT("items")))
        {
            const auto Bag = Record(Entry);
            const FString Id = String(Bag, TEXT("id"));
            const FString Name = String(Bag, TEXT("name"));
            if (!Id.IsEmpty() && !Id.Equals(Move.Item, ESearchCase::CaseSensitive)
                && !Name.IsEmpty() && Object(Bag, TEXT("container")))
                Button(TEXT("Open ") + Name, [this, Id] { Read(Id); });
        }
        const FString Next = String(Result, TEXT("next"));
        if (!Next.IsEmpty()) Button(TEXT("More bags"), [this, Container, Next] { Read(Container, Next); });
        if (Container.Equals(Move.Source, ESearchCase::CaseSensitive)) return;

        TSharedPtr<SSpinBox<int64>> Amount;
        if (Move.Available > 1)
        {
            Rows->AddSlot().AutoHeight()[SNew(STextBlock).Text(FText::FromString(TEXT("Amount to move")))];
            Rows->AddSlot().AutoHeight()[
                SAssignNew(Amount, SSpinBox<int64>).Value(1).MinValue(1)
                .MaxValue(static_cast<int64>(Move.Available)).Delta(1)
                .MinFractionalDigits(0).MaxFractionalDigits(0)];
        }
        Button(TEXT("Move here"), [this, Container, Revision, Amount] {
            const int64 Quantity = Amount ? Amount->GetValue() : 1;
            if (Quantity < 1 || static_cast<uint64>(Quantity) > Move.Available) return;
            auto Command = MakeShared<FJsonObject>();
            Command->SetStringField(TEXT("type"), TEXT("transfer-item"));
            Command->SetStringField(TEXT("itemId"), Move.Item);
            Command->SetStringField(TEXT("targetId"), Container);
            Command->SetNumberField(TEXT("quantity"), Quantity);
            Command->SetNumberField(TEXT("expectedRevision"), Move.Revision);
            Command->SetNumberField(TEXT("placementRevision"), Move.Placement);
            Command->SetNumberField(TEXT("targetRevision"), Revision);
            if (ContentsRevision) Command->SetNumberField(TEXT("expectedContentsRevision"), *ContentsRevision);
            if (!Move.Group.IsEmpty()) Command->SetStringField(TEXT("inventoryGroup"), Move.Group);
            // The existing command owner retains this operation for receipt recovery.
            bSubmitted = true;
            Submit(MoveTemp(Command));
        });
    }

    bool Ready() const { return !bLoading && !bSubmitted && CanSubmit(); }

    void Button(const FString& Label, TFunction<void()> Action)
    {
        Rows->AddSlot().AutoHeight()[
            SNew(SButton).Text(FText::FromString(Label))
            .IsEnabled_Lambda([this] { return Ready(); })
            .OnClicked_Lambda([this, Action = MoveTemp(Action)] {
                if (Ready()) Action();
                return FReply::Handled();
            })];
    }

    TWeakObjectPtr<UOpenLegendSession> Session;
    FCarriedMove Move;
    TFunction<bool()> CanSubmit;
    TFunction<void(TSharedPtr<FJsonObject>)> Submit;
    TSharedPtr<SVerticalBox> Rows;
    TOptional<uint64> ContentsRevision;
    FText Status;
    bool bLoading = false;
    bool bSubmitted = false;
};

class SOpenLegendReading : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SOpenLegendReading) {}
        SLATE_ARGUMENT(UOpenLegendSession*, Session)
        SLATE_ARGUMENT(TFunction<bool()>, CanSubmitCommand)
        SLATE_ARGUMENT(TFunction<void(TSharedPtr<FJsonObject>)>, SubmitCommand)
    SLATE_END_ARGS()

    void Construct(const FArguments& Args)
    {
        Session = Args._Session;
        CanSubmitCommand = Args._CanSubmitCommand;
        SubmitCommand = Args._SubmitCommand;
        ChildSlot[
            SNew(SVerticalBox)
            + SVerticalBox::Slot().AutoHeight()[
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot().AutoWidth()[Tab(TEXT("Events"), EReading::Events)]
                + SHorizontalBox::Slot().AutoWidth()[Tab(TEXT("Journal"), EReading::Journal)]
                + SHorizontalBox::Slot().AutoWidth()[Tab(TEXT("Inventory"), EReading::Inventory)]
                + SHorizontalBox::Slot().AutoWidth()[Tab(TEXT("Character"), EReading::Character)]
                + SHorizontalBox::Slot().AutoWidth()[
                    SNew(SButton).Text(FText::FromString(TEXT("Close")))
                    .Visibility_Lambda([this] { return ActiveVisibility(); })
                    .OnClicked(this, &SOpenLegendReading::Select, EReading::Closed)]]
            + SVerticalBox::Slot().AutoHeight()[
                SNew(SVerticalBox).Visibility_Lambda([this] { return ActiveVisibility(); })
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(STextBlock).Text_Lambda([this] { return ReadError.IsEmpty() ? Status : ReadError; }).AutoWrapText(true)]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(STextBlock).Text_Lambda([this] { return CurrentStory; }).AutoWrapText(true)
                    .Visibility_Lambda([this] {
                        return Selected == EReading::Journal && !CurrentStory.IsEmpty()
                            ? EVisibility::Visible : EVisibility::Collapsed;
                    })]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SVerticalBox).Visibility_Lambda([this] {
                        return Selected == EReading::Inventory && !Key.Scope.IsEmpty()
                            ? EVisibility::Visible : EVisibility::Collapsed;
                    })
                    + SVerticalBox::Slot().AutoHeight()[SAssignNew(InventoryPath, SHorizontalBox)]
                    + SVerticalBox::Slot().AutoHeight()[
                        SAssignNew(InventorySearch, SEditableTextBox)
                        .HintText(FText::FromString(TEXT("Search inventory")))
                        .OnTextCommitted(this, &SOpenLegendReading::SearchInventory)]]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SBox).MaxDesiredHeight(220)[
                        SAssignNew(Scroll, SScrollBox)
                        + SScrollBox::Slot()[SAssignNew(Rows, SVerticalBox)]]]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SHorizontalBox).Visibility_Lambda([this] {
                        return IsPaged() ? EVisibility::Visible : EVisibility::Collapsed;
                    })
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text_Lambda([this] {
                            if (Selected == EReading::Events) return FText::FromString(TEXT("Recent"));
                            if (Selected == EReading::Journal)
                                return FText::FromString(bJournalLoaded
                                    && !LoadedJournalRevision.Equals(Key.Revision, ESearchCase::CaseSensitive)
                                    ? TEXT("Read latest entries") : TEXT("Refresh"));
                            return FText::FromString(TEXT("Refresh"));
                        })
                        .IsEnabled_Lambda([this] { return !ActiveRead && !Key.Scope.IsEmpty(); })
                        .OnClicked(this, &SOpenLegendReading::Navigate, false)]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton)
                        .Text_Lambda([this] {
                            return FText::FromString(Selected == EReading::Inventory ? TEXT("Next") : TEXT("Older"));
                        })
                        .IsEnabled_Lambda([this] {
                            return !ActiveRead && !Key.Scope.IsEmpty() && (Selected == EReading::Events
                                ? !bHistoricEvents || !EventsCursor.IsEmpty() : Older.IsSet() || !InventoryCursor.IsEmpty());
                        })
                        .OnClicked(this, &SOpenLegendReading::Navigate, true)]
                    + SHorizontalBox::Slot().AutoWidth().VAlign(VAlign_Center).Padding(6, 0)[
                        SNew(SThrobber).Visibility_Lambda([this] {
                            return ActiveRead && FPlatformTime::Seconds() - Started >= 0.5
                                ? EVisibility::HitTestInvisible : EVisibility::Hidden;
                        })]]]
        ];
        if (auto* Owner = Session.Get())
        {
            ViewChanged = Owner->OnViewChanged.AddSP(SharedThis(this), &SOpenLegendReading::ViewChangedNow);
        }
    }

    ~SOpenLegendReading() override
    {
        if (auto* Owner = Session.Get()) Owner->OnViewChanged.Remove(ViewChanged);
    }

private:
    bool IsPaged() const { return Selected == EReading::Events || LoadsOnOpen(); }
    bool LoadsOnOpen() const { return Selected == EReading::Journal || Selected == EReading::Inventory; }

    EVisibility ActiveVisibility() const
    {
        return Selected == EReading::Closed ? EVisibility::Collapsed : EVisibility::Visible;
    }

    TSharedRef<SWidget> Tab(const TCHAR* Name, EReading Mode)
    {
        return SNew(SButton).Text(FText::FromString(Name))
            .IsEnabled_Lambda([this] { return Session.IsValid() && Session->GetView().IsValid(); })
            .OnClicked(this, &SOpenLegendReading::Select, Mode);
    }

    FReply Select(EReading Mode)
    {
        if (Mode == Selected) return FReply::Handled();
        Selected = Mode;
        Invalidate();
        bRefresh = LoadsOnOpen();
        ViewChangedNow();
        return FReply::Handled();
    }

    FReply Navigate(bool bOlder)
    {
        if (!ActiveRead && IsPaged() && !Key.Scope.IsEmpty())
        {
            if (Selected == EReading::Events && !bOlder)
            {
                Invalidate();
                ViewChangedNow();
            }
            else Request(bOlder);
        }
        return FReply::Handled();
    }

    void AddLine(const FString& Line)
    {
        if (Line.IsEmpty()) return;
        Rows->AddSlot().AutoHeight().Padding(0, 2)[
            SNew(STextBlock).Text(FText::FromString(Line)).AutoWrapText(true)];
    }

    void Invalidate()
    {
        ++Revision;
        InventoryCursor.Reset();
        Older.Reset();
        Watermark.Reset();
        LastEvents.Reset();
        LastStory.Reset();
        EventsCursor.Reset();
        LoadedJournalRevision.Reset();
        bHistoricEvents = false;
        bJournalLoaded = false;
        CurrentStory = FText::GetEmpty();
        CharacterText = FText::GetEmpty();
        bRefresh = false;
        Status = ReadError = FText::GetEmpty();
        InventoryPath->ClearChildren();
        OpenInventoryDetail.Reset();
        Rows->ClearChildren();
        Scroll->ScrollToStart();
    }

    void ResetInventorySearch()
    {
        InventoryQuery.Reset();
        InventorySearch->SetText(FText::GetEmpty());
    }

    void ViewChangedNow()
    {
        const auto View = Session.IsValid() ? Session->GetView() : nullptr;
        FReadKey Next;
        Next.Scope = String(Object(View, TEXT("access")), TEXT("scope"));
        Next.Timeline = String(View, TEXT("saveTimeline"));
        if (Selected == EReading::Journal || Selected == EReading::Events)
        {
            Next.Epoch = String(View, TEXT("historyEpoch"));
            if (Selected == EReading::Journal) Next.Revision = String(View, TEXT("historyRevision"));
        }
        else if (Selected == EReading::Inventory)
        {
            const auto Player = Object(View, TEXT("player"));
            const auto Hints = Object(Player, TEXT("inventoryReadRevision"));
            Next.Disclosure = String(Hints, TEXT("disclosure"));
            const auto& Details = Array(Hints, TEXT("details"));
            if (Details.Num() == Next.Details.Num())
                for (int32 Index = 0; Index < Details.Num(); ++Index)
                {
                    if (const auto& Value = Details[Index]) Value->TryGetNumber(Next.Details[Index]);
                }
            Next.bCanUseInventory = Bool(Player, TEXT("canUseInventory"));
            Next.bPaused = Bool(Object(View, TEXT("clock")), TEXT("paused"));
        }
        if (!(Next == Key))
        {
            if (!Next.SameOwner(Key))
            {
                ActiveRead = 0;
                InventoryContainer.Reset();
                ResetInventorySearch();
            }
            const bool bJournalAppend = Selected == EReading::Journal && Next.SameOwner(Key)
                && Next.Epoch.Equals(Key.Epoch, ESearchCase::CaseSensitive);
            Key = MoveTemp(Next);
            // An ordinary append must not move the reader or start another database read.
            // A changed history epoch withdraws every retained private page immediately.
            if (!bJournalAppend)
            {
                Invalidate();
                bRefresh = LoadsOnOpen();
            }
        }
        if (Selected == EReading::Closed) return;
        if (Key.Scope.IsEmpty())
        {
            Status = FText::FromString(TEXT("Return to play to see your records."));
            return;
        }
        if (Selected == EReading::Events)
        {
            if (!bHistoricEvents && !ActiveRead) RenderEvents(View);
        }
        else if (Selected == EReading::Character) RenderCharacter(View);
        else
        {
            if (Selected == EReading::Journal) UpdateCurrentStory(View);
            if (bRefresh && !ActiveRead) Request(false);
        }
    }

    void RenderEvents(const FObject& View)
    {
        const auto Events = View->TryGetField(TEXT("events"));
        if (Events && LastEvents.Pin() == Events) return;
        Rows->ClearChildren();
        LastEvents = Events;
        RenderEventRows(Array(View, TEXT("events")), TEXT("No recent events."));
    }

    void RenderEventRows(const TArray<TSharedPtr<FJsonValue>>& Items, const TCHAR* Empty)
    {
        bool bDisplayed = false;
        for (const auto& Entry : Items)
        {
            const auto Event = Record(Entry);
            const auto Presentation = Object(Event, TEXT("presentation"));
            bool bShow = true;
            if (Presentation && Presentation->TryGetBoolField(TEXT("displayToPlayer"), bShow) && !bShow)
            {
                continue;
            }
            const FString Speech = String(Object(Event, TEXT("speechPresentation")), TEXT("personalText"));
            const FString Message = Speech.IsEmpty() ? String(Event, TEXT("text")) : Speech;
            AddLine(Message);
            bDisplayed |= !Message.IsEmpty();
        }
        Status = bDisplayed ? FText::GetEmpty() : FText::FromString(Empty);
    }

    void UpdateCurrentStory(const FObject& View)
    {
        const auto Latest = View->TryGetField(TEXT("narrator"));
        if (Latest && Latest == LastStory.Pin()) return;
        LastStory = Latest;
        CurrentStory = FText::FromString(String(Record(Latest), TEXT("text")));
    }

    static FString DisplayValue(const FObject& Attribute)
    {
        double Value = 0;
        const auto Field = Attribute->TryGetField(TEXT("value"));
        if (!Field || Field->Type != EJson::Number || !Number(Attribute, TEXT("value"), Value))
            return String(Attribute, TEXT("value"));
        FNumberFormattingOptions Format;
        const bool bWhole = Bool(Attribute, TEXT("bodyHealth")) || NumberOr(Attribute, TEXT("max"), 0) >= 100;
        Format.SetMaximumFractionalDigits(bWhole ? 0 : 2);
        return FText::AsNumber(Value, &Format).ToString();
    }

    void RenderCharacter(const FObject& View)
    {
        const auto Player = Object(View, TEXT("player"));
        if (!Player) return;
        TArray<FString> Lines;
        auto Add = [&Lines](FString Value) {
            if (!Value.IsEmpty()) Lines.Add(MoveTemp(Value));
        };
        Add(String(Player, TEXT("name")));
        bool bAlive = false;
        if (Player->TryGetBoolField(TEXT("alive"), bAlive) && !bAlive) Add(TEXT("Cannot act"));
        Add(String(Player, TEXT("departureNotice")));
        for (const auto& Entry : Array(Player, TEXT("attributes")))
        {
            const auto Attribute = Record(Entry);
            FString Name = String(Attribute, TEXT("name"));
            if (Name.IsEmpty()) continue;
            const FString Value = DisplayValue(Attribute);
            const FString Unit = String(Attribute, TEXT("unit"));
            const FString Condition = String(Attribute, TEXT("condition"));
            if (!Value.IsEmpty()) Name += TEXT("  ") + Value;
            else if (String(Attribute, TEXT("status")) == TEXT("unknown")) Name += TEXT("  Unknown");
            if (!Value.IsEmpty() && !Unit.IsEmpty()) Name += TEXT(" ") + Unit;
            if (!Condition.IsEmpty()) Name += TEXT("  ") + Condition;
            Add(MoveTemp(Name));
        }
        for (const auto& Entry : Array(Player, TEXT("statusEffects")))
        {
            const auto Effect = Record(Entry);
            Add(String(Effect, TEXT("label")));
            Add(String(Effect, TEXT("explanation")));
        }
        const auto Action = Object(Player, TEXT("action"));
        const auto Activity = Object(Player, TEXT("activity"));
        const bool bHasWork = Bool(Player, TEXT("hasWork"));
        if (bHasWork || Bool(Action, TEXT("showStatus")))
        {
            FString Work = String(Action, TEXT("label"));
            if (Work.IsEmpty()) Work = String(Activity, TEXT("name"));
            if (Work.IsEmpty() && bHasWork) Work = TEXT("Work is waiting");
            double Progress = 0;
            if (!Work.IsEmpty() && Number(Action, TEXT("progress"), Progress) && Progress > 0)
                Work += TEXT("  ") + FText::AsPercent(Progress).ToString();
            Add(MoveTemp(Work));
            Add(String(Action, TEXT("detail")));
            Add(String(Activity, TEXT("reason")));
        }
        Add(String(Object(View, TEXT("persistence")), TEXT("message")));
        const FString Content = FString::Join(Lines, TEXT("\n"));
        if (!Content.Equals(CharacterText.ToString(), ESearchCase::CaseSensitive))
            CharacterText = FText::FromString(Content);
        if (!Rows->NumSlots()) Rows->AddSlot().AutoHeight()[
            SNew(STextBlock).Text_Lambda([this] { return CharacterText; }).AutoWrapText(true)];
    }

    void Request(bool bOlder)
    {
        auto* Owner = Session.Get();
        if (!Owner || !IsPaged()) return;
        bRefresh = false;
        ReadError = FText::GetEmpty();
        const uint64 Read = ++ReadSequence;
        ActiveRead = Read;
        Started = FPlatformTime::Seconds();
        const uint64 Candidate = ++Revision;
        auto Completion = [Weak = TWeakPtr<SOpenLegendReading>(SharedThis(this)), Read, Candidate,
            JournalRevision = Key.Revision, bOlder](int32 Code, FObject Result)
        {
            if (auto Reader = Weak.Pin()) Reader->Finish(Read, Candidate, Code, Result, JournalRevision, bOlder);
        };

        bool bSent;
        if (Selected == EReading::Events)
        {
            FString Route = TEXT("/api/world-events");
            if (bOlder && !EventsCursor.IsEmpty()) Route += TEXT("?cursor=") + OpenLegendWire::UrlEncode(EventsCursor);
            bSent = Owner->Read(Route, MoveTemp(Completion));
        }
        else if (Selected == EReading::Journal)
        {
            FString Route = TEXT("/api/history");
            if (bOlder && Older.IsSet() && Watermark.IsSet())
            {
                Route += FString::Printf(TEXT("?before=%llu&watermark=%llu"),
                    static_cast<unsigned long long>(Older.GetValue()),
                    static_cast<unsigned long long>(Watermark.GetValue()));
            }
            bSent = Owner->Read(Route, MoveTemp(Completion));
        }
        else
        {
            auto Body = MakeShared<FJsonObject>();
            if (!InventoryContainer.IsEmpty()) Body->SetStringField(TEXT("containerId"), InventoryContainer);
            if (!InventoryQuery.IsEmpty()) Body->SetStringField(TEXT("query"), InventoryQuery);
            if (bOlder && !InventoryCursor.IsEmpty()) Body->SetStringField(TEXT("cursor"), InventoryCursor);
            bSent = Owner->Send(TEXT("/api/inventory"), Body, MoveTemp(Completion));
        }
        if (!bSent)
        {
            ActiveRead = 0;
            ReadError = FText::FromString(TEXT("Could not open this page. Try refreshing."));
        }
    }

    void Finish(uint64 Read, uint64 Candidate, int32 Code, const FObject& Page,
        const FString& JournalRevision, bool bOlder)
    {
        if (ActiveRead != Read) return;
        ActiveRead = 0;
        if (Candidate != Revision)
        {
            if (bRefresh && !Key.Scope.IsEmpty()) Request(false);
            return;
        }
        const TArray<TSharedPtr<FJsonValue>>* Items = nullptr;
        const TCHAR* ItemField = Selected == EReading::Events ? TEXT("events") : TEXT("items");
        if (Code != 200 || !Page || !Page->TryGetArrayField(ItemField, Items)
            || (Selected == EReading::Inventory && !Bool(Page, TEXT("ok"))))
        {
            // A failed page turn leaves the previous same-owner story or event page readable.
            // Inventory commands from a failed refresh stay disabled until a fresh page arrives.
            if (Selected == EReading::Inventory)
            {
                Invalidate();
                if (!InventoryContainer.IsEmpty()) AddInventoryHome();
            }
            const FString Message = String(Page, TEXT("message"));
            ReadError = FText::FromString(Message.IsEmpty()
                ? TEXT("Could not open this page. Try refreshing.") : Message);
            return;
        }

        Rows->ClearChildren();
        Scroll->ScrollToStart();
        if (Selected == EReading::Events)
        {
            bHistoricEvents = true;
            EventsCursor = String(Page, TEXT("nextCursor"));
            RenderEventRows(*Items, TEXT("No recorded events."));
            return;
        }
        if (Selected == EReading::Journal)
        {
            if (!bOlder)
            {
                LoadedJournalRevision = JournalRevision;
                bJournalLoaded = true;
            }
            uint64 Before = 0;
            uint64 Mark = 0;
            Older.Reset();
            Watermark.Reset();
            if (OpenLegendWire::ReadRevision(*Page, TEXT("watermark"), Mark)
                && OpenLegendWire::ReadRevision(*Page, TEXT("before"), Before))
            {
                Older = Before;
                Watermark = Mark;
            }
            for (const auto& Entry : *Items)
            {
                const auto Item = Record(Entry);
                AddLine(String(Item, TEXT("text")));
                if (String(Item, TEXT("status")) == TEXT("pending"))
                    AddLine(TEXT("Prose is being prepared. The recorded facts are shown here."));
                if (String(Item, TEXT("sourceStatus")) == TEXT("unavailable"))
                    AddLine(TEXT("The original source is no longer available."));
            }
            Status = Items->IsEmpty() ? FText::FromString(TEXT("No story entries have been recorded yet.")) : FText::GetEmpty();
            return;
        }

        RenderInventory(Page, *Items);
    }

    bool CurrentInventoryPage(uint64 Page) const
    {
        return Selected == EReading::Inventory && !Key.Scope.IsEmpty() && !ActiveRead && Page == Revision;
    }

    void ChangeInventory(FString Container)
    {
        InventoryContainer = MoveTemp(Container);
        ResetInventorySearch();
        Invalidate();
        Request(false);
    }

    void SearchInventory(const FText& Text, ETextCommit::Type Commit)
    {
        if (Commit != ETextCommit::OnEnter || Selected != EReading::Inventory || Key.Scope.IsEmpty()) return;
        const FString Query = Text.ToString().TrimStartAndEnd();
        if (Query.Equals(InventoryQuery, ESearchCase::CaseSensitive)) return;
        InventoryQuery = Query;
        Invalidate();
        // A superseded answer cannot populate the new search. Keep only one read in flight.
        if (ActiveRead) bRefresh = true;
        else Request(false);
    }

    void AddInventoryHome()
    {
        InventoryPath->AddSlot().AutoWidth()[
            SNew(SButton).Text(FText::FromString(TEXT("Your belongings")))
            .IsEnabled_Lambda([this, Page = Revision] { return CurrentInventoryPage(Page); })
            .OnClicked_Lambda([this, Page = Revision] {
                if (CurrentInventoryPage(Page)) ChangeInventory(FString());
                return FReply::Handled();
            })];
    }

    void RenderInventory(const FObject& Page, const TArray<TSharedPtr<FJsonValue>>& Items)
    {
        InventoryCursor = String(Page, TEXT("next"));
        const FString Container = String(Object(Page, TEXT("container")), TEXT("id"));
        const auto& InventoryBreadcrumbs = Array(Page, TEXT("breadcrumbs"));
        const FString Actor = InventoryBreadcrumbs.IsEmpty()
            ? FString() : String(Record(InventoryBreadcrumbs[0]), TEXT("id"));
        OpenInventoryDetail.Reset();
        InventoryPath->ClearChildren();
        if (!InventoryContainer.IsEmpty())
        {
            AddInventoryHome();
            const auto& Breadcrumbs = Array(Page, TEXT("breadcrumbs"));
            if (Breadcrumbs.Num() > 2)
            {
                const auto Crumb = Record(Breadcrumbs[Breadcrumbs.Num() - 2]);
                const FString Id = String(Crumb, TEXT("id"));
                const FString Name = String(Crumb, TEXT("name"));
                if (!Id.IsEmpty() && !Name.IsEmpty()) InventoryPath->AddSlot().FillWidth(1)[
                    SNew(SButton).Text(FText::FromString(Name))
                    .IsEnabled_Lambda([this, Generation = Revision] { return CurrentInventoryPage(Generation); })
                    .OnClicked_Lambda([this, Id, Generation = Revision] {
                        if (CurrentInventoryPage(Generation)) ChangeInventory(Id);
                        return FReply::Handled();
                    })];
            }
            AddLine(String(Object(Page, TEXT("container")), TEXT("name")));
        }
        for (const auto& Entry : Items)
        {
            const auto Item = Record(Entry);
            FString Name = String(Item, TEXT("name"));
            if (Name.IsEmpty()) continue;
            uint64 Quantity = 0;
            if (OpenLegendWire::ReadRevision(*Item, TEXT("quantity"), Quantity) && Quantity > 1)
                Name += FString::Printf(TEXT(" × %llu"), static_cast<unsigned long long>(Quantity));
            if (Bool(Item, TEXT("equipped"))) Name += TEXT(" (equipped)");
            const auto Detail = SNew(SBox);
            Rows->AddSlot().AutoHeight().Padding(0, 2)[
                SNew(SVerticalBox)
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SButton).Text(FText::FromString(Name))
                    .IsEnabled_Lambda([this, Generation = Revision] { return CurrentInventoryPage(Generation); })
                    .OnClicked_Lambda([this, Item, Container, Actor, Spot = TWeakPtr<SBox>(Detail), Generation = Revision] {
                        if (CurrentInventoryPage(Generation)) SelectInventoryItem(Item, Container, Actor, Spot, Generation);
                        return FReply::Handled();
                    })]
                + SVerticalBox::Slot().AutoHeight()[Detail]];
        }
        Status = FText::GetEmpty();
        if (Items.IsEmpty())
        {
            Status = FText::FromString(!InventoryQuery.IsEmpty() ? TEXT("Nothing matches this search.")
                : InventoryContainer.IsEmpty() ? TEXT("You are carrying nothing.") : TEXT("This container is empty."));
        }
    }

    void SelectInventoryItem(const FObject& Item, const FString& Container, const FString& Actor,
        const TWeakPtr<SBox>& Spot, uint64 Page)
    {
        const auto SelectedSpot = Spot.Pin();
        if (!SelectedSpot) return;
        const auto Previous = OpenInventoryDetail.Pin();
        if (Previous) Previous->SetContent(SNullWidget::NullWidget);
        OpenInventoryDetail.Reset();
        if (Previous == SelectedSpot) return;
        OpenInventoryDetail = SelectedSpot;

        const auto Details = SNew(SVerticalBox);
        const FString Description = String(Item, TEXT("description"));
        if (!Description.IsEmpty())
            Details->AddSlot().AutoHeight()[SText(Description)];

        const FString Id = String(Item, TEXT("id"));
        if (Object(Item, TEXT("container")) && !Id.IsEmpty())
        {
            Details->AddSlot().AutoHeight()[
                SNew(SButton).Text(FText::FromString(TEXT("Open")))
                .IsEnabled_Lambda([this, Page] { return CurrentInventoryPage(Page); })
                .OnClicked_Lambda([this, Id, Page] {
                    if (CurrentInventoryPage(Page)) ChangeInventory(Id);
                    return FReply::Handled();
                })];
        }
        TArray<FString> PutAway;
        for (const auto& Conflict : Array(Item, TEXT("equipmentConflicts")))
        {
            FString Name = String(Record(Conflict), TEXT("name"));
            if (!Name.IsEmpty()) PutAway.Add(MoveTemp(Name));
        }
        if (!PutAway.IsEmpty())
            Details->AddSlot().AutoHeight()[SText(TEXT("Equipping this puts away: ") + FString::Join(PutAway, TEXT(", ")))];
        for (const auto& Entry : Array(Item, TEXT("actions")))
            AddInventoryAction(Details, Item, Record(Entry), Page);
        AddCarriedMove(Details, Item, Container, Actor, Spot, Page);
        SelectedSpot->SetContent(Details);
    }

    void AddCarriedMove(const TSharedRef<SVerticalBox>& Details, const FObject& Item,
        const FString& Container, const FString& Actor, TWeakPtr<SBox> Spot, uint64 Page)
    {
        FCarriedMove Move;
        Move.Actor = Actor;
        Move.Source = Container;
        Move.Item = String(Item, TEXT("id"));
        const auto Group = Object(Item, TEXT("group"));
        Move.Group = String(Group, TEXT("token"));
        Move.bBag = Object(Item, TEXT("container")).IsValid();
        if (Move.Item.IsEmpty() || Container.IsEmpty() || Actor.IsEmpty() || (Group && Move.Group.IsEmpty())
            || !OpenLegendWire::ReadRevision(*Item, TEXT("revision"), Move.Revision)
            || !OpenLegendWire::ReadRevision(*Item, TEXT("placementRevision"), Move.Placement)
            || !OpenLegendWire::ReadRevision(*Item, TEXT("availableQuantity"), Move.Available)
            || Move.Available == 0)
            return;
        const auto Panel = SNew(SBox);
        const auto Open = MakeShared<bool>(false);
        const auto Weak = TWeakPtr<SOpenLegendReading>(SharedThis(this));
        const auto CanMove = [Weak, Spot, Page] {
            const auto Owner = Weak.Pin();
            const auto Detail = Spot.Pin();
            return Owner && Detail && Owner->OpenInventoryDetail.Pin() == Detail
                && Owner->CurrentInventoryPage(Page) && Owner->Key.bCanUseInventory
                && Owner->SubmitCommand && Owner->CanSubmitCommand && Owner->CanSubmitCommand();
        };
        Details->AddSlot().AutoHeight()[
            SNew(SButton).Text_Lambda([Open] {
                return FText::FromString(*Open ? TEXT("Close destinations") : TEXT("Move…"));
            })
            .IsEnabled_Lambda([Open, CanMove] { return *Open || CanMove(); })
            .OnClicked_Lambda([Weak, Move, CanMove, Open, Place = TWeakPtr<SBox>(Panel)] {
                const auto Owner = Weak.Pin();
                const auto Widget = Place.Pin();
                auto* Session = Owner ? Owner->Session.Get() : nullptr;
                if (!Widget || !Session) return FReply::Handled();
                if (*Open)
                {
                    *Open = false;
                    Widget->SetContent(SNullWidget::NullWidget);
                }
                else if (CanMove())
                {
                    *Open = true;
                    const auto Picker = SNew(SOpenLegendCarriedMove).Session(Session).Move(Move).CanSubmit(CanMove)
                        .Submit(Owner->SubmitCommand);
                    Widget->SetContent(Picker);
                    Picker->Start();
                }
                return FReply::Handled();
            })];
        Details->AddSlot().AutoHeight()[Panel];
    }

    static TSharedRef<STextBlock> SText(const FString& Text)
    {
        return SNew(STextBlock).Text(FText::FromString(Text)).AutoWrapText(true);
    }

    // Bound an edited quantity by the values disclosed with the exact command.
    // A split addresses the representative lot, while Drop can use the offered group token.
    static uint64 MaximumAmount(const FObject& Item, const FObject& Command)
    {
        uint64 Quantity = 0;
        uint64 Available = 0;
        const FString Type = String(Command, TEXT("type"));
        const auto Group = Object(Item, TEXT("group"));
        if (Type == TEXT("split-item"))
        {
            OpenLegendWire::ReadRevision(Group ? *Group : *Item,
                Group ? TEXT("representativeQuantity") : TEXT("quantity"), Quantity);
            OpenLegendWire::ReadRevision(Group ? *Group : *Item,
                Group ? TEXT("representativeAvailableQuantity") : TEXT("availableQuantity"), Available);
            return Quantity > 1 ? FMath::Min(Available, Quantity - 1) : 0;
        }
        if (Type == TEXT("drop"))
        {
            OpenLegendWire::ReadRevision(*Command, TEXT("quantity"), Quantity);
            OpenLegendWire::ReadRevision(*Item, TEXT("availableQuantity"), Available);
            return FMath::Min(Available, Quantity);
        }
        return 0;
    }

    void AddInventoryAction(const TSharedRef<SVerticalBox>& Details, const FObject& Item,
        const FObject& Action, uint64 Page)
    {
        const auto Command = Object(Action, TEXT("command"));
        const FString Label = String(Action, TEXT("label"));
        if (!Command || Label.IsEmpty()) return;
        const FString Reason = String(Action, TEXT("reason"));
        const bool bOffered = Bool(Action, TEXT("enabled"));
        const FString Type = String(Command, TEXT("type"));
        const bool bHasAmount = Type == TEXT("drop") || Type == TEXT("split-item");
        const uint64 Maximum = bHasAmount ? MaximumAmount(Item, Command) : 0;
        TSharedPtr<SSpinBox<int64>> Amount;
        if (Maximum > 1)
            SAssignNew(Amount, SSpinBox<int64>).Value(1).MinValue(1).MaxValue(static_cast<int64>(Maximum))
                .Delta(1).MinFractionalDigits(0).MaxFractionalDigits(0);
        const auto CanApply = [this, Page, bOffered, bHasAmount, Maximum] {
            return bOffered && (!bHasAmount || Maximum > 0) && CurrentInventoryPage(Page)
                && SubmitCommand && CanSubmitCommand && CanSubmitCommand();
        };
        const auto Row = SNew(SHorizontalBox);
        if (Amount)
        {
            Row->AddSlot().AutoWidth().VAlign(VAlign_Center).Padding(0, 0, 4, 0)[
                SNew(STextBlock).Text(FText::FromString(TEXT("Amount")))];
            Row->AddSlot().FillWidth(1).Padding(0, 0, 4, 0)[Amount.ToSharedRef()];
        }
        Row->AddSlot().AutoWidth()[
            SNew(SButton).Text(FText::FromString(Label)).IsEnabled_Lambda(CanApply)
            .OnClicked_Lambda([this, Command, Amount, CanApply, bHasAmount] {
                if (CanApply())
                {
                    auto Chosen = MakeShared<FJsonObject>(*Command);
                    if (bHasAmount) Chosen->SetNumberField(TEXT("quantity"), Amount ? Amount->GetValue() : 1);
                    SubmitCommand(MoveTemp(Chosen));
                }
                return FReply::Handled();
            })];
        Details->AddSlot().AutoHeight()[Row];
        if (!bOffered && !Reason.IsEmpty()) Details->AddSlot().AutoHeight()[SText(Reason)];
    }

    TWeakObjectPtr<UOpenLegendSession> Session;
    TFunction<bool()> CanSubmitCommand;
    TFunction<void(TSharedPtr<FJsonObject>)> SubmitCommand;
    TSharedPtr<SHorizontalBox> InventoryPath;
    TSharedPtr<SEditableTextBox> InventorySearch;
    TWeakPtr<SBox> OpenInventoryDetail;
    FDelegateHandle ViewChanged;
    TSharedPtr<SVerticalBox> Rows;
    TSharedPtr<SScrollBox> Scroll;
    TWeakPtr<FJsonValue> LastEvents, LastStory;
    EReading Selected = EReading::Closed;
    FReadKey Key;
    FText Status, ReadError, CharacterText, CurrentStory;
    FString InventoryCursor, InventoryContainer, InventoryQuery, EventsCursor, LoadedJournalRevision;
    bool bHistoricEvents = false;
    bool bJournalLoaded = false;
    TOptional<uint64> Older, Watermark;
    uint64 Revision = 0;
    uint64 ReadSequence = 0;
    uint64 ActiveRead = 0;
    double Started = 0.0;
    bool bRefresh = false;
};
}

TSharedRef<SWidget> MakeOpenLegendReading(UOpenLegendSession& Session, TFunction<bool()> CanSubmitCommand,
    TFunction<void(TSharedPtr<FJsonObject>)> SubmitCommand)
{
    return SNew(SOpenLegendReading).Session(&Session).CanSubmitCommand(MoveTemp(CanSubmitCommand))
        .SubmitCommand(MoveTemp(SubmitCommand));
}
