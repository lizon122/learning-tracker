// router.js — Hash-based SPA Router
window.LPA = window.LPA || {};

LPA.Router = (function() {
  var _routes = {};
  var _currentRoute = null;
  var _currentView = null;
  var _container = null;

  function init(routes) {
    _routes = routes;
    _container = document.getElementById('app-main');
    if (!_container) {
      console.error('Router: #app-main not found');
      return;
    }
    window.addEventListener('hashchange', _handleRoute);
    _handleRoute();
  }

  function _handleRoute() {
    var hash = location.hash.replace('#', '') || 'dashboard';
    var config = _routes[hash];
    if (!config) {
      location.hash = '#dashboard';
      return;
    }

    // Destroy previous view
    if (_currentView && typeof _currentView.destroy === 'function') {
      _currentView.destroy();
    }

    // Clear container
    _container.innerHTML = '';

    // Render new view
    config.render(_container);
    _currentView = config;
    _currentRoute = hash;
    document.title = config.title + ' — 学习进度分析助手';

    // Update sidebar active state
    var navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(function(item) {
      item.classList.remove('active');
      if (item.getAttribute('data-route') === hash) {
        item.classList.add('active');
      }
    });
  }

  function navigate(hash) {
    location.hash = '#' + hash;
  }

  function getCurrentRoute() {
    return _currentRoute;
  }

  return {
    init: init,
    navigate: navigate,
    getCurrentRoute: getCurrentRoute
  };
})();