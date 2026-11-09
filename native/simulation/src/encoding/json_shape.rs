//! Nonallocating preparation preflight shared by real provider and install inputs.
#[derive(Debug)]
pub(crate) enum JsonShapeError {
    Capacity,
    MalformedResponse,
}

/// Count JSON allocation-bearing shape without decoding text or constructing a
/// tree. Escaped isolated UTF16 units must reach the actual JsText decoder.
/// Syntax/field validation remains the typed family's owning boundary below.
#[derive(Default)]
pub(crate) struct JsonAllocationShape {
    pub(crate) array_items: usize,
    pub(crate) members: usize,
    pub(crate) strings: usize,
    pub(crate) containers: usize,
}
impl JsonAllocationShape {
    pub(crate) fn read(source: &str) -> Result<Self, JsonShapeError> {
        let mut result = Self::default();
        let mut stack = [0_u8; 128]; // serde_json's current recursion limit.
        let mut depth = 0;
        let mut quoted = false;
        let mut escaped = false;
        let bytes = source.as_bytes();
        for (at, byte) in bytes.iter().copied().enumerate() {
            if quoted {
                if escaped {
                    escaped = false;
                } else if byte == b'\\' {
                    escaped = true;
                } else if byte == b'"' {
                    quoted = false;
                }
                continue;
            }
            match byte {
                b'"' => {
                    quoted = true;
                    result.strings = result
                        .strings
                        .checked_add(1)
                        .ok_or(JsonShapeError::Capacity)?;
                }
                b'[' | b'{' => {
                    result.containers = result
                        .containers
                        .checked_add(1)
                        .ok_or(JsonShapeError::Capacity)?;
                    let slot = stack
                        .get_mut(depth)
                        .ok_or(JsonShapeError::MalformedResponse)?;
                    *slot = byte;
                    depth += 1;
                    if byte == b'['
                        && bytes[at + 1..].iter().find(|b| !b.is_ascii_whitespace()) != Some(&b']')
                    {
                        result.array_items = result
                            .array_items
                            .checked_add(1)
                            .ok_or(JsonShapeError::Capacity)?;
                    }
                }
                b']' | b'}' => {
                    depth = depth
                        .checked_sub(1)
                        .ok_or(JsonShapeError::MalformedResponse)?;
                    if stack[depth] != if byte == b']' { b'[' } else { b'{' } {
                        return Err(JsonShapeError::MalformedResponse);
                    }
                }
                b',' if depth > 0 && stack[depth - 1] == b'[' => {
                    result.array_items = result
                        .array_items
                        .checked_add(1)
                        .ok_or(JsonShapeError::Capacity)?;
                }
                b':' => {
                    result.members = result
                        .members
                        .checked_add(1)
                        .ok_or(JsonShapeError::Capacity)?
                }
                _ => {}
            }
        }
        if quoted || depth != 0 {
            return Err(JsonShapeError::MalformedResponse);
        }
        Ok(result)
    }
}
