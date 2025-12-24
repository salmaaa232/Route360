// trip.js — Trip details page:
// - guarded by auth
// - loads/saves trips per user in localStorage
// - tabs (overview / itinerary / map)
// - itinerary CRUD
// - locations UI + Photon autocomplete
// - Leaflet map with markers

// ---------------- AUTH GUARD ----------------
// Require a signed-in user; if missing, redirect to auth page.
const userId = getCurrentUserId();
if (!userId) {
  window.location.replace("/src/Auth page/auth.html");
  throw new Error("Not signed in");
}

// Per-user storage key so different users don't see each other's trips.
const KEY_TRIPS = `route360_trips_${userId}_v1`;

// ---------------- HELPERS ----------------
// Load trips array from localStorage (safe parse).
function loadTrips() {
  try {
    const raw = localStorage.getItem(KEY_TRIPS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Persist trips array to localStorage.
function saveTrips(trips) {
  localStorage.setItem(KEY_TRIPS, JSON.stringify(trips));
}

// Read trip id from URL like ?id=trip_123
function getTripIdFromUrl() {
  const p = new URLSearchParams(location.search);
  return p.get("id");
}

// Format a date string into a nice readable label.
function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Basic HTML escaping helper (useful if you ever inject strings as HTML).
function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// ---------------- LOAD TRIP ----------------
const tripId = getTripIdFromUrl();
let trips = loadTrips();
let trip = trips.find((t) => t.id === tripId);

// If the trip doesn't exist, bounce back to dashboard.
if (!trip) {
  // alert("Trip not found");
  window.location.replace("/src/Dashboard page/dashboard.html");
}

// ---------------- HEADER STUFF ----------------
// Back button uses browser history.
const backBtn = document.getElementById("backBtn");
if (backBtn) backBtn.onclick = () => history.back();

// Logout clears user session and returns to auth screen.
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.onclick = () => {
    clearCurrentUserId();
    window.location.replace("/src/Auth page/auth.html");
  };
}

// ---------------- FILL UI ----------------
// Populate hero cover image.
const heroImg = document.getElementById("heroImg");
if (heroImg) heroImg.src = trip.coverDataUrl || "";

// Populate title + date range in header.
const tripTitleEl = document.getElementById("tripTitle");
if (tripTitleEl) tripTitleEl.textContent = trip.title || "Untitled Trip";

const tripDatesEl = document.getElementById("tripDates");
if (tripDatesEl) {
  tripDatesEl.textContent = `${formatDate(trip.start)}${
    trip.start && trip.end ? " to " : ""
  }${formatDate(trip.end)}`;
}

// Overview tab summary fields.
const overviewDatesEl = document.getElementById("overviewDates");
if (overviewDatesEl) {
  overviewDatesEl.textContent = `Dates: ${formatDate(trip.start)} → ${formatDate(
    trip.end
  )}`;
}

const overviewDescEl = document.getElementById("overviewDesc");
if (overviewDescEl) {
  overviewDescEl.textContent = trip.desc ? trip.desc : "No description yet.";
}

// ---------------- INITIAL RENDERS ----------------
// Show saved locations right away on Overview + Map lists.
renderLocationLists();
// refreshMapMarkers(); intentionally not called here to avoid TDZ issues.

// ---------------- TABS ----------------
// Tab buttons and their matching content panes.
const tabs = Array.from(document.querySelectorAll(".tab"));
const views = {
  overview: document.getElementById("tab-overview"),
  itinerary: document.getElementById("tab-itinerary"),
  map: document.getElementById("tab-map"),
};
const rightMapPanel = document.getElementById("rightMapPanel");

// Switch visible pane and handle map resizing when needed.
function showTab(name) {
  tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === name));
  Object.entries(views).forEach(([k, el]) => {
    if (el) el.classList.toggle("hide", k !== name);
  });

  // Right-side map panel is hidden on itinerary view.
  if (rightMapPanel)
    rightMapPanel.style.display = name === "itinerary" ? "none" : "block";

  // Leaflet needs invalidateSize when its container becomes visible.
  if (name === "map") {
    setTimeout(() => {
      if (!mapReady) initLeafletMap();
      if (map) map.invalidateSize();
    }, 50);
  }
}

