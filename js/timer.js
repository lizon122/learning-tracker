// timer.js — Pomodoro Timer View
window.LPA = window.LPA || {};

LPA.Timer = (function() {
  var _container = null;
  var _interval = null;
  var _unsub = null;

  // State
  var _state = 'IDLE';       // IDLE | RUNNING | PAUSED | COMPLETED
  var _mode = 'focus';       // focus | break | longBreak
  var _sessionCount = 0;
  var _totalSeconds = 0;
  var _remainingSeconds = 0;
  var _selectedCourseId = '';

  var CIRCUMFERENCE = 2 * Math.PI * 90; // r=90 in viewBox 200

  function render(container) {
    _container = container;
    _unsub = LPA.Store.onChange(function() { _renderTodayLog(); });
    _resetTimer('focus');
    _build();
  }

  function destroy() {
    if (_interval) { clearInterval(_interval); _interval = null; }
    if (_unsub) { _unsub(); _unsub = null; }
    _container = null;
  }

  function _build() {
    if (!_container) return;
    var settings = LPA.Store.getSettings();
    var courses = LPA.Store.getCourses();
    var U = LPA.Utils;

    var html = '<div class="timer-page">';
    html += '<h2>⏱️ 学习计时器</h2>';

    // Course selector
    html += '<select id="timer-course">';
    html += '<option value="">-- 选择关联课程（可选）--</option>';
    courses.forEach(function(c) {
      html += '<option value="' + c.id + '"' + (_selectedCourseId === c.id ? ' selected' : '') + '>' + U.escapeHtml(c.name) + '</option>';
    });
    html += '</select>';

    // Timer ring
    var minutes = Math.floor(_remainingSeconds / 60);
    var seconds = _remainingSeconds % 60;
    var display = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
    var totalS = _totalSeconds > 0 ? _totalSeconds : 1;
    var offset = CIRCUMFERENCE - (_remainingSeconds / totalS) * CIRCUMFERENCE;

    html += '<div class="timer-ring-wrap">';
    html += '<svg viewBox="0 0 200 200">';
    html += '<circle class="timer-ring-bg" cx="100" cy="100" r="90"/>';
    html += '<circle class="timer-ring-fg" cx="100" cy="100" r="90"' +
      ' stroke-dasharray="' + CIRCUMFERENCE + '"' +
      ' stroke-dashoffset="' + offset + '"' +
      ' id="timer-ring-fg"/>';
    html += '</svg>';
    html += '<div class="timer-display" id="timer-display">' + display + '</div>';
    html += '</div>';

    // Mode label
    var modeLabel = _mode === 'focus' ? '🍅 专注时间' : _mode === 'break' ? '☕ 短休息' : '🛌 长休息';
    var roundInfo = _mode === 'focus' ? ' 第 ' + (_sessionCount + 1) + '/' + settings.sessionsBeforeLongBreak + ' 轮' : '';
    html += '<div class="timer-mode">' + modeLabel + roundInfo + '</div>';

    // Controls
    html += '<div class="timer-controls">';
    if (_state === 'IDLE' || _state === 'COMPLETED') {
      html += '<button class="btn--primary" id="btn-start">▶ 开始</button>';
    } else if (_state === 'RUNNING') {
      html += '<button id="btn-pause">⏸ 暂停</button>';
      html += '<button class="btn--danger btn--sm" id="btn-reset">↺ 重置</button>';
    } else if (_state === 'PAUSED') {
      html += '<button class="btn--primary" id="btn-resume">▶ 继续</button>';
      html += '<button class="btn--danger btn--sm" id="btn-reset">↺ 重置</button>';
    }
    html += '</div>';

    // Manual entry
    html += '<div class="timer-manual">';
    html += '<h4>✍️ 手动补录学习时长</h4>';
    html += '<div class="form-row">';
    html += '<input type="date" id="man-date" value="' + U.today() + '">';
    html += '<select id="man-course"><option value="">选择课程</option>';
    courses.forEach(function(c) {
      html += '<option value="' + c.id + '">' + U.escapeHtml(c.name) + '</option>';
    });
    html += '</select>';
    html += '<input type="number" id="man-duration" placeholder="分钟" min="1" value="30">';
    html += '<input type="text" id="man-note" placeholder="备注(可选)">';
    html += '<button class="btn--primary btn--sm" id="btn-manual-add">添加</button>';
    html += '</div>';
    html += '</div>';

    // Today log
    html += '<div class="timer-today" id="timer-today">';
    html += _buildTodayLog();
    html += '</div>';

    html += '</div>';
    _container.innerHTML = html;

    // Bind events
    var startBtn = document.getElementById('btn-start');
    if (startBtn) startBtn.addEventListener('click', _start);
    var pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) pauseBtn.addEventListener('click', _pause);
    var resetBtn = document.getElementById('btn-reset');
    if (resetBtn) resetBtn.addEventListener('click', function() { _resetTimer('focus'); _build(); });
    var resumeBtn = document.getElementById('btn-resume');
    if (resumeBtn) resumeBtn.addEventListener('click', _start);

    var manBtn = document.getElementById('btn-manual-add');
    if (manBtn) manBtn.addEventListener('click', _manualAdd);

    var courseSelect = document.getElementById('timer-course');
    if (courseSelect) {
      courseSelect.addEventListener('change', function() {
        _selectedCourseId = this.value;
      });
    }
  }

  function _start() {
    if (_state === 'RUNNING') return;
    _state = 'RUNNING';

    if (_totalSeconds === 0) {
      var settings = LPA.Store.getSettings();
      if (_mode === 'focus') {
        _totalSeconds = settings.pomodoroFocusMin * 60;
      } else if (_mode === 'break') {
        _totalSeconds = settings.pomodoroBreakMin * 60;
      } else {
        _totalSeconds = settings.longBreakMin * 60;
      }
      _remainingSeconds = _totalSeconds;
    }

    if (_interval) clearInterval(_interval);
    _interval = setInterval(_tick, 1000);
    _build();
  }

  function _pause() {
    _state = 'PAUSED';
    if (_interval) { clearInterval(_interval); _interval = null; }
    _build();
  }

  function _tick() {
    _remainingSeconds--;
    if (_remainingSeconds <= 0) {
      _complete();
      return;
    }
    _updateDisplay();
  }

  function _complete() {
    if (_interval) { clearInterval(_interval); _interval = null; }
    _state = 'COMPLETED';

    // Save log if focus session
    if (_mode === 'focus') {
      var settings = LPA.Store.getSettings();
      var durationMin = settings.pomodoroFocusMin;
      LPA.Store.addLog({
        courseId: _selectedCourseId,
        date: LPA.Utils.today(),
        durationMin: durationMin,
        method: 'timer',
        note: ''
      });
      LPA.Utils.showToast('🍅 番茄钟完成！+' + durationMin + ' 分钟');
      _sendNotification('🍅 番茄钟完成！', '已完成 ' + durationMin + ' 分钟专注学习');
    }

    // Advance to next mode
    if (_mode === 'focus') {
      _sessionCount++;
      var settings = LPA.Store.getSettings();
      if (_sessionCount >= settings.sessionsBeforeLongBreak) {
        _resetTimer('longBreak');
      } else {
        _resetTimer('break');
      }
    } else {
      // break or longBreak ended, start new focus
      _resetTimer('focus');
    }
    _build();
  }

  function _resetTimer(mode) {
    _state = 'IDLE';
    _mode = mode;
    var settings = LPA.Store.getSettings();
    if (mode === 'focus') {
      _totalSeconds = settings.pomodoroFocusMin * 60;
    } else if (mode === 'break') {
      _totalSeconds = settings.pomodoroBreakMin * 60;
    } else {
      _totalSeconds = settings.longBreakMin * 60;
      _sessionCount = 0;
    }
    _remainingSeconds = _totalSeconds;
  }

  function _updateDisplay() {
    var displayEl = document.getElementById('timer-display');
    var ringEl = document.getElementById('timer-ring-fg');
    if (!displayEl || !ringEl) return;

    var minutes = Math.floor(_remainingSeconds / 60);
    var seconds = _remainingSeconds % 60;
    displayEl.textContent = String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');

    var totalS = _totalSeconds > 0 ? _totalSeconds : 1;
    var offset = CIRCUMFERENCE - (_remainingSeconds / totalS) * CIRCUMFERENCE;
    ringEl.setAttribute('stroke-dashoffset', offset);
  }

  function _manualAdd() {
    var dateEl = document.getElementById('man-date');
    var courseEl = document.getElementById('man-course');
    var durEl = document.getElementById('man-duration');
    var noteEl = document.getElementById('man-note');

    var date = dateEl ? dateEl.value : LPA.Utils.today();
    var courseId = courseEl ? courseEl.value : '';
    var duration = parseInt(durEl ? durEl.value : 0);
    var note = noteEl ? noteEl.value.trim() : '';

    if (!duration || duration < 1) {
      LPA.Utils.showToast('请输入有效的学习时长');
      return;
    }

    LPA.Store.addLog({
      courseId: courseId,
      date: date,
      durationMin: duration,
      method: 'manual',
      note: note
    });
    LPA.Utils.showToast('已添加 ' + duration + ' 分钟学习记录');

    if (durEl) durEl.value = '30';
    if (noteEl) noteEl.value = '';
  }

  function _buildTodayLog() {
    var today = LPA.Utils.today();
    var logs = LPA.Store.getLogs().filter(function(l) { return l.date === today; });
    var courses = LPA.Store.getCourses();
    var U = LPA.Utils;

    var h = '<h4>📋 今日记录</h4>';
    if (logs.length === 0) {
      h += '<p style="color:var(--color-text-muted);font-size:.85rem;">今天还没有学习记录</p>';
      return h;
    }

    var total = 0;
    logs.forEach(function(l) { total += l.durationMin; });
    h += '<p style="font-size:.85rem;margin-bottom:8px;">总计：<strong>' + U.formatMinutes(total) + '</strong>，共 ' + logs.length + ' 条记录</p>';

    logs.slice(0, 10).forEach(function(l) {
      var course = l.courseId ? courses.find(function(c) { return c.id === l.courseId; }) : null;
      var cname = course ? course.name : '未关联';
      h += '<div class="timer-today-item">';
      h += '<span>' + (course ? '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:' + course.color + ';margin-right:4px;"></span>' : '') + U.escapeHtml(cname) + '</span>';
      h += '<span>' + U.formatMinutes(l.durationMin) + ' (' + (l.method === 'timer' ? '⏱' : '✍') + ')</span>';
      h += '</div>';
    });
    return h;
  }

  function _renderTodayLog() {
    if (!_container) return;
    var el = document.getElementById('timer-today');
    if (el) el.innerHTML = _buildTodayLog();
  }

  
  function _sendNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body: body, icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍅</text></svg>' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(function(perm) {
        if (perm === 'granted') {
          new Notification(title, { body: body });
        }
      });
    }
  }

  return { render: render, destroy: destroy };
})();