const SALES_KEY = "stockyard_sales";

function getSales() {
  return JSON.parse(localStorage.getItem(SALES_KEY) || "[]");
}
function recordSale({ customerId, items }) {
  // items: [{ sku, qty, unitPrice }]
  const invoice = {
    id: "INV-" + Date.now(),
    date: new Date().toISOString(),
    customerId,
    items,
    total: items.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)
  };
  const sales = getSales();
  sales.push(invoice);
  localStorage.setItem(SALES_KEY, JSON.stringify(sales));

  items.forEach(i => adjustStock(i.sku, -i.qty, "sale:" + invoice.id)); // auto stock deduction

  if (customerId) {
    const customers = getCustomers();
    const c = customers.find(c => c.id === customerId);
    if (c) { c.purchases.push(invoice.id); saveCustomers(customers); }
  }
  return invoice;
}
