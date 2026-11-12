# Birthday Quest

Game birthday berbasis Next.js yang bisa dimainkan di desktop maupun mobile.

## Menjalankan di komputer

Pastikan Node.js 20+ dan npm sudah terpasang, lalu jalankan dari folder proyek:

```bash
npm install
npm run dev
```

Buka `http://localhost:3000` di browser.

Untuk mode production:

```bash
npm run build
npm run start
```

## Membuka di HP

Komputer dan HP harus berada di Wi-Fi yang sama. Jalankan server agar bisa diakses dari jaringan lokal:

```bash
npm run dev -- --hostname 0.0.0.0
```

Cari alamat IPv4 komputer dengan `ipconfig`, lalu buka `http://ALAMAT-IP:3000` dari HP. Contoh: `http://192.168.1.10:3000`.

Di mobile:

- **Starlight Trail** dan **Birthday Room** memakai joystick virtual dan tombol aksi.
- **Gift Cascade** bisa dimainkan dengan joystick atau menggeser basket langsung.
- **Balloon Fiesta** dimainkan dengan mengetuk balon.
- **Cake Ceremony** memakai tombol sentuh pada lilin dan tombol **BLOW**.

Jika HP tidak bisa terhubung, izinkan Node.js melewati Windows Firewall pada jaringan Private.
