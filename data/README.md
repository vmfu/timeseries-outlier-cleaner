# Data Files

This directory contains sample data files for testing the Outlier Cleaner application.

## Data Format

The application expects ASCII text files with the following format:

### Basic Format
```
0.0  10.5  20.3  30.1
1.0  11.2  21.5  31.4
2.0  10.8  20.9  30.8
3.0  12.1  22.3  32.7
...
```

### Format Details

- **Column 1**: Time/X axis values (optional, will be auto-generated if missing)
- **Columns 2+**: Signal data to be cleaned (multiple series supported)
- **Comments**: Lines starting with `#` are ignored
- **Delimiters**: Spaces or tabs between values

### Example Files

#### Simple Single Series
```
0.0  10.5
1.0  11.2
2.0  10.8
3.0  12.1
```

#### Multiple Series
```
0.0  10.5  20.3  30.1
1.0  11.2  21.5  31.4
2.0  10.8  20.9  30.8
3.0  12.1  22.3  32.7
```

#### With Comments
```
# Experimental data from sensor array
# Date: 2026-01-15
# Sampling rate: 1Hz

0.0  10.5  20.3
1.0  11.2  21.5
2.0  10.8  20.9
```

## Guidelines for Creating Test Data

1. **Use realistic values**: Data should resemble actual measurements
2. **Include outliers**: Add some obvious outliers to test detection
3. **Vary patterns**: Include trends, cycles, and noise
4. **Multiple series**: Test with different numbers of columns
5. **Different lengths**: Test with varying dataset sizes

## Processing Large Datasets

- Browser memory limits apply (typically 500MB - 2GB per file)
- For very large datasets, consider splitting into smaller files
- The application uses TypedArrays for efficient memory usage

## Data Privacy

- All data processing happens locally in your browser
- No data is transmitted to external servers
- Ensure you have the right to share any data used for testing
