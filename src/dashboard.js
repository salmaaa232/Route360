// dashboard.js
// Simple dashboard app using localStorage to persist trips and username.
// HARD AUTH GUARD — stop redirect loops
const userId = (window.getCurrentUserId && getCurrentUserId()) || null;

if (!userId) {
  // replace avoids history stacking & flicker
  window.location.replace("auth.html");
  throw new Error("Not signed in");
}


(function(){
  const modal = document.getElementById('modal');
  const openBtn = document.getElementById('openAdd');
  const closeBtn = document.getElementById('closeModal');
  const saveBtn = document.getElementById('saveTrip');
  const modalTitle = document.getElementById('modalTitle');
  const coverInput = document.getElementById('coverInput');
  const imgPreview = document.getElementById('imgPreview');
  const titleInput = document.getElementById('titleInput');
  const descInput = document.getElementById('descInput');
  const startDate = document.getElementById('startDate');
  const endDate = document.getElementById('endDate');

  const welcomeText = document.getElementById('welcomeText');
  const welcomeSub = document.getElementById('welcomeSub');
  const grid = document.getElementById('tripsGrid');

// derive per-user storage keys
const userId = (window.getCurrentUserId && getCurrentUserId()) || null;
if (!userId) {
  // not signed in → send to auth
  window.location.href = 'auth.html';
  return;
}

const KEY_TRIPS = `route360_trips_${userId}_v1`;
const KEY_NAME  = `route360_username_${userId}_v1`;

  function ensureUserName() {
  // 1) If we already stored a display name for this user, use it
  let name = localStorage.getItem(KEY_NAME);
  if (name) return name;

  // 2) Otherwise get the registered name from auth.js
  const user = (window.getCurrentUser && getCurrentUser()) || null;

  if (user && user.name) {
    name = user.name;
    localStorage.setItem(KEY_NAME, name);
    return name;
  }

  // 3) Fallback (should rarely happen)
  name = "Guest";
  localStorage.setItem(KEY_NAME, name);
  return name;
}

  let username = ensureUserName();
  welcomeText.textContent = `welcome Back, ${username}!`.replace(/^./, s=>s.toUpperCase());

  function loadTrips(){
    try{
      const raw = localStorage.getItem(KEY_TRIPS);
      return raw ? JSON.parse(raw) : [];
    } catch(e){
      console.error(e);
      return [];
    }
  }
  function saveTrips(trips){
    localStorage.setItem(KEY_TRIPS, JSON.stringify(trips));
  }

  function updateWelcomeSummary(){
    const trips = loadTrips();
    const now = new Date();
    const upcoming = trips.filter(t => t.end && new Date(t.end) >= now).length;
    welcomeSub.textContent = `You have ${trips.length} trips planned, ${upcoming} upcoming.`;
  }

  function renderTrips(){
    const trips = loadTrips();
    grid.innerHTML = '';
    if(trips.length === 0){
      const empty = document.createElement('div');
      empty.style.gridColumn = '1 / -1';
      empty.innerHTML = '<p style="color:var(--muted);font-size:16px">No trips yet — click "New trip" to add one.</p>';
      grid.appendChild(empty);
      updateWelcomeSummary();
      return;
    }

    trips.forEach(trip => {
      const card = document.createElement('div');
      card.className = 'trip-card';
      card.style.cursor = "pointer";

      card.innerHTML = `
        <div class="cover">
          <img src="${trip.coverDataUrl || placeholderDataUrl(trip.title)}" alt="">
          <div class="cover-title">${escapeHtml(trip.title || 'Untitled')}</div>
        </div>
        <div class="meta">
          ${escapeHtml(trip.title || 'Untitled')}
          <small>${trip.start ? formatDate(trip.start) : ''}${trip.start && trip.end ? ' to ' : ''}${trip.end ? formatDate(trip.end) : ''}</small>
        </div>
      `;

      // navigation when clicking card
      card.addEventListener("click", () => {
        window.location.href = `trip.html?id=${trip.id}`;
      });

      // actions container (Edit / Delete)
      const actions = document.createElement('div');
      actions.style.display = 'flex';
      actions.style.gap = '8px';
      actions.style.marginTop = '8px';

      const editBtn = document.createElement('button');
      editBtn.className = 'btn ghost';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openEditModal(trip.id);
      });

      const delBtn = document.createElement('button');
      delBtn.className = 'btn';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm('Delete this trip? This action cannot be undone.')) {
          const all = loadTrips();
          const filtered = all.filter(t => t.id !== trip.id);
          saveTrips(filtered);
          renderTrips();
        }
      });

      actions.appendChild(editBtn);
      actions.appendChild(delBtn);
      card.appendChild(actions);

      grid.appendChild(card);
    });


    updateWelcomeSummary();
  }

  function formatDate(d) {
    try {
      const dt = new Date(d);
      return dt.toLocaleDateString(undefined, { day:'numeric', month:'short', year:'numeric' });
    } catch(e){ return d; }
  }

  function placeholderDataUrl(title){
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='700'><rect width='100%' height='100%' fill='#cfdfe6'/><text x='50%' y='50%' font-family='Merriweather,serif' font-size='48' fill='#3b5e62' text-anchor='middle'>${escapeHtml(title || 'Trip')}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function escapeHtml(s){
    return (s||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }

  // open modal
  openBtn.addEventListener('click', () => {
    modal.style.display = 'flex';
  });
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if(e.target === modal) closeModal();
  });

  function closeModal(){
    modal.style.display = 'none';
    coverInput.value = '';
    imgPreview.innerHTML = 'No image';
    titleInput.value = '';
    descInput.value = '';
    startDate.value = '';
    endDate.value = '';
    currentCoverDataUrl = '';
    editingTripId = null;
    if (modalTitle) modalTitle.textContent = 'Add new trip';
    if (saveBtn) saveBtn.textContent = 'Save trip';
  }

  function openEditModal(id){
    const trips = loadTrips();
    const t = trips.find(x => x.id === id);
    if (!t) return alert('Trip not found');

    editingTripId = id;
    // populate fields
    titleInput.value = t.title || '';
    descInput.value = t.desc || '';
    startDate.value = t.start || '';
    endDate.value = t.end || '';
    currentCoverDataUrl = t.coverDataUrl || '';

    // preview
    imgPreview.innerHTML = '';
    const img = document.createElement('img');
    img.src = currentCoverDataUrl || placeholderDataUrl(t.title);
    img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'cover';
    imgPreview.appendChild(img);

    if (modalTitle) modalTitle.textContent = 'Edit trip';
    if (saveBtn) saveBtn.textContent = 'Update trip';
    modal.style.display = 'flex';
  }

  let currentCoverDataUrl = '';
  let editingTripId = null;
