use super::*;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct PerspectiveRequest {
    entities: Vec<crate::capture::NpcPerspectiveEntity>,
}
impl NativeWorldSession {}
