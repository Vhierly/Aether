//! Regression guard for the public Lua archive shape served by the MOED
//! source: `{appid}.lua`, the pinned `.manifest` files, and a junk `.txt` the
//! provider adds. The extractor must pick `{appid}.lua` and ignore everything
//! that is neither Lua nor a manifest.
//!
//! Fixture captured from a live response for AppID 2929250.

use crate::manifest::package::ManifestPackageExtractor;
use crate::manifest::pins::LuaManifestPins;

const ARCHIVE_APP_ID: u32 = 2929250;

fn live_archive_bytes() -> &'static [u8] {
    include_bytes!("fixtures/moed_lua_2929250.zip")
}

#[test]
fn live_lua_archive_yields_the_appid_lua_and_its_manifests() {
    let package = ManifestPackageExtractor::from_zip(ARCHIVE_APP_ID, live_archive_bytes())
        .expect("the live MOED archive must parse");

    assert!(
        package.lua_content.contains("setManifestid"),
        "the pinned Lua must be extracted"
    );
    // The archive pins two depots, but 228989 is a Steam system depot and is
    // deliberately filtered out, so only the game depot reaches the installer.
    assert_eq!(
        LuaManifestPins::rows_from_content(&package.lua_content).len(),
        1,
        "the Steam system depot must be filtered out"
    );

    let names: Vec<&str> = package
        .manifest_files
        .iter()
        .map(|file| file.file_name.as_str())
        .collect();
    assert!(
        names.contains(&"228989_5753583882400741046.manifest"),
        "expected the pinned manifests, got {:?}",
        names
    );
    assert!(
        !names.iter().any(|name| name.ends_with(".txt")),
        "provider junk files must not become manifests"
    );
}

#[test]
fn live_lua_archive_reaches_the_same_result_through_the_provider_entrypoint() {
    let package =
        ManifestPackageExtractor::from_provider_bytes(ARCHIVE_APP_ID, live_archive_bytes())
            .expect("the provider entrypoint must accept the live archive");
    assert!(package.lua_content.contains("setManifestid"));
}
