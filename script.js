// ---------- in-memory data store ----------
// Note: this demo keeps everything in memory for the session only.
let items = [
  { id: cryptoId(), name: "Hex bolt M6x20", sku: "HW-0142", category: "Hardware", qty: 480, reorder: 100, cost: 3.50 },
  { id: cryptoId(), name: "Cardboard box (M)", sku: "PK-0031", category: "Packaging", qty: 60, reorder: 150, cost: 12.00 },
  { id: cryptoId(), name: "Nitrile gloves (box)", sku: "SF-0207", category: "Safety", qty: 24, reorder: 30, cost: 210.00 },
  { id: cryptoId(), name: "USB-C cable 1m", sku: "EL-0088", category: "Electronics", qty: 310, reorder: 80, cost: 95.00 },
  { id: cryptoId(), name: "Stretch wrap roll", sku: "PK-0045", category: "Packaging", qty: 18, reorder: 20, cost: 340.00 },
  { id: cryptoId(), name: "Safety helmet", sku: "SF-0112", category: "Safety", qty: 42, reorder: 15, cost: 480.00 },
  { id: cryptoId(), name: "Pallet jack wheel", sku: "HW-0303", category: "Hardware", qty: 9, reorder: 12, cost: 650.00 },
];

function cryptoId(){
  return 'id-' + Math.random().toString(36).slice(2, 10);
}

// ---------- element refs ----------
const gridView   = document.getElementById('gridView');
const tableView  = document.getElementById('tableView');
const ledgerBody = document.getElementById('ledgerBody');
const emptyState = document.getElementById('emptyState');

const searchInput    = document.getElementById('searchInput');
const categoryFilter  = document.getElementById('categoryFilter');
const sortSelect      = document.getElementById('sortSelect');
const categoryList    = document.getElementById('categoryList');

const gridViewBtn  = document.getElementById('gridViewBtn');
const tableViewBtn = document.getElementById('tableViewBtn');

const modalBackdrop = document.getElementById('modalBackdrop');
const modalTitle     = document.getElementById('modalTitle');
const itemForm       = document.getElementById('itemForm');
const formError       = document.getElementById('formError');
const submitBtn       = document.getElementById('submitBtn');

const fieldId       = document.getElementById('itemId');
const fieldName     = document.getElementById('fieldName');
const fieldSku      = document.getElementById('fieldSku');
const fieldCategory = document.getElementById('fieldCategory');
const fieldQty      = document.getElementById('fieldQty');
const fieldReorder  = document.getElementById('fieldReorder');
const fieldCost     = document.getElementById('fieldCost');

const deleteBackdrop   = document.getElementById('deleteBackdrop');
const deleteItemName    = document.getElementById('deleteItemName');
const confirmDeleteBtn  = document.getElementById('confirmDeleteBtn');

const toast = document.getElementById('toast');

let currentView = 'grid';
let pendingDeleteId = null;

// ---------- helpers ----------
function formatMoney(n){
  return '₹' + Number(n).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 });
}

function showToast(msg){
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove('show'), 2200);
}

function getCategories(){
  return [...new Set(items.map(i => i.category))].sort();
}

function refreshCategoryOptions(){
  const cats = getCategories();
  const currentFilter = categoryFilter.value;

  categoryFilter.innerHTML = '<option value="">All categories</option>' +
    cats.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  categoryFilter.value = cats.includes(currentFilter) ? currentFilter : '';

  categoryList.innerHTML = cats.map(c => `<option value="${escapeHtml(c)}">`).join('');
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ---------- filtering / sorting ----------
function getVisibleItems(){
  const q = searchInput.value.trim().toLowerCase();
  const cat = categoryFilter.value;
  const sort = sortSelect.value;

  let list = items.filter(i => {
    const matchesQuery = !q || i.name.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q);
    const matchesCat = !cat || i.category === cat;
    return matchesQuery && matchesCat;
  });

  list.sort((a, b) => {
    switch(sort){
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'qty-asc':   return a.qty - b.qty;
      case 'qty-desc':  return b.qty - a.qty;
      case 'value-desc':return (b.qty*b.cost) - (a.qty*a.cost);
      default:          return a.name.localeCompare(b.name); // name-asc
    }
  });

  return list;
}

