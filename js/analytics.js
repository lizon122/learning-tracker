// analytics.js — Data Analytics View (Phase 2)
window.LPA = window.LPA || {};

LPA.Analytics = (function() {
  var _container = null;
  var _charts = [];

  function render(container) {
    _container = container;
    _build();
  }

  function destroy() {
    _charts.forEach(function(c) { if (c) c.destroy(); });
    _charts = [];
    _container = null;
  }

  function _build() {
    if (!_container) return;
    // Destroy old charts before re-render
    _charts.forEach(function(c) { if (c) c.destroy(); });
    _charts = [];
    var logs = LPA.Store.getLogs();
    var courses = LPA.Store.getCourses();
    var stats = LPA.Store.getStats();
    var U = LPA.Utils;

    var html = '<h2>📈 数据分析</h2>';

    // --- Weekly Report ---
    html += _buildWeeklyReport(stats, courses);

    // --- Trend Chart ---
    html += '<div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:24px;margin-bottom:16px;box-shadow:var(--shadow-sm)">';
    html += '<h3>📉 近30天学习趋势</h3>';
    html += '<div style="height:280px;"><canvas id="chart-trend"></canvas></div>';
    html += '</div>';

    // --- Pie Chart ---
    html += '<div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:24px;margin-bottom:16px;box-shadow:var(--shadow-sm)">';
    html += '<h3>🥧 各科目学习时间分布</h3>';
    html += '<div style="max-width:400px;margin:0 auto;"><canvas id="chart-pie"></canvas></div>';
    html += '</div>';

    _container.innerHTML = html;

    // Render charts after DOM ready
    setTimeout(function() { _renderCharts(logs, courses); }, 50);
  }

  function _buildWeeklyReport(stats, courses) {
    var U = LPA.Utils;
    var week = U.weekRange();

    var efficiency = '';
    if (stats.weeklyTotalMin >= 600) efficiency = '🔥 状态极佳，本周学习投入非常高！继续保持节奏。';
    else if (stats.weeklyTotalMin >= 300) efficiency = '👍 状态良好，本周学习投入稳定，可以适当加量。';
    else if (stats.weeklyTotalMin >= 120) efficiency = '📖 状态一般，本周学习时长偏低，建议增加专注时段。';
    else efficiency = '⚠️ 状态待提升，本周学习时间较少，快用番茄钟找回节奏吧！';

    var topCourse = '';
    if (stats.courseStats.length > 0) {
      var sorted = stats.courseStats.slice().sort(function(a, b) { return b.totalMin - a.totalMin; });
      if (sorted[0].totalMin > 0) {
        topCourse = '投入最多的课程是「' + sorted[0].name + '」（' + U.formatMinutes(sorted[0].totalMin) + '）。';
      }
    }

    return '<div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:24px;margin-bottom:16px;box-shadow:var(--shadow-sm)">' +
      '<h3>📋 本周学习报告</h3>' +
      '<p style="font-size:.85rem;color:var(--color-text-muted);margin-bottom:4px;">' + week.start + ' ~ ' + week.end + '</p>' +
      '<div style="display:flex;gap:24px;flex-wrap:wrap;margin-top:12px;">' +
      '<div><span style="font-size:2rem;font-weight:700;color:var(--color-primary)">' + U.formatMinutes(stats.weeklyTotalMin) + '</span><br><span style="font-size:.8rem;color:var(--color-text-muted)">本周总时长</span></div>' +
      '<div><span style="font-size:2rem;font-weight:700;color:var(--color-primary)">' + stats.overallProgress + '%</span><br><span style="font-size:.8rem;color:var(--color-text-muted)">总进度</span></div>' +
      '<div><span style="font-size:2rem;font-weight:700;color:var(--color-primary)">' + stats.streakDays + ' 天</span><br><span style="font-size:.8rem;color:var(--color-text-muted)">连续打卡</span></div>' +
      '</div>' +
      '<p style="margin-top:16px;padding:12px;background:#f1f5f9;border-radius:8px;font-size:.9rem;">' + efficiency + ' ' + topCourse + '</p>' +
      '</div>';
  }

  function _renderCharts(logs, courses) {
    if (typeof Chart === 'undefined') {
      var placeholder = document.querySelector('.placeholder-card');
      if (!placeholder) {
        var p = document.createElement('div');
        p.className = 'placeholder-card';
        p.innerHTML = '<div class="ph-icon">⚠️</div><h3>Chart.js 加载失败</h3><p>请检查网络连接后刷新页面。</p>';
        _container.appendChild(p);
      }
      return;
    }

    _renderTrendChart(logs);
    _renderPieChart(logs, courses);
  }

  function _renderTrendChart(logs) {
    var ctx = document.getElementById('chart-trend');
    if (!ctx) return;

    // Build 30-day data
    var days = [];
    var d = new Date();
    d.setDate(d.getDate() - 29);
    for (var i = 0; i < 30; i++) {
      var ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      days.push(ds);
      d.setDate(d.getDate() + 1);
    }

    var dayMap = {};
    logs.forEach(function(l) {
      dayMap[l.date] = (dayMap[l.date] || 0) + l.durationMin;
    });

    var values = days.map(function(day) { return dayMap[day] || 0; });

    var chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: days.map(function(d) { return d.slice(5); }),
        datasets: [{
          label: '学习时长（分钟）',
          data: values,
          borderColor: '#4f46e5',
          backgroundColor: 'rgba(79,70,229,0.08)',
          fill: true,
          tension: 0.3,
          pointRadius: 2,
          pointHoverRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: '分钟' }, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });
    _charts.push(chart);
  }

  function _renderPieChart(logs, courses) {
    var ctx = document.getElementById('chart-pie');
    if (!ctx) return;

    // Aggregate by course
    var courseMap = {};
    logs.forEach(function(l) {
      var key = l.courseId || '__none__';
      courseMap[key] = (courseMap[key] || 0) + l.durationMin;
    });

    var labels = [];
    var data = [];
    var colors = [];

    var idToCourse = {};
    courses.forEach(function(c) { idToCourse[c.id] = c; });

    Object.keys(courseMap).forEach(function(cid) {
      if (cid === '__none__') {
        labels.push('未关联课程');
        colors.push('#cbd5e1');
      } else {
        var c = idToCourse[cid];
        labels.push(c ? c.name : '(已删除)');
        colors.push(c ? c.color : '#94a3b8');
      }
      data.push(courseMap[cid]);
    });

    if (data.length === 0) {
      labels = ['暂无数据'];
      data = [1];
      colors = ['#e2e8f0'];
    }

    var chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{ data: data, backgroundColor: colors, borderWidth: 0 }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10 }
          }
        }
      }
    });
    _charts.push(chart);
  }

  return { render: render, destroy: destroy };
})();