//! Finite probe catalogue. Identities and units are shared with the campaign
//! inventory; callers own the measured operations and their outcomes.

use super::Site;

macro_rules! sites {
    ($( $index:literal, $name:ident, $id:literal, $unit:literal; )+) => {
        $(pub const $name: Site = Site::numbered($index, $id, $unit);)+
        pub const ALL: &[Site] = &[$($name),+];
    }
}

sites! {
     0, COMMAND,       "S01.entry.command",       "request";
     1, CLOCK,         "S02.entry.tick",          "clock offer";
     2, DRIVER,        "S02.entry.native",        "driver step";
     3, RESUME,        "S02.08",                  "advance segment";
     4, QUESTION,      "S02.wait.question",       "host question";
     5, ACCEPTED,      "S02.10",                  "accepted game microsecond";
     6, TURN_WAIT,     "S02.wait.turn",           "turn request";
     7, TURN_CLOCK,    "S02.hold.turn",           "held world turn";
     8, HOST_ADMIT,    "S02.wait.host",           "host admission";
     9, DISPATCH_WAIT, "S02.wait.dispatch",       "admitted job";
    10, DISPATCH_EXEC, "S02.exec.dispatch",       "started job";
    11, SIGHT,         "S03.08.ray-loop",         "ray batch";
    12, WANDER,        "S04.02",                  "wander review";
    13, EXPOSURE,      "S04.03",                  "exposure review";
    14, PERCEPTION,    "S05.entry.perception",    "perception segment";
    15, RECEIVE,       "S06.entry.current",       "receiving segment";
    16, ATTENTION,     "S07.entry.attention",     "observer opportunity";
    17, CANDIDATES,    "S07.02",                  "candidate preparation";
    18, EVENT,         "S08.entry.event",         "event segment";
    19, NPC,           "S09.entry.prepare",       "decision job";
    20, PROVIDER,      "S09.entry.dispatch",      "provider operation";
    21, VIEW,          "S11.entry.prepare",       "view attempt";
    22, DISCLOSE,      "S11.entry.disclose",      "permission check and selection";
    23, SAVE_ENCODE,   "S12.entry.encode",        "candidate encoding";
    24, SAVE_FLUSH,    "S12.entry.flush",         "save attempt";
    25, READER_WAIT,   "S13.01.wait",             "read admission";
    26, READER_HOLD,   "S13.01.hold",             "held read connection";
    27, TRANSACTION,   "S13.05.transaction",      "read transaction";
    28, ATTENTION_REUSE, "S07.04.reuse",          "reused selection";
    29, ATTENTION_RANK,  "S07.04.rank",           "new ranking";
    30, VIEW_BYTES,    "S11.delivery",           "authorized payload byte";
    31, PACK,          "S12.entry.pack",         "temporal save batch";
    32, RECORDS,       "S12.write.records",       "record batch";
    33, ACK,           "S12.ack",                 "save acknowledgement";
    34, PREFLIGHT,     "S13.04.preflight",        "size query";
    35, BODY,          "S13.04.body",             "body query";
    36, DECODE,        "S13.04.decode",           "decoded row";
    37, TURN_NPC,      "S09.hold.turn",           "held NPC turn";
    38, TURN_VIEW,     "S11.hold.turn",           "held disclosure turn";
    39, TURN_OTHER,    "S02.hold.other",          "held world turn";
    40, TURN_COMMAND,  "S01.hold.turn",           "held command turn";
    41, CANDIDATES_COUNT, "S07.02.candidates",    "prepared candidate";
    42, SIGHT_QUERIES,  "S03.08.rays",            "ray query";
    43, RECORD_ROWS,    "S12.write.rows",         "changed row";
    44, BODY_ROWS,      "S13.04.rows",            "returned row";
    45, FRAME_RESET,    "S11.delivery.reset",     "reset frame";
    46, FRAME_PATCH,    "S11.delivery.patch",     "patch frame";
    47, FRAME_UNCHANGED,"S11.delivery.unchanged", "unchanged view";
    48, FRAME_HTTP,     "S11.delivery.http",      "full HTTP response";
    49, SAVED_ROWS,     "S12.entry.rows",          "encoded changed row";
    50, OFFERED,       "S02.01.offered",        "offered game microsecond";
    51, WRITE_COMMIT,  "S13.05.commit",         "write commit";
    52, RELEASE_DEBT,  "S02.01.discarded",      "discarded game microsecond";
    53, READ_OP,       "S13.read.operational",  "operational read";
    54, READ_SIM,      "S13.read.simulation",   "simulation cut read";
    55, SPEECH_REFERENCE, "S08.speech.reference", "heard personal reference check";
}
