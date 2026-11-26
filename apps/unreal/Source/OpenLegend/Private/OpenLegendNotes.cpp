#include "OpenLegendNotes.h"

#include "Net/OpenLegendSession.h"
#include "Framework/Application/SlateApplication.h"
#include "Widgets/Input/SButton.h"
#include "Widgets/Input/SMultiLineEditableTextBox.h"
#include "Widgets/Input/SEditableTextBox.h"
#include "Widgets/Layout/SBox.h"
#include "Widgets/Layout/SScrollBox.h"
#include "Widgets/SBoxPanel.h"
#include "Widgets/SCompoundWidget.h"
#include "Widgets/Text/STextBlock.h"

namespace
{
using namespace OpenLegend;

struct FNotesCut
{
    FString Scope, World, Timeline, History, Actor;
    double Revision = -1.0;
    bool bControlling = false;

    bool SameOwner(const FNotesCut& Other) const
    {
        return SameWireText(Scope, Other.Scope) && SameWireText(World, Other.World)
            && SameWireText(Timeline, Other.Timeline)
            && SameWireText(History, Other.History) && SameWireText(Actor, Other.Actor);
    }
};

FNotesCut ReadCut(const FObject& View)
{
    const auto Access = Object(View, TEXT("access"));
    const auto Player = Object(View, TEXT("player"));
    return {
        String(Access, TEXT("scope")), String(View, TEXT("worldId")), String(View, TEXT("saveTimeline")),
        String(View, TEXT("historyEpoch")), String(Player, TEXT("id")),
        NumberOr(Player, TEXT("knowledgeRevision"), -1), Bool(Access, TEXT("controlling")),
    };
}

struct FNickname
{
    FString Text;
    FString KnownName;
    double Revision = 0;
    bool bAvailable = false;

    static FNickname Read(const FObject& Identity, const TCHAR* KnownNameField, bool bAvailable)
    {
        return {String(Identity, TEXT("nickname")), String(Identity, KnownNameField),
            NumberOr(Identity, TEXT("revision"), 0), bAvailable};
    }

    bool SameEditBase(const FNickname& Other) const
    {
        return bAvailable == Other.bAvailable && Revision == Other.Revision && SameWireText(Text, Other.Text);
    }
};

class SOpenLegendNicknameField final : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SOpenLegendNicknameField) {}
        SLATE_ATTRIBUTE(bool, ReadOnly)
        SLATE_EVENT(FSimpleDelegate, OnSave)
    SLATE_END_ARGS()

    void Construct(const FArguments& Args)
    {
        ChildSlot[
            SNew(SVerticalBox)
            + SVerticalBox::Slot().AutoHeight()[
                SNew(STextBlock).Text(FText::FromString(TEXT("Your nickname")))]
            + SVerticalBox::Slot().AutoHeight()[
                SNew(STextBlock).Text(FText::FromString(TEXT("Only you see this name. Leave it empty to clear it.")))]
            + SVerticalBox::Slot().AutoHeight()[
                SAssignNew(Editor, SEditableTextBox)
                .IsReadOnly(Args._ReadOnly)
                .OnTextCommitted_Lambda([Save = Args._OnSave](const FText&, ETextCommit::Type Reason)
                {
                    if (Reason == ETextCommit::OnEnter) Save.ExecuteIfBound();
                })]];
    }

    void SetName(const FNickname& Name)
    {
        Base = Name;
        Editor->SetText(FText::FromString(Base.Text));
    }

    bool HasEdit() const { return Base.bAvailable && !SameWireText(Base.Text, Value()); }
    FString Value() const { return Editor->GetText().ToString().TrimStartAndEnd(); }
    const FNickname& CurrentBase() const { return Base; }
    void Focus() const { FSlateApplication::Get().SetKeyboardFocus(Editor); }

private:
    FNickname Base;
    TSharedPtr<SEditableTextBox> Editor;
};

