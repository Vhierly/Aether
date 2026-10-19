# AetherDesk

AetherDesk is a desktop tool for managing Steam game manifests and Lua scripts, with built-in DRM detection and compatibility labeling.

## Features

- Manage Steam manifests and Lua files per game
- **Denuvo detection** — automatically labels games that ship Denuvo Anti-Tamper (via Steam's `drm_notice`)
- **UCO2 compatibility** — labels games supported by UCOnline2, combining on-disk detection with a community compatibility list
- Steamless integration for removing DRM from supported titles
- UCOnline2 integration
- Library + store browsing with search and filters

## How to use AetherDesk

1. Don't have any other lua tools installed inside Steam
2. Download the latest release of AetherDesk
3. Open the app and install AetherDLL from inside it
4. Scan your Steam library — Denuvo and UCO2 badges appear on game cards automatically

## Build from source

```bash
npm install
npm run tauri build
```

Requires: Node.js, Rust (stable), and the Visual Studio C++ Build Tools (Windows).

## Credits

Original project by [michelegoku3](https://github.com/michelegoku3/Aether). Fork maintained by [Vhierly](https://github.com/Vhierly).