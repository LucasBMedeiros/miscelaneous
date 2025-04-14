/* ----------------------------------------------------------------------
   Integrated Mapbox Zipcode-Provider Interaction
---------------------------------------------------------------------- */

// Mapbox initialization
mapboxgl.accessToken = 'pk.eyJ1IjoibHVjYXNlYm0iLCJhIjoiY204cDRvd2F4MDZ6bTJqb2V6YzBjOGJveCJ9.nMKunwlmyPb37dk9uLM-ig';

const GEOJSON_URL = 'https://zipcode-mapbox-data.s3.us-east-1.amazonaws.com/zipcodes-with-providers.geojson';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v10',
  center: [-96, 37],
  zoom: 3
});

let fullGeo = null;

map.on('load', () => {
  map.addSource('zips', { type: 'geojson', data: GEOJSON_URL });

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
    paint: { 'fill-color': '#3fa9f5', 'fill-opacity': 0.55 },
    filter: ['==', ['get', 'providers'], '___none___']
  });
});

fetch(GEOJSON_URL)
  .then(res => res.json())
  .then(geojson => {
    fullGeo = geojson;
    buildProviderSidebar(geojson);
  });

function buildProviderSidebar(geojson) {
  const providers = new Set();
  geojson.features.forEach(f =>
    f.properties.providers.forEach(p => providers.add(p))
  );

  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = '';

  const clearBtn = document.createElement('button');
  clearBtn.textContent = 'Clear';
  clearBtn.onclick = () => {
    map.setFilter('zips-highlight', ['==', ['get', 'providers'], '___none___']);
    sidebar.querySelectorAll('li').forEach(li => li.classList.remove('active'));
    map.flyTo({ center: [-96, 37], zoom: 3 });
  };
  sidebar.appendChild(clearBtn);

  [...providers].sort().forEach(name => {
    const li = document.createElement('li');
    li.textContent = name;

    li.onclick = () => highlightProvider(name, li);

    sidebar.appendChild(li);
  });
}

function highlightProvider(provider, sidebarItem) {
  map.setFilter('zips-highlight', ['in', provider, ['get', 'providers']]);

  const bounds = new mapboxgl.LngLatBounds();

  fullGeo.features.forEach(f => {
    if (!f.properties.providers.includes(provider)) return;

    const addCoord = ([lng, lat]) => bounds.extend([lng, lat]);
    const coords = f.geometry.coordinates;

    if (f.geometry.type === 'Polygon') {
      coords.forEach(ring => ring.forEach(addCoord));
    } else if (f.geometry.type === 'MultiPolygon') {
      coords.forEach(poly => poly.forEach(ring => ring.forEach(addCoord)));
    }
  });

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds, { padding: 50, maxZoom: 10 });
  }

  document.querySelectorAll('#sidebar li').forEach(li => li.classList.remove('active'));
  sidebarItem.classList.add('active');
}

map.on('click', ['zips-highlight', 'zips-line'], e => {
  const feature = e.features[0];
  const zip = feature.properties.ZCTA5CE10;
  let providers;

  try {
    providers = JSON.parse(feature.properties.providers);
  } catch (error) {
    providers = feature.properties.providers.split(',').map(p => p.trim());
  }

  const htmlContent = `
    <strong>ZIP:</strong> ${zip}<br>
    <strong>Providers:</strong> ${providers.join(', ')}
  `;

  new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(htmlContent)
    .addTo(map);
});