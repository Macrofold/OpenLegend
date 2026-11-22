//! Owned finite offer products; command custody remains native.
use super::*;

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum NpcOfferCoverage {
    Suggestions,
    CompletePhysical,
}

pub(crate) struct PreparedNpcRecall {
    pub(crate) selection: NpcObservationSelection,
    pub(super) work_context: NpcWorkContext,
    pub(super) _storage: ByteReservation,
}

/// A recall read retains presentation and its observation selection. Only a
/// full catalogue can bind executable choices.
pub(crate) enum PreparedNpcRead {
    Recall(PreparedNpcRecall),
    Offers(PreparedNpcCandidates),
}

impl PreparedNpcRead {
    pub(crate) fn work_context(&self) -> &NpcWorkContext {
        match self {
            Self::Recall(read) => &read.work_context,
            Self::Offers(read) => &read.work_context,
        }
    }

    pub(crate) fn selection(&self) -> &NpcObservationSelection {
        match self {
            Self::Recall(read) => &read.selection,
            Self::Offers(read) => read.selection(),
        }
    }
}

/// All ordinals address native-owned records from this same capture. They are
/// formatting inputs, not permission maps that Node can replace on application.
#[derive(Clone, Serialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub enum NpcOfferMeaning {
    Activities,
    ActivityPage {
        page: &'static str,
    },
    Inspection,
    Continuation {
        action_type: Option<String>,
        plan_pending: bool,
    },
    Follow {
        body: usize,
    },
    Status {
        body: Option<usize>,
        definition: usize,
        active: bool,
    },
    Approach {
        body: usize,
        distance: f64,
        reach: f64,
    },
    Fish {
        body: usize,
    },
    Cook {
        body: usize,
    },
    FireCare {
        body: usize,
    },
    Handover {
        body: usize,
    },
    Probe {
        probe: usize,
    },
    Strike {
        body: usize,
        definition: usize,
        hunting: bool,
    },
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PreparedNpcOffer {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<crate::text::JsText>,
    pub id: String,
    pub meaning: NpcOfferMeaning,
    // A host deciding how to describe this offer needs only its presence.
    // Selection binds the original command in the held Rust catalogue.
    #[serde(rename = "hasCommand", serialize_with = "serialize_command_presence")]
    pub command: PreparedNpcInstruction,
    pub transition: WorkTransitionMode,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temporary: Option<Outcome>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_at: Option<f64>,
    #[serde(skip)]
    pub(super) _storage: ByteReservation,
}

pub(crate) enum PreparedNpcInstruction {
    Continue,
    Command(NativeCommand),
    Handover(crate::handover::NpcHandover),
}

impl PreparedNpcInstruction {
    pub(crate) fn command(&self) -> Option<&NativeCommand> {
        match self {
            Self::Command(command) => Some(command),
            Self::Continue | Self::Handover(_) => None,
        }
    }

    pub(crate) fn handover(&self) -> Option<&crate::handover::NpcHandover> {
        match self {
            Self::Handover(choice) => Some(choice),
            Self::Continue | Self::Command(_) => None,
        }
    }

    pub(crate) fn has_command(&self) -> bool {
        !matches!(self, Self::Continue)
    }
}

fn serialize_command_presence<S>(
    command: &PreparedNpcInstruction,
    serializer: S,
) -> Result<S::Ok, S::Error>
where
    S: serde::Serializer,
{
    serializer.serialize_bool(command.has_command())
}

pub(crate) struct PreparedNpcCandidates {
    pub(super) offers: Vec<PreparedNpcOffer>,
    pub(super) selection: NpcObservationSelection,
    pub work: ResponseWorkIdentity,
    pub(super) work_context: NpcWorkContext,
    pub(super) visible_body_ordinals: Vec<usize>,
    pub(super) activity: NpcActivityRead,
    pub(super) _work_storage: ByteReservation,
    pub(super) _storage: ByteReservation,
}
impl PreparedNpcCandidates {
    pub(crate) fn offers(&self) -> &[PreparedNpcOffer] {
        &self.offers
    }
    pub(crate) fn selection(&self) -> &NpcObservationSelection {
        &self.selection
    }

    pub(crate) fn activity_facts(&self) -> NpcActivityFacts<'_> {
        self.activity.facts()
    }
    pub(crate) fn write_json(
        &self,
        budget: &ByteBudget,
    ) -> Result<(String, ByteReservation), ExecutionError> {
        #[derive(Serialize)]
        #[serde(rename_all = "camelCase")]
        struct Product<'a> {
            offers: &'a [PreparedNpcOffer],
            body_ordinals: &'a [usize],
            work: &'a ResponseWorkIdentity,
            work_context: &'a NpcWorkContext,
            visible_body_ordinals: &'a [usize],
            activity: &'a NpcActivityRead,
        }
        let value = Product {
            offers: &self.offers,
            body_ordinals: self.selection.body_ordinals(),
            work: &self.work,
            work_context: &self.work_context,
            visible_body_ordinals: &self.visible_body_ordinals,
            activity: &self.activity,
        };
        let length =
            crate::encoding::json_record_len(&value).map_err(|_| ExecutionError::Invariant)?;
        let mut guard = budget.reserve(
            length
                .checked_mul(2)
                .map(|n| n.max(8))
                .ok_or(ExecutionError::Capacity)?,
        )?;
        let json = crate::encoding::json_record(&value).map_err(|_| ExecutionError::Invariant)?;
        guard.resize(json.capacity())?;
        Ok((json, guard))
    }
}
pub(crate) enum NpcCandidateAnswer {
    Descriptions(NpcDescriptionsAnswer),
    Geometry(GeometryAnswers),
    Display(CompletedActivityDisplay),
}
pub(crate) enum NpcCandidateStep<'a> {
    Descriptions(&'a std::sync::Arc<NpcDescriptionsRequest>),
    Geometry(&'a GeometryQueries),
    Display(&'a mut ActivityDisplayCursor),
    Complete(PreparedNpcRead),
}
