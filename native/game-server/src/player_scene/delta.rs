//! Wire fields in a typed patch keep their existing equality and optionality.

macro_rules! fields {
    ($map:ident, $before:ident, $after:ident;
     required { $($required:literal => $($field:ident).+),* $(,)? }
     optional { $($optional:literal => $($opt:ident).+),* $(,)? }) => {
        $(if $before.$($field).+ != $after.$($field).+ {
            $map.serialize_entry($required, &$after.$($field).+)?;
        })*
        $(if $before.$($opt).+ != $after.$($opt).+
            && let Some(value) = &$after.$($opt).+ {
            $map.serialize_entry($optional, value)?;
        })*
    };
}

macro_rules! removed {
    ($before:ident, $after:ident; $($optional:literal => $($opt:ident).+),* $(,)?) => {
        [$(($before.$($opt).+.is_some() && $after.$($opt).+.is_none()).then_some($optional)),*]
            .into_iter().flatten().collect::<Vec<_>>()
    };
}

pub(crate) use {fields, removed};
