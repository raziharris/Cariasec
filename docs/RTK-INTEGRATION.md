# Integrasi RTK untuk CARIASEC

Disediakan pada 13 Oktober 2026. Integrasi ini hanya untuk pembangunan setempat; tiada perubahan kod aplikasi, deploy, commit atau push dilakukan.

Nota release: ayat di atas merekodkan skop task RTK asal. Selepas user mengarahkan push/deploy untuk release UI, fail konfigurasi pembangunan RTK turut dimasukkan dalam GitHub commit `d5fa327`. Binary RTK kekal pada komputer pembangunan dan tidak dipasang ke Tencent. Standing release workflow baharu direkodkan dalam AGENTS.md; arahan khusus no-push/no-deploy tetap diutamakan.

## Pemasangan dan persekitaran

- Root: `C:\Users\User\Desktop\Cariasec`; Git branch `main` menjejak `origin/main`. Worktree bersih sebelum integrasi.
- Shell: Windows PowerShell 5.1, Windows x64.
- RTK: **0.50.0**, dipasang melalui `winget install --id rtk-ai.rtk --exact --source winget --scope user`. Hash installer disahkan oleh winget. Pemasangan untuk pengguna semasa, tanpa hak administrator.
- Binary: `C:\Users\User\AppData\Local\Microsoft\WinGet\Packages\rtk-ai.rtk_Microsoft.Winget.Source_8wekyb3d8bbwe\rtk.exe`.
- Codex bundled CLI: `0.162.0-alpha.17.2`; extension VS Code: `openai.chatgpt` `26.51007.21434`. `codex features list` menunjukkan `hooks` stable dan enabled.
- Stack sebenar: React, TypeScript, Vite, Phaser, Node.js, Colyseus, SQLite; deployment Docker/Nginx juga mempunyai konfigurasi dalam repo. Tiada executable Docker dalam PATH sesi pemeriksaan, dan tiada pemasangan Docker dibuat.

Winget menambah direktori binary ke **User PATH**. Sesi terminal/VS Code yang sudah terbuka belum semestinya mendapat PATH baharu. Tutup dan buka semula VS Code; kemudian sahkan `rtk --version`. Sesi semasa diuji menggunakan binary mutlak atau tambahan PATH untuk proses ujian sahaja.

## Konfigurasi projek

`rtk init --codex --dry-run` disokong dan diperiksa sebelum `rtk init --codex` dijalankan. Tiada AGENTS.md atau konfigurasi `.codex` sedia ada dalam projek sebelum pemasangan. Fail arahan global Codex yang kosong dan konfigurasi global sedia ada tidak diubah.

| Fail dicipta | Tujuan |
| --- | --- |
| `AGENTS.md` | Arahan pembangunan projek, rujukan RTK, fallback Windows, serta keperluan output penuh untuk debugging/deployment. |
| `RTK.md` | Arahan ringkas menggunakan penapis yang telah disemak, pemulihan output dan batasan Windows. Teks generik RTK disesuaikan supaya output ringkas tidak dianggap sentiasa lengkap. |
| `.codex/hooks.json` | Satu `PreToolUse` matcher `Bash`. Command asal RTK dikekalkan; `commandWindows` menggunakan guard projek, dengan timeout 5 saat. |
| `.codex/rtk-hook.cjs` | Guard Windows menggunakan Node sedia ada; hanya arahan rutin tunggal dihantar kepada processor rasmi `rtk hook codex`. |
| `docs/RTK-INTEGRATION.md` | Laporan, command yang sesuai dan cara menyahaktifkan integrasi. |

Guard menerima Git status/diff/log, rg, TypeScript dan npm run build/test/test:e2e. Ia membiarkan alias PowerShell ls/tree, command `.cmd`, git push, skrip deployment, command berkumpulan/substitution/redirection dan command lain menggunakan kaedah asal. JSON rosak, binary tidak ditemui atau processor gagal juga meneruskan command asal. Ia tidak menjalankan command pembangunan sendiri dan tidak menukar aturan approval/sandbox Codex.

