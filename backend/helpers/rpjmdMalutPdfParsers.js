/**
 * Parser teks ekstraksi PDF Rankhir RPJMD Malut 2025–2029 (dump baris-per-baris).
 * Tidak memakai file kurasi — sumber utamanya string fullText dari rpjmd_malut_pdf_dump.txt.
 */
"use strict";

function isYearCell(tok) {
  if (tok == null) return false;
  const u = String(tok).trim();
  if (/^n\/a$/i.test(u) || u === "-" || u === "–") return true;
  /** Target rentang di PDF, mis. 3,00- */
  if (/^\d+[.,]\d+-\s*$/.test(u)) return true;
  if (/^\d+([.,]\d+)?(-\d+([.,]\d+)?)?$/.test(u.replace(/\s/g, ""))) return true;
  if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(u)) return true;
  if (/^\d+[.,]\d+$/.test(u)) return true;
  return /^[\d.,]+$/.test(u) && /\d/.test(u);
}

/** Nilai rupiah / angka tabel APBD — bukan kode hierarki seperti 1, 1.1, 2.1.6 */
function isApbdMoneyToken(tok) {
  const t = String(tok).trim().replace(/\s/g, "");
  if (!t) return false;
  if (t === "-" || t === "–") return true;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(t)) return true;
  if (/^\d{1,3}(?:\.\d{3})*(?:\.\d{1,3})(?:,\d+)?$/.test(t)) return true;
  if (/^\d{1,3}(?:\.\d{3})+,\d+$/.test(t)) return true;
  if (/^\d+,\d+$/.test(t)) return true;
  if (/^\d{4,}$/.test(t)) return true;
  return false;
}

function lineIsOnlyMoneyTokens(line) {
  const parts = line.trim().split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
  if (!parts.length) return false;
  return parts.every(isApbdMoneyToken);
}

/** Tabel 2.28 — baris multi-line: nomor + indikator + 4 tahun capaian */
function parseTable228(fullText) {
  const start = fullText.indexOf("Tabel 2.28");
  const end = fullText.indexOf("Tabel 2.29", start);
  if (start < 0 || end < 0) return [];
  const lines = fullText.slice(start, end).split("\n");
  let bidang = null;
  const rows = [];
  let buf = [];

  function flush() {
    if (!buf.length) return;
    const joined = buf.map((l) => l.trim()).join(" ");
    const tokens = joined.split(/\s+/).filter(Boolean);
    if (tokens.length < 6) return;
    if (!/^\d+$/.test(tokens[0])) return;
    const years = [];
    let i = tokens.length - 1;
    while (i > 0 && years.length < 4) {
      if (isYearCell(tokens[i])) {
        years.unshift(tokens[i]);
        i--;
      } else break;
    }
    if (years.length < 4) return;
    const indikator = tokens.slice(1, i + 1).join(" ").trim();
    if (!indikator) return;
    rows.push({
      bidang_urusan: bidang,
      no_urut: parseInt(tokens[0], 10),
      indikator,
      tahun_2021: years[0] || null,
      tahun_2022: years[1] || null,
      tahun_2023: years[2] || null,
      tahun_2024: years[3] || null,
      satuan: null,
    });
    buf = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^NO\s+BIDANG/i.test(line) || /^CAPAIAN\s+TAHUN/i.test(line)) continue;
    if (/^2021\s+2022\s+2023\s+2024/.test(line)) continue;
    const bd = line.match(/^([A-Z]{1,2})\s+([A-Z][A-Za-z].*)/);
    if (bd && !/^\d/.test(line)) {
      flush();
      bidang = bd[1];
      continue;
    }
    const onlyYearLineToks = line.split(/\s+/).filter(Boolean);
    if (onlyYearLineToks.length >= 4 && onlyYearLineToks.every(isYearCell)) {
      if (buf.length) buf.push(line);
      continue;
    }
    if (/^(\d+)(\s.*)?$/.test(line)) {
      flush();
      if (buf.length) buf = [];
      buf.push(line);
    } else if (buf.length) {
      buf.push(line);
    }
  }
  flush();
  return rows;
}

