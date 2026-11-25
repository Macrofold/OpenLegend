//! Shared game-time arithmetic for authored windows and their next edge.
const HOURS_PER_DAY: f64 = 24.0;
const SECONDS_PER_HOUR: f64 = 3600.0;
const SECONDS_PER_DAY: f64 = HOURS_PER_DAY * SECONDS_PER_HOUR;

/// Compile the fixed-day interpretation from its actual clock settings.
/// Unrelated status definitions are not inputs to a remembered day.
pub(crate) fn fixed_day_pin(offset_hours: f64) -> crate::values::DefinitionPin {
    let mut clock = [0; 16];
    clock[..8].copy_from_slice(&SECONDS_PER_DAY.to_be_bytes());
    // Treat signed zero as the same installed offset.
    clock[8..].copy_from_slice(&(offset_hours * SECONDS_PER_HOUR + 0.0).to_be_bytes());
    crate::values::DefinitionPin {
        id: "world-calendar".into(),
        version: 1,
        digest: crate::encoding::sha256_hex(&clock),
    }
}

pub(crate) fn next_local_day(at: f64, offset: f64) -> Option<(f64, f64)> {
    let offset_seconds = offset * SECONDS_PER_HOUR;
    let day = ((at + offset_seconds) / SECONDS_PER_DAY).floor();
    let from = (day + 1.0) * SECONDS_PER_DAY - offset_seconds;
    let through = from + SECONDS_PER_DAY;
    (from.is_finite() && through.is_finite() && at < from && from < through)
        .then_some((from, through))
}

pub(crate) fn local_hour(at: f64, offset: f64) -> f64 {
    let hour = (at / SECONDS_PER_HOUR + offset) % HOURS_PER_DAY;
    if hour < 0.0 {
        hour + HOURS_PER_DAY
    } else {
        hour
    }
}

pub(crate) fn in_daily_window(hour: f64, start: f64, end: f64) -> bool {
    if start < end {
        hour >= start && hour < end
    } else {
        hour >= start || hour < end
    }
}

pub(crate) fn daily_boundary(hour: f64, start: f64, end: f64, epsilon: f64) -> f64 {
    let seconds_to = |edge: f64| {
        let gap = edge - hour;
        let seconds = (if gap < 0.0 { gap + HOURS_PER_DAY } else { gap }) * SECONDS_PER_HOUR;
        if seconds <= 0.0 {
            HOURS_PER_DAY * SECONDS_PER_HOUR
        } else {
            epsilon.max(seconds)
        }
    };
    seconds_to(start).min(seconds_to(end))
}