Tiada hook global, dependency npm baharu, konfigurasi sandbox tambahan, custom TOML filter atau perkhidmatan AI diperkenalkan. Tracking/recall tempatan RTK menggunakan defaultnya; `rtk config` menunjukkan telemetry disabled. Data analitik berada di direktori pengguna RTK, bukan database permainan.

## Status hook Codex

Processor rasmi dan guard projek diuji melalui input JSON `PreToolUse` sebenar dari segi skema. Contohnya, `git status` menghasilkan `permissionDecision: allow` dan `updatedInput.command: rtk git status`. Empat rewrite dan lapan passthrough diuji dengan hasil yang dijangka. Hook JSON sah, script Node sah, dan hanya satu pendaftaran RTK wujud. Dry-run init semula tidak menambah hook pendua.

**Auto-rewrite dalam sesi VS Code belum dibuktikan.** Pemasangan/protocol test tidak sama dengan callback sebenar extension. Codex memerlukan restart/sesi baharu dan trust untuk definisi hook semasa. Ikut prompt review/trust yang dipaparkan oleh Codex; CLI menyediakan `/hooks` untuk review. Jangan gunakan bypass trust sebagai tetapan harian. Ubah hook kemudian memerlukan review semula.

Selepas restart/trust, minta Codex menjalankan `git status`. Output `* main...origin/main` yang ringkas dan peningkatan rekod `rtk gain -p --history` membuktikan command melalui RTK jika Codex asalnya mengeluarkan command `git status`. Sehingga itu, gunakan command RTK secara eksplisit. Fallback ini sudah berfungsi dalam pemeriksaan semasa.

## Command yang sesuai

| Kerja | Command | Status semakan |
| --- | --- | --- |
| Git harian | `rtk git status`, `rtk git diff`, `rtk git log -n 5` | Status dijalankan; rewrite diff disahkan. Diff penuh menggunakan `rtk proxy git diff`. |
| React/Phaser/Colyseus: cari kod | `rtk rg -n 'AudioContext' frontend/src/audio` | Dijalankan dan hasil sepadan dengan kod. Carian pendek mungkin tiada penjimatan. |
| TypeScript | `rtk tsc --noEmit` | Lulus, tiada error. |
| Node/Colyseus tests | `rtk npm test` | 28 lulus, 0 gagal; kiraan dan amaran SQLite dikekalkan. |
| Build | `rtk npm run build` | Syntax wrapper tersedia; build tidak diperlukan/dijalankan untuk perubahan konfigurasi ini. |
| Playwright | `rtk playwright test` | Syntax tersedia; E2E tidak dijalankan semula kerana gameplay/UI tidak berubah. |
| Directory PowerShell | `Get-ChildItem frontend/src` | Gunakan asal. `rtk ls` gagal kerana GNU ls tiada dalam PATH; `rtk tree` menggunakan flags yang native Windows tree tidak faham (malah memulangkan exit 0). Kedua-duanya dikecualikan daripada hook Windows. |
| Dev server/log multiplayer | `npm.cmd run dev` dan command log asal | Gunakan output penuh bagi state bilik, reconnect dan kegagalan runtime. |
| Docker jika tersedia kemudian | `rtk docker ps`, `rtk docker images` | Subcommand disahkan melalui help sahaja; tiada runtime Docker diuji. |
| Deployment/security/root cause | Command asal atau `rtk proxy <command> <arguments>` | Output penuh; jangan optimakan maklumat kritikal. |

`npm.cmd test` dan `npx.cmd tsc --noEmit` tidak auto-rewrite dalam RTK ini. Bare `npm test` juga tidak rewrite; `npm run test` menghasilkan `rtk npm run test`. Jangan ubah npm scripts hanya untuk mendapatkan compression. Tiada script lint dalam package.json, jadi tiada lint/dependency baharu dikonfigurasi.

`rtk test npm.cmd test` boleh dijalankan, tetapi generic filter tidak memahami format Node runner projek ini dengan baik dan hanya memberi lima baris akhir. Gunakan **`rtk npm test`** untuk mengekalkan diagnosis. Untuk penapis yang membekalkan hash recovery, gunakan `rtk recall <hash> --full`, atau jalankan `rtk proxy npm.cmd test`. Ambil diagnostics penuh apabila command gagal sebelum membuat pembetulan.

