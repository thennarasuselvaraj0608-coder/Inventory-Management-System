const SUPPLIER_KEY = "stockyard_suppliers";

function getSuppliers() {
  return JSON.parse(localStorage.getItem(SUPPLIER_KEY) || "[]");
}
function saveSuppliers(list) {
  localStorage.setItem(SUPPLIER_KEY, JSON.stringify(list));
}
function addSupplier({ name, phone, email, address }) {
  const list = getSuppliers();
  list.push({ id: "SUP-" + Date.now(), name, phone, email, address, history: [] });
  saveSuppliers(list);
}
function editSupplier(id, updates) {
  const list = getSuppliers();
  const s = list.find(s => s.id === id);
  Object.assign(s, updates);
  saveSuppliers(list);
}
function deleteSupplier(id) {
  saveSuppliers(getSuppliers().filter(s => s.id !== id));
}
function supplierHistory(id) {
  return getSuppliers().find(s => s.id === id)?.history || [];
}
