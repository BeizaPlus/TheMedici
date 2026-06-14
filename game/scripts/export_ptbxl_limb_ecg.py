#!/usr/bin/env python3
"""Export PTB-XL limb-lead waveform for ECG Vector Lab (PhysioNet open data).

Source: PTB-XL v1.0.3 — record 00001_hr (records500/00000)
GitHub catalogue: https://github.com/vlbthambawita/ECGDatasets
PhysioNet: https://physionet.org/content/ptb-xl/1.0.3/
License: CC BY 4.0
"""
from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
import wfdb

PN_DIR = "ptb-xl/1.0.3/records500/00000"
RECORD = "00001_hr"
TARGET_FS = 100
LIMB_MAP = {
    "I": "I",
    "II": "II",
    "III": "III",
    "aVR": "AVR",
    "aVL": "AVL",
    "aVF": "AVF",
}
OUT = Path(__file__).resolve().parents[1] / "assets" / "ecg-ptbxl-00001-limb-leads.json"


def estimate_hr_bpm(signal: np.ndarray, fs: float) -> float:
    """Pan-Tompkins-lite: find R peaks on lead II derivative."""
    x = signal.astype(np.float64)
    if len(x) < fs * 2:
        return 72.0
    # bandpass-ish via diff + square
    d = np.diff(x, prepend=x[0])
    env = np.convolve(d * d, np.ones(int(0.08 * fs)) / max(1, int(0.08 * fs)), mode="same")
    thresh = float(np.percentile(env, 92))
    min_dist = int(0.28 * fs)
    peaks: list[int] = []
    i = int(0.2 * fs)
    while i < len(env) - int(0.1 * fs):
        if env[i] >= thresh and (not peaks or i - peaks[-1] >= min_dist):
            # refine to local max on raw signal
            lo = max(0, i - int(0.04 * fs))
            hi = min(len(x), i + int(0.04 * fs))
            i = int(lo + np.argmax(x[lo:hi]))
            peaks.append(i)
        i += 1
    if len(peaks) < 2:
        return 72.0
    rr = np.diff(peaks) / fs
    rr = rr[(rr > 0.35) & (rr < 1.5)]
    if len(rr) == 0:
        return 72.0
    return float(round(60.0 / np.median(rr)))


def downsample(sig: np.ndarray, fs_in: float, fs_out: float) -> np.ndarray:
    if fs_out >= fs_in:
        return sig.astype(np.float64)
    factor = int(round(fs_in / fs_out))
    n = (len(sig) // factor) * factor
    trimmed = sig[:n].reshape(-1, factor)
    return trimmed.mean(axis=1)


def main() -> None:
    rec = wfdb.rdrecord(RECORD, pn_dir=PN_DIR)
    fs_in = float(rec.fs)
    duration_sec = rec.sig_len / fs_in

    leads_out: dict[str, list[float]] = {}
    for lab_key, src_name in LIMB_MAP.items():
        try:
            ch = rec.sig_name.index(src_name)
        except ValueError:
            ch = rec.sig_name.index(src_name.upper())
        sig = rec.p_signal[:, ch]
        ds = downsample(sig, fs_in, TARGET_FS)
        # mV, 2 decimals — keeps JSON small
        leads_out[lab_key] = ds

    hr = estimate_hr_bpm(leads_out["II"], TARGET_FS)
    for k, arr in list(leads_out.items()):
        leads_out[k] = [round(float(v), 3) for v in arr]

    payload = {
        "version": 1,
        "source": {
            "dataset": "PTB-XL",
            "version": "1.0.3",
            "record": "records500/00000/00001_hr",
            "physionet": "https://physionet.org/content/ptb-xl/1.0.3/",
            "githubCatalog": "https://github.com/vlbthambawita/ECGDatasets",
            "license": "CC BY 4.0",
        },
        "fs": TARGET_FS,
        "durationSec": round(duration_sec, 3),
        "hrBpm": hr,
        "units": "mV",
        "leads": leads_out,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    n = len(leads_out["II"])
    print(f"Wrote {OUT} ({n} samples/lead @ {TARGET_FS} Hz, HR~{hr} BPM)")


if __name__ == "__main__":
    main()
