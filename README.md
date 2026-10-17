# CARIASEC: RENTAK

Gameplay semasa ialah Rentak: padanan kad, aksi dan habiskan tangan. Lihat [peraturan, seni bina dan pelepasan Rentak](docs/RENTAK.md). Kandungan koleksi keluarga di bawah ialah dokumentasi versi terdahulu; ia bukan peraturan permainan aktif.

---

# CARIASEC

GitHub: https://github.com/raziharris/Cariasec

Permainan kad pendidikan berbilang pemain dalam Bahasa Melayu dan English. React + TypeScript + Vite untuk laman, lobi dan menu; Phaser untuk papan permainan 2D; Express + Colyseus dan SQLite WAL untuk permainan masa nyata. 36 kad kerjaya dan ilustrasinya diekstrak daripada PDF asal, dengan enam keluarga RIASEC.

## Jalankan setempat

Prasyarat: Node.js **24 LTS** (sekurang-kurangnya 24.13), npm. Pada PowerShell gunakan `npm.cmd` jika execution policy menyekat `npm.ps1`.

```powershell
npm.cmd ci
Copy-Item .env.example .env
npm.cmd run dev
```

Buka **http://127.0.0.1:5173**. Cipta bilik dalam pelayar pertama, kemudian sertai dengan pelayar/profil/incognito berasingan. Tekan “Saya bersedia” pada kedua-duanya, dan hos tekan “Mulakan permainan”. Tiada bot atau data pemain palsu.

`.env` lalai membenarkan origin `http://127.0.0.1:5173`; gunakan URL ini, bukan `localhost`, melainkan origin turut ditukar. Sesi disimpan per tab. Muat semula tab yang sama untuk sambung semula. Untuk peranti luar, ikut panduan deployment HTTPS.

## Build dan semakan

```powershell
npm.cmd run build
npm.cmd test
npx.cmd playwright install chromium
npm.cmd run test:e2e
node scripts/verify-production.mjs
$env:PLAYERS='8'
npm.cmd run test:load
```

Ulang `PLAYERS` dengan `20`, `40`, `100`. Skrip ujian E2E menggunakan pelayan dev sedia ada atau memulakannya. Pada Linux, gantikan `npm.cmd` dengan `npm` dan tetapkan arahan `webServer.command` Playwright secara platform automatik (lihat konfigurasi).

Preview production tanpa Docker: jalankan build, tetapkan `NODE_ENV=production`, `PUBLIC_ORIGIN=http://127.0.0.1:3001`, kemudian `npm.cmd start`. Backend menyajikan aset `dist/public`. Tetapan dev origin perlu ditukar semula apabila kembali ke Vite. Produksi sebenar menyajikan aset melalui Nginx.

Database diwujudkan dan dimigrasi secara automatik di `data/cariasec.sqlite`. Sandaran: `npm.cmd run db:backup -- data/backups/backup-baharu.sqlite`. Jangan menerbitkan direktori data atau PDF asal.

## Dokumen

- [Analisis PDF dan pengiraan kad](docs/PDF-ANALYSIS.md)
- [Peraturan yang dilaksanakan](docs/GAME-RULES.md)
- [Seni bina, keselamatan, pemulihan](docs/ARCHITECTURE.md)
- [Deployment Tencent, TLS, backup dan rollback](docs/DEPLOYMENT.md)
- [Keputusan ujian dan batasan](docs/VERIFICATION.md)
- [Sound Kit integration and audio checks](docs/SOUND-SYSTEM.md)
- `docs/pdf-extraction.json`: teks semua 110 halaman.
- `docs/pdf-manifest.json`: hash PDF dan pengelasan semua halaman.
- `docs/load-results`: laporan sebenar, bukan kapasiti yang dijanjikan.

PDF asal tidak diubah dan tidak diperlukan untuk menjalankan aplikasi. Ia diperlukan hanya untuk mengulangi pengekstrakan. Semua penerangan kad dan keluarga datang daripada sumber itu; mekanik permainan merupakan adaptasi yang didokumenkan.

Status semasa: aplikasi diterbitkan di **http://43.156.11.241/Cariasec/** melalui Nginx dan PM2 pada Tencent. Build, 26 ujian enjin/rangkaian, 6 ujian browser, production bundle smoke test dan beban Colyseus 8 pemain telah dijalankan. Ujian langsung dua browser, sambungan WebSocket, refresh sesi, Bahasa Melayu/English dan viewport 320/375/390/430px turut lulus. Lihat laporan pengesahan untuk keputusan dan batasan terperinci.


Pakej pemindahan sumber (Windows): `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/package-release.ps1 -ReleaseName cariasec-source-baharu`. Arkib dan manifest SHA-256 disimpan dalam `output/`; kandungan runtime peribadi dikecualikan.
