import { CONFIG } from './config.js';
import { initTheme } from './theme.js';
import { route, onRoute } from './router.js';
import { home, category, command } from './ui.js';
document.title = CONFIG.name;
document.getElementById('gh').href = CONFIG.github;
initTheme();
onRoute(() => {
  const r = route(), app = document.getElementById('app');
  if (CONFIG.formats[r]) category(app, r); else if (r === 'command') command(app); else home(app);
  app.focus({ preventScroll: true }); scrollTo(0, 0);
});
