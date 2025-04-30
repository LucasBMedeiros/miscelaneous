// === CONFIGURATION ===
mapboxgl.accessToken = 'YOUR_MAPBOX_TOKEN';
const mapStyle = 'mapbox://styles/YOUR_USERNAME/YOUR_STYLE_ID';
const zipLayerId = 'zipcodes-fill';
const outlineLayerId = 'zipcodes-outline';
const zipProperty = 'ZCTA5CE10';

const listingsDiv = document.getElementById('listings');
let providerToZips = {};

// === INITIALIZE MAP ===
const map = new mapboxgl.Map({
  container: 'map',
  style: mapStyle,
  center: [-95, 40],
  zoom: 4,
  scrollZoom: true
});

// === LOAD DATA FROM DOMO ===
const query = `/data/v1/${datasets[0]}?limit=40000`;

map.on('load', () => {
  domo.get(query).then(processData);
});

// === PROCESS DATA ===
function processData(dataRows) {
  dataRows.forEach(row => {
    const zip = row[zipProperty];
    let providers;

    try {
      providers = JSON.parse(row["providers"]);
    } catch (e) {
      console.warn(`Bad provider array in ZIP ${zip}`);
      return;
    }

    providers.forEach(p => {
      const key = p.trim().toLowerCase();
      if (!providerToZips[key]) providerToZips[key] = [];
      providerToZips[key].push(zip);
    });
  });

  buildSidebar();
}

// === SIDEBAR UI ===
function buildSidebar() {
  listingsDiv.innerHTML = "";

  Object.keys(providerToZips).sort().forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'provider-btn';
    btn.innerText = p;
    btn.onclick = () => zoomToProvider(p);
    listingsDiv.appendChild(btn);
  });

  // Add search filter
  document.getElementById('searchInput').addEventListener('input', function () {
    const filterText = this.value.toLowerCase();
    const buttons = document.querySelectorAll('.provider-btn');
    buttons.forEach(btn => {
      const text = btn.innerText.toLowerCase();
      btn.style.display = text.includes(filterText) ? 'block' : 'none';
    });
  });
}

// === ZOOM TO PROVIDER ===
function zoomToProvider(providerName) {
  const zips = providerToZips[providerName.toLowerCase()];
  if (!zips || zips.length === 0) {
    console.warn("No ZIP codes for provider:", providerName);
    return;
  }

  // Apply filters to fill + outline
  map.setFilter(zipLayerId, ['in', ['get', zipProperty], ['literal', zips]]);
  map.setFilter(outlineLayerId, ['in', ['get', zipProperty], ['literal', zips]]);

  // Optional: approximate zoom by bounding box (centroid fallback)
  map.fitBounds(
    [
      [-125, 24], // SW USA
      [-66, 50]   // NE USA
    ],
    {
      padding: 100,
      duration: 1000,
      maxZoom: 10,
      pitch: 45
    }
  );
}
