#!/usr/bin/env python3
"""Generate loopable mono WAV ambience for Biohead (royalty-free, synthetic)."""
from __future__ import annotations

import math
import random
import struct
import wave
from pathlib import Path

SR = 22050
DURATION = 10.0
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "assets" / "sounds"


def write_wav(name: str, samples: list[float]) -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / name
    with wave.open(str(path), "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        for s in samples:
            v = max(-1.0, min(1.0, s))
            w.writeframes(struct.pack("<h", int(v * 32000)))


def soft_env(i: int, n: int) -> float:
    """Fade in/out to reduce click when looped."""
    f = 0.02
    a = min(1.0, i / (n * f))
    b = min(1.0, (n - 1 - i) / (n * f))
    return min(a, b)


def neutral(n: int) -> list[float]:
    out = []
    for i in range(n):
        t = i / SR
        # Slow beating tones
        s = (
            0.04 * math.sin(2 * math.pi * 1.7 * t)
            + 0.03 * math.sin(2 * math.pi * 2.3 * t + 1.2)
            + 0.025 * math.sin(2 * math.pi * 55 * t)
        )
        out.append(s * soft_env(i, n))
    return out


def wind_noise(n: int) -> list[float]:
    random.seed(42)
    b0 = b1 = b2 = 0.0
    out = []
    for i in range(n):
        w = random.gauss(0, 1)
        b0 = 0.995 * b0 + 0.005 * w
        b1 = 0.98 * b1 + 0.02 * w
        b2 = 0.92 * b2 + 0.08 * w
        s = 0.65 * b0 + 0.25 * b1 + 0.1 * b2
        out.append(0.22 * s * soft_env(i, n))
    return out


def chirp(t0: float, i: int, sr: int, f0: float, f1: float, dur: float) -> float:
    """Short bird-like chirp at sample i if within [t0, t0+dur]."""
    t = i / sr
    if t < t0 or t > t0 + dur:
        return 0.0
    u = (t - t0) / dur
    f = f0 + (f1 - f0) * u
    phase = 2 * math.pi * (f0 * (t - t0) + 0.5 * (f1 - f0) / dur * (t - t0) ** 2)
    env = math.sin(math.pi * u) ** 2
    return 0.12 * env * math.sin(phase)


def birds(n: int) -> list[float]:
    random.seed(7)
    chirps: list[tuple[float, float, float, float]] = []
    t = 0.4
    while t < DURATION - 0.15:
        chirps.append(
            (
                t,
                random.uniform(1800, 3200),
                random.uniform(2600, 4500),
                random.uniform(0.04, 0.09),
            )
        )
        t += random.uniform(0.35, 1.1)

    base = wind_noise(n)
    out = []
    for i in range(n):
        c = 0.0
        for row in chirps:
            t0, f0, f1, dur = row[0], row[1], row[2], row[3]
            c += chirp(t0, i, SR, f0, f1, dur)
        v = 0.35 * base[i] + c
        out.append(v * soft_env(i, n))
    return out


def forest(n: int) -> list[float]:
    random.seed(11)
    wn = wind_noise(n)
    chirps: list[tuple[float, float, float, float]] = []
    t = 0.8
    while t < DURATION - 0.2:
        chirps.append(
            (
                t,
                random.uniform(1400, 2800),
                random.uniform(2200, 3800),
                random.uniform(0.05, 0.12),
            )
        )
        t += random.uniform(0.9, 2.2)
    out = []
    for i in range(n):
        c = sum(chirp(t0, i, SR, f0, f1, dur) for t0, f0, f1, dur in chirps)
        v = 0.55 * wn[i] + 0.45 * c * 0.7
        out.append(v * soft_env(i, n))
    return out


def rain(n: int) -> list[float]:
    random.seed(99)
    leak = 0.0
    out = []
    for i in range(n):
        r = random.gauss(0, 1)
        leak = 0.9 * leak + 0.1 * r
        sprinkle = random.gauss(0, 1)
        v = 0.16 * (0.45 * leak + 0.55 * sprinkle)
        out.append(v * soft_env(i, n))
    return out


def waves(n: int) -> list[float]:
    random.seed(3)
    b = 0.0
    out = []
    for i in range(n):
        t = i / SR
        swell = 0.5 + 0.5 * math.sin(2 * math.pi * 0.12 * t)
        w = random.gauss(0, 1)
        b = 0.97 * b + 0.03 * w
        low = 0.08 * math.sin(2 * math.pi * 45 * t + b)
        v = swell * (0.15 * b + low)
        out.append(v * soft_env(i, n))
    return out


def main() -> None:
    n = int(SR * DURATION)
    write_wav("ambient_neutral.wav", neutral(n))
    write_wav("ambient_wind.wav", wind_noise(n))
    write_wav("ambient_birds.wav", birds(n))
    write_wav("ambient_forest.wav", forest(n))
    write_wav("ambient_rain.wav", rain(n))
    write_wav("ambient_waves.wav", waves(n))
    print("Wrote 6 ambience files to", OUT)


if __name__ == "__main__":
    main()
