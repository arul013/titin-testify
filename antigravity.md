# Antigravity Rules for Learning Nexus Exam

Sebelum memulai pengerjaan coding, debugging, atau modifikasi dalam repositori ini, semua agen AI **WAJIB** membaca dan mematuhi aturan berikut:

## 1. Aturan Penggunaan Komponen UI
- **JANGAN** gunakan komponen UI lama yang berada di folder `frontend/src/components/ui/` (seperti `Button.tsx`, `Card.tsx`, `Input.tsx`, `Modal.tsx`, `Toast.tsx`).
- **WAJIB** gunakan komponen sistem desain baru yang berada di subfolder **`frontend/src/components/ui/ui/`** (seperti `button.tsx`, `card.tsx`, `input.tsx`, `modal.tsx`, `toast.tsx`, `checkbox.tsx`, dll.).
- Impor komponen-komponen ini secara langsung dari `@/components/ui/ui/<name>` atau secara relatif (misal: `../../components/ui/ui/button`).
- Perhatikan keselarasan props untuk komponen baru:
  - Tombol (`button.tsx`): gunakan `loading` (bukan `isLoading`).
  - Modal (`modal.tsx`): gunakan `open` (bukan `isOpen`).
  - Kartu (`card.tsx`): gunakan varian semantik seperti `variant="default"` atau `variant="interactive"` (bukan `hoverEffect`).

## 2. Aturan Styling & Tema
- Hindari penulisan inline style atau CSS manual jika memungkinkan. Gunakan variabel tema Tailwind CSS v4 yang telah diatur di [globals.css](file:///Users/hasrulsani/Documents/Learning%20Nexus/Learning%20Nexus%20Website/learning-nexus-exam/frontend/src/app/globals.css).
- Pastikan warna dan gaya konsisten dengan tema cerah premium berbasis **Indigo, Putih, dan Hitam**.
