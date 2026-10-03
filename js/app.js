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
  { id: 'despensa', label: 'Despensa', emoji: '🥫' },
  { id: 'bebidas', label: 'Bebidas', emoji: '🥤' },
  { id: 'higiene', label: 'Higiene', emoji: '🧴' },
  { id: 'limpieza', label: 'Limpieza', emoji: '🧽' },
  { id: 'otros', label: 'Otros', emoji: '🛒' },
];
const DEFAULT_CATEGORY = 'otros';
const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));

// Productos habituales precargados la primera vez que se abre la app (editable luego desde el catálogo).
const DEFAULT_CATALOG = [
  { name: 'Lagrimitas de pollo al limón', category: 'carniceria_polleria', price: 3.61 },
  { name: 'Filetes pechuga de pollo', category: 'carniceria_polleria', price: 4.18 },
  { name: 'Tiras de pechuga pollo (ensaladas)', category: 'carniceria_polleria', price: 2.25 },
  { name: 'Tiras de pollo naranja', category: 'carniceria_polleria', price: 2.52 },
  { name: 'Aceite de oliva virgen extra (tapón negro)', category: 'despensa', price: 4.70 },
  { name: 'Sal', category: 'despensa', price: 0.70 },
  { name: 'Tomate frito', category: 'despensa', price: 1.40 },
  { name: 'Aceitunas', category: 'despensa', price: 3.00 },
  { name: 'Pipas', category: 'despensa', price: 1.10 },
  { name: 'Cacahuete', category: 'despensa', price: 1.30 },
  { name: 'Kikos', category: 'despensa', price: 1.00 },
  { name: 'Pipas calabaza', category: 'despensa', price: 1.55 },
  { name: 'Patatas fritas', category: 'despensa', price: 1.80 },
  { name: 'Arroz SOS', category: 'despensa', price: 1.88 },
  { name: 'Garbanzo', category: 'despensa', price: 0.80 },
  { name: 'Fideos', category: 'despensa', price: 0.80 },
  { name: 'Anchoas', category: 'despensa', price: 2.80 },
  { name: 'Zumo limón', category: 'bebidas', price: 1.40 },
  { name: 'Zumo naranja', category: 'bebidas', price: 5.95 },
  { name: 'Salmón ahumado', category: 'nevera', price: 10.80 },
  { name: 'Empanada pollo', category: 'precocinados', price: 3.85 },
  { name: 'Tronquitos', category: 'pescado', price: 2.25 },
  { name: 'Pan mama', category: 'panes', price: 1.15 },
  { name: 'Pan desayuno', category: 'panes', price: 1.04 },
  { name: 'Ensaladilla rusa', category: 'nevera', price: 3.50 },
  { name: 'Poke', category: 'nevera', price: 5.50 },
  { name: 'Mac and cheese', category: 'precocinados', price: 2.45 },
  { name: 'Yogures', category: 'lacteos', price: 1.40 },
];

let items = DB.getItems();
let templates = DB.getTemplates();
let catalog = DB.getCatalog();
if (catalog.length === 0) {
  catalog = DEFAULT_CATALOG.map((p) => ({ id: DB.uid(), ...p }));
  DB.setCatalog(catalog);
}

// --- DOM refs ---
const categoriesContainer = document.getElementById('categoriesContainer');
// categoryId -> <ul> element, built once so typing in other sections isn't disturbed on re-render
const categoryListEls = new Map();
// categoryId -> contenedor de chips del catálogo para ese pasillo
const categoryChipsEls = new Map();
const totalBar = document.getElementById('totalBar');
const totalAmount = document.getElementById('totalAmount');
const menuBtn = document.getElementById('menuBtn');
const menuPanel = document.getElementById('menuPanel');
const manageCatalogBtn = document.getElementById('manageCatalogBtn');
const saveTemplateBtn = document.getElementById('saveTemplateBtn');
const loadTemplateBtn = document.getElementById('loadTemplateBtn');
const clearCheckedBtn = document.getElementById('clearCheckedBtn');
const clearAllBtn = document.getElementById('clearAllBtn');
const templatesModal = document.getElementById('templatesModal');
const templatesList = document.getElementById('templatesList');
const closeTemplatesBtn = document.getElementById('closeTemplatesBtn');
const catalogModal = document.getElementById('catalogModal');
const catalogList = document.getElementById('catalogList');
const catalogForm = document.getElementById('catalogForm');
const catalogNameInput = document.getElementById('catalogNameInput');
const catalogCategorySelect = document.getElementById('catalogCategorySelect');
const catalogPriceInput = document.getElementById('catalogPriceInput');
const closeCatalogBtn = document.getElementById('closeCatalogBtn');
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
function persistCatalog() { DB.setCatalog(catalog); }

