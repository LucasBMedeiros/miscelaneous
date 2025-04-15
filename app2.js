/* ----------------------------------------------------------------------
   app.js – highlight ZIP polygons by provider and zoom the map to them
   ---------------------------------------------------------------------- */

/* 1) Mapbox initialization */
mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
  center: [-96, 37],
  zoom: 3
});

/* 2) Add the ZIP polygon source & layers when the style loads */
const GEOJSON_URL = 'https://zipcode-mapbox-data.s3.us-east-1.amazonaws.com/zipcodes-with-providers.geojson';

map.on('load', () => {
  map.addSource('zips', { type: 'geojson', data: GEOJSON_URL });

  // Grey outlines
  map.addLayer({
    id: 'zips-line',
    type: 'line',
    source: 'zips',
    paint: { 'line-color': '#888', 'line-width': 0.4 }
  });

  // Orange fill (hidden until user picks a provider)
  map.addLayer({
    id: 'zips-highlight',
    type: 'fill',
    source: 'zips',
    paint: { 'fill-color': '#ff6600', 'fill-opacity': 0.55 },
    filter: ['==', ['get', 'providers'], '___none___']
  });
});

/* 3) Load the same GeoJSON ourselves (for the sidebar & bounding boxes) */
let fullGeo = null; // store the entire dataset for bounding boxes

fetch(GEOJSON_URL)
  .then(r => r.json())
  .then(gj => {
    fullGeo = gj;
    buildSidebar(gj);
  })
  .catch(err => console.error('Failed to load GeoJSON:', err));

/* 4) Build the left sidebar listing each provider */
function buildSidebar(geojson) {
  // 4a) collect unique provider names
  const providers = new Set();
  geojson.features.forEach(f =>
    f.properties.providers.forEach(p => providers.add(p))
  );

  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = '';

  // 4b) "Clear" button
  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.style.marginBottom = '6px';
  clearBtn.onclick = () => {
    // remove the highlight
    map.setFilter('zips-highlight', ['==', ['get', 'providers'], '___none___']);
    // unmark the active provider
    sidebar.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    // optionally fly the map back to the national view
    map.flyTo({ center: [-96, 37], zoom: 3 });
  };
  sidebar.appendChild(clearBtn);

  // 4c) <li> for each provider
  [...providers].sort().forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;

    li.onclick = () => {
      // 1) highlight polygons for that provider
      map.setFilter('zips-highlight', ['in', name, ['get', 'providers']]);

      // 2) compute bounding box from the full dataset
      const bounds = new mapboxgl.LngLatBounds();

      fullGeo.features.forEach(f => {
        if (!f.properties.providers.includes(name)) return;

        // expand the bounding box for each coordinate in each ring
        const addCoord = ([lng, lat]) => bounds.extend([lng, lat]);
        const coords = f.geometry.coordinates;

        if (f.geometry.type === 'Polygon') {
          coords.forEach(ring => ring.forEach(addCoord));
        } else if (f.geometry.type === 'MultiPolygon') {
          coords.forEach(poly => poly.forEach(ring => ring.forEach(addCoord)));
        }
      });

      // if the bounding box isn't empty, fit the map
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 40, maxZoom: 8 });
      }

      // 3) set the "active" styling in the sidebar
      sidebar.querySelectorAll('li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
    };

    sidebar.appendChild(li);
  });

  console.log(`Sidebar ready – found ${providers.size} providers`);
}
