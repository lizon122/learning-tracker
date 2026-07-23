// dashboard.js — Learning Dashboard View (Phase 2 enhanced)
window.LPA = window.LPA || {};

LPA.Dashboard = (function() {
  var _unsub = null;
  var _container = null;
  var _refreshTimer = null;

  function render(container) {
    _container = container;
    _refreshTimer = null;
    _unsub = LPA.Store.onChange(function() {
      if (_refreshTimer) clearTimeout(_refreshTimer);
      _refreshTimer = setTimeout(function() { _refresh(); }, 100);
    });
    _build();
  }

  function destroy() {
    if (_unsub) { _unsub(); _unsub = null; }
    if (_refreshTimer) { clearTimeout(_refreshTimer); _refreshTimer = null; }
    _container = null;
  }

  function _build() {
    if (!_container) return;
    var stats = LPA.Store.getStats();
    var U = LPA.Utils;

    var html = '<h2>📊 学习仪表盘</h2>';

    // Stat Cards
    html += '<div class="stat-cards">';
    html += _statCard('⏱️', U.formatMinutes(stats.weeklyTotalMin), '本周学习时长');
    html += _statCard('📖', stats.completedChapters + ' / ' + stats.totalChapters, '已完成章节');
    html += _statCard('📈', stats.overallProgress + '%', '总体进度');
    html += _statCard('🔥', stats.streakDays + ' 天', '连续打卡');
    html += '</div>';

    // Two-column layout: rings + heatmap left, todo right
    html += '<div style="display:grid;grid-template-columns:1fr 320px;gap:20px;" id="dash-grid">';

    // Left column
    html += '<div>';

    // Course Progress Rings
    if (stats.courseStats.length === 0) {
      html += '<div class="empty-state">';
      html += '<div class="empty-icon">📚</div>';
      html += '<p>还没有添加课程，去「课程管理」添加你的第一门课吧！</p>';
      html += '<button class="btn--primary" onclick="LPA.Router.navigate(\'courses\')">前往课程管理</button>';
      html += '</div>';
    } else {
      html += '<h3>📊 课程进度</h3>';
      html += '<div class="course-rings">';
      stats.courseStats.forEach(function(cs) {
        html += _ringChart(cs);
      });
      html += '</div>';
    }

    // Heatmap
    html += _buildHeatmap();
    html += '</div>'; // end left

    // Right column — Todo List
    html += '<div>';
    html += _buildTodoList();
    html += '</div>'; // end right

    html += '</div>'; // end grid

    _container.innerHTML = html;

    // Bind todo events
    _bindTodoEvents();
  }

  function _refresh() {
    if (!_container) return;
    try { _build(); } catch(e) { console.error('dashboard _build error:', e); }
  }

  function _statCard(icon, value, label) {
    return '<div class="stat-card"><div class="stat-icon">' + icon + '</div>' +
      '<div class="stat-value">' + value + '</div>' +
      '<div class="stat-label">' + label + '</div></div>';
  }

  function _ringChart(cs) {
    var r = 40;
    var circumference = 2 * Math.PI * r;
    var offset = circumference - (cs.progress / 100) * circumference;
    return '<div class="course-ring">' +
      '<svg viewBox="0 0 100 100">' +
      '<circle class="ring-bg" cx="50" cy="50" r="' + r + '"/>' +
      '<circle class="ring-fg" cx="50" cy="50" r="' + r +
      '" stroke="' + cs.color + '"' +
      ' stroke-dasharray="' + circumference + '"' +
      ' stroke-dashoffset="' + offset + '"/>' +
      '</svg>' +
      '<div class="ring-text">' + cs.progress + '%</div>' +
      '<div class="ring-sub">' + LPA.Utils.escapeHtml(cs.name) + '</div>' +
      '</div>';
  }

  // === Heatmap ===
  function _buildHeatmap() {
    var U = LPA.Utils;
    var logs = LPA.Store.getLogs();
    var week = U.weekRange();

    // Build 7-day data
    var days = [];
    var dayLabels = ['一', '二', '三', '四', '五', '六', '日'];
    var start = new Date(week.start + 'T00:00:00');
    for (var i = 0; i < 7; i++) {
      var d = new Date(start);
      d.setDate(start.getDate() + i);
      var ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      var totalMin = 0;
      logs.forEach(function(l) { if (l.date === ds) totalMin += l.durationMin; });
      days.push({ date: ds, label: dayLabels[i], minutes: totalMin, isToday: ds === U.today() });
    }

    var maxMin = Math.max.apply(null, days.map(function(d) { return d.minutes; })) || 1;

    function colorFor(min) {
      if (min === 0) return '#f1f5f9';
      var ratio = min / maxMin;
      if (ratio <= 0.25) return '#c7d2fe';
      if (ratio <= 0.5) return '#a5b4fc';
      if (ratio <= 0.75) return '#818cf8';
      return '#4f46e5';
    }

    var h = '<h3 style="margin-top:24px;">🔥 本周学习热力图</h3>';
    h += '<div style="display:flex;gap:6px;margin-top:10px;flex-wrap:wrap;">';
    days.forEach(function(day) {
      h += '<div style="text-align:center;">';
      h += '<div style="width:60px;height:60px;border-radius:8px;background:' + colorFor(day.minutes) +
        ';display:flex;align-items:center;justify-content:center;' +
        (day.isToday ? 'border:2px solid var(--color-primary);' : 'border:2px solid transparent;') +
        'transition:transform 0.2s;cursor:default;" title="' + day.date + ': ' + LPA.Utils.formatMinutes(day.minutes) + '">';
      h += '<span style="font-size:.75rem;font-weight:700;color:' + (day.minutes > maxMin * 0.5 ? '#fff' : '#64748b') + '">' +
        (day.minutes > 0 ? Math.round(day.minutes / 60 * 10) / 10 + 'h' : '0') + '</span>';
      h += '</div>';
      h += '<div style="font-size:.7rem;color:var(--color-text-muted);margin-top:4px;">' + day.label + '</div>';
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  // === Todo List ===
  function _buildTodoList() {
    var todos = LPA.Store.getTodos();
    var h = '<div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:20px;box-shadow:var(--shadow-sm)">';
    h += '<h3 style="margin-bottom:12px;">✅ 今日待办</h3>';

    // Add form
    h += '<div style="display:flex;gap:8px;margin-bottom:14px;">';
    h += '<input id="todo-input" type="text" placeholder="添加待办事项..." style="flex:1;">';
    h += '<button class="btn--primary btn--sm" id="btn-todo-add">+</button>';
    h += '</div>';

    // List
    h += '<div id="todo-list" style="max-height:300px;overflow-y:auto;">';
    if (todos.length === 0) {
      h += '<p style="color:var(--color-text-muted);font-size:.85rem;text-align:center;padding:20px 0;">今天还没有待办事项</p>';
    } else {
      var doneCount = todos.filter(function(t) { return t.done; }).length;
      h += '<div style="margin-bottom:8px;font-size:.8rem;color:var(--color-text-muted);">已完成 ' + doneCount + '/' + todos.length + '</div>';
      todos.forEach(function(t) {
        h += '<div class="todo-item" data-id="' + t.id + '" style="display:flex;align-items:center;gap:8px;padding:6px 4px;border-radius:4px;cursor:pointer;">';
        h += '<input type="checkbox" class="todo-check"' + (t.done ? ' checked' : '') + ' style="width:auto;cursor:pointer;">';
        h += '<span style="flex:1;font-size:.9rem;' + (t.done ? 'text-decoration:line-through;color:var(--color-text-muted)' : '') + '">' + LPA.Utils.escapeHtml(t.text) + '</span>';
        h += '<button class="btn--icon todo-del" style="color:var(--color-danger);font-size:.75rem;">✕</button>';
        h += '</div>';
      });
    }
    h += '</div>';
    h += '</div>';
    return h;
  }

  function _bindTodoEvents() {
    var addBtn = document.getElementById('btn-todo-add');
    var input = document.getElementById('todo-input');
    if (addBtn && input) {
      addBtn.addEventListener('click', _addTodo);
      input.addEventListener('keydown', function(e) { if (e.key === 'Enter') _addTodo(); });
    }

    document.querySelectorAll('.todo-check').forEach(function(cb) {
      cb.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = this.closest('.todo-item').getAttribute('data-id');
        LPA.Store.toggleTodo(id);
      });
    });

    document.querySelectorAll('.todo-del').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        var id = this.closest('.todo-item').getAttribute('data-id');
        LPA.Store.deleteTodo(id);
      });
    });
  }

  function _addTodo() {
    var input = document.getElementById('todo-input');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    LPA.Store.addTodo({ text: text });
    input.value = '';
    input.focus();
  }

  return { render: render, destroy: destroy };
})();