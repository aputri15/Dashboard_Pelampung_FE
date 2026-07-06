// ECharts Initialization for Dashboard
const colors = {
  primary: '#3B82F6', success: '#22C55E', warning: '#F59E0B', danger: '#EF4444',
  textMain: '#F1F5F9', textSub: '#CBD5E1', borderMain: '#334155',
  surface: '#1E293B', orange: '#F97316', purple: '#A855F7'
};

const commonChartOptions = {
  textStyle: { fontFamily: 'Inter, system-ui, sans-serif', color: colors.textSub },
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis', backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderColor: colors.borderMain, textStyle: { color: colors.textMain }, padding: [10, 15]
  },
  legend: { textStyle: { color: colors.textSub }, bottom: 0 }
};

// Advanced ResizeObserver to prevent UI layout shifts/flickering (Bug Fix)
let resizeTimeout;
let suppressResize = false;
const chartObserver = new ResizeObserver((entries) => {
  if (suppressResize) return;
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    window.requestAnimationFrame(() => {
      entries.forEach(entry => {
        const chartId = entry.target.id;
        const chart = window.appCharts[chartId];
        if (chart && typeof chart.resize === 'function' && !chart.isDisposed()) {
          chart.resize();
        }
      });
    });
  }, 150);
});

window.appCharts = {};

function initChart(id, option) {
  const el = document.getElementById(id);
  if (!el) return;

  suppressResize = true;

  let chart = window.appCharts[id];

  // Reuse existing instance instead of dispose+recreate (prevents flicker)
  if (chart && !chart.isDisposed()) {
    chart.setOption(option, true); // true = replace entire option, not merge
  } else {
    // Only create new instance if none exists
    const existingChart = echarts.getInstanceByDom(el);
    if (existingChart) existingChart.dispose();
    chart = echarts.init(el);
    chart.setOption(option);
    window.appCharts[id] = chart;
    chartObserver.observe(el);
  }

  // Re-enable resize observer after rendering settles
  requestAnimationFrame(() => { suppressResize = false; });
}

// ===================== POPULATE DROPDOWNS =====================
// Cache filter data to avoid double-fetching (prevents dropdown flicker)
let _cachedFilters = null;

async function loadFilters() {
  const res = await apiFetch('/analytics/filters');
  if (!res) return;
  const f = await res.json();
  _cachedFilters = f; // cache for reuse

  function fillSelect(id, items, labelKey, valueKey) {
    const sel = document.getElementById(id);
    if (!sel) return;
    // Hapus semua option kecuali yang pertama (default "Semua") — tidak ada frame kosong
    while (sel.options.length > 1) sel.remove(1);
    // Append semua option baru sekaligus via fragment
    const frag = document.createDocumentFragment();
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = typeof item === 'object' ? item[valueKey] : item;
      opt.textContent = typeof item === 'object' ? item[labelKey] : item;
      frag.appendChild(opt);
    });
    sel.appendChild(frag);
  }

  // Tab1 bulan
  fillSelect('filterBulanTab1', f.months, 'label', 'value');
  // Tab2
  fillSelect('filterWilayahTab2', f.wilayah, null, null);
  fillSelect('filterBulanTab2', f.months, 'label', 'value');
  // Tab3 bulan — diisi sekaligus di sini, TIDAK perlu fetch ulang
  fillSelect('filterBulanTab3', f.months, 'label', 'value');
}