class SOpenLegendNotes final : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SOpenLegendNotes) {}
        SLATE_ARGUMENT(UOpenLegendSession*, Session)
    SLATE_END_ARGS()

    void Construct(const FArguments& Args, TFunction<void()> InOpened)
    {
        Session = Args._Session;
        Opened = MoveTemp(InOpened);
        ChildSlot[
            SNew(SVerticalBox)
            + SVerticalBox::Slot().AutoHeight()[
                SNew(SButton).Text(FText::FromString(TEXT("Notes")))
                .IsEnabled_Lambda([this] { return !Current().Scope.IsEmpty(); })
                .OnClicked_Lambda([this]
                {
                    if (bOpen) Close();
                    else if (!(Cut = Current()).Actor.IsEmpty())
                    {
                        bOpen = true;
                        Opened();
                        Read();
                    }
                    return FReply::Handled();
                })]
            + SVerticalBox::Slot().AutoHeight()[
                SNew(SVerticalBox).Visibility_Lambda([this]
                { return bOpen ? EVisibility::Visible : EVisibility::Collapsed; })
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(STextBlock).AutoWrapText(true).Text_Lambda([this] { return Status; })]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SBox).MaxDesiredHeight(140)[
                        SNew(SScrollBox) + SScrollBox::Slot()[SAssignNew(Choices, SVerticalBox)]]]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SBox).MinDesiredHeight(65).MaxDesiredHeight(150)[
                        SAssignNew(Editor, SMultiLineEditableTextBox)
                        .AutoWrapText(true)
                        .OnTextChanged_Lambda([this](const FText& Text)
                        { bDirty = !SameWireText(Text.ToString(), Baseline); })
                        .IsReadOnly_Lambda([this] { return bPending || !Mind || !Cut.bControlling || IsPlaceNote(); })]]
                + SVerticalBox::Slot().AutoHeight()[
                    SAssignNew(Name, SOpenLegendNicknameField)
                    .Visibility_Lambda([this]
                    { return Name && Name->CurrentBase().bAvailable ? EVisibility::Visible : EVisibility::Collapsed; })
                    .ReadOnly_Lambda([this] { return bPending || !bCurrent || bConflict; })]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SHorizontalBox)
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text_Lambda([this]
                        { return FText::FromString(Name && Name->HasEdit() ? TEXT("Save knowledge") : TEXT("Save note")); })
                        .IsEnabled_Lambda([this] { return CanSave(); })
                        .OnClicked(this, &SOpenLegendNotes::Save)]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Refresh")))
                        .IsEnabled_Lambda([this] { return !bPending; })
                        .OnClicked_Lambda([this] { Refresh(); return FReply::Handled(); })]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Discard edit")))
                        .Visibility_Lambda([this] { return bConflict ? EVisibility::Visible : EVisibility::Collapsed; })
                        .OnClicked_Lambda([this] { Select(LatestNote, LatestName); Refresh(); return FReply::Handled(); })]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("People")))
                        .IsEnabled_Lambda([this] { return Mind && !bPending && !HasEdit(); })
                        .OnClicked_Lambda([this] { PeopleQuery.Reset(); ReadPeople(); return FReply::Handled(); })]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Notes list")))
                        .IsEnabled_Lambda([this] { return !bPending && !HasEdit(); })
                        .OnClicked_Lambda([this] { Select(nullptr); Read(); return FReply::Handled(); })]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("More notes")))
                        .IsEnabled_Lambda([this] { return !bPending && !HasEdit() && !Cursor.IsEmpty(); })
                        .OnClicked_Lambda([this] { Read(Cursor); return FReply::Handled(); })]]]];
        Args._Session->OnViewChanged.AddSP(this, &SOpenLegendNotes::Verify);
    }

    ~SOpenLegendNotes()
    {
        if (Session.IsValid()) Session->OnViewChanged.RemoveAll(this);
    }

