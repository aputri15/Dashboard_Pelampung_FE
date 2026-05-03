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

window.appCharts = {};

function initChart(id, option) {
  const el = document.getElementById(id);
  if (!el) return;
  const existingChart = echarts.getInstanceByDom(el);
  if (existingChart) existingChart.dispose();
  const chart = echarts.init(el);
  chart.setOption(option);
  window.appCharts[id] = chart;
}

// ===================== POPULATE DROPDOWNS =====================
async function loadFilters() {
  const res = await apiFetch('/analytics/filters');
  if (!res) return;
  const f = await res.json();

  function fillSelect(id, items, labelKey, valueKey) {
    const sel = document.getElementById(id);
    if (!sel) return;
    const defaultOpt = sel.options[0];
    sel.innerHTML = '';
    sel.appendChild(defaultOpt);
    items.forEach(item => {
      const opt = document.createElement('option');
      opt.value = typeof item === 'object' ? item[valueKey] : item;
      opt.textContent = typeof item === 'object' ? item[labelKey] : item;
      sel.appendChild(opt);
    });
  }

  // Tab1 bulan
  fillSelect('filterBulanTab1', f.months, 'label', 'value');
  // Tab2
  fillSelect('filterWilayahTab2', f.wilayah, null, null);
  fillSelect('filterModelTab2', f.models, null, null);
  fillSelect('filterBulanTab2', f.months, 'label', 'value');
  // Tab3
  fillSelect('filterModelTab3', f.models, null, null);
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
  setText('kpiRevenue', `Rp ${(kpi.total_revenue / 1e6).toFixed(1)}M`);
  setText('kpiTLC', `Rp ${(kpi.total_tlc / 1e6).toFixed(1)}M`);
  setText('kpiGrossProfit', `Rp ${(kpi.total_gross_profit / 1e6).toFixed(1)}M`);
  setText('kpiAvgGPM', `${kpi.avg_gpm_percent.toFixed(1)}%`);
  setText('kpiVolume', kpi.total_volume.toLocaleString('id-ID'));

  // Chart: Revenue vs TLC vs Gross Profit
  const wilayah = data.regional_data.map(d => d.wilayah);
  initChart('chartProfitRegion', {
    ...commonChartOptions,
    grid: { top: 30, right: 20, bottom: 40, left: 60 },
    xAxis: { type: 'category', data: wilayah, axisLine: { lineStyle: { color: colors.borderMain } } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } }, axisLabel: { formatter: v => (v / 1e6).toFixed(0) + 'M' } },
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
        markLine: { data: [
          { yAxis: 30, name: 'Target 30%', lineStyle: { color: colors.success, type: 'solid' } },
          { yAxis: 15, name: 'Batas 15%', lineStyle: { color: colors.danger, type: 'solid' } }
        ]}
      }]
    });
  }

  // Detail Cards GPM per wilayah
  const gpmW = data.gpm_per_wilayah || {};
  function updateGPMCard(id, badgeId, val) {
    setText(id, `${(val || 0).toFixed(1)}%`);
    const badge = document.getElementById(badgeId);
    if (!badge) return;
    if (val > 30) { badge.textContent = 'Sehat'; badge.className = 'px-3 py-1 bg-success/20 text-success text-xs rounded-full font-medium border border-success/30'; }
    else if (val >= 15) { badge.textContent = 'Waspada'; badge.className = 'px-3 py-1 bg-warning/20 text-warning text-xs rounded-full font-medium border border-warning/30'; }
    else { badge.textContent = 'Bahaya'; badge.className = 'px-3 py-1 bg-danger/20 text-danger text-xs rounded-full font-medium border border-danger/30'; }
  }
  updateGPMCard('gpmJawa', 'badgeJawa', gpmW['Jawa'] || 0);
  updateGPMCard('gpmKalimantan', 'badgeKalimantan', gpmW['Kalimantan'] || 0);
  updateGPMCard('gpmSumatera', 'badgeSumatera', gpmW['Sumatera'] || 0);

  // Margin Gap Visuals
  renderMarginGaps(gpmW);
}