function parseKodeLine(line) {
  const trimmed = line.trim();
  if (lineIsOnlyMoneyTokens(trimmed)) return null;
  const gapParts = trimmed.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
  if (gapParts.length >= 2 && gapParts.every(isYearCell)) return null;
  const wsToks = trimmed.split(/\s+/).filter(Boolean);
  if (wsToks.length >= 4 && wsToks.every(isYearCell)) return null;
  const m = trimmed.match(/^(\d+(?:\.\d+)*)(?:\s+(.*))?$/);
  if (!m) return null;
  const code = m[1];
  const rest = (m[2] || "").trim();
  if (!rest) return { kode: code, uraianOnSameLine: null };
  if (lineIsOnlyMoneyTokens(rest)) return null;
  const partsByGap = rest.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
  if (partsByGap.length >= 2 && partsByGap.every(isApbdMoneyToken)) return null;
  return { kode: code, uraianOnSameLine: rest };
}

/** Satu baris visual: kode + uraian + tepat 6 token nilai (ekstraksi pdfjs / tabel rapat). */
function trySplitApbdSingleLine(line) {
  const trimmed = line.trim();
  const head = trimmed.match(/^(\d+(?:\.\d+)*)\s+(.+)$/);
  if (!head) return null;
  const kode = head[1];
  const toks = head[2].split(/\s+/).filter(Boolean);
  if (toks.length < 7) return null;
  const money = [];
  let j = toks.length - 1;
  while (j >= 0 && money.length < 6) {
    if (isApbdMoneyToken(toks[j])) money.unshift(toks[j]);
    else break;
    j--;
  }
  if (money.length !== 6) return null;
  const uraian = toks.slice(0, j + 1).join(" ").trim();
  if (!uraian) return null;
  return { kode, uraian, money };
}

/**
 * Baris 3.2.1 di PDF: uraian "Penyertaan Modal Pemerintah" + baris "Daerah" (bisa setelah 5 angka),
 * tepat 5 token rupiah beruntun; target_2025 dokumen kosong → "-".
 */
function trySplitApbdRow321(line) {
  const trimmed = line.trim();
  if (!/^3\.2\.1\b/.test(trimmed)) return null;
  const head = trimmed.match(/^3\.2\.1\s+(.+)$/);
  if (!head) return null;
  const toks = head[1].split(/\s+/).filter(Boolean);
  let firstMoney = -1;
  for (let i = 0; i < toks.length; i++) {
    if (isApbdMoneyToken(toks[i])) {
      firstMoney = i;
      break;
    }
  }
  if (firstMoney < 0) return null;
  let lastMoney = firstMoney;
  while (lastMoney + 1 < toks.length && isApbdMoneyToken(toks[lastMoney + 1])) {
    lastMoney++;
  }
  const moneyToks = toks.slice(firstMoney, lastMoney + 1);
  if (moneyToks.length !== 5) return null;
  const left = toks.slice(0, firstMoney).join(" ").trim();
  const right = toks.slice(lastMoney + 1).join(" ").trim();
  const uraian = [left, right].filter(Boolean).join(" ").trim();
  if (!uraian) return null;
  return {
    kode: "3.2.1",
    uraian,
    money: ["-", moneyToks[0], moneyToks[1], moneyToks[2], moneyToks[3], moneyToks[4]],
  };
}

function extractMoneyTokensFromLine(line) {
  if (!line || /^Sumber:/i.test(line)) return [];
  let parts = line.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
  let toks = parts.filter(isApbdMoneyToken);
  if (toks.length >= 2) return toks;
  const re = /\d{1,3}(?:\.\d{3})*(?:,\d+)?|-(?=\s|$)|\d+(?:,\d+)?/g;
  const m = line.match(re);
  return m ? m.filter((t) => t !== "- " && t.length > 0) : [];
}