## Pengesahan dan analitik

- `rtk --version`: 0.50.0.
- Git status dan carian kod melalui RTK: lulus.
- `rtk tsc --noEmit`: exit 0, tiada error.
- `rtk npm test` dan `rtk proxy npm.cmd test`: kedua-duanya 28 lulus, 0 gagal.
- Fixture kegagalan sementara dalam `tmp/rtk-check`: exit 1 dikekalkan. `rtk recall 9cba3b797506 --full` memulihkan nama test, assertion, expected/actual dan stack penuh. Fixture sengaja gagal untuk menyemak pemulihan; ia bukan kegagalan aplikasi dan telah dibuang selepas pemeriksaan.
- Dua belas kes hook: empat rewrite (git status, git diff, npm run test, npx tsc) dan lapan passthrough lulus.
- `git diff --name-only` kosong untuk fail aplikasi yang dijejak; semua perubahan integrasi ialah fail pembangunan baharu.

Snapshot percubaan awal `rtk gain -p --format json`: 8 command direkodkan; kira-kira **907 token output dijimatkan**, dengan nisbah **36.6%** yang dilaporkan RTK. Sample termasuk output penuh untuk perbandingan, fixture gagal dan percubaan tree yang tidak sesuai; ini bukan benchmark penjimatan harian. `rtk test npm.cmd test` mencatat anggaran penjimatan terbesar (650 token) tetapi tidak dipilih sebagai workflow kerana terlalu sedikit diagnostics. Data masih terlalu sedikit untuk ramalan kos atau penggunaan jangka panjang.

```powershell
rtk gain -p
rtk gain -p --daily
rtk gain -p --history
rtk gain -p --format json
rtk gain --recalls
rtk discover
```

Command analitik di atas disokong. Summary, daily, history, JSON dan discover telah diperiksa. `discover` versi ini membaca sejarah **Claude Code**, bukan sejarah Codex; ia mendapati 0 sesi. Ia tidak membuktikan bahawa semua command Codex sudah dioptimumkan. `gain` merekodkan command yang benar-benar melalui RTK.

RTK menganggarkan token daripada saiz output, bukan tokenizer tepat. Ia mengurangkan **command-output tokens** sahaja; ia tidak mengurangkan setiap bahagian konteks Codex, bil API atau penggunaan langganan ChatGPT secara langsung.

## Restart dan nyahaktif

1. Tutup/buka semula VS Code supaya User PATH baharu digunakan.
2. Mulakan sesi Codex baharu dalam CARIASEC dan review/trust hook apabila diminta. Jika extension tidak memuatkan hook, terus gunakan arahan eksplisit dalam AGENTS.md/RTK.md.
3. Untuk uninstall konfigurasi projek, preview `rtk init --codex --uninstall --dry-run`, kemudian jalankan `rtk init --codex --uninstall`. Ini menyingkirkan pendaftaran RTK, RTK.md dan rujukan @RTK.md sambil mengekalkan arahan projek lain. Guard `.codex/rtk-hook.cjs` yang sudah tidak digunakan boleh dibuang selepas itu. Jangan hapus keseluruhan direktori .codex jika konfigurasi lain ditambah kemudian.
4. Untuk menyahpasang binary pengguna: `winget uninstall --id rtk-ai.rtk --exact`; kemudian restart terminal. Rekod analitik tempatan tidak perlu dipadam untuk menyahaktifkan hook.

Jangan jalankan init semula tanpa preview: ia akan mengganti RTK.md yang sudah disesuaikan ini. Tiada commit/push/deployment dibuat untuk integrasi ini.

## Rujukan rasmi

- [RTK repository dan pemasangan Windows](https://github.com/rtk-ai/rtk).
- [RTK 0.50.0: Codex processor/init](https://github.com/rtk-ai/rtk/blob/v0.50.0/hooks/codex/README.md).
- [RTK 0.50.0: configuration/recall](https://github.com/rtk-ai/rtk/blob/v0.50.0/docs/guide/getting-started/configuration.md).
- [Official OpenAI documentation: hooks, Windows override, trust dan tool coverage](https://learn.chatgpt.com/docs/hooks).
