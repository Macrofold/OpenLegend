use super::{DecisionPolicy, OfferedAction, RenderError};
use openlegend_simulation::{
    encoding::{json_record_len, write_json_record},
    host::{ByteBudget, ByteReservation},
};
use serde_json::{Map, Value};
use std::io::{self, Write};

const SECTION_BREAK: &str = "\n\n";
const ACTION_BULLET: &str = "- ";
const ACTION_SEPARATOR: &str = ": ";

impl DecisionPolicy {
    /// Fit the optional shortlist without rendering the required context again.
    /// Return the bytes still available for optional scene hints.
    pub(crate) fn fit_prompt_actions(
        &self,
        actions: &mut Vec<OfferedAction<'_>>,
        bytes: usize,
    ) -> Result<Option<usize>, RenderError> {
        let fixed = SECTION_BREAK.len()
            + self.text("actions")?.len()
            + self.text("unlistedActions")?.len();
        let Some(mut remaining) = bytes.checked_sub(fixed) else {
            actions.clear();
            return Ok(None);
        };
        let mut kept = 0;
        actions.retain(|action| {
            let line = ACTION_BULLET.len()
                + action.id.len()
                + ACTION_SEPARATOR.len()
                + action.description.len()
                + usize::from(kept != 0);
            let Some(after) = remaining.checked_sub(line) else {
                return false;
            };
            remaining = after;
            kept += 1;
            true
        });
        if actions.is_empty() {
            return Ok(remaining.checked_sub(self.text("noActions")?.len()));
        }
        Ok(Some(remaining))
    }
}

/// The encoded prompt owns its buffer independently of the retained read and
/// provider body. No entire prompt or section JSON is built just to size it.
pub(crate) struct PreparedPrompt {
    bytes: Vec<u8>,
    custody: ByteReservation,
    limit: usize,
    sections: usize,
    error: Option<RenderError>,
}

impl PreparedPrompt {
    fn new(limit: usize, budget: &ByteBudget) -> Result<Self, RenderError> {
        Ok(Self {
            bytes: Vec::new(),
            custody: budget.reserve(0).map_err(|_| RenderError::Capacity)?,
            limit,
            sections: 0,
            error: None,
        })
    }

    pub(crate) fn as_str(&self) -> &str {
        std::str::from_utf8(&self.bytes).expect("decision formatting emits UTF-8")
    }

    pub(crate) fn remaining(&self) -> usize {
        self.limit - self.bytes.len()
    }

    /// Append the selected read-only answer directly to the independently
    /// admitted provider prompt buffer.
    pub(crate) fn append_received_evidence(
        &mut self,
        evidence: &impl serde::Serialize,
    ) -> Result<(), RenderError> {
        self.section()?;
        self.text("Requested received evidence: ")?;
        write_json_record(evidence, &mut *self).map_err(|_| self.failure())
    }

    /// Append the actor's exact saved sighting labels and separate selectors.
    /// The chosen selector never grants a current body or exposes raw coordinates.
    pub(crate) fn append_remembered_places(
        &mut self,
        places: &[(&str, &openlegend_simulation::text::JsText)],
    ) -> Result<bool, RenderError> {
        if places.is_empty() {
            return Ok(false);
        }
        let bound = places.iter().try_fold(512usize, |bytes, (id, label)| {
            bytes.checked_add(id.len() + 12)?.checked_add(label.storage_bytes().checked_mul(6)?)
        }).ok_or(RenderError::Capacity)?;
        if bound > self.remaining() {
            return Ok(false);
        }
        self.section()?;
        self.text("Saved places from your own earlier actions. To visit one stored location, copy its exact proposed sentence into description and its selector into rememberedPlaceId. Leave targetEntityId and slots null. The move ends at that old point. Use rememberedPlaceId null for other actions.
")?;
        for (id, name) in places {
            self.text("- ")?;
            self.text(id)?;
            self.text(": ")?;
            write_json_record(name, &mut *self).map_err(|_| self.failure())?;
            self.text("
")?;
        }
        Ok(true)
    }

    /// Only entries actually written to the request enter its response schema.
    /// Required evidence and instructions are already in the prompt.
    pub(crate) fn append_thought_references<'a>(
        &mut self,
        references: &'a [Value],
    ) -> Result<Vec<&'a str>, RenderError> {
        const GUIDE: &str = concat!(
            "## Thought references\n",
            "When a private thought refers to a person, object, place, category, time or quotation ",
            "identified by your evidence, cite each supported mention in think.references. ",
            "Use the supplied reference as subjectId and copy the exact words of the mention from think.text into passage. ",
            "Set occurrence to null if passage appears once, or to its position among repeated matches ",
            "counting from 1. Keep your own words and leave uncertain mentions unbound. ",
            "These references grant no physical targets. A quotation must copy exact received words ",
            "from one passage and cannot fill a gap. Interpret relative time using the moment ",
            "of the cited evidence, or this decision for your own plans. ",
            "A remembered interval keeps the original gameSeconds.\n",
        );
        let mut listed = Vec::new();
        let Some(mut remaining) = self.remaining().checked_sub(SECTION_BREAK.len() + GUIDE.len() + 2)
        else {
            return Ok(listed);
        };
        for entry in references {
            let length = json_record_len(entry).map_err(|_| RenderError::Contract)?;
            let Some(after) = remaining.checked_sub(length + usize::from(!listed.is_empty())) else {
                continue;
            };
            let id = entry["reference"].as_str().ok_or(RenderError::Contract)?;
            if listed.is_empty() {
                self.section()?;
                self.text(GUIDE)?;
                self.text("[")?;
            } else {
                self.text(",")?;
            }
            self.json(entry)?;
            listed.push(id);
            remaining = after;
        }
        if !listed.is_empty() {
            self.text("]")?;
        }
        Ok(listed)
    }

