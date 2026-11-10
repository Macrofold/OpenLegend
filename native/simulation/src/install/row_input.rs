//! Installation transports immutable row/definition JSON as ordinary String.
//! They are not decoded JsText trees by this DTO decode; later semantic
//! materializations have separate funding obligations at their owning installers.
//! Count this actual first decode, rather than charging every byte
//! and numeric array element as a command with nested exact-text fields.
use crate::host::retained_size::{map_storage, tree_node_bound};
use crate::host::{ByteBudget, ByteReservation};
use std::mem::size_of;

#[derive(Clone, Copy, Default)]
enum Field {
    #[default]
    Other,
    Records,
    Tables,
    Normalized,
    Originals,
    Definitions,
    Layouts,
    Directories,
    Entries,
    Ids,
    Extra,
    PlainRow,
    AccountRows,
    AccountRow,
    Occupied,
}
#[derive(Clone, Copy, Default)]
enum Role {
    #[default]
    Root,
    AccountRoot,
    AccountRows,
    AccountBody,
    Records,
    Tables,
    Rows,
    Row,
    Originals,
    Original,
    Directories,
    DirectoryList,
    Directory,
    ChargeList,
    Charge,
    StringList,
    Plain,
    Cells,
    Other,
}
#[derive(Clone, Copy, Default)]
struct Frame {
    role: Role,
    field: Field,
    start: usize,
    array: bool,
    items: usize,
}
#[derive(Default)]
struct Strings {
    plain: usize,
    maximum: usize,
    cell_containers: usize,
    map_members: usize,
    directory_items: usize,
    directory_storage: usize,
}
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(crate) enum InputErrorKind {
    Format,
    Capacity,
}
#[derive(Debug)]
pub(crate) enum InputAllocationError {
    Format,
    Capacity {
        requested: Option<usize>,
        used: Option<usize>,
        limit: Option<usize>,
    },
}
impl InputAllocationError {
    pub(crate) fn kind(&self) -> InputErrorKind {
        match self {
            Self::Format => InputErrorKind::Format,
            Self::Capacity { .. } => InputErrorKind::Capacity,
        }
    }
}
fn capacity() -> InputAllocationError {
    InputAllocationError::Capacity {
        requested: None,
        used: None,
        limit: None,
    }
}
fn add(left: usize, right: usize) -> Result<usize, InputAllocationError> {
    left.checked_add(right).ok_or_else(capacity)
}

