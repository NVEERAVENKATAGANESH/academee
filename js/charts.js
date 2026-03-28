// ════════════════════════════════════════════════════════
//  CHARTS  —  Chart.js wrapper with theme-aware defaults
// ════════════════════════════════════════════════════════

const Charts = (() => {
  function _defaults() {
    const isDark = State.getTheme() === 'dark';
    const gridColor  = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
    const tickColor  = isDark ? '#52525b' : '#71717a';
    const legendColor= isDark ? '#a1a1aa' : '#52525b';
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: legendColor, font: { family: 'Geist', size: 11 }, boxWidth: 12 } },
        tooltip: { bodyFont: { family: 'Geist', size: 12 }, titleFont: { family: 'Geist', size: 12 } },
      },
      scales: {
        x: { ticks: { color: tickColor, font: { size: 10 } }, grid: { color: gridColor } },
        y: { ticks: { color: tickColor, font: { size: 10 } }, grid: { color: gridColor } },
      },
    };
  }

  function make(id, type, data, options = {}) {
    State.destroyChart(id);
    const el = $(id);
    if (!el) return null;

    const base = _defaults();

    // Deep merge options
    const merged = {
      ...base,
      ...options,
      plugins: { ...base.plugins, ...(options.plugins || {}) },
    };
    // For doughnut/pie — remove scales
    if (type === 'doughnut' || type === 'pie') {
      delete merged.scales;
    }

    const chart = new Chart(el, {
      type,
      data,
      options: { ...merged, responsive: true, maintainAspectRatio: false },
    });
    State.setChart(id, chart);
    return chart;
  }

  // ── Common chart builders ─────────────────────────────
  function bar(id, labels, datasets, opts = {}) {
    return make(id, 'bar', { labels, datasets }, opts);
  }
  function line(id, labels, datasets, opts = {}) {
    return make(id, 'line', { labels, datasets }, opts);
  }
  function doughnut(id, labels, values, colors, opts = {}) {
    return make(id, 'doughnut', {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }],
    }, { plugins: { legend: { position: 'right', ...(opts.legend || {}) } }, ...opts });
  }
  function pie(id, labels, values, colors, opts = {}) {
    return make(id, 'pie', {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }],
    }, { plugins: { legend: { position: 'right' } }, ...opts });
  }

  // ── Palette constants ─────────────────────────────────
  const P = {
    blue:   'rgba(59,130,246,0.7)',
    green:  'rgba(34,197,94,0.7)',
    red:    'rgba(239,68,68,0.7)',
    amber:  'rgba(245,158,11,0.7)',
    purple: 'rgba(168,85,247,0.7)',
    teal:   'rgba(20,184,166,0.7)',
    orange: 'rgba(249,115,22,0.7)',
    grade:  ['rgba(34,197,94,0.7)','rgba(59,130,246,0.7)','rgba(245,158,11,0.7)','rgba(249,115,22,0.7)','rgba(239,68,68,0.7)'],
    fee:    ['rgba(34,197,94,0.7)','rgba(245,158,11,0.7)','rgba(239,68,68,0.7)'],
  };

  return { make, bar, line, doughnut, pie, P };
})();
