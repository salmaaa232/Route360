// auth.js — localStorage auth helpers for Route 360

const USERS_KEY = "route360_users";
const CURRENT_USER_KEY = "route360_currentUserId";

function safeParse(json, fallback) {
  try { return JSON.parse(json) ?? fallback; }
  catch { return fallback; }
}

// SHA-256 hash (works on https:// or localhost)
async function hashString(str) {
  const enc = new TextEncoder().encode(str);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const bytes = Array.from(new Uint8Array(buf));
  return bytes.map(b => b.toString(16).padStart(2, "0")).join("");
}

function getAllUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return safeParse(raw, []);
}

function saveAllUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setCurrentUserId(id) {
  localStorage.setItem(CURRENT_USER_KEY, id);
}

function getCurrentUserId() {
  return localStorage.getItem(CURRENT_USER_KEY);
}

function clearCurrentUserId() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

function getCurrentUser() {
  const id = getCurrentUserId();
  if (!id) return null;
  return getAllUsers().find(u => u.id === id) || null;
}

// expose globally for your inline script
window.hashString = hashString;
window.getAllUsers = getAllUsers;
window.saveAllUsers = saveAllUsers;
window.setCurrentUserId = setCurrentUserId;
window.getCurrentUserId = getCurrentUserId;
window.clearCurrentUserId = clearCurrentUserId;
window.getCurrentUser = getCurrentUser;
