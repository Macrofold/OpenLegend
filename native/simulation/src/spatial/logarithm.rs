//! Node 22's fdlibm logarithm evaluation for saved numeric observations.
//! Adapted from Node v22.23.2 deps/v8/src/base/ieee754.cc (log and log10).
//! The original notices are retained in ../../../fdlibm-NOTICE.txt.

// Preserve the exact fdlibm split coefficients and source evaluation: replacing
// these literals with standard constants can change serialized observations.
#![allow(clippy::approx_constant, clippy::excessive_precision)]

use super::angle::multiply_add;

fn with_high(value: f64, high: u32) -> f64 {
    f64::from_bits((u64::from(high) << 32) | (value.to_bits() & 0xffff_ffff))
}

fn log(mut value: f64) -> f64 {
    const LN2_HIGH: f64 = 6.93147180369123816490e-01;
    const LN2_LOW: f64 = 1.90821492927058770002e-10;
    const COEFFICIENTS: [f64; 7] = [
        6.666666666666735130e-01,
        3.999999999940941908e-01,
        2.857142874366239149e-01,
        2.222219843214978396e-01,
        1.818357216161805012e-01,
        1.531383769920937332e-01,
        1.479819860511658591e-01,
    ];
    let mut high = (value.to_bits() >> 32) as u32 as i32;
    let low = value.to_bits() as u32;
    let mut exponent = 0_i32;
    if high < 0x0010_0000 {
        if (high as u32 & 0x7fff_ffff) | low == 0 {
            return f64::NEG_INFINITY;
        }
        if high < 0 {
            return f64::NAN;
        }
        exponent -= 54;
        value *= 1.80143985094819840000e+16;
        high = (value.to_bits() >> 32) as u32 as i32;
    }
    if high >= 0x7ff0_0000 {
        return value + value;
    }
    exponent += (high >> 20) - 1023;
    high &= 0x000f_ffff;
    let normalization = (high + 0x95f64) & 0x0010_0000;
    value = with_high(value, (high | (normalization ^ 0x3ff0_0000)) as u32);
    exponent += normalization >> 20;
    let fraction = value - 1.0;
    let exponent = f64::from(exponent);
    if (0x000f_ffff & (2 + high)) < 3 {
        if fraction == 0.0 {
            return if exponent == 0.0 {
                0.0
            } else {
                multiply_add(exponent, LN2_HIGH, exponent * LN2_LOW)
            };
        }
        let remainder = fraction * fraction * multiply_add(-0.33333333333333333, fraction, 0.5);
        return if exponent == 0.0 {
            fraction - remainder
        } else {
            multiply_add(
                exponent,
                LN2_HIGH,
                -((multiply_add(-exponent, LN2_LOW, remainder)) - fraction),
            )
        };
    }
    let reduced = fraction / (2.0 + fraction);
    let squared = reduced * reduced;
    let fourth = squared * squared;
    let even = fourth
        * multiply_add(
            fourth,
            multiply_add(fourth, COEFFICIENTS[5], COEFFICIENTS[3]),
            COEFFICIENTS[1],
        );
    let odd = squared
        * multiply_add(
            fourth,
            multiply_add(
                fourth,
                multiply_add(fourth, COEFFICIENTS[6], COEFFICIENTS[4]),
                COEFFICIENTS[2],
            ),
            COEFFICIENTS[0],
        );
    let remainder = odd + even;
    if ((high - 0x6147a) | (0x6b851 - high)) > 0 {
        let half_square = 0.5 * fraction * fraction;
        if exponent == 0.0 {
            fraction - multiply_add(-reduced, half_square + remainder, half_square)
        } else {
            multiply_add(
                exponent,
                LN2_HIGH,
                -(half_square
                    - multiply_add(reduced, half_square + remainder, exponent * LN2_LOW)
                    - fraction),
            )
        }
    } else if exponent == 0.0 {
        multiply_add(-reduced, fraction - remainder, fraction)
    } else {
        multiply_add(
            exponent,
            LN2_HIGH,
            -(multiply_add(reduced, fraction - remainder, -exponent * LN2_LOW) - fraction),
        )
    }
}

pub(crate) fn log10(mut value: f64) -> f64 {
    const INVERSE_LN10: f64 = 4.34294481903251816668e-01;
    const LOG10_2_HIGH: f64 = 3.01029995663611771306e-01;
    const LOG10_2_LOW: f64 = 3.69423907715893078616e-13;
    let mut high = (value.to_bits() >> 32) as u32 as i32;
    let mut low = value.to_bits() as u32;
    let mut exponent = 0_i32;
    if high < 0x0010_0000 {
        if (high as u32 & 0x7fff_ffff) | low == 0 {
            return f64::NEG_INFINITY;
        }
        if high < 0 {
            return f64::NAN;
        }
        exponent -= 54;
        value *= 1.80143985094819840000e+16;
        high = (value.to_bits() >> 32) as u32 as i32;
        low = value.to_bits() as u32;
    }
    if high >= 0x7ff0_0000 {
        return value + value;
    }
    if high == 0x3ff0_0000 && low == 0 {
        return 0.0;
    }
    exponent += (high >> 20) - 1023;
    let negative_exponent = i32::from(exponent < 0);
    high = (high & 0x000f_ffff) | ((0x3ff - negative_exponent) << 20);
    let exponent = f64::from(exponent + negative_exponent);
    value = f64::from_bits((u64::from(high as u32) << 32) | u64::from(low));
    let remainder = multiply_add(exponent, LOG10_2_LOW, INVERSE_LN10 * log(value));
    multiply_add(exponent, LOG10_2_HIGH, remainder)
}
