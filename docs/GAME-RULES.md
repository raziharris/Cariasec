# Peraturan digital CARIASEC

Semua mekanik di bawah ialah adaptasi digital yang dicadangkan. PDF hanya menyediakan kandungan pendidikan dan cabaran lakonan, bukan peraturan permainan.

1. **Pemain:** 2–6 pemain dalam bilik persendirian berkod enam aksara. Hos memilih masa giliran 30, 60 atau 90 saat dan had 60, 120 atau 180 tindakan. Semua pemain mesti tersambung dan bersedia sebelum hos mula.
2. **Dek:** 36 kad kerjaya unik, enam setiap RIASEC. Cabaran dan halaman rujukan bukan sebahagian daripada dek.
3. **Agihan:** dua pemain mendapat tujuh kad seorang; 3–6 pemain mendapat lima kad seorang. Pelayan mengocok dengan Fisher–Yates dan `crypto.randomInt`. Baki menjadi timbunan ambilan tertutup. Hos mendapat giliran pertama; giliran mengikut susunan penyertaan.
4. **Permintaan:** pemain semasa memilih seorang pemain lain yang mempunyai kad dan satu kad khusus yang belum dimiliki. Peminta mesti memiliki sekurang-kurangnya satu kad daripada keluarga tersebut. Identiti kad yang diminta diketahui semua pemain.
5. **Berjaya:** pelayan memindahkan kad yang diminta secara automatik. Peminta meneruskan giliran dengan masa baharu.
6. **Gagal:** peminta mengambil kad teratas jika timbunan masih ada. Hanya peminta melihat kad itu. Jika kad ambilan ialah kad yang diminta, peminta meneruskan giliran; selainnya giliran berpindah. Jika timbunan kosong, terus tukar giliran.
7. **Keluarga lengkap:** enam kad unik kategori yang sama terus disimpan sebagai satu keluarga, dikeluarkan daripada tangan dan diberi satu mata. Pemain lain melihat kategori keluarga lengkap itu.
8. **Tangan kosong:** pada permulaan giliran, pemain mengambil satu kad jika timbunan masih ada. Jika timbunan kosong, pemain tanpa kad dilangkau. Mereka masih mengekalkan mata keluarga. Jika semua rakan tiada kad, pemain semasa boleh tekan ?Ambil kad? untuk mengambil satu kad dan terus menukar giliran. Tindakan ini hanya dibenarkan apabila tiada sasaran yang mempunyai kad.
9. **Masa tamat:** pelayan mengambil satu kad untuk pemain jika ada dan menukar giliran. Kad ambilan tidak diumumkan kepada orang lain. Peraturan keluarga lengkap masih diperiksa.
10. **Had pusingan:** satu permintaan atau satu tamat masa dikira sebagai satu tindakan. Pusingan tamat apabila keenam-enam keluarga lengkap atau had tindakan dicapai. Had ini mengelakkan kitaran permintaan berulang tanpa kemajuan.
11. **Pemenang:** keluarga terbanyak menang. Jika sama, jumlah kad dalam tangan tertinggi menjadi pemecah seri; jika masih sama, kemenangan dikongsi. Tiada “keluarga separa” diberi mata. Dalam tamat semula jadi, semua tangan kosong dan skor seri dikongsi.
12. **Sambungan:** permainan dijeda apabila pemain dikesan terputus. Setiap pemain mendapat 90 saat dari masa pelayan mengesan putus untuk kembali dengan token sesi. Selepas semua kembali, pemain semasa mendapat tempoh giliran penuh. Henti rangkaian mungkin mengambil satu kitaran heartbeat WebSocket untuk dikesan.
13. **Tidak kembali atau keluar:** pusingan dibatalkan tanpa pemenang jika seseorang tidak kembali dalam 90 saat atau meninggalkan permainan. Kad tidak diagihkan semula kepada pemain yang tinggal. Hos yang keluar digantikan oleh pemain tersambung. Pemain tersambung boleh membuka lobi baharu melalui hos.
14. **Lobi dan bilik:** pemain lobi yang tidak kembali dikeluarkan selepas 90 saat; hos dipindahkan mengikut susunan pemain. Bilik tanpa perubahan selama dua jam dipadam. Bilik kosong dipadam. Semua masa diukur di pelayan.
15. **Main lagi:** hos membuka semula lobi; hanya pemain yang tersambung dikekalkan, semua kad/mata/kesediaan direset. Tiada mula automatik.
16. **Cabaran:** lakonan daripada PDF ialah aktiviti pembelajaran pilihan bersama rakan, tanpa pengesahan atau mata permainan.

Permainan ini meneroka kandungan kerjaya. Keputusan menang/kalah atau kad yang dikumpulkan tidak ditafsir sebagai keputusan ujian personaliti.
