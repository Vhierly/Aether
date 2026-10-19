# AetherDesk (Vhierly Fork)

AetherDesk is a Windows desktop tool for browsing the Steam store, managing game manifests and Lua scripts, and labeling DRM/crack/online-compatibility status on your library. This fork focuses on **store experience and DRM detection accuracy**.

## What's different from upstream

| Area | This fork | Upstream ([michelegoku3](https://github.com/michelegoku3/Aether)) |
|------|-----------|-------------------------------------------------------------------|
| Store pagination | Numbered windowed pages (`1 2 3 4 5 … 12`) with unreachable pages disabled | Basic Prev/Next |
| DRM labels | Reads Steam DRM from `drm_notice`, labels empty as "Steam DRM", PCGamingWiki fallback, isitcracked crack status | Earlier DRM logic |
| Store badges | Combined pipe-separated tag: `UCO2 \| Cracked \| Denuvo` | Separate badges |
| Library | Denuvo + UCO2 badges on game cards | Same |
| Family share | Cosmetic family-share labels on game cards | Cosmetic family-share labels |
| Online | OFME+UCO2 conflict handling, cross-drive fixes | OFME+UCO2 conflict handling, cross-drive fixes |

## Features

- **Store browsing** — search Steam, filter by genre/sort/storefront, auto-loads trending content as you page
- **DRM detection** — Denuvo Anti-Tamper via Steam's `drm_notice`, Steam DRM labeling, PCGamingWiki fallback, isitcracked crack status
- **UCO2 compatibility** — labels games supported by UCOnline2 (on-disk detection + community list)
- **Steamless integration** — remove Steam DRM from supported titles
- **Online multiplayer** — UCO2 / Online Aether mode with per-game toggle
- **Library management** — scan Steam library, per-game manifest/Lua install, badges on cards
- **Settings** — themes, presence injection, Steam diversion mode, HTTP allowlist

## How to use AetherDesk

1. Don't have any other lua tools installed inside Steam
2. Download the latest release from this fork
3. Open the app and install AetherDLL from inside it
4. Scan your Steam library — Denuvo and UCO2 badges appear on game cards automatically
5. Browse the store, filter by genre/sort, and download manifests for any game

## Build from source

```bash
npm install
npm run tauri build
```

Requires: Node.js, Rust (stable), and the Visual Studio C++ Build Tools (Windows).

Or run the full build script (tests + lint + portable ZIP):

```
build_desk.cmd
```

## Credits

Original project by [michelegoku3](https://github.com/michelegoku3/Aether). Fork maintained by [Vhierly](https://github.com/Vhierly).

## Files

.github/workflows/, AetherDLL/, AetherDesk/, Licenses/, Tools/, docs/, .gitattributes, .gitignore, README.md, build_desk.cmd, build_dll.cmd
