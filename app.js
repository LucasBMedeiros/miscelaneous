/* ------------------------------------------------------------
   app.js – provider‑by‑ZIP map
   ------------------------------------------------------------ */

/* 1. Mapbox initialisation
   ------------------------------------------------------------ */
   mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;
 
 const map = new mapboxgl.Map({
   container: 'map',
   style: 'mapbox://styles/mapbox/light-v11',
   center: [-96, 37],
   zoom: 3
 });
 
 /* 2. Add the GeoJSON source & layers as soon as the style loads
    ------------------------------------------------------------ */
 const GEOJSON_PATH = 'https://zipcode-mapbox-data.s3.us-east-1.amazonaws.com/zipcodes-with-providers.geojson';
 
 map.on('load', () => {
   map.addSource('zips', { type: 'geojson', data: GEOJSON_PATH });
 
   map.addLayer({
     id: 'zips-line',
     type: 'line',
     source: 'zips',
     paint: { 'line-color': '#888', 'line-width': 0.4 }
   });
 
   map.addLayer({
     id: 'zips-highlight',
     type: 'fill',
     source: 'zips',
     paint: { 'fill-color': '#ff6600', 'fill-opacity': 0.55 },
     filter: ['==', ['get', 'providers'], '___none___']
   });
 });
 
 /* 3. Build the sidebar from a direct fetch (never races)
    ------------------------------------------------------------ */
 fetch(GEOJSON_PATH)
   .then(r => r.json())
   .then(buildSidebar)
   .catch(err => console.error('Failed to load GeoJSON:', err));
 
 function buildSidebar(geojson) {
   // collect unique provider names
   const providers = new Set();
   geojson.features.forEach(f =>
     f.properties.providers.forEach(p => providers.add(p))
   );
 
   const sidebar = document.getElementById('sidebar');
   sidebar.innerHTML = ''; // clear
 
   // "Clear" button
   const clearBtn = document.createElement('button');
   clearBtn.textContent = 'Clear';
   clearBtn.style.marginBottom = '6px';
   clearBtn.onclick = () => {
     map.setFilter('zips-highlight', ['==', ['get', 'providers'], '___none___']);
     sidebar.querySelectorAll('li').forEach(li => li.classList.remove('active'));
   };
   sidebar.appendChild(clearBtn);
 
   // provider list
   [...providers].sort().forEach(name => {
     const li = document.createElement('li');
     li.textContent = name;
     li.onclick = () => {
       map.setFilter('zips-highlight', ['in', name, ['get', 'providers']]);
       sidebar.querySelectorAll('li').forEach(x => x.classList.remove('active'));
       li.classList.add('active');
     };
     sidebar.appendChild(li);
   });
 
   console.log(`Sidebar ready – ${providers.size} providers`);
 }
 