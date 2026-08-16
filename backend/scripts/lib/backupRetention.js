'use strict';

/**
 * Retention policy engine — pure logic terhadap daftar manifest yang sudah
 * dibaca dari disk. TIDAK melakukan I/O sendiri (caller yang membaca daftar
 * manifest dan yang mengeksekusi delete) — supaya mudah di-unit-test dan
 * supaya wildcard deletion tidak mungkin terjadi di sini (fungsi ini hanya
 * mengembalikan KEPUTUSAN, bukan mengeksekusi delete).
 *
 * Policy (default konservatif, configurable via backupConfig.resolveRetentionPolicy):
 *   - Daily: simpan seluruh backup SUKSES dalam N hari terakhir (default 14).
 *   - Weekly: di luar window daily, simpan 1 backup per minggu (backup
 *     pertama yang ditemukan di minggu itu) sampai M minggu (default 8).
 *   - Monthly: di luar window weekly, simpan 1 backup per bulan sampai
 *     K bulan (default 6).
 *   - Di luar seluruh window: KANDIDAT HAPUS.
 *
 * Guard wajib (Owner): retention HANYA boleh menghapus artifact yang:
 *   1. dikenali sebagai backup engine (manifest ada & bisa diparse),
 *   2. status backup = SUCCESS,
 *   3. berada di direktori backup yang ditentukan (caller yang menjamin ini
 *      dengan hanya membaca dari resolveBackupDir()).
 * Manifest tanpa status SUCCESS, atau backup manual historis yang TIDAK
 * PUNYA manifest sama sekali, tidak pernah masuk daftar kandidat hapus —
 * fungsi ini hanya menerima array manifest sebagai input, jadi backup tanpa
 * manifest otomatis tidak pernah dipertimbangkan (caller yang membangun
 * daftar tersebut, dan hanya boleh membangunnya dari file *.manifest.json).
 */

function isoWeekKey(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function monthKey(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * @param {Array<{backup_id: string, filename: string, status: string, created_at: string}>} manifests
 * @param {{dailyDays: number, weeklyWeeks: number, monthlyMonths: number}} policy
 * @param {Date} [now]
 * @returns {{ keep: string[], delete: string[], reasoning: Record<string,string> }}
 *   keep/delete berisi backup_id. reasoning menjelaskan alasan per backup_id.
 */
function evaluateRetention(manifests, policy, now = new Date()) {
  const reasoning = {};
  const eligible = (manifests || []).filter((m) => {
    if (!m || typeof m !== 'object') return false;
    if (m.status !== 'SUCCESS') {
      if (m?.backup_id) reasoning[m.backup_id] = 'dilewati: status bukan SUCCESS, tidak pernah jadi kandidat hapus';
      return false;
    }
    if (!m.created_at || !m.backup_id) {
      return false;
    }
    return true;
  });

  const sorted = [...eligible].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  const dailyCutoffMs = now.getTime() - policy.dailyDays * 86400000;
  const weeklyCutoffMs = now.getTime() - (policy.dailyDays + policy.weeklyWeeks * 7) * 86400000;
  const monthlyCutoffMs =
    now.getTime() - (policy.dailyDays + policy.weeklyWeeks * 7 + policy.monthlyMonths * 30) * 86400000;

  const keep = [];
  const del = [];
  const keptWeekKeys = new Set();
  const keptMonthKeys = new Set();

  for (const m of sorted) {
    const createdMs = new Date(m.created_at).getTime();

    if (createdMs >= dailyCutoffMs) {
      keep.push(m.backup_id);
      reasoning[m.backup_id] = `simpan: dalam window daily (${policy.dailyDays} hari)`;
      continue;
    }

    if (createdMs >= weeklyCutoffMs) {
      const wk = isoWeekKey(new Date(m.created_at));
      if (!keptWeekKeys.has(wk)) {
        keptWeekKeys.add(wk);
        keep.push(m.backup_id);
        reasoning[m.backup_id] = `simpan: representatif mingguan pertama untuk ${wk}`;
      } else {
        del.push(m.backup_id);
        reasoning[m.backup_id] = `hapus: window weekly tapi minggu ${wk} sudah punya representatif`;
      }
      continue;
    }

    if (createdMs >= monthlyCutoffMs) {
      const mk = monthKey(new Date(m.created_at));
      if (!keptMonthKeys.has(mk)) {
        keptMonthKeys.add(mk);
        keep.push(m.backup_id);
        reasoning[m.backup_id] = `simpan: representatif bulanan pertama untuk ${mk}`;
      } else {
        del.push(m.backup_id);
        reasoning[m.backup_id] = `hapus: window monthly tapi bulan ${mk} sudah punya representatif`;
      }
      continue;
    }

    del.push(m.backup_id);
    reasoning[m.backup_id] = 'hapus: di luar seluruh window retention (daily/weekly/monthly)';
  }

  return { keep, delete: del, reasoning };
}

module.exports = { evaluateRetention, isoWeekKey, monthKey };
