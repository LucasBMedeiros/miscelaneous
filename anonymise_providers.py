#!/usr/bin/env python3
import pandas as pd
from pathlib import Path

DATA_DIR   = Path("raw")                # adjust if your CSV lives elsewhere
SRC_CSV    = DATA_DIR / "providers.csv"
ANON_CSV   = DATA_DIR / "providers_anon.csv"
ALIAS_CSV  = DATA_DIR / "provider_aliases.csv"

# ---------------------------------------------------------------------------
# 1) read the original file
# ---------------------------------------------------------------------------
df = pd.read_csv(SRC_CSV, dtype=str)         # keep ZIPs as strings
df.columns = df.columns.str.lower().str.strip()

# ---------------------------------------------------------------------------
# 2) build a deterministic alias for each unique provider name
# ---------------------------------------------------------------------------
unique_names = sorted(df["servicename"].unique())     # deterministic order
alias_map = {
    real: f"Provider {i:03d}"            # Provider 001, Provider 002, …
    for i, real in enumerate(unique_names, start=1)
}

# apply the mapping
df["servicename"] = df["servicename"].map(alias_map)

# ---------------------------------------------------------------------------
# 3) write the anonymised CSV and the lookup table
# ---------------------------------------------------------------------------
ANON_CSV.parent.mkdir(parents=True, exist_ok=True)
df.to_csv(ANON_CSV, index=False)

pd.Series(alias_map).rename_axis("real_name").to_frame("alias").to_csv(ALIAS_CSV)

print(f"✅ wrote {ANON_CSV}")
print(f"🔒 wrote {ALIAS_CSV} (keep this private)")