// ---------- rendering ----------
function render(){
  refreshCategoryOptions();
  renderStats();

  const visible = getVisibleItems();
  emptyState.hidden = visible.length !== 0;
  gridView.hidden = currentView !== 'grid' || visible.length === 0;
  tableView.hidden = currentView !== 'table' || visible.length === 0;

  if (currentView === 'grid'){
    renderGrid(visible);
  } else {
    renderTable(visible);
  }
}

function renderStats(){
  const totalItems = items.length;
  const totalUnits = items.reduce((sum, i) => sum + i.qty, 0);
  const totalValue = items.reduce((sum, i) => sum + i.qty * i.cost, 0);
  const lowStock = items.filter(i => i.qty <= i.reorder).length;

  document.getElementById('statTotalItems').textContent = totalItems;
  document.getElementById('statTotalUnits').textContent = totalUnits.toLocaleString('en-IN');
  document.getElementById('statTotalValue').textContent = formatMoney(totalValue);
  document.getElementById('statLowStock').textContent = lowStock;
}

function renderGrid(list){
  gridView.innerHTML = list.map(i => {
    const low = i.qty <= i.reorder;
    const value = i.qty * i.cost;
    return `
      <article class="bin-tag ${low ? 'low' : ''}">
        <div class="tag-top">
          <div>
            <div class="tag-sku">${escapeHtml(i.sku)}</div>
            <div class="tag-name">${escapeHtml(i.name)}</div>
            <div class="tag-category">${escapeHtml(i.category)}</div>
          </div>
          <span class="tag-status ${low ? 'status-low' : 'status-ok'}">${low ? 'Reorder' : 'In stock'}</span>
        </div>
        <div class="tag-metrics">
          <div>
            <span class="metric-label">Qty on hand</span>
            <span class="metric-value">${i.qty}</span>
          </div>
          <div>
            <span class="metric-label">Reorder at</span>
            <span class="metric-value">${i.reorder}</span>
          </div>
          <div>
            <span class="metric-label">Unit cost</span>
            <span class="metric-value">${formatMoney(i.cost)}</span>
          </div>
          <div>
            <span class="metric-label">Total value</span>
            <span class="metric-value">${formatMoney(value)}</span>
          </div>
        </div>
        <div class="tag-actions">
          <button class="icon-btn" data-edit="${i.id}">Edit</button>
          <button class="icon-btn danger" data-delete="${i.id}">Remove</button>
        </div>
      </article>
    `;
  }).join('');
}

