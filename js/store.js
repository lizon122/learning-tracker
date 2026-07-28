// store.js -- Data layer with localStorage persistence
window.LPA = window.LPA || {};

LPA.Store = (function() {
  var _data = {
    version: 1,
    courses: [],
    logs: [],
    goals: [],
    todos: [],
    settings: {
      theme: 'light',
      pomodoroFocusMin: 25,
      pomodoroBreakMin: 5,
      longBreakMin: 15,
      sessionsBeforeLongBreak: 4
    }
  };

  var _listeners = [];

  function _emit(action) {
    _listeners.forEach(function(fn) { try { fn({ action: action }); } catch(e) { console.error('onChange listener error:', e); } });
  }

  var _syncTimer = null; function _save() { try { localStorage.setItem('lpa_data', JSON.stringify(_data));
      _emit('data:changed');
    } catch (e) {
      console.error('localStorage save failed:', e);
      try { LPA.Utils.showToast('Storage full! Export and clear data.'); } catch(e2) {}
    }
  }

  function init() {
    try {
      var raw = localStorage.getItem('lpa_data');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version && Array.isArray(parsed.courses)) {
          parsed.courses = parsed.courses.filter(function(c) { return c && c.id && c.name && c.chapters; });
          _data = parsed;
        }
      }
    } catch (e) {
      console.warn('Data corrupted, resetting to empty state');
    }
    if (!_data.settings) _data.settings = { theme: 'light', pomodoroFocusMin: 25, pomodoroBreakMin: 5, longBreakMin: 15, sessionsBeforeLongBreak: 4 };
    if (!Array.isArray(_data.goals)) _data.goals = [];
    if (!Array.isArray(_data.logs)) _data.logs = [];
    if (!Array.isArray(_data.todos)) _data.todos = [];
    if (!Array.isArray(_data.courses)) _data.courses = [];
  }

  function getCourses(includeArchived) {
    var courses = _data.courses || [];
    if (!includeArchived) courses = courses.filter(function(c) { return !c.archived; });
    return courses;
  }

  function getCourse(id) {
    return (_data.courses || []).find(function(c) { return c.id === id; }) || null;
  }

  function addCourse(course) {
    var now = new Date().toISOString();
    var newCourse = {
      id: LPA.Utils.generateId(), name: course.name,
      totalChapters: course.totalChapters || 1, credit: course.credit || 0,
      color: course.color || '#4f46e5', semester: course.semester || '',
      chapters: [], archived: false, createdAt: now
    };
    for (var i = 1; i <= newCourse.totalChapters; i++) {
      newCourse.chapters.push({ id: LPA.Utils.generateId(), name: 'Chapter ' + i, status: 'not_started' });
    }
    _data.courses.push(newCourse);
    _save();
    return newCourse;
  }

  function updateCourse(id, updates) {
    var course = getCourse(id);
    if (!course) return null;
    if (updates.name !== undefined) course.name = updates.name;
    if (updates.totalChapters !== undefined) {
      var oldTotal = course.chapters.length;
      course.totalChapters = updates.totalChapters;
      if (updates.totalChapters > oldTotal) {
        for (var i = oldTotal + 1; i <= updates.totalChapters; i++)
          course.chapters.push({ id: LPA.Utils.generateId(), name: 'Chapter ' + i, status: 'not_started' });
      } else if (updates.totalChapters < oldTotal) {
        course.chapters = course.chapters.slice(0, updates.totalChapters);
      }
    }
    if (updates.chapters !== undefined) course.chapters = updates.chapters;
    if (updates.credit !== undefined) course.credit = updates.credit;
    if (updates.color !== undefined) course.color = updates.color;
    if (updates.semester !== undefined) course.semester = updates.semester;
    if (updates.archived !== undefined) course.archived = updates.archived;
    _save();
    return course;
  }

  function deleteCourse(id) {
    _data.courses = _data.courses.filter(function(c) { return c.id !== id; });
    _data.logs = _data.logs.filter(function(l) { return l.courseId !== id; });
    _save();
  }

  function updateChapterStatus(courseId, chapterId, status) {
    var course = getCourse(courseId);
    if (!course) return null;
    var chapter = course.chapters.find(function(ch) { return ch.id === chapterId; });
    if (!chapter) return null;
    chapter.status = status;
    _save();
    return course;
  }

  function getLogs(filters) {
    var logs = _data.logs || [];
    if (filters) {
      if (filters.courseId) logs = logs.filter(function(l) { return l.courseId === filters.courseId; });
      if (filters.from) logs = logs.filter(function(l) { return l.date >= filters.from; });
      if (filters.to) logs = logs.filter(function(l) { return l.date <= filters.to; });
    }
    return logs.sort(function(a, b) { return b.date.localeCompare(a.date); });
  }

  function addLog(log) {
    var newLog = {
      id: LPA.Utils.generateId(), courseId: log.courseId || '',
      date: log.date || LPA.Utils.today(), durationMin: log.durationMin || 0,
      method: log.method || 'manual', note: log.note || ''
    };
    _data.logs.push(newLog);
    _save();
    return newLog;
  }

  function deleteLog(id) {
    _data.logs = _data.logs.filter(function(l) { return l.id !== id; });
    _save();
  }

  function getGoals() { return _data.goals || []; }
  function addGoal(goal) {
    var g = { id: LPA.Utils.generateId(), title: goal.title, type: goal.type || 'daily', targetMin: goal.targetMin || 60, courseId: goal.courseId || null, active: true };
    _data.goals.push(g); _save(); return g;
  }
  function updateGoal(id, updates) {
    var g = _data.goals.find(function(x) { return x.id === id; });
    if (!g) return null;
    Object.keys(updates).forEach(function(k) { g[k] = updates[k]; });
    _save(); return g;
  }
  function deleteGoal(id) {
    _data.goals = _data.goals.filter(function(g) { return g.id !== id; });
    _save();
  }

  function getStats() {
    try {
      var courses = getCourses();
      var logs = _data.logs || [];
      var today = LPA.Utils.today();
      var week = LPA.Utils.weekRange();
      var weeklyTotalMin = 0, todayTotalMin = 0;
      logs.forEach(function(l) {
        if (!l || !l.date) return;
        var min = l.durationMin || 0;
        if (l.date >= week.start && l.date <= week.end) weeklyTotalMin += min;
        if (l.date === today) todayTotalMin += min;
      });
      var completedChapters = 0, totalChapters = 0;
      courses.forEach(function(c) {
        if (!c || !c.chapters) return;
        totalChapters += c.chapters.length;
        c.chapters.forEach(function(ch) { if (ch && ch.status === 'completed') completedChapters++; });
      });
      var overallProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;
      var streakDays = 0, dateSet = {};
      logs.forEach(function(l) { if (l && l.date) dateSet[l.date] = true; });
      var d = new Date();
      for (var safety = 0; safety < 3650; safety++) {
        var ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
        if (dateSet[ds]) { streakDays++; d.setDate(d.getDate() - 1); } else break;
      }
      var courseStats = courses.map(function(c) {
        if (!c || !c.chapters) return { courseId: '', name: '?', color: '#ccc', progress: 0, totalMin: 0, completedChapters: 0, totalChapters: 0 };
        var completed = c.chapters.filter(function(ch) { return ch && ch.status === 'completed'; }).length;
        var progress = c.chapters.length > 0 ? Math.round((completed / c.chapters.length) * 100) : 0;
        var totalMin = 0;
        logs.forEach(function(l) { if (l && l.courseId === c.id) totalMin += l.durationMin || 0; });
        return { courseId: c.id, name: c.name, color: c.color, progress: progress, totalMin: totalMin, completedChapters: completed, totalChapters: c.chapters.length };
      });
      return { weeklyTotalMin: weeklyTotalMin, completedChapters: completedChapters, totalChapters: totalChapters, overallProgress: overallProgress, streakDays: streakDays, todayTotalMin: todayTotalMin, courseStats: courseStats };
    } catch(e) {
      console.error('getStats error:', e);
      return { weeklyTotalMin: 0, completedChapters: 0, totalChapters: 0, overallProgress: 0, streakDays: 0, todayTotalMin: 0, courseStats: [] };
    }
  }

  function exportAll() { return JSON.stringify(_data, null, 2); }

  function importAll(json) {
    try {
      var parsed = JSON.parse(json);
      if (!parsed || !parsed.version || !Array.isArray(parsed.courses)) return false;
      _data = parsed;
      if (!_data.settings) _data.settings = { theme: 'light', pomodoroFocusMin: 25, pomodoroBreakMin: 5, longBreakMin: 15, sessionsBeforeLongBreak: 4 };
      if (!Array.isArray(_data.goals)) _data.goals = [];
      if (!Array.isArray(_data.logs)) _data.logs = [];
      if (!Array.isArray(_data.todos)) _data.todos = [];
      _save();
      return true;
    } catch(e) { return false; }
  }

  function getSettings() { return _data.settings; }

  function updateSettings(updates) {
    Object.keys(updates).forEach(function(k) { _data.settings[k] = updates[k]; });
    _save();
    return _data.settings;
  }

  function getTodos() {
    var today = LPA.Utils.today();
    return (_data.todos || []).filter(function(t) { return t && t.date === today; });
  }

  function addTodo(todo) {
    var t = { id: LPA.Utils.generateId(), text: todo.text, done: false, date: todo.date || LPA.Utils.today() };
    _data.todos.push(t);
    _save();
    return t;
  }

  function toggleTodo(id) {
    var t = _data.todos.find(function(x) { return x.id === id; });
    if (t) { t.done = !t.done; _save(); }
    return t || null;
  }

  function deleteTodo(id) {
    _data.todos = _data.todos.filter(function(t) { return t.id !== id; });
    _save();
  }

  function getTemplates() {
    return [
      { name: "Higher Math I", totalChapters: 7, credit: 5, semester: "Y1S1", color: "#ef4444" },
      { name: "Linear Algebra", totalChapters: 6, credit: 3, semester: "Y1S1", color: "#f97316" },
      { name: "Higher Math II", totalChapters: 5, credit: 5, semester: "Y1S2", color: "#ef4444" },
      { name: "College Physics", totalChapters: 12, credit: 4, semester: "Y1S2", color: "#eab308" },
      { name: "C Programming", totalChapters: 10, credit: 3, semester: "Y1S2", color: "#22c55e" },
      { name: "Probability & Statistics", totalChapters: 8, credit: 3, semester: "Y2S1", color: "#14b8a6" },
      { name: "Signals & Systems", totalChapters: 8, credit: 4, semester: "Y2S1", color: "#3b82f6" },
      { name: "Circuit Analysis", totalChapters: 9, credit: 3, semester: "Y2S1", color: "#6366f1" },
      { name: "Communication Principles", totalChapters: 10, credit: 4, semester: "Y2S2", color: "#8b5cf6" },
      { name: "Digital Signal Processing", totalChapters: 8, credit: 3, semester: "Y2S2", color: "#a855f7" },
      { name: "Electromagnetic Fields", totalChapters: 8, credit: 3, semester: "Y2S2", color: "#d946ef" },
      { name: "Information Theory", totalChapters: 8, credit: 3, semester: "Y3S1", color: "#ec4899" },
      { name: "Computer Networks", totalChapters: 9, credit: 3, semester: "Y3S1", color: "#f43f5e" },
      { name: "Mobile Communications", totalChapters: 8, credit: 3, semester: "Y3S1", color: "#06b6d4" },
      { name: "Optical Fiber Communications", totalChapters: 7, credit: 2, semester: "Y3S2", color: "#0d9488" },
      { name: "Microcomputer Principles", totalChapters: 8, credit: 3, semester: "Y3S2", color: "#84cc16" }
    ];
  }

  function importTemplates(selectedNames) {
    var templates = getTemplates();
    var count = 0;
    selectedNames.forEach(function(name) {
      var t = templates.find(function(tp) { return tp.name === name; });
      if (t) { addCourse(t); count++; }
    });
    return count;
  }

  function onChange(fn) {
    _listeners.push(fn);
    return function() {
      _listeners = _listeners.filter(function(f) { return f !== fn; });
    };
  }

  return {
    init: init, getCourses: getCourses, getCourse: getCourse,
    addCourse: addCourse, updateCourse: updateCourse, deleteCourse: deleteCourse,
    updateChapterStatus: updateChapterStatus,
    getLogs: getLogs, addLog: addLog, deleteLog: deleteLog,
    getGoals: getGoals, addGoal: addGoal, updateGoal: updateGoal, deleteGoal: deleteGoal,
    getStats: getStats, getSettings: getSettings, updateSettings: updateSettings,
    exportAll: exportAll, importAll: importAll,
    getTodos: getTodos, addTodo: addTodo, toggleTodo: toggleTodo, deleteTodo: deleteTodo,
    getTemplates: getTemplates, importTemplates: importTemplates,
    onChange: onChange
  };
})();
