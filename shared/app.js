// === CONFIG ===
var mapboxAccessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';
var mapStyle = 'mapbox://styles/mapbox/light-v10';
var datasets = ['dataset']; // alias set in manifest
var mapDiv = document.getElementById("map");
var listingsDiv = document.getElementById("listings");

// === INIT MAPBOX ===
mapboxgl.accessToken = mapboxAccessToken;
var map = new mapboxgl.Map({
  container: mapDiv,
  style: mapStyle,
  center: [-95, 40], // Center US
  zoom: 3,
  scrollZoom: true
});

// === DOMO QUERY ===
var query = `/data/v1/${datasets[0]}?limit=30000`;

let providerToZips = {};

map.on("load", function () {
  domo.get(query).then(processData);
});

// === PROCESS DATA ===
function processData(dataRows) {
  const geoJSON = {
    type: "FeatureCollection",
    features: []
  };

  dataRows.forEach(row => {
    const zip = row["ZCTA5CE10"];
    const providers = JSON.parse(row["providers"]);
    const geometry = JSON.parse(row["geometry"]);

    geoJSON.features.push({
      type: "Feature",
      geometry: geometry,
      properties: {
        zip: zip,
        providers: providers
      }
    });

    providers.forEach(p => {
      if (!providerToZips[p]) providerToZips[p] = [];
      providerToZips[p].push(zip);
    });
  });

  // Add GeoJSON to Map
  map.addSource('zipcodes', { type: 'geojson', data: geoJSON });

  map.addLayer({
    id: 'zipcodes-fill',
    type: 'fill',
    source: 'zipcodes',
    paint: {
      'fill-color': '#4466ff',
      'fill-opacity': 0.4
    }
  });

  map.addLayer({
    id: 'zipcodes-outline',
    type: 'line',
    source: 'zipcodes',
    paint: {
      'line-color': '#222',
      'line-width': 1
    }
  });

  buildSidebar(geoJSON);
}

// === SIDEBAR ===
function buildSidebar(geoJSON) {
  listingsDiv.innerHTML = '';
  Object.keys(providerToZips).sort().forEach(provider => {
    const btn = document.createElement('button');
    btn.className = 'provider-btn';
    btn.innerText = provider;
    btn.onclick = () => zoomToProvider(provider, geoJSON);
    listingsDiv.appendChild(btn);
  });
}

// === ZOOM TO PROVIDER ===
function zoomToProvider(provider, geoJSON) {
  const zipcodes = providerToZips[provider];
  const features = geoJSON.features.filter(f => zipcodes.includes(f.properties.zip));
  if (features.length === 0) return;

  const bounds = features.reduce((b, feature) => {
    const coords = feature.geometry.coordinates.flat(2);
    coords.forEach(c => b.extend(c));
    return b;
  }, new mapboxgl.LngLatBounds(features[0].geometry.coordinates[0][0], features[0].geometry.coordinates[0][0]));

  map.fitBounds(bounds, { padding: 40, duration: 1000 });

  map.setFilter('zipcodes-fill', ['in', ['get', 'zip'], ['literal', zipcodes]]);
  map.setFilter('zipcodes-outline', ['in', ['get', 'zip'], ['literal', zipcodes]]);
}
