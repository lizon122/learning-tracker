// app.js — Application entry point (ultra-defensive)
window.LPA = window.LPA || {};

(function() {
  function applyTheme() {
    try {
      var settings = LPA.Store.getSettings();
      document.documentElement.setAttribute('data-theme', settings.theme || 'light');
    } catch(e) { console.warn('applyTheme failed:', e); }
  }

  function boot() {
    try {
      console.log('boot: starting...');

      // Step 1: Init store
      try {
        LPA.Store.init();
        console.log('boot: store initialized');
      } catch(e) {
        console.error('Store.init failed:', e);
        var main = document.getElementById('app-main');
        if (main) main.innerHTML =
          '<div style="padding:40px;text-align:center;"><h2>⚠️ 数据加载失败</h2>' +
          '<p style="color:#ef4444;margin:12px 0;">' + e.message + '</p>' +
          '<button onclick="localStorage.clear();location.reload();" style="background:#ef4444;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:1rem;">🔄 清除数据并重新加载</button></div>';
        return;
      }

      applyTheme();

      // Step 2: Init router
      try {
        LPA.Router.init({
          dashboard: { render: LPA.Dashboard.render, destroy: LPA.Dashboard.destroy, title: '学习仪表盘' },
          courses:   { render: LPA.Courses.render,   destroy: LPA.Courses.destroy,   title: '课程管理' },
          timer:     { render: LPA.Timer.render,     destroy: LPA.Timer.destroy,     title: '学习计时' },
          analytics: { render: LPA.Analytics.render, destroy: LPA.Analytics.destroy, title: '数据分析' },
          settings:  { render: LPA.Settings.render,  destroy: LPA.Settings.destroy,  title: '设置' }
        });
        console.log('boot: router initialized');
      } catch(e) {
        console.error('Router.init failed:', e);
        var main = document.getElementById('app-main');
        if (main) main.innerHTML =
          '<div style="padding:40px;text-align:center;"><h2>⚠️ 路由初始化失败</h2>' +
          '<p style="color:#ef4444;margin:12px 0;">' + e.message + '</p>' +
          '<button onclick="localStorage.clear();location.reload();" style="background:#ef4444;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:1rem;">🔄 清除数据并重新加载</button></div>';
        return;
      }

      LPA.Store.onChange(function(e) {
        if (e.action === 'data:changed') applyTheme();
      });

      console.log('📚 学习进度分析助手已就绪');
    } catch(e) {
      console.error('boot fatal error:', e);
    }
  }

  // Always run boot - either on DOMContentLoaded or immediately
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();