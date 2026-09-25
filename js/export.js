/**
 * Export & Reporting Module for Sistem Laporan Keuangan Klinik Pratama Asih
 * Handles Excel (.xlsx) Export, Formal PDF Export, and Official Letterhead Print
 */

class ClinicExporter {
  constructor() {
    this.monthNamesIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
  }

  formatDateIndo(dateStr) {
    if (!dateStr) return '-';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const day = parts[2];
    const month = this.monthNamesIndo[parseInt(parts[1], 10) - 1];
    const year = parts[0];
    return `${day} ${month} ${year}`;
  }

  // --- EXPORT TO EXCEL ---
  async exportToExcel(month = '2026-09') {
    if (typeof XLSX === 'undefined') {
      alert('Library SheetJS belum terload. Pastikan terhubung internet.');
      return;
    }

    const report = await window.clinicDB.getMonthlyReport(month);
    const settings = await window.clinicDB.getSettings();
    const transactions = await window.clinicDB.getTransaksi({
      startDate: `${month}-01`,
      endDate: `${month}-31`
    });

    const wb = XLSX.utils.book_new();

    // 1. Sheet Ringkasan Eksekutif
    const summaryData = [
      ['LAPORAN KEUANGAN BULANAN KLINIK'],
      [settings.nama_klinik],
      [`Periode: ${this.monthNamesIndo[parseInt(month.slice(5, 7), 10) - 1]} ${month.slice(0, 4)}`],
      [''],
      ['INDIKATOR KEUANGAN', 'NOMINAL (RUPIAH)'],
      ['Total Pemasukan Bulan Berjalan', report.summary.totalPemasukan],
      ['Total Pengeluaran Bulan Berjalan', report.summary.totalPengeluaran],
      ['Selisih (Laba/Surplus Bersih)', report.summary.selisih],
      [''],
      ['RINCIAN SUMBER PEMASUKAN', 'NOMINAL (RUPIAH)'],
      ['Rawat Jalan', report.summary.rawatJalan],
      ['Rawat Inap', report.summary.rawatInap],
      ['Laboratorium', report.summary.lab],
      ['Pemasukan Lainnya', report.summary.lainnya],
      ['Total Setoran', report.summary.totalSetoran],
      [''],
      ['POSISI SALDO KAS KLINIK', 'NOMINAL (RUPIAH)'],
      ['Saldo Kas Tunai', report.saldo.saldoKasTunai],
      ['Saldo Kas Non-Tunai (Rekening)', report.saldo.saldoKasNonTunai],
      ['Total Saldo Kas', report.saldo.totalSaldoKas],
      [''],
      ['LAPORAN BERJALAN', 'NOMINAL (RUPIAH)'],
      ['Total Pengeluaran Berjalan', report.laporanBerjalan.totalPengeluaranBerjalan],
      ['Total Lab Berjalan', report.laporanBerjalan.totalLab]
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Ringkasan Bulanan');

    // 2. Sheet Transaksi Lengkap
    const txHeaders = ['Tanggal', 'Jenis', 'Kategori', 'Keterangan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Metode Pembayaran', 'Nominal (Rp)'];
    const txRows = transactions.map(t => [
      t.tanggal,
      t.jenis,
      t.kategori,
      t.keterangan,
      t.pemasukan || 0,
      t.pengeluaran || 0,
      t.metode,
      t.nominal
    ]);
    const wsTx = XLSX.utils.aoa_to_sheet([txHeaders, ...txRows]);
    XLSX.utils.book_append_sheet(wb, wsTx, 'Riwayat Transaksi');

    // 3. Sheet Rincian Pengeluaran
    const expHeaders = ['Tanggal', 'Kategori', 'Keterangan', 'Metode', 'Nominal (Rp)'];
    const expRows = report.pengeluaran.map(e => [
      e.tanggal,
      e.kategori,
      e.keterangan,
      e.metode,
      e.nominal
    ]);
    const wsExp = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
    XLSX.utils.book_append_sheet(wb, wsExp, 'Rincian Pengeluaran');

    // Save File
    const fileName = `Laporan_Keuangan_Klinik_Asih_${month}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }

  // --- PRINT FORMAL CLINIC REPORT ---
  async printFormalReport(month = '2026-09') {
    const report = await window.clinicDB.getMonthlyReport(month);
    const settings = await window.clinicDB.getSettings();
    const transactions = await window.clinicDB.getTransaksi({
      startDate: `${month}-01`,
      endDate: `${month}-31`
    });

    const monthName = this.monthNamesIndo[parseInt(month.slice(5, 7), 10) - 1];
    const year = month.slice(0, 4);

    // Create a print window
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Izinkan pop-up untuk mencetak laporan formal');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="id">
      <head>
        <meta charset="utf-8">
        <title>Laporan Keuangan - ${settings.nama_klinik}</title>
        <style>
          @page { size: A4; margin: 15mm; }
          body {
            font-family: 'Times New Roman', Times, serif;
            color: #000;
            background: #fff;
            line-height: 1.35;
            font-size: 11pt;
            margin: 0;
            padding: 10px;
          }
          .title { text-align: center; margin-bottom: 18px; }
          .title h3 { margin: 0; font-size: 13pt; text-decoration: underline; text-transform: uppercase; }
          .title p { margin: 4px 0 0 0; font-size: 10pt; font-weight: bold; }
          
          .grid-summary {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .grid-summary td {
            padding: 5px 8px;
            border: 1px solid #444;
            font-size: 10pt;
          }
          .grid-summary td.header {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .grid-summary td.num {
            text-align: right;
            font-family: Arial, sans-serif;
            font-size: 9.5pt;
          }

          table.tx-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            margin-bottom: 25px;
          }
          table.tx-table th, table.tx-table td {
            border: 1px solid #333;
            padding: 5px 6px;
            font-size: 9pt;
          }
          table.tx-table th {
            background-color: #f0f0f0;
            text-align: center;
            font-weight: bold;
          }
          table.tx-table td.num {
            text-align: right;
            font-family: Arial, sans-serif;
          }

          .signatures {
            width: 100%;
            margin-top: 35px;
            page-break-inside: avoid;
          }
          .sig-box {
            width: 45%;
            float: left;
            text-align: center;
          }
          .sig-box.right {
            float: right;
          }
          .sig-space {
            height: 70px;
          }
          .sig-name {
            font-weight: bold;
            text-decoration: underline;
          }
          .sig-title {
            font-size: 9.5pt;
          }
          .clear { clear: both; }

          @media print {
            .no-print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="no-print-btn" style="text-align: right; margin-bottom: 15px;">
          <button onclick="window.print()" style="padding: 8px 16px; background: #059669; color: #fff; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">Cetak Laporan</button>
          <button onclick="window.close()" style="padding: 8px 16px; background: #64748b; color: #fff; border: none; border-radius: 4px; cursor: pointer; margin-left: 8px;">Tutup</button>
        </div>

        <div class="kop" style="display: flex; align-items: center; justify-content: center; gap: 20px; text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px;">
          <img src="${new URL('img/logo-klinik-asih.svg', window.location.href).href}" style="width: 80px; height: 80px; object-fit: contain;" alt="Logo Klinik Asih">
          <div>
            <h1 style="margin: 0; font-size: 18pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; color: #1e3a40;">${settings.nama_klinik}</h1>
            <p style="margin: 2px 0; font-size: 10.5pt; font-style: italic; color: #008744; font-weight: 600;">"Kesehatan Anda Kebahagiaan Bersama"</p>
            <h2 style="margin: 2px 0; font-size: 10pt; font-weight: normal;">SIP / IZIN OPERASIONAL: ${settings.izin_operasional || '503/440/SIP-KLINIK/DPMPTSP/2024'}</h2>
            <p style="margin: 2px 0; font-size: 9pt; color: #444;">${settings.alamat} &bull; Telp: ${settings.telepon}</p>
          </div>
        </div>

        <div class="title">
          <h3>LAPORAN KEUANGAN BULANAN</h3>
          <p>Periode: ${monthName} ${year}</p>
        </div>

        <!-- Ringkasan Eksekutif -->
        <table class="grid-summary">
          <tr>
            <td class="header" colspan="2">REKAPITULASI PENDAPATAN</td>
            <td class="header" colspan="2">POSISI SALDO KAS & BANK</td>
          </tr>
          <tr>
            <td>Rawat Jalan</td>
            <td class="num">${formatRupiah(report.summary.rawatJalan)}</td>
            <td>Saldo Kas Tunai</td>
            <td class="num">${formatRupiah(report.saldo.saldoKasTunai)}</td>
          </tr>
          <tr>
            <td>Rawat Inap</td>
            <td class="num">${formatRupiah(report.summary.rawatInap)}</td>
            <td>Saldo Kas Non-Tunai</td>
            <td class="num">${formatRupiah(report.saldo.saldoKasNonTunai)}</td>
          </tr>
          <tr>
            <td>Laboratorium</td>
            <td class="num">${formatRupiah(report.summary.lab)}</td>
            <td><strong>TOTAL SALDO KAS</strong></td>
            <td class="num"><strong>${formatRupiah(report.saldo.totalSaldoKas)}</strong></td>
          </tr>
          <tr>
            <td>Pemasukan Lainnya</td>
            <td class="num">${formatRupiah(report.summary.lainnya)}</td>
            <td class="header" colspan="2">LAPORAN BERJALAN</td>
          </tr>
          <tr>
            <td><strong>TOTAL PEMASUKAN</strong></td>
            <td class="num"><strong>${formatRupiah(report.summary.totalPemasukan)}</strong></td>
            <td>Total Lab Berjalan</td>
            <td class="num">${formatRupiah(report.laporanBerjalan.totalLab)}</td>
          </tr>
          <tr>
            <td><strong>TOTAL PENGELUARAN</strong></td>
            <td class="num"><strong>${formatRupiah(report.summary.totalPengeluaran)}</strong></td>
            <td>Total Pengeluaran Berjalan</td>
            <td class="num">${formatRupiah(report.laporanBerjalan.totalPengeluaranBerjalan)}</td>
          </tr>
          <tr style="background-color: #fafafa;">
            <td><strong>SELISIH (SURPLUS/BERSIH)</strong></td>
            <td class="num" style="color: ${report.summary.selisih >= 0 ? '#059669' : '#dc2626'}; font-weight: bold;">
              ${formatRupiah(report.summary.selisih)}
            </td>
            <td>Total Setoran Bulan Ini</td>
            <td class="num">${formatRupiah(report.summary.totalSetoran)}</td>
          </tr>
        </table>

        <!-- Tabel Transaksi -->
        <h4 style="margin: 15px 0 5px 0; font-size: 11pt; text-transform: uppercase;">RINCIAN BUKU TRANSAKSI (${monthName} ${year})</h4>
        <table class="tx-table">
          <thead>
            <tr>
              <th width="5%">No</th>
              <th width="12%">Tanggal</th>
              <th width="12%">Jenis</th>
              <th width="15%">Kategori</th>
              <th>Keterangan</th>
              <th width="15%">Pemasukan</th>
              <th width="15%">Pengeluaran</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map((t, idx) => `
              <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td style="text-align: center;">${t.tanggal}</td>
                <td style="text-align: center;">${t.jenis}</td>
                <td>${t.kategori}</td>
                <td>${t.keterangan}</td>
                <td class="num">${t.pemasukan > 0 ? formatRupiah(t.pemasukan) : '-'}</td>
                <td class="num">${t.pengeluaran > 0 ? formatRupiah(t.pengeluaran) : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="font-weight: bold; background-color: #f2f2f2;">
              <td colspan="5" style="text-align: right; padding-right: 10px;">TOTAL:</td>
              <td class="num">${formatRupiah(report.summary.totalPemasukan)}</td>
              <td class="num">${formatRupiah(report.summary.totalPengeluaran)}</td>
            </tr>
          </tfoot>
        </table>

        <!-- Signatures -->
        <div class="signatures">
          <div class="sig-box">
            <p style="margin: 0;">Diverifikasi oleh,</p>
            <p class="sig-title" style="margin: 2px 0 0 0;">Bendahara / Bagian Keuangan</p>
            <div class="sig-space"></div>
            <div class="sig-name">${settings.bendahara}</div>
            <div class="sig-title">NIP / ID: BDH-0021</div>
          </div>
          <div class="sig-box right">
            <p style="margin: 0;">Disetujui oleh,</p>
            <p class="sig-title" style="margin: 2px 0 0 0;">Pimpinan Klinik</p>
            <div class="sig-space"></div>
            <div class="sig-name">${settings.pimpinan}</div>
            <div class="sig-title">Dokter Penanggung Jawab</div>
          </div>
          <div class="clear"></div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  }

  // --- EXPORT TO FORMAL PDF ---
  async exportToPdf(month = '2026-09') {
    this.printFormalReport(month);
  }
}

window.clinicExporter = new ClinicExporter();
