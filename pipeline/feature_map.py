"""
Feature alignment between CIC-IDS-2017 (source) and UNSW-NB15 (target).
Defines the 16 harmonized features and their extraction logic.
"""

import os
import json
import numpy as np
import pandas as pd

FEATURE_DEFINITIONS = [
    {
        "name": "flow_duration_us",
        "description": "Total duration of the flow in microseconds",
        "cic_col": "Flow Duration",
        "unsw_derivation": "dur * 1e6",
        "log_transform": True
    },
    {
        "name": "total_fwd_packets",
        "description": "Total packets transmitted in forward direction",
        "cic_col": "Total Fwd Packets",
        "unsw_derivation": "spkts",
        "log_transform": True
    },
    {
        "name": "total_bwd_packets",
        "description": "Total packets transmitted in backward direction",
        "cic_col": "Total Backward Packets",
        "unsw_derivation": "dpkts",
        "log_transform": True
    },
    {
        "name": "total_fwd_bytes",
        "description": "Total volume of forward payload in bytes",
        "cic_col": "Total Length of Fwd Packets",
        "unsw_derivation": "sbytes",
        "log_transform": True
    },
    {
        "name": "total_bwd_bytes",
        "description": "Total volume of backward payload in bytes",
        "cic_col": "Total Length of Bwd Packets",
        "unsw_derivation": "dbytes",
        "log_transform": True
    },
    {
        "name": "fwd_pkt_len_mean",
        "description": "Mean forward packet length in bytes",
        "cic_col": "Fwd Packet Length Mean",
        "unsw_derivation": "smean",
        "log_transform": True
    },
    {
        "name": "bwd_pkt_len_mean",
        "description": "Mean backward packet length in bytes",
        "cic_col": "Bwd Packet Length Mean",
        "unsw_derivation": "dmean",
        "log_transform": True
    },
    {
        "name": "flow_bytes_per_s",
        "description": "Flow rate in bytes per second",
        "cic_col": "Flow Bytes/s",
        "unsw_derivation": "(sbytes + dbytes) / dur",
        "log_transform": True
    },
    {
        "name": "flow_pkts_per_s",
        "description": "Flow rate in packets per second",
        "cic_col": "Flow Packets/s",
        "unsw_derivation": "(spkts + dpkts) / dur",
        "log_transform": True
    },
    {
        "name": "fwd_pkts_per_s",
        "description": "Forward packet rate in packets per second",
        "cic_col": "Fwd Packets/s",
        "unsw_derivation": "spkts / dur",
        "log_transform": True
    },
    {
        "name": "bwd_pkts_per_s",
        "description": "Backward packet rate in packets per second",
        "cic_col": "Bwd Packets/s",
        "unsw_derivation": "dpkts / dur",
        "log_transform": True
    },
    {
        "name": "fwd_iat_mean_us",
        "description": "Mean forward inter-arrival time in microseconds",
        "cic_col": "Fwd IAT Mean",
        "unsw_derivation": "sinpkt * 1000",
        "log_transform": True
    },
    {
        "name": "bwd_iat_mean_us",
        "description": "Mean backward inter-arrival time in microseconds",
        "cic_col": "Bwd IAT Mean",
        "unsw_derivation": "dinpkt * 1000",
        "log_transform": True
    },
    {
        "name": "avg_pkt_size",
        "description": "Average packet size across both directions",
        "cic_col": "Average Packet Size",
        "unsw_derivation": "(sbytes + dbytes) / (spkts + dpkts)",
        "log_transform": True
    },
    {
        "name": "down_up_ratio",
        "description": "Ratio of backward to forward packet count",
        "cic_col": "Down/Up Ratio",
        "unsw_derivation": "floor(dpkts / spkts)",
        "log_transform": False
    },
    {
        "name": "init_win_fwd",
        "description": "TCP initial window size for forward connection",
        "cic_col": "Init_Win_bytes_forward",
        "unsw_derivation": "swin",
        "log_transform": True
    }
]

FEATURE_NAMES = [f["name"] for f in FEATURE_DEFINITIONS]

EXCLUDED_ARTIFACTS = [
    {"name": "Source IP / Destination IP", "reason": "Environment-specific artifact; leads to shortcut memorization."},
    {"name": "Source Port / Destination Port", "reason": "Direct protocol signature artifact; discarded to avoid domain-specific port binding."},
    {"name": "Timestamp", "reason": "Temporal correlation bias between training and testing captures."},
    {"name": "UNSW sttl / dttl", "reason": "TTL hops reveal network topology instead of generalizable traffic behavior."},
    {"name": "UNSW stcpb / dtcpb", "reason": "TCP sequence base numbers are OS-randomized artifacts."},
    {"name": "UNSW proto / service / state", "reason": "Categorical attributes without standardized mappings between datasets."}
]

