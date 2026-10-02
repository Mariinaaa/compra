// Lógica de la app: estado en memoria respaldado por DB (localStorage).
// Orden de pasillos de Mercadona, tal como se recorre la tienda.
const CATEGORIES = [
  { id: 'embutidos', label: 'Embutidos', emoji: '🥓' },
  { id: 'carniceria_polleria', label: 'Carnicería/Pollería', emoji: '🍗' },
  { id: 'precocinados', label: 'Precocinados', emoji: '🍱' },
  { id: 'nevera', label: 'Nevera (cosas de nevera)', emoji: '🥙' },
  { id: 'congelados_helados', label: 'Congelados/Helados', emoji: '🧊' },
  { id: 'pescado', label: 'Pescado', emoji: '🐟' },
  { id: 'lacteos', label: 'Lácteos', emoji: '🥛' },
  { id: 'panes', label: 'Panes', emoji: '🍞' },
  { id: 'frutas_verduras', label: 'Frutas/Verduras', emoji: '🍎' },
  { id: 'higiene', label: 'Higiene', emoji: '🧴' },
  { id: 'limpieza', label: 'Limpieza', emoji: '🧽' },
  { id: 'otros', label: 'Otros', emoji: '🛒' },
];
const DEFAULT_CATEGORY = 'otros';
const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));

let items = DB.getItems();
let templates = DB.getTemplates();

// --- DOM refs ---
const categoriesContainer = document.getElementById('categoriesContainer');
// categoryId -> <ul> element, built once so typing in other sections isn't disturbed on re-render
const categoryListEls = new Map();
const menuBtn = document.getElementById('menuBtn');
const menuPanel = document.getElementById('menuPanel');
const saveTemplateBtn = document.getElementById('saveTemplateBtn');
const loadTemplateBtn = document.getElementById('loadTemplateBtn');
const clearCheckedBtn = document.getElementById('clearCheckedBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const templatesModal = document.getElementById('templatesModal');
const templatesList = document.getElementById('templatesList');
const closeTemplatesBtn = document.getElementById('closeTemplatesBtn');
const toast = document.getElementById('toast');

let toastTimer = null;
function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), 2200);
}

function persistItems() { DB.setItems(items); }
function persistTemplates() { DB.setTemplates(templates); }

