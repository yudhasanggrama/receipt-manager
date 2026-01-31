export type MoneyParse = {
  total?: number;
  cash?: number;
  change?: number;
  debug: string[];
};

/** Membersihkan token teks menjadi angka murni */
function normalizeMoneyToken(raw: string): number | null {
  const t = raw.replace(/[^\d.,]/g, "").replace(/,/g, ".");
  if (!t) return null;

  const parts = t.split(".");
  if (parts.length >= 2) {
    const last = parts[parts.length - 1];
    // Jika digit terakhir 3 angka, kemungkinan pemisah ribuan (10.000)
    if (last.length === 3) {
      const noSep = parts.join("");
      const n = Number(noSep);
      return Number.isFinite(n) ? n : null;
    }
  }

  const n = Number(t.replace(/\./g, ""));
  return Number.isFinite(n) ? n : null;
}

function pickMoneyCandidates(line: string): number[] {
  const tokens = line.match(/[\d][\d.,]*/g) ?? [];
  const nums = tokens
    .map(normalizeMoneyToken)
    .filter((x): x is number => typeof x === "number" && x >= 0);

  return Array.from(new Set(nums));
}

/** Fungsi utama mengekstrak Total, Cash, dan Change */
export function extractAndRepairTotals(ocrText: string): MoneyParse {
  const debug: string[] = [];
  const lines = ocrText.split("\n").map((l) => l.trim()).filter(Boolean);

  const totalLines = lines.filter((l) => /TOTAL/i.test(l));
  const cashLines = lines.filter((l) => /TUNAI|CASH/i.test(l));
  const changeLines = lines.filter((l) => /KEMBALI|CHANGE/i.test(l));

  const totalCand = totalLines.flatMap(pickMoneyCandidates);
  const cashCand = cashLines.flatMap(pickMoneyCandidates);
  const changeCand = changeLines.flatMap(pickMoneyCandidates);

  // Filter angka masuk akal (500 perak sampai 50 juta)
  const totalFiltered = totalCand.filter((n) => n >= 500 && n <= 50_000_000);
  const cashFiltered = cashCand.filter((n) => n >= 500 && n <= 50_000_000);
  const changeFiltered = changeCand.filter((n) => n >= 0 && n <= 50_000_000);

  const totals = totalFiltered.length ? totalFiltered : totalCand;
  const cashes = cashFiltered.length ? cashFiltered : cashCand;
  const changes = changeFiltered.length ? changeFiltered : changeCand;

  let best: { total?: number; cash?: number; change?: number; score: number } = { score: -1 };

  // Loop untuk mencari kombinasi angka paling logis (Total + Kembali = Tunai)
  for (const total of (totals.length ? totals : [undefined])) {
    for (const cash of (cashes.length ? cashes : [undefined])) {
      for (const change of (changes.length ? changes : [undefined])) {
        let score = 0;
        if (typeof total === "number") score += 2;
        if (typeof cash === "number") score += 1;
        
        if (typeof total === "number" && typeof cash === "number") {
          if (cash >= total) score += 3;
          const diff = cash - total;
          if (typeof change === "number") {
            const delta = Math.abs(diff - change);
            if (delta === 0) score += 10; // Kombinasi sempurna
            else if (delta <= 500) score += 7;
            else score -= 5;
          }
        }
        if (score > best.score) best = { total, cash, change, score };
      }
    }
  }

  return { 
    total: best.total, 
    cash: best.cash, 
    change: best.change ?? (best.cash && best.total ? best.cash - best.total : undefined), 
    debug 
  };
}