private:
    FNotesCut Current() const
    {
        return ReadCut(Session.IsValid() ? Session->GetView() : nullptr);
    }

    bool HasEdit() const { return bDirty || (Name && Name->HasEdit()); }

    bool IsPersonNote() const
    {
        const FString Kind = String(Object(Selected, TEXT("subjectId")), TEXT("kind"));
        return Kind == TEXT("entity") || Kind == TEXT("individual");
    }

    void Refresh()
    {
        Verify();
        if (IsPersonNote()) ReadPerson(Object(Selected, TEXT("subjectId")), true);
        else Read();
    }

    void Close()
    {
        bOpen = bPending = bCurrent = false;
        ++RequestId;
        Mind.Reset();
        Selected.Reset();
        Choices->ClearChildren();
        Baseline.Reset();
        Editor->SetText(FText::GetEmpty());
        bDirty = bConflict = false;
        Name->SetName({});
        LatestNote.Reset();
        LatestName = {};
        Status = FText::GetEmpty();
        Cursor.Reset();
        PeopleQuery.Reset();
    }

    void Verify()
    {
        if (!bOpen) return;
        const auto Now = Current();
        if (!Cut.SameOwner(Now) || Cut.bControlling != Now.bControlling)
        {
            Close();
            return;
        }
        if (!bPending && Cut.Revision != Now.Revision)
        {
            bCurrent = false;
            // Keep only the requested subject for an exact refresh. Old names
            // and unedited text disappear as soon as their read cut changes.
            Choices->ClearChildren();
            if (!HasEdit())
            {
                Baseline.Reset();
                Editor->SetText(FText::GetEmpty());
                Name->SetName({});
                bDirty = false;
            }
            Status = FText::FromString(TEXT("Notes changed. Refresh to see the current notes."));
        }
    }

    bool IsPlaceNote() const
    {
        return String(Object(Selected, TEXT("subjectId")), TEXT("kind")) == TEXT("place");
    }

    bool CanSave() const
    {
        return Mind && bCurrent && !bPending && !bConflict && Cut.bControlling && !IsPlaceNote() && HasEdit();
    }

    void Read(FString Page = {})
    {
        auto* Owner = Session.Get();
        if (!Owner || bPending || !bOpen || !Cut.SameOwner(Current())) return;
        Cut = Current();
        auto Body = MakeShared<FJsonObject>();
        Body->SetStringField(TEXT("actorId"), Cut.Actor);
        if (!Page.IsEmpty()) Body->SetStringField(TEXT("cursor"), Page);
        const auto Before = Cut;
        const uint64 Id = ++RequestId;
        bPending = Owner->Send(TEXT("/api/mind"), Body,
            [Weak = TWeakPtr<SOpenLegendNotes>(SharedThis(this)), Before, Id](int32, FObject Result)
        {
            if (const auto Self = Weak.Pin(); Self && Self->RequestId == Id)
                Self->Finish(Before, Result, false);
        });
        if (!bPending) Unavailable();
    }

    void Unavailable()
    {
        bCurrent = false;
        Status = FText::FromString(TEXT("Notes are unavailable. Refresh to try again."));
    }

    void Finish(const FNotesCut& Before, const FObject& Result, bool bSaved)
    {
        bPending = false;
        const auto Now = Current();
        if (!Before.SameOwner(Now) || Before.bControlling != Now.bControlling)
        {
            Close();
            return;
        }
        const auto Reply = Object(Result, TEXT("mind"));
        if (!Bool(Result, TEXT("ok")) || !SameWireText(String(Reply, TEXT("actorId")), Now.Actor))
        {
            Unavailable();
            const FString Reason = String(Result, TEXT("message"));
            if (!Reason.IsEmpty()) Status = FText::FromString(Reason);
            if (bSaved && Reason.IsEmpty())
                Status = FText::FromString(TEXT("Save result is unknown. Refresh before saving again."));
            return;
        }
        if (bSaved)
        {
            bCurrent = false;
            Status = FText::FromString(String(Result, TEXT("message")));
            // Confirm the exact edited person, even if they are outside the
            // first notes page or the stream already has a later revision.
            Refresh();
            return;
        }
        if (Before.Revision != Now.Revision)
        {
            Verify();
            return;
        }
        const bool bHadDraft = bDirty;
        const FString PriorText = Editor->GetText().ToString();
        const FString OldBaseline = Baseline;
        const double OldRevision = NumberOr(Selected, TEXT("revision"), 0);
        const FObject PriorSelection = Selected;
        Mind = Reply;
        Cut = Now;
        bCurrent = true;
        Cursor = String(Object(Mind, TEXT("continuity")), TEXT("cursor"));
        Choices->ClearChildren();
        FObject General, Match;
        for (const auto& Value : Array(Mind, TEXT("notepads")))
        {
            const auto Note = Record(Value);
            const auto Subject = Object(Note, TEXT("subjectId"));
            if (!Subject) General = Note;
            else AddChoice(String(Note, TEXT("label")), Note);
            if (SameSubject(Note, PriorSelection)) Match = Note;
        }
        AddChoice(TEXT("General note"), General);
        Select(Match ? Match : General);
        Status = FText::FromString(String(Result, TEXT("message")));
        if (bHadDraft && !bSaved && !SameWireText(PriorText, Baseline))
        {
            // Refresh can confirm the same edit or leave its draft unchanged. A
            // changed source never silently rebases that draft onto new authority.
            if (SameSubject(Selected, PriorSelection) && SameWireText(Baseline, OldBaseline)
                && NumberOr(Selected, TEXT("revision"), 0) == OldRevision)
                Editor->SetText(FText::FromString(PriorText));
            else
                Status = FText::FromString(TEXT("This note changed. Review the current text."));
        }
    }

    void ReadPerson(const FObject& Subject, bool bRefresh = false)
    {
        auto Body = MakeShared<FJsonObject>();
        Body->SetObjectField(TEXT("subjectId"), MakeShared<FJsonObject>(*Subject));
        ReadPeople(Body, bRefresh);
    }

    void ReadPeople(TSharedPtr<FJsonObject> Body = nullptr, bool bRefresh = false)
    {
        auto* Owner = Session.Get();
        const auto Now = Current();
        if (!Owner || !Mind || bPending || !Cut.SameOwner(Now) || Cut.bControlling != Now.bControlling
            || (!bRefresh && (HasEdit() || Cut.Revision != Now.Revision)))
            return;
        if (!Body) Body = MakeShared<FJsonObject>();
        const auto Subject = Object(Body, TEXT("subjectId"));
        Body->SetStringField(TEXT("actorId"), Cut.Actor);
        const uint64 Id = ++RequestId;
        bPending = Owner->Send(TEXT("/api/mind/subjects"), Body,
            [Weak = TWeakPtr<SOpenLegendNotes>(SharedThis(this)), Now, Id, Subject, bRefresh](int32, FObject Result)
        {
            const auto Self = Weak.Pin();
            if (!Self || Id != Self->RequestId) return;
            Self->bPending = false;
            const auto Current = Self->Current();
            if (!Now.SameOwner(Current) || Now.bControlling != Current.bControlling)
            {
                Self->Close();
                return;
            }
            if (Now.Revision != Current.Revision)
            {
                Self->Verify();
                return;
            }
            if (!Bool(Result, TEXT("ok"))
                || !SameWireText(String(Result, TEXT("worldId")), String(Self->Mind, TEXT("worldId")))
                || !SameWireText(String(Result, TEXT("generation")), String(Self->Mind, TEXT("generation"))))
            {
                Self->Unavailable();
                return;
            }
            if (!Subject)
            {
                Self->ShowPeople(Result);
                return;
            }
            Self->SelectPerson(Object(Result, TEXT("selected")), Current, bRefresh);
        });
        if (!bPending) Unavailable();
    }

    void SelectPerson(const FObject& Selection, const FNotesCut& Current, bool bRefresh)
    {
        const auto Person = Object(Selection, TEXT("subject"));
        const auto Subject = Object(Person, TEXT("subject"));
        if (!Subject)
        {
            Select(nullptr);
            Unavailable();
            return;
        }
        auto Note = Object(Selection, TEXT("notepad"));
        if (!Note)
        {
            auto Empty = MakeShared<FJsonObject>();
            Empty->SetObjectField(TEXT("subjectId"), MakeShared<FJsonObject>(*Subject));
            Note = Empty;
        }
        const auto Identity = Object(Selection, TEXT("identity"));
        const auto CurrentName = FNickname::Read(Identity, TEXT("givenName"),
            Current.bControlling && String(Person, TEXT("status")) != TEXT("notes-only"));
        const FString CurrentText = String(Note, TEXT("text"));
        const bool bSameSubject = SameSubject(Note, Selected);
        if (bRefresh && bSameSubject && HasEdit())
        {
            const bool bNoteChanged = NumberOr(Selected, TEXT("revision"), 0) != NumberOr(Note, TEXT("revision"), 0);
            const bool bNameChanged = Name->HasEdit() && !Name->CurrentBase().SameEditBase(CurrentName);
            const bool bDraftMatches = SameWireText(Editor->GetText().ToString(), CurrentText)
                && (!Name->HasEdit() || SameWireText(Name->Value(), CurrentName.Text));
            if (bDraftMatches)
                Select(Note, CurrentName);
            else if (bNoteChanged || bNameChanged)
            {
                LatestNote = Note;
                LatestName = CurrentName;
                bConflict = true;
            }
        }
        else
            Select(Note, CurrentName);

        Cut = Current;
        bCurrent = true;
        Status = FText::FromString(bConflict
            ? TEXT("This note or nickname changed. Discard your edit to load the current version.")
            : String(Person, TEXT("label")));
    }

    void ShowPeople(const FObject& Result)
    {
        Choices->ClearChildren();
        Choices->AddSlot().AutoHeight()[
            SNew(SEditableTextBox).HintText(FText::FromString(TEXT("Find a person")))
            .Text(FText::FromString(PeopleQuery))
            .OnTextCommitted_Lambda([this](const FText& Text, ETextCommit::Type Reason)
            {
                if (Reason != ETextCommit::OnEnter) return;
                PeopleQuery = Text.ToString().Left(120);
                auto Body = MakeShared<FJsonObject>();
                Body->SetStringField(TEXT("query"), PeopleQuery);
                ReadPeople(Body);
            })];
        for (const auto& Value : Array(Result, TEXT("subjects")))
        {
            const auto Person = Record(Value);
            const auto Subject = Object(Person, TEXT("subject"));
            const FString Label = String(Person, TEXT("label"));
            if (!Subject || Label.IsEmpty() || String(Person, TEXT("status")) == TEXT("notes-only")) continue;
            Choices->AddSlot().AutoHeight()[
                SNew(SButton).Text(FText::FromString(Label))
                .IsEnabled_Lambda([this] { return !bPending && !HasEdit(); })
                .OnClicked_Lambda([this, Subject]
                {
                    ReadPerson(Subject);
                    return FReply::Handled();
                })];
        }
        const FString Next = String(Result, TEXT("next"));
        if (!Next.IsEmpty())
            Choices->AddSlot().AutoHeight()[
                SNew(SButton).Text(FText::FromString(TEXT("More people")))
                .IsEnabled_Lambda([this] { return !bPending && !HasEdit(); })
                .OnClicked_Lambda([this, Next]
                {
                    auto Body = MakeShared<FJsonObject>();
                    Body->SetStringField(TEXT("query"), PeopleQuery);
                    Body->SetStringField(TEXT("after"), Next);
                    ReadPeople(Body);
                    return FReply::Handled();
                })];
    }

    static bool SameSubject(const FObject& A, const FObject& B)
    {
        const auto First = Object(A, TEXT("subjectId"));
        const auto Second = Object(B, TEXT("subjectId"));
        if (!First || !Second) return !First && !Second;
        if (!SameWireText(String(First, TEXT("kind")), String(Second, TEXT("kind")))) return false;
        for (const auto* Field : {TEXT("entityId"), TEXT("individualId"), TEXT("placeId"), TEXT("markerId")})
        {
            const FString Id = String(First, Field);
            if (!Id.IsEmpty()) return SameWireText(Id, String(Second, Field));
        }
        return false;
    }

    void AddChoice(const FString& Label, const FObject& Note)
    {
        if (Label.IsEmpty()) return;
        Choices->AddSlot().AutoHeight()[
            SNew(SButton).Text(FText::FromString(Label))
            .IsEnabled_Lambda([this] { return !bPending && !HasEdit(); })
            .OnClicked_Lambda([this, Note]
            {
                const auto Subject = Object(Note, TEXT("subjectId"));
                const FString Kind = String(Subject, TEXT("kind"));
                if (Kind == TEXT("entity") || Kind == TEXT("individual"))
                    ReadPerson(Subject);
                else
                    Select(Note);
                return FReply::Handled();
            })];
    }

    void Select(FObject Note, FNickname Nickname = {})
    {
        Selected = Note;
        LatestNote.Reset();
        LatestName = {};
        bConflict = false;
        Name->SetName(Nickname);
        Baseline = String(Note, TEXT("text"));
        Editor->SetText(FText::FromString(Baseline));
        bDirty = false;
    }

    FReply Save()
    {
        auto* Owner = Session.Get();
        const auto Before = Current();
        if (!Owner || !CanSave() || !Cut.SameOwner(Before) || !Before.bControlling
            || Before.Revision != Cut.Revision)
            return FReply::Handled();
        auto Body = MakeShared<FJsonObject>();
        for (const auto* Field : {TEXT("actorId"), TEXT("worldId"), TEXT("generation")})
            Body->SetStringField(Field, String(Mind, Field));
        if (const auto Subject = Object(Selected, TEXT("subjectId")))
            Body->SetObjectField(TEXT("subjectId"), MakeShared<FJsonObject>(*Subject));
        else
            Body->SetField(TEXT("subjectId"), MakeShared<FJsonValueNull>());
        Body->SetNumberField(TEXT("expectedRevision"), NumberOr(Selected, TEXT("revision"), 0));
        Body->SetStringField(TEXT("text"), Editor->GetText().ToString());
        if (Name->HasEdit())
        {
            Body->SetStringField(TEXT("nickname"), Name->Value());
            Body->SetNumberField(TEXT("nameRevision"), Name->CurrentBase().Revision);
        }
        const uint64 Id = ++RequestId;
        bPending = Owner->Send(TEXT("/api/knowledge"), Body,
            [Weak = TWeakPtr<SOpenLegendNotes>(SharedThis(this)), Before, Id](int32, FObject Result)
        {
            if (const auto Self = Weak.Pin(); Self && Self->RequestId == Id)
                Self->Finish(Before, Result, true);
        });
        if (!bPending) Unavailable();
        return FReply::Handled();
    }

    FNotesCut Cut;
    TWeakObjectPtr<UOpenLegendSession> Session;
    TFunction<void()> Opened;
    TSharedPtr<SMultiLineEditableTextBox> Editor;
    TSharedPtr<SOpenLegendNicknameField> Name;
    TSharedPtr<SVerticalBox> Choices;
    FObject Mind, Selected, LatestNote;
    FNickname LatestName;
    FString Baseline, Cursor, PeopleQuery;
    FText Status;
    uint64 RequestId = 0;
    bool bOpen = false, bPending = false, bCurrent = false, bDirty = false, bConflict = false;
};
class SOpenLegendNickname final : public SCompoundWidget
{
public:
    SLATE_BEGIN_ARGS(SOpenLegendNickname) {}
        SLATE_ARGUMENT(UOpenLegendSession*, Session)
    SLATE_END_ARGS()

