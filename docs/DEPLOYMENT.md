# Penyediaan Tencent Cloud Ubuntu

Sasaran: Ubuntu **24.04 LTS**, 2 vCPU / 2 GB, satu proses backend. Domain, IP, akaun SSH dan akses Tencent belum diberikan; panduan ini menyediakan konfigurasi, bukan bukti deployment sebenar. Docker/Nginx/TLS perlu disahkan pada hos sasaran sebelum menerima pemain.

Dokumentasi rujukan: [Docker Engine Ubuntu](https://docs.docker.com/engine/install/ubuntu/), [Compose plugin](https://docs.docker.com/compose/install/linux/), [Colyseus deployment](https://docs.colyseus.io/deployment/), [Node SQLite backup](https://nodejs.org/api/sqlite.html#sqlitebackupsourceDb-destination-options).

## 1. Pemeriksaan hos

Log masuk menggunakan akaun dan IP sebenar. Catat laman sedia ada dan semak responsnya sebelum dan selepas perubahan. Jangan ganti konfigurasi Nginx utama, hapus `sites-enabled` sedia ada atau hentikan kontena aplikasi lain. Semak penggunaan 80/443 dan 8088; tetapkan `WEB_PORT` dan upstream hos lain jika 8088 telah digunakan.

```bash
lsb_release -a
free -m
df -h
sudo ss -lntp
sudo nginx -T > ~/nginx-before-cariasec.txt 2>&1
```

Salinan ini mungkin mengandungi konfigurasi sensitif; lindungi failnya. Jika hos bukan Ubuntu 24.04 atau sudah mempunyai Docker/Nginx, sesuaikan pemasangan tanpa menyingkirkan pakej/laman sedia ada.

## 2. Docker Engine dan Compose rasmi

Untuk hos yang belum mempunyai Docker:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker compose version
```

Gunakan `sudo docker` seperti di bawah. Keahlian kumpulan `docker` memberi akses setara root; tidak diperlukan di sini.

## 3. Kod, konfigurasi dan build

Pindahkan projek dengan Git persendirian atau SCP/rsync ke `/opt/cariasec`, termasuk `package-lock.json`, dataset dan `public/cards`. Jangan pindahkan `node_modules`, `.env` setempat, `tmp`, laporan ujian atau PDF asal. Contoh arahan di bawah dijalankan dari `/opt/cariasec`:

```bash
cp .env.example .env
chmod 600 .env
nano .env
```

Tetapkan `PUBLIC_ORIGIN=https://game.example.com` kepada domain sebenar tanpa `/` di hujung. `WEB_PORT=8088`, `MAX_ROOMS=200`. Compose menetapkan HOST, PORT dan DATABASE_PATH kontena secara dalaman; nilai setempat dalam `.env` tidak menggantikannya.

```bash
sudo docker compose config --quiet
sudo docker compose build
sudo docker compose up -d
sudo docker compose ps
curl --fail http://127.0.0.1:8088/healthz
curl --fail http://127.0.0.1:8088/api/health
sudo docker compose exec web nginx -t
```

Build boleh menggunakan memori melebihi runtime. Pada VPS yang sudah sibuk, bina image pada mesin lain dengan seni bina CPU yang sama dan pindahkan image; jangan hentikan aplikasi jiran untuk mendapatkan RAM. Baki RAM OS/servis hos mesti dipantau, kerana had kontena tidak merangkumi proses hos atau build.

## 4. Domain, HTTP dan sijil

Tetapkan rekod DNS A domain/subdomain kepada IP awam Tencent. Tetapkan AAAA hanya jika IPv6 hos benar-benar berfungsi. Dalam kumpulan keselamatan Tencent, buka TCP 80/443 kepada pengguna; hadkan TCP 22 kepada IP pentadbir. Jangan buka 3001/8088 atau port pangkalan data kepada internet. Jika UFW digunakan, benarkan SSH pentadbir dahulu sebelum mengaktifkan firewall.

Pasang Nginx/Certbot hanya jika belum ada:

```bash
sudo apt-get install -y nginx certbot
sudo mkdir -p /var/www/certbot
sudo cp deployment/nginx/host-http.conf /etc/nginx/sites-available/cariasec-http
sudo nano /etc/nginx/sites-available/cariasec-http
```

Gantikan `game.example.com` dengan domain sebenar. Aktifkan vhost baharu sahaja:

```bash
sudo ln -s /etc/nginx/sites-available/cariasec-http /etc/nginx/sites-enabled/cariasec-http
sudo nginx -t
sudo systemctl reload nginx
sudo certbot certonly --webroot -w /var/www/certbot -d game.example.com
sudo cp deployment/nginx/host-https.conf /etc/nginx/sites-available/cariasec-https
sudo nano /etc/nginx/sites-available/cariasec-https
```

Gantikan **semua** nama domain dalam server_name dan laluan sijil, serta port upstream jika berubah. Kemudian:

```bash
sudo ln -s /etc/nginx/sites-available/cariasec-https /etc/nginx/sites-enabled/cariasec-https
sudo nginx -t
sudo systemctl reload nginx
sudo install -d /etc/letsencrypt/renewal-hooks/deploy
printf '#!/bin/sh\nnginx -t && systemctl reload nginx\n' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh >/dev/null
sudo chmod 755 /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
sudo certbot renew --dry-run
systemctl list-timers --all | grep certbot
```

Jika memasang pakej Ubuntu, pemasa Certbot mengurus pembaharuan; sahkan ia disenaraikan. Kekalkan vhost HTTP dan direktori ACME. Jangan aktifkan vhost HTTPS sebelum sijil wujud.

Tiada domain: jalankan setempat atau melalui terowong SSH untuk semakan (`ssh -L 8088:127.0.0.1:8088 ...`). Itu belum penerbitan umum HTTPS/WSS. Jangan mendakwa akses internet lengkap sebelum domain/sijil disediakan.

## 5. Pengesahan produksi

```bash
curl --fail https://game.example.com/api/health
curl -I https://game.example.com/
sudo docker compose logs --tail=100 backend web
sudo docker stats --no-stream
```

Semak juga laman sedia ada menggunakan URL yang dicatat dalam langkah 1. Dari **dua peranti pada dua rangkaian** (contoh Wi-Fi dan data mudah alih): cipta/sertai bilik, bersedia, mulakan, minta kad, perhatikan kedua-dua papan, segarkan satu tab, putus dan pulih rangkaian, tamatkan pusingan, banding skor. Periksa Network DevTools bahawa sambungan Colyseus berjaya melalui `wss://`/101. Buka halaman pembelajaran/rules dan kembali ke bilik.

HTTP 200 tidak mengesahkan permainan. Rekod bukti dua peranti secara berasingan daripada healthcheck, build dan ujian setempat.

## 6. Log, restart dan kemas kini

```bash
sudo docker compose logs -f --tail=100 backend
sudo docker compose restart backend
```

Restart menjeda sesi aktif dan memberi 90 saat untuk semua pemain kembali. Pilih masa tanpa permainan aktif. Untuk kemas kini, backup dahulu, simpan revision/image lama, pindahkan kod/lockfile baharu, kemudian:

```bash
sudo docker compose build
sudo docker compose up -d
sudo docker compose ps
curl --fail https://game.example.com/api/health
```

Semak permainan dan laman jiran semula. Jika gagal, pulihkan revision/image lama dan `compose up -d`; jangan downgrade skema database tanpa backup yang serasi. Jangan gunakan `docker compose down -v` kerana ia memadam data.

## 7. Sandaran dan pemulihan

Sandaran dalam talian menggunakan SQLite backup API, bukan menyalin fail `.sqlite` ketika WAL aktif:

```bash
sudo docker compose exec backend node dist/backup.js /app/data/cariasec-backup.sqlite
sudo docker compose cp backend:/app/data/cariasec-backup.sqlite ./cariasec-backup.sqlite
```

Pilih nama baharu setiap kali (skrip menolak overwrite). Salin keluar hos ke storan persendirian; backup mengandungi keadaan tangan dan hash sesi. Uji `PRAGMA integrity_check`. Contoh pemulihan semasa tiada permainan aktif:

```bash
sudo docker compose stop backend
sudo docker compose run --rm --no-deps --user root -v "$PWD:/backup:ro" backend node --input-type=module -e '
import {copyFileSync,rmSync,chownSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
const source="/backup/cariasec-backup.sqlite";
const check=new DatabaseSync(source,{readOnly:true});
if(check.prepare("PRAGMA integrity_check").get().integrity_check!=="ok") throw Error("Invalid backup");
check.close();
for(const suffix of ["-wal","-shm"]) rmSync("/app/data/cariasec.sqlite"+suffix,{force:true});
copyFileSync(source,"/app/data/cariasec.sqlite");
chownSync("/app/data/cariasec.sqlite",1000,1000);
'
sudo docker compose up -d backend
sudo docker compose ps
```

Ambil backup keadaan semasa **sebelum** memulihkan, walaupun ia dipercayai rosak. Pemulihan mengganti keadaan selepas masa backup; pemain mungkin kehilangan kemajuan baharu. Uji pemulihan di persekitaran berasingan terlebih dahulu.

## 8. Ujian beban

Pada mesin ujian dengan Node 24 dan `npm ci`, `PLAYERS=8 npm run test:load` (ulang 20, 40, 100). Skrip mencipta backend ujian berasingan, SQLite pada cakera, dua pemain setiap bilik, dan memainkan pusingan sebenar hingga 60 tindakan. Tidak menyentuh pelayan produksi. Hasil JSON mencatat CPU/RAM backend, latency, putus sambungan, kegagalan dan konsistensi. Untuk mengukur VPS, jalankan skrip pada staging VPS yang sama spesifikasinya; proses penjana beban berkongsi CPU jika dijalankan pada hos itu, jadi keputusan konservatif dan bukan ukuran WAN. Pantau Nginx/TLS secara berasingan dengan peranti sebenar.


## 9. Mengulangi pemeriksaan proksi setempat pada Windows

Ujian tambahan ini tidak memasang servis atau mengubah trust store Windows. Gunakan binari Nginx Windows rasmi daripada [nginx.org](https://nginx.org/en/download.html) dan OpenSSL setempat. Selepas `npm.cmd run build`:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-proxy.ps1 -NginxExe "path/to/nginx.exe" -OpenSslExe "path/to/openssl.exe"
```

Skrip memeriksa port kosong, menjana sijil sementara, menguji templat, menjalankan Nginx tersembunyi pada loopback 8081/8089/8443 dan backend ujian 3002, memainkan ujian dua browser dan menutup proses ujian. Penerimaan sijil self-signed hanya berlaku pada klien ujian setempat. Laporan ditulis ke `docs/proxy-smoke.json`.

Nginx kontena menggunakan `resolver 127.0.0.11 valid=10s` dengan upstream pemboleh ubah untuk mengelakkan IP lapuk selepas backend diganti. Selepas `docker compose up -d` di VPS, sahkan pemulihan selepas `docker compose up -d --force-recreate backend` pada staging sebelum digunakan dalam permainan aktif. Rujukan: [proxy_pass Nginx](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

## 10. Deployment Tencent semasa

Deployment aktif menggunakan PM2 pada port loopback `4194`, data SQLite kekal di `/var/lib/cariasec/cariasec.sqlite`, dan Nginx berkongsi site `/etc/nginx/sites-available/icecream`. URL awam ialah `http://43.156.11.241/Cariasec/`; API health dan laluan matchmaking/WebSocket Colyseus semuanya berada di bawah `/Cariasec/`.

Jalankan pelepasan seterusnya dari root projek:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File tencent-key/scripts/deploy-cariasec.ps1
node scripts/verify-live.mjs
```

Skrip membina frontend untuk `/Cariasec/`, memeriksa route terlindung sebelum dan selepas perubahan, memasang dependency produksi, menyimpan versi aplikasi lama, mengurus blok Nginx bertanda, menjalankan `nginx -t`, mengesahkan health dalaman dan awam, menyimpan state PM2, serta melakukan rollback apabila mana-mana langkah gagal. Jangan pindahkan kunci SSH ke arkib sumber.
