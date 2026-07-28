// app.js — Application entry point
window.LPA = window.LPA || {};

(function() {
  function applyTheme() {
    try {
      var settings = LPA.Store.getSettings();
      document.documentElement.setAttribute("data-theme", settings.theme || "light");
    } catch(e) {}
  }

  function boot() {
    try {
      LPA.Store.init();
      applyTheme();

      LPA.Router.init({
        login:     { render: LPA.Auth.render,     destroy: LPA.Auth.destroy,     title: "登录" },
        dashboard: { render: LPA.Dashboard.render, destroy: LPA.Dashboard.destroy, title: "学习仪表盘" },
        courses:   { render: LPA.Courses.render,   destroy: LPA.Courses.destroy,   title: "课程管理" },
        timer:     { render: LPA.Timer.render,     destroy: LPA.Timer.destroy,     title: "学习计时" },
        analytics: { render: LPA.Analytics.render, destroy: LPA.Analytics.destroy, title: "数据分析" },
        settings:  { render: LPA.Settings.render,  destroy: LPA.Settings.destroy,  title: "设置" }
      });

      LPA.Store.onChange(function(e) {
        if (e.action === "data:changed") applyTheme();
      });

      console.log("Commiada-L ready, Bmob:", window.__BMOB_AVAILABLE__);
    } catch(e) {
      console.error("boot error:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
