//! Private, inactive rewind reconciliation. Operational authority and issued
//! identity survive the gameplay rewind; no public semantic setter is exposed.
mod metadata;
pub(crate) use metadata::{
    ArchiveCategory as RestoreArchiveCategory, MetadataJournal, PreparedRestoreArchives,
    RestoreArchiveBaseline, RestoreArchivesAnswer, RestoreArchivesCursor, RestoreArchivesQuestion,
    RestoreArchivesStep, RestoreMetadataInput, RestoreMetadataPreparation, RestoreMetadataResult,
    RestorePrivacy, apply_restore_archive_baseline, begin_restore_metadata,
    finish_restore_metadata,
};
