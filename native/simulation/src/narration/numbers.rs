//! Source language/numbers.ts display precision. Decimal half expansion follows
//! the shortest ECMAScript number text, rather than multiplying a binary float
//! (which would turn values such as 1.005 into a different display decision).
pub(crate) fn display_number(value: f64, integer: bool) -> Result<String, serde_json::Error> {
    let digits = if integer { 0 } else { 2 };
    let value = if value.abs() < 0.5 * 10f64.powi(-(digits as i32)) {
        0.0
    } else {
        value
    };
    let text = crate::encoding::json_record(&value.abs())?;
    let (mantissa, exponent) = text
        .split_once('e')
        .map_or((text.as_str(), 0), |(mantissa, exponent)| {
            (mantissa, exponent.parse::<i32>().unwrap_or(0))
        });
    let decimal = mantissa.find('.').unwrap_or(mantissa.len()) as i32 + exponent;
    let raw: Vec<u8> = mantissa.bytes().filter(|byte| *byte != b'.').collect();
    let end = (decimal + digits as i32).max(0) as usize;
    let mut number = Vec::with_capacity((decimal.max(1) as usize) + digits + 1);
    // At least one integer digit is kept. Fractional leading zeros are part of
    // the decimal position, not significant digits in the source string.
    let integer_digits = decimal.max(1) as usize;
    for place in 0..integer_digits + digits {
        let offset = place as i32 + decimal - integer_digits as i32;
        number.push(if offset < 0 {
            b'0'
        } else {
            raw.get(offset as usize).copied().unwrap_or(b'0')
        });
    }
    let next = if decimal + (digits as i32) < 0 {
        b'0'
    } else {
        raw.get(end).copied().unwrap_or(b'0')
    };
    if next >= b'5' {
        let mut at = number.len();
        loop {
            if at == 0 {
                number.insert(0, b'1');
                break;
            }
            at -= 1;
            if number[at] < b'9' {
                number[at] += 1;
                break;
            }
            number[at] = b'0';
        }
    }
    let mut result = String::with_capacity(number.len() + 2);
    if value < 0.0 && number.iter().any(|byte| *byte != b'0') {
        result.push('-');
    }
    let split = number.len() - digits;
    for byte in &number[..split] {
        result.push(*byte as char);
    }
    if digits > 0 {
        while number.last() == Some(&b'0') && number.len() > split {
            number.pop();
        }
        if number.len() > split {
            result.push('.');
            for byte in &number[split..] {
                result.push(*byte as char);
            }
        }
    }
    Ok(result)
}