// Bind tab click handlers.
tabs.forEach((btn) =>
  btn.addEventListener("click", () => showTab(btn.dataset.tab))
);
showTab("overview");

// ---------------- ITINERARY RENDER ----------------
// Renders itinerary list with Edit/Delete and "+Loc" actions.
function renderItinerary() {
  const list = document.getElementById("itineraryList");
  if (!list) return;

  const items = trip.itinerary || trip.itineraries || [];
  if (!items.length) {
    list.textContent = "No itinerary yet.";
    return;
  }

  list.innerHTML = "";
  items.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "itinerary-item";

    // Left column: title + date/note/location.
    const left = document.createElement("div");
    const titleEl = document.createElement("strong");
    titleEl.textContent = it.title || it.name || "Day plan";
    left.appendChild(titleEl);

    if (it.date) {
      const dateSmall = document.createElement("small");
      dateSmall.textContent = formatDate(it.date);
      left.appendChild(dateSmall);
    }
    if (it.note) {
      const noteSmall = document.createElement("small");
      noteSmall.textContent = it.note;
      left.appendChild(noteSmall);
    }
    if (it.location) {
      const locSmall = document.createElement("small");
      locSmall.textContent = "Location: " + it.location;
      left.appendChild(locSmall);
    }

    // Right column: day label + actions.
    const right = document.createElement("div");
    right.className = "muted";
    right.style.display = "flex";
    right.style.flexDirection = "column";
    right.style.alignItems = "flex-end";

    const dayText = document.createElement("div");
    dayText.textContent = `Day ${it.day || idx + 1}`;
    right.appendChild(dayText);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    actions.style.marginTop = "6px";

    // Add location to this itinerary item.
    const addLocBtn = document.createElement("button");
    addLocBtn.className = "btn ghost";
    addLocBtn.textContent = "+Loc";
    addLocBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openLocModal("item", it.id);
    });

    // Edit itinerary item.
    const editBtn = document.createElement("button");
    editBtn.className = "btn ghost";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openItEdit(it.id);
    });

    // Delete itinerary item.
    const delBtn = document.createElement("button");
    delBtn.className = "btn";
    delBtn.textContent = "Delete";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteItItem(it.id);
    });

    actions.appendChild(addLocBtn);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    right.appendChild(actions);

    row.appendChild(left);
    row.appendChild(right);
    list.appendChild(row);
  });
}
renderItinerary();

// ---------------- TRIP-LEVEL LOCATIONS ----------------
// Shared "add location" modal and its state.
const locModal = document.getElementById("locModal");
const locSearchInput = document.getElementById("locSearchInput");
const locSuggestions = document.getElementById("locSuggestions");
const locCancelBtn = document.getElementById("locCancelBtn");

// Modal can target either the trip itself or a specific itinerary item.
let locTargetType = "trip";
let locTargetId = null;

// Open modal and reset search UI.
function openLocModal(type = "trip", id = null) {
  locTargetType = type;
  locTargetId = id;

  locModal.classList.remove("hide");
  locSearchInput.value = "";
  locSuggestions.classList.add("hide");
  locSuggestions.innerHTML = "";
  locSearchInput.focus();
}

function closeLocModal() {
  locModal.classList.add("hide");
}

if (locCancelBtn) locCancelBtn.addEventListener("click", closeLocModal);

// Any "add location" button opens modal for trip-level location.
["addLocationBtn", "overviewAddLoc", "mapAddLoc", "rightAddLoc"].forEach(
  (btnId) => {
    const el = document.getElementById(btnId);
    if (el) el.addEventListener("click", () => openLocModal("trip"));
  }
);

// ------- Photon autocomplete -------
// Debounce input so we don't hit API on every keystroke.
let debounceTimer = null;

locSearchInput.addEventListener("input", () => {
  const q = locSearchInput.value.trim();
  clearTimeout(debounceTimer);

  if (q.length < 3) {
    locSuggestions.classList.add("hide");
    locSuggestions.innerHTML = "";
    return;
  }

  debounceTimer = setTimeout(() => searchPhoton(q), 350);
});

