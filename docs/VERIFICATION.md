# Keputusan pengesahan

Pengesahan awal: **9 Oktober 2026**. Migrasi Colyseus dan pelepasan Tencent: **11 Oktober 2026**, Asia/Kuala_Lumpur. Persekitaran setempat: Windows, Node **24.13.0**, Chromium **156** melalui Playwright. Persekitaran produksi: Tencent Ubuntu, Node **24.18.0**, Nginx dan PM2.

## Lulus dan dilaksanakan

| Semakan | Bukti sebenar |
|---|---|
| Sumber PDF | Semua 110 halaman diekstrak dan diperiksa melalui helaian visual; 36 kad unik, 6 setiap kategori; 42 belakang, 6 cabaran, 26 halaman pembelajaran. Hash sumber akhir sepadan dengan manifes. |
| TypeScript dan build | `npm run build` berjaya. Bundle frontend sekitar 573 kB / 182 kB gzip, backend sekitar 50 kB sebelum dependency luaran. 36 ilustrasi WebP berjumlah 261,580 bait. |
| Enjin + Colyseus | `npm test`: **26 ujian lulus**, tiada gagal atau dilangkau. Termasuk laluan asas tersuai `/Cariasec`, WebSocket pada laluan itu, dan 300 permainan rawak penuh dengan invariant 36 kad selepas setiap tindakan. |
| Browser hujung ke hujung | `npm run test:e2e`: **6 ujian lulus**, kira-kira 1.3 minit pada larian akhir. |
| Pemulihan | Integrasi Colyseus membuktikan tangan dan identiti dikekalkan selepas putus/sambung dan restart daripada SQLite. Token raw tidak terdapat dalam snapshot database. |
| Sandaran | `npm run db:backup -- tmp/verified-backup.sqlite` dilaksanakan ketika backend berjalan; SQLite backup API dan `PRAGMA integrity_check` berjaya. |
| Production bundle | `node scripts/verify-production.mjs` menjalankan `dist/server.js` dan aset binaan; dua browser mencipta/sertai/mula/meminta kad, menerima tindakan sama dan memulihkan tangan selepas refresh. HTTP health 200, CSP hadir, tiada page error atau request gagal. Laporan `production-smoke.json`. |
| Dependency audit | `npm audit --omit=dev`: 0 kerentanan dilaporkan pada tarikh ujian. Ini bukan audit keselamatan menyeluruh. |
| Tencent langsung | `http://43.156.11.241/Cariasec/`: health 200; dua context browser cipta/sertai bilik, bersedia, mula, masing-masing menerima tujuh kad, dan refresh memulihkan tangan. Tiga sambungan bilik Colyseus di bawah `/Cariasec/{processId}/{roomId}` menerima 23 frame. Bahasa Melayu/English, semua 36 aset kad dan viewport 320/375/390/430px lulus tanpa page error/request gagal. Laporan `tencent-live-smoke.json`. |

Ujian enjin merangkumi agihan 2–6 pemain, validasi hos/kesediaan, pemilikan, giliran, versi lapuk, permintaan haram, pendua, pemindahan, ambilan tepat/tidak tepat, keluarga lengkap, skor, tamat semula jadi, had tindakan, pemecah seri/kemenangan bersama, timbunan kosong, giliran pemain kosong, ambilan apabila tiada sasaran, masa tamat, pause dan privasi.

Ujian Colyseus menggunakan SDK dan WebSocket sebenar, bukan mock. Ia meliputi bilik terasing, sinkronisasi, akses tanpa keahlian, token tidak sah, private projection, reconnect, restart, pembersihan lobi/bilik, pembatalan selepas timeout, pemindahan hos, input rosak, had bilik, nama pendua, origin asing dan rate limit.

Tiga suite Playwright:

1. **Dua pemain sepanjang pusingan:** cipta/sertai, kedua-dua lobi, bersedia, agihan, refresh, offline/online, tindakan bergilir sampai keputusan, skor/pemenang sama pada kedua-dua browser dan main semula. Context pelayar berasingan mengasingkan storan setiap pemain. Tiada ralat JavaScript.
2. **Responsif:** laman utama, pembelajaran, cipta/sertai dan papan pada lebar **320, 375, 390, 430px**; tiada overflow halaman, permintaan kad sebenar berjaya. Screenshot disimpan dalam `docs/screenshots`.
3. **Enam pemain + kebolehcapaian:** enam browser contexts menyertai dan memulakan permainan, lima kad setiap tangan; semakan axe WCAG 2 A/AA + 2.1 AA pada utama, pembelajaran, arahan, dialog, lobi dan papan tiada pelanggaran automatik yang dikesan. Fokus dialog, Escape dan pemulangan fokus diuji. Semua kategori pembelajaran boleh ditukar ketika bilik aktif.

Screenshot utama dan papan 320px serta enam pemain diperiksa secara visual, termasuk hasil pembetulan clipping hero dan kontras. Imbasan automatik tidak menggantikan ujian pembaca skrin/manual WCAG lengkap.

## Ujian beban sebenar

Satu backend Node dalam proses berasingan, dijalankan melalui `tsx`, SQLite WAL pada cakera, dua klien WebSocket setiap bilik, satu pusingan sebenar sehingga maksimum 60 tindakan. Penjana beban berjalan pada komputer Windows yang sama. Semakan browser/build lain turut berjalan pada mesin itu; CPU/RAM jadual ialah **proses backend sahaja**, bukan seluruh sistem atau Nginx/TLS. Baris 8 pemain diulang selepas migrasi Colyseus; baris 20/40/100 ialah garis dasar pelepasan sebelumnya dan perlu diulang sebelum membuat perbandingan kapasiti Colyseus.

| Pemain | Bilik tamat | Tempoh (s) | Latency p95 (ms) | Latency p99 (ms) | RSS puncak (MiB) | CPU purata / puncak (% satu teras) | Putus tidak dijangka / gagal |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 8 | 4/4 | 25.62 | 7.93 | 9.15 | 143.59 | 3.53 / 21.26 | 0 / 0 |
| 20 | 10/10 | 25.53 | 8.70 | 13.75 | 105.87 | 2.79 / 15.62 | 0 / 0 |
| 40 | 20/20 | 25.52 | 13.23 | 25.44 | 111.99 | 5.27 / 36.76 | 0 / 0 |
| 100 | 50/50 | 26.22 | 22.59 | 72.94 | 144.70 | 16.99 / 59.40 | 0 / 0 |

Pada 100 pemain, 3,167 command diukur dan 2,916 semakan konsistensi selepas permintaan berjaya. Semua 50 bilik mencapai keputusan yang sama pada kedua-dua klien. Latency maksimum 118.99 ms. JSON asal: `docs/load-results/{8,20,40,100}-players.json`.

Peningkatan latency pada 100 pemain menyokong keperluan mengukur disk SQLite dan event-loop pada VPS sebenar; belum ada bukti yang memerlukan Redis, worker tambahan atau naik taraf pelayan. Ujian singkat ini **tidak** menetapkan kapasiti serentak yang dijamin, prestasi WAN atau penggunaan RAM ketika build Docker.

## Disediakan tetapi belum disahkan pada runtime sasaran

- Dockerfile berbilang peringkat, Compose, volume SQLite, had memori/CPU, healthcheck, restart policy, filesystem read-only dan backend tidak didedahkan.
- Nginx kontena untuk aset, konfigurasi HTTP/HTTPS hos, proxy WebSocket, langkah Let's Encrypt/renewal dan rollback.
- Panduan Ubuntu 24.04, DNS, Tencent security group, backup dan pemulihan volume.

**Docker Engine/WSL tidak tersedia pada mesin ini.** Compose CLI mudah alih tersedia untuk validasi konfigurasi sahaja. `docker compose build/up`, healthcheck kontena, `nginx -t` pada Linux sasaran dan pemulihan backup melalui volume Docker belum dilaksanakan. Pengujian bundle produksi setempat bukan pengganti ujian kontena.

