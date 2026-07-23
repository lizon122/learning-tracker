// settings.js — Settings View (Phase 3: theme toggle + data management)
window.LPA = window.LPA || {};

LPA.Settings = (function() {
  var _container = null;

  function render(container) {
    _container = container;
    var settings = LPA.Store.getSettings();

    var html = '<h2>⚙️ 设置</h2>';

    // Theme
    html += '<div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:24px;margin-bottom:16px;box-shadow:var(--shadow-sm)">';
    html += '<h3>🎨 外观</h3>';
    html += '<div style="display:flex;align-items:center;gap:16px;margin-top:12px;">';
    html += '<span>☀️ 亮色</span>';
    html += '<label style="position:relative;display:inline-block;width:52px;height:28px;">';
    html += '<input type="checkbox" id="theme-toggle" style="opacity:0;width:0;height:0;"' + (settings.theme === 'dark' ? ' checked' : '') + '>';
    html += '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:' + (settings.theme === 'dark' ? 'var(--color-primary)' : '#cbd5e1') + ';border-radius:28px;transition:0.3s;"></span>';
    html += '<span style="position:absolute;content:\'\';height:22px;width:22px;left:' + (settings.theme === 'dark' ? '27px' : '3px') + ';bottom:3px;background:white;border-radius:50%;transition:0.3s;" id="theme-knob"></span>';
    html += '</label>';
    html += '<span>🌙 暗色</span>';
    html += '</div>';
    html += '</div>';

    // Pomodoro
    html += '<div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:24px;margin-bottom:16px;box-shadow:var(--shadow-sm)">';
    html += '<h3>🍅 番茄钟设置</h3>';
    html += '<div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:12px;">';
    html += '<div class="form-group" style="flex:1;min-width:120px"><label>专注时长（分钟）</label><input id="set-focus" type="number" min="1" max="120" value="' + settings.pomodoroFocusMin + '"></div>';
    html += '<div class="form-group" style="flex:1;min-width:120px"><label>短休息（分钟）</label><input id="set-break" type="number" min="1" max="30" value="' + settings.pomodoroBreakMin + '"></div>';
    html += '<div class="form-group" style="flex:1;min-width:120px"><label>长休息（分钟）</label><input id="set-long" type="number" min="1" max="60" value="' + settings.longBreakMin + '"></div>';
    html += '<div class="form-group" style="flex:1;min-width:120px"><label>几轮后长休</label><input id="set-sessions" type="number" min="1" max="10" value="' + settings.sessionsBeforeLongBreak + '"></div>';
    html += '</div>';
    html += '<button class="btn--primary" id="btn-save-settings" style="margin-top:12px;">保存番茄钟设置</button>';
    html += '</div>';

    // Data
    html += '<div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:24px;margin-bottom:16px;box-shadow:var(--shadow-sm)">';
    html += '<h3>💾 数据管理</h3>';
    html += '<p style="font-size:.85rem;color:var(--color-text-muted);margin-bottom:12px;">导出数据为 JSON 文件备份，或从备份文件恢复数据。</p>';
    html += '<div style="display:flex;gap:10px;">';
    html += '<button class="btn--primary" id="btn-export">📥 导出数据</button>';
    html += '<button id="btn-import">📤 导入数据</button>';
    html += '<input type="file" id="file-import" accept=".json" style="display:none">';
    html += '</div>';
    html += '</div>';

    // About
    html += '<div style="background:var(--color-surface);border:1px solid var(--color-border);border-radius:var(--radius-md);padding:24px;box-shadow:var(--shadow-sm)">';
    html += '<h3>ℹ️ 关于</h3>';
    html += '<p style="font-size:.85rem;color:var(--color-text-muted);">Commiada-L v1.0<br>通信工程大学生专属学习追踪工具<br>数据存储于浏览器本地，不会上传到任何服务器。<br><br>by UESTC SICE Lizon<br>电子科技大学 信息与通信工程学院</p>';
    html += '</div>';

    container.innerHTML = html;

    // Theme toggle
    var themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('change', function() {
        var newTheme = this.checked ? 'dark' : 'light';
        LPA.Store.updateSettings({ theme: newTheme });
        document.documentElement.setAttribute('data-theme', newTheme);
        // Update knob position
        var knob = document.getElementById('theme-knob');
        if (knob) knob.style.left = this.checked ? '27px' : '3px';
        // Update slider bg
        var slider = this.nextElementSibling;
        if (slider) slider.style.background = this.checked ? 'var(--color-primary)' : '#cbd5e1';
      });
    }

    // Save pomodoro
    var saveBtn = document.getElementById('btn-save-settings');
    if (saveBtn) saveBtn.addEventListener('click', _saveSettings);

    // Export/Import
    var exportBtn = document.getElementById('btn-export');
    if (exportBtn) exportBtn.addEventListener('click', _exportData);

    var importBtn = document.getElementById('btn-import');
    if (importBtn) importBtn.addEventListener('click', function() {
      document.getElementById('file-import').click();
    });

    var fileInput = document.getElementById('file-import');
    if (fileInput) fileInput.addEventListener('change', _importData);
  }

  function _saveSettings() {
    var focus = parseInt(document.getElementById('set-focus').value) || 25;
    var brk = parseInt(document.getElementById('set-break').value) || 5;
    var long = parseInt(document.getElementById('set-long').value) || 15;
    var sessions = parseInt(document.getElementById('set-sessions').value) || 4;
    LPA.Store.updateSettings({
      pomodoroFocusMin: Math.max(1, focus),
      pomodoroBreakMin: Math.max(1, brk),
      longBreakMin: Math.max(1, long),
      sessionsBeforeLongBreak: Math.max(1, sessions)
    });
    LPA.Utils.showToast('番茄钟设置已保存');
  }

  function _exportData() {
    var json = LPA.Store.exportAll();
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'lpa_backup_' + LPA.Utils.today() + '.json';
    a.click();
    URL.revokeObjectURL(url);
    LPA.Utils.showToast('数据已导出');
  }

  function _importData() {
    var fileInput = document.getElementById('file-import');
    var file = fileInput.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(e) {
      var success = LPA.Store.importAll(e.target.result);
      if (success) { LPA.Utils.showToast('数据导入成功！'); }
      else { LPA.Utils.showToast('导入失败：文件格式不正确'); }
    };
    reader.readAsText(file);
    fileInput.value = '';
  }

  function destroy() { _container = null; }

  return { render: render, destroy: destroy };
})();