#!/usr/bin/env python3
"""
Generate noisy sinusoidal time series data for demo purposes.
Each series is a sinusoid with ~55% Gaussian noise.
"""

import numpy as np
import math

# Parameters
num_points = 1000
num_series = 4
noise_level = 0.55  # 55% noise

# Generate time column (0 to 100)
time = np.linspace(0, 100, num_points)

# Generate series with different sinusoids
data = [time]  # First column is time

# Series 1: Base sinusoid (period ~20)
freq1 = 2 * math.pi / 20
series1 = 40 * np.sin(freq1 * time) + 50
noise1 = np.random.normal(0, noise_level * 40, num_points)
data.append(series1 + noise1)

# Series 2: Higher frequency sinusoid (period ~10)
freq2 = 2 * math.pi / 10
series2 = 30 * np.sin(freq2 * time) + 100
noise2 = np.random.normal(0, noise_level * 30, num_points)
data.append(series2 + noise2)

# Series 3: Lower frequency with different phase (period ~25)
freq3 = 2 * math.pi / 25
series3 = 50 * np.sin(freq3 * time + math.pi/4) + 150
noise3 = np.random.normal(0, noise_level * 50, num_points)
data.append(series3 + noise3)

# Series 4: Amplitude modulated sinusoid (period ~15, modulation ~50)
carrier_freq = 2 * math.pi / 15
mod_freq = 2 * math.pi / 50
modulation = 0.5 + 0.5 * np.sin(mod_freq * time)
series4 = 60 * modulation * np.sin(carrier_freq * time) + 200
noise4 = np.random.normal(0, noise_level * 60 * 0.75, num_points)
data.append(series4 + noise4)

# Add some outliers to make it interesting for the demo
# Randomly flip some values to simulate severe outliers
np.random.seed(42)
for series_idx in range(1, num_series + 1):
    num_outliers = int(num_points * 0.02)  # 2% outliers
    outlier_indices = np.random.choice(num_points, num_outliers, replace=False)
    for idx in outlier_indices:
        data[series_idx][idx] += np.random.choice([-1, 1]) * np.random.uniform(50, 80)

# Transpose and save
data_transposed = np.array(data).T

# Save as ASCII text file (MATLAB compatible format)
np.savetxt('demo-data.txt', data_transposed, fmt='%.6f', delimiter='\t')

print(f"Generated demo-data.txt with {num_points} points and {num_series} series")
print(f"Noise level: {noise_level * 100}%")
print(f"Outliers: ~2% per series")