// Quita acentos para que "polleria" encuentre "Pollería".
function normalize(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function formatPrice(price) {
  return price.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

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

    const chips = document.createElement('div');
    chips.className = 'catalog-chips hidden';

    const ul = document.createElement('ul');
    ul.className = 'item-list';

    const form = document.createElement('form');
    form.className = 'category-add-form';
    form.autocomplete = 'off';

    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'input-wrapper';

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = `Añadir a ${cat.label.toLowerCase()}...`;
    input.setAttribute('aria-label', `Añadir producto a ${cat.label}`);

    const suggestions = document.createElement('div');
    suggestions.className = 'suggestions hidden';

    let selectedPrice = null;

    function hideSuggestions() {
      suggestions.classList.add('hidden');
      suggestions.textContent = '';
    }

    function showSuggestions(query) {
      const matches = searchCatalog(cat.id, query);
      suggestions.textContent = '';
      if (matches.length === 0) {
        hideSuggestions();
        return;
      }
      for (const entry of matches) {
        const row = document.createElement('button');
        row.type = 'button';
        row.className = 'suggestion-item';
        const name = document.createElement('span');
        name.textContent = entry.name;
        row.appendChild(name);
        if (typeof entry.price === 'number') {
          const price = document.createElement('span');
          price.className = 'suggestion-price';
          price.textContent = formatPrice(entry.price);
          row.appendChild(price);
        }
        row.addEventListener('mousedown', (e) => e.preventDefault()); // evita perder el foco antes del click
        row.addEventListener('click', () => {
          addItem(entry.name, cat.id, entry.price);
          input.value = '';
          hideSuggestions();
          input.focus();
        });
        suggestions.appendChild(row);
      }
      suggestions.classList.remove('hidden');
    }

    input.addEventListener('input', () => {
      selectedPrice = null;
      const query = input.value.trim();
      if (query) showSuggestions(query); else hideSuggestions();
    });
    input.addEventListener('blur', () => setTimeout(hideSuggestions, 150));

    inputWrapper.append(input, suggestions);

    const addBtn = document.createElement('button');
    addBtn.type = 'submit';
    addBtn.className = 'icon-btn primary';
    addBtn.title = 'Añadir';
    addBtn.textContent = '➕';

    form.append(inputWrapper, addBtn);
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      addItem(input.value, cat.id, selectedPrice);
      input.value = '';
      selectedPrice = null;
      hideSuggestions();
      input.focus();
    });

    section.append(title, chips, ul, form);
    categoriesContainer.appendChild(section);
    categoryListEls.set(cat.id, ul);
    categoryChipsEls.set(cat.id, chips);
  }
}

