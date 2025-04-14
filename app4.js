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

  // Highlight fill (initially invisible)
  map.addLayer({
    id: 'zips-highlight',
    type: 'fill',
    source: 'zips',
    paint: { 'fill-color': '#3fa9f5', 'fill-opacity': 0.55 },
    filter: ['==', ['get', 'ZCTA5CE10'], '__none__']
  });

  // Hover effect outline
  map.addLayer({
    id: 'zips-hover',
    type: 'line',
    source: 'zips',
    paint: { 'line-color': '#0066ff', 'line-width': 2 },
    filter: ['==', ['get', 'ZCTA5CE10'], '__none__']
  });

  // Fetch GeoJSON directly to populate sidebar
  fetch(GEOJSON_URL)
    .then(res => res.json())
    .then(data => {
      buildSidebar(data);
    });

  // Map hover functionality
  map.on('mousemove', 'zips-highlight', (e) => {
    if (e.features.length > 0) {
      map.setFilter('zips-hover', ['==', ['get', 'ZCTA5CE10'], e.features[0].properties.ZCTA5CE10]);
    }
  });

  map.on('mouseleave', 'zips-highlight', () => {
    map.setFilter('zips-hover', ['==', ['get', 'ZCTA5CE10'], '__none__']);
  });
});

// Build the sidebar dynamically based on GeoJSON data
function buildSidebar(geojson) {
  const listingsDiv = document.getElementById('listings');
  listingsDiv.innerHTML = ''; // clear current sidebar content

  geojson.features.sort((a,b) => b.properties.providers - a.properties.providers);

  geojson.features.forEach(feature => {
    const zip = feature.properties.ZCTA5CE10;
    const providerCount = feature.properties.providers;

    const listing = document.createElement('div');
    listing.className = 'item';
    listing.id = `listing-${zip}`;

    const link = document.createElement('a');
    link.href = '#';
    link.className = 'title';
    link.textContent = `ZIP: ${zip} (${providerCount} providers)`;

    listing.appendChild(link);

    listingsDiv.appendChild(listing);

    // Click event to zoom to the zipcode on map and highlight
    link.addEventListener('click', (e) => {
      e.preventDefault();
      flyToZip(feature);
      highlightZip(zip);
    });
  });
}

// Function to smoothly fly to selected zipcode
function flyToZip(feature) {
  const bbox = turf.bbox(feature);
  map.fitBounds(bbox, { padding: 50 });
}

// Highlight selected zip
function highlightZip(zip) {
  map.setFilter('zips-highlight', ['==', ['get', 'ZCTA5CE10'], zip]);
}