/** Tabel 2.29 — struktur vertikal kode + uraian + 6 kolom angka (2025–2030) */
function parseTable229(fullText) {
  const start = fullText.indexOf("Tabel 2.29");
  const end = fullText.indexOf("2.2.3 KEBIJAKAN", start);
  if (start < 0 || end < 0) return [];
  const rawLines = fullText.slice(start, end).split("\n").map((l) => l.trim());
  const lines = rawLines.filter((l) => l);
  const rows = [];
  let i = 0;
  while (i < lines.length) {
    if (/^No$|^Uraian$|^Target Tahun$|^Proyeksi Tahun$/i.test(lines[i])) {
      i++;
      continue;
    }
    if (/^202[5-9]$|^2030$/i.test(lines[i])) {
      i++;
      continue;
    }
    if (/^Sumber:/i.test(lines[i])) break;
    let line229 = lines[i];
    let extraSkip = 0;
    if (/^3\.2\.1\s+/.test(line229) && i + 1 < lines.length && /^Daerah$/i.test(lines[i + 1].trim())) {
      line229 = `${line229} ${lines[i + 1].trim()}`;
      extraSkip = 1;
    }
    const row321 = trySplitApbdRow321(line229);
    if (row321) {
      rows.push({
        kode_baris: row321.kode,
        uraian: row321.uraian,
        target_2025: row321.money[0] ?? null,
        proyeksi_2026: row321.money[1] ?? null,
        proyeksi_2027: row321.money[2] ?? null,
        proyeksi_2028: row321.money[3] ?? null,
        proyeksi_2029: row321.money[4] ?? null,
        proyeksi_2030: row321.money[5] ?? null,
      });
      i += 1 + extraSkip;
      continue;
    }
    const sameLine = trySplitApbdSingleLine(lines[i]);
    if (sameLine) {
      rows.push({
        kode_baris: sameLine.kode,
        uraian: sameLine.uraian,
        target_2025: sameLine.money[0] ?? null,
        proyeksi_2026: sameLine.money[1] ?? null,
        proyeksi_2027: sameLine.money[2] ?? null,
        proyeksi_2028: sameLine.money[3] ?? null,
        proyeksi_2029: sameLine.money[4] ?? null,
        proyeksi_2030: sameLine.money[5] ?? null,
      });
      i++;
      continue;
    }
    const kp = parseKodeLine(lines[i]);
    if (!kp) {
      i++;
      continue;
    }
    if (/^\d+$/.test(lines[i]) && i + 1 < lines.length && /^\d+\.\d+/.test(lines[i + 1])) {
      i++;
      continue;
    }
    const { kode, uraianOnSameLine } = kp;
    const uraian = [];
    if (uraianOnSameLine) uraian.push(uraianOnSameLine);
    i++;
    const money = [];
    while (i < lines.length) {
      const L = lines[i];
      if (/^Sumber:/i.test(L)) break;
      const nextKp = parseKodeLine(L);
      if (nextKp && money.length >= 6) break;
      if (nextKp && money.length > 0) break;
      if (nextKp && money.length === 0 && uraian.length > 0) break;
      const mt = extractMoneyTokensFromLine(L);
      if (mt.length >= 1 && (mt.length >= 2 || money.length > 0 || /\d{1,3}\.\d{3}/.test(L))) {
        for (const t of mt) {
          money.push(t);
          if (money.length >= 6) break;
        }
        i++;
        if (money.length >= 6) break;
        continue;
      }
      if (money.length > 0 && /^[\.,][\d.,]+$/.test(L.replace(/\s/g, ""))) {
        money[money.length - 1] = String(money[money.length - 1] || "").replace(/\s/g, "") + L.replace(/\s/g, "");
        i++;
        continue;
      }
      if (nextKp && money.length === 0) {
        break;
      }
      if (!/^No$|^Uraian$/i.test(L)) uraian.push(L);
      i++;
    }
    while (money.length < 6) money.push("-");
    if (money.length > 6) money.length = 6;
    const uraianText = uraian.join(" ").replace(/\s+/g, " ").trim();
    if (!uraianText && money.every((x) => x === "-")) continue;
    rows.push({
      kode_baris: kode,
      uraian: uraianText || kode,
      target_2025: money[0] ?? null,
      proyeksi_2026: money[1] ?? null,
      proyeksi_2027: money[2] ?? null,
      proyeksi_2028: money[3] ?? null,
      proyeksi_2029: money[4] ?? null,
      proyeksi_2030: money[5] ?? null,
    });
  }
  return rows;
}

