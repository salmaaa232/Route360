const { useEffect, useMemo, useRef, useState } = React;

function GlobePage() {
  const userId = (window.getCurrentUserId && getCurrentUserId()) || null;
  if (!userId) {
    window.location.replace("/src/Auth Page/auth.html");
    return null;
  }

  const KEY_VISITED = `route360_visitedCountries_${userId}_v1`;
  const KEY_TRIPS   = `route360_trips_${userId}_v1`;

  const norm = (s) => (s || "").trim().toLowerCase();

  // ---- fallback coordinates (so markers ALWAYS show) ----
  const FALLBACK_COORDS = useMemo(() => ({
    // original
    japan: { lat: 36.2, lng: 138.3 },
    italy: { lat: 41.9, lng: 12.6 },
    france: { lat: 46.2, lng: 2.2 },
    spain: { lat: 40.4, lng: -3.7 },
    germany: { lat: 51.2, lng: 10.4 },
    egypt: { lat: 26.8, lng: 30.8 },
    china: { lat: 35.9, lng: 104.2 },
    canada: { lat: 56.1, lng: -106.3 },
    brazil: { lat: -10.3, lng: -53.2 },
    mexico: { lat: 23.6, lng: -102.5 },
    greece: { lat: 39.1, lng: 21.8 },
    turkey: { lat: 39.0, lng: 35.2 },
    "united states of america": { lat: 39.8, lng: -98.6 },
    "united kingdom": { lat: 55.3, lng: -3.4 },
    "united arab emirates": { lat: 23.4, lng: 53.8 },
    "saudi arabia": { lat: 23.9, lng: 45.1 },
    qatar: { lat: 25.3, lng: 51.2 },
    india: { lat: 20.6, lng: 78.9 },
    morocco: { lat: 31.8, lng: -7.1 },

    // ✅ new fallback coords
    australia: { lat: -25.3, lng: 133.8 },
    monaco: { lat: 43.7384, lng: 7.4246 },
    portugal: { lat: 39.4, lng: -8.2 },
    netherlands: { lat: 52.1, lng: 5.3 },
    belgium: { lat: 50.8, lng: 4.5 },
    switzerland: { lat: 46.8, lng: 8.2 },
    austria: { lat: 47.5, lng: 14.5 },
    sweden: { lat: 60.1, lng: 18.6 },
    norway: { lat: 60.5, lng: 8.5 },
    denmark: { lat: 56.2, lng: 9.5 },
    finland: { lat: 64.0, lng: 26.0 },
    ireland: { lat: 53.4, lng: -8.2 },
    "south africa": { lat: -30.6, lng: 22.9 },
    kenya: { lat: 0.02, lng: 37.9 },
    tanzania: { lat: -6.4, lng: 35.0 },
    thailand: { lat: 15.8, lng: 100.9 },
    indonesia: { lat: -2.5, lng: 118.0 },
    malaysia: { lat: 4.2, lng: 102.0 },
    singapore: { lat: 1.35, lng: 103.8 },
    "south korea": { lat: 36.5, lng: 127.9 },
    vietnam: { lat: 14.1, lng: 108.3 },
    philippines: { lat: 12.9, lng: 121.8 },
    argentina: { lat: -38.4, lng: -63.6 },
    chile: { lat: -35.7, lng: -71.5 },
    peru: { lat: -9.2, lng: -75.0 },
    colombia: { lat: 4.6, lng: -74.1 },
    russia: { lat: 61.5, lng: 105.3 },
    ukraine: { lat: 48.3, lng: 31.2 },
    poland: { lat: 52.1, lng: 19.1 },
    "czech republic": { lat: 49.8, lng: 15.5 },
    hungary: { lat: 47.1, lng: 19.5 },
    croatia: { lat: 45.1, lng: 15.2 },
    serbia: { lat: 44.0, lng: 20.9 },
    romania: { lat: 45.9, lng: 24.9 },
    bulgaria: { lat: 42.7, lng: 25.5 },
    "new zealand": { lat: -40.9, lng: 174.9 },
    iceland: { lat: 64.9, lng: -19.0 },
    jordan: { lat: 31.2, lng: 36.0 },
    lebanon: { lat: 33.9, lng: 35.9 },
    oman: { lat: 21.5, lng: 55.9 },
    bahrain: { lat: 26.1, lng: 50.5 },
    kuwait: { lat: 29.3, lng: 47.5 },
    tunisia: { lat: 34.0, lng: 9.5 },
    algeria: { lat: 28.0, lng: 1.7 },
    nigeria: { lat: 9.1, lng: 8.7 },
    ghana: { lat: 7.9, lng: -1.0 },
    ethiopia: { lat: 9.1, lng: 40.5 },
  }), []);

  const ALIASES = useMemo(() => ({
    usa: "united states of america",
    "united states": "united states of america",
    uk: "united kingdom",
    uae: "united arab emirates",
    dubai: "united arab emirates"
  }), []);

  const FLAG = useMemo(() => ({
    // original
    japan:"🇯🇵", italy:"🇮🇹", france:"🇫🇷", spain:"🇪🇸", germany:"🇩🇪",
    egypt:"🇪🇬", "united states of america":"🇺🇸", usa:"🇺🇸",
    "united kingdom":"🇬🇧", uk:"🇬🇧", china:"🇨🇳", canada:"🇨🇦",
    brazil:"🇧🇷", mexico:"🇲🇽", greece:"🇬🇷", turkey:"🇹🇷",
    "united arab emirates":"🇦🇪", uae:"🇦🇪",
    "saudi arabia":"🇸🇦", qatar:"🇶🇦", india:"🇮🇳", morocco:"🇲🇦",

    // ✅ new ones
    australia:"🇦🇺",
    monaco:"🇲🇨",
    portugal:"🇵🇹",
    netherlands:"🇳🇱",
    belgium:"🇧🇪",
    switzerland:"🇨🇭",
    austria:"🇦🇹",
    sweden:"🇸🇪",
    norway:"🇳🇴",
    denmark:"🇩🇰",
    finland:"🇫🇮",
    ireland:"🇮🇪",
    "south africa":"🇿🇦",
    kenya:"🇰🇪",
    tanzania:"🇹🇿",
    thailand:"🇹🇭",
    indonesia:"🇮🇩",
    malaysia:"🇲🇾",
    singapore:"🇸🇬",
    "south korea":"🇰🇷",
    vietnam:"🇻🇳",
    philippines:"🇵🇭",
    argentina:"🇦🇷",
    chile:"🇨🇱",
    peru:"🇵🇪",
    colombia:"🇨🇴",
    russia:"🇷🇺",
    ukraine:"🇺🇦",
    poland:"🇵🇱",
    "czech republic":"🇨🇿",
    hungary:"🇭🇺",
    croatia:"🇭🇷",
    serbia:"🇷🇸",
    romania:"🇷🇴",
    bulgaria:"🇧🇬",
    "new zealand":"🇳🇿",
    iceland:"🇮🇸",
    jordan:"🇯🇴",
    lebanon:"🇱🇧",
    oman:"🇴🇲",
    bahrain:"🇧🇭",
    kuwait:"🇰🇼",
    tunisia:"🇹🇳",
    algeria:"🇩🇿",
    nigeria:"🇳🇬",
    ghana:"🇬🇭",
    ethiopia:"🇪🇹",
  }), []);

  const flagFor = (name) => FLAG[norm(name)] || "🏳️";

  const COUNTRY_NAMES = useMemo(() => [
    // original list
    "Japan","Italy","France","Spain","Germany","Egypt",
    "United States","USA","United Kingdom","UK",
    "China","Canada","Brazil","Mexico","Greece","Turkey",
    "UAE","Dubai","Saudi Arabia","Qatar","India","Morocco",
    "United States of America","United Arab Emirates",

    // ✅ new list
    "Australia","Monaco","Portugal","Netherlands","Belgium","Switzerland",
    "Austria","Sweden","Norway","Denmark","Finland","Ireland",
    "South Africa","Kenya","Tanzania","Thailand","Indonesia","Malaysia",
    "Singapore","South Korea","Vietnam","Philippines",
    "Argentina","Chile","Peru","Colombia",
    "Russia","Ukraine","Poland","Czech Republic","Hungary","Croatia",
    "Serbia","Romania","Bulgaria",
    "New Zealand","Iceland",
    "Jordan","Lebanon","Oman","Bahrain","Kuwait",
    "Tunisia","Algeria","Nigeria","Ghana","Ethiopia",
  ], []);

  const [visited, setVisited] = useState([]);
  const [centroids, setCentroids] = useState([]);
  const [markerCount, setMarkerCount] = useState(0);

  const globeRef = useRef(null);
  const globeInstanceRef = useRef(null);

  // ---- storage helpers ----
  const getVisited = () => {
    try { return JSON.parse(localStorage.getItem(KEY_VISITED)) || []; }
    catch { return []; }
  };
  const saveVisited = (arr) => {
    localStorage.setItem(KEY_VISITED, JSON.stringify(arr));
  };
  const readTrips = () => {
    try { return JSON.parse(localStorage.getItem(KEY_TRIPS)) || []; }
    catch { return []; }
  };

  // ---- detect from trips ----
  const detectFromTrips = () => {
    const trips = readTrips();
    const found = new Set();

    trips.forEach(t => {
      const title = norm(t.title);
      COUNTRY_NAMES.forEach(c => {
        if (title.includes(norm(c))) found.add(c);
      });
      if (t.country) found.add(t.country);
    });

    // ✅ tag these as trip-sourced
    return [...found].map(name => ({ name, source: "trip" }));
  };

  // ✅ true sync: keep manual countries, refresh trip ones
  const mergeTripsIntoVisited = () => {
    const detected = detectFromTrips(); // [{name, source:"trip"}]
    const current = getVisited();       // old storage may not have source

    const normalizedCurrent = current.map(v => ({
      ...v,
      source: v.source || "manual" // backward compat
    }));

    const manualOnly = normalizedCurrent.filter(v => v.source === "manual");

    const merged = [...manualOnly];
    detected.forEach(d => {
      if (!merged.some(v => norm(v.name) === norm(d.name))) merged.push(d);
    });

    saveVisited(merged);
    return merged;
  };

  // ---- init globe ----
  useEffect(() => {
    if (!globeRef.current) return;

    const g = Globe()(globeRef.current)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
      .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundColor("#e8ecf0")

      // points
      .pointsData([])
      .pointLat(d => d.lat)
      .pointLng(d => d.lng)
      .pointRadius(d => d.size || 1.1)
      .pointAltitude(0.09)
      .pointColor(() => "#c1edffff")
      .pointLabel(d => `${flagFor(d.name)} ${d.name}`)

      // labels
      .labelsData([])
      .labelLat(d => d.lat)
      .labelLng(d => d.lng)
      .labelText(d => `${flagFor(d.name)} ${d.name}`)

      // bigger text
      .labelSize(2.2)

      // tiny dot under label a little bigger
      .labelDotRadius(0.4)

      // WHITE text for contrast
      .labelColor(() => "#ffffff")

      // float higher so it doesn't blend into the globe
      .labelAltitude(0.22)

      // sharper label rendering
      .labelResolution(3);

    g.controls().autoRotate = true;
    g.controls().autoRotateSpeed = 0.6;
    g.pointOfView({ lat: 20, lng: 0, altitude: 2.2 }, 0);

    globeInstanceRef.current = g;

    const resize = () => {
      const el = globeRef.current;
      if (!el) return;
      g.width(el.clientWidth);
      g.height(el.clientHeight);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ---- load centroids + names ----
  useEffect(() => {
    (async () => {
      try {
        const resTopo = await fetch("https://unpkg.com/world-atlas@2/countries-110m.json");
        const topo = await resTopo.json();
        const geo = topojson.feature(topo, topo.objects.countries);

        const resNames = await fetch("https://unpkg.com/world-atlas@2/countries-110m.tsv");
        const tsvText = await resNames.text();

        const idToName = {};
        tsvText.split("\n").slice(1).forEach(line => {
          const [id, name] = line.split("\t");
          if (id && name) idToName[id] = name;
        });

        const c = geo.features.map(f => {
          const [lng, lat] = d3.geoCentroid(f);
          const name = idToName[f.id];
          return name ? { id: f.id, name, lat, lng } : null;
        }).filter(Boolean);

        setCentroids(c);
      } catch (e) {
        console.warn("centroids failed", e);
        setCentroids([]);
      }
    })();
  }, []);

  // ---- boot visited ----
  useEffect(() => {
    const merged = mergeTripsIntoVisited();
    setVisited(merged);
  }, []);

  // ---- update markers (centroids + fallback) ----
  useEffect(() => {
    const g = globeInstanceRef.current;
    if (!g) return;

    const markers = visited.map(v => {
      const raw = norm(v.name);
      const want = ALIASES[raw] || raw;

      let m = centroids.find(c => norm(c.name) === want);
      if (!m) m = centroids.find(c => norm(c.name).includes(want));

      const fb = FALLBACK_COORDS[want];

      if (!m && !fb) return null;

      const lat = m?.lat ?? fb.lat;
      const lng = m?.lng ?? fb.lng;

      return { name: v.name, lat, lng, size: 1.2 };
    }).filter(Boolean);

    setMarkerCount(markers.length);

    g.pointsData(markers);
    g.labelsData(markers);
  }, [visited, centroids]);

  // ---- actions ----
  const addCountry = () => {
    const name = prompt("Country name (ex: Japan, Italy)");
    if (!name) return;

    const next = [...getVisited()].map(v => ({
      ...v,
      source: v.source || "manual"
    }));

    if (next.some(v => norm(v.name) === norm(name))) return;

    // ✅ manual countries tagged
    next.push({ name: name.trim(), source: "manual" });
    saveVisited(next);

    // resync with trips to avoid duplicates
    const merged = mergeTripsIntoVisited();
    setVisited(merged);
  };

  const removeCountry = (name) => {
    const next = getVisited()
      .map(v => ({ ...v, source: v.source || "manual" }))
      .filter(x => norm(x.name) !== norm(name));

    saveVisited(next);

    const merged = mergeTripsIntoVisited();
    setVisited(merged);
  };

  const signOut = () => {
    clearCurrentUserId();
    window.location.replace("/src/Auth page/auth.html");
  };

  return (
    <div className="globe-page">
      <div id="globeContainer" ref={globeRef}></div>

      <aside className="side-panel">
        <div className="top-row">
          <a className="backlink" href="/src/Dashboard Page/dashboard.html">← Back</a>
          <button className="btn-ghost" onClick={signOut}>Sign out</button>
        </div>

        <h2 className="panel-title">Visited Countries</h2>
        <div className="stat-line">
          <b>{visited.length}</b> countries visited
        </div>

        <div className="stat-line muted">
          markers: {markerCount}
        </div>

        <div className="country-list">
          {visited.map(c => (
            <div key={c.name} className="country-item">
              <span className="flag">{flagFor(c.name)}</span>
              <span className="country-name">{c.name}</span>
              <button
                className="btn-ghost btn-remove"
                onClick={() => removeCountry(c.name)}
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={addCountry}>+ Add country</button>

        <p className="hint">
          Countries auto-come from trip titles like “Japan Trip”.
        </p>
      </aside>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<GlobePage />);
