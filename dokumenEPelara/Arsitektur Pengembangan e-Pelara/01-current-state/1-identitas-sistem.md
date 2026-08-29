# 1. IDENTITAS SISTEM e-PeLARA

> Dokumen ini merupakan referensi resmi spesifikasi teknis sistem e-PeLARA.
> Wajib diperbarui setiap ada perubahan signifikan pada infrastruktur atau teknologi.

---

## 1.1 Profil Umum

| Atribut             | Detail                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| **Nama Sistem**     | e-PeLARA                                                                  |
| **Kepanjangan**     | Perencanaan Elektronik Layanan Akuntabilitas dan Realisasi Anggaran       |
| **Versi Saat Ini**  | 1.0.0                                                                     |
| **Tanggal Analisa** | 23 Maret 2026                                                             |
| **Lingkup**         | Sistem informasi manajemen perencanaan dan penganggaran pemerintah daerah |

---

## 1.2 Stack Teknologi Backend

| Komponen     | Teknologi                 | Versi    | Keterangan                                |
| ------------ | ------------------------- | -------- | ----------------------------------------- |
| Runtime      | Node.js                   | -        | Server-side JavaScript                    |
| Framework    | Express.js                | v5.x     | REST API framework                        |
| ORM          | Sequelize                 | v6.37.7  | Object-Relational Mapping untuk MySQL     |
| Database     | MySQL                     | 8.0      | Database utama                            |
| Cache        | Redis                     | v5.7.0   | Session cache & performance (ioredis)     |
| Realtime     | Socket.IO                 | v4.8.1   | Notifikasi real-time                      |
| Auth         | JSON Web Token (JWT)      | v9.0.2   | Autentikasi lokal + SSO                   |
| Password     | bcryptjs                  | v3.0.2   | Hashing password                          |
| AI           | OpenAI SDK                | v5.3.0   | GPT-3.5-turbo untuk rekomendasi kebijakan |
| PDF          | pdfkit, pdfmake, jsPDF    | -        | Generate laporan PDF                      |
| Digital Sign | @signpdf + node-forge     | v3.2.x   | Tanda tangan digital P12/PKCS12           |
| Export       | ExcelJS, csv-writer, xlsx | -        | Export data ke Excel/CSV                  |
| Validasi     | Joi + express-validator   | -        | Validasi input request                    |
| Logging      | Winston + Morgan          | v3.17.0  | Audit log & HTTP log                      |
| Rate Limit   | express-rate-limit        | v7.5.0   | Proteksi brute-force                      |
| Puppeteer    | puppeteer                 | v24.14.0 | Headless browser untuk PDF/laporan        |
| Desimal      | decimal.js                | v10.6.0  | Presisi kalkulasi keuangan                |

---

## 1.3 Stack Teknologi Frontend

| Komponen     | Teknologi                          | Versi    | Keterangan                                                  |
| ------------ | ---------------------------------- | -------- | ----------------------------------------------------------- |
| Framework    | React                              | v18.2.0  | UI library                                                  |
| Build Tool   | Vite                               | -        | Development server & bundler                                |
| Routing      | React Router DOM                   | v6.22.3  | Client-side routing                                         |
| UI Library   | Ant Design (antd)                  | v5.27.1  | Komponen UI utama                                           |
| UI Library 2 | MUI (Material UI)                  | v7.1.1   | Komponen tambahan                                           |
| UI Library 3 | CoreUI                             | v5.7.1   | Dashboard komponen                                          |
| UI Library 4 | React Bootstrap                    | v2.10.2  | Bootstrap 5 komponen                                        |
| State HTTP   | TanStack Query                     | v5.29.4  | Data fetching & caching                                     |
| Form         | Formik + React Hook Form           | -        | Manajemen form                                              |
| Validasi     | Yup / @hookform/resolvers          | -        | Schema validation form                                      |
| HTTP Client  | Axios                              | v1.7.2   | REST API calls                                              |
| Chart        | Chart.js + Recharts + @nivo/sankey | -        | Visualisasi data, grafik, & Sankey diagram                  |
| Notifikasi   | react-toastify + react-hot-toast   | -        | Toast notification                                          |
| Export PDF   | jsPDF + jspdf-autotable            | -        | Export laporan dari frontend                                |
| Export Excel | react-csv + xlsx + papaparse       | -        | Export CSV/Excel dari frontend; papaparse untuk parsing CSV |
| Export Word  | docx                               | -        | Generate dokumen Word                                       |
| Tanggal      | dayjs                              | v1.11.10 | Manipulasi tanggal                                          |
| Sanitasi     | DOMPurify                          | v3.1.3   | Proteksi XSS                                                |
| Cookie       | js-cookie                          | v3.0.5   | Manajemen cookie client                                     |
| Progress     | NProgress                          | v0.2.0   | Loading bar navigasi                                        |