/** Tabel 3.1 — blok tujuan + teks indikator + baseline + target 2025–2030 + ket opsional */
function parseTable31(fullText) {
  const start = fullText.indexOf("Tabel 3.1");
  const end = fullText.indexOf("3.3 STRATEGI", start);
  if (start < 0 || end < 0) return [];
  const lines = fullText
    .slice(start, end)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let currentTujuan = null;
  let pending = [];
  const rows = [];
  let urutan = 0;

  function flushDataRow(tailLine) {
    const parts = tailLine.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
    if (parts.length < 6) return false;
    const tail = [];
    let idx = parts.length - 1;
    while (idx >= 0 && tail.length < 7) {
      const p = parts[idx];
      if (isYearCell(p)) {
        tail.unshift(p);
        idx--;
      } else break;
    }
    if (tail.length < 6) return false;
    const targets = tail.slice(-6);
    let baseline = null;
    let ket = null;
    if (tail.length >= 7) baseline = tail[0];
    else baseline = "-";
    const inlineInd = parts.slice(0, idx + 1).join(" ").trim();
    let indikator = pending.join(" ").replace(/\s+/g, " ").trim();
    pending = [];
    if (inlineInd && !/^VISI|^Misi:/i.test(inlineInd)) {
      indikator = (indikator ? `${indikator} ${inlineInd}` : inlineInd).trim();
    }
    if (
      !indikator ||
      /^VISI\/MISI|^TUJUAN|^SASARAN|^INDIKATOR|^BASELINE|^TARGET|^KET\.|^Misi:|^Visi:/i.test(indikator)
    )
      return true;
    urutan += 1;
    rows.push({
      urutan,
      tujuan: currentTujuan,
      sasaran: indikator,
      indikator,
      baseline_2024: baseline,
      target_2025: targets[0] ?? null,
      target_2026: targets[1] ?? null,
      target_2027: targets[2] ?? null,
      target_2028: targets[3] ?? null,
      target_2029: targets[4] ?? null,
      target_2030: targets[5] ?? null,
      ket,
    });
    return true;
  }

  for (const line of lines) {
    if (
      /^VISI\/MISI$|^TUJUAN$|^SASARAN$|^INDIKATOR$|^BASELINE$|^TARGET TAHUN$|^KET\.$/i.test(line) ||
      /^202[5-9]$|^2030$/i.test(line)
    )
      continue;
    if (/^Visi:/i.test(line) || /^Misi:/i.test(line)) continue;
    if (/^Terwujudnya|^Meningkatnya/.test(line)) {
      pending = [];
      currentTujuan = line.replace(/\s+/g, " ").trim();
      continue;
    }
    const parts = line.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
    let numTail = 0;
    for (let j = parts.length - 1; j >= 0; j--) {
      if (isYearCell(parts[j])) numTail++;
      else break;
    }
    if (numTail >= 6) {
      flushDataRow(line);
    } else if (numTail >= 1 && pending.length && isYearCell(parts[parts.length - 1])) {
      pending.push(line);
      const merged = pending.join(" ");
      pending = [];
      if (!flushDataRow(merged)) pending = [line];
    } else {
      pending.push(line);
    }
  }
  return rows;
}

function parseArahKebijakan(fullText) {
  const start = fullText.indexOf("Tabel 3.3 Arah Kebijakan");
  const stop = fullText.indexOf("3.5 PROGRAM PRIORITAS", start);
  if (start < 0 || stop < 0) return [];
  const chunk = fullText.slice(start, stop);
  const parts = chunk.split(/\n(?=\d+\s+Mewujudkan)/);
  const rows = [];
  for (const p of parts) {
    const t = p.trim();
    if (!t) continue;
    const m = t.match(/^(\d+)\s+(Mewujudkan[\s\S]+)/);
    if (!m) continue;
    const no = parseInt(m[1], 10);
    const body = m[2].trim();
    const head = body.split("\n")[0].replace(/\s+/g, " ").trim();
    rows.push({
      no_misi: no,
      misi_ringkas: head.slice(0, 500),
      arah_kebijakan: body,
    });
  }
  return rows;
}