function renderMarginGaps(gpmW) {
  const container = document.getElementById('marginGapContainer');
  if (!container) return;
  const jawa = gpmW['Jawa'] || 0, kalim = gpmW['Kalimantan'] || 0, suma = gpmW['Sumatera'] || 0;
  const maxGpm = Math.max(jawa, kalim, suma, 1);
  function pct(v) { return Math.max((v / (maxGpm * 1.2)) * 100, 5).toFixed(1); }
  function gap(a, b) { return Math.abs(a - b).toFixed(1); }
  function relDiff(a, b) { return b > 0 ? Math.abs(((a - b) / b) * 100).toFixed(0) : '0'; }

  function gapCard(title, icon, borderColor, name1, val1, color1, name2, val2, color2, alertBg, alertBorder, alertText) {
    const g = gap(val1, val2);
    const rd = relDiff(val2, val1);
    const lower = val1 > val2 ? name2 : name1;
    const higher = val1 > val2 ? name1 : name2;
    return `
    <div class="bg-surface border ${borderColor} rounded-2xl p-6 shadow-sm flex flex-col h-full">
      <div class="flex items-center gap-2 mb-6">
        <i data-lucide="${icon}" class="w-5 h-5 ${alertText}"></i>
        <h3 class="text-lg font-medium text-textMain">${title}</h3>
      </div>
      <div class="space-y-4">
        <div class="relative w-full bg-bgMain rounded-full h-8 overflow-hidden border border-borderMain">
          <div class="absolute top-0 left-0 h-full ${color1} flex items-center justify-end pr-3 transition-all duration-1000" style="width:${pct(val1)}%">
            <span class="text-xs font-bold text-white whitespace-nowrap">${name1}: ${val1.toFixed(1)}%</span>
          </div>
        </div>
        <div class="relative w-full bg-bgMain rounded-full h-8 overflow-hidden border border-borderMain">
          <div class="absolute top-0 left-0 h-full ${color2} flex items-center ${pct(val2) > 30 ? 'justify-end pr-3' : 'justify-start pl-3'} transition-all duration-1000" style="width:${pct(val2)}%">
            <span class="text-xs font-bold text-white whitespace-nowrap">${name2}: ${val2.toFixed(1)}%</span>
          </div>
        </div>
      </div>
      <div class="mt-auto pt-6">
        <div class="${alertBg} border ${alertBorder} rounded-xl p-4">
          <p class="text-sm ${alertText} font-medium leading-relaxed">Gap: ${g}%<br/>Margin ${lower} ~${rd}% lebih rendah dari ${higher}</p>
        </div>
      </div>
    </div>`;
  }

  container.innerHTML =
    gapCard('Margin Gap: Jawa vs Kalimantan', 'alert-triangle', 'border-warning/30', 'Jawa', jawa, 'bg-primary', 'Kalimantan', kalim, 'bg-warning', 'bg-warning/10', 'border-warning/20', 'text-warning') +
    gapCard('Margin Gap: Jawa vs Sumatera', 'alert-circle', 'border-purple-500/30', 'Jawa', jawa, 'bg-primary', 'Sumatera', suma, 'bg-purple-500', 'bg-purple-500/10', 'border-purple-500/20', 'text-purple-400') +
    gapCard('Margin Gap: Kalimantan vs Sumatera', 'alert-octagon', 'border-danger/30', 'Kalimantan', kalim, 'bg-warning', 'Sumatera', suma, 'bg-danger', 'bg-danger/10', 'border-danger/20', 'text-danger');

  if (typeof lucide !== 'undefined') lucide.createIcons();
}

