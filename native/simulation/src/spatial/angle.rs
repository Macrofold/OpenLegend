//! The proof's Node 22 fdlibm evaluation, rather than the host C library.
//! Recorded headings enter observation signatures and retained byte charges;
//! a one-ULP spatial tolerance cannot cover those serialized differences.
//!
//! The selected ARM Node binary contracts multiply/add operations. The x64
//! proof target retains unfused evaluation, pending AWS qualification. Qualify
//! this primitive against the actual Node binary before public installation.
//!
//! Adapted from Node v22.23.2 deps/v8/src/base/ieee754.cc (atan and atan2).
//! Original fdlibm and V8 notices are retained in ../../../fdlibm-NOTICE.txt.

const HIGH: [f64; 4] = [
    4.63647609000806093515e-1,
    7.85398163397448278999e-1,
    9.82793723247329054082e-1,
    1.57079632679489655800,
];
const LOW: [f64; 4] = [
    2.26987774529616870924e-17,
    3.06161699786838301793e-17,
    1.39033110312309984516e-17,
    6.12323399573676603587e-17,
];
const COEFFICIENT: [f64; 11] = [
    3.33333333333329318027e-1,
    -1.99999999998764832476e-1,
    1.42857142725034663711e-1,
    -1.11111104054623557880e-1,
    9.09088713343650656196e-2,
    -7.69187620504482999495e-2,
    6.66107313738753120669e-2,
    -5.83357013379057348645e-2,
    4.97687799461593236017e-2,
    -3.65315727442169155270e-2,
    1.62858201153657823623e-2,
];

#[inline]
fn multiply_add(a: f64, b: f64, c: f64) -> f64 {
    #[cfg(target_arch = "aarch64")]
    {
        a.mul_add(b, c)
    }
    #[cfg(not(target_arch = "aarch64"))]
    {
        a * b + c
    }
}

fn atan(mut x: f64) -> f64 {
    let negative = x.is_sign_negative();
    let high = ((x.to_bits() >> 32) as u32) & 0x7fff_ffff;
    if high >= 0x4410_0000 {
        return if x.is_nan() {
            x + x
        } else {
            HIGH[3].copysign(x)
        };
    }
    let id = if high < 0x3fdc_0000 {
        if high < 0x3e40_0000 {
            return x;
        }
        None
    } else {
        x = x.abs();
        Some(if high < 0x3ff3_0000 {
            if high < 0x3fe6_0000 {
                x = multiply_add(2.0, x, -1.0) / (2.0 + x);
                0
            } else {
                x = (x - 1.0) / (x + 1.0);
                1
            }
        } else if high < 0x4003_8000 {
            x = (x - 1.5) / multiply_add(1.5, x, 1.0);
            2
        } else {
            x = -1.0 / x;
            3
        })
    };
    let z = x * x;
    let w = z * z;
    let mut odd = COEFFICIENT[10];
    for i in [8, 6, 4, 2, 0] {
        odd = multiply_add(w, odd, COEFFICIENT[i]);
    }
    let mut even = COEFFICIENT[9];
    for i in [7, 5, 3, 1] {
        even = multiply_add(w, even, COEFFICIENT[i]);
    }
    let sum = z * odd + w * even;
    match id {
        None => multiply_add(-x, sum, x),
        Some(id) => {
            let result = HIGH[id] - (multiply_add(x, sum, -LOW[id]) - x);
            if negative { -result } else { result }
        }
    }
}

pub(crate) fn atan2(y: f64, x: f64) -> f64 {
    use std::f64::consts::{FRAC_PI_2, FRAC_PI_4, PI};
    const PI_LOW: f64 = 1.2246467991473531772e-16;
    if x.is_nan() || y.is_nan() {
        return x + y;
    }
    if x == 1.0 {
        return atan(y);
    }
    let mut quadrant = u8::from(y.is_sign_negative()) | (u8::from(x.is_sign_negative()) << 1);
    if y == 0.0 {
        return match quadrant {
            0 | 1 => y,
            2 => PI,
            _ => -PI,
        };
    }
    if x == 0.0 {
        return FRAC_PI_2.copysign(y);
    }
    if x.is_infinite() {
        return if y.is_infinite() {
            match quadrant {
                0 => FRAC_PI_4,
                1 => -FRAC_PI_4,
                2 => 3.0 * FRAC_PI_4,
                _ => -3.0 * FRAC_PI_4,
            }
        } else {
            match quadrant {
                0 => 0.0,
                1 => -0.0,
                2 => PI,
                _ => -PI,
            }
        };
    }
    if y.is_infinite() {
        return FRAC_PI_2.copysign(y);
    }
    let high_x = ((x.to_bits() >> 32) as i32) & 0x7fff_ffff;
    let high_y = ((y.to_bits() >> 32) as i32) & 0x7fff_ffff;
    let ratio_exponent = (high_y - high_x) >> 20;
    let z = if ratio_exponent > 60 {
        quadrant &= 1;
        FRAC_PI_2 + 0.5 * PI_LOW
    } else if x.is_sign_negative() && ratio_exponent < -60 {
        0.0
    } else {
        atan((y / x).abs())
    };
    match quadrant {
        0 => z,
        1 => -z,
        2 => PI - (z - PI_LOW),
        _ => (z - PI_LOW) - PI,
    }
}
