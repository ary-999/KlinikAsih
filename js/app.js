/**
 * Main Application Controller for Sistem Laporan Keuangan Klinik
 * Handles UI State, SPA routing, form validations, and live updates
 */

class ClinicApp {
  constructor() {
    this.currentView = 'dashboard';
    this.selectedDate = '2026-09-21';
    this.selectedMonth = '2026-09';
    this.txFilter = {
      jenis: 'Semua',
      kategori: 'Semua',
      startDate: '',
      endDate: '',
      search: ''
    };
    this.pagination = {
      page: 1,
      limit: 10,
      total: 0
    };
    this.activeEditItem = null;
    this.itemToDelete = null;
  }

  async init() {
    this.bindEvents();
    this.initFormCalculators();
    await this.refreshGlobalData();
    this.showView('dashboard');
    console.log('🏥 Sistem Laporan Keuangan Klinik siap digunakan.');
  }

  // --- VIEW ROUTING ---
  showView(viewName) {
    this.currentView = viewName;

    // Update active nav button in sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
      const target = link.getAttribute('data-view');
      if (target === viewName) {
        link.classList.add('bg-emerald-700', 'text-white', 'shadow');
        link.classList.remove('text-emerald-100', 'hover:bg-emerald-800');
      } else {
        link.classList.remove('bg-emerald-700', 'text-white', 'shadow');
        link.classList.add('text-emerald-100', 'hover:bg-emerald-800');
      }
    });

    // Hide all views, show current
    document.querySelectorAll('.view-section').forEach(sec => {
      sec.classList.add('hidden');
    });

    const activeSection = document.getElementById(`view-${viewName}`);
    if (activeSection) {
      activeSection.classList.remove('hidden');
    }

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    if (sidebar && !sidebar.classList.contains('-translate-x-full') && window.innerWidth < 1024) {
      sidebar.classList.add('-translate-x-full');
    }

    // Refresh specific view data
    this.loadCurrentViewData();
  }

  async loadCurrentViewData() {
    switch (this.currentView) {
      case 'dashboard':
        await this.renderDashboard();
        break;
      case 'pemasukan':
        await this.renderPemasukanTable();
        break;
      case 'pengeluaran':
        await this.renderPengeluaranTable();
        break;
      case 'setoran':
        await this.renderSetoranTable();
        break;
      case 'saldo':
        await this.renderSaldoView();
        break;
      case 'laporan-harian':
        await this.renderLaporanHarian();
        break;
      case 'laporan-bulanan':
        await this.renderLaporanBulanan();
        break;
      case 'transaksi':
        await this.renderTransaksiTable();
        break;
      case 'pengaturan':
        await this.renderPengaturan();
        break;
    }
  }

  async refreshGlobalData() {
    // Updates header stats & quick metrics
    const summary = await window.clinicDB.getDashboard(this.selectedDate);
    const settings = await window.clinicDB.getSettings();

    // Update Clinic Names in Header & Sidebar
    document.querySelectorAll('.clinic-name-label').forEach(el => el.textContent = settings.nama_klinik);
    document.querySelectorAll('.clinic-address-label').forEach(el => el.textContent = settings.alamat);
    document.querySelectorAll('.clinic-pimpinan-label').forEach(el => el.textContent = settings.pimpinan);

    // Update Global Saldo Pills if any
    const globalSaldoKas = document.getElementById('header-total-saldo');
    if (globalSaldoKas) {
      globalSaldoKas.textContent = formatRupiah(summary.saldo.totalSaldoKas);
    }
  }

  // --- 1. DASHBOARD ---
  async renderDashboard() {
    const summary = await window.clinicDB.getDashboard(this.selectedDate);

    // 7 Stat Cards
    document.getElementById('card-pemasukan-hari-ini').textContent = formatRupiah(summary.hariIni.totalPemasukan);
    document.getElementById('card-pengeluaran-hari-ini').textContent = formatRupiah(summary.hariIni.totalPengeluaran);
    document.getElementById('card-pemasukan-bulan-ini').textContent = formatRupiah(summary.bulanIni.totalPemasukan);
    document.getElementById('card-pengeluaran-bulan-ini').textContent = formatRupiah(summary.bulanIni.totalPengeluaran);
    
    document.getElementById('card-saldo-tunai').textContent = formatRupiah(summary.saldo.saldoKasTunai);
    document.getElementById('card-saldo-non-tunai').textContent = formatRupiah(summary.saldo.saldoKasNonTunai);
    document.getElementById('card-total-saldo').textContent = formatRupiah(summary.saldo.totalSaldoKas);

    // Laporan Berjalan Indicators
    document.getElementById('card-total-lab-berjalan').textContent = formatRupiah(summary.laporanBerjalan.totalLab);
    document.getElementById('card-total-pengeluaran-berjalan').textContent = formatRupiah(summary.laporanBerjalan.totalPengeluaranBerjalan);

    // Today's Detailed Highlights
    document.getElementById('highlight-rj-hari-ini').textContent = formatRupiah(summary.hariIni.rawatJalan);
    document.getElementById('highlight-ri-hari-ini').textContent = formatRupiah(summary.hariIni.rawatInap);
    document.getElementById('highlight-lab-hari-ini').textContent = formatRupiah(summary.hariIni.lab);
    document.getElementById('highlight-lainnya-hari-ini').textContent = formatRupiah(summary.hariIni.lainnya);

    document.getElementById('highlight-setoran-cash').textContent = formatRupiah(summary.hariIni.setoranCash);
    document.getElementById('highlight-setoran-rekening').textContent = formatRupiah(summary.hariIni.setoranRekening);
    document.getElementById('highlight-total-setoran').textContent = formatRupiah(summary.hariIni.totalSetoran);
    document.getElementById('highlight-uang-laci').textContent = formatRupiah(summary.hariIni.uangLaci);

    // Render Charts
    window.clinicCharts.renderCharts(this.selectedMonth);
  }

  // --- 2. PEMASUKAN ---
  async renderPemasukanTable() {
    const list = await window.clinicDB.getPemasukan();
    const tbody = document.getElementById('table-pemasukan-body');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center py-8 text-slate-400">Belum ada data pemasukan tercatat</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-4 font-medium text-slate-800">${item.tanggal}</td>
        <td class="py-3 px-4 font-rupiah text-right text-emerald-700">${formatRupiah(item.rawat_jalan)}</td>
        <td class="py-3 px-4 font-rupiah text-right text-emerald-700">${formatRupiah(item.rawat_inap)}</td>
        <td class="py-3 px-4 font-rupiah text-right text-slate-600">${formatRupiah(item.lab)}</td>
        <td class="py-3 px-4 font-rupiah text-right text-slate-600">${formatRupiah(item.lainnya)}</td>
        <td class="py-3 px-4 font-rupiah text-right font-bold text-emerald-800">${formatRupiah(item.total)}</td>
        <td class="py-3 px-4 text-center">
          <span class="inline-block px-2.5 py-1 text-xs rounded-full font-medium ${item.metode === 'Tunai' ? 'bg-amber-100 text-amber-800' : item.metode === 'Campuran' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}">
            ${item.metode || 'Tunai'}
          </span>
        </td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center space-x-2">
            <button onclick="app.openEditModal('pemasukan', ${item.id})" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="app.confirmDelete('pemasukan', ${item.id}, 'Pemasukan tanggal ${item.tanggal} (${formatRupiah(item.total)})')" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // --- 3. PENGELUARAN ---
  async renderPengeluaranTable() {
    const list = await window.clinicDB.getPengeluaran();
    const tbody = document.getElementById('table-pengeluaran-body');
    if (!tbody) return;

    const totalEl = document.getElementById('total-pengeluaran-badge');
    const sum = list.reduce((acc, c) => acc + (c.nominal || 0), 0);
    if (totalEl) totalEl.textContent = formatRupiah(sum);

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center py-8 text-slate-400">Belum ada data pengeluaran tercatat</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-4 font-medium text-slate-800">${item.tanggal}</td>
        <td class="py-3 px-4">
          <span class="inline-block px-2.5 py-1 text-xs rounded-full font-semibold bg-rose-100 text-rose-700">
            ${item.kategori}
          </span>
        </td>
        <td class="py-3 px-4 text-slate-600 text-sm">${item.keterangan || '-'}</td>
        <td class="py-3 px-4 text-center">
          <span class="inline-block px-2 py-0.5 text-xs rounded font-medium bg-slate-100 text-slate-700">
            ${item.metode || 'Kas Tunai'}
          </span>
        </td>
        <td class="py-3 px-4 font-rupiah text-right font-bold text-rose-700">${formatRupiah(item.nominal)}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center space-x-2">
            <button onclick="app.openEditModal('pengeluaran', ${item.id})" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="app.confirmDelete('pengeluaran', ${item.id}, 'Pengeluaran ${item.kategori} (${formatRupiah(item.nominal)})')" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // --- 4. SETORAN ---
  async renderSetoranTable() {
    const list = await window.clinicDB.getSetoran();
    const tbody = document.getElementById('table-setoran-body');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Belum ada data setoran kasir tercatat</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-4 font-medium text-slate-800">${item.tanggal}</td>
        <td class="py-3 px-4 font-rupiah text-right text-slate-700">${formatRupiah(item.setoran_cash)}</td>
        <td class="py-3 px-4 font-rupiah text-right text-blue-700">${formatRupiah(item.setoran_rekening)}</td>
        <td class="py-3 px-4 font-rupiah text-right font-bold text-sky-800">${formatRupiah(item.total_setoran)}</td>
        <td class="py-3 px-4 font-rupiah text-right text-amber-700 font-semibold">${formatRupiah(item.uang_laci)}</td>
        <td class="py-3 px-4 text-slate-500 text-sm">${item.keterangan || '-'}</td>
        <td class="py-3 px-4 text-center">
          <div class="flex items-center justify-center space-x-2">
            <button onclick="app.openEditModal('setoran', ${item.id})" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="app.confirmDelete('setoran', ${item.id}, 'Setoran tanggal ${item.tanggal} (${formatRupiah(item.total_setoran)})')" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // --- 5. SALDO KAS VIEW ---
  async renderSaldoView() {
    const summary = await window.clinicDB.getDashboard(this.selectedDate);
    const settings = await window.clinicDB.getSettings();

    document.getElementById('saldo-view-tunai').textContent = formatRupiah(summary.saldo.saldoKasTunai);
    document.getElementById('saldo-view-non-tunai').textContent = formatRupiah(summary.saldo.saldoKasNonTunai);
    document.getElementById('saldo-view-total').textContent = formatRupiah(summary.saldo.totalSaldoKas);

    document.getElementById('saldo-awal-tunai-disp').textContent = formatRupiah(settings.saldo_awal_tunai || 0);
    document.getElementById('saldo-awal-non-tunai-disp').textContent = formatRupiah(settings.saldo_awal_non_tunai || 0);

    // Audit Trail: Render recent movements
    const transactions = await window.clinicDB.getTransaksi();
    const trailBody = document.getElementById('saldo-audit-trail');
    if (trailBody) {
      trailBody.innerHTML = transactions.slice(0, 15).map(t => `
        <tr class="border-b border-slate-100 hover:bg-slate-50">
          <td class="py-2.5 px-4 text-sm font-medium text-slate-700">${t.tanggal}</td>
          <td class="py-2.5 px-4 text-sm">
            <span class="px-2 py-0.5 text-xs rounded-full font-semibold ${t.jenis === 'Pemasukan' ? 'bg-emerald-100 text-emerald-800' : t.jenis === 'Pengeluaran' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'}">
              ${t.jenis}
            </span>
          </td>
          <td class="py-2.5 px-4 text-sm text-slate-600">${t.kategori} &bull; ${t.keterangan}</td>
          <td class="py-2.5 px-4 text-sm text-slate-600">${t.metode}</td>
          <td class="py-2.5 px-4 text-sm text-right font-rupiah font-bold ${t.pemasukan > 0 ? 'text-emerald-700' : 'text-rose-700'}">
            ${t.pemasukan > 0 ? '+' + formatRupiah(t.pemasukan) : '-' + formatRupiah(t.pengeluaran)}
          </td>
        </tr>
      `).join('');
    }
  }

  // --- 6. LAPORAN HARIAN ---
  async renderLaporanHarian() {
    const targetDate = document.getElementById('daily-filter-date').value || this.selectedDate;
    const summary = await window.clinicDB.getDashboard(targetDate);
    const pemasukan = (await window.clinicDB.getPemasukan()).filter(p => p.tanggal === targetDate);
    const pengeluaran = (await window.clinicDB.getPengeluaran()).filter(e => e.tanggal === targetDate);
    const setoran = (await window.clinicDB.getSetoran()).filter(s => s.tanggal === targetDate);

    // Fill numbers
    document.getElementById('daily-title-date').textContent = targetDate;
    document.getElementById('daily-sum-pemasukan').textContent = formatRupiah(summary.hariIni.totalPemasukan);
    document.getElementById('daily-sum-pengeluaran').textContent = formatRupiah(summary.hariIni.totalPengeluaran);
    document.getElementById('daily-sum-selisih').textContent = formatRupiah(summary.hariIni.totalPemasukan - summary.hariIni.totalPengeluaran);

    document.getElementById('daily-rj').textContent = formatRupiah(summary.hariIni.rawatJalan);
    document.getElementById('daily-ri').textContent = formatRupiah(summary.hariIni.rawatInap);
    document.getElementById('daily-lab').textContent = formatRupiah(summary.hariIni.lab);
    document.getElementById('daily-lainnya').textContent = formatRupiah(summary.hariIni.lainnya);

    document.getElementById('daily-setoran-cash').textContent = formatRupiah(summary.hariIni.setoranCash);
    document.getElementById('daily-setoran-rekening').textContent = formatRupiah(summary.hariIni.setoranRekening);
    document.getElementById('daily-total-setoran').textContent = formatRupiah(summary.hariIni.totalSetoran);
    document.getElementById('daily-uang-laci').textContent = formatRupiah(summary.hariIni.uangLaci);

    // Expense Table in Daily Report
    const tbodyExp = document.getElementById('daily-table-expense');
    if (tbodyExp) {
      if (pengeluaran.length === 0) {
        tbodyExp.innerHTML = `<tr><td colspan="4" class="text-center py-4 text-slate-400">Tidak ada pengeluaran pada tanggal ini</td></tr>`;
      } else {
        tbodyExp.innerHTML = pengeluaran.map(e => `
          <tr class="border-b border-slate-100">
            <td class="py-2 px-3 font-semibold text-rose-700">${e.kategori}</td>
            <td class="py-2 px-3 text-slate-600">${e.keterangan || '-'}</td>
            <td class="py-2 px-3 text-center text-xs text-slate-500">${e.metode}</td>
            <td class="py-2 px-3 text-right font-rupiah font-bold text-rose-700">${formatRupiah(e.nominal)}</td>
          </tr>
        `).join('');
      }
    }
  }

  // --- 7. LAPORAN BULANAN ---
  async renderLaporanBulanan() {
    const month = document.getElementById('monthly-filter-month').value || this.selectedMonth;
    const report = await window.clinicDB.getMonthlyReport(month);

    // 10 Key Monthly Metrics
    document.getElementById('m-total-pemasukan').textContent = formatRupiah(report.summary.totalPemasukan);
    document.getElementById('m-total-pengeluaran').textContent = formatRupiah(report.summary.totalPengeluaran);
    
    const selisihEl = document.getElementById('m-selisih');
    selisihEl.textContent = formatRupiah(report.summary.selisih);
    selisihEl.className = `text-2xl font-bold font-rupiah ${report.summary.selisih >= 0 ? 'text-emerald-700' : 'text-rose-700'}`;

    document.getElementById('m-rawat-jalan').textContent = formatRupiah(report.summary.rawatJalan);
    document.getElementById('m-rawat-inap').textContent = formatRupiah(report.summary.rawatInap);
    document.getElementById('m-lab').textContent = formatRupiah(report.summary.lab);
    document.getElementById('m-total-setoran').textContent = formatRupiah(report.summary.totalSetoran);
    
    document.getElementById('m-kas-tunai').textContent = formatRupiah(report.saldo.saldoKasTunai);
    document.getElementById('m-kas-non-tunai').textContent = formatRupiah(report.saldo.saldoKasNonTunai);
    document.getElementById('m-total-saldo').textContent = formatRupiah(report.saldo.totalSaldoKas);

    // Monthly Transactions Table
    const transactions = await window.clinicDB.getTransaksi({
      startDate: `${month}-01`,
      endDate: `${month}-31`
    });

    const tbody = document.getElementById('monthly-transactions-body');
    if (tbody) {
      if (transactions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="text-center py-8 text-slate-400">Tidak ada transaksi pada bulan terpilih</td></tr>`;
      } else {
        tbody.innerHTML = transactions.map((t, idx) => `
          <tr class="border-b border-slate-100 hover:bg-slate-50">
            <td class="py-2.5 px-3 text-center text-slate-500">${idx + 1}</td>
            <td class="py-2.5 px-3 text-slate-700 font-medium">${t.tanggal}</td>
            <td class="py-2.5 px-3 text-center">
              <span class="px-2 py-0.5 text-xs rounded-full font-semibold ${t.jenis === 'Pemasukan' ? 'bg-emerald-100 text-emerald-800' : t.jenis === 'Pengeluaran' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'}">
                ${t.jenis}
              </span>
            </td>
            <td class="py-2.5 px-3 font-medium text-slate-800">${t.kategori}</td>
            <td class="py-2.5 px-3 text-slate-600 text-sm">${t.keterangan}</td>
            <td class="py-2.5 px-3 font-rupiah text-right font-medium text-emerald-700">${t.pemasukan > 0 ? formatRupiah(t.pemasukan) : '-'}</td>
            <td class="py-2.5 px-3 font-rupiah text-right font-medium text-rose-700">${t.pengeluaran > 0 ? formatRupiah(t.pengeluaran) : '-'}</td>
          </tr>
        `).join('');
      }
    }
  }

  // --- 8. RIWAYAT TRANSAKSI ---
  async renderTransaksiTable() {
    const list = await window.clinicDB.getTransaksi(this.txFilter);
    const tbody = document.getElementById('table-transaksi-body');
    if (!tbody) return;

    this.pagination.total = list.length;
    const startIdx = (this.pagination.page - 1) * this.pagination.limit;
    const paginated = list.slice(startIdx, startIdx + this.pagination.limit);

    // Update pagination label
    document.getElementById('tx-page-info').textContent = `Menampilkan ${list.length === 0 ? 0 : startIdx + 1} - ${Math.min(startIdx + this.pagination.limit, list.length)} dari ${list.length} transaksi`;
    document.getElementById('btn-prev-page').disabled = this.pagination.page <= 1;
    document.getElementById('btn-next-page').disabled = startIdx + this.pagination.limit >= list.length;

    if (paginated.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="text-center py-8 text-slate-400">Tidak ada transaksi yang cocok dengan filter</td></tr>`;
      return;
    }

    tbody.innerHTML = paginated.map(item => `
      <tr class="hover:bg-slate-50 transition border-b border-slate-100">
        <td class="py-3 px-3 text-sm font-medium text-slate-800 whitespace-nowrap">${item.tanggal}</td>
        <td class="py-3 px-3 text-center">
          <span class="inline-block px-2.5 py-1 text-xs rounded-full font-semibold ${item.jenis === 'Pemasukan' ? 'bg-emerald-100 text-emerald-800' : item.jenis === 'Pengeluaran' ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'}">
            ${item.jenis}
          </span>
        </td>
        <td class="py-3 px-3 text-sm font-semibold text-slate-700">${item.kategori}</td>
        <td class="py-3 px-3 text-sm text-slate-600 max-w-xs truncate" title="${item.keterangan}">${item.keterangan || '-'}</td>
        <td class="py-3 px-3 font-rupiah text-right text-emerald-700 font-medium">${item.pemasukan > 0 ? formatRupiah(item.pemasukan) : '-'}</td>
        <td class="py-3 px-3 font-rupiah text-right text-rose-700 font-medium">${item.pengeluaran > 0 ? formatRupiah(item.pengeluaran) : '-'}</td>
        <td class="py-3 px-3 text-center text-xs text-slate-500 whitespace-nowrap">${item.metode}</td>
        <td class="py-3 px-3 font-rupiah text-right font-bold text-slate-900">${formatRupiah(item.nominal)}</td>
        <td class="py-3 px-3 text-center">
          <div class="flex items-center justify-center space-x-2">
            <button onclick="app.openEditModal('${item.jenis.toLowerCase()}', ${item.rawId})" class="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Edit">
              <i data-lucide="edit-3" class="w-4 h-4"></i>
            </button>
            <button onclick="app.confirmDelete('${item.jenis.toLowerCase()}', ${item.rawId}, '${item.jenis} (${formatRupiah(item.nominal)})')" class="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Hapus">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');

    if (window.lucide) window.lucide.createIcons();
  }

  // --- 9. PENGATURAN ---
  async renderPengaturan() {
    const settings = await window.clinicDB.getSettings();
    document.getElementById('cfg-nama-klinik').value = settings.nama_klinik || '';
    document.getElementById('cfg-izin-operasional').value = settings.izin_operasional || '';
    document.getElementById('cfg-alamat').value = settings.alamat || '';
    document.getElementById('cfg-telepon').value = settings.telepon || '';
    document.getElementById('cfg-pimpinan').value = settings.pimpinan || '';
    document.getElementById('cfg-bendahara').value = settings.bendahara || '';
    document.getElementById('cfg-saldo-awal-tunai').value = (settings.saldo_awal_tunai || 0).toLocaleString('id-ID');
    document.getElementById('cfg-saldo-awal-non-tunai').value = (settings.saldo_awal_non_tunai || 0).toLocaleString('id-ID');
  }

  // --- FORM CALCULATORS & BINDINGS ---
  initFormCalculators() {
    // 1. Pemasukan Form Auto Total
    const inputRJ = document.getElementById('input-pemasukan-rj');
    const inputRI = document.getElementById('input-pemasukan-ri');
    const inputLab = document.getElementById('input-pemasukan-lab');
    const inputLain = document.getElementById('input-pemasukan-lain');
    const totalDisplay = document.getElementById('display-total-pemasukan');

    const updatePemasukanTotal = () => {
      const rj = parseRupiahInput(inputRJ ? inputRJ.value : 0);
      const ri = parseRupiahInput(inputRI ? inputRI.value : 0);
      const lab = parseRupiahInput(inputLab ? inputLab.value : 0);
      const lain = parseRupiahInput(inputLain ? inputLain.value : 0);
      const sum = rj + ri + lab + lain;
      if (totalDisplay) totalDisplay.textContent = formatRupiah(sum);
    };

    [inputRJ, inputRI, inputLab, inputLain].forEach(inp => {
      if (inp) {
        bindRupiahInput(inp);
        inp.addEventListener('input', updatePemasukanTotal);
      }
    });

    // 2. Setoran Form Auto Total
    const inputCash = document.getElementById('input-setoran-cash');
    const inputRek = document.getElementById('input-setoran-rekening');
    const inputLaci = document.getElementById('input-setoran-laci');
    const setoranTotalDisplay = document.getElementById('display-total-setoran');

    const updateSetoranTotal = () => {
      const cash = parseRupiahInput(inputCash ? inputCash.value : 0);
      const rek = parseRupiahInput(inputRek ? inputRek.value : 0);
      const sum = cash + rek;
      if (setoranTotalDisplay) setoranTotalDisplay.textContent = formatRupiah(sum);
    };

    [inputCash, inputRek].forEach(inp => {
      if (inp) {
        bindRupiahInput(inp);
        inp.addEventListener('input', updateSetoranTotal);
      }
    });
    if (inputLaci) bindRupiahInput(inputLaci);

    // 3. Pengeluaran Form Nominal
    const inputExpNominal = document.getElementById('input-pengeluaran-nominal');
    if (inputExpNominal) bindRupiahInput(inputExpNominal);

    // Initial call to calculate defaults
    updatePemasukanTotal();
    updateSetoranTotal();
  }

  // --- SUBMIT HANDLERS ---
  async handleSavePemasukan(e) {
    e.preventDefault();
    const tanggal = document.getElementById('input-pemasukan-tanggal').value;
    const rawat_jalan = parseRupiahInput(document.getElementById('input-pemasukan-rj').value);
    const rawat_inap = parseRupiahInput(document.getElementById('input-pemasukan-ri').value);
    const lab = parseRupiahInput(document.getElementById('input-pemasukan-lab').value);
    const lainnya = parseRupiahInput(document.getElementById('input-pemasukan-lain').value);
    const metode = document.getElementById('input-pemasukan-metode').value;
    const keterangan = document.getElementById('input-pemasukan-keterangan').value;

    if (!tanggal) {
      this.showToast('Tanggal pemasukan wajib diisi', 'error');
      return;
    }

    const payload = {
      tanggal,
      periode: tanggal.slice(0, 7),
      rawat_jalan,
      rawat_inap,
      lab,
      lainnya,
      metode,
      keterangan
    };

    await window.clinicDB.addPemasukan(payload);
    this.showToast('Data pemasukan berhasil dicatat!', 'success');
    
    // Reset form
    document.getElementById('input-pemasukan-rj').value = '';
    document.getElementById('input-pemasukan-ri').value = '';
    document.getElementById('input-pemasukan-lab').value = '';
    document.getElementById('input-pemasukan-lain').value = '';
    document.getElementById('input-pemasukan-keterangan').value = '';
    document.getElementById('display-total-pemasukan').textContent = 'Rp0';

    await this.refreshGlobalData();
    await this.renderPemasukanTable();
  }

  async handleSavePengeluaran(e) {
    e.preventDefault();
    const tanggal = document.getElementById('input-pengeluaran-tanggal').value;
    const kategori = document.getElementById('input-pengeluaran-kategori').value;
    const nominal = parseRupiahInput(document.getElementById('input-pengeluaran-nominal').value);
    const metode = document.getElementById('input-pengeluaran-metode').value;
    const keterangan = document.getElementById('input-pengeluaran-keterangan').value;

    if (!tanggal || !kategori) {
      this.showToast('Tanggal dan Kategori wajib diisi', 'error');
      return;
    }

    if (nominal <= 0) {
      this.showToast('Nominal pengeluaran harus lebih besar dari 0', 'error');
      return;
    }

    const payload = { tanggal, kategori, nominal, metode, keterangan };
    await window.clinicDB.addPengeluaran(payload);
    this.showToast(`Pengeluaran ${kategori} sebesar ${formatRupiah(nominal)} berhasil disimpan!`, 'success');

    // Reset Form
    document.getElementById('input-pengeluaran-nominal').value = '';
    document.getElementById('input-pengeluaran-keterangan').value = '';

    await this.refreshGlobalData();
    await this.renderPengeluaranTable();
  }

  async handleSaveSetoran(e) {
    e.preventDefault();
    const tanggal = document.getElementById('input-setoran-tanggal').value;
    const setoran_cash = parseRupiahInput(document.getElementById('input-setoran-cash').value);
    const setoran_rekening = parseRupiahInput(document.getElementById('input-setoran-rekening').value);
    const uang_laci = parseRupiahInput(document.getElementById('input-setoran-laci').value);
    const keterangan = document.getElementById('input-setoran-keterangan').value;

    if (!tanggal) {
      this.showToast('Tanggal setoran wajib diisi', 'error');
      return;
    }

    const payload = { tanggal, setoran_cash, setoran_rekening, uang_laci, keterangan };
    await window.clinicDB.addSetoran(payload);
    this.showToast('Data setoran kasir berhasil dicatat!', 'success');

    // Reset Form
    document.getElementById('input-setoran-cash').value = '';
    document.getElementById('input-setoran-rekening').value = '';
    document.getElementById('input-setoran-laci').value = '';
    document.getElementById('input-setoran-keterangan').value = '';
    document.getElementById('display-total-setoran').textContent = 'Rp0';

    await this.refreshGlobalData();
    await this.renderSetoranTable();
  }

  async handleSaveSettings(e) {
    e.preventDefault();
    const payload = {
      nama_klinik: document.getElementById('cfg-nama-klinik').value,
      izin_operasional: document.getElementById('cfg-izin-operasional').value,
      alamat: document.getElementById('cfg-alamat').value,
      telepon: document.getElementById('cfg-telepon').value,
      pimpinan: document.getElementById('cfg-pimpinan').value,
      bendahara: document.getElementById('cfg-bendahara').value,
      saldo_awal_tunai: parseRupiahInput(document.getElementById('cfg-saldo-awal-tunai').value),
      saldo_awal_non-tunai: parseRupiahInput(document.getElementById('cfg-saldo-awal-non-tunai').value)
    };

    await window.clinicDB.updateSettings(payload);
    this.showToast('Pengaturan klinik & saldo awal berhasil diperbarui!', 'success');
    await this.refreshGlobalData();
  }

  // --- DELETE & EDIT MODALS ---
  confirmDelete(type, id, description) {
    this.itemToDelete = { type, id };
    document.getElementById('delete-modal-desc').textContent = `Apakah Anda yakin ingin menghapus data: "${description}"? Tindakan ini tidak dapat dibatalkan.`;
    document.getElementById('modal-delete-confirm').classList.remove('hidden');
  }

  closeDeleteModal() {
    this.itemToDelete = null;
    document.getElementById('modal-delete-confirm').classList.add('hidden');
  }

  async executeDelete() {
    if (!this.itemToDelete) return;
    const { type, id } = this.itemToDelete;

    if (type === 'pemasukan') await window.clinicDB.deletePemasukan(id);
    else if (type === 'pengeluaran') await window.clinicDB.deletePengeluaran(id);
    else if (type === 'setoran') await window.clinicDB.deleteSetoran(id);

    this.closeDeleteModal();
    this.showToast('Data berhasil dihapus dari database', 'info');
    await this.refreshGlobalData();
    await this.loadCurrentViewData();
  }

  async openEditModal(type, id) {
    this.activeEditItem = { type, id };
    const modal = document.getElementById('modal-edit');
    const container = document.getElementById('modal-edit-fields');
    if (!modal || !container) return;

    if (type === 'pemasukan') {
      const list = await window.clinicDB.getPemasukan();
      const item = list.find(p => p.id === Number(id));
      if (!item) return;

      container.innerHTML = `
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
            <input type="date" id="edit-tanggal" value="${item.tanggal}" class="w-full border rounded-lg p-2 text-sm">
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Rawat Jalan (Rp)</label>
              <input type="text" id="edit-rj" value="${(item.rawat_jalan || 0).toLocaleString('id-ID')}" class="w-full border rounded-lg p-2 text-sm font-rupiah">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Rawat Inap (Rp)</label>
              <input type="text" id="edit-ri" value="${(item.rawat_inap || 0).toLocaleString('id-ID')}" class="w-full border rounded-lg p-2 text-sm font-rupiah">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Laboratorium (Rp)</label>
              <input type="text" id="edit-lab" value="${(item.lab || 0).toLocaleString('id-ID')}" class="w-full border rounded-lg p-2 text-sm font-rupiah">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-600 mb-1">Lainnya (Rp)</label>
              <input type="text" id="edit-lain" value="${(item.lainnya || 0).toLocaleString('id-ID')}" class="w-full border rounded-lg p-2 text-sm font-rupiah">
            </div>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Keterangan</label>
            <input type="text" id="edit-ket" value="${item.keterangan || ''}" class="w-full border rounded-lg p-2 text-sm">
          </div>
        </div>
      `;
      bindRupiahInput(document.getElementById('edit-rj'));
      bindRupiahInput(document.getElementById('edit-ri'));
      bindRupiahInput(document.getElementById('edit-lab'));
      bindRupiahInput(document.getElementById('edit-lain'));
    } else if (type === 'pengeluaran') {
      const list = await window.clinicDB.getPengeluaran();
      const item = list.find(e => e.id === Number(id));
      if (!item) return;

      const cats = ['Obat', 'BHP', 'Listrik', 'WiFi', 'Apart', 'ATK', 'Klinik Pintar', 'Akreditasi', 'Sarpras', 'Lainnya'];
      container.innerHTML = `
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
            <input type="date" id="edit-tanggal" value="${item.tanggal}" class="w-full border rounded-lg p-2 text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Kategori</label>
            <select id="edit-kategori" class="w-full border rounded-lg p-2 text-sm">
              ${cats.map(c => `<option value="${c}" ${c === item.kategori ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Nominal (Rp)</label>
            <input type="text" id="edit-nominal" value="${(item.nominal || 0).toLocaleString('id-ID')}" class="w-full border rounded-lg p-2 text-sm font-rupiah">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Metode Pembayaran</label>
            <select id="edit-metode" class="w-full border rounded-lg p-2 text-sm">
              <option value="Kas Tunai" ${item.metode === 'Kas Tunai' ? 'selected' : ''}>Kas Tunai</option>
              <option value="Rekening Klinik" ${item.metode === 'Rekening Klinik' ? 'selected' : ''}>Rekening Klinik</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Keterangan</label>
            <input type="text" id="edit-ket" value="${item.keterangan || ''}" class="w-full border rounded-lg p-2 text-sm">
          </div>
        </div>
      `;
      bindRupiahInput(document.getElementById('edit-nominal'));
    } else if (type === 'setoran') {
      const list = await window.clinicDB.getSetoran();
      const item = list.find(s => s.id === Number(id));
      if (!item) return;

      container.innerHTML = `
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Tanggal</label>
            <input type="date" id="edit-tanggal" value="${item.tanggal}" class="w-full border rounded-lg p-2 text-sm">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Setoran Cash (Rp)</label>
            <input type="text" id="edit-cash" value="${(item.setoran_cash || 0).toLocaleString('id-ID')}" class="w-full border rounded-lg p-2 text-sm font-rupiah">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Setoran Rekening (Rp)</label>
            <input type="text" id="edit-rek" value="${(item.setoran_rekening || 0).toLocaleString('id-ID')}" class="w-full border rounded-lg p-2 text-sm font-rupiah">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Uang Laci (Rp)</label>
            <input type="text" id="edit-laci" value="${(item.uang_laci || 0).toLocaleString('id-ID')}" class="w-full border rounded-lg p-2 text-sm font-rupiah">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-600 mb-1">Keterangan</label>
            <input type="text" id="edit-ket" value="${item.keterangan || ''}" class="w-full border rounded-lg p-2 text-sm">
          </div>
        </div>
      `;
      bindRupiahInput(document.getElementById('edit-cash'));
      bindRupiahInput(document.getElementById('edit-rek'));
      bindRupiahInput(document.getElementById('edit-laci'));
    }

    modal.classList.remove('hidden');
  }

  closeEditModal() {
    this.activeEditItem = null;
    document.getElementById('modal-edit').classList.add('hidden');
  }

  async saveEditModal() {
    if (!this.activeEditItem) return;
    const { type, id } = this.activeEditItem;

    if (type === 'pemasukan') {
      const payload = {
        tanggal: document.getElementById('edit-tanggal').value,
        rawat_jalan: parseRupiahInput(document.getElementById('edit-rj').value),
        rawat_inap: parseRupiahInput(document.getElementById('edit-ri').value),
        lab: parseRupiahInput(document.getElementById('edit-lab').value),
        lainnya: parseRupiahInput(document.getElementById('edit-lain').value),
        keterangan: document.getElementById('edit-ket').value
      };
      await window.clinicDB.updatePemasukan(id, payload);
    } else if (type === 'pengeluaran') {
      const payload = {
        tanggal: document.getElementById('edit-tanggal').value,
        kategori: document.getElementById('edit-kategori').value,
        nominal: parseRupiahInput(document.getElementById('edit-nominal').value),
        metode: document.getElementById('edit-metode').value,
        keterangan: document.getElementById('edit-ket').value
      };
      await window.clinicDB.updatePengeluaran(id, payload);
    } else if (type === 'setoran') {
      const payload = {
        tanggal: document.getElementById('edit-tanggal').value,
        setoran_cash: parseRupiahInput(document.getElementById('edit-cash').value),
        setoran_rekening: parseRupiahInput(document.getElementById('edit-rek').value),
        uang_laci: parseRupiahInput(document.getElementById('edit-laci').value),
        keterangan: document.getElementById('edit-ket').value
      };
      await window.clinicDB.updateSetoran(id, payload);
    }

    this.closeEditModal();
    this.showToast('Perubahan data berhasil disimpan', 'success');
    await this.refreshGlobalData();
    await this.loadCurrentViewData();
  }

  // --- RESET SYSTEM ---
  resetToInitial() {
    if (confirm('PERINGATAN: Apakah Anda yakin ingin mereset seluruh data kembali ke data contoh awal 21 September 2026?')) {
      window.clinicDB.resetToDefault();
      this.showToast('Database berhasil direset ke data awal!', 'info');
      setTimeout(() => window.location.reload(), 1000);
    }
  }

  // --- TOAST NOTIFICATIONS ---
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    const colorClass = type === 'success' ? 'bg-emerald-600' :
                       type === 'error' ? 'bg-rose-600' :
                       type === 'warning' ? 'bg-amber-600' : 'bg-slate-800';

    toast.className = `flex items-center space-x-2 text-white px-4 py-3 rounded-lg shadow-xl text-sm transition-all duration-300 transform translate-y-2 opacity-0 ${colorClass}`;
    toast.innerHTML = `
      <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-triangle' : 'info'}" class="w-5 h-5 flex-shrink-0"></i>
      <span>${message}</span>
    `;

    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
      toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    setTimeout(() => {
      toast.classList.add('opacity-0', 'translate-x-full');
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  // --- EVENT BINDINGS ---
  bindEvents() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const view = btn.getAttribute('data-view');
        this.showView(view);
      });
    });

    // Mobile sidebar toggle
    const mobileMenuBtn = document.getElementById('btn-mobile-menu');
    const sidebar = document.getElementById('sidebar');
    const sidebarCloseBtn = document.getElementById('btn-close-sidebar');
    if (mobileMenuBtn && sidebar) {
      mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.toggle('-translate-x-full');
      });
    }
    if (sidebarCloseBtn && sidebar) {
      sidebarCloseBtn.addEventListener('click', () => {
        sidebar.classList.add('-translate-x-full');
      });
    }

    // Forms
    const formPemasukan = document.getElementById('form-pemasukan');
    if (formPemasukan) formPemasukan.addEventListener('submit', (e) => this.handleSavePemasukan(e));

    const formPengeluaran = document.getElementById('form-pengeluaran');
    if (formPengeluaran) formPengeluaran.addEventListener('submit', (e) => this.handleSavePengeluaran(e));

    const formSetoran = document.getElementById('form-setoran');
    if (formSetoran) formSetoran.addEventListener('submit', (e) => this.handleSaveSetoran(e));

    const formSettings = document.getElementById('form-pengaturan');
    if (formSettings) formSettings.addEventListener('submit', (e) => this.handleSaveSettings(e));

    // Daily & Monthly filter changes
    const dailyFilter = document.getElementById('daily-filter-date');
    if (dailyFilter) {
      dailyFilter.addEventListener('change', () => this.renderLaporanHarian());
    }

    const monthlyFilter = document.getElementById('monthly-filter-month');
    if (monthlyFilter) {
      monthlyFilter.addEventListener('change', () => this.renderLaporanBulanan());
    }

    // Transaction Filters
    const txSearch = document.getElementById('tx-filter-search');
    if (txSearch) {
      txSearch.addEventListener('input', (e) => {
        this.txFilter.search = e.target.value;
        this.pagination.page = 1;
        this.renderTransaksiTable();
      });
    }

    const txJenis = document.getElementById('tx-filter-jenis');
    if (txJenis) {
      txJenis.addEventListener('change', (e) => {
        this.txFilter.jenis = e.target.value;
        this.pagination.page = 1;
        this.renderTransaksiTable();
      });
    }

    const txKat = document.getElementById('tx-filter-kategori');
    if (txKat) {
      txKat.addEventListener('change', (e) => {
        this.txFilter.kategori = e.target.value;
        this.pagination.page = 1;
        this.renderTransaksiTable();
      });
    }

    const txStart = document.getElementById('tx-filter-start');
    if (txStart) {
      txStart.addEventListener('change', (e) => {
        this.txFilter.startDate = e.target.value;
        this.pagination.page = 1;
        this.renderTransaksiTable();
      });
    }

    const txEnd = document.getElementById('tx-filter-end');
    if (txEnd) {
      txEnd.addEventListener('change', (e) => {
        this.txFilter.endDate = e.target.value;
        this.pagination.page = 1;
        this.renderTransaksiTable();
      });
    }

    // Pagination
    const btnPrev = document.getElementById('btn-prev-page');
    if (btnPrev) {
      btnPrev.addEventListener('click', () => {
        if (this.pagination.page > 1) {
          this.pagination.page--;
          this.renderTransaksiTable();
        }
      });
    }

    const btnNext = document.getElementById('btn-next-page');
    if (btnNext) {
      btnNext.addEventListener('click', () => {
        const maxPage = Math.ceil(this.pagination.total / this.pagination.limit);
        if (this.pagination.page < maxPage) {
          this.pagination.page++;
          this.renderTransaksiTable();
        }
      });
    }

    // Export buttons
    const btnExcel = document.getElementById('btn-export-excel');
    if (btnExcel) {
      btnExcel.addEventListener('click', () => {
        const month = document.getElementById('monthly-filter-month')?.value || this.selectedMonth;
        window.clinicExporter.exportToExcel(month);
      });
    }

    const btnPdf = document.getElementById('btn-export-pdf');
    if (btnPdf) {
      btnPdf.addEventListener('click', () => {
        const month = document.getElementById('monthly-filter-month')?.value || this.selectedMonth;
        window.clinicExporter.exportToPdf(month);
      });
    }

    const btnPrint = document.getElementById('btn-print-laporan');
    if (btnPrint) {
      btnPrint.addEventListener('click', () => {
        const month = document.getElementById('monthly-filter-month')?.value || this.selectedMonth;
        window.clinicExporter.printFormalReport(month);
      });
    }
  }
}

// Instantiate and start
window.app = new ClinicApp();
document.addEventListener('DOMContentLoaded', () => {
  window.app.init();
  if (window.lucide) window.lucide.createIcons();
});