def export_feature_map(output_path):
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "features": FEATURE_DEFINITIONS,
            "feature_names": FEATURE_NAMES,
            "excluded_artifacts": EXCLUDED_ARTIFACTS
        }, f, indent=2)
    print(f"Exported feature map to {output_path}")

def extract_cic_features(df):
    """Clean and extract the 16 harmonized features from a CIC-IDS-2017 DataFrame."""
    # Strip whitespace from column names
    df.columns = [c.strip() for c in df.columns]
    
    extracted = pd.DataFrame()
    for feat in FEATURE_DEFINITIONS:
        col = feat["cic_col"]
        if col in df.columns:
            extracted[feat["name"]] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
        else:
            print(f"Warning: Column {col} missing in CIC slice, defaulting to 0.0")
            extracted[feat["name"]] = 0.0

    # Clean Init_Win_bytes_forward (-1 -> 0)
    if "init_win_fwd" in extracted.columns:
        extracted["init_win_fwd"] = extracted["init_win_fwd"].apply(lambda x: 0.0 if x < 0 else x)

    # Replace inf and -inf
    extracted.replace([np.inf, -np.inf], 0.0, inplace=True)
    extracted.fillna(0.0, inplace=True)
    return extracted

def extract_unsw_features(df):
    """Extract and derive the 16 harmonized features from a UNSW-NB15 DataFrame."""
    df.columns = [c.strip().lower() for c in df.columns]
    
    dur = pd.to_numeric(df.get("dur", 0), errors="coerce").fillna(0.0).clip(lower=0.0)
    spkts = pd.to_numeric(df.get("spkts", 0), errors="coerce").fillna(0.0).clip(lower=0.0)
    dpkts = pd.to_numeric(df.get("dpkts", 0), errors="coerce").fillna(0.0).clip(lower=0.0)
    sbytes = pd.to_numeric(df.get("sbytes", 0), errors="coerce").fillna(0.0).clip(lower=0.0)
    dbytes = pd.to_numeric(df.get("dbytes", 0), errors="coerce").fillna(0.0).clip(lower=0.0)
    smean = pd.to_numeric(df.get("smean", 0), errors="coerce").fillna(0.0).clip(lower=0.0)
    dmean = pd.to_numeric(df.get("dmean", 0), errors="coerce").fillna(0.0).clip(lower=0.0)
    sinpkt = pd.to_numeric(df.get("sinpkt", 0), errors="coerce").fillna(0.0).clip(lower=0.0)
    dinpkt = pd.to_numeric(df.get("dinpkt", 0), errors="coerce").fillna(0.0).clip(lower=0.0)
    swin = pd.to_numeric(df.get("swin", 0), errors="coerce").fillna(0.0).clip(lower=0.0)

    # Safe divisions
    safe_dur = np.where(dur > 0, dur, 1e-6)
    total_pkts = spkts + dpkts
    safe_pkts = np.where(total_pkts > 0, total_pkts, 1.0)
    safe_spkts = np.where(spkts > 0, spkts, 1.0)

    extracted = pd.DataFrame({
        "flow_duration_us": dur * 1e6,
        "total_fwd_packets": spkts,
        "total_bwd_packets": dpkts,
        "total_fwd_bytes": sbytes,
        "total_bwd_bytes": dbytes,
        "fwd_pkt_len_mean": smean,
        "bwd_pkt_len_mean": dmean,
        "flow_bytes_per_s": np.where(dur > 0, (sbytes + dbytes) / safe_dur, 0.0),
        "flow_pkts_per_s": np.where(dur > 0, (spkts + dpkts) / safe_dur, 0.0),
        "fwd_pkts_per_s": np.where(dur > 0, spkts / safe_dur, 0.0),
        "bwd_pkts_per_s": np.where(dur > 0, dpkts / safe_dur, 0.0),
        "fwd_iat_mean_us": sinpkt * 1000.0,
        "bwd_iat_mean_us": dinpkt * 1000.0,
        "avg_pkt_size": (sbytes + dbytes) / safe_pkts,
        "down_up_ratio": np.floor(dpkts / safe_spkts),
        "init_win_fwd": swin
    })

    extracted.replace([np.inf, -np.inf], 0.0, inplace=True)
    extracted.fillna(0.0, inplace=True)
    return extracted
