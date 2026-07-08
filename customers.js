const CUSTOMER_KEY = "stockyard_customers";

function getCustomers() {
  return JSON.parse(localStorage.getItem(CUSTOMER_KEY) || "[]");
}
function saveCustomers(list) {
  localStorage.setItem(CUSTOMER_KEY, JSON.stringify(list));
}
function addCustomer({ name, phone, email }) {
  const list = getCustomers();
  list.push({ id: "CUS-" + Date.now(), name, phone, email, purchases: [] });
  saveCustomers(list);
}
function customerPurchaseHistory(id) {
  return getCustomers().find(c => c.id === id)?.purchases || [];
}