Produksi Tencent pada alamat IP telah disahkan melalui HTTP/WS. HTTPS/WSS dengan sijil sah dan peranti fizikal pada rangkaian berlainan masih belum diuji.

## Batasan yang diketahui

- Satu proses backend sahaja; tiada failover atau penskalaan mendatar. Semua bilik dijeda selepas restart dan mesti disambung semula dalam 90 saat.
- Rate limit cipta/sertai bilik menggunakan alamat sambungan sebenar; di belakang Nginx, had 120 cubaan/minit dikongsi oleh proksi. Resume berkelayakan token sah tidak menggunakan kuota cipta/sertai, tetapi tetap tertakluk kepada validasi token dan had 35 acara/10 saat bagi socket.
- `node:sqlite` mengeluarkan amaran eksperimental pada Node 24.13.0 yang digunakan. Versi Node dikunci kepada major 24; naik taraf perlu melalui ujian.
- Chromium desktop dan viewport mudah alih diuji; Safari/iPhone fizikal, Firefox, pembaca skrin dan ujian tahan lama belum diuji.
- Animasi berdasarkan peristiwa/tangan sebenar: dek, kad masuk, pemindahan awam, giliran, keluarga dan keputusan. Ia bukan simulasi fizik kad atau penyegerakan bingkai tepat antara peranti.
- PDF tidak mengandungi peraturan. Semua mekanik digital, masa dan pemecah seri ialah cadangan yang telah dilaksanakan dalam `GAME-RULES.md`.
- Cabaran lakonan ialah pembelajaran pilihan tanpa skor automatik. Skor permainan bukan penilaian personaliti pemain.


## Semakan pelepasan tambahan ? 10 Oktober 2026

- **Compose v5.6.0:** binari rasmi disemak SHA-256 terhadap fail checksum keluaran rasmi. `docker-compose --env-file .env.example config --quiet` berjaya. Tiada Docker Engine digunakan, maka keputusan ini hanya validasi model konfigurasi.
- **Nginx 1.30.5 Windows:** ketiga-tiga templat Nginx diuji bersama dengan `nginx -t`. Laluan fail, alamat upstream dan port ditukar kepada loopback untuk ujian; sijil sehari self-signed hanya dalam `tmp/proxy-check`.
- **HTTPS/WSS setempat (garis dasar sebelum migrasi Colyseus):** dua browser bermain melalui proksi TLS hos ? proksi aset ? backend binaan. Refresh memulihkan tangan, tiada page error/request gagal, 22 frame WebSocket selamat diterima. Laporan sejarah `proxy-smoke.json`. Browser menerima sijil self-signed hanya dalam context ujian. Ini bukan pengesahan sijil awam atau WAN.
- **Pembetulan DNS kontena:** Nginx kini resolve alamat backend melalui resolver Docker pada runtime, supaya penciptaan semula kontena tidak mengekalkan IP upstream lama. Mekanik DNS Docker sebenar masih memerlukan ujian kontena.
- **Pembetulan reconnect:** resume dengan token sah tidak menggunakan kuota admission cipta/sertai. Reconnect automatik SDK dibenarkan serta-merta supaya gangguan selepas refresh juga pulih. Ujian memenuhi kuota IP dengan cubaan sertai, membuktikan penciptaan baharu ditolak tetapi pemilik sah masih boleh menyambung semula. Kesemua **26 ujian enjin/Colyseus lulus** selepas perubahan laluan Tencent.
- **Arkib sumber:** `scripts/package-release.ps1` menyediakan ZIP melalui allowlist; mengesahkan fail penting, 36 aset kad dan ketiadaan `.env`, sesi SQLite, PDF asal, sijil, dependency atau alat muat turun. Manifest SHA-256 disertakan.

Perkara yang masih memerlukan semakan tambahan: lifecycle Compose/volume (produksi semasa menggunakan PM2), DNS dalaman Docker selepas recreate, Let's Encrypt/HTTPS, peranti pada rangkaian berasingan dan ujian prestasi khusus VPS.
