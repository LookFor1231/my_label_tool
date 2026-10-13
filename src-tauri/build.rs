fn main() {
    tauri_build::build();
    // Tauri mock-app tests link TaskDialogIndirect too, but the normal app resource
    // manifest is only attached to binary targets. Embed the v6 dependency for
    // library test harnesses as well; otherwise Windows fails before tests start.
    if std::env::var("CARGO_CFG_TARGET_OS").as_deref() == Ok("windows")
        && std::env::var("CARGO_CFG_TARGET_ENV").as_deref() == Ok("msvc")
    {
        println!("cargo:rustc-link-arg=/MANIFEST:EMBED");
        println!("cargo:rustc-link-arg=/MANIFESTDEPENDENCY:type='win32' name='Microsoft.Windows.Common-Controls' version='6.0.0.0' processorArchitecture='*' publicKeyToken='6595b64144ccf1df' language='*'");
        // Binary targets already receive Tauri's application manifest in resource.lib.
        println!("cargo:rustc-link-arg-bins=/MANIFEST:NO");
    }
}
