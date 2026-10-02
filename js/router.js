export const route = () => location.hash.replace(/^#\/?/, '') || '';
export const onRoute = fn => { addEventListener('hashchange', fn); fn(); };
