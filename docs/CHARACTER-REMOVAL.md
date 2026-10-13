# Character selection removal

The character picker and its five SVG character assets have been removed from onboarding, Settings, the lobby, results and the Phaser board. Player names and neutral initials identify players instead. Career card illustrations remain unchanged.

The frontend profile and create/join commands no longer send character metadata. Public views no longer expose it. Older localStorage profiles and older command payloads remain compatible: unknown character metadata is ignored, while names, language, sound preferences and reduced-motion settings remain intact. No database migration or gameplay-rule changes are needed.

The socket regression checks legacy metadata and authenticated player identity recovery. Browser and Tencent verification scripts check character controls are absent and neutral initials remain synchronized between two players. Sound, card animations, collection progress and motion settings are retained.

Production build/typecheck, all 29 unit/socket tests, all 13 Chromium browser regressions and the local production multiplayer smoke test passed. Browser coverage includes character controls being absent, neutral initials, complete rounds, reconnect/rematch, mobile layouts and real audio playback. Physical iPhone/Safari and speakers are not tested.

Release verification results will be recorded after the guarded Tencent deployment. The earlier `UI-UPGRADE.md` documents the original release before this removal.