// Fixed ASCII schema names may themselves be escaped in valid JSON. Recognize
// those spellings without allocating/normalizing any author or player text.
fn key_is(token: &[u8], expected: &[u8]) -> bool {
    let mut at = 0;
    for expected in expected {
        let value = match token.get(at) {
            Some(b'\\') if token.get(at + 1) == Some(&b'u') => {
                let Some(hex) = token.get(at + 2..at + 6) else {
                    return false;
                };
                let mut value = 0u16;
                for byte in hex {
                    let digit = match byte {
                        b'0'..=b'9' => byte - b'0',
                        b'a'..=b'f' => byte - b'a' + 10,
                        b'A'..=b'F' => byte - b'A' + 10,
                        _ => return false,
                    };
                    value = value * 16 + u16::from(digit);
                }
                at += 6;
                if value > 127 {
                    return false;
                }
                value as u8
            }
            Some(value) => {
                at += 1;
                *value
            }
            None => return false,
        };
        if value != *expected {
            return false;
        }
    }
    at == token.len()
}
fn field(token: &[u8]) -> Field {
    for (name, value) in [
        (b"records".as_slice(), Field::Records),
        (b"rows", Field::AccountRows),
        (b"row", Field::AccountRow),
        (b"occupiedMemoryIds", Field::Occupied),
        (b"kind", Field::PlainRow),
        (b"tables", Field::Tables),
        (b"normalizedIntents", Field::Normalized),
        (b"activityMethodSignatures", Field::Normalized),
        (b"originals", Field::Originals),
        (b"definitions", Field::Definitions),
        (b"layouts", Field::Layouts),
        (b"coldDirectories", Field::Directories),
        (b"entries", Field::Entries),
        (b"individualIds", Field::Ids),
        (b"sourceIds", Field::Ids),
        (b"extra", Field::Extra),
        (b"id", Field::PlainRow),
        (b"parent", Field::PlainRow),
        (b"slot", Field::PlainRow),
        (b"payload", Field::PlainRow),
        (b"eventId", Field::PlainRow),
    ] {
        if key_is(token, name) {
            return value;
        }
    }
    Field::Other
}
fn child(parent: Frame) -> Role {
    match parent.role {
        Role::AccountRoot => match parent.field {
            Field::AccountRows => Role::AccountRows,
            Field::Occupied => Role::Plain,
            _ => Role::Other,
        },
        Role::AccountRows => Role::AccountBody,
        Role::AccountBody => match parent.field {
            Field::AccountRow => Role::Row,
            _ => Role::Other,
        },
        Role::Root => match parent.field {
            Field::Records => Role::Records,
            Field::Originals => Role::Originals,
            Field::Definitions | Field::Layouts => Role::Plain,
            Field::Directories => Role::Directories,
            _ => Role::Other,
        },
        Role::Records => match parent.field {
            Field::Tables => Role::Tables,
            Field::Normalized => Role::Other,
            _ => Role::Plain,
        },
        Role::Tables => Role::Rows,
        Role::Rows => Role::Row,
        Role::Originals => Role::Original,
        Role::Row => match parent.field {
            Field::Extra => Role::Cells,
            _ => Role::Other,
        },
        Role::Directories => Role::DirectoryList,
        Role::DirectoryList => Role::Directory,
        Role::Directory => match parent.field {
            Field::Entries => Role::ChargeList,
            _ => Role::Plain,
        },
        Role::ChargeList => Role::Charge,
        Role::Charge => match parent.field {
            Field::Ids => Role::StringList,
            _ => Role::Plain,
        },
        Role::StringList | Role::Plain | Role::Original => Role::Plain,
        Role::Cells => Role::Cells,
        Role::Other => Role::Other,
    }
}
fn strings(text: &str, root: Role) -> Result<Strings, InputAllocationError> {
    let bytes = text.as_bytes();
    let mut stack = [Frame::default(); 128];
    let mut depth: usize = 0;
    let mut at = 0;
    let mut result = Strings::default();
    while at < bytes.len() {
        match bytes[at] {
            b'"' => {
                let start = at;
                at += 1;
                let mut escaped = false;
                while let Some(byte) = bytes.get(at) {
                    at += 1;
                    if escaped {
                        escaped = false;
                    } else if *byte == b'\\' {
                        escaped = true;
                    } else if *byte == b'"' {
                        break;
                    }
                }
                let mut next = at;
                while bytes.get(next).is_some_and(u8::is_ascii_whitespace) {
                    next += 1;
                }
                let key = bytes.get(next) == Some(&b':');
                let frame = depth
                    .checked_sub(1)
                    .and_then(|n| stack.get_mut(n))
                    .ok_or_else(capacity)?;
                let plain = match frame.role {
                    Role::Plain
                    | Role::Original
                    | Role::Tables
                    | Role::Directories
                    | Role::DirectoryList
                    | Role::Directory
                    | Role::ChargeList
                    | Role::Charge
                    | Role::StringList => true,
                    Role::Records => {
                        key || !matches!(frame.field, Field::Normalized | Field::Tables)
                    }
                    Role::Row | Role::AccountBody => key || matches!(frame.field, Field::PlainRow),
                    _ => false,
                };
                if plain {
                    let length = at - start;
                    result.plain = add(result.plain, length)?;
                    result.maximum = result.maximum.max(length);
                }
                if key {
                    if matches!(frame.role, Role::Tables | Role::Directories | Role::Cells) {
                        result.map_members = add(result.map_members, 1)?;
                    }
                    frame.field = field(&bytes[start + 1..at - 1]);
                }
            }
            b'[' | b'{' => {
                let role = if depth == 0 {
                    root
                } else {
                    child(stack[depth - 1])
                };
                *stack.get_mut(depth).ok_or_else(capacity)? = Frame {
                    role,
                    field: Field::Other,
                    start: at,
                    array: bytes[at] == b'[',
                    items: usize::from(
                        bytes[at] == b'['
                            && bytes[at + 1..].iter().find(|b| !b.is_ascii_whitespace())
                                != Some(&b']'),
                    ),
                };
                depth += 1;
                at += 1;
            }
            b']' | b'}' => {
                depth = depth.checked_sub(1).ok_or_else(capacity)?;
                let frame = stack[depth];
                if matches!(frame.role, Role::Cells) {
                    result.cell_containers = add(result.cell_containers, at - frame.start + 1)?;
                }
                if frame.array {
                    let element = match frame.role {
                        Role::DirectoryList => {
                            size_of::<crate::received::ReceivedChargeDirectory>()
                        }
                        Role::ChargeList => size_of::<crate::received::ReceivedChargeEntry>(),
                        Role::StringList => size_of::<String>(),
                        _ => 0,
                    };
                    if element != 0 {
                        result.directory_items = add(result.directory_items, frame.items)?;
                        result.directory_storage = add(
                            result.directory_storage,
                            frame
                                .items
                                .checked_mul(4)
                                .and_then(|n| n.checked_mul(element))
                                .ok_or_else(capacity)?,
                        )?;
                    }
                }
                at += 1;
            }
            b',' if depth > 0 && stack[depth - 1].array => {
                let frame = &mut stack[depth - 1];
                frame.items = add(frame.items, 1)?;
                at += 1;
            }
            _ => at += 1,
        }
    }
    Ok(result)
}
/// The typed row DTO keeps its real carriers through consuming installation.
/// After decoding, replace completed text/raw-container preparation with the
/// actual typed heaps. Ordinary Strings and array/map carriers stay admitted.
pub(crate) struct PreparedRowDecode {
    storage: ByteReservation,
    decoder_scratch: usize,
}
impl PreparedRowDecode {
    pub(crate) fn finish_installation(
        mut self,
        retained_text: usize,
    ) -> Result<ByteReservation, InputAllocationError> {
        let bytes = self
            .storage
            .bytes()
            .checked_sub(self.decoder_scratch)
            .and_then(|bytes| bytes.checked_add(retained_text))
            .ok_or_else(capacity)?;
        self.storage.resize(bytes).map_err(|_| capacity())?;
        Ok(self.storage)
    }
}

