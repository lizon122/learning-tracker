// github-auth.js — GitHub Gist backend with user auth
window.__GITHUB_READY__ = Promise.resolve(false);
window.__GITHUB_AUTH__ = false;
window.__GITHUB_USER__ = null;

(function() {
  var API = "https://api.github.com";
  var GIST_DESC = "commiada-l-data";
  var _token = null;
  var _gistId = null;
  var _currentUser = null;

  function _headers() {
    return { "Authorization": "token " + _token, "Accept": "application/vnd.github.v3+json" };
  }

  function _hash(str) {
    var encoder = new TextEncoder();
    return crypto.subtle.digest("SHA-256", encoder.encode(str)).then(function(buf) {
      return Array.from(new Uint8Array(buf)).map(function(b) { return b.toString(16).padStart(2,"0"); }).join("");
    });
  }

  function getToken() { return _token; }

  function setToken(token) {
    _token = token;
    localStorage.setItem("gh_master_token", token);
  }

  function hasToken() {
    return !!(_token || localStorage.getItem("gh_master_token"));
  }

  function loadToken() {
    if (_token) return _token;
    _token = localStorage.getItem("gh_master_token");
    return _token;
  }

  function ensureGist() {
    _token = loadToken();
    if (!_token) return Promise.reject("no token");
    return fetch(API + "/gists?per_page=100", { headers: _headers() })
      .then(function(r) { if (!r.ok) throw new Error("GitHub API 返回 " + r.status + "，Token 可能无 gist 权限"); return r.json(); }).then(function(gists) {
        for (var i = 0; i < gists.length; i++) {
          if (gists[i].description === GIST_DESC) {
            _gistId = gists[i].id;
            localStorage.setItem("gh_gist_id", _gistId);
            return _gistId;
          }
        }
        return fetch(API + "/gists", {
          method: "POST",
          headers: Object.assign({}, _headers(), { "Content-Type": "application/json" }),
          body: JSON.stringify({
            description: GIST_DESC, public: false,
            files: { "data.json": { content: JSON.stringify({ users: {} }) } }
          })
        }).then(function(r) { return r.json(); })
        .then(function(g) {
          _gistId = g.id;
          localStorage.setItem("gh_gist_id", _gistId);
          return _gistId;
        });
      });
  }

  function readAllData() {
    if (!_gistId) return Promise.resolve(null);
    return fetch(API + "/gists/" + _gistId, { headers: _headers() })
      .then(function(r) { return r.json(); })
      .then(function(g) {
        var f = g.files && g.files["data.json"];
        if (f && f.content) { try { return JSON.parse(f.content); } catch(e) {} }
        return null;
      });
  }

  function writeAllData(data) {
    if (!_gistId) return Promise.reject("no gist");
    return fetch(API + "/gists/" + _gistId, {
      method: "PATCH",
      headers: Object.assign({}, _headers(), { "Content-Type": "application/json" }),
      body: JSON.stringify({ files: { "data.json": { content: JSON.stringify(data) } } })
    }).then(function(r) { return r.json(); });
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
    _token = localStorage.getItem("gh_master_token");
    var savedUser = localStorage.getItem("gh_user");
    if (_token && savedUser) {
      _currentUser = savedUser;
      window.__GITHUB_AUTH__ = savedUser;
      window.__GITHUB_USER__ = savedUser;
      return Promise.resolve(true);
    }
    if (_token) return Promise.resolve(false);
    return Promise.resolve("need_token");
  }

  window.GitHubSync = {
    init: init, getToken: getToken, setToken: setToken, hasToken: hasToken,
    ensureGist: ensureGist, register: register, login: login,
    readUserData: readUserData, writeUserData: writeUserData,
    logout: logout, isAuthed: isAuthed, currentUser: currentUser,
    readAllData: readAllData
  };

  window.__GITHUB_READY__ = init().then(function(result) {
    if (result === "need_token") { console.log("No token set"); return "need_token"; }
    console.log("GitHub sync: " + (result ? "logged in as " + _currentUser : "not logged in"));
    return result;
  });
})();
