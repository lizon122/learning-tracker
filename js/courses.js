// courses.js — Course Management View (Phase 3: template import)
window.LPA = window.LPA || {};

LPA.Courses = (function() {
  var _container = null;
  var _unsub = null;
  var _editingId = null;
  var _expandedCourses = {};
  var _buildTimer = null;

  function render(container) {
    _container = container;
    _buildTimer = null;
    _unsub = LPA.Store.onChange(function() {
      if (_buildTimer) clearTimeout(_buildTimer);
      _buildTimer = setTimeout(function() { _build(); }, 100);
    });
    _build();
  }

  function destroy() {
    if (_unsub) { _unsub(); _unsub = null; }
    if (_buildTimer) { clearTimeout(_buildTimer); _buildTimer = null; }
    _closeModal();
    _container = null;
  }

  function _build() {
    if (!_container) return;
    try {
    var courses = LPA.Store.getCourses();
    var U = LPA.Utils;
    var html = '';

    html += '<div class="page-header">';
    html += '<h2>📖 课程管理</h2>';
    html += '<div style="display:flex;gap:10px;">';
    html += '<button id="btn-import-templates">📥 导入课程模板</button>';
    html += '<button class="btn--primary" id="btn-add-course">+ 添加课程</button>';
    html += '</div>';
    html += '</div>';

    if (courses.length === 0) {
      html += '<div class="empty-state">';
      html += '<div class="empty-icon">📭</div>';
      html += '<p>还没有课程，点击「+ 添加课程」或「📥 导入课程模板」开始吧</p>';
      html += '</div>';
    } else {
      html += '<div class="course-list">';
      courses.forEach(function(c) { html += _buildCourseCard(c); });
      html += '</div>';
    }

    _container.innerHTML = html;

    // Bind events
    var templateBtn = document.getElementById('btn-import-templates');
    if (templateBtn) templateBtn.addEventListener('click', _openTemplateModal);
    var addBtn = document.getElementById('btn-add-course');
    if (addBtn) addBtn.addEventListener('click', function() { _openModal(null); });

    courses.forEach(function(c) {
      var expandBtn = document.getElementById('btn-expand-' + c.id);
      if (expandBtn) expandBtn.addEventListener('click', function() { _toggleChapters(c.id); });
      var editBtn = document.getElementById('btn-edit-' + c.id);
      if (editBtn) editBtn.addEventListener('click', function() { _openModal(c.id); });
      var delBtn = document.getElementById('btn-del-' + c.id);
      if (delBtn) delBtn.addEventListener('click', function() { _deleteCourse(c.id); });
      var archiveBtn = document.getElementById('btn-archive-' + c.id);
      if (archiveBtn) archiveBtn.addEventListener('click', function() { _archiveCourse(c.id); });
    });

    // Chapter items
    document.querySelectorAll('.chapter-item').forEach(function(el) {
      el.addEventListener('click', function() {
        try {
        var courseId = el.getAttribute('data-course-id');
        var chapterId = el.getAttribute('data-chapter-id');
        var course = LPA.Store.getCourse(courseId);
        if (!course) return;
        var ch = course.chapters.find(function(x) { return x.id === chapterId; });
        if (!ch) return;
        var next = ch.status === 'not_started' ? 'in_progress' :
                   ch.status === 'in_progress' ? 'completed' : 'not_started';
        LPA.Store.updateChapterStatus(courseId, chapterId, next);
        } catch(e) { console.error('chapter click error:', e); }
      });
    });
    } catch(e) {
      console.error('courses _build error:', e);
      _container.innerHTML = '<div style="padding:40px;text-align:center"><h2>⚠️ 渲染错误</h2><p>' + e.message + '</p><button onclick="localStorage.clear();location.reload()" style="background:#ef4444;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;margin-top:12px;">清除数据并重新加载</button></div>';
    }
  }

  function _buildCourseCard(c) {
    var completed = c.chapters.filter(function(ch) { return ch.status === 'completed'; }).length;
    var progress = c.chapters.length > 0 ? Math.round((completed / c.chapters.length) * 100) : 0;
    var meta = [];
    if (c.semester) meta.push(c.semester);
    if (c.credit) meta.push(c.credit + ' 学分');
    meta.push(completed + '/' + c.totalChapters + ' 章');
    if (c.archived) meta.push('📦 已归档');

    var h = '';
    h += '<div class="course-card" style="border-left-color:' + c.color + ';' + (c.archived ? 'opacity:.65;' : '') + '">';
    h += '<div class="course-card-header">';
    h += '<div>';
    h += '<h3>' + LPA.Utils.escapeHtml(c.name) + '</h3>';
    h += '<div class="course-meta">' + meta.join(' · ') + '</div>';
    h += '</div>';
    h += '</div>';
    h += '<div class="course-progress-bar">';
    h += '<div class="course-progress-fill" style="width:' + progress + '%;background:' + c.color + '"></div>';
    h += '</div>';
    h += '<div class="course-actions">';
    h += '<button class="btn--sm" id="btn-expand-' + c.id + '">📋 章节 (' + completed + '/' + c.totalChapters + ')</button>';
    h += '<button class="btn--sm" id="btn-edit-' + c.id + '">✏️ 编辑</button>';
    if (!c.archived) {
      h += '<button class="btn--sm" id="btn-archive-' + c.id + '">📦 归档</button>';
    }
    h += '<button class="btn--sm btn--danger" id="btn-del-' + c.id + '">🗑 删除</button>';
    h += '</div>';

    if (_expandedCourses[c.id] && !c.archived) {
      h += '<div class="chapter-list" id="chapters-' + c.id + '">';
      c.chapters.forEach(function(ch) {
        var statusIcon = ch.status === 'completed' ? '✅' : ch.status === 'in_progress' ? '🔄' : '⬜';
        h += '<div class="chapter-item" data-course-id="' + c.id + '" data-chapter-id="' + ch.id + '">';
        h += '<span class="chapter-dot ' + ch.status.replace('_', '-') + '"></span>';
        h += '<span>' + LPA.Utils.escapeHtml(ch.name) + '</span>';
        h += '<span style="margin-left:auto;font-size:.75rem">' + statusIcon + '</span>';
        h += '</div>';
      });
      h += '</div>';
    }

    h += '</div>';
    return h;
  }

  function _toggleChapters(courseId) {
    _expandedCourses[courseId] = !_expandedCourses[courseId];
    _build();
  }

  function _archiveCourse(courseId) {
    var course = LPA.Store.getCourse(courseId);
    if (!course) return;
    LPA.Store.updateCourse(courseId, { archived: !course.archived });
    LPA.Utils.showToast(course.archived ? '课程已取消归档' : '课程已归档');
  }

  function _openModal(courseId) {
    _editingId = courseId;
    var course = courseId ? LPA.Store.getCourse(courseId) : null;
    var title = course ? '编辑课程' : '添加课程';

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'course-modal';
    overlay.innerHTML =
      '<div class="modal">' +
      '<h3>' + title + '</h3>' +
      '<div class="form-group"><label>课程名称</label><input id="mf-name" value="' + (course ? LPA.Utils.escapeHtml(course.name) : '') + '" placeholder="如：信号与系统"></div>' +
      '<div class="form-group"><label>总章节数</label><input id="mf-chapters" type="number" min="1" max="30" value="' + (course ? course.totalChapters : 8) + '"></div>' +
      '<div class="form-group"><label>学分</label><input id="mf-credit" type="number" min="0" step="0.5" value="' + (course ? course.credit : 3) + '"></div>' +
      '<div class="form-group"><label>学期</label><select id="mf-semester">' + _semesterOptions(course ? course.semester : '') + '</select></div>' +
      '<div class="form-group"><label>标签颜色</label><input id="mf-color" type="color" value="' + (course ? course.color : '#4f46e5') + '"></div>' +
      '<div class="form-actions">' +
      '<button class="btn--sm" id="btn-modal-cancel">取消</button>' +
      '<button class="btn--primary" id="btn-modal-save">保存</button>' +
      '</div></div>';

    document.body.appendChild(overlay);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) _closeModal(); });
    document.getElementById('btn-modal-cancel').addEventListener('click', _closeModal);
    document.getElementById('btn-modal-save').addEventListener('click', _saveModal);
  }

  function _semesterOptions(selected) {
    var semesters = ['大一上', '大一下', '大二上', '大二下', '大三上', '大三下', '大四上', '大四下', '其他'];
    return semesters.map(function(s) {
      return '<option value="' + s + '"' + (s === selected ? ' selected' : '') + '>' + s + '</option>';
    }).join('');
  }

  function _closeModal() {
    var modal = document.getElementById('course-modal');
    if (modal) modal.remove();
    _editingId = null;
  }

  function _saveModal() {
    var name = document.getElementById('mf-name').value.trim();
    var chapters = parseInt(document.getElementById('mf-chapters').value) || 1;
    var credit = parseFloat(document.getElementById('mf-credit').value) || 0;
    var semester = document.getElementById('mf-semester').value;
    var color = document.getElementById('mf-color').value;
    if (!name) { LPA.Utils.showToast('请输入课程名称'); return; }
    var data = { name: name, totalChapters: Math.max(1, Math.min(30, chapters)), credit: credit, semester: semester, color: color };
    if (_editingId) { LPA.Store.updateCourse(_editingId, data); LPA.Utils.showToast('课程已更新'); }
    else { LPA.Store.addCourse(data); LPA.Utils.showToast('课程已添加'); }
    _closeModal();
  }

  function _deleteCourse(courseId) {
    var course = LPA.Store.getCourse(courseId);
    if (!course) return;
    if (confirm('确定删除「' + course.name + '」吗？关联的学习记录也会被删除。')) {
      LPA.Store.deleteCourse(courseId);
      LPA.Utils.showToast('课程已删除');
    }
  }

  // === Template Import ===
  function _openTemplateModal() {
    var templates = LPA.Store.getTemplates();
    var courses = LPA.Store.getCourses();
    var existingNames = courses.map(function(c) { return c.name; });

    var overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'template-modal';

    var html = '<div class="modal" style="max-height:80vh;overflow-y:auto;">';
    html += '<h3>📥 导入通信工程课程模板</h3>';
    html += '<p style="font-size:.85rem;color:var(--color-text-muted);margin-bottom:12px;">勾选要导入的课程（灰色的已存在，会自动跳过）</p>';
    html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;">';
    templates.forEach(function(t) {
      var exists = existingNames.includes(t.name);
      html += '<label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:1px solid var(--color-border);border-radius:var(--radius-sm);cursor:pointer;' + (exists ? 'opacity:.4;' : '') + '">';
      html += '<input type="checkbox" class="tpl-check" value="' + LPA.Utils.escapeHtml(t.name) + '"' + (exists ? ' disabled' : '') + ' style="width:auto;">';
      html += '<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:' + t.color + ';"></span>';
      html += '<span style="font-size:.87rem;">' + LPA.Utils.escapeHtml(t.name) + ' <span style="color:var(--color-text-muted);font-size:.75rem;">' + t.semester + ' · ' + t.credit + '学分</span></span>';
      if (exists) html += '<span style="font-size:.7rem;color:var(--color-text-muted);">已存在</span>';
      html += '</label>';
    });
    html += '</div>';
    html += '<div style="display:flex;gap:8px;margin-bottom:12px;">';
    html += '<button class="btn--sm" id="btn-tpl-select-all">全选</button>';
    html += '<button class="btn--sm" id="btn-tpl-deselect-all">取消全选</button>';
    html += '</div>';
    html += '<div class="form-actions">';
    html += '<button class="btn--sm" id="btn-tpl-cancel">取消</button>';
    html += '<button class="btn--primary" id="btn-tpl-import">导入选中课程</button>';
    html += '</div></div>';

    overlay.innerHTML = html;
    document.body.appendChild(overlay);

    overlay.addEventListener('click', function(e) { if (e.target === overlay) _closeTemplateModal(); });
    document.getElementById('btn-tpl-cancel').addEventListener('click', _closeTemplateModal);
    document.getElementById('btn-tpl-select-all').addEventListener('click', function() {
      document.querySelectorAll('.tpl-check:not([disabled])').forEach(function(cb) { cb.checked = true; });
    });
    document.getElementById('btn-tpl-deselect-all').addEventListener('click', function() {
      document.querySelectorAll('.tpl-check').forEach(function(cb) { cb.checked = false; });
    });
    document.getElementById('btn-tpl-import').addEventListener('click', _importTemplates);
  }

  function _closeTemplateModal() {
    var modal = document.getElementById('template-modal');
    if (modal) modal.remove();
  }

  function _importTemplates() {
    var selected = [];
    document.querySelectorAll('.tpl-check:checked').forEach(function(cb) { selected.push(cb.value); });
    if (selected.length === 0) { LPA.Utils.showToast('请至少选择一门课程'); return; }
    var count = LPA.Store.importTemplates(selected);
    _closeTemplateModal();
    LPA.Utils.showToast('成功导入 ' + count + ' 门课程');
  }

  return { render: render, destroy: destroy };
})();