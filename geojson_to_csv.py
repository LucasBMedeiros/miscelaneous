#!/usr/bin/env python3
"""
geojson_to_csv.py
-----------------
Reads zipcodes-with-providers.geojson and writes
zipcodes-with-providers.csv with columns:

    zipcode   providers          geom_wkt
    06902     Provider 001|...   POLYGON ((-73.41 41.42, ...))

• providers are pipe‑separated so you can split later in Beast Mode or SQL
• geometry is WKT (works with most GIS tools and databases)
"""
import json, csv, pathlib, shapely.geometry as sg, shapely.wkt as swkt

INFILE  = pathlib.Path("build/zipcodes-with-providers.geojson")
OUTFILE = pathlib.Path("upload/zipcodes-with-providers.csv")
OUTFILE.parent.mkdir(exist_ok=True)

with INFILE.open() as f:
    gj = json.load(f)

with OUTFILE.open("w", newline="") as f:
    writer = csv.writer(f)
    writer.writerow(["zipcode", "providers", "geom_wkt"])

    for feat in gj["features"]:
        zip5  = feat["properties"]["ZCTA5CE10"]
        provs = "|".join(feat["properties"]["providers"])
        geom  = sg.shape(feat["geometry"])      # GeoJSON -> shapely geometry
        wkt   = swkt.dumps(geom, rounding_precision=5)

        writer.writerow([zip5, provs, wkt])

print(f"✅ wrote {OUTFILE} ({OUTFILE.stat().st_size/1_048_576:.2f} MB)")