// ===================== TAB 2: PRODUCT-REGION FIT =====================
async function loadProductFit() {
  const wilayah = document.getElementById('filterWilayahTab2')?.value || '';
  const model = document.getElementById('filterModelTab2')?.value || '';
  const bulan = document.getElementById('filterBulanTab2')?.value || '';
  let params = [];
  if (wilayah) params.push(`wilayah=${encodeURIComponent(wilayah)}`);
  if (model) params.push(`model=${encodeURIComponent(model)}`);
  if (bulan) params.push(`bulan=${encodeURIComponent(bulan)}`);
  const qs = params.length ? '?' + params.join('&') : '';

  const res = await apiFetch('/analytics/product-fit' + qs);
  if (!res) return;
  const data = await res.json();

  const categories = [...new Set(data.map(d => d.kategori))];
  const volumes = categories.map(c => data.filter(d => d.kategori === c).reduce((s, d) => s + d.volume, 0));
  const gpms = categories.map(c => {
    const sub = data.filter(d => d.kategori === c);
    return sub.length ? sub.reduce((s, d) => s + d.gpm_percent, 0) / sub.length : 0;
  });

  initChart('chartProductFit', {
    ...commonChartOptions,
    grid: { top: 30, right: 40, bottom: 40, left: 50 },
    xAxis: { type: 'category', data: categories, axisLine: { lineStyle: { color: colors.borderMain } } },
    yAxis: [
      { type: 'value', name: 'Volume', splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } } },
      { type: 'value', name: 'GPM (%)', splitLine: { show: false }, axisLabel: { formatter: '{value}%' } }
    ],
    series: [
      { name: 'Volume', type: 'bar', data: volumes, itemStyle: { color: colors.purple, borderRadius: [4, 4, 0, 0] } },
      { name: 'GPM (%)', type: 'line', yAxisIndex: 1, data: gpms.map(g => parseFloat(g.toFixed(2))), itemStyle: { color: colors.success }, symbolSize: 8 }
    ]
  });

  const top5 = [...data].sort((a, b) => b.gpm_percent - a.gpm_percent).slice(0, 5).reverse();
  initChart('chartTopGPM', {
    ...commonChartOptions,
    grid: { top: 10, right: 20, bottom: 40, left: 100 },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } }, axisLabel: { formatter: '{value}%' } },
    yAxis: { type: 'category', data: top5.map(d => d.nama_model), axisLine: { lineStyle: { color: colors.borderMain } } },
    series: [{
      name: 'GPM (%)', type: 'bar', data: top5.map(d => parseFloat(d.gpm_percent.toFixed(2))),
      itemStyle: {
        color: p => p.value > 30 ? colors.success : p.value > 15 ? colors.warning : colors.danger,
        borderRadius: [0, 4, 4, 0]
      }
    }]
  });

  // Table
  const tbody = document.querySelector('#tab2 table tbody');
  if (tbody) {
    tbody.innerHTML = data.slice(0, 10).map(d => {
      let badge = d.status === 'Sehat' ? '<span class="badge bg-success/20 text-success border-transparent">Sehat</span>'
        : d.status === 'Waspada' ? '<span class="badge bg-warning/20 text-warning border-transparent">Waspada</span>'
        : '<span class="badge bg-danger/20 text-danger border-transparent">Bahaya</span>';
      return `<tr class="hover:bg-bgMain/30 transition-colors">
        <td class="font-medium text-primary">${d.id_produk}</td>
        <td>${d.kategori}</td>
        <td class="text-right">${d.volume.toLocaleString()}</td>
        <td class="text-right font-bold text-textMain">${d.gpm_percent.toFixed(1)}%</td>
        <td class="text-right">Rp ${(d.total_profit / 1e6).toFixed(1)}M</td>
        <td class="text-center">${badge}</td>
      </tr>`;
    }).join('');
  }
}

