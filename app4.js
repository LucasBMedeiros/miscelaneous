/* ----------------------------------------------------------------------
   Integrated Mapbox Zipcode-Provider Interaction
---------------------------------------------------------------------- */

// Mapbox initialization
mapboxgl.accessToken = CONFIG.MAPBOX_TOKEN;

const GEOJSON_URL = 'https://zipcode-mapbox-data.s3.us-east-1.amazonaws.com/zipcodes-with-providers.geojson';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v10',
  center: [-96, 37],
  zoom: 3
});

let fullGeo = null;

map.on('load', function() {
    map.addSource('zipcodes', {
        type: 'geojson',
        data: GEOJSON_URL // Your GeoJSON source
    });

    map.addLayer({
        'id': 'zipcodes',
        'type': 'fill',
        'source': 'zipcodes',
        'paint': {
            'fill-color': '#627BC1',
            'fill-opacity': 0.3
        }
    });

    // Fetch provider-zipcode data (adjust as needed)
    domo.get(query).then(dataRows => {
        originalGeoJSON = getGeoJSONFromDomoData(dataRows);
        providersData = transformDataToProviders(originalGeoJSON);
        buildProviderSidebar(providersData);
    });
});

// Converts data to Provider-centric format
function transformDataToProviders(geojson) {
    let providersData = {};
    geojson.features.forEach(feature => {
        const zip = feature.properties.zipcode;
        const providers = feature.properties.providers.split(',');

        providers.forEach(provider => {
            provider = provider.trim();
            if (!providersData[provider]) providersData[provider] = [];
            providersData[provider].push(zip);
        });
    });
    return providersData;
}

// Builds sidebar listing providers
function buildProviderSidebar(providersData) {
    const listingsDiv = document.getElementById('listings');
    listingsDiv.innerHTML = '';

    Object.keys(providersData).forEach(provider => {
        let listing = document.createElement('div');
        listing.className = 'item';
        listing.textContent = provider;
        listing.onclick = () => highlightZipcodes(providersData[provider]);
        listingsDiv.appendChild(listing);
    });
}

// Highlights zipcodes on the map and zooms
function highlightZipcodes(zipcodes) {
    if(map.getLayer('highlighted-zipcodes')) {
        map.removeLayer('highlighted-zipcodes');
        map.removeSource('highlighted-zipcodes');
    }

    const highlighted = originalGeoJSON.features.filter(feature => 
        zipcodes.includes(feature.properties.zipcode)
    );

    map.addSource('highlighted-zipcodes', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: highlighted }
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
    highlighted.forEach(feature => {
        feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
    });
    map.fitBounds(bounds, { padding: 50 });
}

// Util function (existing)
function getGeoJSONFromDomoData(dataRows) {
    const features = dataRows.map(row => ({
        type: 'Feature',
        geometry: {
            type: 'Polygon',
            coordinates: JSON.parse(row[dataLongitudeField]) // Adjust according to actual data
        },
        properties: {
            zipcode: row[dataZipField],
            providers: row[dataProviderField]
        }
    }));

    return { type: 'FeatureCollection', features };
}
