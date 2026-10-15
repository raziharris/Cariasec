# Julat gaji kerjaya CARIASEC

Data untuk kesemua 36 kad berada dalam [`shared/salaries.json`](../shared/salaries.json). Nilai ialah **RM sebulan di Malaysia**, disemak pada 11 Oktober 2026. Ini anggaran pendidikan, bukan janji gaji, purata nasional bagi setiap kerjaya, atau sebahagian daripada aturan permainan. Lokasi, pengalaman, sektor, jenis kontrak dan elaun boleh mengubah pendapatan sebenar.

Setiap rekod menyimpan `source` dan `match` untuk semakan dalaman. Sumber tidak dipaparkan pada UI permainan. Untuk WageIndicator, julat majoriti pekerja digunakan melainkan `match` menyebut *tahap kemasukan*. Untuk Indeed, julat rendah–tinggi yang dilaporkan digunakan. Jika had bawah Indeed kurang daripada gaji minimum bulanan RM1,700, UI menunjukkan RM1,700 dan nilai asal disimpan sebagai `reportedMin`; ini pelarasan persembahan bagi contoh pekerjaan sepenuh masa, bukan dakwaan bahawa data Indeed bermula pada RM1,700. [Rujukan gaji minimum](https://wageindicator.org/ms-my/bekerja-di-malaysia/gaji-minimum/).

Beberapa padanan memerlukan tafsiran:

- **R1 Jurutera** menggunakan jurutera awam sebagai contoh cabang kejuruteraan.
- **R5 Buruh, R6 Atlet, E4 Pemandu Pelancong, E6 Penilai Hartanah, C3 Penasihat** menggunakan julat tahap kemasukan bagi pekerjaan yang paling hampir. Kad C3 tidak menyatakan bidang penasihat, jadi data menggunakan penasihat kerjaya sebagai contoh, bukan penasihat kewangan.
- **I6 Pakar Psikiatri** menggunakan julat satu iklan kerja Jobstore (RM10,000–25,000), bukan taburan seluruh pasaran. Julat Indeed untuk pekerjaan ini tidak konsisten dan tidak digunakan.
- **A2 Pelukis** menggunakan kategori *artist* yang lebih luas; pendapatan bebas boleh berubah besar.
- **E2 Ahli Politik** ialah **contoh elaun Ahli Parlimen**, bukan gaji purata semua ahli politik. RM25,700 ialah elaun tetap dan RM40,000 ialah anggaran maksimum bersama elaun/tuntutan yang layak menurut [kenyataan PMO melalui Bernama](https://www.bernama.com/en/news.php?id=2401366).
- **E3 Ketua Eksekutif** menggunakan julat satu iklan kerja [Randstad](https://www.randstad.com.my/jobs/chief-executive-officer_kuala-lumpur_47463471/) untuk CEO syarikat tersenarai (RM20,000–30,000), bukan taburan seluruh pasaran. Nilai sebenar sangat bergantung pada saiz organisasi.

Julat daripada laman sumber boleh berubah. Semak semula sebelum menggunakan data ini untuk keputusan kerjaya atau tawaran kerja sebenar.

## Pecahan Junior, Senior dan Pengurusan (15 Oktober 2026)

`shared/salary-levels.json` menambah pecahan tahap tanpa mengubah angka atau pautan rujukan asal dalam `shared/salaries.json`. Penyedia sumber bagi setiap kad dikekalkan; halaman jawatan berkaitan daripada penyedia yang sama dibenarkan. Semua angka baharu ialah RM sebulan. `source`, `basis`, nama jawatan BM/English dan tarikh semakan disimpan bagi setiap pecahan. UI mengekalkan rujukan asal dan memaparkan tahap sebagai baris ringkas; pautan sumber kekal dalam dataset.

- **WageIndicator:** `entry` ialah julat tahap kemasukan. `fiveYears` ialah julat selepas lima tahun pengalaman, dipaparkan di bawah Senior dengan penjelasan bahawa ini bukan gred jawatan rasmi. Julat bertindih atau maksimum yang lebih rendah tidak diubah untuk mencipta tangga kenaikan gaji.
- **Indeed:** `role` menggunakan julat rendah–tinggi bagi jawatan yang dinamakan, bukan membahagikan julat asal atau mendarab purata. Nama jawatan dipaparkan kerana sesetengah padanan ialah cabang berkaitan (contohnya jurutera perisian junior, sous chef, pengarah seni, penyelia pengeluaran). Pelarasan persembahan RM1,700 yang sedia ada diteruskan, dengan had bawah asal dalam `reportedMin`.
- **Contoh iklan:** Senior ahli farmasi ialah iklan Alpro di Miri (RM8,000–10,000); guru junior ialah iklan tadika Dripping Colours Montessori di Rawang (RM1,700–2,500). CEO menggunakan iklan Randstad asal (RM20,000–30,000) sebagai Pengurusan. UI melabelkan setiap contoh sebagai satu iklan, bukan julat seluruh pasaran.
- **Tiada data:** nilai `null` bermakna tiada julat tahap yang berjaya disahkan daripada penyedia berkenaan. Ia tidak bermaksud pekerjaan itu tiada tahap senior. Pengurusan hanya muncul jika ada julat dan padanan jawatan yang disahkan. Ahli politik dan CEO tidak dipaksa menjadi jawatan Junior/Senior; paparan menggunakan “Tidak berkenaan”.
- **Data ditolak:** halaman Indeed Senior Librarian mencampurkan jumlah sekitar RM51,521 sebagai bulanan dan tahunan pada halaman sama. Ia tidak diterbitkan. Halaman Head of School yang meragukan juga tidak digunakan; pengurusan guru menggunakan School Principal.

Pecahan tersedia bagi 27 kad. Sembilan kad tanpa julat tahap yang disahkan ialah Tukang Kebun, Pakar Bedah, Pakar Psikiatri, Penari, Pelakon, Pramugari, Ahli Politik, Pustakawan dan Juruwang. Julat rujukan asal bagi kad ini masih dipaparkan. Bagi kad lain, sesetengah tahap masih tiada data. Iklan Jobstore pakar psikiatri kekal sebagai rujukan asal sahaja kerana tidak menetapkan tahap senioriti.

Semakan: `npm.cmd test`, `npm.cmd run build`, dan `node scripts/verify-careers.mjs` (tetapkan `LIVE_URL` untuk produksi). Skrip browser memeriksa angka/tahap semua 36 kad dalam dua bahasa, ketiadaan baris pengurusan yang tidak disahkan, serta dialog pada 320/375/390/430px dalam Chromium dan WebKit.
