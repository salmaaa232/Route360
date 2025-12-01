// trip.js — trip details page with tabs + per-user storage + itinerary CRUD + Google Maps (importLibrary)

// ---------------- AUTH GUARD ----------------
const userId = getCurrentUserId();
if (!userId) {
  window.location.replace("auth.html");
  throw new Error("Not signed in");
}

const KEY_TRIPS = `route360_trips_${userId}_v1`;

// ---------------- HELPERS ----------------
function loadTrips() {
  try {
    const raw = localStorage.getItem(KEY_TRIPS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTrips(trips) {
  localStorage.setItem(KEY_TRIPS, JSON.stringify(trips));
}

function getTripIdFromUrl() {
  const p = new URLSearchParams(location.search);
  return p.get("id");
}

function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function escapeHtml(s) {
  return (s || "").replace(/[&<>"']/g, c =>
    ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c])
  );
}

// ---------------- LOAD TRIP ----------------
const tripId = getTripIdFromUrl();
let trips = loadTrips();
let trip = trips.find(t => t.id === tripId);

if (!trip) {
  alert("Trip not found");
  window.location.replace("dashboard.html");
}

// ---------------- HEADER STUFF ----------------
const backBtn = document.getElementById("backBtn");
if (backBtn) backBtn.onclick = () => history.back();

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.onclick = () => {
    clearCurrentUserId();
    window.location.replace("auth.html");
  };
}

// ---------------- FILL UI ----------------
const heroImg = document.getElementById("heroImg");
if (heroImg) heroImg.src = trip.coverDataUrl || "";

const tripTitleEl = document.getElementById("tripTitle");
if (tripTitleEl) tripTitleEl.textContent = trip.title || "Untitled Trip";

const tripDatesEl = document.getElementById("tripDates");
if (tripDatesEl) {
  tripDatesEl.textContent =
    `${formatDate(trip.start)}${trip.start && trip.end ? " to " : ""}${formatDate(trip.end)}`;
}

const overviewDatesEl = document.getElementById("overviewDates");
if (overviewDatesEl) {
  overviewDatesEl.textContent = `Dates: ${formatDate(trip.start)} → ${formatDate(trip.end)}`;
}

const overviewDescEl = document.getElementById("overviewDesc");
if (overviewDescEl) {
  overviewDescEl.textContent = trip.desc ? trip.desc : "No description yet.";
}


// ---------------- TABS ----------------
const tabs = Array.from(document.querySelectorAll(".tab"));
const views = {
  overview: document.getElementById("tab-overview"),
  itinerary: document.getElementById("tab-itinerary"),
  map: document.getElementById("tab-map"),
};
const rightMapPanel = document.getElementById("rightMapPanel");

function showTab(name) {
  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  Object.entries(views).forEach(([k, el]) => el && el.classList.toggle("hide", k !== name));

  // like your screenshots
  if (rightMapPanel) rightMapPanel.style.display = (name === "itinerary") ? "none" : "block";

  // when entering map tab, load map

}

tabs.forEach(btn => btn.addEventListener("click", () => showTab(btn.dataset.tab)));
showTab("overview");

// ---------------- ITINERARY RENDER ----------------
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

    const right = document.createElement("div");
    right.className = "muted";
    right.style.display = "flex";
    right.style.flexDirection = "column";
    right.style.alignItems = "flex-end";

    const dayText = document.createElement("div");
    dayText.textContent = `Day ${it.day || (idx + 1)}`;
    right.appendChild(dayText);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "6px";
    actions.style.marginTop = "6px";

    const addLocBtn = document.createElement("button");
    addLocBtn.className = "btn ghost";
    addLocBtn.textContent = "+Loc";
    addLocBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openLocModal("item", it.id);
    });

    const editBtn = document.createElement("button");
    editBtn.className = "btn ghost";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      openItEdit(it.id);
    });

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

// ---------------- TRIP-LEVEL LOCATIONS (optional quick add) ----------------
const locModal = document.getElementById("locModal");
const locSearchInput = document.getElementById("locSearchInput");
const locSuggestions = document.getElementById("locSuggestions");
const locCancelBtn = document.getElementById("locCancelBtn");

// which thing are we adding location to?
let locTargetType = "trip"; // "trip" | "item"
let locTargetId = null;     // itinerary item id if type="item"

// open/close
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

// trip-level buttons open modal
["addLocationBtn", "overviewAddLoc", "mapAddLoc", "rightAddLoc"].forEach(btnId => {
  const el = document.getElementById(btnId);
  if (el) el.addEventListener("click", () => openLocModal("trip"));
});

