fn main() {
    napi_build::setup();
    for variable in [
        "OPENLEGEND_NATIVE_SOURCE_SHA256",
        "OPENLEGEND_NATIVE_FEATURES",
    ] {
        println!("cargo:rerun-if-env-changed={variable}");
        if let Ok(value) = std::env::var(variable) {
            println!("cargo:rustc-env={variable}={value}");
        }
    }
    for (key, variable) in [
        ("OPENLEGEND_TARGET", "TARGET"),
        ("OPENLEGEND_PROFILE", "PROFILE"),
    ] {
        if let Ok(value) = std::env::var(variable) {
            println!("cargo:rustc-env={key}={value}");
        }
    }
    let rustc = std::env::var_os("RUSTC").unwrap_or_else(|| "rustc".into());
    let version = std::process::Command::new(rustc)
        .arg("--version")
        .output()
        .expect("the selected Rust compiler must identify its build");
    assert!(
        version.status.success(),
        "the selected Rust compiler did not identify its build"
    );
    let version = String::from_utf8(version.stdout).expect("Rust compiler version must be UTF-8");
    println!("cargo:rustc-env=OPENLEGEND_RUST_VERSION={}", version.trim());
    println!("cargo:rerun-if-env-changed=CARGO_ENCODED_RUSTFLAGS");
    if let Ok(flags) = std::env::var("CARGO_ENCODED_RUSTFLAGS") {
        println!(
            "cargo:rustc-env=OPENLEGEND_RUST_FLAGS={}",
            flags.replace('\u{1f}', " ")
        );
    }
}
