/**
 * Data Access Layer (DAL) for Sistem Laporan Keuangan Klinik Pratama Asih
 * Connects seamlessly to Node.js/Express SQLite backend if available,
 * or operates flawlessly with persistent LocalStorage/IndexedDB fallback.
 */

// Helper Currency Formatter according to strict specifications:
// Format: Rp1.520.000 (No space after Rp, dot as thousands separator, NO ,00)
function formatRupiah(val) {
  if (val === null || val === undefined || isNaN(val)) return 'Rp0';
  const num = Math.round(Number(val));
  const isNegative = num < 0;
  const absStr = Math.abs(num).toString();
  const formatted = absStr.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (isNegative ? '-Rp' : 'Rp') + formatted;
}

// Parse string from input to clean number
function parseRupiahInput(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  const cleaned = val.toString().replace(/[^0-9]/g, '');
  return cleaned ? parseInt(cleaned, 10) : 0;
}

// Format input element as user types
function bindRupiahInput(inputElement) {
  if (!inputElement) return;
  inputElement.addEventListener('input', function (e) {
    const raw = parseRupiahInput(this.value);
    this.dataset.rawValue = raw;
    this.value = raw > 0 ? raw.toLocaleString('id-ID') : '';
  });
}

// Fallback Initial Seed Dataset (matching exact specifications)
const DEFAULT_INITIAL_STORAGE = {
  users: [
    { id: 1, username: 'admin', nama_lengkap: 'dr. Ade Yurga Tonara (Pimpinan & Dokter Penanggung Jawab)', role: 'Pimpinan' },
    { id: 2, username: 'bendahara', nama_lengkap: 'Siti Rahmawati, S.E. (Bendahara Klinik)', role: 'Bendahara' }
  ],
  pengaturan: {
    nama_klinik: 'Klinik Pratama Asih',
    izin_operasional: 'NOMOR: 503/440/SIP-KLINIK/DPMPTSP/2024',
    motto: 'Kesehatan Anda Kebahagiaan Bersama',
    alamat: 'Jl. Raya Kesehatan No. 45, Kompleks Medika Center',
    telepon: '(021) 7890-1234 / 0812-3456-7890',
    pimpinan: 'dr. Ade Yurga Tonara',
    bendahara: 'Siti Rahmawati, S.E.',
    saldo_awal_tunai: 247000,
    saldo_awal_non_tunai: 42005
  },
  kategori: [
    { id: 1, nama: 'Obat', jenis: 'pengeluaran' },
    { id: 2, nama: 'BHP', jenis: 'pengeluaran' },
    { id: 3, nama: 'Listrik', jenis: 'pengeluaran' },
    { id: 4, nama: 'WiFi', jenis: 'pengeluaran' },
    { id: 5, nama: 'Apart', jenis: 'pengeluaran' },
    { id: 6, nama: 'ATK', jenis: 'pengeluaran' },
    { id: 7, nama: 'Klinik Pintar', jenis: 'pengeluaran' },
    { id: 8, nama: 'Akreditasi', jenis: 'pengeluaran' },
    { id: 9, nama: 'Sarpras', jenis: 'pengeluaran' },
    { id: 10, nama: 'Lainnya', jenis: 'pengeluaran' }
  ],
  // Prior Expenses to reach running total 15.460.200 (including today's Akreditasi 145.000)
  pengeluaran: [
    { id: 1, tanggal: '2026-09-03', kategori: 'Obat', keterangan: 'Pengadaan antibiotik, analgetik, dan multivitamin PBF Kimia Farma', nominal: 4850000, metode: 'Kas Tunai' },
    { id: 2, tanggal: '2026-09-05', kategori: 'BHP', keterangan: 'Pembelian spuit, infus set, abocath, alkohol swab, plester', nominal: 2150000, metode: 'Kas Tunai' },
    { id: 3, tanggal: '2026-09-08', kategori: 'Listrik', keterangan: 'Pembayaran tagihan listrik PLN ruang rawat inap & poli', nominal: 1820000, metode: 'Rekening Klinik' },
    { id: 4, tanggal: '2026-09-09', kategori: 'WiFi', keterangan: 'Tagihan internet IndiHome Dedicated 100 Mbps', nominal: 550000, metode: 'Rekening Klinik' },
    { id: 5, tanggal: '2026-09-12', kategori: 'Apart', keterangan: 'Refill & inspeksi tabung pemadam api APAR 4 unit', nominal: 425200, metode: 'Kas Tunai' },
    { id: 6, tanggal: '2026-09-14', kategori: 'ATK', keterangan: 'Kertas resep, map rekam medis, thermal struk, pulpen dokter', nominal: 380000, metode: 'Kas Tunai' },
    { id: 7, tanggal: '2026-09-15', kategori: 'Klinik Pintar', keterangan: 'Langganan SIM Klinik / E-Rekam Medis Klinik Pintar bulan September', nominal: 750000, metode: 'Rekening Klinik' },
    { id: 8, tanggal: '2026-09-17', kategori: 'Sarpras', keterangan: 'Perbaikan pendingin AC kamar pasien rawat inap 02 & filter air', nominal: 890000, metode: 'Kas Tunai' },
    { id: 9, tanggal: '2026-09-18', kategori: 'Obat', keterangan: 'Pengadaan emergency kit, cairan infus RL dan NaCl 0.9%', nominal: 3500000, metode: 'Kas Tunai' },
    { id: 10, tanggal: '2026-09-21', kategori: 'Akreditasi', keterangan: 'Konsumsi dan penggandaan berkas dokumen pokja akreditasi klinik', nominal: 145000, metode: 'Kas Tunai' }
  ],
  pemasukan: [
    { id: 1, tanggal: '2026-09-05', periode: '2026-09', rawat_jalan: 2850000, rawat_inap: 1950000, lab: 0, lainnya: 0, total: 4800000, metode: 'Tunai', nominal_tunai: 4800000, nominal_non_tunai: 0, keterangan: 'Pemasukan layanan shift pagi dan sore' },
    { id: 2, tanggal: '2026-09-12', periode: '2026-09', rawat_jalan: 3100000, rawat_inap: 2400000, lab: 0, lainnya: 150000, total: 5650000, metode: 'Campuran', nominal_tunai: 3650000, nominal_non_tunai: 2000000, keterangan: 'Pemasukan layanan poliklinik & kamar rawat inap' },
    { id: 3, tanggal: '2026-09-18', periode: '2026-09', rawat_jalan: 2900000, rawat_inap: 2100000, lab: 0, lainnya: 0, total: 5000000, metode: 'Campuran', nominal_tunai: 3500000, nominal_non_tunai: 1500000, keterangan: 'Pemasukan poli gigi dan rawat inap' },
    { id: 4, tanggal: '2026-09-21', periode: '2026-09', rawat_jalan: 1520000, rawat_inap: 990000, lab: 0, lainnya: 0, total: 2510000, metode: 'Campuran', nominal_tunai: 1510000, nominal_non_tunai: 1000000, keterangan: 'Pemasukan operasional harian 21 September 2026' }
  ],
  setoran: [
    { id: 1, tanggal: '2026-09-06', setoran_cash: 2500000, setoran_rekening: 1500000, total_setoran: 4000000, uang_laci: 20000, keterangan: 'Setoran minggu pertama' },
    { id: 2, tanggal: '2026-09-13', setoran_cash: 3000000, setoran_rekening: 2000000, total_setoran: 5000000, uang_laci: 25000, keterangan: 'Setoran minggu kedua' },
    { id: 3, tanggal: '2026-09-21', setoran_cash: 1350000, setoran_rekening: 1000000, total_setoran: 2350000, uang_laci: 15000, keterangan: 'Setoran kasir dan penerimaan transfer bank klinik 21 September 2026' }
  ]
};

