// auth.js — localStorage auth helpers for Route 360

// Keys used to store data in localStorage
const USERS_KEY = "route360_users";
const CURRENT_USER_KEY = "route360_currentUserId";

// Safely parse JSON from storage, or return a fallback value if parsing fails
function safeParse(json, fallback) {
  try { return JSON.parse(json) ?? fallback; }
  catch { return fallback; }
}

// Hash a string using SHA-256 (works on https:// or localhost)
async function hashString(str) {
  const enc = new TextEncoder().encode(str);           // convert to bytes
  const buf = await crypto.subtle.digest("SHA-256", enc); // hash bytes
  const bytes = Array.from(new Uint8Array(buf));      // hash buffer -> byte array
  return bytes.map(b => b.toString(16).padStart(2, "0")).join(""); // bytes -> hex string
}

// Read all users from localStorage (returns [] if none)
function getAllUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return safeParse(raw, []);
}

// Save full users array back to localStorage
function saveAllUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

// Store the currently signed-in user's id
function setCurrentUserId(id) {
  localStorage.setItem(CURRENT_USER_KEY, id);
}

// Get current signed-in user's id (or null)
function getCurrentUserId() {
  return localStorage.getItem(CURRENT_USER_KEY);
}

// Remove current user id (logout)
function clearCurrentUserId() {
  localStorage.removeItem(CURRENT_USER_KEY);
}

// Get the full current user object from storage
function getCurrentUser() {
  const id = getCurrentUserId();
  if (!id) return null;
  return getAllUsers().find(u => u.id === id) || null;
}

// Expose helpers globally so your HTML inline script can use them
window.hashString = hashString;
window.getAllUsers = getAllUsers;
window.saveAllUsers = saveAllUsers;
window.setCurrentUserId = setCurrentUserId;
window.getCurrentUserId = getCurrentUserId;
window.clearCurrentUserId = clearCurrentUserId;
window.getCurrentUser = getCurrentUser;