// ===================== TAB 1: PROFITABILITAS =====================
async function loadProfitabilitas() {
  const bulan = document.getElementById('filterBulanTab1')?.value || '';
  const params = bulan ? `?bulan=${encodeURIComponent(bulan)}` : '';
  const res = await apiFetch('/analytics/profitabilitas' + params);
  if (!res) return;
  const data = await res.json();

  // KPI
  const kpi = data.kpi;
  const setText = (id, txt) => { const e = document.getElementById(id); if (e) e.textContent = txt; };

  function formatRpShort(val) {
    if (val >= 1e9) return `Rp ${(val / 1e9).toFixed(1).replace('.', ',')} M`;
    if (val >= 1e6) return `Rp ${(val / 1e6).toFixed(1).replace('.', ',')} Jt`;
    return `Rp ${Math.round(val).toLocaleString('id-ID')}`;
  }

  setText('kpiRevenue', formatRpShort(kpi.total_revenue));
  setText('kpiTLC', formatRpShort(kpi.total_tlc));
  setText('kpiGrossProfit', formatRpShort(kpi.total_gross_profit));
  setText('kpiAvgGPM', `${kpi.avg_gpm_percent.toFixed(1)}%`);
  setText('kpiVolume', kpi.total_volume.toLocaleString('id-ID'));

  // Chart: Revenue vs TLC vs Gross Profit (format Rupiah)
  const wilayah = data.regional_data.map(d => d.wilayah);
  initChart('chartProfitRegion', {
    ...commonChartOptions,
    grid: { top: 30, right: 20, bottom: 40, left: 75 },
    xAxis: { type: 'category', data: wilayah, axisLine: { lineStyle: { color: colors.borderMain } } },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } },
      axisLabel: {
        formatter: v => {
          if (v >= 1e9) return 'Rp ' + (v / 1e9).toFixed(1) + ' M';
          if (v >= 1e6) return 'Rp ' + (v / 1e6).toFixed(0) + ' Jt';
          return 'Rp ' + Math.round(v).toLocaleString('id-ID');
        }
      }
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.9)',
      borderColor: colors.borderMain,
      textStyle: { color: colors.textMain },
      formatter: params => {
        let html = `<strong>${params[0].axisValue}</strong><br/>`;
        params.forEach(p => {
          const val = p.value;
          let fmt;
          if (val >= 1e9) fmt = 'Rp ' + (val / 1e9).toFixed(2).replace('.', ',') + ' M';
          else if (val >= 1e6) fmt = 'Rp ' + (val / 1e6).toFixed(2).replace('.', ',') + ' Jt';
          else fmt = 'Rp ' + Math.round(val).toLocaleString('id-ID');
          html += `<span style="color:${p.color}">■</span> ${p.seriesName}: <strong>${fmt}</strong><br/>`;
        });
        return html;
      }
    },
    series: [
      { name: 'Revenue', type: 'bar', data: data.regional_data.map(d => d.revenue), itemStyle: { color: colors.primary, borderRadius: [4, 4, 0, 0] } },
      { name: 'Total TLC', type: 'bar', data: data.regional_data.map(d => d.tlc), itemStyle: { color: colors.orange, borderRadius: [4, 4, 0, 0] } },
      { name: 'Gross Profit', type: 'bar', data: data.regional_data.map(d => d.gross_profit), itemStyle: { color: colors.success, borderRadius: [4, 4, 0, 0] } }
    ]
  });

  // Chart: GPM Trend from real data
  if (data.gpm_trend && data.gpm_trend.length > 0) {
    initChart('chartGPMTrend', {
      ...commonChartOptions,
      grid: { top: 30, right: 30, bottom: 40, left: 40 },
      xAxis: { type: 'category', data: data.gpm_trend.map(d => d.bulan), axisLine: { lineStyle: { color: colors.borderMain } } },
      yAxis: { type: 'value', splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } }, axisLabel: { formatter: '{value}%' } },
      series: [{
        name: 'GPM (%)', type: 'line', data: data.gpm_trend.map(d => d.gpm), smooth: true, symbolSize: 8,
        itemStyle: { color: colors.primary },
        areaStyle: { color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [{ offset: 0, color: 'rgba(59,130,246,0.5)' }, { offset: 1, color: 'rgba(59,130,246,0)' }]) },
        markLine: {
          data: [
            { yAxis: 30, name: 'Target 30%', lineStyle: { color: colors.success, type: 'solid' } },
            { yAxis: 15, name: 'Batas 15%', lineStyle: { color: colors.danger, type: 'solid' } }
          ]
        }
      }]
    });
  }

  // Detail Cards GPM per wilayah
  const dataW = {};
  if (data.regional_data) {
    data.regional_data.forEach(d => {
      dataW[d.wilayah] = {
        gpm: d.gpm_percent,
        vol: d.volume,
        gp: d.gross_profit
      };
    });
  }

  function updateGPMCard(id, badgeId, volId, gpId, wData) {
    const val = wData ? wData.gpm : 0;
    const vol = wData ? wData.vol : 0;
    const gp = wData ? wData.gp : 0;
    setText(id, `${(val || 0).toFixed(1)}%`);
    setText(volId, vol.toLocaleString('id-ID'));
    // Format GP: gunakan format Rp Indonesia
    if (Math.abs(gp) >= 1e9) setText(gpId, `Rp ${(gp / 1e9).toFixed(1).replace('.', ',')} M`);
    else if (Math.abs(gp) >= 1e6) setText(gpId, `Rp ${(gp / 1e6).toFixed(1).replace('.', ',')} Jt`);
    else setText(gpId, `Rp ${Math.round(gp).toLocaleString('id-ID')}`);
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    if (val > 30) { badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-success"></span>Sehat'; badge.className = 'px-3 py-1 bg-success/10 text-success text-xs rounded-full font-medium border border-success/20 flex items-center gap-1.5'; }
    else if (val >= 15) { badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-warning"></span>Waspada'; badge.className = 'px-3 py-1 bg-warning/10 text-warning text-xs rounded-full font-medium border border-warning/20 flex items-center gap-1.5'; }
    else { badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-danger"></span>Bahaya'; badge.className = 'px-3 py-1 bg-danger/10 text-danger text-xs rounded-full font-medium border border-danger/20 flex items-center gap-1.5'; }
  }
  updateGPMCard('gpmJawa', 'badgeJawa', 'volJawa', 'gpJawa', dataW['Jawa']);
  updateGPMCard('gpmKalimantan', 'badgeKalimantan', 'volKalimantan', 'gpKalimantan', dataW['Kalimantan']);
  updateGPMCard('gpmSumatera', 'badgeSumatera', 'volSumatera', 'gpSumatera', dataW['Sumatera']);

  // Margin Gap Visuals
  renderMarginGaps(dataW);
}

function renderMarginGaps(dataW) {
  const container = document.getElementById('marginGapContainer');
  if (!container) return;
  const jawa = dataW['Jawa'] ? dataW['Jawa'].gpm : 0;
  const kalim = dataW['Kalimantan'] ? dataW['Kalimantan'].gpm : 0;
  const suma = dataW['Sumatera'] ? dataW['Sumatera'].gpm : 0;

  function gapCard(title, name1, val1, name2, val2) {
    const diff = Math.abs(val1 - val2).toFixed(1);
    return `
    <div class="bg-surface/50 border border-borderMain rounded-2xl p-6 shadow-sm flex flex-col hover:border-primary/50 transition-colors">
      <div class="flex items-center gap-2 mb-4">
        <i data-lucide="trending-up" class="w-4 h-4 text-cyan-500"></i>
        <h3 class="text-sm font-medium text-textSub">${title}</h3>
      </div>
      <div class="mb-1">
        <span class="text-3xl font-bold text-cyan-400">+${diff}%</span>
      </div>
      <div class="text-xs text-textMuted">
        [${name1}: ${val1.toFixed(1)}% | ${name2}: ${val2.toFixed(1)}%]
      </div>
    </div>`;
  }

  container.innerHTML =
    gapCard('Margin Gap Jawa vs Kalimantan', 'Kalimantan', kalim, 'Jawa', jawa) +
    gapCard('Margin Gap Jawa vs Sumatera', 'Sumatera', suma, 'Jawa', jawa) +
    gapCard('Margin Gap Kalimantan vs Sumatera', 'Sumatera', suma, 'Kalimantan', kalim);

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ===================== TAB 2: PRODUCT-REGION FIT =====================
async function loadProductFit() {
  const wilayah = document.getElementById('filterWilayahTab2')?.value || '';
  const bulan = document.getElementById('filterBulanTab2')?.value || '';
  // Simpan filter aktif secara global agar komponen lain bisa menggunakannya
  window._activeWilayahFilter = wilayah;

  // Update badge bulan pada grafik kanan (GPM Produk per Wilayah) secara dinamis
  const bulanBadge = document.getElementById('chartTopGPMBulanBadge');
  if (bulanBadge) {
    if (bulan) {
      bulanBadge.textContent = `✓ ${bulan}`;
      bulanBadge.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/15 text-primary';
    } else {
      bulanBadge.textContent = '✓ Semua Bulan';
      bulanBadge.className = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-success/15 text-success';
    }
  }

  let params = [];
  if (wilayah) params.push(`wilayah=${encodeURIComponent(wilayah)}`);
  if (bulan) params.push(`bulan=${encodeURIComponent(bulan)}`);
  const qs = params.length ? '?' + params.join('&') : '';

  // Tampilkan loading state pada chart kiri
  const fitInfo = document.getElementById('chartProductFitInfo');
  if (fitInfo) fitInfo.textContent = 'Memuat data...';

  const res = await apiFetch('/analytics/product-fit' + qs);
  if (!res) return;
  const data = await res.json();

  // ── Agregasi per nama_model (gabung jika muncul di beberapa wilayah) ──
  const modelMap = {};
  data.forEach(d => {
    const key = d.nama_model;
    if (!modelMap[key]) {
      modelMap[key] = {
        nama_model: d.nama_model, id_produk: d.id_produk, kategori: d.kategori,
        wilayah: d.wilayah, volume: 0, total_profit: 0,
        gpm_sum: 0, count: 0, status: d.status
      };
    }
    modelMap[key].volume += d.volume;
    modelMap[key].total_profit += d.total_profit;
    modelMap[key].gpm_sum += d.gpm_percent;
    modelMap[key].count += 1;
  });
  const models = Object.values(modelMap)
    .map(m => ({ ...m, gpm: m.count > 0 ? m.gpm_sum / m.count : 0 }))
    .sort((a, b) => b.gpm - a.gpm); // urutkan GPM tertinggi di atas

  // ── Horizontal Bar Chart: Ranking GPM per Produk ──
  // Batasi max 15 produk agar tidak terlalu panjang; sisanya ada di tabel
  const MAX_BARS = 15;
  const chartModels = models.slice(0, MAX_BARS).reverse(); // reverse agar tertinggi di atas

  const barColors = chartModels.map(m =>
    m.gpm > 30 ? colors.success : m.gpm >= 15 ? colors.warning : colors.danger
  );

  initChart('chartProductFit', {
    ...commonChartOptions,
    grid: { top: 20, right: 80, bottom: 35, left: 110 },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      backgroundColor: 'rgba(15, 23, 42, 0.95)',
      borderColor: colors.borderMain,
      borderWidth: 1,
      padding: [10, 14],
      textStyle: { color: colors.textMain, fontSize: 12 },
      formatter: params => {
        const p = params[0];
        const m = chartModels[p.dataIndex];
        const statusColor = m.gpm > 30 ? colors.success : m.gpm >= 15 ? colors.warning : colors.danger;
        const profitFmt = Math.abs(m.total_profit) >= 1e6
          ? `Rp ${(m.total_profit / 1e6).toFixed(1).replace('.', ',')} Jt`
          : `Rp ${Math.round(m.total_profit).toLocaleString('id-ID')}`;
        return `
          <div style="font-weight:700;font-size:13px;margin-bottom:5px;color:#F1F5F9">${m.nama_model}</div>
          <div style="color:#94A3B8;font-size:11px;margin-bottom:8px">${m.id_produk} · ${m.kategori}</div>
          <table style="font-size:12px;border-collapse:collapse">
            <tr><td style="color:#94A3B8;padding:2px 10px 2px 0">GPM</td>
                <td style="font-weight:700;color:${statusColor}">${m.gpm.toFixed(1)}%
                    <span style="font-size:10px;font-weight:400;margin-left:4px">(${m.status})</span></td></tr>
            <tr><td style="color:#94A3B8;padding:2px 10px 2px 0">Volume</td>
                <td style="font-weight:600">${m.volume.toLocaleString('id-ID')} unit</td></tr>
            <tr><td style="color:#94A3B8;padding:2px 10px 2px 0">Total Profit</td>
                <td style="font-weight:600;color:${statusColor}">${profitFmt}</td></tr>
          </table>`;
      }
    },
    xAxis: {
      type: 'value',
      axisLabel: { formatter: '{value}%', color: colors.textSub, fontSize: 10 },
      axisLine: { lineStyle: { color: colors.borderMain } },
      splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } },
      min: 0, max: v => Math.ceil(v.max + 5)
    },
    yAxis: {
      type: 'category',
      data: chartModels.map(m => m.nama_model),
      axisLabel: { color: colors.textSub, fontSize: 11, width: 100, overflow: 'truncate' },
      axisLine: { lineStyle: { color: colors.borderMain } },
      axisTick: { show: false }
    },
    series: [{
      type: 'bar',
      data: chartModels.map((m, i) => ({
        value: parseFloat(m.gpm.toFixed(2)),
        itemStyle: { color: barColors[i], borderRadius: [0, 4, 4, 0] }
      })),
      barMaxWidth: 20,
      label: {
        show: true,
        position: 'right',
        fontSize: 10,
        color: colors.textSub,
        formatter: p => {
          const m = chartModels[p.dataIndex];
          const vol = m.volume >= 1e6 ? (m.volume / 1e6).toFixed(1) + 'Jt'
            : m.volume >= 1000 ? (m.volume / 1000).toFixed(0) + 'K' : m.volume;
          return `${p.value.toFixed(1)}%  (${vol})`;
        }
      },
      markLine: {
        silent: true, animation: false,
        lineStyle: { type: 'dashed', width: 1.5 },
        data: [
          {
            xAxis: 30, lineStyle: { color: colors.success, opacity: 0.7 },
            label: { color: colors.success, formatter: 'Sehat \u226530%', fontSize: 10, position: 'insideEndTop' }
          },
          {
            xAxis: 15, lineStyle: { color: colors.warning, opacity: 0.7 },
            label: { color: colors.warning, formatter: 'Waspada \u226515%', fontSize: 10, position: 'insideEndTop' }
          }
        ]
      }
    }]
  });

  // Update info grafik kiri: jumlah produk + konteks filter (tanpa pesan peringatan teknis)
  const infoEl = document.getElementById('chartProductFitInfo');
  if (infoEl) {
    const countNote = models.length > MAX_BARS
      ? `Menampilkan ${MAX_BARS} dari ${models.length} produk (lihat tabel untuk semua). `
      : `${models.length} produk ditampilkan. `;
    const filterNote = wilayah
      ? `GPM khusus wilayah <strong>${wilayah}</strong>.`
      : `Pilih wilayah di dropdown untuk melihat nilai spesifik per wilayah.`;
    infoEl.innerHTML = countNote + filterNote;
  }


  // ── Grafik Kanan: GPM per Produk per Wilayah ──
  // Selalu fetch SEMUA wilayah (abaikan filter wilayah, tetap pakai filter bulan)
  // Supaya perbandingan antar wilayah selalu terlihat, apapun kondisi filter
  const qs2 = bulan ? `?bulan=${encodeURIComponent(bulan)}` : '';
  const res2 = await apiFetch('/analytics/product-fit' + qs2);
  if (res2) {
    const allData = await res2.json();

    // Kelompokkan: { nama_model -> { Jawa: gpm, Sumatera: gpm, Kalimantan: gpm, total: gpm, count: n } }
    const pwMap = {};
    allData.forEach(d => {
      if (!pwMap[d.nama_model]) pwMap[d.nama_model] = { total: 0, count: 0 };
      pwMap[d.nama_model][d.wilayah] = d.gpm_percent;
      pwMap[d.nama_model].total += d.gpm_percent;
      pwMap[d.nama_model].count += 1;
    });

    // Ambil top 8 produk berdasarkan rata-rata GPM, lalu reverse (tertinggi di atas)
    const MAX_RIGHT = 8;
    const sortedProds = Object.entries(pwMap)
      .map(([nama, v]) => ({ nama, avg: v.total / v.count, data: v }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, MAX_RIGHT)
      .reverse();

    const wilayahList = ['Jawa', 'Sumatera', 'Kalimantan'];
    const wilayahColor = { Jawa: colors.primary, Sumatera: colors.orange, Kalimantan: colors.purple };

    initChart('chartTopGPM', {
      ...commonChartOptions,
      grid: { top: 35, right: 20, bottom: 35, left: 110 },
      legend: {
        data: wilayahList, top: 5, right: 0,
        textStyle: { color: colors.textSub }, itemWidth: 12, itemHeight: 12
      },
      tooltip: {
        trigger: 'axis', axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(15,23,42,0.95)', borderColor: colors.borderMain,
        borderWidth: 1, padding: [10, 14],
        textStyle: { color: colors.textMain, fontSize: 12 },
        formatter: params => {
          let html = `<div style="font-weight:700;font-size:13px;margin-bottom:6px;color:#F1F5F9">${params[0].axisValue}</div>`;
          params.forEach(p => {
            if (p.value === null || p.value === undefined) return;
            const col = wilayahColor[p.seriesName] || '#fff';
            const status = p.value > 30 ? 'Sehat' : p.value >= 15 ? 'Waspada' : 'Bahaya';
            const sCol = p.value > 30 ? colors.success : p.value >= 15 ? colors.warning : colors.danger;
            html += `<span style="color:${col}">&#9632;</span> ${p.seriesName}: `
              + `<strong style="color:${sCol}">${p.value.toFixed(1)}%</strong> `
              + `<span style="color:#64748B;font-size:10px">(${status})</span><br/>`;
          });
          return html;
        }
      },
      xAxis: {
        type: 'value', min: 0, max: v => Math.ceil(v.max + 5),
        axisLabel: { formatter: '{value}%', color: colors.textSub, fontSize: 10 },
        axisLine: { lineStyle: { color: colors.borderMain } },
        splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } }
      },
      yAxis: {
        type: 'category', data: sortedProds.map(p => p.nama),
        axisLabel: { color: colors.textSub, fontSize: 11, width: 105, overflow: 'truncate' },
        axisLine: { lineStyle: { color: colors.borderMain } }, axisTick: { show: false }
      },
      series: wilayahList.map(w => ({
        name: w, type: 'bar', barMaxWidth: 14,
        itemStyle: { color: wilayahColor[w], borderRadius: [0, 3, 3, 0] },
        data: sortedProds.map(p => p.data[w] !== undefined ? parseFloat(p.data[w].toFixed(2)) : null)
      }))
    });
  }

  // Table - Matriks Kinerja Produk Regional (DINAMIS + PAGINASI)
  // Sort: Status priority (Bahaya→Waspada→Sehat) lalu GPM descending
  const statusPriority = { 'Bahaya': 0, 'Waspada': 1, 'Sehat': 2 };
  const sortedData = [...data].sort((a, b) => {
    const sp = (statusPriority[a.status] ?? 9) - (statusPriority[b.status] ?? 9);
    if (sp !== 0) return sp;
    return b.gpm_percent - a.gpm_percent; // GPM tertinggi dalam status yang sama
  });
  window._productFitData = sortedData;
  window._productFitPage = 1;
  renderProductFitTable();
}