function renderTable(list){
  ledgerBody.innerHTML = list.map(i => {
    const low = i.qty <= i.reorder;
    const value = i.qty * i.cost;
    return `
      <tr>
        <td class="sku">${escapeHtml(i.sku)}</td>
        <td class="name">${escapeHtml(i.name)}</td>
        <td>${escapeHtml(i.category)}</td>
        <td>${i.qty}</td>
        <td>${i.reorder}</td>
        <td>${formatMoney(i.cost)}</td>
        <td>${formatMoney(value)}</td>
        <td><span class="tag-status ${low ? 'status-low' : 'status-ok'}">${low ? 'Reorder' : 'In stock'}</span></td>
        <td>
          <div class="row-actions">
            <button class="icon-btn" data-edit="${i.id}">Edit</button>
            <button class="icon-btn danger" data-delete="${i.id}">Remove</button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

// ---------- event delegation for edit/delete ----------
function handleActionClick(e){
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.delete;
  if (editId) openEditModal(editId);
  if (delId) openDeleteModal(delId);
}
gridView.addEventListener('click', handleActionClick);
ledgerBody.addEventListener('click', handleActionClick);

// ---------- view toggle ----------
function setView(view){
  currentView = view;
  gridViewBtn.classList.toggle('active', view === 'grid');
  tableViewBtn.classList.toggle('active', view === 'table');
  render();
}
gridViewBtn.addEventListener('click', () => setView('grid'));
tableViewBtn.addEventListener('click', () => setView('table'));

// ---------- filters ----------
searchInput.addEventListener('input', render);
categoryFilter.addEventListener('change', render);
sortSelect.addEventListener('change', render);

// ---------- add / edit modal ----------
document.getElementById('openAddBtn').addEventListener('click', () => openAddModal());
document.getElementById('closeModalBtn').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', (e) => { if (e.target === modalBackdrop) closeModal(); });

function openAddModal(){
  modalTitle.textContent = 'Add item';
  submitBtn.textContent = 'Add to shelf';
  itemForm.reset();
  fieldId.value = '';
  formError.hidden = true;
  modalBackdrop.hidden = false;
  fieldName.focus();
}

function openEditModal(id){
  const item = items.find(i => i.id === id);
  if (!item) return;
  modalTitle.textContent = 'Edit item';
  submitBtn.textContent = 'Save changes';
  fieldId.value = item.id;
  fieldName.value = item.name;
  fieldSku.value = item.sku;
  fieldCategory.value = item.category;
  fieldQty.value = item.qty;
  fieldReorder.value = item.reorder;
  fieldCost.value = item.cost;
  formError.hidden = true;
  modalBackdrop.hidden = false;
  fieldName.focus();
}

function closeModal(){
  modalBackdrop.hidden = true;
}

itemForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const name = fieldName.value.trim();
  const sku = fieldSku.value.trim();
  const category = fieldCategory.value.trim();
  const qty = Number(fieldQty.value);
  const reorder = Number(fieldReorder.value);
  const cost = Number(fieldCost.value);
  const id = fieldId.value;

  if (!name || !sku || !category){
    formError.textContent = 'Please fill in name, SKU and category.';
    formError.hidden = false;
    return;
  }
  if (qty < 0 || reorder < 0 || cost < 0){
    formError.textContent = 'Quantity, reorder threshold and cost cannot be negative.';
    formError.hidden = false;
    return;
  }
  const dupe = items.find(i => i.sku.toLowerCase() === sku.toLowerCase() && i.id !== id);
  if (dupe){
    formError.textContent = 'That SKU is already in use by another item.';
    formError.hidden = false;
    return;
  }

  if (id){
    const item = items.find(i => i.id === id);
    Object.assign(item, { name, sku, category, qty, reorder, cost });
    showToast(`Updated ${name}`);
  } else {
    items.push({ id: cryptoId(), name, sku, category, qty, reorder, cost });
    showToast(`Added ${name} to the shelf`);
  }

  closeModal();
  render();
});

// ---------- delete modal ----------
function openDeleteModal(id){
  const item = items.find(i => i.id === id);
  if (!item) return;
  pendingDeleteId = id;
  deleteItemName.textContent = item.name;
  deleteBackdrop.hidden = false;
}
document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
  deleteBackdrop.hidden = true;
  pendingDeleteId = null;
});
deleteBackdrop.addEventListener('click', (e) => {
  if (e.target === deleteBackdrop){ deleteBackdrop.hidden = true; pendingDeleteId = null; }
});
confirmDeleteBtn.addEventListener('click', () => {
  if (!pendingDeleteId) return;
  const item = items.find(i => i.id === pendingDeleteId);
  items = items.filter(i => i.id !== pendingDeleteId);
  deleteBackdrop.hidden = true;
  showToast(`Removed ${item ? item.name : 'item'}`);
  pendingDeleteId = null;
  render();
});

// keyboard: escape closes any open modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape'){
    if (!modalBackdrop.hidden) closeModal();
    if (!deleteBackdrop.hidden){ deleteBackdrop.hidden = true; pendingDeleteId = null; }
  }
});

// ---------- init ----------
render();
