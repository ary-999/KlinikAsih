/**
 * Chart.js Integration for Sistem Laporan Keuangan Klinik Pratama Asih
 * Renders modern, responsive medical-grade financial charts
 */

class ClinicCharts {
  constructor() {
    this.dailyIncomeChart = null;
    this.dailyExpenseChart = null;
    this.incomeSourceChart = null;
    this.expenseCatChart = null;
  }

  // Format currency tooltip
  tooltipFormat(value) {
    return 'Rp' + Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  async renderCharts(month = '2026-09') {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded yet');
      return;
    }

    const data = await window.clinicDB.getCharts(month);

    // 1. Chart Pemasukan per Hari
    const ctxIncomeDaily = document.getElementById('chart-daily-income');
    if (ctxIncomeDaily) {
      if (this.dailyIncomeChart) this.dailyIncomeChart.destroy();
      this.dailyIncomeChart = new Chart(ctxIncomeDaily, {
        type: 'bar',
        data: {
          labels: data.daily.labels,
          datasets: [{
            label: 'Pemasukan (Rp)',
            data: data.daily.pemasukan,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#059669',
            borderWidth: 1.5,
            borderRadius: 6,
            hoverBackgroundColor: '#059669'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Pemasukan: ${this.tooltipFormat(ctx.parsed.y)}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (val) => 'Rp' + (val / 1000000).toFixed(1) + ' jt'
              },
              grid: { color: 'rgba(226, 232, 240, 0.6)' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }

    // 2. Chart Pengeluaran per Hari
    const ctxExpenseDaily = document.getElementById('chart-daily-expense');
    if (ctxExpenseDaily) {
      if (this.dailyExpenseChart) this.dailyExpenseChart.destroy();
      this.dailyExpenseChart = new Chart(ctxExpenseDaily, {
        type: 'bar',
        data: {
          labels: data.daily.labels,
          datasets: [{
            label: 'Pengeluaran (Rp)',
            data: data.daily.pengeluaran,
            backgroundColor: 'rgba(239, 68, 68, 0.75)',
            borderColor: '#dc2626',
            borderWidth: 1.5,
            borderRadius: 6,
            hoverBackgroundColor: '#dc2626'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` Pengeluaran: ${this.tooltipFormat(ctx.parsed.y)}`
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: (val) => 'Rp' + (val / 1000000).toFixed(1) + ' jt'
              },
              grid: { color: 'rgba(226, 232, 240, 0.6)' }
            },
            x: {
              grid: { display: false }
            }
          }
        }
      });
    }

    // 3. Chart Pemasukan Berdasarkan Sumber
    const ctxIncomeSource = document.getElementById('chart-income-source');
    if (ctxIncomeSource) {
      if (this.incomeSourceChart) this.incomeSourceChart.destroy();
      this.incomeSourceChart = new Chart(ctxIncomeSource, {
        type: 'doughnut',
        data: {
          labels: data.incomeBySource.labels,
          datasets: [{
            data: data.incomeBySource.data,
            backgroundColor: [
              '#059669', // Rawat Jalan (Emerald)
              '#0284c7', // Rawat Inap (Sky Blue)
              '#8b5cf6', // Lab (Purple)
              '#f59e0b'  // Lainnya (Amber)
            ],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${this.tooltipFormat(ctx.parsed)}`
              }
            }
          }
        }
      });
    }

    // 4. Chart Pengeluaran Berdasarkan Kategori
    const ctxExpenseCat = document.getElementById('chart-expense-category');
    if (ctxExpenseCat) {
      if (this.expenseCatChart) this.expenseCatChart.destroy();
      const palette = [
        '#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4',
        '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'
      ];
      this.expenseCatChart = new Chart(ctxExpenseCat, {
        type: 'doughnut',
        data: {
          labels: data.expenseByCategory.labels,
          datasets: [{
            data: data.expenseByCategory.data,
            backgroundColor: palette.slice(0, data.expenseByCategory.labels.length),
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '65%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: { boxWidth: 12, padding: 12, font: { size: 11 } }
            },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.label}: ${this.tooltipFormat(ctx.parsed)}`
              }
            }
          }
        }
      });
    }
  }
}

window.clinicCharts = new ClinicCharts();