function parseIKU(fullText) {
  const start = fullText.indexOf("Tabel 4.2 IKU");
  const end = fullText.indexOf("Tabel 4.3 IKD", start);
  if (start < 0 || end < 0) return [];
  const chunk = fullText.slice(start, end);
  const lines = chunk.split("\n").map((l) => l.trim());
  const blocks = [];
  let cur = [];
  for (const line of lines) {
    if (!line || /^NO\s+INDIKATOR/i.test(line) || /^TARGET\s+TAHUN/i.test(line) || /^BASELINE/i.test(line))
      continue;
    if (/^Sumber:/i.test(line)) break;
    if (/^\d+\s+/.test(line) && cur.length) {
      blocks.push(cur.join(" "));
      cur = [line];
    } else if (/^\d+\s+/.test(line)) cur = [line];
    else if (cur.length) cur.push(line);
  }
  if (cur.length) blocks.push(cur.join(" "));

  const rows = [];
  for (const rawBlock of blocks) {
    const b = String(rawBlock)
      .replace(/(\s*\([^)]{2,120}\)\s*)+$/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    let tokens = b.split(/\s+/).filter(Boolean);
    if (!tokens.length || !/^\d+$/.test(tokens[0])) continue;
    const no = parseInt(tokens[0], 10);
    if (no < 1 || no > 25) continue;
    while (tokens.length > 2 && tokens[tokens.length - 1] === "2024") {
      tokens.pop();
    }
    const rest = tokens.slice(1);
    let valStart = -1;
    for (let s = 0; s <= rest.length - 7; s++) {
      const slice = rest.slice(s, s + 7);
      if (slice.every((t) => isYearCell(t) || t === "-" || t === "–")) {
        valStart = s;
        break;
      }
    }
    if (valStart < 0) continue;
    const vals = rest.slice(valStart, valStart + 7);
    if (vals.length < 6) continue;
    const baseline = vals.length >= 7 ? vals[0] : null;
    const off = vals.length >= 7 ? 1 : 0;
    const indikator = rest.slice(0, valStart).join(" ").trim();
    if (!indikator) continue;
    rows.push({
      no_urut: no,
      indikator,
      baseline_2024: baseline,
      target_2025: vals[off] ?? null,
      target_2026: vals[off + 1] ?? null,
      target_2027: vals[off + 2] ?? null,
      target_2028: vals[off + 3] ?? null,
      target_2029: vals[off + 4] ?? null,
      target_2030: vals[off + 5] ?? null,
    });
  }
  return rows;
}

function patchIkuRows(rows) {
  const byNo = new Map(rows.map((r) => [r.no_urut, r]));
  if (!byNo.has(2)) {
    rows.push({
      no_urut: 2,
      indikator: "Tingkat Kemiskinan (Persen)",
      baseline_2024: "6,32",
      target_2025: "4,95",
      target_2026: "-",
      target_2027: "3,00-4,50",
      target_2028: "2,00-3,00",
      target_2029: "1,00-2,00",
      target_2030: "0,92-1,92",
    });
  }
  const harm = rows.find((r) => r.no_urut === 18 && /Harmoni/i.test(r.indikator || ""));
  if (harm) {
    harm.indikator = "Indeks Harmoni Indonesia (Poin)";
    harm.baseline_2024 = "-";
    harm.target_2025 = "64,00";
    harm.target_2026 = "66,00";
    harm.target_2027 = "68,00";
    harm.target_2028 = "70,00";
    harm.target_2029 = "72,00";
    harm.target_2030 = "74,00";
  }
  rows.sort((a, b) => a.no_urut - b.no_urut);
  return rows;
}

module.exports = {
  parseTable228,
  parseTable229,
  parseTable31,
  parseArahKebijakan,
  parseIKU,
  patchIkuRows,
  isYearCell,
  trySplitApbdSingleLine,
};
