// === Configuration ===
var mapboxAccessToken = 'your-mapbox-token';
var mapStyle = 'mapbox://styles/mapbox/light-v10';
var datasets = ['dataset'];
var mapDiv = document.getElementById("map");
var listingsDiv = document.getElementById("listings");

// === Domo query setup ===
var query = `/data/v1/${datasets[0]}?limit=30000`;

// === Mapbox init ===
mapboxgl.accessToken = mapboxAccessToken;
var map = new mapboxgl.Map({
    container: mapDiv,
    style: mapStyle,
    center: [-95, 40], // center of the US
    zoom: 3,
    scrollZoom: true
});

map.on("load", function () {
    domo.get(query).then(processData);
});

// === Data processing ===
function processData(dataRows) {
    const geoJSON = {
        type: 'FeatureCollection',
        features: []
    };

    const providerToZipMap = {};

    dataRows.forEach(row => {
        const zip = row['ZCTA5CE10'];
        const providers = JSON.parse(row['providers']); // turn string into array
        const geometry = JSON.parse(row['geometry']);   // turn string into geojson object

        geoJSON.features.push({
            type: 'Feature',
            geometry: geometry,
            properties: {
                zip: zip,
                providers: providers
            }
        });

        // Map each provider to associated ZIPs
        providers.forEach(provider => {
            if (!providerToZipMap[provider]) {
                providerToZipMap[provider] = [];
            }
            providerToZipMap[provider].push(zip);
        });
    });

    // Add geojson source and layer
    map.addSource('zipcodes', {
        type: 'geojson',
        data: geoJSON
    });

    map.addLayer({
        id: 'zipcodes-fill',
        type: 'fill',
        source: 'zipcodes',
        paint: {
            'fill-color': '#ccc',
            'fill-opacity': 0.4
        }
    });

    map.addLayer({
        id: 'zipcodes-highlight',
        type: 'line',
        source: 'zipcodes',
        paint: {
            'line-color': '#007cbf',
            'line-width': 2
        },
        filter: ['in', 'zip', ''] // default empty filter
    });

    buildSidebar(Object.keys(providerToZipMap).sort(), providerToZipMap);
}

// === Build the clickable sidebar ===
function buildSidebar(providers, providerToZipMap) {
    listingsDiv.innerHTML = '';
    providers.forEach(name => {
        const btn = document.createElement('button');
        btn.className = 'provider-btn';
        btn.innerText = name;
        btn.onclick = () => highlightZipcodes(providerToZipMap[name]);
        listingsDiv.appendChild(btn);
    });
}

// === Highlight zipcodes on click ===
function highlightZipcodes(zipcodeList) {
    map.setFilter('zipcodes-highlight', ['in', ['get', 'zip'], ['literal', zipcodeList]]);

    const features = map.querySourceFeatures('zipcodes', {
        sourceLayer: 'zipcodes'
    });

    // Find only visible features that match the filter
    const visible = features.filter(f => zipcodeList.includes(f.properties.zip));

    if (visible.length === 0) return;

    // Collect all polygon coordinates
    const coords = visible.flatMap(f => {
        const geom = f.geometry.coordinates;
        return f.geometry.type === 'Polygon' ? geom[0] : geom.flat(1);
    });

    const bounds = coords.reduce((b, coord) => b.extend(coord), new mapboxgl.LngLatBounds(coords[0], coords[0]));

    map.fitBounds(bounds, {
        padding: 40,
        duration: 1000
    });
}