// Query Photon API for place suggestions.
async function searchPhoton(query) {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
      query
    )}&limit=6`;
    const res = await fetch(url);
    const data = await res.json();
    renderPhotonSuggestions(data.features || []);
  } catch (err) {
    console.error("Photon search failed:", err);
    locSuggestions.classList.add("hide");
  }
}

// -------- Locations UI (chips with edit + delete) --------
// Small card for each location in lists.
function makeLocationChip(loc) {
  const row = document.createElement("div");
  row.className = "location-chip";

  const left = document.createElement("div");
  left.className = "location-chip__left";

  const name = document.createElement("div");
  name.className = "location-chip__name";
  name.textContent = loc.title || loc.location || "Place";

  const meta = document.createElement("div");
  meta.className = "location-chip__meta";
  meta.textContent = loc.location || "";

  left.appendChild(name);
  left.appendChild(meta);

  const actions = document.createElement("div");
  actions.className = "location-chip__actions";

  // Rename location.
  const editBtn = document.createElement("button");
  editBtn.className = "chip-action chip-action--edit";
  editBtn.textContent = "Edit";
  editBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    editTripLocation(loc.id);
  });

  // Remove location.
  const delBtn = document.createElement("button");
  delBtn.className = "chip-action chip-action--delete";
  delBtn.textContent = "Delete";
  delBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    deleteTripLocation(loc.id);
  });

  actions.appendChild(editBtn);
  actions.appendChild(delBtn);

  row.appendChild(left);
  row.appendChild(actions);

  // Clicking a chip pans map to it.
  row.addEventListener("click", () => {
    focusLocationOnMap(loc.id);
  });

  return row;
}

// Prompt-edit for trip locations.
function editTripLocation(locId) {
  const locs = trip.locations || [];
  const loc = locs.find((l) => l.id === locId);
  if (!loc) return;

  const newTitle = prompt("Edit place name", loc.title || loc.location || "");
  if (newTitle === null) return;

  loc.title = newTitle.trim() || loc.title;

  persistTrip();
  renderLocationLists();
  refreshMapMarkers();
}

// Delete a trip location and refresh UI/map.
function deleteTripLocation(locId) {
  if (!confirm("Delete this location?")) return;

  trip.locations = (trip.locations || []).filter((l) => l.id !== locId);

  persistTrip();
  renderLocationLists();
  refreshMapMarkers();
}

// Render location chips into Overview and Map side panels.
function renderLocationLists() {
  const locs = trip.locations || [];

  const overviewContainer = document.getElementById("overviewLocations");
  const mapContainer = document.getElementById("mapLocations");

  if (overviewContainer) {
    overviewContainer.innerHTML = "";
    locs.forEach((loc) => overviewContainer.appendChild(makeLocationChip(loc)));
  }

  if (mapContainer) {
    mapContainer.innerHTML = "";
    if (!locs.length) {
      mapContainer.textContent = "No places yet.";
    } else {
      locs.forEach((loc) => mapContainer.appendChild(makeLocationChip(loc)));
    }
  }
}

// Show Photon results under the input.
function renderPhotonSuggestions(features) {
  locSuggestions.innerHTML = "";

  if (!features.length) {
    locSuggestions.classList.add("hide");
    return;
  }

  features.forEach((f) => {
    const p = f.properties || {};
    const name = p.name || p.street || "Unnamed place";
    const city = p.city || p.state || "";
    const country = p.country || "";
    const label = [name, city, country].filter(Boolean).join(", ");

    const li = document.createElement("li");
    li.textContent = label;

    // Selecting a suggestion stores it with lat/lon.
    li.addEventListener("click", () => {
      const [lon, lat] = f.geometry.coordinates;
      onPlaceSelected({ label, lat, lon });
    });

    locSuggestions.appendChild(li);
  });

  locSuggestions.classList.remove("hide");
}

// When a place is chosen:
// - add to trip.locations, OR
// - attach to an itinerary item.
function onPlaceSelected(place) {
  const { label, lat, lon } = place;

  if (locTargetType === "trip") {
    trip.locations = trip.locations || [];
    trip.locations.push({
      id: "loc_" + Date.now(),
      location: label,
      title: label,
      lat,
      lng: lon,
    });
  } else if (locTargetType === "item") {
    const items = (trip.itinerary || []).concat(trip.locations || []);
    const it = items.find((x) => x.id === locTargetId);
    if (it) {
      it.location = label;
      it.lat = lat;
      it.lng = lon;
    }
  }

  persistTrip();
  renderItinerary();
  renderLocationLists();
  refreshMapMarkers();
  closeLocModal();
}

// ---------------- ITINERARY ADD / EDIT FORM ----------------
// Form elements for adding/editing itinerary items.
const itineraryAddBtn = document.getElementById("itineraryAddBtn");
const itineraryForm = document.getElementById("itineraryForm");
const itTitle = document.getElementById("itTitle");
const itDate = document.getElementById("itDate");
const itNote = document.getElementById("itNote");
const saveItBtn = document.getElementById("saveItBtn");
const cancelItBtn = document.getElementById("cancelItBtn");

let editingItId = null;

// Show form on "add" click.
if (itineraryAddBtn) {
  itineraryAddBtn.addEventListener("click", () => {
    if (itineraryForm) itineraryForm.classList.remove("hide");
    if (itTitle) itTitle.focus();
  });
}

// Cancel resets form state.
if (cancelItBtn) {
  cancelItBtn.addEventListener("click", () => {
    if (itineraryForm) itineraryForm.classList.add("hide");
    if (itTitle) itTitle.value = "";
    if (itDate) itDate.value = "";
    if (itNote) itNote.value = "";
    editingItId = null;
    if (saveItBtn) saveItBtn.textContent = "Add";
  });
}

// Convert a date to a "Day N" relative to trip.start.
function computeDayNumberFromDate(dateStr) {
  if (!trip.start || !dateStr) return null;
  const s = new Date(trip.start);
  s.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const diff = Math.round((d - s) / (1000 * 60 * 60 * 24));
  return diff + 1;
}

// Add new item or update existing one.
if (saveItBtn) {
  saveItBtn.addEventListener("click", () => {
    const title = (itTitle && itTitle.value.trim()) || "Activity";
    const date = (itDate && itDate.value) || "";
    const note = (itNote && itNote.value.trim()) || "";
    const dayNum = computeDayNumberFromDate(date);

    trip.itinerary = trip.itinerary || [];

    if (editingItId) {
      const idx = trip.itinerary.findIndex((i) => i.id === editingItId);
      if (idx !== -1) {
        trip.itinerary[idx] = {
          ...trip.itinerary[idx],
          title,
          date,
          note,
          day: dayNum || trip.itinerary[idx].day || idx + 1,
        };
      }
      editingItId = null;
      saveItBtn.textContent = "Add";
    } else {
      const item = { id: "it_" + Date.now(), title, date, note };
      if (dayNum) item.day = dayNum;
      trip.itinerary.push(item);
    }

    persistTrip();
    renderItinerary();
    refreshMapMarkers();

    if (itineraryForm) itineraryForm.classList.add("hide");
    if (itTitle) itTitle.value = "";
    if (itDate) itDate.value = "";
    if (itNote) itNote.value = "";
  });
}

// Load item into form for editing.
function openItEdit(id) {
  const items = (trip.itinerary || []).concat(trip.locations || []);
  const it = items.find((x) => x.id === id);
  if (!it) return alert("Itinerary item not found");

  editingItId = id;
  if (itTitle) itTitle.value = it.title || "";
  if (itDate) itDate.value = it.date || "";
  if (itNote) itNote.value = it.note || "";
  if (itineraryForm) itineraryForm.classList.remove("hide");
  if (saveItBtn) saveItBtn.textContent = "Update";
}

// Remove an itinerary item.
function deleteItItem(id) {
  if (!confirm("Delete this itinerary item?")) return;
  trip.itinerary = (trip.itinerary || []).filter((i) => i.id !== id);
  persistTrip();
  renderItinerary();
  refreshMapMarkers();
}

// Save only this trip back into stored trips list.
function persistTrip() {
  trips = loadTrips();
  const idx = trips.findIndex((t) => t.id === tripId);
  if (idx !== -1) {
    trips[idx] = trip;
    saveTrips(trips);
  }
}

// ---------------- TRIP EDIT / DELETE ----------------
// Simple prompt-based trip edit/delete actions.
const editTripBtn = document.getElementById("editTripBtn");
const deleteTripBtn = document.getElementById("deleteTripBtn");

if (deleteTripBtn) {
  deleteTripBtn.addEventListener("click", () => {
    if (!confirm("Delete this trip? This action cannot be undone.")) return;
    const all = loadTrips().filter((t) => t.id !== tripId);
    saveTrips(all);
    window.location.replace("/src/Dashboard page/dashboard.html");
  });
}

if (editTripBtn) {
  editTripBtn.addEventListener("click", () => {
    const newTitle = prompt("Trip title", trip.title || "") || "";
    const newDesc = prompt("Trip description", trip.desc || "") || "";
    const newStart = prompt("Start date (YYYY-MM-DD)", trip.start || "") || "";
    const newEnd = prompt("End date (YYYY-MM-DD)", trip.end || "") || "";

    trip.title = newTitle;
    trip.desc = newDesc;
    trip.start = newStart;
    trip.end = newEnd;

    persistTrip();

    // Update visible header/overview text after edit.
    if (tripTitleEl) tripTitleEl.textContent = trip.title || "Untitled Trip";
    if (tripDatesEl)
      tripDatesEl.textContent = `${formatDate(trip.start)}${
        trip.start && trip.end ? " to " : ""
      }${formatDate(trip.end)}`;
    if (overviewDatesEl)
      overviewDatesEl.textContent = `Dates: ${formatDate(
        trip.start
      )} → ${formatDate(trip.end)}`;
    if (overviewDescEl)
      overviewDescEl.textContent = trip.desc
        ? trip.desc
        : "No description yet.";

    alert("Trip updated");
  });
}

// ---------------- LEAFLET + OSM ----------------
// Leaflet map setup and marker management.
let map;
let mapReady = false;
let mapMarkers = [];

// Create map instance and base tile layer.
function initLeafletMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  map = L.map(mapEl).setView([20, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);

  mapReady = true;
  refreshMapMarkers();
}

// Remove all existing markers from map.
function clearMarkers() {
  mapMarkers.forEach((m) => map.removeLayer(m));
  mapMarkers = [];
}

// Add markers for itinerary items + trip locations that have coords.
function refreshMapMarkers() {
  if (!mapReady || !map) return;

  clearMarkers();

  const items = (trip.itinerary || []).concat(trip.locations || []);

  items.forEach((it) => {
    if (typeof it.lat === "number" && typeof it.lng === "number") {
      const marker = L.marker([it.lat, it.lng])
        .addTo(map)
        .bindPopup(it.title || it.location || "Location");

      // Store id on marker so we can find it later.
      marker._locId = it.id;
      mapMarkers.push(marker);
    }
  });

  // Auto-fit map to show all markers.
  if (mapMarkers.length) {
    const group = L.featureGroup(mapMarkers);
    map.fitBounds(group.getBounds().pad(0.3));
  }
}

// Extra safety: when map tab is clicked, init if needed then resize.
const mapTabBtn = tabs.find((t) => t.dataset.tab === "map");
if (mapTabBtn) {
  mapTabBtn.addEventListener("click", () => {
    if (!mapReady) {
      initLeafletMap();
      setTimeout(() => map.invalidateSize(), 0);
    } else {
      refreshMapMarkers();
      setTimeout(() => map.invalidateSize(), 0);
    }
  });
}

// Pan/zoom map to a specific trip location.
function focusLocationOnMap(locId) {
  if (!mapReady) initLeafletMap();

  const loc = (trip.locations || []).find((l) => l.id === locId);
  if (
    !loc ||
    typeof loc.lat !== "number" ||
    typeof loc.lng !== "number" ||
    !map
  )
    return;

  const target = [loc.lat, loc.lng];
  map.setView(target, 10);

  const marker = mapMarkers.find((m) => m._locId === locId);
  if (marker) marker.openPopup();
}