pub(crate) fn prepare_installation(
    bytes: &[u8],
    budget: &ByteBudget,
    inline_bytes: usize,
) -> Result<PreparedRowDecode, InputAllocationError> {
    prepare_rows(bytes, budget, Role::Root, inline_bytes, 0)
}
pub(crate) fn prepare_account_bodies(
    bytes: &[u8],
    budget: &ByteBudget,
) -> Result<ByteReservation, InputAllocationError> {
    prepare_rows(
        bytes,
        budget,
        Role::AccountRoot,
        size_of::<crate::experience::AccountBodiesReply>(),
        size_of::<crate::experience::retention::AccountBodyRow>(),
    )
    .map(|prepared| prepared.storage)
}
fn prepare_rows(
    bytes: &[u8],
    budget: &ByteBudget,
    root: Role,
    inline_bytes: usize,
    extra_element: usize,
) -> Result<PreparedRowDecode, InputAllocationError> {
    let text = std::str::from_utf8(bytes).map_err(|_| InputAllocationError::Format)?;
    let shape = crate::encoding::JsonAllocationShape::read(text)
        .map_err(|_| InputAllocationError::Format)?;
    let strings = strings(text, root)?;
    let element = [
        extra_element,
        size_of::<crate::records::InstalledRow>(),
        size_of::<crate::records::OwnerCoverage>(),
        size_of::<crate::records::RecordLayout>(),
        size_of::<crate::records::SqlCell>(),
        size_of::<crate::records::NormalizedIntent>(),
        size_of::<crate::records::ActivityMethodSignature>(),
        size_of::<crate::records::EntityOrderingEntry>(),
        size_of::<crate::events::OriginalOccurrenceInput>(),
        size_of::<crate::install::DefinitionInput>(),
        size_of::<crate::received::ReceivedChargeDirectory>(),
        size_of::<crate::received::ReceivedChargeEntry>(),
    ]
    .into_iter()
    .max()
    .unwrap_or(0);
    let member = map_storage::<String, crate::records::SqlCell>(1)
        .and_then(|n| {
            n.checked_add(4 * size_of::<(crate::text::JsText, crate::records::SqlCell)>())
        })
        .and_then(|n| Some(n.max(tree_node_bound::<String, Vec<crate::records::InstalledRow>>()?)))
        .ok_or_else(capacity)?;
    // Owned String copies need at most their quoted wire bytes. Serde reuses
    // one growing unescape scratch Vec, whose capacity is <=2x the largest such
    // token (including the small allocator minimum), not 12x every row body.
    let unescape_scratch = strings.maximum.checked_mul(2).ok_or_else(capacity)?;
    let ordinary = add(strings.plain, unescape_scratch)?;
    let remaining = bytes
        .len()
        .checked_sub(strings.plain)
        .ok_or_else(capacity)?;
    // Only indexed cells/normalized-intent text can construct JsText or exact
    // property-name codecs in this DTO. Preserve their prior text admission;
    // additionally fund nested exact-object encodings by their actual spans.
    let exact_text = remaining.checked_mul(12).ok_or_else(capacity)?;
    let text = add(ordinary, exact_text)?;
    let text_metadata = shape
        .strings
        .checked_mul(8 * size_of::<u16>() + 2 * size_of::<usize>())
        .ok_or_else(capacity)?;
    let exact = strings
        .cell_containers
        .checked_mul(6)
        .ok_or_else(capacity)?;
    let bound = shape
        .array_items
        .checked_sub(strings.directory_items)
        .ok_or_else(capacity)?
        .checked_mul(4)
        .and_then(|n| n.checked_mul(element))
        // The cold directory's numeric structs and String vectors have fixed,
        // distinct DTO carriers. Preserve the existing 4x Vec growth envelope
        // without charging each ID as the largest installed row.
        .and_then(|n| n.checked_add(strings.directory_storage))
        // Struct field identifiers borrow the input; only the actual dynamic
        // maps allocate one entry per key during this first typed decode.
        .and_then(|n| n.checked_add(strings.map_members.checked_mul(member)?))
        .and_then(|n| n.checked_add(text_metadata))
        .and_then(|n| n.checked_add(text))
        .and_then(|n| n.checked_add(exact))
        .and_then(|n| n.checked_add(inline_bytes + 64))
        .ok_or_else(capacity)?;
    let decoder_scratch = unescape_scratch
        .checked_add(exact)
        .and_then(|bytes| bytes.checked_add(exact_text))
        .and_then(|bytes| bytes.checked_add(text_metadata))
        .ok_or_else(capacity)?;
    budget
        .reserve(bound)
        .map(|storage| PreparedRowDecode {
            storage,
            decoder_scratch,
        })
        .map_err(|_| InputAllocationError::Capacity {
            requested: Some(bound),
            used: Some(budget.used()),
            limit: Some(budget.limit()),
        })
}