// ------- Photon autocomplete -------
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

async function searchPhoton(query) {
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=6`;
    const res = await fetch(url);
    const data = await res.json();
    renderPhotonSuggestions(data.features || []);
  } catch (err) {
    console.error("Photon search failed:", err);
    locSuggestions.classList.add("hide");
  }
}

function makeLocationChip(loc) {
  const btn = document.createElement("button");
  btn.className = "location-chip";
  btn.type = "button";

  const left = document.createElement("div");
  left.className = "location-chip__name";
  left.textContent = loc.title || loc.location || "Place";

  const right = document.createElement("div");
  right.className = "location-chip__meta";
  right.textContent = loc.location || "";

  btn.appendChild(left);
  btn.appendChild(right);

  btn.addEventListener("click", () => {
    focusLocationOnMap(loc.id);
  });

  return btn;
}

function renderLocationLists() {
  const locs = trip.locations || [];

  const overviewContainer = document.getElementById("overviewLocations");
  const mapContainer = document.getElementById("mapLocations");

  if (overviewContainer) {
    overviewContainer.innerHTML = "";
    locs.forEach(loc => overviewContainer.appendChild(makeLocationChip(loc)));
  }

  if (mapContainer) {
    mapContainer.innerHTML = "";
    if (!locs.length) {
      mapContainer.textContent = "No places yet.";
    } else {
      locs.forEach(loc => mapContainer.appendChild(makeLocationChip(loc)));
    }
  }
}


function renderPhotonSuggestions(features) {
  locSuggestions.innerHTML = "";

  if (!features.length) {
    locSuggestions.classList.add("hide");
    return;
  }

  features.forEach(f => {
    const p = f.properties || {};
    const name = p.name || p.street || "Unnamed place";
    const city = p.city || p.state || "";
    const country = p.country || "";
    const label = [name, city, country].filter(Boolean).join(", ");

    const li = document.createElement("li");
    li.textContent = label;

    li.addEventListener("click", () => {
      const [lon, lat] = f.geometry.coordinates;
      onPlaceSelected({ label, lat, lon });
    });

    locSuggestions.appendChild(li);
  });

  locSuggestions.classList.remove("hide");
}

// when user picks a suggestion
function onPlaceSelected(place) {
  const { label, lat, lon } = place;

  if (locTargetType === "trip") {
    trip.locations = trip.locations || [];
    trip.locations.push({
      id: "loc_" + Date.now(),
      location: label,
      title: label,
      lat,
      lng: lon
    });

  } else if (locTargetType === "item") {
    const items = (trip.itinerary || []).concat(trip.locations || []);
    const it = items.find(x => x.id === locTargetId);
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
const itineraryAddBtn = document.getElementById("itineraryAddBtn");
const itineraryForm = document.getElementById("itineraryForm");
const itTitle = document.getElementById("itTitle");
const itDate = document.getElementById("itDate");
const itNote = document.getElementById("itNote");
const saveItBtn = document.getElementById("saveItBtn");
const cancelItBtn = document.getElementById("cancelItBtn");

let editingItId = null;

if (itineraryAddBtn) {
  itineraryAddBtn.addEventListener("click", () => {
    if (itineraryForm) itineraryForm.classList.remove("hide");
    if (itTitle) itTitle.focus();
  });
}

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

function computeDayNumberFromDate(dateStr) {
  if (!trip.start || !dateStr) return null;
  const s = new Date(trip.start); s.setHours(0,0,0,0);
  const d = new Date(dateStr);   d.setHours(0,0,0,0);
  const diff = Math.round((d - s) / (1000*60*60*24));
  return diff + 1;
}

if (saveItBtn) {
  saveItBtn.addEventListener("click", () => {
    const title = (itTitle && itTitle.value.trim()) || "Activity";
    const date  = (itDate && itDate.value) || "";
    const note  = (itNote && itNote.value.trim()) || "";
    const dayNum = computeDayNumberFromDate(date);

    trip.itinerary = trip.itinerary || [];

    if (editingItId) {
      const idx = trip.itinerary.findIndex(i => i.id === editingItId);
      if (idx !== -1) {
        trip.itinerary[idx] = {
          ...trip.itinerary[idx],
          title, date, note,
          day: dayNum || trip.itinerary[idx].day || (idx+1),
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

function openItEdit(id) {
  const items = (trip.itinerary || []).concat(trip.locations || []);
  const it = items.find(x => x.id === id);
  if (!it) return alert("Itinerary item not found");

  editingItId = id;
  if (itTitle) itTitle.value = it.title || "";
  if (itDate) itDate.value = it.date || "";
  if (itNote) itNote.value = it.note || "";
  if (itineraryForm) itineraryForm.classList.remove("hide");
  if (saveItBtn) saveItBtn.textContent = "Update";
}

function deleteItItem(id) {
  if (!confirm("Delete this itinerary item?")) return;
  trip.itinerary = (trip.itinerary || []).filter(i => i.id !== id);
  persistTrip();
  renderItinerary();
  refreshMapMarkers();
}



function persistTrip() {
  trips = loadTrips();
  const idx = trips.findIndex(t => t.id === tripId);
  if (idx !== -1) {
    trips[idx] = trip;
    saveTrips(trips);
  }
}

// ---------------- TRIP EDIT / DELETE ----------------
const editTripBtn = document.getElementById("editTripBtn");
const deleteTripBtn = document.getElementById("deleteTripBtn");

if (deleteTripBtn) {
  deleteTripBtn.addEventListener("click", () => {
    if (!confirm("Delete this trip? This action cannot be undone.")) return;
    const all = loadTrips().filter(t => t.id !== tripId);
    saveTrips(all);
    window.location.replace("dashboard.html");
  });
}

if (editTripBtn) {
  editTripBtn.addEventListener("click", () => {
    const newTitle = prompt("Trip title", trip.title || "") || "";
    const newDesc  = prompt("Trip description", trip.desc || "") || "";
    const newStart = prompt("Start date (YYYY-MM-DD)", trip.start || "") || "";
    const newEnd   = prompt("End date (YYYY-MM-DD)", trip.end || "") || "";

    trip.title = newTitle;
    trip.desc  = newDesc;
    trip.start = newStart;
    trip.end   = newEnd;

    persistTrip();

    if (tripTitleEl) tripTitleEl.textContent = trip.title || "Untitled Trip";
    if (tripDatesEl) tripDatesEl.textContent =
      `${formatDate(trip.start)}${trip.start && trip.end ? " to " : ""}${formatDate(trip.end)}`;
    if (overviewDatesEl) overviewDatesEl.textContent =
      `Dates: ${formatDate(trip.start)} → ${formatDate(trip.end)}`;
    if (overviewDescEl) overviewDescEl.textContent =
      trip.desc ? trip.desc : "No description yet.";

    alert("Trip updated");
  });
}

// ---------------- LEAFLET + OSM (FREE MAP) ----------------

let map;
let mapReady = false;
let mapMarkers = [];

function initLeafletMap() {
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  map = L.map(mapEl).setView([20, 0], 2);

  // Free OpenStreetMap tiles
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  mapReady = true;
  refreshMapMarkers();
}

function clearMarkers() {
  mapMarkers.forEach(m => map.removeLayer(m));
  mapMarkers = [];
}

function refreshMapMarkers() {
  if (!mapReady || !map) return;

  clearMarkers();

  const items = (trip.itinerary || []).concat(trip.locations || []);

  items.forEach(it => {
    if (typeof it.lat === "number" && typeof it.lng === "number") {
      const marker = L.marker([it.lat, it.lng])
        .addTo(map)
        .bindPopup(it.title || it.location || "Location");

      // remember which trip location this marker is for
      marker._locId = it.id;

      mapMarkers.push(marker);
    }
  });

  if (mapMarkers.length) {
    const group = L.featureGroup(mapMarkers);
    map.fitBounds(group.getBounds().pad(0.3));
  }
}



// when Map tab is clicked
const mapTabBtn = tabs.find(t => t.dataset.tab === "map");
if (mapTabBtn) {
  mapTabBtn.addEventListener("click", () => {
    if (!mapReady) {
      initLeafletMap();
      setTimeout(() => map.invalidateSize(), 0); // ✅ fix hidden-tab sizing
    } else {
      refreshMapMarkers();
      setTimeout(() => map.invalidateSize(), 0);
    }
  });
}

function focusLocationOnMap(locId) {
  if (!mapReady) {
    initLeafletMap();
  }

  const loc = (trip.locations || []).find(l => l.id === locId);
  if (!loc || typeof loc.lat !== "number" || typeof loc.lng !== "number" || !map) return;

  const target = [loc.lat, loc.lng];
  map.setView(target, 10);

  // if a marker exists for this place, open its popup
  const marker = mapMarkers.find(m => m._locId === locId);
  if (marker) {
    marker.openPopup();
  }
}


