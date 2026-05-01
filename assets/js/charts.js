// ECharts Initialization for Dashboard
const colors = {
  primary: '#3B82F6',
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  textMain: '#F1F5F9',
  textSub: '#CBD5E1',
  borderMain: '#334155',
  surface: '#1E293B',
  orange: '#F97316',
  purple: '#A855F7'
};

const commonChartOptions = {
  textStyle: {
    fontFamily: 'Inter, system-ui, sans-serif',
    color: colors.textSub
  },
  backgroundColor: 'transparent',
  tooltip: {
    trigger: 'axis',
    backgroundColor: 'rgba(30, 41, 59, 0.9)',
    borderColor: colors.borderMain,
    textStyle: { color: colors.textMain },
    padding: [10, 15]
  },
  legend: {
    textStyle: { color: colors.textSub },
    bottom: 0
  }
};

// Store chart instances globally so we can resize them
window.appCharts = {};

function initChart(id, option) {
  const el = document.getElementById(id);
  if (!el) return;
  
  // Dispose existing instance for HMR compatibility
  const existingChart = echarts.getInstanceByDom(el);
  if (existingChart) existingChart.dispose();
  
  const chart = echarts.init(el);
  chart.setOption(option);
  window.appCharts[id] = chart;
}

/* ================= TAB 1 ================= */
initChart('chartProfitRegion', {
  ...commonChartOptions,
  grid: { top: 30, right: 20, bottom: 40, left: 50 },
  xAxis: {
    type: 'category',
    data: ['Jawa', 'Kalimantan', 'Sumatera'],
    axisLine: { lineStyle: { color: colors.borderMain } },
    axisLabel: { color: colors.textSub }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } },
    axisLabel: { color: colors.textSub, formatter: '{value}M' }
  },
  series: [
    { name: 'Revenue', type: 'bar', data: [150, 120, 90], itemStyle: { color: colors.primary, borderRadius: [4, 4, 0, 0] } },
    { name: 'Total TLC', type: 'bar', data: [80, 85, 75], itemStyle: { color: colors.orange, borderRadius: [4, 4, 0, 0] } },
    { name: 'Gross Profit', type: 'bar', data: [70, 35, 15], itemStyle: { color: colors.success, borderRadius: [4, 4, 0, 0] } }
  ]
});

initChart('chartGPMTrend', {
  ...commonChartOptions,
  grid: { top: 30, right: 30, bottom: 40, left: 40 },
  xAxis: {
    type: 'category',
    data: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'],
    axisLine: { lineStyle: { color: colors.borderMain } },
    axisLabel: { color: colors.textSub }
  },
  yAxis: {
    type: 'value',
    splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } },
    axisLabel: { color: colors.textSub, formatter: '{value}%' },
    max: 50
  },
  series: [
    {
      name: 'GPM (%)', type: 'line', data: [35, 32, 28, 30, 25, 34], smooth: true, symbolSize: 8, itemStyle: { color: colors.primary },
      areaStyle: {
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: 'rgba(59, 130, 246, 0.5)' }, { offset: 1, color: 'rgba(59, 130, 246, 0.0)' }
        ])
      },
      markLine: {
        data: [
          { yAxis: 30, name: 'Target 30%', lineStyle: { color: colors.success, type: 'solid' } },
          { yAxis: 15, name: 'Batas 15%', lineStyle: { color: colors.danger, type: 'solid' } }
        ],
        label: { formatter: '{b}', position: 'end', color: colors.textMuted }
      }
    }
  ]
});


/* ================= TAB 2 ================= */
initChart('chartProductFit', {
  ...commonChartOptions,
  grid: { top: 30, right: 40, bottom: 40, left: 50 },
  xAxis: {
    type: 'category',
    data: ['Balsa', 'Fosfor', 'Karet', 'Plastik'],
    axisLine: { lineStyle: { color: colors.borderMain } },
  },
  yAxis: [
    {
      type: 'value',
      name: 'Volume',
      splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } },
    },
    {
      type: 'value',
      name: 'GPM (%)',
      max: 50,
      splitLine: { show: false },
      axisLabel: { formatter: '{value}%' }
    }
  ],
  series: [
    { name: 'Volume', type: 'bar', data: [4500, 3200, 1500, 800], itemStyle: { color: colors.purple, borderRadius: [4, 4, 0, 0] } },
    { name: 'GPM (%)', type: 'line', yAxisIndex: 1, data: [35.2, 28.5, 12.4, 8.5], itemStyle: { color: colors.success }, symbolSize: 8 }
  ]
});

