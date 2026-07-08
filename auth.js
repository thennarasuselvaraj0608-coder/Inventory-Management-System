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
