/**
 * main.js - Main application logic
 * Handles UI interactions, file loading, batch processing, and visualization
 */

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

const appState = {
    // Data
    originalData: null,        // Raw loaded data (2D array)
    cleanedData: null,         // Processed data (2D array)
    currentFile: null,         // Current file being processed
    batchQueue: [],            // Files to process

    // Parameters
    params: {
        windowWidth: 40,
        threshold: 1.4,
        matrixSize: 16,
        relativeSize: 4,
        fillMethod: 'nearest',
        numChunks: 3,        // Optimization: number of chunks to select
        useChunks: true      // Optimization: enable chunk selection
    },

    // Optimal parameters from auto-tune
    optimalParams: null,

    // Charts
    dataChart: null,
    NTF: null,                // Normalized Target Function matrix

    // Series cleaning progress
    seriesToClean: 0,
    seriesCleaned: 0,
};

// Worker reference
let worker = null;
let currentJobId = null;

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', function() {
    initializeWorker();
    initializeUI();
    initializeLanguageSwitcher();
    initializeCharts();
    log(I18n.t('log.systemInit'), 'info');

    // Handle window resize
    window.addEventListener('resize', function() {
        if (appState.dataChart) {
            setTimeout(function() {
                appState.dataChart.resize();
            }, 100);
        }
    });
});

/**
 * Initialize Web Worker
 */
function initializeWorker() {
    try {
        console.log('[Main] Попытка загрузить внешний worker...');

        // Add timestamp to prevent caching
        var workerUrl = 'js/worker.js?v=' + Date.now();

        // Try to load worker from file (requires server)
        worker = new Worker(workerUrl);
        worker.onmessage = handleWorkerMessage;
        worker.onerror = handleWorkerError;
        log('Web Worker успешно инициализирован (внешний).', 'success');
    } catch (error) {
        // Fall back to inline worker (works without server)
        console.log('[Main] Ошибка загрузки внешнего worker, использую встроенный...', error);
        log(I18n.t('error.workerLoad'), 'warning');
        console.error('Worker initialization error:', error);
        initializeInlineWorker();
    }
}

/**
 * Initialize inline worker from embedded code (works without server)
 */
function initializeInlineWorker() {
    try {
        // Load worker code from embedded script
        var workerCode = document.getElementById('worker-code').textContent;
        var blob = new Blob([workerCode], { type: 'application/javascript' });
        var workerUrl = URL.createObjectURL(blob);

        worker = new Worker(workerUrl);
        worker.onmessage = handleWorkerMessage;
        worker.onerror = handleWorkerError;

        log(I18n.t('log.workerInit'), 'success');
    } catch (error) {
        log(I18n.t('error.workerInitInternal', {message: error.message}), 'error');
        console.error('Inline worker initialization error:', error);
    }
}

/**
 * Initialize UI event listeners
 */