const PRODUCT_TABLE_PAGE_SIZE = 10;

function renderProductFitTable() {
  const data = window._productFitData || [];
  const page = window._productFitPage || 1;
  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / PRODUCT_TABLE_PAGE_SIZE));
  const start = (page - 1) * PRODUCT_TABLE_PAGE_SIZE;
  const pageData = data.slice(start, start + PRODUCT_TABLE_PAGE_SIZE);

  // Smart conditional: gunakan kolom kota saat filter wilayah aktif
  const isKotaMode = !!window._activeWilayahFilter;
  const lokasiHeader = document.getElementById('tableHeaderLokasi');
  if (lokasiHeader) {
    lokasiHeader.textContent = isKotaMode ? `Kota (${window._activeWilayahFilter})` : 'Wilayah';
  }

  const tbody = document.querySelector('#tab2 table tbody');
  if (tbody) {
    if (!data || data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-textMuted py-8">Tidak ada data tersedia.</td></tr>';
    } else {
      // Alternating band per produk
      const modelBands = {};
      let bandIdx = 0;
      pageData.forEach(d => {
        if (!(d.nama_model in modelBands)) { modelBands[d.nama_model] = bandIdx++; }
      });

      tbody.innerHTML = pageData.map(d => {
        const band = modelBands[d.nama_model] % 2 === 0 ? '' : 'bg-bgMain/20';
        const gpmColor = d.gpm_percent > 30 ? 'text-success' : d.gpm_percent >= 15 ? 'text-warning' : 'text-danger';
        const badge = d.status === 'Sehat'
          ? '<span class="badge bg-success/20 text-success border-transparent">Sehat</span>'
          : d.status === 'Waspada'
            ? '<span class="badge bg-warning/20 text-warning border-transparent">Waspada</span>'
            : '<span class="badge bg-danger/20 text-danger border-transparent">Bahaya</span>';
        let profitFmt;
        if (Math.abs(d.total_profit) >= 1e9) profitFmt = `Rp ${(d.total_profit / 1e9).toFixed(1).replace('.', ',')} M`;
        else if (Math.abs(d.total_profit) >= 1e6) profitFmt = `Rp ${(d.total_profit / 1e6).toFixed(1).replace('.', ',')} Jt`;
        else profitFmt = `Rp ${Math.round(d.total_profit).toLocaleString('id-ID')}`;

        // Kolom lokasi: kota (saat filter wilayah aktif) atau wilayah (saat semua wilayah)
        const lokasiValue = isKotaMode
          ? (d.kota || d.wilayah || '-')
          : (d.wilayah || '-');

        return `<tr class="hover:bg-primary/5 transition-colors ${band}">
          <td>
            <div class="font-medium text-textMain">${d.nama_model || '-'}</div>
            <div class="text-xs text-textMuted mt-0.5">${d.id_produk}</div>
          </td>
          <td>${lokasiValue}</td>
          <td>${d.kategori || '-'}</td>
          <td class="text-right">${d.volume.toLocaleString('id-ID')}</td>
          <td class="text-right font-bold ${gpmColor}">${d.gpm_percent.toFixed(1)}%</td>
          <td class="text-right">${profitFmt}</td>
          <td class="text-center">${badge}</td>
        </tr>`;
      }).join('');
    }
  }

  // Sembunyikan pagination jika hanya 1 halaman — tidak perlu tombol next/prev
  let paginationEl = document.getElementById('productTablePagination');
  if (totalPages <= 1) {
    if (paginationEl) paginationEl.style.display = 'none';
    return;
  }

  if (!paginationEl) {
    paginationEl = document.createElement('div');
    paginationEl.id = 'productTablePagination';
    const tableContainer = document.querySelector('#tab2 .overflow-x-auto');
    if (tableContainer) tableContainer.parentElement.appendChild(paginationEl);
  }
  paginationEl.style.display = '';
  const filterNote = window._activeWilayahFilter
    ? `<span class="text-primary font-medium ml-2">· Filter: ${window._activeWilayahFilter}</span>` : '';
  paginationEl.className = 'flex items-center justify-between px-6 py-3 border-t border-borderMain text-sm text-textSub';
  paginationEl.innerHTML = `
    <span>Menampilkan <strong class="text-textMain">${start + 1}–${Math.min(start + PRODUCT_TABLE_PAGE_SIZE, total)}</strong>
    dari <strong class="text-textMain">${total}</strong> baris${filterNote}</span>
    <div class="flex items-center gap-2">
      <button onclick="productTablePrev()" ${page <= 1 ? 'disabled' : ''}
        class="px-3 py-1 rounded-lg border border-borderMain text-textSub hover:text-textMain hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
        ← Prev
      </button>
      <span class="px-2 text-textMain font-medium">${page} / ${totalPages}</span>
      <button onclick="productTableNext()" ${page >= totalPages ? 'disabled' : ''}
        class="px-3 py-1 rounded-lg border border-borderMain text-textSub hover:text-textMain hover:border-primary/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all">
        Next →
      </button>
    </div>
  `;
}

