// auth.js — Login / Register page (no token needed)
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

    window.__GITHUB_READY__.then(function(ok) {
      if (ok && GitHubSync.isAuthed()) {
        location.hash = "#dashboard";
      } else {
        _build();
      }
    });
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
