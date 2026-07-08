const PURCHASE_KEY = "stockyard_purchases";

function getPurchases() {
  return JSON.parse(localStorage.getItem(PURCHASE_KEY) || "[]");
}
function recordPurchase({ supplierId, items }) {
  // items: [{ sku, qty, unitCost }]
  const order = {
    id: "PO-" + Date.now(),
    date: new Date().toISOString(),
    supplierId,
    items,
    total: items.reduce((sum, i) => sum + i.qty * i.unitCost, 0)
  };
  const purchases = getPurchases();
  purchases.push(order);
  localStorage.setItem(PURCHASE_KEY, JSON.stringify(purchases));

  items.forEach(i => adjustStock(i.sku, i.qty, "purchase:" + order.id)); // auto stock update

  const suppliers = getSuppliers();
  const s = suppliers.find(s => s.id === supplierId);
  if (s) { s.history.push(order.id); saveSuppliers(suppliers); }

  return order;
}
