// Capa de persistencia: localStorage con claves con prefijo propio.
const DB = (() => {
  const KEYS = {
    items: 'compra.items',
    templates: 'compra.templates',
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (err) {
      console.error('No se pudo guardar en localStorage', err);
    }
  }

  function uid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  return {
    uid,
    getItems: () => read(KEYS.items, []),
    setItems: (items) => write(KEYS.items, items),
    // templates: [{ id, name, items: [{ name, category }] }]
    getTemplates: () => read(KEYS.templates, []),
    setTemplates: (templates) => write(KEYS.templates, templates),
  };
})();
