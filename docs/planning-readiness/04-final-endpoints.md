# Final Endpoint List - Renstra, Renja, RKPD

Semua endpoint berada di prefix `/api` dan membutuhkan `Bearer token`.

## A. Renstra (`renstraRoutes`)

| Method | Path | Fungsi | Catatan |
|---|---|---|---|
| GET | `/api/renstra-docs` | List Renstra | Query umum: `page`, `limit`, `tahun`, `status`, `search` |
| GET | `/api/renstra-docs/:id` | Detail Renstra | Return single data |
| POST | `/api/renstra-docs` | Create Renstra | Role tulis: SUPER_ADMIN/ADMINISTRATOR |
| PUT | `/api/renstra-docs/:id` | Update Renstra | Guard approved aktif |
| DELETE | `/api/renstra-docs/:id` | Delete Renstra | Guard approved aktif |
| PATCH | `/api/renstra-docs/:id/status` | Update status langsung | Legacy-compatible; tetap lewat workflow service |
| POST | `/api/renstra-docs/:id/actions/:action` | Workflow action | `action`: `submit/approve/reject/revise/reset` |
| POST | `/api/renstra-docs/:id/submit` | Alias workflow | Setara `actions/submit` |
| POST | `/api/renstra-docs/:id/approve` | Alias workflow | Setara `actions/approve` |
| POST | `/api/renstra-docs/:id/reject` | Alias workflow | Setara `actions/reject` |
| POST | `/api/renstra-docs/:id/revise` | Alias workflow | Setara `actions/revise` |
| POST | `/api/renstra-docs/:id/reset` | Alias workflow | Setara `actions/reset` |
| GET | `/api/renstra-docs/sync` | Sync Renstra | Sinkronisasi upstream/stub aman |

## B. Renja (`renjaRoutes`)

| Method | Path | Fungsi | Catatan |
|---|---|---|---|
| GET | `/api/renja` | List Renja | Query: `page`, `limit`, `tahun`, `status`, `search` |
| GET | `/api/renja/:id` | Detail Renja | Return single data |
| POST | `/api/renja` | Create Renja | Validasi periode/renstra/tahun |
| PUT | `/api/renja/:id` | Update Renja | Guard approved aktif |
| DELETE | `/api/renja/:id` | Delete Renja | Guard approved aktif |
| PATCH | `/api/renja/:id/status` | Update status langsung | Legacy-compatible |
| POST | `/api/renja/:id/actions/:action` | Workflow action | `submit/approve/reject/revise/reset` |
| POST | `/api/renja/:id/submit` | Alias workflow | Setara `actions/submit` |
| POST | `/api/renja/:id/approve` | Alias workflow | Setara `actions/approve` |
| POST | `/api/renja/:id/reject` | Alias workflow | Setara `actions/reject` |
| POST | `/api/renja/:id/revise` | Alias workflow | Setara `actions/revise` |
| POST | `/api/renja/:id/reset` | Alias workflow | Setara `actions/reset` |
| GET | `/api/renja/sync` | Sync Renja | Sinkronisasi upstream/stub aman |

## C. RKPD (`rkpdRoutes`)

| Method | Path | Fungsi | Catatan |
|---|---|---|---|
| GET | `/api/rkpd` | List RKPD | Query: `page`, `limit`, `tahun`, `status`, `search` |
| GET | `/api/rkpd/:id` | Detail RKPD | Return single data |
| POST | `/api/rkpd` | Create RKPD | Validasi periode + non-negatif + identitas inti |
| PUT | `/api/rkpd/:id` | Update RKPD | Guard approved aktif |
| DELETE | `/api/rkpd/:id` | Delete RKPD | Guard approved aktif |
| PATCH | `/api/rkpd/:id/status` | Update status langsung | Legacy-compatible |
| POST | `/api/rkpd/:id/actions/:action` | Workflow action | `submit/approve/reject/revise/reset` |
| POST | `/api/rkpd/:id/submit` | Alias workflow | Setara `actions/submit` |
| POST | `/api/rkpd/:id/approve` | Alias workflow | Setara `actions/approve` |
| POST | `/api/rkpd/:id/reject` | Alias workflow | Setara `actions/reject` |
| POST | `/api/rkpd/:id/revise` | Alias workflow | Setara `actions/revise` |
| POST | `/api/rkpd/:id/reset` | Alias workflow | Setara `actions/reset` |
| GET | `/api/rkpd/sync` | Sync RKPD | Mengembalikan mode stub/incomplete integration |
| POST | `/api/rkpd/sync` | Sync RKPD (alt) | Endpoint alternatif dengan response setara |

## D. Catatan workflow dan role
- Rule transisi status dipusatkan di `backend/services/planningWorkflowService.js`.
- Action admin-only: `approve`, `reject`.
- Role admin workflow yang diizinkan (setelah mapping role SSO): `SUPER_ADMIN`, `ADMINISTRATOR`.
- Audit create/update/delete/status-change dipusatkan di `backend/services/planningAuditService.js`.
