const { useEffect, useMemo, useRef, useState } = React;

function GlobePage(){
  // ---- auth ----
  const userId = (window.getCurrentUserId && getCurrentUserId()) || null;
  if (!userId){
    window.location.replace("auth.html");
    return null;
  }

  // ---- storage keys ----
  const KEY_VISITED = `route360_visitedCountries_${userId}_v1`;
  const KEY_TRIPS   = `route360_trips_${userId}_v1`;

  // ---- country detection list ----
  const COUNTRY_NAMES = useMemo(()=>[
    "Japan","Italy","France","Spain","Germany","Egypt",
    "United States","USA","United Kingdom","UK",
    "China","Canada","Brazil","Mexico","Greece","Turkey",
    "UAE","Dubai","Saudi Arabia","Qatar","India","Morocco"
  ], []);

  const FLAG = useMemo(()=>({
    Japan:"🇯🇵", Italy:"🇮🇹", France:"🇫🇷", Spain:"🇪🇸", Germany:"🇩🇪",
    Egypt:"🇪🇬", "United States":"🇺🇸", USA:"🇺🇸",
    "United Kingdom":"🇬🇧", UK:"🇬🇧", China:"🇨🇳", Canada:"🇨🇦",
    Brazil:"🇧🇷", Mexico:"🇲🇽", Greece:"🇬🇷", Turkey:"🇹🇷",
    UAE:"🇦🇪", "Saudi Arabia":"🇸🇦", Qatar:"🇶🇦", India:"🇮🇳", Morocco:"🇲🇦"
  }), []);

  const norm = (s)=> (s||"").trim().toLowerCase();
  const flagFor = (name)=> FLAG[name] || "🏳️";

  // ---- state ----
  const [visited, setVisited] = useState([]);
  const [centroids, setCentroids] = useState([]);
  const globeRef = useRef(null);
  const globeInstanceRef = useRef(null);

  // ---- storage helpers ----
  const getVisited = ()=>{
    try { return JSON.parse(localStorage.getItem(KEY_VISITED)) || []; }
    catch { return []; }
  };
  const saveVisited = (arr)=>{
    localStorage.setItem(KEY_VISITED, JSON.stringify(arr));
  };
  const readTrips = ()=>{
    try { return JSON.parse(localStorage.getItem(KEY_TRIPS)) || []; }
    catch { return []; }
  };

  // ---- detect from trips ----
  const detectFromTrips = ()=>{
    const trips = readTrips();
    const found = new Set();

    trips.forEach(t=>{
      const title = norm(t.title);

      COUNTRY_NAMES.forEach(c=>{
        if (title.includes(norm(c))) found.add(c);
      });

      if (t.country) found.add(t.country);
    });

    return [...found].map(name=>({name}));
  };

  const mergeTripsIntoVisited = ()=>{
    const detected = detectFromTrips();
    const current = getVisited();
    const merged = [...current];

    detected.forEach(d=>{
      if(!merged.some(v=>norm(v.name)===norm(d.name))) merged.push(d);
    });

    saveVisited(merged);
    return merged;
  };

  // ---- init globe once ----
  useEffect(()=>{
    if(!globeRef.current) return;

    const g = Globe()(globeRef.current)
      .globeImageUrl("//unpkg.com/three-globe/example/img/earth-night.jpg")
      .bumpImageUrl("//unpkg.com/three-globe/example/img/earth-topology.png")
      .backgroundColor("#e8ecf0")
      .labelsData([])
      .labelText(d=>`${flagFor(d.name)}`)
      .labelSize(2.5)
      .labelDotRadius(0.5)
      .labelColor(()=>"#15363f")
      .labelAltitude(0.15);

    g.controls().autoRotate = true;
    g.controls().autoRotateSpeed = 0.6;
    g.pointOfView({ lat:20, lng:0, altitude:2.2 }, 0);

    globeInstanceRef.current = g;

    const resize = ()=>{
      const el = globeRef.current;
      if(!el) return;
      g.width(el.clientWidth);
      g.height(el.clientHeight);
    };
    resize();
    window.addEventListener("resize", resize);
    return ()=> window.removeEventListener("resize", resize);
  }, []);

  // ---- load centroids ----
  useEffect(()=>{
    (async()=>{
      try{
        const res = await fetch("https://unpkg.com/world-atlas@2/countries-110m.json");
        const topo = await res.json();
        const geo = topojson.feature(topo, topo.objects.countries);
        const c = geo.features.map(f=>{
          const [lng, lat] = d3.geoCentroid(f);
          return { name:f.properties.name, lat, lng };
        });
        setCentroids(c);
      } catch(e){
        console.warn("centroids failed", e);
      }
    })();
  }, []);

  // ---- boot visited from trips on load ----
  useEffect(()=>{
    const merged = mergeTripsIntoVisited();
    setVisited(merged);
  }, []);

  // ---- update markers when visited+centroids ready ----
  useEffect(()=>{
    const g = globeInstanceRef.current;
    if(!g || !centroids.length) return;

    const markers = visited.map(v=>{
      const m = centroids.find(c=>norm(c.name)===norm(v.name));
      if(!m) return null;
      return { name:v.name, lat:m.lat, lng:m.lng };
    }).filter(Boolean);

    // Use labelsData for 3D globe labels
    g.labelsData(markers);
  }, [visited, centroids]);

  // ---- actions ----
  const addCountry = ()=>{
    const name = prompt("Country name (ex: Japan, Italy)");
    if(!name) return;

    const next = [...getVisited()];
    if(next.some(v=>norm(v.name)===norm(name))) return;

    next.push({name:name.trim()});
    saveVisited(next);
    setVisited(next);
  };

  const removeCountry = (name)=>{
    const next = getVisited().filter(x=>norm(x.name)!==norm(name));
    saveVisited(next);
    setVisited(next);
  };

  const signOut = ()=>{
    clearCurrentUserId();
    window.location.replace("auth.html");
  };

  return (
    <div className="globe-page">
      <div id="globeContainer" ref={globeRef}></div>

      <aside className="side-panel">
        <div className="top-row">
          <a className="backlink" href="dashboard.html">← Back</a>
          <button className="btn-ghost" onClick={signOut}>Sign out</button>
        </div>

        <h2 className="panel-title">Visited Countries ({visited.length})</h2>
        <div className="stat-line">
          <b>{visited.length}</b> countries visited
        </div>

        <div className="country-list">
          {visited.map(c=>(
            <div key={c.name} className="country-item">
              <span className="flag">{flagFor(c.name)}</span>
              <span style={{flex:1}}>{c.name}</span>
              <button
                className="btn-ghost"
                style={{padding:"4px 8px", fontSize:"12px"}}
                onClick={()=>removeCountry(c.name)}
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

// mount
ReactDOM.createRoot(document.getElementById("root")).render(<GlobePage />);