function productTablePrev() {
  if (window._productFitPage > 1) { window._productFitPage--; renderProductFitTable(); }
}
function productTableNext() {
  const total = (window._productFitData || []).length;
  const totalPages = Math.max(1, Math.ceil(total / PRODUCT_TABLE_PAGE_SIZE));
  if (window._productFitPage < totalPages) { window._productFitPage++; renderProductFitTable(); }
}

// ===================== TAB 3: EVALUASI LOGISTIK (INTERNAL & EKSTERNAL) =====================

// --- GRAFIK KIRI: Internal Sukabumi (KEBAL terhadap filter bulan) ---
async function loadInternalSukabumi() {
  const kapasitas = document.getElementById('rangeKarungTab3')?.value || 100000;
  const res = await apiFetch(`/analytics/evaluasi-logistik/internal?kapasitas=${kapasitas}`);
  if (!res) return;
  const data = await res.json();

  // KPI Internal (YTD — selalu semua bulan)
  const setTxt = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  // Format Rupiah Indonesia: gunakan formatRpShort jika tersedia (didefinisikan di loadProfitabilitas)
  function fmtRpKpi(val) {
    if (val >= 1e9) return `Rp ${(val / 1e9).toFixed(1).replace('.', ',')} M`;
    if (val >= 1e6) return `Rp ${(val / 1e6).toFixed(1).replace('.', ',')} Jt`;
    return `Rp ${Math.round(val).toLocaleString('id-ID')}`;
  }
  setTxt('kpiKebocoranInternal', fmtRpKpi(data.kpi_kebocoran_ytd));

  // Chart Kiri: Internal Sukabumi (Bar & Line)
  const sukabumi = data.sukabumi_chart;
  const sBulan = sukabumi.map(d => d.bulan);
  const sUtil = sukabumi.map(d => parseFloat(d.utilization.toFixed(1)));
  const sCost = sukabumi.map(d => parseFloat(d.cost_per_unit.toFixed(0)));

  initChart('chartInternalSukabumi', {
    ...commonChartOptions,
    grid: { top: 40, right: 60, bottom: 50, left: 60 },
    tooltip: {
      trigger: 'axis',
      formatter: function (params) {
        let util = params.find(p => p.seriesName === 'Utilization (%)');
        let cost = params.find(p => p.seriesName === 'Cost per Unit (Rp)');
        let res = `<strong>${params[0].axisValue}</strong><br/>`;
        if (cost) res += `<span style="color:${colors.orange}">■</span> Cost/Unit: Rp ${cost.value.toLocaleString('id-ID')}<br/>`;
        if (util) res += `<span style="color:${colors.primary}">●</span> Utilization: ${util.value}%`;
        return res;
      }
    },
    xAxis: { type: 'category', data: sBulan, axisLine: { lineStyle: { color: colors.borderMain } }, axisLabel: { fontSize: 11, interval: 0 } },
    yAxis: [
      { type: 'value', name: 'Cost/Unit (Rp)', nameTextStyle: { color: colors.orange, fontWeight: 'bold' }, axisLabel: { color: colors.orange, formatter: v => 'Rp ' + Math.round(v).toLocaleString('id-ID') }, splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } } },
      { type: 'value', name: 'Util (%)', nameTextStyle: { color: colors.primary, fontWeight: 'bold' }, axisLabel: { color: colors.primary, formatter: '{value}%' }, splitLine: { show: false }, min: 0, alignTicks: true }
    ],
    series: [
      {
        name: 'Cost per Unit (Rp)', type: 'bar', data: sCost, itemStyle: { color: colors.orange, borderRadius: [4, 4, 0, 0] },
        label: {
          show: true,
          position: 'insideTop',
          formatter: 'Rp {c}',
          fontSize: 9,
          color: '#fff',
          fontWeight: 'bold',
          distance: 5
        }
      },
      {
        name: 'Utilization (%)', type: 'line', yAxisIndex: 1, data: sUtil, itemStyle: { color: colors.primary }, symbolSize: 8,
        label: {
          show: true,
          position: 'top',
          formatter: '{c}%',
          fontSize: 10,
          fontWeight: 'bold',
          color: colors.primary
        },
        markLine: {
          data: [{ yAxis: 100, name: 'Kapasitas Penuh', lineStyle: { color: colors.success, type: 'dashed' } }]
        }
      }
    ]
  });
}

