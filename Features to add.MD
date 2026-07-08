# StockYard — Full Feature Set to Add

Your repo (`Inventory-Management-System`) currently runs on plain **HTML + CSS + JavaScript**, hosted on GitHub Pages. Since GitHub Pages can't run PHP/MySQL, everything below is built using **`localStorage`** as the database — no backend needed, but structured so a real DB (MySQL/Firebase) can swap in later with minimal changes.

Add these as new files in your repo: `auth.js`, `suppliers.js`, `customers.js`, `purchases.js`, `sales.js`, `reports.js`, `notifications.js`, `barcode.js`, `backup.js` — then `<script src="...">` them in `index.html` after `script.js`.

---

## 1. User Login & Authentication (`auth.js`)

```javascript
const AUTH_KEY = "stockyard_users";
const SESSION_KEY = "stockyard_session";

function seedUsers() {
  if (!localStorage.getItem(AUTH_KEY)) {
    const users = [
      { username: "admin", password: hash("admin123"), role: "admin" },
      { username: "staff", password: hash("staff123"), role: "staff" }
    ];
    localStorage.setItem(AUTH_KEY, JSON.stringify(users));
  }
}

// simple hash so plaintext passwords aren't stored (not crypto-secure, fine for a static demo)
function hash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return h.toString();
}

function login(username, password) {
  const users = JSON.parse(localStorage.getItem(AUTH_KEY) || "[]");
  const user = users.find(u => u.username === username && u.password === hash(password));
  if (!user) return { ok: false, message: "Invalid username or password" };
  localStorage.setItem(SESSION_KEY, JSON.stringify({ username: user.username, role: user.role }));
  return { ok: true, role: user.role };
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
  window.location.href = "login.html";
}

function currentUser() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
}

function requireLogin() {
  if (!currentUser()) window.location.href = "login.html";
}

function requireRole(role) {
  const u = currentUser();
  if (!u || u.role !== role) alert("Access denied: " + role + " only");
}

seedUsers();
```

**login.html** (new page):
```html
<form id="loginForm">
  <input id="username" placeholder="Username" required />
  <input id="password" type="password" placeholder="Password" required />
  <button type="submit">Login</button>
</form>
<script src="auth.js"></script>
<script>
  document.getElementById("loginForm").addEventListener("submit", e => {
    e.preventDefault();
    const res = login(username.value, password.value);
    if (res.ok) window.location.href = "index.html";
    else alert(res.message);
  });
</script>
```
Call `requireLogin()` at the top of your main dashboard script, and `requireRole("admin")` before rendering Add/Edit/Remove buttons for staff-restricted actions.

---

## 2. Product Management (extends existing `script.js`)
You already have Add/Edit/Remove/Search/Categorize working in StockYard. Just make sure each product object has this shape so later modules (sales, purchases, barcode) can reference it:

```javascript
{
  sku: "PK-0031",
  name: "Cardboard box (M)",
  category: "PACKAGING",
  qty: 60,
  reorderAt: 150,
  unitCost: 12.00,
  barcode: "8901234567890" // add this field
}
```

---

## 3. Stock Management

```javascript
function adjustStock(sku, delta, reason = "manual") {
  const products = getProducts(); // your existing getter
  const p = products.find(p => p.sku === sku);
  if (!p) return;
  p.qty += delta;
  saveProducts(products);
  logMovement(sku, delta, reason); // see Inventory Tracking below
  checkLowStock(p);
}
```
"Automatic stock updates after sales" is handled inside `recordSale()` in section 7, and "after purchases" inside `recordPurchase()` in section 6 — both call `adjustStock()`.

---

## 4. Supplier Management (`suppliers.js`)

```javascript
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
```

---

## 5. Customer Management (`customers.js`)

```javascript
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
```

---

## 6. Purchase Management (`purchases.js`)

```javascript
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
```

---

## 7. Sales Management (`sales.js`)

```javascript
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
```

---

