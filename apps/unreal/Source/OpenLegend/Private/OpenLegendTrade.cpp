#include "OpenLegendTrade.h"

#include "Net/OpenLegendSession.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/Text/STextBlock.h"

namespace
{
using namespace OpenLegend;

struct FTradeKey
{
    FString Contact;
    FString Scope;
    FString TradeScope;
    FString Timeline;
    FString History;
    FString Revision;

    bool SameOwner(const FTradeKey& Other) const
    {
        return SameWireText(Contact, Other.Contact) && SameWireText(Scope, Other.Scope)
            && SameWireText(TradeScope, Other.TradeScope) && SameWireText(Timeline, Other.Timeline)
            && SameWireText(History, Other.History);
    }

    bool operator==(const FTradeKey& Other) const
    {
        return SameOwner(Other) && SameWireText(Revision, Other.Revision);
    }
};

struct FTerm
{
    FObject Item;
    FString Quantity;
    bool bGive = false;
};

TOptional<uint64> Quantity(const FString& Text, const FObject& Item)
{
    const double Maximum = NumberOr(Item, TEXT("quantity"), 0);
    uint64 Count = 0;
    if (!LexTryParseString(Count, *Text) || Count == 0 || Count > 9007199254740991ULL
        || !SameWireText(Text, FString::Printf(TEXT("%llu"), static_cast<unsigned long long>(Count)))
        || static_cast<double>(Count) > Maximum
        || (Bool(Item, TEXT("whole")) && static_cast<double>(Count) != Maximum))
        return {};
    return Count;
}

class SOpenLegendTrade final : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SOpenLegendTrade) {}
        SLATE_ARGUMENT(UOpenLegendSession*, Session)
    SLATE_END_ARGS()

    void Construct(const FArguments& Args, FOpenLegendTradeActions InActions)
    {
        Session = Args._Session;
        Actions = MoveTemp(InActions);
        ChildSlot[
            SNew(SVerticalBox)
            + SVerticalBox::Slot().AutoHeight()[
                SNew(SHorizontalBox)
                + SHorizontalBox::Slot().AutoWidth()[
                    SNew(SButton).Text_Lambda([this] { return FText::FromString(Title()); })
                    .Visibility_Lambda([this]
                    {
                        return Title().IsEmpty() || !Key.Contact.IsEmpty()
                            ? EVisibility::Collapsed : EVisibility::Visible;
                    })
                    .OnClicked(this, &SOpenLegendTrade::Open)]
                + SHorizontalBox::Slot().AutoWidth()[
                    SNew(SButton).Text(FText::FromString(TEXT("Close")))
                    .Visibility_Lambda([this] { return PanelVisibility(); })
                    .OnClicked(this, &SOpenLegendTrade::ClosePanel)]]
            + SVerticalBox::Slot().AutoHeight()[
                SNew(SVerticalBox).Visibility_Lambda([this] { return PanelVisibility(); })
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(STextBlock).Text_Lambda([this] { return Status; }).AutoWrapText(true)]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SBox).MaxDesiredHeight(250)[
                        SNew(SScrollBox) + SScrollBox::Slot()[SAssignNew(Rows, SVerticalBox)]]]]];
        Args._Session->OnViewChanged.AddSP(this, &SOpenLegendTrade::ViewChanged);
    }

    ~SOpenLegendTrade()
    {
        if (Session.IsValid()) Session->OnViewChanged.RemoveAll(this);
    }

