map.on('load', function() {
    map.addSource('zipcodes', {
        type: 'geojson',
        data: 'https://zipcode-mapbox-data.s3.us-east-1.amazonaws.com/zipcodes-with-providers.geojson'
    });

    map.addLayer({
        'id': 'zipcodes-layer',
        'type': 'fill',
        'source': 'zipcodes',
        'paint': {
            'fill-color': '#627BC1',
            'fill-opacity': 0.1
        }
    });

    fetch('https://zipcode-mapbox-data.s3.us-east-1.amazonaws.com/zipcodes-with-providers.geojson')
    .then(response => response.json())
    .then(data => {
        originalGeoJSON = data; 
        providersData = getProvidersFromGeoJSON(data);
        buildProviderSidebar(providersData);
    });
});




function getProvidersFromGeoJSON(geojson) {
    let providersData = {};
    geojson.features.forEach(feature => {
        const zip = feature.properties.ZCTA5CE10;
        const providersList = feature.properties.providers; // Assuming this is a comma-separated string

        providersList.split(",").forEach(provider => {
            provider = provider.trim();
            if (!providersData[provider]) {
                providersData[provider] = [];
            }
            providersData[provider].push(zip);
        });
    });
    return providersData;
}






function buildProviderSidebar(providersData) {
    const listingsDiv = document.getElementById('listings');
    listingsDiv.innerHTML = '';

    Object.keys(providersData).forEach(provider => {
        let listing = document.createElement('div');
        listing.className = 'item';
        listing.innerHTML = `<a href="#">${provider}</a>`;
        
        listing.addEventListener('click', function() {
            highlightProviderZipcodes(providersData[provider]);
        });

        listingsDiv.appendChild(listing);
    });
}





function highlightProviderZipcodes(zipcodes) {
    // Remove previous highlights
    if(map.getLayer('highlighted-zipcodes')){
        map.removeLayer('highlighted-zipcodes');
        map.removeSource('highlighted-zipcodes');
    }

    const highlightedFeatures = originalGeoJSON.features.filter(feature =>
        zipcodes.includes(feature.properties.ZCTA5CE10)
    );

    map.addSource('highlighted-zipcodes', {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: highlightedFeatures
        }
    });

    map.addLayer({
        id: 'highlighted-zipcodes',
        type: 'fill',
        source: 'highlighted-zipcodes',
        paint: {
            'fill-color': '#00FFFF',
            'fill-opacity': 0.5
        }
    });

    // Zoom smoothly
    const bounds = new mapboxgl.LngLatBounds();
    highlightedFeatures.forEach(feature => {
        feature.geometry.coordinates[0].forEach(coord => bounds.extend(coord));
    });

    map.fitBounds(bounds, { padding: 50 });
}