// Crea una vez la sección (título + lista + mini formulario) de cada pasillo.
function buildCategorySections() {
  categoriesContainer.textContent = '';
  categoryListEls.clear();
  for (const cat of CATEGORIES) {
    const section = document.createElement('section');
    section.className = 'category-group';

    const title = document.createElement('h2');
    title.className = 'category-title';
    title.textContent = `${cat.emoji} ${cat.label}`;

    const ul = document.createElement('ul');
    ul.className = 'item-list';

    const form = document.createElement('form');
    form.className = 'category-add-form';
    form.autocomplete = 'off';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Añadir a ${cat.label.toLowerCase()}...`;
    input.setAttribute('aria-label', `Añadir producto a ${cat.label}`);

    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.className = 'icon-btn primary';
    addBtn.title = 'Añadir';
    addBtn.textContent = '➕';

    form.append(input, addBtn);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      addItem(input.value, cat.id);
      input.value = '';
      input.focus();
    });

    section.append(title, ul, form);
    categoriesContainer.appendChild(section);
    categoryListEls.set(cat.id, ul);
  }
}

// Items guardados con una categoría que ya no existe caen en "Otros".
function normalizeCategories() {
  let changed = false;
  for (const it of items) {
    if (!categoryById.has(it.category)) {
      it.category = DEFAULT_CATEGORY;
      changed = true;
    }
  }
  if (changed) persistItems();
}

function itemsForCategory(categoryId) {
  return items
    .filter((it) => it.category === categoryId)
    .sort((a, b) => {
      if (a.checked !== b.checked) return a.checked ? 1 : -1;
      return a.name.localeCompare(b.name, 'es');
    });
}

function render() {
  for (const cat of CATEGORIES) {
    const ul = categoryListEls.get(cat.id);
    ul.textContent = '';
    for (const item of itemsForCategory(cat.id)) {
      ul.appendChild(renderItemRow(item));
    }
  }
}

function renderItemRow(item) {
  const li = document.createElement('li');
  li.className = `item-row${item.checked ? ' checked' : ''}`;

  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.className = 'item-checkbox';
  checkbox.checked = item.checked;
  checkbox.addEventListener('change', () => toggleItem(item.id));

  const name = document.createElement('span');
  name.className = 'item-name';
  name.textContent = item.name;

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'item-delete';
  del.title = 'Eliminar';
  del.textContent = '✖';
  del.addEventListener('click', () => deleteItem(item.id));

  li.append(checkbox, name, del);
  return li;
}

function addItem(name, category) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const duplicate = items.find(
    (it) => !it.checked && it.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (duplicate) {
    showToast('Ese producto ya está en la lista');
    return;
  }

  items.push({
    id: DB.uid(),
    name: trimmed,
    category,
    checked: false,
    createdAt: Date.now(),
  });
  persistItems();
  render();
}

function toggleItem(id) {
  const item = items.find((it) => it.id === id);
  if (!item) return;
  item.checked = !item.checked;
  persistItems();
  render();
}

function deleteItem(id) {
  items = items.filter((it) => it.id !== id);
  persistItems();
  render();
}

function clearChecked() {
  if (!items.some((it) => it.checked)) {
    showToast('No hay productos marcados');
    return;
  }
  items = items.filter((it) => !it.checked);
  persistItems();
  render();
  showToast('Productos marcados eliminados');
}

function clearAll() {
  if (items.length === 0) return;
  if (!confirm('¿Vaciar toda la lista?')) return;
  items = [];
  persistItems();
  render();
  showToast('Lista vaciada');
}

// --- Plantillas (listas recurrentes) ---
function saveTemplate() {
  if (items.length === 0) {
    showToast('La lista está vacía');
    return;
  }
  const name = prompt('Nombre de la lista recurrente (p.ej. "Compra semanal"):');
  if (!name || !name.trim()) return;
  templates.push({
    id: DB.uid(),
    name: name.trim(),
    items: items.map((it) => ({ name: it.name, category: it.category })),
  });
  persistTemplates();
  showToast('Lista guardada');
}

function loadTemplateIntoList(template) {
  let added = 0;
  for (const tpl of template.items) {
    const exists = items.some((it) => it.name.toLowerCase() === tpl.name.toLowerCase());
    if (exists) continue;
    items.push({
      id: DB.uid(),
      name: tpl.name,
      category: tpl.category,
      checked: false,
      createdAt: Date.now(),
    });
    added += 1;
  }
  persistItems();
  render();
  closeTemplatesModal();
  showToast(added > 0 ? `Se añadieron ${added} productos` : 'No había productos nuevos');
}

function deleteTemplate(id) {
  templates = templates.filter((t) => t.id !== id);
  persistTemplates();
  renderTemplatesList();
}

function renderTemplatesList() {
  templatesList.textContent = '';
  if (templates.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'template-empty';
    empty.textContent = 'No tienes listas recurrentes guardadas todavía.';
    templatesList.appendChild(empty);
    return;
  }
  for (const tpl of templates) {
    const row = document.createElement('div');
    row.className = 'template-row';

    const label = document.createElement('span');
    label.textContent = `${tpl.name} (${tpl.items.length})`;

    const actions = document.createElement('div');
    const loadBtn = document.createElement('button');
    loadBtn.className = 'template-load';
    loadBtn.textContent = 'Cargar';
    loadBtn.addEventListener('click', () => loadTemplateIntoList(tpl));

    const delBtn = document.createElement('button');
    delBtn.className = 'template-delete';
    delBtn.textContent = 'Eliminar';
    delBtn.addEventListener('click', () => {
      if (confirm(`¿Eliminar la lista "${tpl.name}"?`)) deleteTemplate(tpl.id);
    });

    actions.append(loadBtn, delBtn);
    row.append(label, actions);
    templatesList.appendChild(row);
  }
}

function openTemplatesModal() {
  renderTemplatesList();
  templatesModal.classList.remove('hidden');
}
function closeTemplatesModal() {
  templatesModal.classList.add('hidden');
}

// --- Menú ---
function toggleMenu(forceClose) {
  const shouldClose = forceClose ?? !menuPanel.classList.contains('hidden');
  menuPanel.classList.toggle('hidden', shouldClose);
  menuBtn.setAttribute('aria-expanded', String(!shouldClose));
}

document.addEventListener('click', (e) => {
  if (!menuPanel.contains(e.target) && e.target !== menuBtn) {
    toggleMenu(true);
  }
});

menuBtn.addEventListener('click', () => toggleMenu());
saveTemplateBtn.addEventListener('click', () => { toggleMenu(true); saveTemplate(); });
loadTemplateBtn.addEventListener('click', () => { toggleMenu(true); openTemplatesModal(); });
clearCheckedBtn.addEventListener('click', () => { toggleMenu(true); clearChecked(); });
clearAllBtn.addEventListener('click', () => { toggleMenu(true); clearAll(); });
closeTemplatesBtn.addEventListener('click', closeTemplatesModal);
templatesModal.addEventListener('click', (e) => {
  if (e.target === templatesModal) closeTemplatesModal();
});

// --- Service worker ---
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch((err) => {
      console.error('No se pudo registrar el service worker', err);
    });
  });
}

// --- Inicialización ---
normalizeCategories();
buildCategorySections();
render();
