//! Installation transports immutable row/definition JSON as ordinary String.
//! They are not decoded JsText trees by this DTO decode; later semantic
//! materializations have separate funding obligations at their owning installers.
//! Count this actual first decode, rather than charging every byte
//! and numeric array element as a command with nested exact-text fields.
use super::*;
use crate::host::retained_size::{map_storage, tree_node_bound};
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
    Extra,
    PlainRow,
}
#[derive(Clone, Copy, Default)]
enum Role {
    #[default]
    Root,
    Records,
    Tables,
    Rows,
    Row,
    Originals,
    Original,
    Directories,
    Plain,
    Cells,
    Other,
}
#[derive(Clone, Copy, Default)]
struct Frame {
    role: Role,
    field: Field,
    start: usize,
}
#[derive(Default)]
struct Strings {
    plain: usize,
    maximum: usize,
    cell_containers: usize,
    map_members: usize,
}
fn capacity() -> RuntimeError {
    failure("installation decode capacity")
}
fn add(left: usize, right: usize) -> Result<usize, RuntimeError> {
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
        (b"tables", Field::Tables),
        (b"normalizedIntents", Field::Normalized),
        (b"originals", Field::Originals),
        (b"definitions", Field::Definitions),
        (b"layouts", Field::Layouts),
        (b"coldDirectories", Field::Directories),
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
        Role::Plain | Role::Original | Role::Directories => Role::Plain,
        Role::Cells => Role::Cells,
        Role::Other => Role::Other,
    }
}
fn strings(text: &str) -> Result<Strings, RuntimeError> {
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
                    Role::Plain | Role::Original | Role::Tables | Role::Directories => true,
                    Role::Records => {
                        key || !matches!(frame.field, Field::Normalized | Field::Tables)
                    }
                    Role::Row => key || matches!(frame.field, Field::PlainRow),
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
                    Role::Root
                } else {
                    child(stack[depth - 1])
                };
                *stack.get_mut(depth).ok_or_else(capacity)? = Frame {
                    role,
                    field: Field::Other,
                    start: at,
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
                at += 1;
            }
            _ => at += 1,
        }
    }
    Ok(result)
}
pub(super) fn prepare_installation(
    bytes: &[u8],
    budget: &ByteBudget,
) -> Result<ByteReservation, RuntimeError> {
    let text = std::str::from_utf8(bytes).map_err(failure)?;
    let shape = crate::encoding::JsonAllocationShape::read(text).map_err(failure)?;
    let strings = strings(text)?;
    let element = [
        size_of::<crate::records::InstalledRow>(),
        size_of::<crate::records::OwnerCoverage>(),
        size_of::<crate::records::RecordLayout>(),
        size_of::<crate::records::SqlCell>(),
        size_of::<crate::records::NormalizedIntent>(),
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
    let ordinary = add(
        strings.plain,
        strings.maximum.checked_mul(2).ok_or_else(capacity)?,
    )?;
    let remaining = bytes
        .len()
        .checked_sub(strings.plain)
        .ok_or_else(capacity)?;
    // Only indexed cells/normalized-intent text can construct JsText or exact
    // property-name codecs in this DTO. Preserve their prior text admission;
    // additionally fund nested exact-object encodings by their actual spans.
    let text = add(ordinary, remaining.checked_mul(12).ok_or_else(capacity)?)?;
    let exact = strings
        .cell_containers
        .checked_mul(6)
        .ok_or_else(capacity)?;
    let bound = shape
        .array_items
        .checked_mul(4)
        .and_then(|n| n.checked_mul(element))
        // Struct field identifiers borrow the input; only the actual dynamic
        // maps allocate one entry per key during this first typed decode.
        .and_then(|n| n.checked_add(strings.map_members.checked_mul(member)?))
        .and_then(|n| {
            n.checked_add(
                shape
                    .strings
                    .checked_mul(8 * size_of::<u16>() + 2 * size_of::<usize>())?,
            )
        })
        .and_then(|n| n.checked_add(text))
        .and_then(|n| n.checked_add(exact))
        .and_then(|n| n.checked_add(size_of::<super::Installation>() + 64))
        .ok_or_else(capacity)?;
    budget.reserve(bound).map_err(|_| {
        failure((
            "installation decode admission",
            bound,
            budget.used(),
            budget.limit(),
        ))
    })
}
