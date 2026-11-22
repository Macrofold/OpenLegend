//! Learning retains a method from the actor's actual connected attempts.
//! Method templates carry no current object, resource, or execution permission.
use super::*;
mod syntax;
pub(crate) use syntax::{InstalledLearningLanguage, LearningLanguage};

mod candidate;
mod cursor;
mod discovery;
mod format;
mod history;
mod library;
mod models;
mod normalize;
mod publication;
mod read;
mod retention;
pub(crate) use cursor::{
    LearningPreparationAnswer, LearningPreparationCursor, LearningPreparationStep,
    PreparedActivityLearning,
};
pub(crate) use format::{LearningFormatAnswer, LearningFormatRequest};
pub(crate) use history::LearningHistoryAnswer;
pub use history::LearningHistoryRequest;
pub(super) use library::{LearningLibrary, install_library};
pub use publication::LearningJudgment;
pub(crate) use publication::{
    CompletedActivityLearning, LearningPublicationAnswer, LearningPublicationCursor,
    LearningPublicationRequest, LearningPublicationStep,
};
pub use read::RuntimeInspectedSkill;
pub(crate) use read::{inspected_activities, learning_signatures};

pub(super) use models::{LearningAcquisition, LearningMethod};
