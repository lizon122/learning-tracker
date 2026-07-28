// auth.js — Login / Register page
window.LPA = window.LPA || {};

LPA.Auth = (function() {
  var _container = null;
  var _mode = "login";

  function render(container) {
    _container = container;

    _container.innerHTML =
      '<div class="auth-page"><div class="auth-card" style="text-align:center">' +
      '<div style="font-size:3rem;margin-bottom:16px;">&#x1F4CE;</div>' +
      '<div class="auth-logo">Commiada<span>-L</span></div>' +
      '<p class="auth-sub">学习进度分析助手</p>' +
      '<p style="color:var(--color-text-muted);margin-top:20px;">正在连接...</p>' +
      '<div style="margin-top:12px;width:40px;height:40px;border:3px solid var(--color-border);border-top-color:var(--color-primary);border-radius:50%;animation:spin 0.8s linear infinite;margin-left:auto;margin-right:auto;"></div>' +
      "</div></div>";

    window.__GITHUB_READY__.then(function(result) {
      if (result === "need_token") {
        _showTokenSetup();
      } else if (result && GitHubSync.isAuthed()) {
        location.hash = "#dashboard";
      } else {
        _build();
      }
    });
  }

  function _showTokenSetup() {
    _container.innerHTML =
      '<div class="auth-page"><div class="auth-card" style="text-align:center">' +
      '<div class="auth-logo">Commiada<span>-L</span></div>' +
      '<p class="auth-sub" style="font-size:.9rem;">首次使用 · 绑定 GitHub</p>' +
      '<p style="color:#64748b;font-size:.75rem;margin:16px 8px 4px 8px;">需要一个 GitHub Token 来存储学习数据（仅需设置一次）</p>' +
      '<p style="color:#94a3b8;font-size:.65rem;margin:0 8px 12px 8px;">数据存在你的私有 Gist，完全由你控制</p>' +
      '<input type="password" id="setup-token" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" style="width:100%;padding:10px 14px;border:1px solid var(--color-border);border-radius:8px;font-family:monospace;font-size:.8rem;box-sizing:border-box;">' +
      '<p class="auth-error" id="auth-error" style="display:none"></p>' +
      '<button id="btn-setup" style="margin-top:8px;width:100%;background:var(--color-primary);color:#fff;border:none;padding:12px;border-radius:8px;cursor:pointer;font-size:1rem;">绑定并继续</button>' +
      '<p style="font-size:.7rem;color:#94a3b8;margin-top:10px;">' +
      '<a href="https://github.com/settings/tokens" target="_blank" style="color:var(--color-primary);">获取 Token</a> — 只勾选 <b>gist</b> 权限，其他都不选</p>' +
      "</div></div>";

    document.getElementById("btn-setup").addEventListener("click", function() {
      var token = document.getElementById("setup-token").value.trim();
      if (!token) { _showError("请输入 Token"); return; }
      var btn = document.getElementById("btn-setup");
      btn.disabled = true; btn.textContent = "验证中...";
      fetch("https://api.github.com/user", { headers: { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" } })
        .then(function(r) { if (!r.ok) throw new Error("bad"); return r.json(); })
        .then(function() {
          GitHubSync.setToken(token);
          window.__GITHUB_READY__ = GitHubSync.init().then(function() { return !!GitHubSync.getToken(); });
          _build();
        })
        .catch(function() { _showError("Token 无效，请检查"); btn.disabled = false; btn.textContent = "绑定并继续"; });
    });

    var inp = document.getElementById("setup-token");
    if (inp) inp.addEventListener("keydown", function(e) { if (e.key === "Enter") document.getElementById("btn-setup").click(); });
  }

  function destroy() { _container = null; }

  function _build() {
    var h = '<div class="auth-page"><div class="auth-card">';
    h += '<div class="auth-logo">Commiada<span>-L</span></div>';
    h += '<p class="auth-sub">学习进度分析助手</p>';
    h += '<div class="auth-tabs">';
    h += '<button class="auth-tab' + (_mode === "login" ? " active" : "") + '" id="tab-login">登录</button>';
    h += '<button class="auth-tab' + (_mode === "signup" ? " active" : "") + '" id="tab-signup">注册</button>';
    h += "</div>";
    h += '<div class="auth-form" id="auth-form">';
    h += '<input type="text" id="auth-username" placeholder="用户名" autocomplete="username">';
    h += '<input type="password" id="auth-password" placeholder="密码" autocomplete="' + (_mode === "login" ? "current-password" : "new-password") + '">';
    h += '<p class="auth-error" id="auth-error" style="display:none"></p>';
    h += '<button class="auth-submit" id="auth-submit">' + (_mode === "login" ? "登 录" : "注 册") + "</button></div>";
    h += (_mode === "login" ? '<p class="auth-switch">还没有账号？<a id="switch-signup" href="#">去注册</a></p>' : '<p class="auth-switch">已有账号？<a id="switch-login" href="#">去登录</a></p>');
    h += "</div></div>";

    _container.innerHTML = h;
    document.getElementById("tab-login").addEventListener("click", function() { _mode = "login"; _build(); });
    document.getElementById("tab-signup").addEventListener("click", function() { _mode = "signup"; _build(); });
    document.getElementById("auth-submit").addEventListener("click", _submit);
    var pw = document.getElementById("auth-password"); if (pw) pw.addEventListener("keydown", function(e) { if (e.key === "Enter") _submit(); });
    var sl = document.getElementById("switch-signup") || document.getElementById("switch-login");
    if (sl) sl.addEventListener("click", function(e) { e.preventDefault(); _mode = _mode === "login" ? "signup" : "login"; _build(); });
  }

  function _submit() {
    var username = document.getElementById("auth-username").value.trim();
    var password = document.getElementById("auth-password").value;
    if (!username || !password) { _showError("请输入用户名和密码"); return; }
    if (password.length < 6) { _showError("密码至少 6 位"); return; }
    _showError("");
    var btn = document.getElementById("auth-submit");
    btn.disabled = true; btn.textContent = "处理中...";
    var fn = _mode === "signup" ? GitHubSync.register : GitHubSync.login;
    fn(username, password).then(function() { location.hash = "#dashboard"; })
      .catch(function(e) { _showError((_mode === "signup" ? "注册" : "登录") + "失败：" + (e.message || "请重试")); btn.disabled = false; btn.textContent = _mode === "signup" ? "注 册" : "登 录"; });
  }

  function _showError(msg) {
    var el = document.getElementById("auth-error");
    if (el) { el.textContent = msg; el.style.display = msg ? "block" : "none"; }
  }

  return { render: render, destroy: destroy };
})();