// --- GRAFIK KANAN + KPI EKSTERNAL + TABEL (dipengaruhi filter bulan) ---
async function loadEksternalCOD() {
  const bulan = document.getElementById('filterBulanTab3')?.value || '';
  const kapasitas = document.getElementById('rangeKarungTab3')?.value || 100000;

  let params = [];
  if (bulan) params.push(`bulan=${encodeURIComponent(bulan)}`);
  params.push(`kapasitas=${encodeURIComponent(kapasitas)}`);
  const qs = '?' + params.join('&');

  const res = await apiFetch('/analytics/evaluasi-logistik/eksternal' + qs);
  if (!res) return;
  const data = await res.json();

  // KPI Eksternal
  const setTxt = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  setTxt('kpiLcrEksternal', `${data.kpi.avg_lcr_external.toFixed(1)}%`);
  setTxt('kpiRuteTermahal', data.kpi.rute_termahal);
  setTxt('kpiLcrRuteTermahal', `${data.kpi.lcr_rute_termahal.toFixed(1)}%`);

  // Chart Kanan: Eksternal COD (Dual Axis Bar & Line)
  const eksternal = data.external_chart;
  const eKota = eksternal.map(d => d.kota);
  const eQty = eksternal.map(d => d.qty);
  const eLcr = eksternal.map(d => parseFloat(d.lcr.toFixed(1)));

  initChart('chartEksternalCOD', {
    ...commonChartOptions,
    grid: { top: 40, right: 40, bottom: 70, left: 50 },
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: eKota, axisLine: { lineStyle: { color: colors.borderMain } }, axisLabel: { rotate: 45, fontSize: 10, interval: 0, formatter: v => v.length > 10 ? v.slice(0, 10) + '…' : v } },
    yAxis: [
      { type: 'value', name: 'Volume', nameTextStyle: { color: colors.purple, fontWeight: 'bold' }, axisLabel: { color: colors.purple }, splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } } },
      { type: 'value', name: 'LCR (%)', nameTextStyle: { color: colors.warning, fontWeight: 'bold' }, axisLabel: { color: colors.warning, formatter: '{value}%' }, splitLine: { show: false }, alignTicks: true }
    ],
    series: [
      { name: 'Volume Penjualan', type: 'bar', data: eQty, itemStyle: { color: colors.purple, borderRadius: [4, 4, 0, 0] } },
      {
        name: 'Beban Ongkir (LCR)', type: 'line', yAxisIndex: 1, data: eLcr, symbolSize: 8,
        itemStyle: { color: p => p.value <= 15 ? colors.success : (p.value <= 25 ? colors.warning : colors.danger) },
        lineStyle: { color: colors.warning },
        markLine: {
          data: [
            { yAxis: 15, name: 'Rawan (>15%)', lineStyle: { color: colors.warning, type: 'dashed' } },
            { yAxis: 25, name: 'Bahaya (>25%)', lineStyle: { color: colors.danger, type: 'solid' } }
          ]
        }
      }
    ]
  });

  // Tabel Keseluruhan (format Rupiah Indonesia konsisten)
  const tbody = document.getElementById('tableEvaluasiBody');
  if (tbody) {
    tbody.innerHTML = data.tabel_data.map(d => {
      const isDataTidakTersedia = d.status === 'Data ongkir belum tersedia';

      let badgeColor;
      if (isDataTidakTersedia) {
        badgeColor = 'textMuted'; // abu-abu netral, BUKAN merah/danger (bukan "Bahaya")
      } else if (d.status.includes('Optimal') || d.status.includes('Sehat')) {
        badgeColor = 'success';
      } else if (d.status.includes('Rawan') || d.status.includes('Under-utilized')) {
        badgeColor = 'warning';
      } else {
        badgeColor = 'danger';
      }

      const badge = isDataTidakTersedia
        ? `<span class="badge bg-slate-400/20 text-slate-400 border-transparent">${d.status}</span>`
        : `<span class="badge bg-${badgeColor}/20 text-${badgeColor} border-transparent">${d.status}</span>`;

      // --- PERBAIKAN: cost_per_unit & lcr bisa null, jangan panggil .toFixed()/Math.round() langsung ---
      const costFmt = (d.cost_per_unit === null || d.cost_per_unit === undefined)
        ? '-'
        : `Rp ${Math.round(d.cost_per_unit).toLocaleString('id-ID')}`;

      const lcrFmt = (d.lcr === null || d.lcr === undefined)
        ? '-'
        : `${d.lcr.toFixed(1)}%`;

      const kebocoranFmt = (d.kebocoran && d.kebocoran > 0)
        ? `Rp ${Math.round(d.kebocoran).toLocaleString('id-ID')}`
        : '-';

      const kapasitasFmt = (d.kapasitas && d.kapasitas !== '-')
        ? Number(d.kapasitas).toLocaleString('id-ID')
        : '-';

      return `<tr class="hover:bg-bgMain/30 transition-colors ${isDataTidakTersedia ? 'opacity-60' : ''}">
      <td class="font-medium text-textSub whitespace-nowrap">${d.wilayah}</td>
      <td class="whitespace-nowrap">${d.kota}</td>
      <td><span class="text-xs px-2 py-1 bg-surface border border-borderMain rounded text-textSub whitespace-nowrap">${d.skema}</span></td>
      <td class="text-right whitespace-nowrap">${d.qty.toLocaleString('id-ID')}</td>
      <td class="text-right whitespace-nowrap">${kapasitasFmt}</td>
      <td class="text-right whitespace-nowrap">${costFmt}</td>
      <td class="text-right font-bold whitespace-nowrap ${isDataTidakTersedia ? 'text-textMuted' : 'text-' + badgeColor}">${lcrFmt}</td>
      <td class="text-right whitespace-nowrap ${d.skema.includes('Sewa') && d.kebocoran > 0 ? 'font-bold text-' + badgeColor : 'text-textMuted'}">
        ${kebocoranFmt}
      </td>
      <td class="text-center">${badge}</td>
    </tr>`;
    }).join('');
  }
}