## 8. Inventory Tracking (movement log, in `script.js`)

```javascript
const MOVEMENT_KEY = "stockyard_movements";

function logMovement(sku, delta, reason) {
  const log = JSON.parse(localStorage.getItem(MOVEMENT_KEY) || "[]");
  log.push({ sku, delta, reason, date: new Date().toISOString() });
  localStorage.setItem(MOVEMENT_KEY, JSON.stringify(log));
}
function movementHistory(sku) {
  return JSON.parse(localStorage.getItem(MOVEMENT_KEY) || "[]").filter(m => m.sku === sku);
}
```
This is exactly what your "LEDGER" tab in the screenshot should render — pull from `MOVEMENT_KEY` and list rows per SKU.

---

## 9. Barcode Support (`barcode.js`)
Use the free **JsBarcode** and **html5-qrcode** libraries via CDN — no install needed.

```html
<script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>
<script src="https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js"></script>
```

```javascript
function renderBarcode(sku, elementId) {
  JsBarcode("#" + elementId, sku, { format: "CODE128", width: 2, height: 50 });
}

function startScanner(onScan) {
  const scanner = new Html5Qrcode("scanner-region");
  scanner.start({ facingMode: "environment" }, { fps: 10, qrbox: 250 },
    decodedText => { onScan(decodedText); scanner.stop(); }
  );
}
// usage: startScanner(sku => { const p = getProducts().find(p => p.sku === sku || p.barcode === sku); showProductCard(p); });
```

---

## 10. Reports (`reports.js`)

```javascript
function reportByDateRange(records, from, to) {
  return records.filter(r => new Date(r.date) >= new Date(from) && new Date(r.date) <= new Date(to));
}

function dailySalesReport(date = new Date().toISOString().slice(0,10)) {
  return getSales().filter(s => s.date.startsWith(date));
}
function monthlySalesReport(yearMonth) { // e.g. "2026-07"
  return getSales().filter(s => s.date.startsWith(yearMonth));
}
function purchaseReport(from, to) {
  return reportByDateRange(getPurchases(), from, to);
}
function stockReport() {
  return getProducts().map(p => ({
    sku: p.sku, name: p.name, qty: p.qty, value: p.qty * p.unitCost
  }));
}
function profitLossReport(from, to) {
  const sales = reportByDateRange(getSales(), from, to);
  const revenue = sales.reduce((s, inv) => s + inv.total, 0);
  const cogs = sales.reduce((sum, inv) => sum + inv.items.reduce((s, i) => {
    const product = getProducts().find(p => p.sku === i.sku);
    return s + (product ? product.unitCost * i.qty : 0);
  }, 0), 0);
  return { revenue, cogs, profit: revenue - cogs };
}
```

---

## 11. Notifications (`notifications.js`)

```javascript
function checkLowStock(product) {
  if (product.qty <= product.reorderAt) {
    pushNotification(`Low stock: ${product.name} (${product.qty} left)`, "low-stock");
  }
  if (product.qty === 0) {
    pushNotification(`Out of stock: ${product.name}`, "out-of-stock");
  }
}

const NOTIF_KEY = "stockyard_notifications";
function pushNotification(message, type) {
  const list = JSON.parse(localStorage.getItem(NOTIF_KEY) || "[]");
  list.unshift({ message, type, date: new Date().toISOString(), read: false });
  localStorage.setItem(NOTIF_KEY, JSON.stringify(list));
  renderNotificationBadge();
}
function checkExpiry(product) {
  if (!product.expiryDate) return;
  const daysLeft = (new Date(product.expiryDate) - new Date()) / 86400000;
  if (daysLeft <= 7) pushNotification(`${product.name} expires in ${Math.ceil(daysLeft)} days`, "expiry");
}
```
Add an `expiryDate` field to products that need it (food/medicine categories).

---

## 12. Search & Filter (extends existing search bar)

