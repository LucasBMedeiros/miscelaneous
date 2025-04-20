mapboxgl.accessToken = '';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/lucasebm/cm9n87urv00ge01rwe62xcha4',
  center: [-73.9, 41.2],
  zoom: 6
});

map.on('load', async () => {
  const providersSet = new Set();

  // Get features in viewport (may change if zoomed too far out)
  const tilesetLayer = 'zipcodes';

  const collectProviders = () => {
    const features = map.querySourceFeatures('composite', {
      sourceLayer: tilesetLayer
    });

    features.forEach(feature => {
      const providers = feature.properties.providers;
      if (providers) {
        const list = providers.split(',');
        list.forEach(p => providersSet.add(p.trim()));
      }
    });
  };

  // Wait a bit for tiles to fully load and then collect providers
  setTimeout(() => {
    collectProviders();
    buildSidebar(Array.from(providersSet).sort());
  }, 3000);
});

function buildSidebar(providers) {
  const sidebar = document.getElementById('sidebar');
  sidebar.innerHTML = "<h3>Providers</h3>";

  providers.forEach(name => {
    const btn = document.createElement('button');
    btn.className = 'provider-btn';
    btn.innerText = name;
    btn.onclick = () => highlightByProvider(name);
    sidebar.appendChild(btn);
  });
}

function highlightByProvider(name) {
  map.setFilter('zipcodes', ['in', name, ['get', 'providers']]);
}