---

## 1.4 Infrastruktur & Deployment

| Komponen      | Teknologi       | Port                  | Keterangan                        |
| ------------- | --------------- | --------------------- | --------------------------------- |
| Backend API   | Node.js/Express | 3000                  | Container Docker                  |
| Frontend      | React/Nginx     | 5173 (dev), 80 (prod) | Container Docker                  |
| Database      | MySQL 8.0       | 3306                  | Volume persistent `mysql-data`    |
| Cache         | Redis 7-alpine  | 6379                  | Container Docker                  |
| Orchestration | Docker Compose  | -                     | Semua service dalam `app-network` |

### Konfigurasi Docker Network

- Semua container terhubung dalam bridge network `app-network`
- Backend bergantung pada MySQL dan Redis (`depends_on`)
- Data MySQL disimpan di named volume `mysql-data` (persistent)

### Environment Development vs Production

| Variabel         | Development        | Production                |
| ---------------- | ------------------ | ------------------------- |
| `NODE_ENV`       | `development`      | `production`              |
| Redis Host       | `localhost`        | `redis` (Docker hostname) |
| Redis retry      | 3x                 | 10x                       |
| Redis gagal      | Server tetap jalan | `process.exit(1)`         |
| Log query SQL    | Aktif (console)    | Dimatikan                 |
| Rate limit login | 1000 req/10 menit  | 10 req/10 menit           |
| HTTPS redirect   | Tidak              | Aktif                     |

---

## 1.5 File Konfigurasi Utama

| File                 | Lokasi                       | Fungsi                                                 |
| -------------------- | ---------------------------- | ------------------------------------------------------ |
| `config.json`        | `backend/config/config.json` | Konfigurasi database per environment                   |
| `database.js`        | `backend/config/database.js` | Inisialisasi koneksi Sequelize                         |
| `server.js`          | `backend/server.js`          | Entry point backend, registrasi semua route            |
| `.env`               | `backend/.env`               | Variabel environment (JWT_SECRET, OPENAI_API_KEY, dll) |
| `docker-compose.yml` | Root                         | Konfigurasi Docker semua service                       |
| `vite.config.js`     | `frontend/vite.config.js`    | Konfigurasi Vite & proxy                               |
| `App.jsx`            | `frontend/src/App.jsx`       | Entry point frontend, definisi semua route             |

---

## 1.6 Variabel Environment Wajib (`.env`)

```env
# Database
DB_NAME=db_epelara
DB_USER=root
DB_PASSWORD=
DB_HOST=localhost
DB_PORT=3306

# JWT
JWT_SECRET=<secret_key_rahasia>
JWT_REFRESH_SECRET=<refresh_secret_key>

# Redis
REDIS_URL=redis://localhost:6379
REDIS_MAX_RETRIES=3
REDIS_RETRY_DELAY_MS=3000

# SSO SIGAP (opsional, wajib jika integrasi SSO aktif)
SSO_SHARED_SECRET=<shared_secret_dari_sigap>

# OpenAI (opsional, wajib jika fitur AI aktif)
OPENAI_API_KEY=<api_key_openai>

# App
NODE_ENV=development
PORT=3000
```

---

## 1.7 Cara Menjalankan Sistem

### Mode Development (Lokal)

```bash
# Backend
cd backend
node server.js
# atau dengan auto-reload:
npx nodemon server.js

# Frontend (terminal terpisah)
cd frontend
npm run dev -- --host
```

- Backend berjalan di: `http://localhost:3000`
- Frontend berjalan di: `http://localhost:3001`

### Mode Production (Docker)

```bash
docker-compose up -d --build
```

- Frontend diakses di: `http://localhost:5173`
- Backend API di: `http://localhost:3000`

---

_Dokumen ini adalah bagian dari Pedoman Pengembangan Sistem e-PeLARA._
_Versi: 1.0 | Dibuat: 23 Maret 2026_