// ===================== TAB 3: LUCE =====================
async function loadLuce() {
  const model = document.getElementById('filterModelTab3')?.value || '';
  const params = model ? `?model=${encodeURIComponent(model)}` : '';
  const res = await apiFetch('/analytics/luce' + params);
  if (!res) return;
  const data = await res.json();

  const cities = [...new Set(data.map(d => d.kota))];
  const models = [...new Set(data.map(d => d.nama_model))];

  const heatmapData = [];
  cities.forEach((city, cIdx) => {
    models.forEach((m, mIdx) => {
      const item = data.find(d => d.kota === city && d.nama_model === m);
      if (item) heatmapData.push([mIdx, cIdx, parseFloat(item.lcr_percent.toFixed(1))]);
    });
  });

  initChart('chartLCRHeatmap', {
    ...commonChartOptions,
    tooltip: { position: 'top', formatter: p => `${cities[p.value[1]]} × ${models[p.value[0]]}<br/>LCR: ${p.value[2]}%` },
    grid: { top: 10, right: 10, bottom: 40, left: 100 },
    xAxis: { type: 'category', data: models, splitArea: { show: true }, axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: { type: 'category', data: cities, splitArea: { show: true } },
    visualMap: { min: 0, max: 30, calculable: true, orient: 'horizontal', left: 'center', bottom: -10, inRange: { color: [colors.success, colors.warning, colors.danger] } },
    series: [{ name: 'LCR (%)', type: 'heatmap', data: heatmapData, label: { show: true, formatter: p => p.value[2] + '%', fontSize: 9 }, itemStyle: { borderColor: colors.surface, borderWidth: 2 } }]
  });

  const moqData = cities.map(city => {
    const cd = data.filter(d => d.kota === city);
    return cd.length ? cd.reduce((s, d) => s + d.min_order, 0) / cd.length : 0;
  });

  initChart('chartMOQ', {
    ...commonChartOptions,
    grid: { top: 10, right: 20, bottom: 40, left: 100 },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } } },
    yAxis: { type: 'category', data: cities, axisLine: { lineStyle: { color: colors.borderMain } } },
    series: [{ name: 'Min Order', type: 'bar', data: moqData.map(v => Math.round(v)), itemStyle: { color: colors.primary, borderRadius: [0, 4, 4, 0] } }]
  });

  const tbody = document.querySelector('#tab3 table tbody');
  if (tbody) {
    tbody.innerHTML = data.slice(0, 15).map(d => `
      <tr class="hover:bg-bgMain/30 transition-colors">
        <td class="font-medium">${d.kota}</td>
        <td>${d.nama_model}</td>
        <td class="text-right">Rp ${Math.round(d.harga_jual).toLocaleString()}</td>
        <td class="text-right">Rp ${d.biaya_log_unit.toLocaleString()}</td>
        <td class="text-right font-bold ${d.lcr_percent > 15 ? 'text-danger' : 'text-success'}">${d.lcr_percent.toFixed(1)}%</td>
        <td class="text-right text-primary font-medium">${d.min_order.toLocaleString()}</td>
        <td>${d.penanggung}</td>
      </tr>`).join('');
  }
}