    void Construct(const FArguments& Args, TFunction<FObject()> InSelectedContact, TFunction<void()> InOpened)
    {
        Session = Args._Session;
        SelectedContact = MoveTemp(InSelectedContact);
        Opened = MoveTemp(InOpened);
        ChildSlot[
            SNew(SVerticalBox)
            + SVerticalBox::Slot().AutoHeight()[
                SNew(SButton).Text(FText::FromString(TEXT("Nickname")))
                .IsEnabled_Lambda([this]
                {
                    const auto View = Session.IsValid() ? Session->GetView() : nullptr;
                    return Bool(Object(View, TEXT("access")), TEXT("controlling")) && IsPerson(SelectedContact());
                })
                .OnClicked(this, &SOpenLegendNickname::Open)]
            + SVerticalBox::Slot().AutoHeight()[
                SNew(SVerticalBox).Visibility_Lambda([this]
                {
                    return bOpen && IsSelected(SelectedContact()) ? EVisibility::Visible : EVisibility::Collapsed;
                })
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(STextBlock).Text_Lambda([this]
                    {
                        return FText::Format(NSLOCTEXT("OpenLegend", "NicknameKnownName", "Known name: {0}"),
                            FText::FromString(Latest.KnownName.IsEmpty() ? TEXT("Unknown") : Latest.KnownName));
                    })]
                + SVerticalBox::Slot().AutoHeight()[
                    SAssignNew(Name, SOpenLegendNicknameField)
                    .ReadOnly_Lambda([this] { return !Name || bPending || bNeedsRead || HasConflict(); })
                    .OnSave(FSimpleDelegate::CreateLambda([this] { Save(); }))]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(STextBlock).Text_Lambda([this] { return Status; }).AutoWrapText(true)]
                + SVerticalBox::Slot().AutoHeight()[
                    SNew(SHorizontalBox)
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Save nickname")))
                        .IsEnabled_Lambda([this] { return CanSave(); })
                        .OnClicked(this, &SOpenLegendNickname::Save)]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Check nickname")))
                        .IsEnabled_Lambda([this] { return !bPending; })
                        .OnClicked_Lambda([this] { ReadBack(); return FReply::Handled(); })]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Discard edit")))
                        .IsEnabled_Lambda([this] { return !bPending && !bNeedsRead && Name->HasEdit(); })
                        .OnClicked_Lambda([this]
                        {
                            Name->SetName(Latest);
                            Status = FText::GetEmpty();
                            return FReply::Handled();
                        })]
                    + SHorizontalBox::Slot().AutoWidth()[
                        SNew(SButton).Text(FText::FromString(TEXT("Close")))
                        .OnClicked_Lambda([this] { Close(); return FReply::Handled(); })]]]];
        Session->OnViewChanged.AddSP(this, &SOpenLegendNickname::ViewChanged);
    }

    ~SOpenLegendNickname()
    {
        if (Session.IsValid()) Session->OnViewChanged.RemoveAll(this);
    }

