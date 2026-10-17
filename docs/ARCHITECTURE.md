# CARIASEC: RENTAK

Gameplay semasa ialah Rentak: padanan kad, aksi dan habiskan tangan. Lihat [peraturan, seni bina dan pelepasan Rentak](RENTAK.md). Kandungan koleksi keluarga di bawah ialah dokumentasi versi terdahulu; ia bukan peraturan permainan aktif.

---

# Seni bina dan operasi

## Komponen

- `frontend/src/main.tsx`: navigasi React yang mengekalkan laman utama, bilik, lobi, menu, keputusan, klien Colyseus dan paparan sambungan. Phaser dimuat secara malas hanya apabila pusingan bermula.
- `frontend/src/components/PhaserBoard.tsx`, `frontend/src/game`: jambatan React-Phaser berasaskan event bus seperti templat rasmi Phaser React TypeScript. `CardTableScene` memiliki meja interaktif, lawan, dek, kad tangan, agihan, flip dan kesan visual; React kekal memiliki kawalan borang yang boleh diakses. Snapshot Colyseus ialah satu-satunya sumber keadaan permainan.
- `frontend/src/pages`: laman utama, pembelajaran dan arahan. `components/Card.tsx` dan `cards/presentation.ts`: templat kad dan identiti visual.
- `frontend/src/styles.css`: tema meja hijau/krim, enam identiti warna, kad responsif, skrin 320px ke atas, reduced motion.
- `shared/game.ts`: jenis data, katalog kad dan kontrak acara; `shared/schemas.ts`: skema Zod yang digunakan pelayan. Frontend mengimport jenis sahaja supaya kod validasi pelayan tidak membesarkan bundle. Semua ID pemain ditentukan pelayan.
- `backend/src/game/engine.ts`: mesin permainan tanpa rangkaian/pangkalan data; semua tindakan sah, keluarga, giliran, masa, pemenang dan invariant 36 kad.
- `backend/src/server.ts`: Express, Colyseus, bilik terasing, rate limit, pemulihan, penamatan, pembersihan dan unjuran peribadi.
- `backend/src/database/store.ts`: SQLite, migrasi v1 idempotent, transaksi dan WAL.

Satu proses Node, satu SQLite, satu Nginx kontena untuk aset statik; Nginx hos mengurus domain dan TLS supaya konfigurasi laman sedia ada tidak perlu diganti. Setiap kod permainan ialah `roomId` Colyseus tersendiri. Backend tidak diterbitkan kepada hos. Nginx kontena hanya terikat pada loopback hos.

## Kontrak rangkaian

Matchmaking Colyseus mengendalikan `create`, `join` dan `resume`. Selepas masuk bilik, mesej request/reply `command` menerima discriminated union: `ready`, `start`, `request`, `draw`, `leave`, `again`. Pelayan membalas `{ok, error?}`; request `session` memberikan kelayakan sesi hanya kepada pemilik, dan `sync` mengembalikan paparan terkini.

`state` ialah unjuran penuh yang diperibadikan untuk setiap pemain dan dihantar selepas setiap mutasi. React meneruskannya ke Phaser melalui `EventBus`; Phaser tidak mengubah aturan, tangan, dek atau skor secara setempat. Tangan lawan tidak pernah hadir. Log terhad kepada 24 entri. `removed` membersihkan sesi klien apabila keluar, luput atau diganti tab lain. Klien Colyseus cuba menyambung semula secara automatik; pelayan menyimpan tempat pemain selama 90 saat dan memerlukan token reconnect Colyseus serta token sesi CARIASEC.

Permintaan kad membawa `version` dan UUID `actionId`. Pelayan menolak versi lapuk, giliran salah, token tidak sah, kad dimiliki, keluarga yang tiada dalam tangan, sasaran sendiri, bilik tidak aktif dan pendua (200 ID terakhir). Versi bilik juga melindungi terhadap perlumbaan/ulang selepas jendela deduplikasi. Shuffle/dek/tangan/skor tidak diterima daripada klien.

## Data dan pemulihan

SQLite menyimpan snapshot JSON berstruktur untuk setiap bilik. Ia merangkumi keahlian, tangan, dek, keluarga, giliran, log, tarikh akhir, konfigurasi, status dan **hash SHA-256 token**; token raw 256 bit hanya berada pada klien di `sessionStorage`. Tiada akaun atau kata laluan pengguna.