// ===================== TAB 4: KEBOCORAN MARGIN =====================
async function loadKebocoran() {
  const kapasitas = document.getElementById('rangeKarung')?.value || 1000;
  const res = await apiFetch(`/analytics/kebocoran?kota=Sukabumi&kapasitas=${kapasitas}`);
  if (!res) return;
  const data = await res.json();

  // KPI
  const setTxt = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
  setTxt('kpiKebocoran', `Rp ${(data.kpi.total_kebocoran_tahun / 1e6).toFixed(1)}M`);
  setTxt('kpiUtilization', `${data.kpi.rata_utilization.toFixed(1)}%`);
  setTxt('kpiBulanTerbesar', data.kpi.bulan_terbesar);

  const monthly = [...data.monthly_data];
  const bulans = monthly.map(d => d.bulan);
  const utils = monthly.map(d => d.utilization);

  initChart('chartUtilization', {
    ...commonChartOptions,
    grid: { top: 30, right: 40, bottom: 40, left: 50 },
    xAxis: { type: 'category', data: bulans, axisLine: { lineStyle: { color: colors.borderMain } }, axisLabel: { rotate: 30, fontSize: 10 } },
    yAxis: { type: 'value', splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } }, axisLabel: { formatter: '{value}%' }, max: Math.max(100, ...utils) + 10 },
    series: [{
      name: 'Utilization', type: 'bar', data: utils,
      itemStyle: { color: p => p.value >= 80 ? colors.success : p.value >= 50 ? colors.warning : colors.danger, borderRadius: [4, 4, 0, 0] },
      markLine: { data: [
        { yAxis: 80, name: 'Optimal', lineStyle: { color: colors.success, type: 'dashed' } },
        { yAxis: 50, name: 'Batas Bawah', lineStyle: { color: colors.danger, type: 'dashed' } }
      ]}
    }]
  });

  const costA = monthly.map(d => d.cost_aktual);
  const costT = monthly.map(d => d.cost_target);
  const reversed = [...bulans].reverse();

  initChart('chartBullet', {
    ...commonChartOptions,
    grid: { top: 10, right: 20, bottom: 40, left: 80 },
    xAxis: { type: 'value', splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } }, axisLabel: { formatter: v => 'Rp ' + Math.round(v).toLocaleString() } },
    yAxis: { type: 'category', data: reversed, axisLine: { lineStyle: { color: colors.borderMain } } },
    series: [
      { name: 'Cost Aktual', type: 'bar', data: [...costA].reverse(), itemStyle: { color: colors.danger, opacity: 0.7, borderRadius: [0, 4, 4, 0] }, barWidth: '40%' },
      { name: 'Cost Target', type: 'scatter', data: [...costT].reverse(), symbol: 'rect', symbolSize: [4, 20], itemStyle: { color: colors.success }, z: 10 }
    ]
  });

  const tbody = document.querySelector('#tab4 table tbody');
  if (tbody) {
    tbody.innerHTML = monthly.map(d => `
      <tr class="hover:bg-bgMain/30 transition-colors">
        <td class="font-medium">${d.bulan}</td>
        <td class="text-right">${d.qty_aktual.toLocaleString()}</td>
        <td class="text-right">${d.kapasitas_ideal.toLocaleString()}</td>
        <td class="text-right font-bold ${d.utilization < 50 ? 'text-danger' : d.utilization < 80 ? 'text-warning' : 'text-success'}">${d.utilization.toFixed(1)}%</td>
        <td class="text-right">Rp ${Math.round(d.cost_aktual).toLocaleString()}</td>
        <td class="text-right">Rp ${Math.round(d.cost_target).toLocaleString()}</td>
        <td class="text-right text-danger font-medium">Rp ${Math.round(d.total_kebocoran).toLocaleString()}</td>
      </tr>`).join('');
  }
}

// ===================== EVENT LISTENERS =====================
function setupFilterListeners() {
  // Tab 1: Bulan filter
  document.getElementById('filterBulanTab1')?.addEventListener('change', () => loadProfitabilitas());

  // Tab 2: All three filters
  document.getElementById('filterWilayahTab2')?.addEventListener('change', () => loadProductFit());
  document.getElementById('filterModelTab2')?.addEventListener('change', () => loadProductFit());
  document.getElementById('filterBulanTab2')?.addEventListener('change', () => loadProductFit());

  // Tab 3: Model filter
  document.getElementById('filterModelTab3')?.addEventListener('change', () => loadLuce());

  // Tab 4: Range slider
  const rangeEl = document.getElementById('rangeKarung');
  const rangeLabel = document.getElementById('rangeKarungValue');
  if (rangeEl && rangeLabel) {
    rangeEl.addEventListener('input', () => { rangeLabel.textContent = rangeEl.value; });
    let debounceTimer;
    rangeEl.addEventListener('change', () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => loadKebocoran(), 300);
    });
  }
}

// ===================== INIT =====================
setTimeout(async () => {
  await loadFilters();
  setupFilterListeners();
  loadProfitabilitas();
  loadProductFit();
  loadLuce();
  loadKebocoran();
}, 500);

window.addEventListener('resize', () => {
  Object.values(window.appCharts).forEach(c => { if (c && typeof c.resize === 'function') c.resize(); });
});