    fn text(&mut self, text: &str) -> Result<(), RenderError> {
        self.write_all(text.as_bytes()).map_err(|_| self.failure())
    }

    fn failure(&mut self) -> RenderError {
        self.error.take().unwrap_or(RenderError::Contract)
    }

    fn json(&mut self, value: &Value) -> Result<(), RenderError> {
        write_json_record(value, &mut *self).map_err(|_| self.failure())
    }

    fn section(&mut self) -> Result<(), RenderError> {
        if self.sections > 0 {
            self.text(SECTION_BREAK)?;
        }
        self.sections += 1;
        Ok(())
    }

    fn list(&mut self, value: &Value, empty: &str) -> Result<(), RenderError> {
        let Some(lines) = value.as_array().filter(|items| !items.is_empty()) else {
            return self.text(empty);
        };
        for (index, line) in lines.iter().enumerate() {
            if index > 0 {
                self.text("\n")?;
            }
            self.text("- ")?;
            let line = line.as_str().ok_or(RenderError::Contract)?;
            for (index, segment) in line.split('\n').enumerate() {
                if index > 0 {
                    self.text("\n  ")?;
                }
                self.text(segment)?;
            }
        }
        Ok(())
    }

    fn joined(&mut self, values: &[String], separator: &str) -> Result<(), RenderError> {
        for (index, value) in values.iter().enumerate() {
            if index > 0 {
                self.text(separator)?;
            }
            self.text(value)?;
        }
        Ok(())
    }

    fn refuse(&mut self, error: RenderError) -> io::Error {
        self.error = Some(error);
        io::Error::other("decision prompt capacity")
    }
}

