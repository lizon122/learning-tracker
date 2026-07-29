// github-auth.js — GitHub Gist backend (token on server via Vercel proxy)
window.__GITHUB_READY__ = Promise.resolve(false);
window.__GITHUB_AUTH__ = false;
window.__GITHUB_USER__ = null;

(function() {
  var API_PROXY = "/api/github-proxy";
  var GIST_DESC = "commiada-l-data";
  var _gistId = null;
  var _currentUser = null;

  function _call(path, method, body) {
    return fetch(API_PROXY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: path, method: method, body: body })
    }).then(function(r) {
      if (!r.ok) {
        return r.json().then(function(d) { throw new Error(d.error || d.message || "HTTP " + r.status); });
      }
      return r.json();
    });
  }

  function _hash(str) {
    var encoder = new TextEncoder();
    return crypto.subtle.digest("SHA-256", encoder.encode(str)).then(function(buf) {
      return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2,"0"); }).join("");
    });
  }

  function ensureGist() {
    return _call("/gists?per_page=100", "GET").then(function(gists) {
      for (var i = 0; i < gists.length; i++) {
        if (gists[i].description === GIST_DESC) {
          _gistId = gists[i].id;
          localStorage.setItem("gh_gist_id", _gistId);
          return _gistId;
        }
      }
      return _call("/gists", "POST", {
        description: GIST_DESC, public: false,
        files: { "data.json": { content: JSON.stringify({ users: {} }) } }
      }).then(function(g) {
        _gistId = g.id;
        localStorage.setItem("gh_gist_id", _gistId);
        return _gistId;
      });
    });
  }

  function readAllData() {
    if (!_gistId) return Promise.resolve(null);
    return _call("/gists/" + _gistId, "GET").then(function(g) {
      var f = g.files && g.files["data.json"];
      if (f && f.content) { try { return JSON.parse(f.content); } catch(e) {} }
      return null;
    });
  }

  function writeAllData(data) {
    if (!_gistId) return Promise.reject("no gist");
    return _call("/gists/" + _gistId, "PATCH", {
      files: { "data.json": { content: JSON.stringify(data) } }
    });
  }

  function register(username, password) {
    return ensureGist().then(function() {
      return readAllData();
    }).then(function(data) {
      data = data || { users: {} };
      if (data.users[username]) throw new Error("用户名已存在");
      return _hash(password).then(function(hash) {
        data.users[username] = {
          password: hash,
          data: { courses: [], logs: [], settings: { theme: "light", pomodoroFocusMin: 25, pomodoroBreakMin: 5, longBreakMin: 15, sessionsBeforeLongBreak: 4 }, goals: [], todos: [] }
        };
        return writeAllData(data);
      });
    });
  }

  function login(username, password) {
    return ensureGist().then(function() {
      return readAllData();
    }).then(function(data) {
      if (!data || !data.users || !data.users[username]) throw new Error("用户不存在");
      return _hash(password).then(function(hash) {
        if (data.users[username].password !== hash) throw new Error("密码错误");
        _currentUser = username;
        window.__GITHUB_AUTH__ = username;
        window.__GITHUB_USER__ = username;
        localStorage.setItem("gh_user", username);
        return username;
      });
    });
  }

  function readUserData() {
    if (!_currentUser) return Promise.resolve(null);
    return readAllData().then(function(data) {
      if (data && data.users && data.users[_currentUser]) return data.users[_currentUser].data;
      return null;
    });
  }

  function writeUserData(userData) {
    if (!_currentUser) return Promise.reject("not logged in");
    return readAllData().then(function(data) {
      data = data || { users: {} };
      if (!data.users[_currentUser]) throw new Error("user not found");
      data.users[_currentUser].data = userData;
      return writeAllData(data);
    });
  }

  function isAuthed() { return !!_currentUser; }
  function currentUser() { return _currentUser; }

  function logout() {
    _currentUser = null;
    window.__GITHUB_AUTH__ = false;
    window.__GITHUB_USER__ = null;
    localStorage.removeItem("gh_user");
  }

  function init() {
    _gistId = localStorage.getItem("gh_gist_id");
    var savedUser = localStorage.getItem("gh_user");
    if (savedUser) {
      _currentUser = savedUser;
      window.__GITHUB_AUTH__ = savedUser;
      window.__GITHUB_USER__ = savedUser;
      // Quick verify connection
      return _call("/user", "GET").then(function() { return true; }).catch(function() { return true; });
    }
    return Promise.resolve(false);
  }

  window.GitHubSync = {
    init: init, register: register, login: login,
    readUserData: readUserData, writeUserData: writeUserData,
    logout: logout, isAuthed: isAuthed, currentUser: currentUser
  };

  window.__GITHUB_READY__ = init().then(function(ok) {
    console.log("GitHub sync: " + (ok ? "logged in as " + _currentUser : "not logged in"));
    return ok;
  });
})();