// Pinta, para cada pasillo, todos los productos del catálogo como botones de añadir rápido.
function renderCatalogChips() {
  for (const cat of CATEGORIES) {
    const container = categoryChipsEls.get(cat.id);
    container.textContent = '';
    const entries = catalog
      .filter((entry) => entry.category === cat.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
    container.classList.toggle('hidden', entries.length === 0);
    for (const entry of entries) {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'catalog-chip';
      const name = document.createElement('span');
      name.textContent = entry.name;
      chip.appendChild(name);
      if (typeof entry.price === 'number') {
        const price = document.createElement('span');
        price.className = 'chip-price';
        price.textContent = formatPrice(entry.price);
        chip.appendChild(price);
      }
      chip.addEventListener('click', () => addItem(entry.name, cat.id, entry.price));
      container.appendChild(chip);
    }
  }
}

function searchCatalog(categoryId, query) {
  const q = normalize(query);
  return catalog
    .filter((entry) => entry.category === categoryId && normalize(entry.name).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
    .slice(0, 6);
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
  renderTotal();
}

function renderTotal() {
  const pricedItems = items.filter((it) => typeof it.price === 'number');
  totalBar.classList.toggle('hidden', items.length === 0);
  const total = pricedItems.reduce((sum, it) => sum + it.price, 0);
  totalAmount.textContent = formatPrice(total);
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

  if (typeof item.price === 'number') {
    const price = document.createElement('span');
    price.className = 'item-price';
    price.textContent = formatPrice(item.price);
    name.appendChild(document.createTextNode(' · '));
    name.appendChild(price);
  }

  const del = document.createElement('button');
  del.type = 'button';
  del.className = 'item-delete';
  del.title = 'Eliminar';
  del.textContent = '✖';
  del.addEventListener('click', () => deleteItem(item.id));

  li.append(checkbox, name, del);
  return li;
}

function addItem(name, category, price) {
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
    price: typeof price === 'number' ? price : null,
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

// --- Catálogo de productos habituales (nombre + sección + precio) ---
function populateCatalogCategorySelect() {
  catalogCategorySelect.textContent = '';
  for (const cat of CATEGORIES) {
    const opt = document.createElement('option');
    opt.value = cat.id;
    opt.textContent = `${cat.emoji} ${cat.label}`;
    catalogCategorySelect.appendChild(opt);
  }
}

function addCatalogEntry(name, category, price) {
  const trimmed = name.trim();
  if (!trimmed) return;
  catalog.push({
    id: DB.uid(),
    name: trimmed,
    category,
    price: typeof price === 'number' && !Number.isNaN(price) ? price : null,
  });
  persistCatalog();
  renderCatalogList();
  renderCatalogChips();
}

function deleteCatalogEntry(id) {
  catalog = catalog.filter((entry) => entry.id !== id);
  persistCatalog();
  renderCatalogList();
  renderCatalogChips();
}

function renderCatalogList() {
  catalogList.textContent = '';
  if (catalog.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'template-empty';
    empty.textContent = 'Todavía no has añadido productos habituales.';
    catalogList.appendChild(empty);
    return;
  }
  const sorted = [...catalog].sort((a, b) => a.name.localeCompare(b.name, 'es'));
  for (const entry of sorted) {
    const cat = categoryById.get(entry.category);
    const row = document.createElement('div');
    row.className = 'template-row';

    const label = document.createElement('span');
    const priceText = typeof entry.price === 'number' ? ` · ${formatPrice(entry.price)}` : '';
    label.textContent = `${cat ? cat.emoji : '🛒'} ${entry.name}${priceText}`;

    const delBtn = document.createElement('button');
    delBtn.className = 'template-delete';
    delBtn.textContent = 'Eliminar';
    delBtn.addEventListener('click', () => deleteCatalogEntry(entry.id));

    row.append(label, delBtn);
    catalogList.appendChild(row);
  }
}

function openCatalogModal() {
  renderCatalogList();
  catalogModal.classList.remove('hidden');
}
function closeCatalogModal() {
  catalogModal.classList.add('hidden');
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
manageCatalogBtn.addEventListener('click', () => { toggleMenu(true); openCatalogModal(); });
saveTemplateBtn.addEventListener('click', () => { toggleMenu(true); saveTemplate(); });
loadTemplateBtn.addEventListener('click', () => { toggleMenu(true); openTemplatesModal(); });
clearCheckedBtn.addEventListener('click', () => { toggleMenu(true); clearChecked(); });
clearAllBtn.addEventListener('click', () => { toggleMenu(true); clearAll(); });
closeTemplatesBtn.addEventListener('click', closeTemplatesModal);
templatesModal.addEventListener('click', (e) => {
  if (e.target === templatesModal) closeTemplatesModal();
});
closeCatalogBtn.addEventListener('click', closeCatalogModal);
catalogModal.addEventListener('click', (e) => {
  if (e.target === catalogModal) closeCatalogModal();
});
catalogForm.addEventListener('submit', (e) => {
  e.preventDefault();
  addCatalogEntry(catalogNameInput.value, catalogCategorySelect.value, parseFloat(catalogPriceInput.value));
  catalogNameInput.value = '';
  catalogPriceInput.value = '';
  catalogNameInput.focus();
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
populateCatalogCategorySelect();
buildCategorySections();
renderCatalogChips();
render();
