//! The creator diagnostic uses the same actor-scoped exact reference loader
//! as recollections. Recent experiences and commitments can share a source.
use super::*;
use openlegend_simulation::activity::RuntimeInspectedSkill;

const LIMIT: usize = 8192;
const SOURCES: &str = "WITH eligible AS NOT MATERIALIZED (
    SELECT r.at,r.id,r.source_kind,r.revision,r.memory_kind
    FROM recall_sources r
    WHERE r.world_id=$1 AND r.actor_id=$2 AND r.eligible=1 AND r.at<=$3
      AND (r.source_kind<>'awareness' OR r.at<$3 OR r.sequence<=$4)
), selected AS (
    SELECT at,id,source_kind,revision,true AS recent,false AS commitment
    FROM (SELECT * FROM eligible ORDER BY at DESC,id DESC,source_kind DESC LIMIT 100) AS newest
    UNION ALL
    SELECT at,id,source_kind,revision,false,true
    FROM (SELECT * FROM eligible WHERE source_kind='memory' AND memory_kind='commitment'
          ORDER BY at,id LIMIT 8193) AS promises
)
SELECT at,id,source_kind,revision,bool_or(recent),bool_or(commitment)
FROM selected GROUP BY at,id,source_kind,revision ORDER BY at,source_kind,id";

const RECIPES: &str =
    "SELECT learned.payload,definition.payload FROM mind_learned_capabilities learned
LEFT JOIN definition_recipes definition ON definition.world_id=learned.world_id
    AND definition.slot=learned.payload::jsonb->>'recipeId'
WHERE learned.world_id=$1 AND learned.actor_id=$2 ORDER BY learned.position,learned.id";

pub(crate) struct MindInspectionRows {
    pub(crate) memories: MemoryPage,
    pub(crate) sides: Vec<(bool, bool)>,
    pub(crate) recipes: Vec<RuntimeInspectedSkill>,
    pub(crate) _custody: ByteReservation,
}

impl Store {
    /// Read the original durable cut without holding the game's turn. Source
    /// references still require native admission and current disclosure.
    pub(crate) async fn inspect_mind_rows(
        &self,
        cut: Arc<MemoryBrowseCut>,
    ) -> StoreResult<MindInspectionRows> {
        let budget = self.budget.clone();
        self.read_isolated(move |tx| {
            Box::pin(async move {
                let head = durable_head(tx).await?.ok_or(StoreError::StaleCut)?;
                if head.world_id != cut.world
                    || head.generation != cut.generation
                    || head.revision != cut.revision
                {
                    return Err(StoreError::StaleCut);
                }
                let identity = sql_ordinal(cut.identity_through)?;
                let (_source_transfer, selected) = admitted_query(
                    tx,
                    SOURCES,
                    &[&cut.world, &cut.actor, &cut.at, &identity],
                    &budget,
                )
                .await?;
                if selected.len() > LIMIT {
                    return Err(StoreError::Capacity);
                }
                let mut reserve = budget
                    .reserve(4096 + selected.len() * 128)
                    .map_err(|_| StoreError::Capacity)?;
                let mut references = Vec::with_capacity(selected.len());
                let mut sides = Vec::with_capacity(selected.len());
                for row in selected {
                    let id: &str = row.try_get(1)?;
                    let revision: &str = row.try_get(3)?;
                    reserve
                        .resize(reserve.bytes() + id.len() + revision.len())
                        .map_err(|_| StoreError::Capacity)?;
                    let reference = PersonalSourceRef {
                        kind: decode_kind(row.try_get(2)?)?,
                        id: id.to_owned(),
                        revision: revision.to_owned(),
                    };
                    if !reference.validate() {
                        return Err(StoreError::InvalidRecord);
                    }
                    references.push(reference);
                    sides.push((row.try_get(4)?, row.try_get(5)?));
                }
                let (_recipes_transfer, rows) =
                    admitted_query(tx, RECIPES, &[&cut.world, &cut.actor], &budget).await?;
                let mut custody = budget
                    .reserve(2048 + std::mem::size_of::<RuntimeInspectedSkill>() * rows.len())
                    .map_err(|_| StoreError::Capacity)?;
                let mut recipes = Vec::with_capacity(rows.len());
                #[derive(Deserialize)]
                #[serde(rename_all = "camelCase")]
                struct RecipeGrant {
                    learned_at: f64,
                    source: String,
                }
                #[derive(Deserialize)]
                struct RecipeLabel {
                    name: JsText,
                }
                for row in rows {
                    let payload: &str = row.try_get(0)?;
                    let definition: Option<&str> = row.try_get(1)?;
                    let decoded =
                        json_tree_allocation_bound(payload).ok_or(StoreError::Capacity)?;
                    let definition_bound = match definition {
                        Some(body) => {
                            json_tree_allocation_bound(body).ok_or(StoreError::Capacity)?
                        }
                        None => 0,
                    };
                    custody
                        .resize(custody.bytes() + decoded + definition_bound)
                        .map_err(|_| StoreError::Capacity)?;
                    let grant: RecipeGrant =
                        serde_json::from_str(payload).map_err(|_| StoreError::InvalidRecord)?;
                    let name = match definition {
                        Some(value) => {
                            serde_json::from_str::<RecipeLabel>(value)
                                .map_err(|_| StoreError::InvalidRecord)?
                                .name
                        }
                        None => "Unavailable technique".into(),
                    };
                    recipes.push(RuntimeInspectedSkill {
                        name,
                        source: grant.source,
                        learned_at: grant.learned_at,
                    });
                }
                Ok(MindInspectionRows {
                    memories: MemoryPage {
                        references,
                        next: None,
                        scan_limited: false,
                        custody: reserve,
                    },
                    sides,
                    recipes,
                    _custody: custody,
                })
            })
        })
        .await
    }
}