impl Write for PreparedPrompt {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        let length = self
            .bytes
            .len()
            .checked_add(bytes.len())
            .filter(|length| *length <= self.limit)
            .ok_or_else(|| self.refuse(RenderError::ContextLimit))?;
        if length > self.bytes.capacity() {
            let capacity = length
                .max(self.bytes.capacity().saturating_mul(2).max(512))
                .min(self.limit);
            self.custody
                .resize(capacity)
                .map_err(|_| self.refuse(RenderError::Capacity))?;
            self.bytes
                .try_reserve_exact(capacity - self.bytes.len())
                .map_err(|_| self.refuse(RenderError::Capacity))?;
        }
        self.bytes.extend_from_slice(bytes);
        Ok(bytes.len())
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

pub(super) fn render(
    policy: &DecisionPolicy,
    fields: &Map<String, Value>,
    actions: &[OfferedAction<'_>],
    include_actions: bool,
    additional_instructions: usize,
    budget: &ByteBudget,
) -> Result<PreparedPrompt, RenderError> {
    let limit = policy
        .context_bytes
        .checked_sub(policy.response_instructions.len())
        .and_then(|remaining| remaining.checked_sub(additional_instructions))
        .ok_or(RenderError::ContextLimit)?;
    let mut out = PreparedPrompt::new(limit, budget)?;
    let field = |key| fields.get(key).unwrap_or(&Value::Null);
    let required = |key: &'static str| field(key).as_str().ok_or(RenderError::Field(key));
    let exists = |key| !field(key).is_null();
    let nonempty = |key| field(key).as_array().is_some_and(|items| !items.is_empty());
    let enabled = |key| field("capabilities").get(key).and_then(Value::as_bool);
    let expressions = enabled("expressions") == Some(true);
    let query = field("situationQueries").as_bool() == Some(true);
    let empty = if query {
        r#"{"queries":null,"operations":[]}"#
    } else {
        r#"{"operations":[]}"#
    };
    let envelope = if query {
        r#"{"queries":null,"operations":["#
    } else {
        r#"{"operations":["#
    };
    let none = policy.text("none")?;
    macro_rules! text {
        ($fragment:expr) => {
            out.text(policy.text($fragment)?)?
        };
    }
    macro_rules! section {
        ($fragment:expr) => {{
            out.section()?;
            text!($fragment);
        }};
    }
    section!("me");
    out.text(required("identity")?)?;
    out.text("\n")?;
    out.text(required("aboutMe")?)?;
    out.text("\n")?;
    out.text(required("body")?)?;
    out.text(" ")?;
    out.text(field("feelings").as_str().unwrap_or_default())?;
    if let Some(concern) = field("carryingConcern")
        .as_str()
        .filter(|text| !text.is_empty())
    {
        out.text("\n")?;
        out.text(concern)?;
    }
    out.text("\n")?;
    out.text(&policy.expression_guidance[usize::from(expressions)])?;
    if enabled("speech") == Some(false) {
        text!("speechUnavailable");
    }
    section!("commitments");
    out.list(field("commitments"), none)?;
    out.text("\n")?;
    out.text(&policy.activity_coverage)?;
    section!("trigger");
    out.text(required("stimulus")?)?;
    section!("triggerFacts");
    out.json(field("triggerFacts"))?;
    text!("triggerEvidence");
    section!("task");
    if field("triggerFacts")["observerRelationship"] == "addressed_speech" {
        text!("addressedTask");
    }
    text!("taskChoices");
    section!("conversation");
    out.list(field("conversation"), none)?;
    text!("conversationPerspective");
    if nonempty("planOffers") {
        section!("planning");
        out.json(field("planOffers"))?;
        text!("planPrerequisites");
    }
    if nonempty("intentActions") {
        section!("intentControls");
        out.json(field("intentActions"))?;
        text!("intentPermission");
    }
    section!("work");
    emit_intentions(&mut out, policy, field("agency"))?;
    text!("workUncertainty");
    if nonempty("supplyOpportunities") {
        section!("supply");
        out.list(field("supplyOpportunities"), none)?;
    }
    section!("navigation");
    out.text(&policy.navigation)?;
    text!("relativeNavigation");
    out.text(field("currentSupport").as_str().unwrap_or("null"))?;
    text!("publicSupports");
    out.json(fields.get("publicSurfaces").unwrap_or(&EMPTY_ARRAY))?;
    section!("currentTime");
    out.text(required("now")?)?;
    text!("simulationSeconds");
    out.json(field("simTime"))?;
    out.text(")")?;
    if exists("activityRequests") {
        section!("activityRequests");
        out.json(field("activityRequests"))?;
        text!("activityPermissions");
    }
    if exists("inspectedContainer") {
        section!("inspectedContainer");
        out.json(field("inspectedContainer"))?;
        text!("containerCoverage");
    }
    for key in ["inspectedActions", "inspectedMethods"] {
        if exists(key) {
            section!(key);
            out.list(field(key), none)?;
        }
    }
    section!("recall");
    out.list(field("recall"), none)?;
    if let Some(reconsideration) = field("reconsideration").as_str() {
        out.text("\n")?;
        out.text(reconsideration)?;
    }
    text!("structuredExperience");
    out.json(fields.get("experience").unwrap_or(&EMPTY_ARRAY))?;
    text!("experiencePermission");
    if exists("naming") {
        out.section()?;
        out.text("Permitted name edits: ")?;
        out.json(field("naming"))?;
    }
    if exists("appraisals") {
        out.section()?;
        out.text("Permitted appraisal operations and their exact evidence: ")?;
        out.json(field("appraisals"))?;
    }
    if exists("recentWorkResults") {
        section!("workResults");
        out.json(field("recentWorkResults"))?;
        text!("workResultsTime");
    }
    if exists("receivedSituation") {
        section!("receivedSituation");
        out.json(field("receivedSituation"))?;
        text!("situationPermission");
    }
    if nonempty("surroundings") || nonempty("contacts") || !exists("receivedSituation") {
        section!("nearby");
        if nonempty("surroundings") || !exists("receivedSituation") {
            out.list(field("surroundings"), none)?;
        }
        if nonempty("contacts") {
            text!("contactEvidence");
            out.list(field("contacts"), none)?;
        }
    }
    section!("inventory");
    out.list(field("possessions"), none)?;
    if exists("inventoryCoverage") {
        text!("partialInventory");
        out.json(field("inventoryCoverage"))?;
        text!("inventoryCoverage");
    }
    section!("notepad");
    if exists("notepad") {
        out.json(field("notepad"))?;
    } else {
        out.text("{}")?;
    }
    section!("knowledge");
    out.list(field("knowledge"), none)?;
    if include_actions {
        section!("actions");
        if actions.is_empty() {
            text!("noActions");
        }
        for (index, action) in actions.iter().enumerate() {
            if index > 0 {
                out.text("\n")?;
            }
            out.text(ACTION_BULLET)?;
            out.text(action.id)?;
            out.text(ACTION_SEPARATOR)?;
            out.text(action.description)?;
        }
        text!("unlistedActions");
    }
    section!("responseFormat");
    if query {
        text!("queryMode");
    }
    text!("continueWith");
    out.text(empty)?;
    text!("operationFormat");
    text!(if expressions {
        "expressionKinds"
    } else {
        "plainKinds"
    });
    text!("knownAction");
    if expressions {
        text!("expressionArguments");
    }
    text!("proposalArguments");
    if policy.named_times.is_empty() {
        text!("unnamedTime");
    } else {
        text!("untilTime");
        out.joined(&policy.named_times, "|")?;
    }
    text!("actionGoalPlanRules");
    out.joined(&policy.output_families, ", ")?;
    text!("itemOutputRules");
    out.text(&policy.knowledge_instructions)?;
    text!("attentionExamples");
    out.text(empty)?;
    text!("speechExampleLabel");
    out.text(envelope)?;
    text!("speechExample");
    section!("references");
    out.list(field("references"), none)?;
    Ok(out)
}

static EMPTY_ARRAY: Value = Value::Array(Vec::new());

fn emit_intentions(
    out: &mut PreparedPrompt,
    policy: &DecisionPolicy,
    agency: &Value,
) -> Result<(), RenderError> {
    let goals = agency["goals"]
        .as_array()
        .map(Vec::as_slice)
        .unwrap_or_default();
    for goal in goals {
        out.text(goal["status"].as_str().ok_or(RenderError::Contract)?)?;
        out.text(policy.text("goal")?)?;
        out.text(goal["objective"].as_str().ok_or(RenderError::Contract)?)?;
        out.text("\n")?;
    }
    out.text(agency["plan"].as_str().unwrap_or(policy.text("noPlan")?))?;
    for field in ["paused", "outcomeCoverage"] {
        if let Some(value) = agency[field].as_str() {
            out.text("\n")?;
            out.text(value)?;
        }
    }
    out.text("\n")?;
    out.text(policy.text("planRevision")?)?;
    out.json(agency.get("planRevision").unwrap_or(&0.into()))?;
    out.text(".")?;
    if !goals.is_empty() {
        out.text("\n")?;
        out.text(policy.text("goalControls")?)?;
        for (index, goal) in goals.iter().enumerate() {
            if index > 0 {
                out.text(",")?;
            }
            out.text("{")?;
            for (index, selected) in ["id", "revision", "objective"]
                .into_iter()
                .filter(|key| goal.get(key).is_some())
                .enumerate()
            {
                if index > 0 {
                    out.text(",")?;
                }
                out.text("\"")?;
                out.text(selected)?;
                out.text("\":")?;
                out.json(&goal[selected])?;
            }
            out.text("}")?;
        }
        out.text("]")?;
    }
    if let Some(attempts) = agency["attempts"].as_array() {
        for attempt in attempts {
            out.text("\n")?;
            out.text(policy.text("unresolvedIntention")?)?;
            out.text(
                attempt["description"]
                    .as_str()
                    .ok_or(RenderError::Contract)?,
            )?;
        }
    }
    Ok(())
}
