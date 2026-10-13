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
