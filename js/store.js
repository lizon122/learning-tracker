// store.js — Data layer with localStorage persistence
window.LPA = window.LPA || {};

LPA.Store = (function() {
  var _data = {
    version: 1,
    courses: [],
    logs: [],
    goals: [],
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
    _listeners.forEach(function(fn) { fn({ action: action }); });
  }

  function _save() {
    try {
      localStorage.setItem('lpa_data', JSON.stringify(_data));
      _emit('data:changed');
    } catch (e) {
      LPA.Utils.showToast('⚠ 存储空间不足，请导出数据后清理');
      console.error('localStorage save failed:', e);
    }
  }

  function init() {
    try {
      var raw = localStorage.getItem('lpa_data');
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.version && Array.isArray(parsed.courses)) {
          // Validate courses have required fields
          parsed.courses = parsed.courses.filter(function(c) { return c && c.id && c.name; });
          _data = parsed;
          if (!_data.settings) {
            _data.settings = { theme: 'light', pomodoroFocusMin: 25, pomodoroBreakMin: 5, longBreakMin: 15, sessionsBeforeLongBreak: 4 };
          }
          if (!_data.goals) _data.goals = [];
          if (!_data.logs) _data.logs = [];
        }
      }
    } catch (e) {
      console.warn('Data corrupted, resetting to empty state');
      _save();
    }
  }

  // ---- Courses ----
  function getCourses(includeArchived) {
    var courses = _data.courses || [];
    if (!includeArchived) {
      courses = courses.filter(function(c) { return !c.archived; });
    }
    return courses;
  }

  function getCourse(id) {
    return (_data.courses || []).find(function(c) { return c.id === id; }) || null;
  }

  function addCourse(course) {
    var now = new Date().toISOString();
    var newCourse = {
      id: LPA.Utils.generateId(),
      name: course.name,
      totalChapters: course.totalChapters || 1,
      credit: course.credit || 0,
      color: course.color || '#4f46e5',
      semester: course.semester || '',
      chapters: [],
      archived: false,
      createdAt: now
    };
    for (var i = 1; i <= newCourse.totalChapters; i++) {
      newCourse.chapters.push({
        id: LPA.Utils.generateId(),
        name: '第' + i + '章',
        status: 'not_started'
      });
    }
    if (!_data.courses) _data.courses = [];
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
        for (var i = oldTotal + 1; i <= updates.totalChapters; i++) {
          course.chapters.push({
            id: LPA.Utils.generateId(),
            name: '第' + i + '章',
            status: 'not_started'
          });
        }
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
    _data.courses = (_data.courses || []).filter(function(c) { return c.id !== id; });
    _data.logs = (_data.logs || []).filter(function(l) { return l.courseId !== id; });
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

  // ---- Study Logs ----
  function getLogs(filters) {
    var logs = _data.logs || [];
    if (filters) {
      if (filters.courseId) {
        logs = logs.filter(function(l) { return l.courseId === filters.courseId; });
      }
      if (filters.from) {
        logs = logs.filter(function(l) { return l.date >= filters.from; });
      }
      if (filters.to) {
        logs = logs.filter(function(l) { return l.date <= filters.to; });
      }
    }
    return logs.sort(function(a, b) { return b.date.localeCompare(a.date) || (b.id > a.id ? 1 : -1); });
  }

  function addLog(log) {
    var newLog = {
      id: LPA.Utils.generateId(),
      courseId: log.courseId || '',
      date: log.date || LPA.Utils.today(),
      durationMin: log.durationMin || 0,
      method: log.method || 'manual',
      note: log.note || ''
    };
    if (!_data.logs) _data.logs = [];
    _data.logs.push(newLog);
    _save();
    return newLog;
  }

  function deleteLog(id) {
    _data.logs = (_data.logs || []).filter(function(l) { return l.id !== id; });
    _save();
  }

  // ---- Goals ----
  function getGoals() { return _data.goals || []; }
  function addGoal(goal) {
    var g = { id: LPA.Utils.generateId(), title: goal.title, type: goal.type || 'daily', targetMin: goal.targetMin || 60, courseId: goal.courseId || null, active: true };
    _data.goals.push(g);
    _save();
    return g;
  }
  function updateGoal(id, updates) {
    var g = (_data.goals || []).find(function(x) { return x.id === id; });
    if (!g) return null;
    Object.keys(updates).forEach(function(k) { g[k] = updates[k]; });
    _save();
    return g;
  }
  function deleteGoal(id) {
    _data.goals = (_data.goals || []).filter(function(g) { return g.id !== id; });
    _save();
  }

  // ---- Stats Aggregation ----
  function getStats() {
    var courses = getCourses();
    var logs = _data.logs || [];
    var today = LPA.Utils.today();
    var week = LPA.Utils.weekRange();

    var weeklyTotalMin = 0;
    var todayTotalMin = 0;
    var logsThisWeek = logs.filter(function(l) { return l.date >= week.start && l.date <= week.end; });
    logsThisWeek.forEach(function(l) { weeklyTotalMin += l.durationMin; });

    var logsToday = logs.filter(function(l) { return l.date === today; });
    logsToday.forEach(function(l) { todayTotalMin += l.durationMin; });

    var completedChapters = 0;
    var totalChapters = 0;
    courses.forEach(function(c) {
      totalChapters += c.chapters.length;
      c.chapters.forEach(function(ch) {
        if (ch.status === 'completed') completedChapters++;
      });
    });
    var overallProgress = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0;

    // Streak days
    var streakDays = 0;
    var dateSet = {};
    logs.forEach(function(l) { dateSet[l.date] = true; });
    var checkDate = new Date();
    while (dateSet[LPA.Utils.today.call({constructor:{}})]) {
      // simple approach: count consecutive days backward from today
    }
    // Proper streak calculation
    var d = new Date();
    while (true) {
      var ds = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
      if (dateSet[ds]) {
        streakDays++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    // Course stats
    var courseStats = courses.map(function(c) {
      var completed = c.chapters.filter(function(ch) { return ch.status === 'completed'; }).length;
      var progress = c.chapters.length > 0 ? Math.round((completed / c.chapters.length) * 100) : 0;
      var courseLogs = logs.filter(function(l) { return l.courseId === c.id; });
      var totalMin = 0;
      courseLogs.forEach(function(l) { totalMin += l.durationMin; });
      return {
        courseId: c.id,
        name: c.name,
        color: c.color,
        progress: progress,
        totalMin: totalMin,
        completedChapters: completed,
        totalChapters: c.chapters.length
      };
    });

    return {
      weeklyTotalMin: weeklyTotalMin,
      completedChapters: completedChapters,
      totalChapters: totalChapters,
      overallProgress: overallProgress,
      streakDays: streakDays,
      todayTotalMin: todayTotalMin,
      courseStats: courseStats
    };
  }

  // ---- Import / Export ----
  function exportAll() {
    return JSON.stringify(_data, null, 2);
  }

  function importAll(json) {
    try {
      var parsed = JSON.parse(json);
      if (!parsed || !parsed.version || !parsed.courses) return false;
      _data = parsed;
      if (!_data.settings) {
        _data.settings = { theme: 'light', pomodoroFocusMin: 25, pomodoroBreakMin: 5, longBreakMin: 15, sessionsBeforeLongBreak: 4 };
      }
      if (!_data.goals) _data.goals = [];
      if (!_data.logs) _data.logs = [];
      _save();
      return true;
    } catch (e) {
      return false;
    }
  }

  function getSettings() {
    return _data.settings;
  }

  function updateSettings(updates) {
    Object.keys(updates).forEach(function(k) {
      _data.settings[k] = updates[k];
    });
    _save();
    return _data.settings;
  }

  function onChange(fn) {
    _listeners.push(fn);
    return function() {
      _listeners = _listeners.filter(function(f) { return f !== fn; });
    };
  }

  
  // ---- Todos ----
  function getTodos() {
    var today = LPA.Utils.today();
    return (_data.todos || []).filter(function(t) { return t.date === today; });
  }

  function addTodo(todo) {
    if (!_data.todos) _data.todos = [];
    var t = {
      id: LPA.Utils.generateId(),
      text: todo.text,
      done: false,
      date: todo.date || LPA.Utils.today()
    };
    _data.todos.push(t);
    _save();
    return t;
  }

  function toggleTodo(id) {
    var t = (_data.todos || []).find(function(x) { return x.id === id; });
    if (t) { t.done = !t.done; _save(); }
    return t || null;
  }

  function deleteTodo(id) {
    _data.todos = (_data.todos || []).filter(function(t) { return t.id !== id; });
    _save();
  }
  
  // ---- Course Templates ----
  function getTemplates() {
    return [
      { name: "高等数学（上）", totalChapters: 7, credit: 5, semester: "大一上", color: "#ef4444" },
      { name: "线性代数", totalChapters: 6, credit: 3, semester: "大一上", color: "#f97316" },
      { name: "高等数学（下）", totalChapters: 5, credit: 5, semester: "大一下", color: "#ef4444" },
      { name: "大学物理", totalChapters: 12, credit: 4, semester: "大一下", color: "#eab308" },
      { name: "C语言程序设计", totalChapters: 10, credit: 3, semester: "大一下", color: "#22c55e" },
      { name: "概率论与数理统计", totalChapters: 8, credit: 3, semester: "大二上", color: "#14b8a6" },
      { name: "信号与系统", totalChapters: 8, credit: 4, semester: "大二上", color: "#3b82f6" },
      { name: "电路分析基础", totalChapters: 9, credit: 3, semester: "大二上", color: "#6366f1" },
      { name: "通信原理", totalChapters: 10, credit: 4, semester: "大二下", color: "#8b5cf6" },
      { name: "数字信号处理", totalChapters: 8, credit: 3, semester: "大二下", color: "#a855f7" },
      { name: "电磁场与电磁波", totalChapters: 8, credit: 3, semester: "大二下", color: "#d946ef" },
      { name: "信息论与编码", totalChapters: 8, credit: 3, semester: "大三上", color: "#ec4899" },
      { name: "计算机网络", totalChapters: 9, credit: 3, semester: "大三上", color: "#f43f5e" },
      { name: "移动通信", totalChapters: 8, credit: 3, semester: "大三上", color: "#06b6d4" },
      { name: "光纤通信", totalChapters: 7, credit: 2, semester: "大三下", color: "#0d9488" },
      { name: "微机原理与接口技术", totalChapters: 8, credit: 3, semester: "大三下", color: "#84cc16" }
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
  return {
    init: init,
    getCourses: getCourses,
    getCourse: getCourse,
    addCourse: addCourse,
    updateCourse: updateCourse,
    deleteCourse: deleteCourse,
    updateChapterStatus: updateChapterStatus,
    getLogs: getLogs,
    addLog: addLog,
    deleteLog: deleteLog,
    getGoals: getGoals,
    addGoal: addGoal,
    updateGoal: updateGoal,
    deleteGoal: deleteGoal,
    getStats: getStats,
    getSettings: getSettings,
    updateSettings: updateSettings,
    exportAll: exportAll,
    importAll: importAll,
    getTodos: getTodos,
    addTodo: addTodo,
    toggleTodo: toggleTodo,
    deleteTodo: deleteTodo,
    getTemplates: getTemplates,
    importTemplates: importTemplates,
    onChange: onChange
  };
})();