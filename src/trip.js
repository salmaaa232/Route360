// trip.js — trip details page with tabs + per-user storage

// hard auth guard
const userId = getCurrentUserId();
if (!userId) {
  window.location.replace("auth.html");
  throw new Error("Not signed in");
}

const KEY_TRIPS = `route360_trips_${userId}_v1`;

// helpers
function loadTrips(){
  try {
    const raw = localStorage.getItem(KEY_TRIPS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function saveTrips(trips){
  localStorage.setItem(KEY_TRIPS, JSON.stringify(trips));
}
function getTripIdFromUrl(){
  const p = new URLSearchParams(location.search);
  return p.get("id");
}
function formatDate(d) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' });
}

// get trip
const tripId = getTripIdFromUrl();
const trips = loadTrips();
const trip = trips.find(t => t.id === tripId);

if (!trip) {
  alert("Trip not found");
  window.location.replace("dashboard.html");
}

// wire header stuff
document.getElementById("backBtn").onclick = () => history.back();
document.getElementById("logoutBtn").onclick = () => {
  clearCurrentUserId();
  window.location.replace("auth.html");
};

// fill UI
document.getElementById("heroImg").src = trip.coverDataUrl || "";
document.getElementById("tripTitle").textContent = trip.title || "Untitled Trip";
document.getElementById("tripDates").textContent =
  `${formatDate(trip.start)}${trip.start && trip.end ? " to " : ""}${formatDate(trip.end)}`;

document.getElementById("overviewDates").textContent =
  `Dates: ${formatDate(trip.start)} → ${formatDate(trip.end)}`;

document.getElementById("overviewDesc").textContent =
  trip.desc ? trip.desc : "No description yet.";

// tabs
const tabs = Array.from(document.querySelectorAll(".tab"));
const views = {
  overview: document.getElementById("tab-overview"),
  itinerary: document.getElementById("tab-itinerary"),
  map: document.getElementById("tab-map"),
};
const rightMapPanel = document.getElementById("rightMapPanel");

function showTab(name){
  tabs.forEach(t => t.classList.toggle("active", t.dataset.tab === name));
  Object.entries(views).forEach(([k, el]) => el.classList.toggle("hide", k !== name));

  // like screenshot: show map panel on overview + map, hide it on itinerary
  rightMapPanel.style.display = (name === "itinerary") ? "none" : "block";
}

tabs.forEach(btn => {
  btn.addEventListener("click", () => showTab(btn.dataset.tab));
});

showTab("overview");

// Itinerary render (simple placeholder structure)
function renderItinerary(){
  const list = document.getElementById("itineraryList");
  const items = trip.itinerary || trip.itineraries || []; // support both names
  if (!items.length){
    list.textContent = "No itinerary yet.";
    return;
  }

  list.innerHTML = "";
  items.forEach((it, idx) => {
    const row = document.createElement("div");
    row.className = "itinerary-item";
    row.innerHTML = `
      <div>
        <strong>${it.title || it.name || "Day plan"}</strong>
        <small>${it.date ? formatDate(it.date) : ""}</small>
        ${it.note ? `<small>${it.note}</small>` : ""}
      </div>
      <div class="muted">Day ${it.day || (idx+1)}</div>
    `;
    list.appendChild(row);
  });
}
renderItinerary();

// Add location buttons (stub for now)
function addLocationStub(){
  alert("Location modal coming next ✅");
}
["addLocationBtn","overviewAddLoc","mapAddLoc","rightAddLoc"].forEach(id=>{
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", addLocationStub);
});
