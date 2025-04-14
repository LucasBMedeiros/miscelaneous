// Global variables and Map setup
var mapboxAccessToken = 'YOUR_MAPBOX_ACCESS_TOKEN';
var mapStyle = 'mapbox://styles/mapbox/light-v10';
var GEOJSON_URL = 'https://zipcode-mapbox-data.s3.us-east-1.amazonaws.com/zipcodes-with-providers.geojson';

var map = new mapboxgl.Map({
    container: 'map',
    style: mapStyle,
    center: [-98, 39],
    zoom: 3,
    scrollZoom: true
});

let originalGeoJSON = null;

map.on('load', function() {
    // Load zipcode boundaries
    map.addSource('zipcodes', {
        type: 'geojson',
        data: GEOJSON_URL
    });

    // Default light zip code outlines
    map.addLayer({
        'id': 'zipcodes-layer',
        'type': 'fill',
        'source': 'zipcodes',
        'paint': {
            'fill-color': '#627BC1',
            'fill-opacity': 0.1
        }
    });

    // Fetch GeoJSON and populate provider sidebar
    fetch(GEOJSON_URL)
        .then(response => response.json())
        .then(data => {
            originalGeoJSON = data;
            const providersData = extractProviders(data);
            buildProviderSidebar(providersData);
        });
});

// Extract providers and associated zipcodes
function extractProviders(geojson) {
    let providersData = {};
    geojson.features.forEach(feature => {
        const zip = feature.properties.ZCTA5CE10;
        const providers = feature.properties.providers;

        providers.split(",").forEach(provider => {
            provider = provider.trim();
            if (!providersData[provider]) providersData[provider] = [];
            providersData[provider].push(zip);
        });
    });
    return providersData;
}

// Build Sidebar with providers
function buildProviderSidebar(providersData) {
    const listingsDiv = document.getElementById('listings');
    listingsDiv.innerHTML = '';

    Object.keys(providersData).forEach(provider => {
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML = `<a href="#">${provider}</a>`;

        item.onclick = function() {
            highlightAndZoom(providersData[provider]);
        };

        listingsDiv.appendChild(item);
    });
}

// Highlight zipcodes and zoom
function highlightAndZoom(zipcodes) {
    if (map.getLayer('highlighted-zipcodes')) {
        map.removeLayer('highlighted-zipcodes');
        map.removeSource('highlighted-zipcodes');
    }

    const featuresToHighlight = originalGeoJSON.features.filter(feature => zipcodes.includes(feature.properties.ZCTA5CE10));

    map.addSource('highlighted-zipcodes', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: featuresToHighlight
        }
    });

    map.addLayer({
        id: 'highlighted-zipcodes',
        type: 'fill',
        source: 'highlighted-zipcodes',
        paint: {
            'fill-color': '#00FFFF',
            'fill-opacity': 0.6
        }
    });

    const bounds = new mapboxgl.LngLatBounds();
    featuresToHighlight.forEach(feature => {
        feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
    });

    map.fitBounds(bounds, { padding: 50 });
}

// Popup functionality (optional if needed for markers)
function createPopup(currentFeature) {
    var popups = document.getElementsByClassName('mapboxgl-popup');
    if (popups[0]) popups[0].remove();

    var popupHTML = '';
    if (currentFeature.properties.type) popupHTML += `<h3>${currentFeature.properties.type}</h3>`;
    if (currentFeature.properties.popupDetail) popupHTML += `<p>${currentFeature.properties.popupDetail}</p>`;

    new mapboxgl.Popup({ closeOnClick: false })
        .setLngLat(currentFeature.geometry.coordinates)
        .setHTML(popupHTML)
        .addTo(map);
}