private:
    EVisibility PanelVisibility() const
    {
        return Key.Contact.IsEmpty() ? EVisibility::Collapsed : EVisibility::Visible;
    }

    FString Title() const
    {
        return String(Object(Object(Actions.SelectedContact(), TEXT("trade")), TEXT("labels")), TEXT("title"));
    }

    FTradeKey Current() const
    {
        const auto View = Session.IsValid() ? Session->GetView() : nullptr;
        const auto Access = Object(View, TEXT("access"));
        const FString SelectedId = String(Actions.SelectedContact(), TEXT("id"));
        FObject Summary;
        if (!SelectedId.IsEmpty())
        {
            for (const auto& Value : Array(View, TEXT("entities")))
            {
                const auto Contact = Record(Value);
                if (!SameWireText(SelectedId, String(Contact, TEXT("id")))) continue;
                Summary = Object(Contact, TEXT("trade"));
                break;
            }
        }
        FTradeKey Result;
        Result.Scope = String(Access, TEXT("scope"));
        Result.TradeScope = String(Summary, TEXT("scope"));
        Result.Timeline = String(View, TEXT("saveTimeline"));
        Result.History = String(View, TEXT("historyEpoch"));
        Result.Revision = String(Summary, TEXT("revision"));
        if (Bool(Access, TEXT("controlling")) && !Result.Scope.IsEmpty() && !Result.TradeScope.IsEmpty()
            && !Result.Timeline.IsEmpty() && !Result.Revision.IsEmpty())
            Result.Contact = String(Summary, TEXT("personId"));
        return Result;
    }

    FReply Open()
    {
        Key = Current();
        if (!Key.Contact.IsEmpty())
        {
            Actions.Opened();
            Read();
        }
        return FReply::Handled();
    }

    FReply ClosePanel()
    {
        Key = {};
        ++ReadId;
        bLoading = false;
        Discard();
        Status = FText::GetEmpty();
        Rows->ClearChildren();
        return FReply::Handled();
    }

    void Discard()
    {
        Data.Reset();
        Terms.Reset();
        OtherLots.Reset();
        OtherCursor.Reset();
        PriorOffer.Reset();
        OtherReadId = 0;
        bReadRemembered = false;
    }

    void ViewChanged()
    {
        if (Key.Contact.IsEmpty()) return;
        const FTradeKey Now = Current();
        if (!Now.SameOwner(Key))
        {
            ClosePanel();
            return;
        }
        if (Now == Key) return;
        Key = Now;
        Discard();
        Rows->ClearChildren();
        Read();
    }

    bool Ready() const
    {
        return Data && Key == Current() && Actions.CanSubmit();
    }

    void Read()
    {
        auto* Owner = Session.Get();
        if (!Owner || bLoading || Key.Contact.IsEmpty()) return;
        Rows->ClearChildren();
        Status = FText::FromString(TEXT("Reading current offers…"));
        auto Body = MakeShared<FJsonObject>();
        Body->SetStringField(TEXT("personId"), Key.Contact);
        const auto Requested = Key;
        const uint64 Id = ++ReadId;
        bLoading = Owner->Send(TEXT("/api/trade"), Body,
            [Weak = TWeakPtr<SOpenLegendTrade>(SharedThis(this)), Id, Requested](int32, FObject Result)
        {
            const auto Self = Weak.Pin();
            if (!Self || Self->ReadId != Id) return;
            Self->bLoading = false;
            if (!Requested.SameOwner(Self->Current()))
            {
                Self->ClosePanel();
                return;
            }
            if (!(Requested == Self->Key))
            {
                Self->Read();
                return;
            }
            const auto NewData = Object(Result, TEXT("trade"));
            if (!Bool(Result, TEXT("ok")) || !SameWireText(String(NewData, TEXT("scope")), Requested.TradeScope)
                || !SameWireText(String(NewData, TEXT("personId")), Requested.Contact))
            {
                Self->Fail(String(Result, TEXT("message")));
                return;
            }
            Self->Data = NewData;
            Self->Status = FText::GetEmpty();
            Self->Render();
        });
        if (!bLoading) Fail({});
    }

    void Fail(const FString& Reason)
    {
        Status = FText::FromString(Reason.IsEmpty() ? TEXT("Offers are unavailable.") : Reason);
        Rows->ClearChildren();
        Rows->AddSlot().AutoHeight()[
            SNew(SButton).Text(FText::FromString(TEXT("Refresh"))).OnClicked_Lambda([this]
            {
                ViewChanged();
                Read();
                return FReply::Handled();
            })];
    }

    FString Label(const TCHAR* Name) const
    {
        return String(Object(Data, TEXT("labels")), Name);
    }

    void Line(const FString& Text)
    {
        if (!Text.IsEmpty())
            Rows->AddSlot().AutoHeight()[SNew(STextBlock).Text(FText::FromString(Text)).AutoWrapText(true)];
    }

    void Button(const FString& Text, TFunction<void()> Click, bool bEnabled = true)
    {
        if (Text.IsEmpty()) return;
        Rows->AddSlot().AutoHeight()[
            SNew(SButton).Text(FText::FromString(Text))
            .IsEnabled_Lambda([this, bEnabled] { return bEnabled && Data && Actions.CanSubmit(); })
            .OnClicked_Lambda([this, Click = MoveTemp(Click)]
            {
                if (Ready()) Click();
                return FReply::Handled();
            })];
    }

    FString LotLabel(const FObject& Item) const
    {
        FString Text = String(Item, TEXT("label"));
        if (Text.IsEmpty()) Text = String(Item, TEXT("name"));
        return FText::Format(FText::FromString(TEXT("{0} × {1}")),
            FText::AsNumber(NumberOr(Item, TEXT("quantity"), 0)), FText::FromString(Text)).ToString();
    }

    void AddTerm(const FObject& Item, bool bGive, bool bFullQuantity)
    {
        const FString Id = String(Item, TEXT("id"));
        const auto Count = NumberOr(Item, TEXT("quantity"), 0);
        if (Id.IsEmpty() || Count < 1 || Count > 9007199254740991.0 || Count != FMath::FloorToDouble(Count))
            return;
        const double Limit = NumberOr(Data, TEXT("maximumLots"), 0);
        if (Terms.Num() >= Limit || Terms.ContainsByPredicate([&](const FTerm& Term)
            { return Term.bGive == bGive && SameWireText(Id, String(Term.Item, TEXT("id"))); }))
            return;
        Terms.Add({Item, LexToString(static_cast<uint64>(Bool(Item, TEXT("whole")) || bFullQuantity ? Count : 1)), bGive});
    }

    void ReadRemembered()
    {
        auto* Owner = Session.Get();
        if (!Owner || OtherReadId) return;
        auto Body = MakeShared<FJsonObject>();
        Body->SetStringField(TEXT("personId"), Key.Contact);
        if (!OtherCursor.IsEmpty()) Body->SetStringField(TEXT("cursor"), OtherCursor);
        const FTradeKey Requested = Key;
        const uint64 Id = ++OtherSerial;
        OtherReadId = Id;
        if (!Owner->Send(TEXT("/api/trade/disclosures"), Body,
            [Weak = TWeakPtr<SOpenLegendTrade>(SharedThis(this)), Id, Requested](int32, FObject Result)
        {
            const auto Self = Weak.Pin();
            if (!Self || Id != Self->OtherReadId) return;
            Self->OtherReadId = 0;
            if (!(Requested == Self->Current()) || !(Requested == Self->Key)) return;
            if (!Bool(Result, TEXT("ok")))
            {
                Self->Status = FText::FromString(String(Result, TEXT("message")));
                return;
            }
            Self->Status = FText::GetEmpty();
            Self->bReadRemembered = true;
            Self->OtherLots = Array(Result, TEXT("items"));
            Self->OtherCursor = String(Result, TEXT("next"));
            Self->Render();
        }))
            OtherReadId = 0;
    }

    void Render()
    {
        Rows->ClearChildren();
        Line(String(Data, TEXT("personName")));
        for (const auto& Value : Array(Data, TEXT("offers")))
        {
            const auto Offer = Record(Value);
            Line(Label(Bool(Offer, TEXT("incoming")) ? TEXT("incoming") : TEXT("waiting")));
            for (const auto* Side : {TEXT("give"), TEXT("receive")})
            {
                const auto& Items = Array(Offer, Side);
                if (!Items.IsEmpty()) Line(Label(Side));
                for (const auto& Item : Items) Line(LotLabel(Record(Item)));
            }
            for (const auto& ActionValue : Array(Offer, TEXT("actions")))
            {
                const auto Action = Record(ActionValue);
                const auto Command = Object(Action, TEXT("command"));
                if (Command)
                    Button(String(Action, TEXT("label")), [this, Command]
                    { Actions.Submit(MakeShared<FJsonObject>(*Command)); }, Bool(Action, TEXT("enabled")));
            }
            if (!Bool(Data, TEXT("giftOnly")))
                Button(Label(TEXT("counter")), [this, Offer]
                {
                    Terms.Reset();
                    PriorOffer = Offer;
                    for (const auto& Lot : Array(Offer, TEXT("give"))) AddTerm(Record(Lot), true, true);
                    for (const auto& Lot : Array(Offer, TEXT("receive"))) AddTerm(Record(Lot), false, true);
                    Render();
                });
        }
        if (PriorOffer)
            Button(Label(TEXT("newOffer")), [this] { Terms.Reset(); PriorOffer.Reset(); Render(); });
        RenderChoices(TEXT("give"), Array(Data, TEXT("ownLots")), true);
        if (!Bool(Data, TEXT("giftOnly")))
        {
            RenderChoices(TEXT("receive"), Array(Data, TEXT("knownLots")), false);
            RenderChoices(TEXT("remembered"), OtherLots, false);
            if (!bReadRemembered || !OtherCursor.IsEmpty())
                Button(OtherCursor.IsEmpty() ? Label(TEXT("remembered")) : TEXT("Load more"),
                    [this] { ReadRemembered(); }, OtherReadId == 0);
        }
        for (int32 Index = 0; Index < Terms.Num(); ++Index)
        {
            const FTerm& Term = Terms[Index];
            Line(Label(Term.bGive ? TEXT("give") : TEXT("receive")) + TEXT(" · ") + LotLabel(Term.Item));
            if (!Bool(Term.Item, TEXT("whole")))
                Rows->AddSlot().AutoHeight()[
                    SNew(SEditableTextBox).Text(FText::FromString(Term.Quantity))
                    .HintText(FText::FromString(Label(Term.bGive ? TEXT("giveQuantity") : TEXT("receiveQuantity"))))
                    .OnTextChanged_Lambda([this, Index](const FText& Text)
                    {
                        if (Terms.IsValidIndex(Index)) Terms[Index].Quantity = Text.ToString();
                    })];
            Button(TEXT("Remove"), [this, Index] { Terms.RemoveAt(Index); Render(); });
        }
        if (!Terms.IsEmpty())
            Button(Label(PriorOffer ? TEXT("counter") : TEXT("offer")), [this] { SubmitTerms(); });
    }

    void RenderChoices(const TCHAR* Heading, const TArray<TSharedPtr<FJsonValue>>& Items, bool bGive)
    {
        if (Items.IsEmpty()) return;
        Line(Label(Heading));
        for (const auto& ItemValue : Items)
        {
            const auto Item = Record(ItemValue);
            Button(LotLabel(Item), [this, Item, bGive] { AddTerm(Item, bGive, false); Render(); });
        }
    }

    void SubmitTerms()
    {
        TArray<TSharedPtr<FJsonValue>> Give, Receive;
        for (const auto& Term : Terms)
        {
            const auto Amount = Quantity(Term.Quantity, Term.Item);
            const double Revision = NumberOr(Term.Item, TEXT("revision"), -1);
            const double Placement = NumberOr(Term.Item, TEXT("placementRevision"), -1);
            if (!Amount || Revision < 0 || Placement < 0)
            {
                Status = FText::FromString(TEXT("Choose an available whole-number quantity."));
                return;
            }
            auto Lot = MakeShared<FJsonObject>();
            Lot->SetStringField(TEXT("itemId"), String(Term.Item, TEXT("id")));
            Lot->SetNumberField(TEXT("quantity"), static_cast<double>(Amount.GetValue()));
            Lot->SetNumberField(TEXT("expectedRevision"), Revision);
            Lot->SetNumberField(TEXT("placementRevision"), Placement);
            double Contents;
            if (Number(Term.Item, TEXT("contentsRevision"), Contents))
                Lot->SetNumberField(TEXT("expectedContentsRevision"), Contents);
            (Term.bGive ? Give : Receive).Add(MakeShared<FJsonValueObject>(Lot));
        }
        if (Give.IsEmpty())
        {
            Status = FText::FromString(Label(TEXT("selectionHint")));
            return;
        }
        auto Command = MakeShared<FJsonObject>();
        Command->SetStringField(TEXT("type"), TEXT("handover"));
        Command->SetStringField(TEXT("handoverOperation"), PriorOffer ? TEXT("counter") : TEXT("offer"));
        Command->SetStringField(TEXT("targetId"), Key.Contact);
        Command->SetArrayField(TEXT("offeredItems"), MoveTemp(Give));
        Command->SetArrayField(TEXT("requestedItems"), MoveTemp(Receive));
        if (PriorOffer)
        {
            Command->SetStringField(TEXT("offerId"), String(PriorOffer, TEXT("id")));
            Command->SetNumberField(TEXT("expectedOfferRevision"), NumberOr(PriorOffer, TEXT("revision"), -1));
        }
        Actions.Submit(Command);
    }

    TWeakObjectPtr<UOpenLegendSession> Session;
    FOpenLegendTradeActions Actions;
    TSharedPtr<SVerticalBox> Rows;
    FTradeKey Key;
    FObject Data, PriorOffer;
    TArray<FTerm> Terms;
    TArray<TSharedPtr<FJsonValue>> OtherLots;
    FString OtherCursor;
    FText Status;
    uint64 ReadId = 0, OtherSerial = 0, OtherReadId = 0;
    bool bLoading = false;
    bool bReadRemembered = false;
};
}

TSharedRef<SWidget> MakeOpenLegendTrade(UOpenLegendSession& Session, FOpenLegendTradeActions Actions)
{
    return SNew(SOpenLegendTrade, MoveTemp(Actions)).Session(&Session);
}
