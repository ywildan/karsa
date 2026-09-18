# Setup audit input dan penghapusan poin

Fitur ini mencatat `INPUT` dan `HAPUS` pada tabel `PoinAuditLog`. Setiap
peristiwa menyimpan identitas PJ dan mahasiswa, kelas/mata kuliah, kategori,
nilai, catatan, waktu input asli, serta waktu peristiwa. Input atau penghapusan
`PoinLog` dan penulisan audit dilakukan dalam satu transaksi: bila audit gagal,
perubahan poin ikut batal.

## Urutan pemasangan pada Supabase yang sudah berisi data

1. Cadangkan database sesuai prosedur operasional yang berlaku.
2. Jalankan [`prisma/audit-poin.sql`](../prisma/audit-poin.sql) **sekali sebelum
   deployment kode baru** melalui Supabase SQL Editor. Skrip dapat dijalankan
   ulang dan tidak menghapus data poin lama. Jangan menjalankan ulang
   `prisma/init.sql` pada produksi karena file itu juga memuat data uji.
3. Pastikan role koneksi PostgreSQL yang dipakai Prisma dapat membaca dan
   menulis tabel baru. Tabel audit mengaktifkan RLS tanpa policy dan mencabut
   akses `anon`/`authenticated` melalui Supabase Data API; koneksi Prisma yang
   menggunakan role `postgres` tetap dapat mengaksesnya.
4. Jalankan `npm run db:generate`, lalu build dan deploy aplikasi. Urutannya
   penting: kode baru akan gagal menulis poin jika tabel audit belum ada.
5. Masuk sebagai PJ uji, buat satu poin, lalu hapus poin itu. Sebagai admin,
   buka `/admin/audit-poin` dan cari NIM mahasiswa. Seharusnya ada dua peristiwa
   dengan `poin_log_id` yang sama: `INPUT` dan `HAPUS`.

Untuk pemeriksaan langsung di SQL Editor:

```sql
SELECT "action", "poin_log_id", "mahasiswa_id", "mahasiswa_nim",
       "pj_id", "pj_email", "poin", "occurred_at"
FROM "PoinAuditLog"
ORDER BY "occurred_at" DESC
LIMIT 20;
```

Halaman admin hanya memuat 100 peristiwa terbaru atau 100 hasil pencarian NIM/
nama mahasiswa. Peristiwa input **sebelum pemasangan fitur** tidak dibuat
sebagai audit historis; `PoinLog` lama tetap memiliki `pj_id` selama belum
dihapus. Perubahan langsung melalui SQL Editor melewati Server Action sehingga
tidak menghasilkan peristiwa aplikasi. Akses SQL Editor perlu dibatasi dan
dicatat dengan prosedur tersendiri. Tabel audit menyimpan data pribadi dan
memerlukan kebijakan retensi bersama UNTIDAR.