private:
    static bool IsPerson(const FObject& Contact)
    {
        return String(Contact, TEXT("kind")) == TEXT("actor")
            && !String(Contact, TEXT("bodyReference")).IsEmpty();
    }

    bool IsSelected(const FObject& Contact) const
    {
        return IsPerson(Contact) && SameWireText(Subject, String(Contact, TEXT("id")))
            && SameWireText(BodyReference, String(Contact, TEXT("bodyReference")));
    }

    FObject FindPerson(const FObject& View) const
    {
        const auto Current = ReadCut(View);
        if (!Current.bControlling || !Cut.SameOwner(Current) || !IsSelected(SelectedContact()))
            return nullptr;
        for (const auto& Value : Array(View, TEXT("entities")))
        {
            const auto Contact = Record(Value);
            if (IsSelected(Contact)) return Contact;
        }
        return nullptr;
    }

    bool SetLatest(const FObject& View, const FObject& Contact)
    {
        if (!Contact) return false;
        const auto Revision = NumberOr(View, TEXT("revision"), -1);
        if (Revision < LatestViewRevision) return false;
        LatestViewRevision = Revision;
        Latest = FNickname::Read(Object(Contact, TEXT("identity")), TEXT("knownName"), true);
        if (HasConflict() && (!Name->HasEdit() || SameWireText(Name->Value(), Latest.Text)))
            Name->SetName(Latest);
        return true;
    }

    FReply Open()
    {
        const auto Contact = SelectedContact();
        if (bOpen && IsSelected(Contact))
        {
            Close();
            return FReply::Handled();
        }
        Close();
        const auto View = Session.IsValid() ? Session->GetView() : nullptr;
        Cut = ReadCut(View);
        Subject = String(Contact, TEXT("id"));
        BodyReference = String(Contact, TEXT("bodyReference"));
        Cut.History.Split(TEXT(":"), &Generation, nullptr);
        if (!Cut.Scope.IsEmpty() && !Cut.World.IsEmpty() && !Subject.IsEmpty() && !Generation.IsEmpty()
            && SetLatest(View, FindPerson(View)))
        {
            bOpen = true;
            Opened();
            Name->Focus();
        }
        return FReply::Handled();
    }

    void Close()
    {
        bOpen = bPending = bNeedsRead = false;
        ++RequestId;
        Cut = {};
        Subject.Reset();
        BodyReference.Reset();
        Generation.Reset();
        Status = FText::GetEmpty();
        Latest = {};
        LatestViewRevision = -1;
        Name->SetName({});
    }

    void ViewChanged()
    {
        if (!bOpen) return;
        const auto View = Session.IsValid() ? Session->GetView() : nullptr;
        const auto Person = FindPerson(View);
        if (!Person)
        {
            Close();
            return;
        }
        if (SetLatest(View, Person) && HasConflict() && !bPending && !bNeedsRead)
            ReportConflict();
    }

    bool HasConflict() const { return !Name->CurrentBase().SameEditBase(Latest); }
    bool CanSave() const { return bOpen && Name && !bPending && !bNeedsRead && !HasConflict() && Name->HasEdit(); }

    void ReportConflict()
    {
        Status = FText::FromString(TEXT("The saved nickname changed. Discard your edit to load the current name."));
    }

    void ReadBack()
    {
        auto* Owner = Session.Get();
        if (!Owner || !bOpen || bPending) return;
        if (!FindPerson(Owner->GetView()))
        {
            Close();
            return;
        }
        bNeedsRead = true;
        const uint64 Id = ++RequestId;
        bPending = Owner->Read(TEXT("/api/state"),
            [Weak = TWeakPtr<SOpenLegendNickname>(SharedThis(this)), Id](int32 Code, FObject View)
        {
            const auto Self = Weak.Pin();
            if (!Self || Self->RequestId != Id) return;
            Self->bPending = false;
            if (!Self->Session.IsValid() || !Self->FindPerson(Self->Session->GetView()))
            {
                Self->Close();
                return;
            }
            if (Code != 200)
            {
                Self->ReadUnavailable();
                return;
            }
            const auto Person = Self->FindPerson(View);
            if (!Person)
            {
                Self->Close();
                return;
            }
            // A newer stream update can land while the read is in flight.
            Self->SetLatest(View, Person);
            Self->bNeedsRead = false;
            if (Self->HasConflict()) Self->ReportConflict();
            else if (Self->Name->HasEdit())
                Self->Status = FText::FromString(TEXT("The nickname hasn’t changed. You can try saving again."));
            else
                Self->Status = FText::FromString(TEXT("The current nickname is shown."));
        });
        if (!bPending) ReadUnavailable();
    }

    void ReadUnavailable()
    {
        Status = FText::FromString(TEXT("The current nickname is unavailable. Check again before saving."));
    }

    FReply Save()
    {
        auto* Owner = Session.Get();
        if (!Owner || !CanSave()) return FReply::Handled();
        const auto Person = FindPerson(Owner->GetView());
        if (!Person)
        {
            Close();
            return FReply::Handled();
        }
        SetLatest(Owner->GetView(), Person);
        if (!CanSave()) return FReply::Handled();
        auto Body = MakeShared<FJsonObject>();
        Body->SetStringField(TEXT("worldId"), Cut.World);
        Body->SetStringField(TEXT("generation"), Generation);
        Body->SetStringField(TEXT("subjectId"), Subject);
        Body->SetStringField(TEXT("bodyReference"), BodyReference);
        Body->SetNumberField(TEXT("expectedRevision"), Name->CurrentBase().Revision);
        Body->SetStringField(TEXT("nickname"), Name->Value());
        const uint64 Id = ++RequestId;
        bPending = Owner->Send(TEXT("/api/nickname"), Body,
            [Weak = TWeakPtr<SOpenLegendNickname>(SharedThis(this)), Id](int32 Code, FObject Result)
        {
            const auto Self = Weak.Pin();
            if (!Self || Self->RequestId != Id) return;
            Self->bPending = false;
            if (!Self->Session.IsValid() || !Self->FindPerson(Self->Session->GetView()))
            {
                Self->Close();
                return;
            }
            const auto Message = String(Result, TEXT("message"));
            if (Bool(Result, TEXT("ok")))
            {
                if (Self->Name->HasEdit()) Self->ReadBack();
                Self->Status = FText::FromString(Message.IsEmpty() ? TEXT("Your nickname was saved.") : Message);
            }
            else
            {
                // An input validation refusal permits an edit. A conflicted or
                // interrupted write needs a fresh read before another save.
                Self->bNeedsRead = Code != 400;
                Self->Status = FText::FromString(Code == 0 || Message.IsEmpty()
                    ? TEXT("Save result is unknown. Check the nickname before saving again.") : Message);
            }
        });
        Status = FText::FromString(bPending ? TEXT("Saving nickname…") : TEXT("The nickname couldn’t be sent. Try again."));
        return FReply::Handled();
    }

    FNotesCut Cut;
    FNickname Latest;
    FString Subject, BodyReference, Generation;
    double LatestViewRevision = -1;
    uint64 RequestId = 0;
    TWeakObjectPtr<UOpenLegendSession> Session;
    TFunction<FObject()> SelectedContact;
    TFunction<void()> Opened;
    TSharedPtr<SOpenLegendNicknameField> Name;
    FText Status;
    bool bOpen = false, bPending = false, bNeedsRead = false;
};
}

TSharedRef<SWidget> MakeOpenLegendNotes(UOpenLegendSession& Session, TFunction<void()> Opened)
{
    return SNew(SOpenLegendNotes, MoveTemp(Opened)).Session(&Session);
}

TSharedRef<SWidget> MakeOpenLegendNickname(UOpenLegendSession& Session,
    TFunction<OpenLegend::FObject()> SelectedContact, TFunction<void()> Opened)
{
    return SNew(SOpenLegendNickname, MoveTemp(SelectedContact), MoveTemp(Opened)).Session(&Session);
}
