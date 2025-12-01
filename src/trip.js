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
  if (name === "map") {
    if (!mapReady) initMapImport();
    else refreshMapMarkers();
  }
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
      addLocationToItem(it.id);
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
function addTripLocationPrompt() {
  const loc = prompt("Add a location for this trip (address or place name)");
  if (!loc) return;

  trip.locations = trip.locations || [];
  trip.locations.push({ id: "loc_" + Date.now(), location: loc, title: loc });

  persistTrip();
  alert("Location added — open Map tab to view it.");
  refreshMapMarkers();
}

["addLocationBtn", "overviewAddLoc", "mapAddLoc", "rightAddLoc"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", addTripLocationPrompt);
});

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

function addLocationToItem(id) {
  const loc = prompt("Add location for this item (e.g. Shopping at Mall)");
  if (!loc) return;

  const items = (trip.itinerary || []).concat(trip.locations || []);
  const it = items.find(x => x.id === id);
  if (!it) return alert("Itinerary item not found");

  it.location = loc;
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

// ---------------- GOOGLE MAPS (IMPORTLIBRARY ONLY) ----------------
// NOTE: trip.html must include the bootstrap loader + window.GOOGLE_MAPS_API_KEY
// and must have: <div id="map" style="height:320px"></div>

let map;
let mapReady = false;
let mapMarkers = [];
let GeocoderLib = null;
let MarkerLib = null;

async function initMapImport() {
  const mapEl = document.getElementById("map");
  if (!mapEl) return;

  const { Map } = await google.maps.importLibrary("maps");
  ({ Geocoder: GeocoderLib } = await google.maps.importLibrary("geocoding"));
  ({ Marker: MarkerLib } = await google.maps.importLibrary("marker"));

  map = new Map(mapEl, {
    center: { lat: 20, lng: 0 },
    zoom: 2,
    mapTypeControl: false
  });

  mapReady = true;
  refreshMapMarkers();
}

function clearMarkers() {
  mapMarkers.forEach(m => m.setMap(null));
  mapMarkers = [];
}

function refreshMapMarkers() {
  if (!mapReady || !map || !GeocoderLib || !MarkerLib) return;

  clearMarkers();

  const items = (trip.itinerary || []).concat(trip.locations || []);
  const geocoder = new GeocoderLib();

  items.forEach(it => {
    if (!it.location) return;

    geocoder.geocode({ address: it.location }, (results, status) => {
      if (status === "OK" && results[0]) {
        const pos = results[0].geometry.location;

        const marker = new MarkerLib({
          map,
          position: pos,
          title: it.title || it.location
        });

        mapMarkers.push(marker);

        if (mapMarkers.length === 1) {
          map.setCenter(pos);
          map.setZoom(10);
        }
      }
    });
  });
}

// load map when Map tab is clicked
const mapTabBtn = tabs.find(t => t.dataset.tab === "map");
if (mapTabBtn) {
  mapTabBtn.addEventListener("click", () => {
    if (!mapReady) initMapImport();
    else refreshMapMarkers();
  });
}
