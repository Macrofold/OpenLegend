//! Owned finite offer products; command custody remains native.
use super::*;

#[derive(Clone, Copy, serde::Deserialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum NpcOfferCoverage {
    Suggestions,
    CompletePhysical,
}

/// All ordinals address native-owned records from this same capture. They are
/// formatting inputs, not permission maps that Node can replace on application.
#[derive(Serialize)]
#[serde(
    tag = "kind",
    rename_all = "kebab-case",
    rename_all_fields = "camelCase"
)]
pub(crate) enum NpcOfferMeaning {
    Activities,
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
    pub command: Option<NativeCommand>,
    pub transition: WorkTransitionMode,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub temporary: Option<Outcome>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub next_at: Option<f64>,
    #[serde(skip)]
    pub(super) _storage: ByteReservation,
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
    Descriptions(&'a NpcDescriptionsRequest),
    Geometry(&'a GeometryQueries),
    Display(&'a mut ActivityDisplayCursor),
    Complete(PreparedNpcCandidates),
}