Jadual `migrations` menandakan versi 1. Jadual `rooms` ialah keadaan semasa. Jadual `results` menyimpan keputusan tanpa token atau urutan dek, menggunakan kod bilik dan masa penciptaan pusingan sebagai kunci. Keputusan lama 30 hari dipadam ketika startup. WAL + `synchronous=FULL`; setiap mutasi disimpan dalam transaksi sebelum patch dihantar. Mutasi permainan menggunakan salinan bilik supaya penolakan input tidak mengubah keadaan aktif.

Semasa proses bermula semula, bilik belum luput dipulihkan. Semua pemain ditandakan terputus dengan jendela 90 saat baharu; token asal diperlukan. Selepas semua kembali, masa giliran penuh diberikan. Jika pemadaman berlangsung lebih dua jam, bilik luput. Backup yang dipulihkan mengembalikan keadaan setakat masa backup sahaja. Keahlian tersambung tidak dianggap kekal selepas restart.

Migrasi berlaku ketika startup (`CREATE TABLE IF NOT EXISTS`, rekod versi), bukan arahan SQL manual berasingan. Semak jadual `migrations` apabila memperkenalkan migrasi seterusnya; jangan mengubah format snapshot tanpa strategi naik taraf.

## Perlindungan dan had

- Nama 2–20 aksara, hanya huruf Unicode, nombor, ruang, `.`, `_`, `-`; React mengescape teks.
- Kod enam aksara rawak kriptografi; bilik persendirian untuk sesi santai, bukan mekanisme kawalan akses berisiko tinggi.
- Token 32 bait rawak; digest dalam SQLite, satu socket aktif setiap identiti. Jangan log token atau salin fail SQLite ke direktori awam.
- Origin tunggal melalui `PUBLIC_ORIGIN`; handshake browser dari origin lain ditolak. Klien bukan browser tanpa Origin masih perlu token sah untuk menyambung identiti sedia ada.
- Payload WebSocket maksimum 8 KiB; 20 mesej/saat pada lapisan Colyseus dan 35 tindakan/10 saat per pemain; 120 cubaan create/join seminit per alamat sambungan. Laluan HTTP API 120/minit.
- Apabila di belakang proksi, alamat sambungan backend ialah alamat proksi. Had cipta/sertai 120/minit dikongsi untuk proksi ini; resume sah hanya menggunakan validasi token agar sambungan semula serentak tidak menggunakan kuota bilik baharu. Sesuai untuk permulaan kecil dan perlu diukur sebelum pelancaran kelas serentak yang lebih besar. Header `X-Forwarded-For` tidak dipercayai secara membuta tuli.
- Maksimum 200 bilik dan enam pemain permainan bagi setiap bilik. Colyseus membenarkan tempat tambahan sementara untuk penggantian sambungan, tetapi enjin tetap menolak pemain ketujuh. Had ini bukan jaminan kapasiti.
- Helmet, CSP pada Nginx, no-new-privileges, backend tanpa capability, filesystem kontena read-only kecuali volume dan tmpfs, heap Node 320 MiB, kontena backend 512 MiB dan Nginx 128 MiB.
- Tiada Redis, akaun awan atau maklumat peribadi selain nama panggilan.

## Prestasi

Kad WebP dipotong daripada PDF; PDF 62 MB tidak disertakan dalam image atau frontend. Fon Latin disajikan setempat. Motion hanya pada perubahan yang diterima pelayan; peristiwa pemindahan/ambilan dipaparkan daripada log, tangan masuk/keluar dianimasikan menurut snapshot sebenar. Tiada animasi menunjukkan identiti kad ambilan lawan. Browser tanpa pilihan gerakan menerima animasi ringan; reduced motion mematikannya.

SQLite synchronous memberi konsistensi yang mudah disemak tetapi turut menyekat event loop ketika menulis. Ujian beban mengukur kesannya. Belum ada jaminan kapasiti, ujian tahan lama, anti-DDoS peringkat edge atau kluster multi-proses. Jangan menambah worker Node selari kepada reka bentuk ini.