const STORAGE_KEY = 'sistem_keuangan_klinik_db';

class ClinicDataService {
  constructor() {
    this.apiAvailable = null;
    this.baseUrl = window.location.origin;
    if (this.baseUrl.startsWith('file:')) {
      this.baseUrl = 'http://localhost:3000';
    }
    this.initLocalStorage();
  }

  initLocalStorage() {
    const existing = localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_STORAGE));
    } else {
      try {
        const parsed = JSON.parse(existing);
        if (parsed.pengaturan && (parsed.pengaturan.nama_klinik.includes('Medika') || !parsed.pengaturan.nama_klinik)) {
          parsed.pengaturan.nama_klinik = 'Klinik Pratama Asih';
          parsed.pengaturan.pimpinan = 'dr. Ade Yurga Tonara';
          parsed.pengaturan.motto = 'Kesehatan Anda Kebahagiaan Bersama';
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
      } catch (e) {}
    }
  }

  getLocalData() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      this.initLocalStorage();
      return JSON.parse(localStorage.getItem(STORAGE_KEY));
    }
    return JSON.parse(raw);
  }

  saveLocalData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  async checkServerHealth() {
    if (this.apiAvailable !== null) return this.apiAvailable;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${this.baseUrl}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);
      this.apiAvailable = res.ok;
    } catch (e) {
      this.apiAvailable = false;
    }
    return this.apiAvailable;
  }

  // Generic API caller with graceful local fallback
  async request(endpoint, options = {}) {
    const isOnline = await this.checkServerHealth();
    if (isOnline) {
      try {
        const res = await fetch(`${this.baseUrl}${endpoint}`, {
          headers: { 'Content-Type': 'application/json' },
          ...options
        });
        if (res.ok) {
          const json = await res.json();
          return json.data !== undefined ? json.data : json;
        }
      } catch (err) {
        console.warn('API call failed, falling back to local database engine:', err);
      }
    }
    return null;
  }

  // --- 1. SETTINGS ---
  async getSettings() {
    const serverData = await this.request('/api/pengaturan');
    if (serverData) return serverData;
    return this.getLocalData().pengaturan;
  }

  async updateSettings(payload) {
    const serverData = await this.request('/api/pengaturan', {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
    if (serverData) return serverData;

    const data = this.getLocalData();
    data.pengaturan = { ...data.pengaturan, ...payload };
    this.saveLocalData(data);
    return data.pengaturan;
  }

  // --- 2. DASHBOARD & SUMMARY ---
  async getDashboard(targetDate = '2026-09-21') {
    const serverData = await this.request(`/api/dashboard?tanggal=${targetDate}`);
    if (serverData) return serverData;

    const data = this.getLocalData();
    const settings = data.pengaturan;
    const targetMonth = targetDate.slice(0, 7);

    const pemasukanList = data.pemasukan || [];
    const pengeluaranList = data.pengeluaran || [];
    const setoranList = data.setoran || [];

    // Hari Ini
    const pemasukanHariIni = pemasukanList.filter(p => p.tanggal === targetDate);
    const pengeluaranHariIni = pengeluaranList.filter(p => p.tanggal === targetDate);
    const setoranHariIni = setoranList.filter(s => s.tanggal === targetDate);

    const totalPemasukanHariIni = pemasukanHariIni.reduce((acc, c) => acc + (c.total || 0), 0);
    const totalPengeluaranHariIni = pengeluaranHariIni.reduce((acc, c) => acc + (c.nominal || 0), 0);

    const rawatJalanHariIni = pemasukanHariIni.reduce((acc, c) => acc + (c.rawat_jalan || 0), 0);
    const rawatInapHariIni = pemasukanHariIni.reduce((acc, c) => acc + (c.rawat_inap || 0), 0);
    const labHariIni = pemasukanHariIni.reduce((acc, c) => acc + (c.lab || 0), 0);
    const lainnyaHariIni = pemasukanHariIni.reduce((acc, c) => acc + (c.lainnya || 0), 0);

    const setoranCashHariIni = setoranHariIni.reduce((acc, c) => acc + (c.setoran_cash || 0), 0);
    const setoranRekeningHariIni = setoranHariIni.reduce((acc, c) => acc + (c.setoran_rekening || 0), 0);
    const totalSetoranHariIni = setoranCashHariIni + setoranRekeningHariIni;
    const uangLaciHariIni = setoranHariIni.length ? setoranHariIni[0].uang_laci : 15000;

    // Bulan Ini
    const pemasukanBulanIni = pemasukanList.filter(p => p.tanggal.startsWith(targetMonth));
    const pengeluaranBulanIni = pengeluaranList.filter(p => p.tanggal.startsWith(targetMonth));
    const setoranBulanIni = setoranList.filter(s => s.tanggal.startsWith(targetMonth));

    const totalPemasukanBulanIni = pemasukanBulanIni.reduce((acc, c) => acc + (c.total || 0), 0);
    const totalPengeluaranBulanIni = pengeluaranBulanIni.reduce((acc, c) => acc + (c.nominal || 0), 0);
    const selisihBulanIni = totalPemasukanBulanIni - totalPengeluaranBulanIni;

    const totalRawatJalanBulanIni = pemasukanBulanIni.reduce((acc, c) => acc + (c.rawat_jalan || 0), 0);
    const totalRawatInapBulanIni = pemasukanBulanIni.reduce((acc, c) => acc + (c.rawat_inap || 0), 0);
    const totalLabBulanIni = pemasukanBulanIni.reduce((acc, c) => acc + (c.lab || 0), 0);
    const totalLainnyaBulanIni = pemasukanBulanIni.reduce((acc, c) => acc + (c.lainnya || 0), 0);
    const totalSetoranBulanIni = setoranBulanIni.reduce((acc, c) => acc + (c.total_setoran || 0), 0);

    // Laporan Berjalan
    const totalPengeluaranBerjalan = pengeluaranList.reduce((acc, c) => acc + (c.nominal || 0), 0);
    const totalLabBerjalan = pemasukanList.reduce((acc, c) => acc + (c.lab || 0), 0);

    // Saldo
    let saldoKasTunai = (settings.saldo_awal_tunai || 0);
    let saldoKasNonTunai = (settings.saldo_awal_non_tunai || 0);

    pemasukanList.forEach(p => {
      saldoKasTunai += (p.nominal_tunai || 0);
      saldoKasNonTunai += (p.nominal_non_tunai || 0);
    });

    pengeluaranList.forEach(e => {
      if (e.metode === 'Kas Tunai') {
        saldoKasTunai -= (e.nominal || 0);
      } else {
        saldoKasNonTunai -= (e.nominal || 0);
      }
    });

    const totalSaldoKas = saldoKasTunai + saldoKasNonTunai;

    return {
      tanggal: targetDate,
      bulan: targetMonth,
      hariIni: {
        totalPemasukan: totalPemasukanHariIni,
        totalPengeluaran: totalPengeluaranHariIni,
        rawatJalan: rawatJalanHariIni,
        rawatInap: rawatInapHariIni,
        lab: labHariIni,
        lainnya: lainnyaHariIni,
        setoranCash: setoranCashHariIni,
        setoranRekening: setoranRekeningHariIni,
        totalSetoran: totalSetoranHariIni,
        uangLaci: uangLaciHariIni
      },
      bulanIni: {
        totalPemasukan: totalPemasukanBulanIni,
        totalPengeluaran: totalPengeluaranBulanIni,
        selisih: selisihBulanIni,
        rawatJalan: totalRawatJalanBulanIni,
        rawatInap: totalRawatInapBulanIni,
        lab: totalLabBulanIni,
        lainnya: totalLainnyaBulanIni,
        totalSetoran: totalSetoranBulanIni
      },
      laporanBerjalan: {
        totalLab: totalLabBerjalan,
        totalPengeluaranBerjalan: totalPengeluaranBerjalan
      },
      saldo: {
        saldoKasTunai,
        saldoKasNonTunai,
        totalSaldoKas
      }
    };
  }

  // --- 3. CHARTS DATA ---
  async getCharts(bulan = '2026-09') {
    const serverData = await this.request(`/api/charts?bulan=${bulan}`);
    if (serverData) return serverData;

    const data = this.getLocalData();
    const pemasukanList = (data.pemasukan || []).filter(p => p.tanggal.startsWith(bulan));
    const pengeluaranList = (data.pengeluaran || []).filter(e => e.tanggal.startsWith(bulan));

    const dailyMap = {};
    for (let day = 1; day <= 31; day++) {
      const dayStr = `${bulan}-${String(day).padStart(2, '0')}`;
      dailyMap[dayStr] = { pemasukan: 0, pengeluaran: 0 };
    }

    pemasukanList.forEach(p => {
      if (dailyMap[p.tanggal]) dailyMap[p.tanggal].pemasukan += (p.total || 0);
    });

    pengeluaranList.forEach(e => {
      if (dailyMap[e.tanggal]) dailyMap[e.tanggal].pengeluaran += (e.nominal || 0);
    });

    const activeDates = Object.keys(dailyMap).sort().filter(d => dailyMap[d].pemasukan > 0 || dailyMap[d].pengeluaran > 0);
    const labelsDaily = activeDates.length > 0 ? activeDates : Object.keys(dailyMap).slice(0, 21);

    const monthNames = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
    const friendlyLabels = labelsDaily.map(d => {
      const parts = d.split('-');
      return `${parts[2]} ${monthNames[parseInt(parts[1], 10) - 1]}`;
    });

    let rj = 0, ri = 0, lab = 0, lainnya = 0;
    pemasukanList.forEach(p => {
      rj += p.rawat_jalan || 0;
      ri += p.rawat_inap || 0;
      lab += p.lab || 0;
      lainnya += p.lainnya || 0;
    });

    const catExpense = {};
    pengeluaranList.forEach(e => {
      catExpense[e.kategori] = (catExpense[e.kategori] || 0) + (e.nominal || 0);
    });

    return {
      daily: {
        labels: friendlyLabels,
        pemasukan: labelsDaily.map(d => dailyMap[d] ? dailyMap[d].pemasukan : 0),
        pengeluaran: labelsDaily.map(d => dailyMap[d] ? dailyMap[d].pengeluaran : 0)
      },
      incomeBySource: {
        labels: ['Rawat Jalan', 'Rawat Inap', 'Laboratorium', 'Pemasukan Lainnya'],
        data: [rj, ri, lab, lainnya]
      },
      expenseByCategory: {
        labels: Object.keys(catExpense),
        data: Object.values(catExpense)
      }
    };
  }

  // --- 4. PEMASUKAN CRUD ---
  async getPemasukan(filter = {}) {
    const serverData = await this.request('/api/pemasukan');
    if (serverData) return serverData;
    let list = this.getLocalData().pemasukan || [];
    if (filter.tanggal) list = list.filter(p => p.tanggal === filter.tanggal);
    if (filter.periode) list = list.filter(p => p.periode === filter.periode);
    return list.sort((a, b) => (b.tanggal > a.tanggal ? 1 : -1));
  }

  async addPemasukan(payload) {
    const rawat_jalan = Math.max(0, parseFloat(payload.rawat_jalan || 0));
    const rawat_inap = Math.max(0, parseFloat(payload.rawat_inap || 0));
    const lab = Math.max(0, parseFloat(payload.lab || 0));
    const lainnya = Math.max(0, parseFloat(payload.lainnya || 0));
    const total = rawat_jalan + rawat_inap + lab + lainnya;
    const periode = payload.periode || payload.tanggal.slice(0, 7);

    let nominal_tunai = parseFloat(payload.nominal_tunai || 0);
    let nominal_non_tunai = parseFloat(payload.nominal_non_tunai || 0);
    const metode = payload.metode || 'Tunai';

    if (metode === 'Tunai') {
      nominal_tunai = total;
      nominal_non_tunai = 0;
    } else if (metode === 'Non-Tunai / Rekening' || metode === 'Non-Tunai') {
      nominal_tunai = 0;
      nominal_non_tunai = total;
    } else {
      if (nominal_tunai + nominal_non_tunai !== total) {
        nominal_tunai = total;
        nominal_non_tunai = 0;
      }
    }

    const cleanPayload = {
      ...payload,
      rawat_jalan,
      rawat_inap,
      lab,
      lainnya,
      total,
      periode,
      metode,
      nominal_tunai,
      nominal_non_tunai
    };

    const serverData = await this.request('/api/pemasukan', {
      method: 'POST',
      body: JSON.stringify(cleanPayload)
    });
    if (serverData) return serverData;

    const data = this.getLocalData();
    const newId = data.pemasukan.length ? Math.max(...data.pemasukan.map(p => p.id)) + 1 : 1;
    const record = { id: newId, ...cleanPayload, created_at: new Date().toISOString() };
    data.pemasukan.unshift(record);
    this.saveLocalData(data);
    return record;
  }

  async updatePemasukan(id, payload) {
    const rawat_jalan = Math.max(0, parseFloat(payload.rawat_jalan || 0));
    const rawat_inap = Math.max(0, parseFloat(payload.rawat_inap || 0));
    const lab = Math.max(0, parseFloat(payload.lab || 0));
    const lainnya = Math.max(0, parseFloat(payload.lainnya || 0));
    const total = rawat_jalan + rawat_inap + lab + lainnya;
    const periode = payload.periode || payload.tanggal.slice(0, 7);

    let nominal_tunai = parseFloat(payload.nominal_tunai || 0);
    let nominal_non_tunai = parseFloat(payload.nominal_non_tunai || 0);
    const metode = payload.metode || 'Tunai';

    if (metode === 'Tunai') {
      nominal_tunai = total;
      nominal_non_tunai = 0;
    } else if (metode === 'Non-Tunai / Rekening' || metode === 'Non-Tunai') {
      nominal_tunai = 0;
      nominal_non_tunai = total;
    }

    const cleanPayload = {
      ...payload,
      rawat_jalan,
      rawat_inap,
      lab,
      lainnya,
      total,
      periode,
      metode,
      nominal_tunai,
      nominal_non_tunai
    };

    const serverData = await this.request(`/api/pemasukan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanPayload)
    });
    if (serverData) return serverData;

    const data = this.getLocalData();
    const idx = data.pemasukan.findIndex(p => p.id === Number(id));
    if (idx !== -1) {
      data.pemasukan[idx] = { ...data.pemasukan[idx], ...cleanPayload };
      this.saveLocalData(data);
      return data.pemasukan[idx];
    }
    return null;
  }

  async deletePemasukan(id) {
    const serverData = await this.request(`/api/pemasukan/${id}`, { method: 'DELETE' });
    if (serverData) return true;

    const data = this.getLocalData();
    data.pemasukan = data.pemasukan.filter(p => p.id !== Number(id));
    this.saveLocalData(data);
    return true;
  }

  // --- 5. PENGELUARAN CRUD ---
  async getPengeluaran(filter = {}) {
    const serverData = await this.request('/api/pengeluaran');
    if (serverData) return serverData;
    let list = this.getLocalData().pengeluaran || [];
    if (filter.tanggal) list = list.filter(e => e.tanggal === filter.tanggal);
    if (filter.kategori) list = list.filter(e => e.kategori === filter.kategori);
    return list.sort((a, b) => (b.tanggal > a.tanggal ? 1 : -1));
  }

  async addPengeluaran(payload) {
    const nominal = Math.max(0, parseFloat(payload.nominal || 0));
    const cleanPayload = { ...payload, nominal, metode: payload.metode || 'Kas Tunai' };

    const serverData = await this.request('/api/pengeluaran', {
      method: 'POST',
      body: JSON.stringify(cleanPayload)
    });
    if (serverData) return serverData;

    const data = this.getLocalData();
    const newId = data.pengeluaran.length ? Math.max(...data.pengeluaran.map(e => e.id)) + 1 : 1;
    const record = { id: newId, ...cleanPayload, created_at: new Date().toISOString() };
    data.pengeluaran.unshift(record);
    this.saveLocalData(data);
    return record;
  }

  async updatePengeluaran(id, payload) {
    const nominal = Math.max(0, parseFloat(payload.nominal || 0));
    const cleanPayload = { ...payload, nominal, metode: payload.metode || 'Kas Tunai' };

    const serverData = await this.request(`/api/pengeluaran/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanPayload)
    });
    if (serverData) return serverData;

    const data = this.getLocalData();
    const idx = data.pengeluaran.findIndex(e => e.id === Number(id));
    if (idx !== -1) {
      data.pengeluaran[idx] = { ...data.pengeluaran[idx], ...cleanPayload };
      this.saveLocalData(data);
      return data.pengeluaran[idx];
    }
    return null;
  }

  async deletePengeluaran(id) {
    const serverData = await this.request(`/api/pengeluaran/${id}`, { method: 'DELETE' });
    if (serverData) return true;

    const data = this.getLocalData();
    data.pengeluaran = data.pengeluaran.filter(e => e.id !== Number(id));
    this.saveLocalData(data);
    return true;
  }

  // --- 6. SETORAN CRUD ---
  async getSetoran(filter = {}) {
    const serverData = await this.request('/api/setoran');
    if (serverData) return serverData;
    let list = this.getLocalData().setoran || [];
    if (filter.tanggal) list = list.filter(s => s.tanggal === filter.tanggal);
    return list.sort((a, b) => (b.tanggal > a.tanggal ? 1 : -1));
  }

  async addSetoran(payload) {
    const setoran_cash = Math.max(0, parseFloat(payload.setoran_cash || 0));
    const setoran_rekening = Math.max(0, parseFloat(payload.setoran_rekening || 0));
    const total_setoran = setoran_cash + setoran_rekening;
    const uang_laci = Math.max(0, parseFloat(payload.uang_laci || 0));

    const cleanPayload = {
      ...payload,
      setoran_cash,
      setoran_rekening,
      total_setoran,
      uang_laci
    };

    const serverData = await this.request('/api/setoran', {
      method: 'POST',
      body: JSON.stringify(cleanPayload)
    });
    if (serverData) return serverData;

    const data = this.getLocalData();
    const newId = data.setoran.length ? Math.max(...data.setoran.map(s => s.id)) + 1 : 1;
    const record = { id: newId, ...cleanPayload, created_at: new Date().toISOString() };
    data.setoran.unshift(record);
    this.saveLocalData(data);
    return record;
  }

  async updateSetoran(id, payload) {
    const setoran_cash = Math.max(0, parseFloat(payload.setoran_cash || 0));
    const setoran_rekening = Math.max(0, parseFloat(payload.setoran_rekening || 0));
    const total_setoran = setoran_cash + setoran_rekening;
    const uang_laci = Math.max(0, parseFloat(payload.uang_laci || 0));

    const cleanPayload = {
      ...payload,
      setoran_cash,
      setoran_rekening,
      total_setoran,
      uang_laci
    };

    const serverData = await this.request(`/api/setoran/${id}`, {
      method: 'PUT',
      body: JSON.stringify(cleanPayload)
    });
    if (serverData) return serverData;

    const data = this.getLocalData();
    const idx = data.setoran.findIndex(s => s.id === Number(id));
    if (idx !== -1) {
      data.setoran[idx] = { ...data.setoran[idx], ...cleanPayload };
      this.saveLocalData(data);
      return data.setoran[idx];
    }
    return null;
  }

  async deleteSetoran(id) {
    const serverData = await this.request(`/api/setoran/${id}`, { method: 'DELETE' });
    if (serverData) return true;

    const data = this.getLocalData();
    data.setoran = data.setoran.filter(s => s.id !== Number(id));
    this.saveLocalData(data);
    return true;
  }

  // --- 7. UNIFIED TRANSAKSI ---
  async getTransaksi(filter = {}) {
    const serverData = await this.request('/api/transaksi');
    let unified = serverData;

    if (!unified) {
      const data = this.getLocalData();
      unified = [];

      (data.pemasukan || []).forEach(p => {
        unified.push({
          id: `inc-${p.id}`,
          rawId: p.id,
          tanggal: p.tanggal,
          jenis: 'Pemasukan',
          kategori: p.rawat_jalan > 0 && p.rawat_inap === 0 ? 'Rawat Jalan' :
                    p.rawat_inap > 0 && p.rawat_jalan === 0 ? 'Rawat Inap' :
                    p.lab > 0 && p.rawat_jalan === 0 ? 'Lab' : 'Pemasukan Layanan',
          keterangan: p.keterangan || `Rawat Jalan: ${formatRupiah(p.rawat_jalan)}, Rawat Inap: ${formatRupiah(p.rawat_inap)}`,
          pemasukan: p.total,
          pengeluaran: 0,
          metode: p.metode || 'Tunai',
          nominal: p.total,
          detail: p
        });
      });

      (data.pengeluaran || []).forEach(e => {
        unified.push({
          id: `exp-${e.id}`,
          rawId: e.id,
          tanggal: e.tanggal,
          jenis: 'Pengeluaran',
          kategori: e.kategori,
          keterangan: e.keterangan,
          pemasukan: 0,
          pengeluaran: e.nominal,
          metode: e.metode || 'Kas Tunai',
          nominal: e.nominal,
          detail: e
        });
      });

      (data.setoran || []).forEach(s => {
        unified.push({
          id: `set-${s.id}`,
          rawId: s.id,
          tanggal: s.tanggal,
          jenis: 'Setoran',
          kategori: 'Setoran Kasir',
          keterangan: s.keterangan ? `${s.keterangan} (Laci: ${formatRupiah(s.uang_laci || 0)})` : `Setoran Kas & Rekening (Laci: ${formatRupiah(s.uang_laci || 0)})`,
          pemasukan: s.total_setoran,
          pengeluaran: 0,
          metode: 'Cash & Rekening',
          nominal: s.total_setoran,
          detail: s
        });
      });
    }

    unified.sort((a, b) => (b.tanggal > a.tanggal ? 1 : b.tanggal < a.tanggal ? -1 : 0));

    let filtered = unified;
    if (filter.jenis && filter.jenis !== 'Semua') {
      filtered = filtered.filter(t => t.jenis.toLowerCase() === filter.jenis.toLowerCase());
    }
    if (filter.kategori && filter.kategori !== 'Semua') {
      filtered = filtered.filter(t => t.kategori.toLowerCase() === filter.kategori.toLowerCase());
    }
    if (filter.startDate) {
      filtered = filtered.filter(t => t.tanggal >= filter.startDate);
    }
    if (filter.endDate) {
      filtered = filtered.filter(t => t.tanggal <= filter.endDate);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      filtered = filtered.filter(t =>
        (t.keterangan || '').toLowerCase().includes(q) ||
        (t.kategori || '').toLowerCase().includes(q) ||
        (t.metode || '').toLowerCase().includes(q) ||
        (t.tanggal || '').includes(q)
      );
    }

    return filtered;
  }

  // --- 8. LAPORAN BULANAN ---
  async getMonthlyReport(bulan = '2026-09') {
    const summary = await this.getDashboard(`${bulan}-21`);
    const pemasukan = (await this.getPemasukan()).filter(p => p.tanggal.startsWith(bulan));
    const pengeluaran = (await this.getPengeluaran()).filter(e => e.tanggal.startsWith(bulan));
    const setoran = (await this.getSetoran()).filter(s => s.tanggal.startsWith(bulan));

    return {
      bulan,
      summary: summary.bulanIni,
      saldo: summary.saldo,
      laporanBerjalan: summary.laporanBerjalan,
      pemasukan,
      pengeluaran,
      setoran
    };
  }

  // --- 9. RESET TO DEFAULT SEED ---
  resetToDefault() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_INITIAL_STORAGE));
    return true;
  }
}

// Global Singleton Instance
window.clinicDB = new ClinicDataService();