// ===================== EVENT LISTENERS =====================
function setupFilterListeners() {
  // Tab 1: Bulan filter
  document.getElementById('filterBulanTab1')?.addEventListener('change', () => loadProfitabilitas());

  // Tab 2: Wilayah & Bulan filters
  document.getElementById('filterWilayahTab2')?.addEventListener('change', () => loadProductFit());
  document.getElementById('filterBulanTab2')?.addEventListener('change', () => loadProductFit());

  // Tab 3: Filter Bulan → hanya reload Eksternal (grafik kiri TIDAK bergerak)
  document.getElementById('filterBulanTab3')?.addEventListener('change', () => loadEksternalCOD());

  // Tab 3: Slider Kapasitas → reload SEMUA (grafik kiri + kanan + tabel)
  const rangeEl = document.getElementById('rangeKarungTab3');
  const rangeLabel = document.getElementById('rangeKarungValueTab3');
  if (rangeEl && rangeLabel) {
    rangeEl.addEventListener('input', () => { rangeLabel.textContent = parseInt(rangeEl.value).toLocaleString('id-ID'); });
    let debounceTimer;
    rangeEl.addEventListener('change', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        loadInternalSukabumi();
        loadEksternalCOD();
      }, 300);
    });
  }
}

// ===================== INIT =====================
// Gunakan DOMContentLoaded + requestAnimationFrame:
// - DOMContentLoaded: pastikan semua elemen HTML sudah siap
// - requestAnimationFrame: tunggu 1 frame render agar container chart punya dimensi
// Ini menghilangkan flicker dropdown yang terjadi karena setTimeout(500) yang terlalu lambat
document.addEventListener('DOMContentLoaded', () => {
  requestAnimationFrame(async () => {
    await loadFilters();   // isi dropdown PERTAMA, sebelum chart apapun di-load
    setupFilterListeners();
    loadProfitabilitas();
    loadProductFit();
    loadInternalSukabumi();
    loadEksternalCOD();
  });
});

// Removed global window resize to prevent dropdown flicker.
// Resizing is now handled smartly by ResizeObserver in initChart.

