# Panduan Kontribusi

## Alur kerja (wajib)

```
branch (feat/*, fix/*, docs/*) → PR ke main → CI hijau → merge → rilis manual
```

1. **Jangan push langsung ke `main`.** Buat branch dari `main`, mis.
   `fix/nama-perubahan-20261008`.
2. Buka **Pull Request** ke `main`. Kolom deskripsi terisi otomatis dari
   `.github/pull_request_template.md` — isi bagian **Ringkasan perubahan**
   dan **Cara ngetes**.
3. Tunggu **CI hijau** (workflow "Validate and Build Karsa Mobile" jalan di
   setiap PR; untuk PR dari branch, hanya job validasi yang relevan).
4. **Merge** setelah CI hijau (ceklist "Sudah dicoba di HP" kalau menyentuh UI).
5. Rilis APK mengikuti `docs/RILIS-MOBILE.md`.

Kenapa harus lewat PR: GitHub menyusun "What's Changed" di release notes dari
PR yang di-merge. Push langsung ke `main` membuat catatan rilis kosong.

## Konvensi commit

Pakai [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(mobile): ...` — fitur baru aplikasi
- `fix(mobile): ...` / `fix(lib): ...` — perbaikan bug
- `chore(mobile): ...` — maintenance (mis. `chore(mobile): release 2.0.x`)
- `docs: ...`, `ci: ...`, `test: ...` — sesuai area

Judul commit/PR yang jelas akan tampil apa adanya di "What's Changed", jadi
tulis yang dimengerti pengguna/pengembang lain.

## Template PR

`.github/pull_request_template.md` berisi:

- **Ringkasan perubahan** — apa yang diubah & kenapa
- **Cara ngetes** — langkah verifikasi
- **Checklist** — CI hijau + tes di HP/emulator (untuk perubahan UI)

## Aturan tambahan

- Perubahan kode besar: diagnosis/penjelasan dulu sebelum implementasi.
- Jangan commit secret, keystore, `.env`, atau file credential apa pun.
- File biner (PNG, JKS, dsb.) tidak bisa ditulis lewat GitHub App — siapkan
  manual dan push dari lokal.
