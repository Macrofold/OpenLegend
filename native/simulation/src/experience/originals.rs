//! Personally retained original observations stay with their actual canonical
//! source. They can outlive a current contact and never renew its body lease.
use super::*;
use crate::host::retained_size::HeapBytes;
use crate::host::{ByteBudget, ByteReservation};
use crate::reception::{ObservationContribution, OriginalRevisionRegistry};

#[derive(Deserialize)]
struct Inputs {
    #[serde(
        default,
        rename = "actorId",
        deserialize_with = "deserialize_present_option"
    )]
    actor_id: Option<String>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    observation: Option<Arc<ObservationContribution>>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    observations: Option<Vec<Arc<ObservationContribution>>>,
}
#[derive(Deserialize)]
struct Manifest {
    observations: Vec<Arc<ObservationContribution>>,
}
#[derive(Deserialize)]
struct Body {
    #[serde(default, deserialize_with = "deserialize_present_option")]
    observation: Option<Arc<ObservationContribution>>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    observations: Option<Vec<Arc<ObservationContribution>>>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    evidence: Option<Inputs>,
    #[serde(default, deserialize_with = "deserialize_present_option")]
    manifest: Option<Manifest>,
}
pub(crate) struct CapturedPersonalOriginals {
    observations: Vec<Arc<ObservationContribution>>,
    _storage: ByteReservation,
}
impl CapturedPersonalOriginals {
    pub(crate) fn observations(&self) -> &[Arc<ObservationContribution>] {
        &self.observations
    }
    pub(crate) fn validate(
        &self,
        registry: &mut OriginalRevisionRegistry,
    ) -> Result<(), crate::received::ReceivedError> {
        for observation in &self.observations {
            registry.validate(observation)?;
        }
        Ok(())
    }
}
impl PersonalSourceRecord {
    /// Exact retained coverage of one real current summary. A supplied parent
    /// identifier alone cannot authorize reading an older source version.
    pub(crate) fn covers_source(
        &self,
        reference: &PersonalSourceRef,
        budget: &ByteBudget,
    ) -> Result<bool, ExperienceError> {
        if self.header.reference.kind != PersonalSourceKind::Summary {
            return Ok(false);
        }
        let _decode = budget
            .reserve(encoded_body_bound(&self.payload)?)
            .map_err(|_| ExperienceError::Capacity)?;
        let body = header_input::header_input(&self.payload)?;
        let body = object(&body)?;
        let immediate = source_references(
            body.get("sources")
                .ok_or(ExperienceError::InvalidBody("sources"))?,
        )?;
        let covered = source_references(
            object(
                body.get("manifest")
                    .ok_or(ExperienceError::InvalidBody("manifest"))?,
            )?
            .get("coverage")
            .ok_or(ExperienceError::InvalidBody("manifest.coverage"))?,
        )?;
        Ok(immediate
            .iter()
            .chain(&covered)
            .any(|candidate| candidate == reference))
    }
    pub(crate) fn capture_originals(
        &self,
        registry: &mut OriginalRevisionRegistry,
        through: f64,
        budget: &ByteBudget,
    ) -> Result<CapturedPersonalOriginals, crate::received::ReceivedError> {
        capture_originals_payload(&self.payload, &self.header, registry, through, budget)
    }
    pub(crate) fn validate_originals(
        &self,
        registry: &mut OriginalRevisionRegistry,
        through: f64,
        budget: &ByteBudget,
    ) -> Result<(), crate::received::ReceivedError> {
        self.capture_originals(registry, through, budget)?;
        Ok(())
    }
}
pub(super) fn capture_originals_payload(
    payload: &str,
    header: &PersonalSourceHeader,
    registry: &mut OriginalRevisionRegistry,
    through: f64,
    budget: &ByteBudget,
) -> Result<CapturedPersonalOriginals, crate::received::ReceivedError> {
    let invalid = || crate::received::ReceivedError("Invalid personal source original evidence.");
    let capacity = || {
        crate::received::ReceivedError("Personal original capture exceeds native byte allowance.")
    };
    let mut storage = budget
        .reserve(encoded_body_bound(payload).map_err(|_| capacity())?)
        .map_err(|_| capacity())?;
    let body: Body = serde_json::from_str(payload).map_err(|_| invalid())?;
    if body
        .evidence
        .as_ref()
        .is_some_and(|evidence| evidence.actor_id.as_deref() != Some(header.actor_id.as_str()))
    {
        return Err(invalid());
    }
    let count = usize::from(body.observation.is_some())
        + body.observations.as_ref().map_or(0, Vec::len)
        + body.evidence.as_ref().map_or(0, |evidence| {
            usize::from(evidence.observation.is_some())
                + evidence.observations.as_ref().map_or(0, Vec::len)
        })
        + body
            .manifest
            .as_ref()
            .map_or(0, |manifest| manifest.observations.len());
    storage
        .resize(
            storage
                .bytes()
                .checked_add(
                    count
                        .checked_mul(std::mem::size_of::<Arc<ObservationContribution>>())
                        .ok_or_else(capacity)?,
                )
                .ok_or_else(capacity)?,
        )
        .map_err(|_| capacity())?;
    let mut observations: Vec<Arc<ObservationContribution>> = Vec::with_capacity(count);
    for observation in body
        .observation
        .into_iter()
        .chain(body.observations.into_iter().flatten())
        .chain(body.evidence.into_iter().flat_map(|evidence| {
            evidence
                .observation
                .into_iter()
                .chain(evidence.observations.into_iter().flatten())
        }))
        .chain(
            body.manifest
                .into_iter()
                .flat_map(|manifest| manifest.observations),
        )
    {
        if observation.observer.actor_id != header.actor_id || observation.acquired_at > through {
            return Err(invalid());
        }
        registry.validate(&observation)?;
        if !observations
            .iter()
            .any(|old| old.id == observation.id && old.revision == observation.revision)
        {
            observations.push(observation);
        }
    }
    let bytes = observations.iter().try_fold(
        observations
            .capacity()
            .checked_mul(std::mem::size_of::<Arc<ObservationContribution>>())
            .ok_or_else(capacity)?,
        |bytes, observation| {
            bytes
                .checked_add(
                    std::mem::size_of::<ObservationContribution>()
                        + 2 * std::mem::size_of::<usize>()
                        + std::mem::align_of::<ObservationContribution>()
                        - 1,
                )
                .and_then(|bytes| bytes.checked_add(observation.heap_bytes()?))
                .ok_or_else(capacity)
        },
    )?;
    storage.resize(bytes).map_err(|_| capacity())?;
    Ok(CapturedPersonalOriginals {
        observations,
        _storage: storage,
    })
}