coverInput.addEventListener('change', (ev) => {
  const f = ev.target.files && ev.target.files[0];
  if (!f) {
    imgPreview.innerHTML = 'No image';
    currentCoverDataUrl = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const img = new Image();
    img.onload = async () => {
      // 1) Resize to max dimension (keeps quality visually)
      const MAX = 1200; // you can raise to 1600 if you want
      let { width: w, height: h } = img;
      const scale = Math.min(1, MAX / Math.max(w, h));
      w = Math.round(w * scale);
      h = Math.round(h * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      // 2) Compress progressively until it's small enough
      let quality = 0.85;
      let dataUrl = canvas.toDataURL("image/jpeg", quality);

      // target ~400KB–700KB per cover so localStorage survives
      const TARGET_LEN = 700_000;

      while (dataUrl.length > TARGET_LEN && quality > 0.4) {
        quality -= 0.1;
        dataUrl = canvas.toDataURL("image/jpeg", quality);
      }

      currentCoverDataUrl = dataUrl;

      // preview
      imgPreview.innerHTML = "";
      const previewImg = document.createElement("img");
      previewImg.src = currentCoverDataUrl;
      previewImg.style.width = "100%";
      previewImg.style.height = "100%";
      previewImg.style.objectFit = "cover";
      imgPreview.appendChild(previewImg);
    };
    img.src = e.target.result;
  };

  reader.readAsDataURL(f);
});


  saveBtn.addEventListener('click', () => {
    const title = titleInput.value.trim() || 'Untitled trip';
    const desc = descInput.value.trim() || '';
    const start = startDate.value || '';
    const end = endDate.value || '';
    const coverDataUrl = currentCoverDataUrl || placeholderDataUrl(title);

    const trips = loadTrips();

    if (editingTripId) {
      // update existing
      const idx = trips.findIndex(t => t.id === editingTripId);
      if (idx !== -1) {
        trips[idx] = Object.assign({}, trips[idx], { title, desc, start, end, coverDataUrl });
      }
    } else {
      // new trip
      const id = 't_' + Date.now();
      trips.unshift({ id, title, desc, start, end, coverDataUrl });
    }

    saveTrips(trips);
    renderTrips();
    closeModal();
  });

  welcomeText.addEventListener('click', () => {
    const newName = prompt('Set your display name', localStorage.getItem(KEY_NAME) || '') || '';
    if(newName){
      localStorage.setItem(KEY_NAME, newName);
      username = newName;
      welcomeText.textContent = `welcome Back, ${username}!`.replace(/^./, s=>s.toUpperCase());
    }
  });

  // initial render
  renderTrips();

  // close modal with Escape
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && modal.style.display === 'flex') closeModal();
  });
})();
