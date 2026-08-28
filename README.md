# AM Premium Generator

Website mobile-first untuk mengirim dan memverifikasi request AM Premium melalui dua serverless API di Vercel.

## Struktur

```text
.
├── index.html
├── style.css
├── app.js
├── README.md
├── vercel.json
└── api/
    ├── send.js
    └── verify.js
```

## Endpoint upstream

`api/send.js` meneruskan POST ke:

```text
https://alight-motion-premium.site.je/index.php?action=send_eceran
```

`api/verify.js` meneruskan POST ke:

```text
https://alight-motion-premium.site.je/index.php?action=verify_eceran
```

## Menjalankan lokal

Karena folder `api/` adalah Vercel Functions, jalankan dengan Vercel CLI:

```bash
npm i -g vercel
vercel dev
```

Lalu buka alamat lokal yang diberikan Vercel.

## Deploy

1. Upload project ke repository Git.
2. Import repository ke Vercel.
3. Framework preset dapat menggunakan konfigurasi default.
4. Deploy.
5. Pastikan domain/upstream yang digunakan memang dapat diakses dari server Vercel.

## Request

### POST /api/send

```json
{
  "email": "nama@email.com"
}
```

### POST /api/verify

```json
{
  "email": "nama@email.com",
  "link": "https://contoh.example/verify/..."
}
```

## Response

Sukses:

```json
{
  "success": true,
  "message": "Berhasil",
  "data": {}
}
```

Gagal:

```json
{
  "success": false,
  "message": "Terjadi kesalahan"
}
```

## Keamanan

- Tidak ada API key yang ditaruh di frontend.
- Jangan menaruh secret/token di `index.html` atau `app.js`.
- Jika upstream nantinya memerlukan credential, simpan di Vercel Environment Variables dan baca dari `process.env`.
- Frontend hanya menyimpan riwayat non-sensitif secara lokal.
- Error upstream yang sensitif tidak dikirim mentah ke browser.
- Website tidak menganggap premium aktif sebelum upstream mengonfirmasi keberhasilan.

## Catatan

Implementasi ini tidak mencoba melewati challenge/anti-bot upstream. Jika upstream menolak request server-to-server atau membutuhkan mekanisme autentikasi tertentu, gunakan mekanisme resmi yang disediakan oleh pemilik API.
