//! Current account preferences live outside the simulation and outside
//! checkpoint recovery. Fixed-size preferences share one scoped SQL query.
//! A present story banner is selected in that same snapshot.

use crate::store::{NarrationBanner, Store, StoreError};
use openlegend_simulation::host::{ByteBudget, ByteReservation};
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerProfile {
    id: String,
    revision: u64,
    preferences: Preferences,
    #[serde(skip)]
    pub(super) narrator: Option<NarrationBanner>,
    #[serde(skip)]
    _custody: ByteReservation,
}

#[derive(PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
struct Preferences {
    reveal_mode: RevealMode,
    reveal_radius: f64,
    reveal_strength: f64,
    show_unavailable_actions: bool,
    pause_when_hidden: bool,
    narrator_voice: Voice,
}

#[derive(Clone, Copy, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
enum RevealMode {
    Off,
    Player,
    Nearby,
}

#[derive(Clone, Copy, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "kebab-case")]
pub(crate) enum Voice {
    Restrained,
    Lyrical,
    Wry,
}

#[derive(Default, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct Reveal {
    reveal_mode: Option<RevealMode>,
    reveal_radius: Option<f64>,
    reveal_strength: Option<f64>,
}

pub async fn profile(
    store: &std::sync::Arc<Store>,
    account: &str,
    world: &str,
    actor: &str,
    budget: &ByteBudget,
) -> Result<PlayerProfile, StoreError> {
    // These UI preferences have a fixed shape. The SIZE result prevents a
    // damaged record from using the transfer buffer before normal validation.
    let custody = budget
        .reserve(8192 + 4 * (account.len() + world.len() + actor.len()))
        .map_err(|_| StoreError::Capacity)?;
    let account = account.to_owned();
    let world = world.to_owned();
    let actor = actor.to_owned();
    let repository = store.clone();
    store
        .read_operational(move |tx| {
            Box::pin(async move {
                let row = tx
                    .query_one(
                        "SELECT COALESCE(p.revision,0), COALESCE(p.show_unavailable_actions,0), \
             COALESCE(p.pause_when_hidden,1), \
             CASE WHEN octet_length(r.value)<=512 THEN r.value END, \
             CASE WHEN octet_length(v.value)<=64 THEN v.value END, \
             COALESCE(octet_length(r.value)>512,false) OR COALESCE(octet_length(v.value)>64,false), \
             EXISTS(SELECT 1 FROM story_banners WHERE world_id=$2 AND owner_id=a.id), \
             EXISTS(SELECT 1 FROM ops_maintenance WHERE world_id=$2 AND payload::jsonb->>'status' IN ('scheduled','active')) \
             FROM (SELECT $1::text AS id) a LEFT JOIN player_profiles p ON p.id=a.id \
             LEFT JOIN meta r ON r.key=('integration:world-reveal:' || a.id) \
             LEFT JOIN meta v ON v.key=('integration:narrator-voice:' || a.id)",
                        &[&account,&world],
                    )
                    .await?;
                if row.try_get::<_,bool>(7)? {
                    return Err(StoreError::Maintenance);
                }
                if row.try_get::<_, bool>(5)? {
                    return Err(StoreError::InvalidRecord);
                }
                let revision = u64::try_from(row.try_get::<_, i64>(0)?)
                    .ok()
                    .filter(|counter| *counter <= openlegend_simulation::identity::MAX_SAFE_INTEGER)
                    .ok_or(StoreError::InvalidRecord)?;
                let reveal: Reveal = row
                    .try_get::<_, Option<&str>>(3)?
                    .map(serde_json::from_str::<Option<Reveal>>)
                    .transpose()
                    .map_err(|_| StoreError::InvalidRecord)?
                    .flatten()
                    .unwrap_or_default();
                let voice = narrator_voice(row.try_get(4)?)?;
                let narrator = if row.try_get::<_,bool>(6)? {
                    repository.latest_banner(tx,&world,&account,&actor).await?
                } else {
                    None
                };
                Ok(PlayerProfile {
                    id: account,
                    revision,
                    preferences: Preferences {
                        reveal_mode: reveal.reveal_mode.unwrap_or(RevealMode::Nearby),
                        reveal_radius: reveal.reveal_radius.unwrap_or(6.0),
                        reveal_strength: reveal.reveal_strength.unwrap_or(0.7),
                        show_unavailable_actions: row.try_get::<_, i64>(1)? == 1,
                        pause_when_hidden: row.try_get::<_, i64>(2)? == 1,
                        narrator_voice: voice,
                    },
                    narrator,
                    _custody: custody,
                })
            })
        })
        .await
}

pub(crate) fn narrator_voice(stored: Option<&str>) -> Result<Voice, StoreError> {
    Ok(stored
        .map(serde_json::from_str::<Option<Voice>>)
        .transpose()
        .map_err(|_| StoreError::InvalidRecord)?
        .flatten()
        .unwrap_or(Voice::Restrained))
}

impl PlayerProfile {
    pub(crate) fn matches(&self, other: &Self) -> bool {
        self.id == other.id
            && self.revision == other.revision
            && self.preferences == other.preferences
    }
}