function initializeUI() {
    // File input
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);

    // Advanced settings toggle
    document.getElementById('advancedToggle').addEventListener('change', toggleAdvancedSettings);

    // Sliders
    const sliders = ['windowWidth', 'threshold', 'matrixSize', 'relativeSize', 'numChunks'];
    sliders.forEach(function(id) {
        var slider = document.getElementById(id);
        var valueDisplay = document.getElementById(id + 'Value');
        if (slider && valueDisplay) {
            slider.addEventListener('input', function() {
                valueDisplay.textContent = this.value;
                if (id === 'relativeSize') {
                    appState.params.relativeSize = parseFloat(this.value);
                } else if (id === 'numChunks') {
                    appState.params.numChunks = parseInt(this.value);
                } else {
                    appState.params[id] = parseFloat(this.value);
                }
            });
        }
    });

    // Optimization checkbox
    document.getElementById('useChunks').addEventListener('change', function() {
        appState.params.useChunks = this.checked;
        if (this.checked) {
            log(I18n.t('msg.optimizationEnabled'), 'info');
        } else {
            log(I18n.t('msg.optimizationDisabled'), 'info');
        }
    });

    // Fill method dropdown
    document.getElementById('fillMethod').addEventListener('change', function() {
        appState.params.fillMethod = this.value;
    });

    // Save options
    document.getElementById('saveRestored').addEventListener('change', function() {
        var validityWrapper = document.getElementById('validityFlagWrapper');
        if (validityWrapper) {
            validityWrapper.style.opacity = this.checked ? '1' : '0.5';
        }
    });

    // Action buttons
    document.getElementById('loadBtn').addEventListener('click', loadData);
    document.getElementById('tuneBtn').addEventListener('click', autoTune);
    document.getElementById('cleanBtn').addEventListener('click', cleanData);
    document.getElementById('saveBtn').addEventListener('click', saveData);

    // Drag & Drop zone
    initializeDragAndDrop();

    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(function(button) {
        button.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
}

/**
 * Initialize language switcher
 */
function initializeLanguageSwitcher() {
    var langButtons = document.querySelectorAll('.lang-button');

    langButtons.forEach(function(button) {
        button.addEventListener('click', function() {
            var lang = this.dataset.lang;

            // Set active state
            langButtons.forEach(function(btn) {
                btn.classList.remove('active');
            });
            this.classList.add('active');

            // Change language
            I18n.setLanguage(lang);

            // Update UI
            updateAllUIText();
        });
    });

    // Set initial active button
    var currentLang = I18n.getLanguage();
    langButtons.forEach(function(button) {
        button.classList.toggle('active', button.dataset.lang === currentLang);
    });
}

/**
 * Update all UI text with current language
 */
function updateAllUIText() {
    // Update chart labels
    if (appState.dataChart) {
        appState.dataChart.options.scales.x.title.text = I18n.t('chart.xAxis');
        appState.dataChart.options.scales.y.title.text = I18n.t('chart.yAxis');
        appState.dataChart.update('none');
    }

    // Update log messages are already handled by i18n.updateAllText()
    I18n.updateAllText();
}

/**
 * Initialize drag and drop functionality
 */
function initializeDragAndDrop() {
    var dropZone = document.getElementById('dropZone');

    if (!dropZone) {
        console.warn('Drop zone element not found');
        return;
    }

    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function(eventName) {
        dropZone.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // Highlight drop zone when dragging file over it
    ['dragenter', 'dragover'].forEach(function(eventName) {
        dropZone.addEventListener(eventName, function() {
            dropZone.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(function(eventName) {
        dropZone.addEventListener(eventName, function() {
            dropZone.classList.remove('drag-over');
        }, false);
    });

    // Handle dropped files
    dropZone.addEventListener('drop', handleDrop, false);
}

/**
 * Prevent default browser behavior for drag events
 */
function preventDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
}

/**
 * Handle dropped files
 */
function handleDrop(event) {
    var dt = event.dataTransfer;
    var files = dt.files;

    if (files.length === 0) {
        return;
    }

    // Filter valid file types
    var validFiles = Array.from(files).filter(function(file) {
        var extension = file.name.split('.').pop().toLowerCase();
        return ['txt', 'dat', 'csv', 'asc'].includes(extension);
    });

    if (validFiles.length === 0) {
        log(I18n.t('dropZone.invalidType'), 'warning');
        return;
    }

    if (validFiles.length !== files.length) {
        log(I18n.t('dropZone.someSkipped'), 'warning');
    }

    // Load files
    appState.batchQueue = validFiles;
    updateFileCount(validFiles.length);
    displaySelectedFiles(validFiles);
    document.getElementById('loadBtn').disabled = false;

    log(I18n.t('msg.filesSelected', {count: validFiles.length}), 'info');
}

/**
 * Initialize Chart.js
 */
function initializeCharts() {
    var ctx = document.getElementById('dataChart').getContext('2d');

    // Dark theme for Chart.js
    Chart.defaults.color = '#00ff88';
    Chart.defaults.borderColor = '#008844';

    appState.dataChart = new Chart(ctx, {
        type: 'line',
        data: {
            datasets: []
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false,
            layout: {
                padding: {
                    top: 10,
                    right: 10,
                    bottom: 10,
                    left: 10
                }
            },
            elements: {
                point: {
                    radius: 0,
                    hitRadius: 10,
                    hoverRadius: 4
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    display: true,
                    title: {
                        display: true,
                        text: 'Время / Индекс',
                        color: '#00aaff',
                        font: {
                            size: 12,
                            family: 'Consolas, monospace'
                        }
                    },
                    ticks: {
                        color: '#00ff88',
                        font: {
                            size: 10,
                            family: 'Consolas, monospace'
                        },
                        maxRotation: 45,
                        minRotation: 0
                    },
                    grid: {
                        color: '#003322',
                        drawBorder: true
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            speed: 0.1
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'x',
                    },
                    pan: {
                        enabled: true,
                        mode: 'x',
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    title: {
                        display: true,
                        text: 'Значение сигнала',
                        color: '#00aaff',
                        font: {
                            size: 12,
                            family: 'Consolas, monospace'
                        }
                    },
                    ticks: {
                        color: '#00ff88',
                        font: {
                            size: 10,
                            family: 'Consolas, monospace'
                        }
                    },
                    grid: {
                        color: '#003322',
                        drawBorder: true
                    },
                    zoom: {
                        wheel: {
                            enabled: true,
                            speed: 0.1
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'y',
                    },
                    pan: {
                        enabled: true,
                        mode: 'y',
                    }
                }
            },
            plugins: {
                zoom: {
                    zoom: {
                        wheel: {
                            enabled: true,
                            speed: 0.1,
                            modifierKey: null
                        },
                        pinch: {
                            enabled: true
                        },
                        mode: 'xy',
                    },
                    pan: {
                        enabled: true,
                        mode: 'xy',
                    },
                    limits: {
                        x: {min: 'original', max: 'original'},
                        y: {min: 'original', max: 'original'}
                    }
                },
                legend: {
                    position: 'top',
                    align: 'start',
                    labels: {
                        color: '#00ff88',
                        font: {
                            size: 11,
                            family: 'Consolas, monospace'
                        },
                        usePointStyle: true,
                        padding: 10,
                        boxWidth: 10
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(10, 10, 15, 0.9)',
                    borderColor: '#00aaff',
                    borderWidth: 1,
                    titleColor: '#00ff88',
                    titleFont: {
                        family: 'Consolas, monospace',
                        size: 12
                    },
                    bodyColor: '#00cc66',
                    bodyFont: {
                        family: 'Consolas, monospace',
                        size: 11
                    },
                    padding: 10,
                    displayColors: true
                }
            }
        }
    });
}

// ============================================================================
// FILE HANDLING
// ============================================================================

/**
 * Handle file selection
 */
function handleFileSelect(event) {
    var files = Array.from(event.target.files);

    if (files.length === 0) {
        return;
    }

    appState.batchQueue = files;
    updateFileCount(files.length);
    displaySelectedFiles(files);

    document.getElementById('loadBtn').disabled = false;

    log(I18n.t('msg.filesSelected', {count: files.length}), 'info');
}

/**
 * Update file count display
 */
function updateFileCount(count) {
    document.getElementById('fileCount').textContent = I18n.t('file.count', {count: count});
}

/**
 * Display selected files in list
 */
function displaySelectedFiles(files) {
    var container = document.getElementById('selectedFiles');
    container.innerHTML = '';

    files.forEach(function(file, index) {
        var div = document.createElement('div');
        div.className = 'file-item';
        div.textContent = (index + 1) + '. ' + file.name + ' (' + formatFileSize(file.size) + ')';
        container.appendChild(div);
    });
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

/**
 * Load and parse data from selected files
 */
function loadData() {
    if (appState.batchQueue.length === 0) {
        log(I18n.t('msg.noFiles'), 'warning');
        return;
    }

    var file = appState.batchQueue[0];
    appState.currentFile = file;

    log(I18n.t('msg.loading', {name: file.name}), 'info');

    readFileContent(file).then(function(content) {
        var data = parseAsciiData(content);

        if (data.length === 0) {
            throw new Error('Файл не содержит данных');
        }

        appState.originalData = data;
        appState.cleanedData = null;
        appState.NTF = null;
        appState.optimalParams = null;
        appState.seriesMetrics = []; // Reset stored metrics

        updateFileInfo(file, data);

        // Update chart
        updateDataChart(data, null);

        // Force chart resize after update
        setTimeout(function() {
            if (appState.dataChart) {
                appState.dataChart.resize();
            }
        }, 100);

        // Reset file info optimal params
        document.getElementById('infoOptWindow').textContent = '--';
        document.getElementById('infoOptThreshold').textContent = '--';

        // Enable buttons
        document.getElementById('tuneBtn').disabled = false;
        document.getElementById('cleanBtn').disabled = true;
        document.getElementById('saveBtn').disabled = true;

        log(I18n.t('msg.loaded', {points: data.length, series: data[0].length - 1}), 'success');
        log(I18n.t('msg.readyTune'), 'info');

    }).catch(function(error) {
        log(I18n.t('error.fileLoad', {message: error.message}), 'error');
        console.error('File loading error:', error);
    });
}

/**
 * Read file content as text
 */
function readFileContent(file) {
    return new Promise(function(resolve, reject) {
        var reader = new FileReader();
        reader.onload = function(e) {
            resolve(e.target.result);
        };
        reader.onerror = function(e) {
            reject(e);
        };
        reader.readAsText(file);
    });
}

/**
 * Parse ASCII data file content
 */
function parseAsciiData(content) {
    var lines = content.trim().split('\n');
    var data = [];

    for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        var trimmed = line.trim();

        // Skip comments and empty lines
        if (trimmed === '' || trimmed.startsWith('#') || trimmed.startsWith('%')) {
            continue;
        }

        // Parse values (handle tab, space, comma separators)
        var values = trimmed.split(/[\s,]+/)
            .map(function(v) { return parseFloat(v); })
            .filter(function(v) { return !isNaN(v); });

        if (values.length > 0) {
            data.push(values);
        }
    }

    // If no time column, add one
    if (data.length > 0 && data.every(function(row) { return row.length === 1; })) {
        for (var i = 0; i < data.length; i++) {
            data[i] = [i, data[i][0]];
        }
    }

    return data;
}

// ============================================================================
// UI UPDATES
// ============================================================================

/**
 * Update file info panel
 */
function updateFileInfo(file, data) {
    document.getElementById('infoFilename').textContent = file.name;
    document.getElementById('infoSize').textContent = formatFileSize(file.size);
    document.getElementById('infoPoints').textContent = data.length;
    document.getElementById('infoSeries').textContent = data[0].length - 1;
    document.getElementById('infoOptWindow').textContent = '--';
    document.getElementById('infoOptThreshold').textContent = '--';
}

/**
 * Update metrics display
 */
function updateMetrics(metrics) {
    document.getElementById('metricSTDF').textContent = metrics.STDF ? metrics.STDF.toFixed(4) : '--';
    document.getElementById('metricDF').textContent = metrics.DF ? metrics.DF.toFixed(4) : '--';
    document.getElementById('metricASNR').textContent = metrics.ASNR ? metrics.ASNR.toFixed(2) : '--';
    document.getElementById('metricRMSE').textContent = metrics.ARMSE ? metrics.ARMSE.toFixed(4) : '--';
    document.getElementById('metricRSquared').textContent = metrics.R_squared ? metrics.R_squared.toFixed(4) : '--';
    document.getElementById('metricPearson').textContent = metrics.R_Pirs ? metrics.R_Pirs.toFixed(4) : '--';
}

/**
 * Toggle advanced settings visibility
 */
function toggleAdvancedSettings() {
    var settings = document.getElementById('advancedSettings');
    var isVisible = document.getElementById('advancedToggle').checked;

    if (isVisible) {
        settings.classList.remove('hidden');
        log(I18n.t('msg.settingsShown'), 'info');
    } else {
        settings.classList.add('hidden');
        log(I18n.t('msg.settingsHidden'), 'info');
    }
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(function(btn) {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(function(pane) {
        pane.classList.remove('active');
    });

    var targetPane = document.getElementById(tabName + 'Tab');
    if (targetPane) {
        targetPane.classList.add('active');
    }

    // Resize chart after tab switch
    setTimeout(function() {
        if (appState.dataChart && tabName === 'data') {
            appState.dataChart.resize();
        }
    }, 50);
}

/**
 * Update progress bar (flat top bar)
 */
function updateProgress(value, message) {
    var progressBar = document.getElementById('progressBar');
    var progressFill = document.getElementById('progressFill');
    var progressPercent = document.getElementById('progressPercent');
    var progressMessage = document.getElementById('progressMessage');

    if (!progressBar) return;

    if (value >= 0 && value <= 100) {
        progressBar.classList.remove('hidden');
        progressBar.classList.add('visible');
        progressFill.style.width = value + '%';
        progressPercent.textContent = Math.round(value) + '%';
    }

    if (message) {
        progressMessage.textContent = message;
        // Log progress messages periodically
        if (value % 10 === 0 || value === 100) {
            log(message, 'info');
        }
    }
}

/**
 * Add log entry
 */
function log(message, type) {
    type = type || 'info';
    var logArea = document.getElementById('logArea');
    var now = new Date();
    var time = now.toTimeString().split(' ')[0];

    var entry = document.createElement('div');
    entry.className = 'log-entry log-' + type;
    entry.innerHTML = '<span class="log-time">' + time + '</span><span class="log-message">' + message + '</span>';

    logArea.appendChild(entry);
    logArea.scrollTop = logArea.scrollHeight;
}

/**
 * Show/hide progress bar (replaces old loading overlay)
 */
function showLoadingOverlay(show) {
    var progressBar = document.getElementById('progressBar');

    if (show) {
        if (progressBar) {
            progressBar.classList.remove('hidden');
            progressBar.classList.add('visible');
        }
        // Disable all action buttons
        document.getElementById('loadBtn').disabled = true;
        document.getElementById('tuneBtn').disabled = true;
        document.getElementById('cleanBtn').disabled = true;
        document.getElementById('saveBtn').disabled = true;
        // Disable file input
        document.getElementById('fileInput').disabled = true;
    } else {
        if (progressBar) {
            setTimeout(function() {
                progressBar.classList.add('hidden');
                progressBar.classList.remove('visible');
            }, 1000); // Hide after 1 second delay
        }
        // Re-enable load button
        document.getElementById('loadBtn').disabled = appState.batchQueue.length === 0;
        document.getElementById('fileInput').disabled = false;
        // Re-enable tune button
        document.getElementById('tuneBtn').disabled = !appState.originalData;
        // Re-enable save button if data is cleaned
        document.getElementById('saveBtn').disabled = !appState.cleanedData;
        // Re-enable clean button (depends on state)
        document.getElementById('cleanBtn').disabled = !appState.originalData;
    }
}

// ============================================================================
// CHART VISUALIZATION
// ============================================================================

/**
 * Downsample data to maximum points
 */
function downsampleData(data, maxPoints) {
    if (data.length <= maxPoints) return data;

    var step = Math.ceil(data.length / maxPoints);
    var result = [];

    for (var i = 0; i < data.length; i += step) {
        result.push(data[i]);
    }

    return result;
}

/**
 * Update data chart
 */
function updateDataChart(original, cleaned) {
    var chart = appState.dataChart;

    if (!chart) return;

    // Hide no data message
    document.getElementById('noDataMessage').classList.add('hidden');

    // Prepare datasets
    var datasets = [];
    var maxPointsPerSeries = 2000; // Limit points per series for performance

    // Original data (red line)
    if (original && original.length > 0) {
        var numSeries = original[0].length - 1; // Exclude time column

        for (var s = 0; s < numSeries; s++) {
            var seriesIndex = s + 1; // Time column is 0
            var data = original.map(function(row, i) {
                return {
                    x: row[0],
                    y: row[seriesIndex]
                };
            });

            // Downsample if needed
            data = downsampleData(data, maxPointsPerSeries);

            datasets.push({
                label: 'Исходные - Серия ' + (s + 1),
                data: data,
                borderColor: '#ff4444',
                backgroundColor: 'transparent',
                borderWidth: 1,
                pointRadius: 0,
                pointHoverRadius: 3,
                tension: 0
            });
        }
    }

    // Cleaned data (cyan line)
    if (cleaned && cleaned.length > 0) {
        var numSeries = cleaned[0].length - 1;

        for (var s = 0; s < numSeries; s++) {
            var seriesIndex = s + 1;
            var data = cleaned.map(function(row, i) {
                return {
                    x: row[0],
                    y: row[seriesIndex]
                };
            });

            // Downsample if needed
            data = downsampleData(data, maxPointsPerSeries);

            datasets.push({
                label: 'Очищенные - Серия ' + (s + 1),
                data: data,
                borderColor: '#00ff88',
                backgroundColor: 'transparent',
                borderWidth: 2,
                pointRadius: 0,
                pointHoverRadius: 3,
                tension: 0.1
            });
        }
    }

    chart.data.datasets = datasets;

    // Force chart resize
    var chartContainer = document.getElementById('dataChart').closest('.chart-wrapper');
    if (chartContainer) {
        var containerWidth = chartContainer.clientWidth;
        var containerHeight = chartContainer.clientHeight;

        // Resize chart to container
        chart.resize(containerWidth, containerHeight);
    }

    // Update chart without animation
    chart.update('none');

    // Force another resize after update
    setTimeout(function() {
        if (chartContainer) {
            chart.resize();
        }
    }, 100);
}

/**
 * Draw heatmap from NTF matrix
 */
function drawHeatmap(NTF, optimalParams) {
    var canvas = document.getElementById('heatmapCanvas');
    if (!canvas) return;

    // Hide no data message
    document.getElementById('noHeatmapMessage').classList.add('hidden');

    var ctx = canvas.getContext('2d');
    var rows = NTF.length;
    var cols = NTF[0].length;

    // Set canvas size (use parent container dimensions)
    var container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;

    // Clear canvas
    ctx.fillStyle = '#0a0a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Find min/max for color scaling
    var minVal = Infinity;
    var maxVal = -Infinity;
    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            minVal = Math.min(minVal, NTF[i][j]);
            maxVal = Math.max(maxVal, NTF[i][j]);
        }
    }

    // Cell size
    var cellWidth = canvas.width / cols;
    var cellHeight = canvas.height / rows;

    log(I18n.t('log.heatmapDraw', {rows: rows, cols: cols, ntf: NTF[0][0]}), 'info');

    // Draw heatmap
    for (var i = 0; i < rows; i++) {
        for (var j = 0; j < cols; j++) {
            var normalized = (NTF[i][j] - minVal) / (maxVal - minVal);
            var color = getHeatmapColor(normalized);

            ctx.fillStyle = color;
            ctx.fillRect(j * cellWidth, i * cellHeight, cellWidth, cellHeight);
        }
    }

    // Draw optimal point marker
    if (optimalParams) {
        // Calculate optimal position from matrix
        // Find minimum NTF value position
        var minNTF = Infinity;
        var minI = 0, minJ = 0;
        for (var i = 0; i < rows; i++) {
            for (var j = 0; j < cols; j++) {
                if (NTF[i][j] < minNTF) {
                    minNTF = NTF[i][j];
                    minI = i;
                    minJ = j;
                }
            }
        }

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.strokeRect(minJ * cellWidth - 2, minI * cellHeight - 2, cellWidth + 4, cellHeight + 4);

        // Draw crosshair
        ctx.beginPath();
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.moveTo(minJ * cellWidth + cellWidth/2, minI * cellHeight);
        ctx.lineTo(minJ * cellWidth + cellWidth/2, minI * cellHeight + cellHeight);
        ctx.moveTo(minJ * cellWidth, minI * cellHeight + cellHeight/2);
        ctx.lineTo(minJ * cellWidth + cellWidth, minI * cellHeight + cellHeight/2);
        ctx.stroke();
    }

    // Draw color scale
    drawColorScale(ctx, canvas, minVal, maxVal);

    log(I18n.t('log.heatmapShown'), 'success');
}

/**
 * Get heatmap color based on normalized value (0-1)
 * Blue (low/good) -> Green -> Yellow -> Red (high/bad)
 */
function getHeatmapColor(normalized) {
    var r, g, b;

    if (normalized < 0.25) {
        // Blue to cyan
        var t = normalized / 0.25;
        r = 0;
        g = Math.round(255 * t);
        b = 255;
    } else if (normalized < 0.5) {
        // Cyan to green
        var t = (normalized - 0.25) / 0.25;
        r = 0;
        g = 255;
        b = Math.round(255 * (1 - t));
    } else if (normalized < 0.75) {
        // Green to yellow
        var t = (normalized - 0.5) / 0.25;
        r = Math.round(255 * t);
        g = 255;
        b = 0;
    } else {
        // Yellow to red
        var t = (normalized - 0.75) / 0.25;
        r = 255;
        g = Math.round(255 * (1 - t));
        b = 0;
    }

    return 'rgb(' + r + ', ' + g + ', ' + b + ')';
}

/**
 * Draw color scale legend
 */
function drawColorScale(ctx, canvas, minVal, maxVal) {
    var scaleWidth = 20;
    var scaleHeight = 150;
    var x = canvas.width - scaleWidth - 10;
    var y = (canvas.height - scaleHeight) / 2;

    // Draw gradient
    var gradient = ctx.createLinearGradient(x, y, x, y + scaleHeight);
    gradient.addColorStop(0, '#0000ff');
    gradient.addColorStop(0.25, '#00ffff');
    gradient.addColorStop(0.5, '#00ff00');
    gradient.addColorStop(0.75, '#ffff00');
    gradient.addColorStop(1, '#ff0000');

    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, scaleWidth, scaleHeight);

    // Draw border
    ctx.strokeStyle = '#00aaff';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, scaleWidth, scaleHeight);

    // Draw labels
    ctx.fillStyle = '#00ff88';
    ctx.font = '10px Consolas, monospace';
    ctx.textAlign = 'left';

    ctx.fillText(minVal.toFixed(4), x + scaleWidth + 5, y + 5);
    ctx.fillText(maxVal.toFixed(4), x + scaleWidth + 5, y + scaleHeight);
    ctx.fillText('NTF', x + scaleWidth + 5, y + scaleHeight / 2);

    // Draw title
    ctx.textAlign = 'center';
    ctx.font = '11px Consolas, monospace';
    ctx.fillText('Карта качества параметров', canvas.width / 2, 15);
}

// ============================================================================
// WORKER COMMUNICATION
// ============================================================================

/**
 * Send message to worker
 */
function sendToWorker(type, data) {
    if (!worker) {
        log('Worker не инициализирован', 'error');
        return;
    }

    currentJobId = generateJobId();

    worker.postMessage({
        type: type,
        jobId: currentJobId,
        data: data
    });

    showLoadingOverlay(true);
}

/**
 * Handle worker message
 */
function handleWorkerMessage(event) {
    var type = event.data.type;
    var jobId = event.data.jobId;
    var data = event.data.data;

    console.log('[Main] Получено сообщение:', {type, jobId, data});

    // Ignore old messages (but allow CLEAN_SERIES results to pass through)
    if (jobId !== currentJobId && type !== 'RESULT') {
        console.log('[Main] Игнорирую старое сообщение:', {receivedJobId: jobId, currentJobId: currentJobId});
        return;
    }

    // For CLEAN_SERIES results, we need to handle them even if jobId differs
    // because we send multiple series with the same initial jobId
    if (type === 'RESULT' && data.seriesIndex !== undefined) {
        console.log('[Main] Обработка CLEAN_SERIES результата');
        handleResult(data);
        return;
    }

    switch (type) {
        case 'PROGRESS':
            handleProgress(data);
            break;
        case 'RESULT':
            console.log('[Main] Обработка RESULT, данные:', data);
            handleResult(data);
            break;
        case 'ERROR':
            console.log('[Main] Обработка ERROR');
            handleError(data);
            break;
    }
}

/**
 * Handle worker error
 */
function handleWorkerError(error) {
    log(I18n.t('error.worker', {message: error.message}), 'error');
    showLoadingOverlay(false);
}

/**
 * Generate unique job ID
 */
function generateJobId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Handle progress updates from worker
 */
function handleProgress(data) {
    updateProgress(data.progress, data.message);
}

/**
 * Handle result from worker
 */
function handleResult(data) {
    console.log('[Main] В handleResult, данные:', data);

    showLoadingOverlay(false);

    // Determine operation type based on current state
    // Check for optimalParams (auto-tune result) FIRST
    if (data.optimalParams !== undefined) {
        console.log('[Main] Распознан результат автоподбора, вызываю handleTuneResult');
        // Auto-tune result
        handleTuneResult(data);
    } else if (data.seriesIndex !== undefined) {
        // Clean result for specific series
        handleCleanSeriesResult(data);
    } else if (data.cleanedData) {
        // Clean result (legacy)
        handleCleanResult(data);
    } else if (data.metrics) {
        // Metrics result
        updateMetrics(data.metrics);
    } else {
        console.error('[Main] Неизвестный формат результата:', data);
    }
}

/**
 * Handle error from worker
 */
function handleError(data) {
    log(I18n.t('error.execution', {message: data.message}), 'error');
    showLoadingOverlay(false);
}

// ============================================================================
// AUTO-TUNE OPERATION
// ============================================================================

/**
 * Auto-tune parameters
 */
function autoTune() {
    if (!appState.originalData) {
        log(I18n.t('msg.noData'), 'warning');
        return;
    }

    log(I18n.t('msg.tuning'), 'info');

    // Prepare data (remove time column for cleaning)
    var signalData = appState.originalData.map(function(row) {
        return row.slice(1);
    });

    sendToWorker('TUNE', {
        originalData: signalData,
        params: {
            windowWidth: appState.params.windowWidth,
            threshold: appState.params.threshold,
            matrixSize: appState.params.matrixSize,
            relativeSize: appState.params.relativeSize,
            fillMethod: appState.params.fillMethod,
            numChunks: appState.params.numChunks,
            useChunks: appState.params.useChunks
        }
    });
}

/**
 * Handle auto-tune result
 */
function handleTuneResult(data) {
    console.log('[Main] Получен результат автоподбора:', data);
    var optimalParams = data.optimalParams;

    if (!optimalParams) {
        console.error('[Main] Ошибка: optimalParams не определен!');
        log(I18n.t('error.tuneFailed'), 'error');
        return;
    }

    console.log('[Main] Оптимальные параметры:', optimalParams);

    appState.optimalParams = optimalParams;

    // Update UI with optimal parameters
    document.getElementById('windowWidth').value = optimalParams.windowWidth;
    document.getElementById('windowWidthValue').textContent = optimalParams.windowWidth.toFixed(0);
    document.getElementById('threshold').value = optimalParams.threshold;
    document.getElementById('thresholdValue').textContent = optimalParams.threshold.toFixed(2);

    appState.params.windowWidth = optimalParams.windowWidth;
    appState.params.threshold = optimalParams.threshold;

    // Update file info
    document.getElementById('infoOptWindow').textContent = optimalParams.windowWidth.toFixed(0);
    document.getElementById('infoOptThreshold').textContent = optimalParams.threshold.toFixed(2);

    // NTF heatmap is NOT displayed in JS version (only for MATLAB debugging)
    // The heatmap requires full NTF matrix which is memory-intensive and not needed for final results

    // Enable clean button
    document.getElementById('cleanBtn').disabled = false;

    log(I18n.t('msg.tuned', {window: optimalParams.windowWidth.toFixed(0), threshold: optimalParams.threshold.toFixed(2)}), 'success');
    log(I18n.t('msg.readyClean'), 'info');
}

// ============================================================================
// CLEAN OPERATION
// ============================================================================

/**
 * Clean data using current parameters
 */
function cleanData() {
    if (!appState.originalData) {
        log(I18n.t('msg.noData'), 'warning');
        return;
    }

    log(I18n.t('msg.cleaning'), 'info');

    var numSeries = appState.originalData[0].length - 1;

    // Initialize cleaned data
    if (!appState.cleanedData) {
        appState.cleanedData = appState.originalData.map(function(row) {
            return row.slice();
        });
    }

    // Process each series
    appState.seriesToClean = numSeries;
    appState.seriesCleaned = 0;
    appState.seriesMetrics = new Array(numSeries + 1); // Initialize array for metrics (index 1-based)

    // Generate job ID once for all series
    currentJobId = generateJobId();
    showLoadingOverlay(true);

    for (var s = 0; s < numSeries; s++) {
        var seriesIndex = s + 1; // Time column is 0
        var original = appState.originalData.map(function(row) {
            return row[seriesIndex];
        });

        var ma = appState.params.windowWidth;
        var tfa = appState.params.threshold * 100;
        var fillMethod = appState.params.fillMethod;

        // Send to worker for cleaning (use same jobId for all series)
        worker.postMessage({
            type: 'CLEAN_SERIES',
            jobId: currentJobId,
            data: {
                seriesIndex: seriesIndex,
                signal: new Float64Array(original),
                original: new Float64Array(original),
                params: {
                    windowWidth: ma,
                    threshold: tfa / 100,
                    fillMethod: fillMethod,
                    detectionMethod: 'movmean'
                }
            }
        });
    }
}

/**
 * Handle clean result for a single series
 */
function handleCleanSeriesResult(data) {
    var cleanedData = data.cleanedData;
    var seriesIndex = data.seriesIndex;
    var metrics = data.metrics;

    // Update cleaned data for this series
    for (var i = 0; i < cleanedData.length && i < appState.cleanedData.length; i++) {
        appState.cleanedData[i][seriesIndex] = cleanedData[i];
    }

    // Store metrics from worker
    if (appState.seriesMetrics) {
        appState.seriesMetrics[seriesIndex] = metrics;
    }

    // Track progress
    appState.seriesCleaned++;
    var progress = (appState.seriesCleaned / appState.seriesToClean) * 100;

    log(I18n.t('msg.cleanedSeries', {n: seriesIndex, total: appState.seriesToClean, percent: Math.round(progress)}), 'info');

    // Update progress bar
    updateProgress(progress, I18n.t('msg.cleaningSeries', {n: seriesIndex, total: appState.seriesToClean}));

    // If all series are cleaned, update UI
    if (appState.seriesCleaned >= appState.seriesToClean) {
        log(I18n.t('msg.cleanedAll'), 'success');

        // Update metrics (average of all series from worker results)
        var avgMetrics = computeAverageMetrics();
        updateMetrics(avgMetrics);

        // Update chart
        switchTab('data');
        updateDataChart(appState.originalData, appState.cleanedData);

        // Enable save button
        document.getElementById('saveBtn').disabled = false;

        log(I18n.t('msg.readySave'), 'info');
    }
}

/**
 * Compute average metrics from stored worker results
 */
function computeAverageMetrics() {
    if (!appState.seriesMetrics || appState.seriesMetrics.length === 0) {
        return {
            STDF: 0,
            DF: 0,
            ASNR: 0,
            ARMSE: 0,
            R_squared: 0,
            R_Pirs: 0
        };
    }

    var count = 0;
    var result = {
        STDF: 0,
        DF: 0,
        ASNR: 0,
        ARMSE: 0,
        R_squared: 0,
        R_Pirs: 0
    };

    for (var i = 1; i < appState.seriesMetrics.length; i++) {
        var m = appState.seriesMetrics[i];
        if (m) {
            result.STDF += m.STDF || 0;
            result.DF += m.DF || 0;
            result.ASNR += m.ASNR || 0;
            result.ARMSE += m.ARMSE || 0;
            result.R_squared += m.R_squared || 0;
            result.R_Pirs += m.R_Pirs || 0;
            count++;
        }
    }

    if (count > 0) {
        result.STDF /= count;
        result.DF /= count;
        result.ASNR /= count;
        result.ARMSE /= count;
        result.R_squared /= count;
        result.R_Pirs /= count;
    }

    return result;
}

/**
 * Compute average metrics across all series
 */
function computeAllSeriesMetrics() {
    var numSeries = appState.originalData[0].length - 1;
    var allMetrics = [];

    for (var s = 0; s < numSeries; s++) {
        var seriesIndex = s + 1;
        var original = appState.originalData.map(function(row) {
            return row[seriesIndex];
        });
        var cleaned = appState.cleanedData.map(function(row) {
            return row[seriesIndex];
        });

        // Compute metrics for this series
        var metrics = computeSeriesMetrics(original, cleaned);
        allMetrics.push(metrics);
    }

    // Average metrics
    if (allMetrics.length === 0) {
        return {
            STDF: 0,
            DF: 0,
            ASNR: 0,
            ARMSE: 0,
            R_squared: 0,
            R_Pirs: 0
        };
    }

    var result = {
        STDF: 0,
        DF: 0,
        ASNR: 0,
        ARMSE: 0,
        R_squared: 0,
        R_Pirs: 0
    };

    for (var i = 0; i < allMetrics.length; i++) {
        result.STDF += allMetrics[i].STDF || 0;
        result.DF += allMetrics[i].DF || 0;
        result.ASNR += allMetrics[i].ASNR || 0;
        result.ARMSE += allMetrics[i].ARMSE || 0;
        result.R_squared += allMetrics[i].R_squared || 0;
        result.R_Pirs += allMetrics[i].R_Pirs || 0;
    }

    result.STDF /= allMetrics.length;
    result.DF /= allMetrics.length;
    result.ASNR /= allMetrics.length;
    result.ARMSE /= allMetrics.length;
    result.R_squared /= allMetrics.length;
    result.R_Pirs /= allMetrics.length;

    return result;
}

// ============================================================================
// SAVE OPERATION
// ============================================================================

/**
 * Save cleaned data to file
 */
function saveData() {
    if (!appState.cleanedData) {
        log(I18n.t('msg.noCleaned'), 'warning');
        return;
    }

    log(I18n.t('msg.saving'), 'info');

    try {
        var saveRestored = document.getElementById('saveRestored').checked;
        var addValidityFlag = document.getElementById('addValidityFlag').checked;

        // Prepare output data
        var outputData = [];
        var original = appState.originalData;
        var cleaned = appState.cleanedData;

        if (saveRestored) {
            // Save all data
            for (var i = 0; i < cleaned.length; i++) {
                var row = cleaned[i].slice();

                if (addValidityFlag) {
                    // Add validity flags for each series (excluding time)
                    var validityFlags = [];
                    for (var j = 1; j < original[i].length; j++) {
                        validityFlags.push(original[i][j] === cleaned[i][j] ? 1 : 0);
                    }
                    for (var k = 0; k < validityFlags.length; k++) {
                        row.push(validityFlags[k]);
                    }
                }

                outputData.push(row);
            }
        } else {
            // Save only valid data (no outliers)
            for (var i = 0; i < cleaned.length; i++) {
                var isValid = true;
                for (var j = 1; j < original[i].length; j++) {
                    if (original[i][j] !== cleaned[i][j]) {
                        isValid = false;
                        break;
                    }
                }

                if (isValid) {
                    var row = cleaned[i].slice();

                    if (addValidityFlag) {
                        var validityFlags = new Array(original[i].length - 1).fill(1);
                        for (var k = 0; k < validityFlags.length; k++) {
                            row.push(validityFlags[k]);
                        }
                    }

                    outputData.push(row);
                }
            }
        }

        // Format as ASCII
        var content = formatAsciiData(outputData);

        // Generate filename
        var originalName = appState.currentFile.name;
        var dotIndex = originalName.lastIndexOf('.');
        var baseName = dotIndex > 0 ? originalName.substring(0, dotIndex) : originalName;
        var filename = baseName + '_cleansed.txt';

        // Trigger download
        downloadFile(content, filename);

        log(I18n.t('msg.saved', {name: filename, rows: outputData.length}), 'success');

    } catch (error) {
        log(I18n.t('error.saving', {message: error.message}), 'error');
        console.error('Save error:', error);
    }
}

/**
 * Format data as ASCII
 */
function formatAsciiData(data) {
    var lines = [];

    // Header comment
    lines.push('# ' + I18n.t('msg.fileHeader'));
    lines.push('# ' + I18n.t('msg.generated') + ' ' + new Date().toISOString());

    // Data rows
    for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var formatted = row.map(function(v) { return v.toFixed(6); }).join('\t');
        lines.push(formatted);
    }

    return lines.join('\n');
}

/**
 * Trigger file download
 */
function downloadFile(content, filename) {
    var blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var link = document.createElement('a');

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