```javascript
function searchProducts({ text = "", category = "All categories", supplierId = null }) {
  return getProducts().filter(p =>
    (text === "" || p.name.toLowerCase().includes(text.toLowerCase()) || p.sku.toLowerCase().includes(text.toLowerCase())) &&
    (category === "All categories" || p.category === category) &&
    (!supplierId || p.supplierId === supplierId)
  );
}
```
Wire this to your existing search input + category dropdown — you already have the UI for it in the screenshot, just call this function on `input`/`change` events.

---

## 13. Backup & Restore (`backup.js`)

```javascript
function backupData() {
  const keys = ["stockyard_products","stockyard_suppliers","stockyard_customers",
                "stockyard_purchases","stockyard_sales","stockyard_movements","stockyard_notifications"];
  const dump = {};
  keys.forEach(k => dump[k] = localStorage.getItem(k));
  const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `stockyard-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
}

function restoreData(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const dump = JSON.parse(e.target.result);
    Object.entries(dump).forEach(([k, v]) => localStorage.setItem(k, v));
    alert("Restore complete. Reloading...");
    location.reload();
  };
  reader.readAsText(file);
}
```

---

## 14. Dashboard (extends your existing stat cards)

```javascript
function dashboardStats() {
  const products = getProducts();
  return {
    totalProducts: products.length,
    totalSales: getSales().reduce((s, i) => s + i.total, 0),
    totalPurchases: getPurchases().reduce((s, i) => s + i.total, 0),
    lowStockItems: products.filter(p => p.qty <= p.reorderAt).length,
    revenue: profitLossReport("2000-01-01", new Date().toISOString()).revenue
  };
}
```
Your screenshot already has 4 stat cards (ON SHELF, UNITS, VALUE, REORDER) — just add a 5th row or swap in these numbers for a "Sales & Revenue" section.

---

## 15. Invoice Generation
Use **jsPDF** (CDN, no install):
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
```

```javascript
function generateInvoicePDF(invoice, gstRate = 0) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  doc.setFontSize(16); doc.text("StockYard Invoice", 14, 20);
  doc.setFontSize(10); doc.text("Invoice #: " + invoice.id, 14, 30);
  doc.text("Date: " + invoice.date.slice(0,10), 14, 36);

  let y = 50;
  invoice.items.forEach(i => {
    doc.text(`${i.sku}  x${i.qty}  @ ₹${i.unitPrice}  = ₹${(i.qty*i.unitPrice).toFixed(2)}`, 14, y);
    y += 8;
  });

  const gst = invoice.total * (gstRate / 100);
  doc.text(`Subtotal: ₹${invoice.total.toFixed(2)}`, 14, y + 8);
  if (gstRate > 0) doc.text(`GST (${gstRate}%): ₹${gst.toFixed(2)}`, 14, y + 16);
  doc.setFontSize(12);
  doc.text(`Grand Total: ₹${(invoice.total + gst).toFixed(2)}`, 14, y + 28);

  doc.save(invoice.id + ".pdf");
}
```

---

## Suggested repo structure after adding all this

```
Inventory-Management-System/
│── index.html
│── login.html
│── style.css
│── script.js          (products, stock, search, dashboard)
│── auth.js
│── suppliers.js
│── customers.js
│── purchases.js
│── sales.js
│── reports.js
│── notifications.js
│── barcode.js
│── backup.js
```

## Rollout order (do it in this sequence, easiest first)
1. Search & Filter (2 already partly done) — quick win
2. Inventory Tracking / movement log — needed by everything else
3. Notifications (low stock/out of stock) — small, high value
4. Supplier + Customer Management
5. Purchase + Sales Management (these depend on #2-4)
6. Reports + Dashboard (depend on #5)
7. Backup & Restore — standalone, easy
8. Invoice Generation (PDF) — depends on Sales
9. Barcode support — nice-to-have, do last
10. Login & Authentication — wrap everything behind this last, once features work

This way un project la ella feature um step-by-step add pannalam without breaking existing working stuff.
