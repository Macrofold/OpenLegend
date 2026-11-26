//! Finite label preparation joins the native capture before model admission.
//! The received scene keeps its original cut while current personal names may
//! finish after history retrieval. Its actual life/privacy/timeline owner fences
//! that join; the response ticket separately validates executable bindings.
use super::*;
use crate::reception::ObserverSubject;
use crate::worlds::InstalledPersonalNameReader;
use std::mem::size_of;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    subjects: Vec<ObserverSubject>,
}
#[derive(Serialize)]
struct Label<'a> {
    subject: &'a ObserverSubject,
    label: crate::text::TextRef<'a>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Product<'a> {
    world_id: &'a str,
    generation: &'a str,
    actor_id: &'a str,
    base_cut: u64,
    labels: &'a [Label<'a>],
}
impl NativeWorldSession {}