initChart('chartTopGPM', {
  ...commonChartOptions,
  grid: { top: 10, right: 20, bottom: 40, left: 80 },
  xAxis: { type: 'value', splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } }, axisLabel: { formatter: '{value}%' } },
  yAxis: { type: 'category', data: ['Plastik C', 'Karet B', 'Fosfor A', 'Balsa B', 'Balsa A'].reverse(), axisLine: { lineStyle: { color: colors.borderMain } } },
  series: [
    {
      name: 'GPM (%)',
      type: 'bar',
      data: [8.5, 12.4, 28.5, 32.1, 35.2].reverse(),
      itemStyle: {
        color: function(params) {
          if (params.value > 30) return colors.success;
          if (params.value > 15) return colors.warning;
          return colors.danger;
        },
        borderRadius: [0, 4, 4, 0]
      }
    }
  ]
});


/* ================= TAB 3 ================= */
const heatmapData = [[0,0,10], [0,1,18], [0,2,28], [1,0,12], [1,1,22], [1,2,30], [2,0,8], [2,1,14], [2,2,25]];
initChart('chartLCRHeatmap', {
  ...commonChartOptions,
  tooltip: { position: 'top' },
  grid: { top: 10, right: 10, bottom: 40, left: 80 },
  xAxis: { type: 'category', data: ['Balsa', 'Fosfor', 'Karet'], splitArea: { show: true } },
  yAxis: { type: 'category', data: ['Surabaya', 'Medan', 'Makassar'], splitArea: { show: true } },
  visualMap: {
    min: 0, max: 30, calculable: true, orient: 'horizontal', left: 'center', bottom: -10,
    inRange: { color: [colors.success, colors.warning, colors.danger] }
  },
  series: [{
    name: 'LCR (%)', type: 'heatmap', data: heatmapData,
    label: { show: true, formatter: '{@value}%' },
    itemStyle: { borderColor: colors.surface, borderWidth: 2 }
  }]
});

initChart('chartMOQ', {
  ...commonChartOptions,
  grid: { top: 10, right: 20, bottom: 40, left: 80 },
  xAxis: { type: 'value', splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } } },
  yAxis: { type: 'category', data: ['Makassar', 'Medan', 'Surabaya'], axisLine: { lineStyle: { color: colors.borderMain } } },
  series: [{
    name: 'Min Order', type: 'bar', data: [350, 250, 100], itemStyle: { color: colors.primary, borderRadius: [0, 4, 4, 0] }
  }]
});


/* ================= TAB 4 ================= */
initChart('chartUtilization', {
  ...commonChartOptions,
  grid: { top: 30, right: 40, bottom: 40, left: 50 },
  xAxis: { type: 'category', data: ['Jan', 'Feb', 'Mar', 'Apr'], axisLine: { lineStyle: { color: colors.borderMain } } },
  yAxis: { type: 'value', splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } }, axisLabel: { formatter: '{value}%' }, max: 100 },
  series: [{
    name: 'Utilization', type: 'bar', data: [50, 65, 85, 45],
    itemStyle: {
      color: function(params) {
        if (params.value >= 80) return colors.success;
        if (params.value >= 50) return colors.warning;
        return colors.danger;
      },
      borderRadius: [4, 4, 0, 0]
    },
    markLine: {
      data: [
        { yAxis: 80, name: 'Optimal', lineStyle: { color: colors.success, type: 'dashed' } },
        { yAxis: 50, name: 'Batas Bawah', lineStyle: { color: colors.danger, type: 'dashed' } }
      ]
    }
  }]
});

initChart('chartBullet', {
  ...commonChartOptions,
  grid: { top: 10, right: 20, bottom: 40, left: 50 },
  xAxis: { type: 'value', splitLine: { lineStyle: { color: colors.borderMain, type: 'dashed' } } },
  yAxis: { type: 'category', data: ['Apr', 'Mar', 'Feb', 'Jan'], axisLine: { lineStyle: { color: colors.borderMain } } },
  series: [
    {
      name: 'Cost Aktual', type: 'bar', data: [1800, 850, 1200, 1600],
      itemStyle: { color: colors.danger, opacity: 0.7, borderRadius: [0, 4, 4, 0] },
      barWidth: '40%'
    },
    {
      name: 'Cost Target', type: 'scatter', data: [800, 800, 800, 800],
      symbol: 'rect', symbolSize: [4, 20], itemStyle: { color: colors.success },
      z: 10
    }
  ]
});

window.addEventListener('resize', function() {
  Object.values(window.appCharts).forEach(chart => {
    if (chart && typeof chart.resize === 'function') {
      chart.resize();
    }
  });
});
