# Analisis sumber CARIASEC

Sumber berautoriti: `KAD CARIASEC LATEST.1pdf.pdf`, 110 halaman. Fail asal tidak diubah. SHA-256 dan pengelasan setiap halaman terdapat dalam `pdf-manifest.json`. `pdf-extraction.json` menyimpan teks asal setiap halaman, termasuk versi bahasa Inggeris.

Kesemua 110 halaman telah diekstrak dan diperiksa secara visual dalam empat helaian hubungan. Teks kad kerjaya disemak terhadap teks halaman, termasuk tajuk yang merentasi dua baris. Ilustrasi dipotong daripada kawasan imej kad asal; tiada kerjaya atau ilustrasi baharu dicipta.

| Kategori | Kad kerjaya (halaman) | Bilangan | Rujukan personaliti BM | Rujukan kerjaya BM |
|---|---|---:|---:|---:|
| R · Realistik | Jurutera (20), Tukang Masak (22), Mekanik (24), Tukang Kebun (26), Buruh (28), Atlet (30) | 6 | 16 | 17 |
| I · Investigatif | Peguam (33), Ahli Sains (35), Pengatur Cara (37), Ahli Farmasi (39), Pakar Bedah (41), Pakar Psikiatri (43) | 6 | 31 | 45 |
| A · Artistik | Penyanyi (49), Pelukis (51), Ahli Muzik (53), Penari (55), Pelakon (57), Pereka Grafik (59) | 6 | 47 | 61 |
| S · Sosial | Guru (65), Jururawat (67), Pramugari (69), Kaunselor (71), Pelayan Restoran (73), Setiausaha Pejabat (75) | 6 | 64 | 77 |
| E · Enterprising | Ejen Jualan (81), Ahli Politik (83), Ketua Eksekutif (85), Pemandu Pelancong (87), Kurator (89), Penilai Hartanah (91) | 6 | 79 | 94 |
| C · Konvensional | Penganalisis Kewangan (97), Akauntan (99), Penasihat (101), Pustakawan (103), Juruwang (105), Operator (107) | 6 | 96 | 110 |

Klasifikasi halaman lengkap:

- 36 kad kerjaya individu, satu salinan setiap kad dalam dek digital.
- 42 halaman belakang kad berulang; bukan kad tambahan.
- 6 kad cabaran lakonan pada halaman 1, 3, 5, 7, 9, 11.
- 26 halaman pembelajaran: dua ringkasan enam personaliti, 12 personaliti dwibahasa dan 12 senarai kerjaya dwibahasa.
- Tiada halaman peraturan permainan, arahan agihan, mata atau kumpulan keluarga yang perlu dilengkapkan.

Senarai kerjaya rujukan mengandungi lebih banyak kerjaya daripada kad individu. Kerjaya dalam senarai itu **tidak** dijadikan kad tambahan. Pengelasan seperti Peguam dalam Investigatif dan Setiausaha Pejabat dalam Sosial dikekalkan seperti PDF. `Enterprising` dikekalkan sebagai nama kategori asal; peranan BM ialah “Pengusaha”.

## Struktur kandungan

`shared/cards.json`: ID stabil R1–C6, kategori, tajuk BM, `description: null` (kad individu tidak menyediakan huraian kerjaya), teks asal, laluan ilustrasi dan fail/halaman sumber.

`shared/categories.json`: nama kategori, peranan, penerangan personaliti BM yang dinormalkan dari segi huruf besar dan tanda baca, teks personaliti asal, teks senarai kerjaya asal, cabaran dan rujukan halaman. Penerangan pada paparan butiran kad dinyatakan sebagai penerangan **keluarga**, bukannya huraian tugas kerjaya yang tidak terdapat dalam PDF.

Cabaran lakonan digunakan dalam halaman pembelajaran sahaja, tanpa pemarkahan automatik. Permainan kad tidak boleh mengesahkan lakonan melalui pelayar; tiada skor cabaran rekaan.

## Kebolehulangan

```powershell
python -m pip install pymupdf
python scripts/extract_pdf.py
```

Gunakan Python sebenar pada PATH, atau laluan pemasangan Python setempat. Skrip membaca PDF sahaja, menghasilkan 36 WebP dalam `public/cards`, dataset JSON dan manifes. Semak hash sumber selepas pengekstrakan. Tiada kebergantungan Python diperlukan ketika aplikasi berjalan.

## Adaptasi digital

Enam kad bagi setiap kategori membolehkan keluarga lengkap berukuran enam. Peraturan dalam [GAME-RULES.md](GAME-RULES.md) merupakan cadangan digital yang telah dilaksanakan, bukan peraturan yang diambil daripada PDF.
