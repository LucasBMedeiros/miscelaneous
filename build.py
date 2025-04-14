#!/usr/bin/env python3
"""
build.py – merge provider CSV with ZCTA polygons and emit
both a dev‑friendly GeoJSON *and* production‑ready vector tiles.
"""
import pathlib, json, subprocess
import pandas as pd
import geopandas as gpd

ROOT   = pathlib.Path(__file__).parent
RAW    = ROOT / "raw"
BUILD  = ROOT / "build"
BUILD.mkdir(exist_ok=True)

# 1) read & normalise the CSV -----------------------------------------------
df = (
    pd.read_csv(RAW / "providers_anon.csv", dtype=str)
      .rename(columns=lambda c: c.strip().lower())          # servicename → servicename
      .assign(zipcode=lambda d: d["zipcode"].str.zfill(5))  # 04109 not 4109
)

# group into {zip: [provider1, provider2, …]}
providers_by_zip = (
    df.groupby("zipcode")["servicename"]
      .apply(lambda s: sorted(set(s.str.strip())))
      .to_dict()
)

# 2) load polygons with GeoPandas -------------------------------------------
gdf = gpd.read_file(RAW / "zipcode.json")
ZIP_KEY = "ZCTA5CE10"        # change if your file differs

gdf["providers"] = gdf[ZIP_KEY].map(providers_by_zip).fillna("").apply(list)

# 3) write merged GeoJSON (dev) ---------------------------------------------
geojson_path = BUILD / "zipcodes-with-providers.geojson"
gdf.to_file(geojson_path, driver="GeoJSON")
print("✅  wrote", geojson_path.relative_to(ROOT))