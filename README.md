# MauKeMana

Platform pengembangan diri berbasis **fase hidup**, bukan feed algoritmik.

## Prinsip produk

- Context → curation → reflection → action.
- Guest-first: pengguna dapat melihat roadmap sebelum membuat akun.
- YouTube dikurasi manusia dan tidak autoplay.
- Tidak ada infinite feed, streak, leaderboard, atau social pressure.
- Akun hanya dibutuhkan untuk Saved, progress, refleksi, preferensi, dan admin.

## Struktur utama

- `#home` — orientasi dan langkah berikutnya.
- `#roadmap` — SMA kelas 10–12 dan S1 semester 1–8.
- `#explore` — pencarian/filter topik tanpa infinite feed.
- `#saved` — topik yang disimpan pengguna.
- `#profile` — fase hidup, minat, dan progress.
- `#topic/<id>` — Why Now, video terkurasi, refleksi, aksi, feedback.
- `#admin` — CMS topik, video, linking, publish state, content health.

## Backend

Supabase project: `lbrrgjcolodpxcicrxnq`.

Data publik dilindungi RLS dan grant Data API minimum. Data pengguna hanya bisa dibaca/ditulis oleh pemilik. Admin content mutation menggunakan membership di `public.admin_members`.

### Bootstrap admin

1. Masuk ke aplikasi melalui magic-link.
2. Buka `#admin`; jika belum memiliki akses, UUID akun akan ditampilkan.
3. Dari Supabase Dashboard, tambahkan UUID tersebut ke `public.admin_members(user_id)`.
4. Refresh aplikasi lalu buka `#admin`.

## Deploy guard

`vercel.json` menyetel `git.deploymentEnabled=false` agar push GitHub tidak otomatis melakukan deployment. Production deploy dilakukan manual setelah QA final.
