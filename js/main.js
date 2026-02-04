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
    batchResults: [],          // Results from batch processing
    batchProcessing: false,    // Is batch processing active
    batchCancelled: false,     // Was batch processing cancelled

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
    chartVisibility: 'both',   // 'original', 'cleaned', or 'both'

    // Heatmap interaction
    heatmapMatrix: null,         // Original NTF matrix for heatmap interaction
    heatmapOptimal: null,        // Optimal parameters from tune

    // Series cleaning progress
    seriesToClean: 0,
    seriesCleaned: 0,

    // Operation tracking for ETA
    operationStartTime: null,    // Timestamp when operation started
    currentOperation: null,      // 'tune' or 'clean'
    lastProgressUpdate: null,    // Last time progress was updated

    // Table view
    currentView: 'chart',     // 'chart' or 'table'
    tableState: {
        currentPage: 1,
        pageSize: 50,
        sortColumn: null,
        sortDirection: 'asc',
        filterText: '',
        selectedSeries: 'all'
    }
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
    UI.log(I18n.t('log.systemInit'), 'info');

    // Handle window resize with debounce for performance
    window.addEventListener('resize', Utils.debounce(function() {
        if (appState.dataChart) {
            appState.dataChart.resize();
        }
    }, 100));
});

/**
 * Initialize Web Worker
 */
function initializeWorker() {
    try {
        // Add timestamp to prevent caching
        var workerUrl = 'js/worker.js?v=' + Date.now();

        // Try to load worker from file (requires server)
        worker = new Worker(workerUrl);
        worker.onmessage = handleWorkerMessage;
        worker.onerror = handleWorkerError;
        UI.log('Web Worker успешно инициализирован (внешний).', 'success');
    } catch (error) {
        // Fall back to inline worker (works without server)
        UI.log('[Main] Ошибка загрузки внешнего worker, использую встроенный...', error);
        UI.log(I18n.t('error.workerLoad'), 'warning');
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
        var workerCodeElement = document.getElementById('worker-code');
        if (!workerCodeElement) {
            console.warn('Inline worker code not found, skipping worker initialization');
            return;
        }
        
        var workerCode = workerCodeElement.textContent;
        var blob = new Blob([workerCode], { type: 'application/javascript' });
        var workerUrl = URL.createObjectURL(blob);

        worker = new Worker(workerUrl);
        worker.onmessage = handleWorkerMessage;
        worker.onerror = handleWorkerError;

        UI.log(I18n.t('log.workerInit'), 'success');
    } catch (error) {
        UI.log(I18n.t('error.workerInitInternal', {message: error.message}), 'error');
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

    // Create debounced version of updateParamsPreview for performance
    var debouncedUpdateParamsPreview = Utils.debounce(function() {
        updateParamsPreview();
    }, 150);

    // Sliders
    const sliders = ['windowWidth', 'threshold', 'matrixSize', 'relativeSize', 'numChunks'];
    sliders.forEach(function(id) {
        var slider = document.getElementById(id);
        var valueDisplay = document.getElementById(id + 'Value');
        if (slider && valueDisplay) {
            slider.addEventListener('input', function() {
                // Immediate update for value display
                valueDisplay.textContent = this.value;
                if (id === 'relativeSize') {
                    appState.params.relativeSize = parseFloat(this.value);
                } else if (id === 'numChunks') {
                    appState.params.numChunks = parseInt(this.value);
                } else {
                    appState.params[id] = parseFloat(this.value);
                }
                // Debounced update for parameter preview (only for expensive updates)
                if (id === 'windowWidth' || id === 'threshold') {
                    debouncedUpdateParamsPreview();
                }
            });
        }
    });

    // Optimization checkbox
    document.getElementById('useChunks').addEventListener('change', function() {
        appState.params.useChunks = this.checked;
        if (this.checked) {
            UI.log(I18n.t('msg.optimizationEnabled'), 'info');
        } else {
            UI.log(I18n.t('msg.optimizationDisabled'), 'info');
        }
    });

    // Fill method dropdown
    document.getElementById('fillMethod').addEventListener('change', function() {
        appState.params.fillMethod = this.value;
        updateParamsPreview();
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
    document.getElementById('resetBtn').addEventListener('click', showResetModal);
    document.getElementById('confirmResetBtn').addEventListener('click', resetSession);
    document.getElementById('cancelResetBtn').addEventListener('click', hideResetModal);
    document.querySelector('.modal-close').addEventListener('click', hideResetModal);

    // Batch processing buttons
    document.getElementById('batchProcessBtn').addEventListener('click', processBatchQueue);
    document.getElementById('batchCancelBtn').addEventListener('click', cancelBatchProcessing);

    // Export buttons
    document.getElementById('exportJsonBtn').addEventListener('click', exportJsonReport);
    document.getElementById('exportHtmlBtn').addEventListener('click', exportHtmlReport);
    document.getElementById('exportBatchBtn').addEventListener('click', exportBatchResults);

    // Zoom controls
    document.getElementById('zoomInBtn').addEventListener('click', zoomIn);
    document.getElementById('zoomOutBtn').addEventListener('click', zoomOut);
    document.getElementById('zoomResetBtn').addEventListener('click', resetZoom);

    // Presets controls
    document.getElementById('presetSelect').addEventListener('change', function() {
        var presetName = this.value;
        if (presetName && presetName !== '' && presetName !== '---') {
            applyPreset(presetName);
        }
    });
    document.getElementById('applyPresetBtn').addEventListener('click', function() {
        var presetName = document.getElementById('presetSelect').value;
        if (presetName && presetName !== '' && presetName !== '---') {
            applyPreset(presetName);
        }
    });
    document.getElementById('savePresetBtn').addEventListener('click', savePreset);
    document.getElementById('deletePresetBtn').addEventListener('click', deletePreset);

    // Drag & Drop zone
    initializeDragAndDrop();

    // Chart visibility controls
    initializeVisibilityControls();

    // Table view controls
    initializeViewToggle();

    // Tooltips
    initializeTooltips();

    // Tab navigation
    document.querySelectorAll('.tab-button').forEach(function(button) {
        button.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Initialize parameter preview
    updateParamsPreview();
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
        UI.log(I18n.t('dropZone.invalidType'), 'warning');
        return;
    }

    if (validFiles.length !== files.length) {
        UI.log(I18n.t('dropZone.someSkipped'), 'warning');
    }

    // Load files
    Queue.addToQueue(validFiles);
    updateFileCount(validFiles.length);
    displaySelectedFiles(validFiles);
    document.getElementById('loadBtn').disabled = false;

    UI.log(I18n.t('msg.filesSelected', {count: validFiles.length}), 'info');
}

/**
 * Initialize chart visibility controls
 */
function initializeVisibilityControls() {
    var buttons = document.querySelectorAll('.visibility-btn');

    // Load saved preference
    var savedVisibility = Storage.loadChartVisibility();
    if (savedVisibility && ['original', 'cleaned', 'both'].includes(savedVisibility)) {
        appState.chartVisibility = savedVisibility;
    }

    // Set initial state
    updateVisibilityButtons();

    // Add click handlers
    buttons.forEach(function(button) {
        button.addEventListener('click', function() {
            var mode = this.dataset.visibility;
            setChartVisibility(mode);
        });
    });

    // Keyboard shortcuts (1/2/3/Q/W/E/R/Escape)
    document.addEventListener('keydown', function(event) {
        // Only if not typing in input
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
            return;
        }

        switch (event.key) {
            // Chart visibility shortcuts
            case '1':
                setChartVisibility('original');
                break;
            case '2':
                setChartVisibility('cleaned');
                break;
            case '3':
                setChartVisibility('both');
                break;
            // Operation shortcuts
            case 'q':
            case 'Q':
                var loadBtn = document.getElementById('loadBtn');
                if (loadBtn && !loadBtn.disabled) {
                    loadBtn.click();
                }
                break;
            case 'w':
            case 'W':
                var tuneBtn = document.getElementById('tuneBtn');
                if (tuneBtn && !tuneBtn.disabled) {
                    tuneBtn.click();
                }
                break;
            case 'e':
            case 'E':
                var cleanBtn = document.getElementById('cleanBtn');
                if (cleanBtn && !cleanBtn.disabled) {
                    cleanBtn.click();
                }
                break;
            case 'r':
            case 'R':
                var saveBtn = document.getElementById('saveBtn');
                if (saveBtn && !saveBtn.disabled) {
                    saveBtn.click();
                }
                break;
            // Modal close shortcut
            case 'Escape':
                // Close reset modal if open
                var resetModal = document.getElementById('resetModal');
                if (resetModal && resetModal.classList.contains('show')) {
                    hideResetModal();
                }
                // Close error modal if open
                var errorModal = document.getElementById('errorModal');
                if (errorModal && errorModal.classList.contains('show')) {
                    ErrorHandler.hideModal();
                }
                break;
        }
    });
}

/**
 * Set chart visibility mode
 * @param {string} mode - 'original', 'cleaned', or 'both'
 */
function setChartVisibility(mode) {
    if (!['original', 'cleaned', 'both'].includes(mode)) {
        console.warn('Invalid visibility mode:', mode);
        return;
    }

    appState.chartVisibility = mode;
    Storage.saveChartVisibility(mode);

    // Update button states
    updateVisibilityButtons();

    // Update chart datasets
    updateChartDatasetsVisibility();
}

/**
 * Update visibility button active states
 */
function updateVisibilityButtons() {
    var buttons = document.querySelectorAll('.visibility-btn');

    buttons.forEach(function(button) {
        if (button.dataset.visibility === appState.chartVisibility) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
}

/**
 * Update visibility buttons enabled/disabled state based on data
 */
function updateVisibilityButtonsState(hasOriginal, hasCleaned) {
    var buttons = document.querySelectorAll('.visibility-btn');

    buttons.forEach(function(button) {
        var mode = button.dataset.visibility;

        switch (mode) {
            case 'original':
                button.disabled = !hasOriginal;
                break;
            case 'cleaned':
                button.disabled = !hasCleaned;
                break;
            case 'both':
                button.disabled = !hasOriginal && !hasCleaned;
                break;
        }
    });
}

/**
 * Initialize tooltips system
 */
function initializeTooltips() {
    // Define tooltip mappings for elements
    var tooltipMappings = [
        // Metrics
        { selector: '.metric-name[data-metric="STDF"]', key: 'tooltip.STDF' },
        { selector: '.metric-name[data-metric="DF"]', key: 'tooltip.DF' },
        { selector: '.metric-name[data-metric="ASNR"]', key: 'tooltip.ASNR' },
        { selector: '.metric-name[data-metric="RMSE"]', key: 'tooltip.RMSE' },
        { selector: '.metric-name[data-metric="RSquared"]', key: 'tooltip.RSquared' },
        { selector: '.metric-name[data-metric="Pearson"]', key: 'tooltip.Pearson' },

        // Parameters
        { selector: '#windowWidthValue', key: 'tooltip.window' },
        { selector: '#thresholdValue', key: 'tooltip.threshold' },
        { selector: '#matrixSizeValue', key: 'tooltip.matrix' },
        { selector: '#relativeSizeValue', key: 'tooltip.relative' }
    ];

    // Apply tooltips to elements
    tooltipMappings.forEach(function(mapping) {
        var element = document.querySelector(mapping.selector);
        if (element) {
            element.setAttribute('data-tooltip', I18n.t(mapping.key));
        }
    });

    // Update tooltips on language change
    var originalSetLanguage = I18n.setLanguage;
    I18n.setLanguage = function(lang) {
        originalSetLanguage.call(I18n, lang);
        updateAllTooltips(tooltipMappings);
        updatePresetSelect();
    };
}

/**
 * Update all tooltips with current language
 */
function updateAllTooltips(mappings) {
    mappings.forEach(function(mapping) {
        var element = document.querySelector(mapping.selector);
        if (element) {
            element.setAttribute('data-tooltip', I18n.t(mapping.key));
        }
    });
}

/**
 * Update chart datasets visibility based on current mode
 */
function updateChartDatasetsVisibility() {
    if (!appState.dataChart) {
        return;
    }

    var chart = appState.dataChart;
    var mode = appState.chartVisibility;

    chart.data.datasets.forEach(function(dataset, index) {
        // Original datasets are even indices (0, 2, 4, ...)
        // Cleaned datasets are odd indices (1, 3, 5, ...)
        var isOriginal = (index % 2 === 0);

        switch (mode) {
            case 'original':
                dataset.hidden = !isOriginal;
                break;
            case 'cleaned':
                dataset.hidden = isOriginal;
                break;
            case 'both':
                dataset.hidden = false;
                break;
        }
    });

    // Update chart without animation for better performance
    chart.update('none');
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
                        text: I18n.t('chart.xAxis'),
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
                        text: I18n.t('chart.yAxis'),
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
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            var label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }

                            // Check if this is an outlier dataset
                            if (context.dataset.type === 'scatter' && context.dataset.label && context.dataset.label.includes('Выбросы')) {
                                var point = context.raw;
                                if (point) {
                                    var x = point.x.toFixed(4);
                                    var y = point.y.toFixed(4);
                                    label += '(' + x + ', ' + y + ')\n';
                                    if (point.originalValue !== undefined) {
                                        label += 'Исходное: ' + point.originalValue.toFixed(4) + '\n';
                                    }
                                    if (point.cleanedValue !== null && point.cleanedValue !== undefined) {
                                        label += 'Очищенное: ' + point.cleanedValue.toFixed(4);
                                    }
                                }
                            } else {
                                // Standard tooltip for line datasets
                                if (context.parsed.y !== null) {
                                    label += context.parsed.y.toFixed(4);
                                }
                            }

                            return label;
                        }
                    }
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
    try {
        var files = Array.from(event.target.files);

        if (files.length === 0) {
            return;
        }

        Queue.addToQueue(files);
        updateFileCount(files.length);
        displaySelectedFiles(files);

        document.getElementById('loadBtn').disabled = false;

        UI.log(I18n.t('msg.filesSelected', {count: files.length}), 'info');
    } catch (error) {
        ErrorHandler.show(error, ErrorHandler.types.FILE_LOAD, 'handleFileSelect');
    }
}

/**
 * Update file count display
 */
function updateFileCount(count) {
    document.getElementById('fileCount').textContent = I18n.t('file.count', {count: count});
    document.getElementById('prominentFileCount').textContent = count;
}

/**
 * Update parameters preview display
 */
function updateParamsPreview() {
    var windowWidth = parseInt(document.getElementById('windowWidth').value);
    var threshold = parseFloat(document.getElementById('threshold').value);
    var fillMethod = document.getElementById('fillMethod').value;

    var paramsElement = document.getElementById('paramsPreview');
    if (paramsElement) {
        paramsElement.textContent = I18n.t('paramsPreview', {
            window: windowWidth,
            threshold: threshold.toFixed(1),
            method: fillMethod
        });
        paramsElement.setAttribute('data-i18n-params', JSON.stringify({
            window: windowWidth,
            threshold: threshold.toFixed(1),
            method: fillMethod
        }));
    }
}

/**
 * Display selected files in list
 */
function displaySelectedFiles(files) {
    var container = document.getElementById('selectedFiles');
    var batchControls = document.getElementById('batchControls');
    container.innerHTML = '';

    files.forEach(function(file, index) {
        var div = document.createElement('div');
        div.className = 'file-item';
        div.id = 'fileItem_' + index;

        var infoDiv = document.createElement('div');
        infoDiv.className = 'file-item-info';
        infoDiv.textContent = (index + 1) + '. ' + file.name + ' (' + formatFileSize(file.size) + ')';

        var actionsDiv = document.createElement('div');
        actionsDiv.className = 'file-item-actions';

        var cancelButton = document.createElement('button');
        cancelButton.className = 'file-item-cancel';
        cancelButton.textContent = '✕';
        cancelButton.onclick = (function(idx) {
            return function() {
                cancelBatchItem(idx);
            };
        })(index);
        cancelButton.title = I18n.t('button.cancelItem');

        var progressDiv = document.createElement('div');
        progressDiv.className = 'file-item-progress';
        progressDiv.id = 'fileProgress_' + index;

        var progressBar = document.createElement('div');
        progressBar.className = 'file-item-progress-bar';
        progressBar.id = 'fileProgressBar_' + index;
        progressBar.style.width = '0%';
        progressDiv.appendChild(progressBar);

        var statusSpan = document.createElement('span');
        statusSpan.className = 'file-item-status pending';
        statusSpan.id = 'fileStatus_' + index;
        statusSpan.textContent = '⏳';

        actionsDiv.appendChild(cancelButton);
        actionsDiv.appendChild(progressDiv);
        actionsDiv.appendChild(statusSpan);

        div.appendChild(infoDiv);
        div.appendChild(actionsDiv);
        container.appendChild(div);
    });

    // Show batch controls if more than 1 file
    if (files.length > 1) {
        batchControls.style.display = 'flex';
    } else {
        batchControls.style.display = 'none';
    }
}

/**
 * Format file size for display
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    var k = 1024;
    var sizes = ['B', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.UI.log(bytes) / Math.UI.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
}

/**
 * Cancel individual item from batch queue
 */
function cancelBatchItem(index) {
    if (Queue.getStatus().isProcessing) {
        UI.log(I18n.t('batch.cannotCancelDuring'), 'warning');
        return;
    }
    Queue.removeFromQueue(index);
    displaySelectedFiles(Queue.getStatus().queue);
    UI.updateFileCount(Queue.getStatus().queue.length);
    document.getElementById('prominentFileCount').textContent = Queue.getStatus().queue.length;
    UI.log(I18n.t('batch.itemRemoved'), 'info');
}

/**
 * Process all files in batch queue
 */
function processBatchQueue() {
    if (Queue.getStatus().queue.length === 0) {
        UI.log(I18n.t('msg.noFiles'), 'warning');
        return;
    }

    if (Queue.getStatus().isProcessing) {
        UI.log(I18n.t('batch.alreadyProcessing'), 'warning');
        return;
    }

    Queue.startProcessing();UI.log(I18n.t('batch.started', {count: Queue.getStatus().queue.length}), 'info');

    // Disable controls
    document.getElementById('batchProcessBtn').disabled = true;
    document.getElementById('loadBtn').disabled = true;

    processNextBatchItem(0);
}

/**
 * Process next item in batch queue
 */
function processNextBatchItem(index) {
    if (index >= Queue.getStatus().queue.length || Queue.getStatus().isCancelled) {
        completeBatchProcessing();
        return;
    }

    var file = appState.batchQueue[index];
    appState.currentFile = file;

    // Update status
    updateBatchItemStatus(index, 'processing', 0);
    UI.log(I18n.t('batch.processing', {index: index + 1, total: Queue.getStatus().queue.length, name: file.name}), 'info');

    // Load file
    readFileContent(file).then(function(content) {
        var data = parseAsciiData(content);

        if (data.length === 0) {
            throw new Error('Файл не содержит данных');
        }

        appState.originalData = data;

        // Use current parameters for batch processing (no auto-tune per file)
        // This is more practical for batch operations
        return sendToWorkerAsync('CLEAN', {
            originalData: data.map(function(row) { return row.slice(1); }),
            params: appState.params
        });
    }).then(function(result) {
        // Store result
        Queue.addResult({
            filename: file.name,
            originalData: appState.originalData,
            cleanedData: result.cleanedData,
            metrics: result.metrics,
            params: appState.params
        });

        // Update status
        updateBatchItemStatus(index, 'completed', 100);

        // Process next item
        setTimeout(function() {
            processNextBatchItem(index + 1);
        }, 100);
    }).catch(function(error) {
        console.error('Batch processing error:', error);
        updateBatchItemStatus(index, 'error', 0);
        UI.log(I18n.t('batch.itemError', {name: file.name, message: error.message}), 'error');

        // Continue to next item
        setTimeout(function() {
            processNextBatchItem(index + 1);
        }, 100);
    });
}

/**
 * Send message to worker and return Promise
 */
function sendToWorkerAsync(type, data) {
    return new Promise(function(resolve, reject) {
        if (!worker) {
            reject(new Error(I18n.t('error.workerInit')));
            return;
        }

        var jobId = generateJobId();
        var messageHandler = function(event) {
            if (event.data.jobId === jobId) {
                worker.removeEventListener('message', messageHandler);
                if (event.data.type === 'RESULT') {
                    resolve(event.data.data);
                } else if (event.data.type === 'ERROR') {
                    reject(new Error(event.data.data.message || 'Worker error'));
                }
            }
        };

        worker.addEventListener('message', messageHandler);

        worker.postMessage({
            type: type,
            jobId: jobId,
            data: data
        });
    });
}

/**
 * Update batch item status and progress
 */
function updateBatchItemStatus(index, status, progress) {
    var progressBar = document.getElementById('fileProgressBar_' + index);
    var statusSpan = document.getElementById('fileStatus_' + index);

    if (progressBar) {
        progressBar.style.width = progress + '%';
    }

    if (statusSpan) {
        statusSpan.className = 'file-item-status ' + status;
        switch (status) {
            case 'pending':
                statusSpan.textContent = '⏳';
                break;
            case 'processing':
                statusSpan.textContent = '⚙️';
                break;
            case 'completed':
                statusSpan.textContent = '✓';
                break;
            case 'error':
                statusSpan.textContent = '✗';
                break;
        }
    }
}

/**
 * Complete batch processing
 */
function completeBatchProcessing() {
    appState.batchProcessing = false;

    // Re-enable controls
    document.getElementById('batchProcessBtn').disabled = false;
    document.getElementById('loadBtn').disabled = false;

    if (Queue.getStatus().isCancelled) {
        UI.log(I18n.t('batch.cancelled'), 'warning');
    } else {
        UI.log(I18n.t('batch.completed', {count: Queue.getStatus().results.length}), 'success');
        UI.log(I18n.t('batch.exportHint'), 'info');

        // Show batch export button
        var exportBtn = document.getElementById('exportBatchBtn');
        if (exportBtn) {
            exportBtn.style.display = 'block';
        }
    }
}

/**
 * Cancel batch processing
 */
function cancelBatchProcessing() {
    if (!Queue.getStatus().isProcessing) {
        return;
    }

    if (confirm(I18n.t('batch.confirmCancel'))) {
        Queue.cancelProcessing();
        UI.log(I18n.t('batch.cancelling'), 'warning');
    }
}

/**
 * Export all batch results
 */
function exportBatchResults() {
    if (Queue.getStatus().results.length === 0) {
        UI.log(I18n.t('batch.noResults'), 'warning');
        return;
    }

    UI.log(I18n.t('batch.exporting'), 'info');

    // Export each result as a separate file
    Queue.getStatus().results.forEach(function(result, index) {
        var saveOptions = {
            saveRestored: true,
            includeValidityFlag: false
        };

        var saveData = prepareSaveData(result.originalData, result.cleanedData, saveOptions);
        var filename = 'cleaned_' + result.filename;

        Export.downloadFile(saveData, filename);

        UI.log(I18n.t('batch.saved', {name: filename}), 'success');
    });

    UI.log(I18n.t('batch.exportComplete', {count: Queue.getStatus().results.length}), 'success');
}

/**
 * Load and parse data from selected files
 */
function loadData() {
    if (Queue.getStatus().queue.length === 0) {
        UI.log(I18n.t('msg.noFiles'), 'warning');
        return;
    }

    var file = appState.batchQueue[0];
    appState.currentFile = file;

    UI.log(I18n.t('msg.loading', {name: file.name}), 'info');

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
        document.getElementById('exportJsonBtn').disabled = true;
        document.getElementById('exportHtmlBtn').disabled = true;

        UI.log(I18n.t('msg.loaded', {points: data.length, series: data[0].length - 1}), 'success');
        UI.log(I18n.t('msg.readyTune'), 'info');

    }).catch(function(error) {
        UI.log(I18n.t('error.fileLoad', {message: error.message}), 'error');
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
    try {
        if (!content || typeof content !== 'string') {
            throw new Error('Invalid content: empty or not a string');
        }

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
    } catch (error) {
        ErrorHandler.show(error, ErrorHandler.types.FILE_PARSE, 'parseAsciiData');
        throw error; // Re-throw for caller to handle
    }
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

    // Update prominent file info display
    document.getElementById('prominentPoints').textContent = data.length;
    document.getElementById('prominentSeries').textContent = data[0].length - 1;
}

/**
 * Update metrics display
 */
function updateMetrics(metrics) {
    // STDF - Smoothness
    var stdfElement = document.getElementById('metricSTDF');
    if (metrics.STDF !== undefined && metrics.STDF !== null) {
        stdfElement.textContent = metrics.STDF.toFixed(4);
        stdfElement.className = 'metric-value ' + getQualityClass('STDF', metrics.STDF);
    } else {
        stdfElement.textContent = '--';
        stdfElement.className = 'metric-value';
    }

    // DF - Deleted Fraction
    var dfElement = document.getElementById('metricDF');
    if (metrics.DF !== undefined && metrics.DF !== null) {
        dfElement.textContent = metrics.DF.toFixed(4);
        dfElement.className = 'metric-value ' + getQualityClass('DF', metrics.DF);
    } else {
        dfElement.textContent = '--';
        dfElement.className = 'metric-value';
    }

    // ASNR - Signal-to-Noise Ratio
    var asnrElement = document.getElementById('metricASNR');
    if (metrics.ASNR !== undefined && metrics.ASNR !== null) {
        asnrElement.textContent = metrics.ASNR.toFixed(2);
        asnrElement.className = 'metric-value ' + getQualityClass('ASNR', metrics.ASNR);
    } else {
        asnrElement.textContent = '--';
        asnrElement.className = 'metric-value';
    }

    // RMSE - Root Mean Square Error
    var rmseElement = document.getElementById('metricRMSE');
    if (metrics.ARMSE !== undefined && metrics.ARMSE !== null) {
        rmseElement.textContent = metrics.ARMSE.toFixed(4);
        rmseElement.className = 'metric-value ' + getQualityClass('RMSE', metrics.ARMSE);
    } else {
        rmseElement.textContent = '--';
        rmseElement.className = 'metric-value';
    }

    // RSquared - Coefficient of Determination
    var rsquaredElement = document.getElementById('metricRSquared');
    if (metrics.R_squared !== undefined && metrics.R_squared !== null) {
        rsquaredElement.textContent = metrics.R_squared.toFixed(4);
        rsquaredElement.className = 'metric-value ' + getQualityClass('RSquared', metrics.R_squared);
    } else {
        rsquaredElement.textContent = '--';
        rsquaredElement.className = 'metric-value';
    }

    // Pearson - Pearson Correlation
    var pearsonElement = document.getElementById('metricPearson');
    if (metrics.R_Pirs !== undefined && metrics.R_Pirs !== null) {
        pearsonElement.textContent = metrics.R_Pirs.toFixed(4);
        pearsonElement.className = 'metric-value ' + getQualityClass('Pearson', metrics.R_Pirs);
    } else {
        pearsonElement.textContent = '--';
        pearsonElement.className = 'metric-value';
    }
}

/**
 * Get quality class based on metric type and value
 */
function getQualityClass(metricType, value) {
    switch (metricType) {
        case 'STDF':
            // Smoothness: lower is better
            if (value < 0.01) return 'quality-excellent';
            if (value < 0.05) return 'quality-good';
            return 'quality-poor';

        case 'DF':
            // Deleted Fraction: lower is better (as percentage)
            if (value < 5) return 'quality-excellent';
            if (value < 20) return 'quality-good';
            return 'quality-poor';

        case 'ASNR':
            // SNR (dB): higher is better
            if (value > 30) return 'quality-excellent';
            if (value >= 20) return 'quality-good';
            return 'quality-poor';

        case 'RMSE':
            // RMSE: lower is better
            if (value < 0.1) return 'quality-excellent';
            if (value < 0.5) return 'quality-good';
            return 'quality-poor';

        case 'RSquared':
            // R²: higher is better
            if (value > 0.9) return 'quality-excellent';
            if (value >= 0.7) return 'quality-good';
            return 'quality-poor';

        case 'Pearson':
            // Pearson: higher is better
            if (value > 0.9) return 'quality-excellent';
            if (value >= 0.7) return 'quality-good';
            return 'quality-poor';

        default:
            return '';
    }
}

/**
 * Toggle advanced settings visibility
 */
function toggleAdvancedSettings() {
    var settings = document.getElementById('advancedSettings');
    var isVisible = document.getElementById('advancedToggle').checked;

    if (isVisible) {
        settings.classList.remove('hidden');
        UI.log(I18n.t('msg.settingsShown'), 'info');
    } else {
        settings.classList.add('hidden');
        UI.log(I18n.t('msg.settingsHidden'), 'info');
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
            UI.log(message, 'info');
        }
    }

    // Calculate and display ETA
    var etaElement = document.getElementById('progressETA');
    if (etaElement && appState.operationStartTime) {
        var etaText = calculateETA(value);
        if (etaText) {
            etaElement.textContent = etaText;
            etaElement.classList.remove('hidden');
        } else {
            etaElement.classList.add('hidden');
        }
    }
}

/**
 * Calculate estimated time remaining (ETA)
 * Returns formatted string like "~2m 30s remaining" or null if not enough data
 */
function calculateETA(currentProgress) {
    // Don't calculate ETA for very small progress or at 100%
    if (currentProgress < 5 || currentProgress >= 100) {
        return null;
    }

    if (!appState.operationStartTime) {
        return null;
    }

    var now = Date.now();
    var elapsedMs = now - appState.operationStartTime;
    var elapsedSeconds = elapsedMs / 1000;

    // Calculate rate: progress per second
    var rate = currentProgress / elapsedSeconds;

    // If rate is too low or zero, don't calculate ETA
    if (rate <= 0.01) {
        return null;
    }

    // Calculate remaining time in seconds
    var remainingProgress = 100 - currentProgress;
    var estimatedSeconds = remainingProgress / rate;

    // Format the ETA
    var minutes = Math.floor(estimatedSeconds / 60);
    var seconds = Math.round(estimatedSeconds % 60);

    var etaText = '';
    if (minutes > 0) {
        etaText += '~' + minutes + 'm ';
    }
    if (seconds > 0 || etaText === '') {
        etaText += seconds + 's';
    }

    // Get localized "remaining" text
    var remainingKey = appState.currentLanguage === 'en' ? 'eta.remaining.en' : 'eta.remaining.ru';

    return etaText + ' ' + I18n.t(remainingKey);
}


/**
 * Show/hide progress bar (replaces old loading overlay)
 */
function showLoadingOverlay(show) {
    var progressBar = document.getElementById('progressBar');

    if (show) {
        // Set control panel status to processing
        setStatus('processing');

        if (progressBar) {
            progressBar.classList.remove('hidden');
            progressBar.classList.add('visible');
        }
        // Disable all action buttons
        document.getElementById('loadBtn').disabled = true;
        document.getElementById('tuneBtn').disabled = true;
        document.getElementById('cleanBtn').disabled = true;
        document.getElementById('saveBtn').disabled = true;
        document.getElementById('exportJsonBtn').disabled = true;
        document.getElementById('exportHtmlBtn').disabled = true;
        // Disable file input
        document.getElementById('fileInput').disabled = true;
    } else {
        if (progressBar) {
            setTimeout(function() {
                progressBar.classList.add('hidden');
                progressBar.classList.remove('visible');

                // Hide ETA display
                var etaElement = document.getElementById('progressETA');
                if (etaElement) {
                    etaElement.classList.add('hidden');
                    etaElement.textContent = '';
                }

                // Reset ETA tracking
                appState.operationStartTime = null;
                appState.currentOperation = null;
                appState.lastProgressUpdate = null;
            }, 1000); // Hide after 1 second delay
        }
        // Reset control panel status to ready
        setStatus('ready');

        // Re-enable load button
        document.getElementById('loadBtn').disabled = Queue.getStatus().queue.length === 0;
        document.getElementById('fileInput').disabled = false;
        // Re-enable tune button
        document.getElementById('tuneBtn').disabled = !appState.originalData;
        // Re-enable save button if data is cleaned
        document.getElementById('saveBtn').disabled = !appState.cleanedData;
        // Re-enable export buttons if data is cleaned
        document.getElementById('exportJsonBtn').disabled = !appState.cleanedData;
        document.getElementById('exportHtmlBtn').disabled = !appState.cleanedData;
        // Re-enable clean button (depends on state)
        document.getElementById('cleanBtn').disabled = !appState.originalData;
    }
}

/**
 * Update panel status with color coding
 * @param {string} status - 'ready', 'processing', 'error'
 */
function setStatus(status) {
    var controlStatus = document.querySelector('.control-panel .panel-status');
    if (controlStatus) {
        // Remove all status classes
        controlStatus.classList.remove('status-ready', 'status-processing', 'status-error');

        // Add appropriate class and update text
        if (status === 'ready') {
            controlStatus.classList.add('status-ready');
            controlStatus.setAttribute('data-i18n', 'panel.status.ready');
        } else if (status === 'processing') {
            controlStatus.classList.add('status-processing');
            controlStatus.setAttribute('data-i18n', 'panel.status.processing');
        } else if (status === 'error') {
            controlStatus.classList.add('status-error');
            controlStatus.setAttribute('data-i18n', 'panel.status.error');
        }

        // Update text via i18n
        var key = controlStatus.getAttribute('data-i18n');
        if (key) {
            controlStatus.textContent = I18n.t(key);
        }
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

    // Outlier markers (scatter points with glow)
    if (appState.outlierMasks && appState.outlierMasks.length > 0) {
        var numSeries = original[0].length - 1;

        for (var s = 0; s < numSeries; s++) {
            var seriesIndex = s + 1;
            var outlierMask = appState.outlierMasks[seriesIndex];

            if (outlierMask) {
                // Collect outlier points
                var outlierData = [];
                for (var i = 0; i < outlierMask.length && i < original.length; i++) {
                    if (outlierMask[i] === 1) {
                        outlierData.push({
                            x: original[i][0],
                            y: original[i][seriesIndex],
                            originalValue: original[i][seriesIndex],
                            cleanedValue: cleaned ? cleaned[i][seriesIndex] : null
                        });
                    }
                }

                // Limit outliers for performance
                if (outlierData.length > 500) {
                    outlierData = outlierData.filter(function(_, idx) {
                        return idx % Math.ceil(outlierData.length / 500) === 0;
                    });
                }

                if (outlierData.length > 0) {
                    datasets.push({
                        label: I18n.t('chart.outliers') + ' - Серия ' + (s + 1),
                        data: outlierData,
                        type: 'scatter',
                        backgroundColor: '#ffaa00',
                        borderColor: '#ffcc00',
                        borderWidth: 2,
                        pointRadius: 6,
                        pointHoverRadius: 10,
                        pointStyle: 'circle',
                        showLine: false,
                        order: 999 // Draw on top
                    });
                }
            }
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

    // Apply visibility settings
    updateChartDatasetsVisibility();

    // Update buttons state based on available data
    updateVisibilityButtonsState(!!original, !!cleaned);

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

    UI.log(I18n.t('log.heatmapDraw', {rows: rows, cols: cols, ntf: NTF[0][0]}), 'info');

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

    UI.log(I18n.t('log.heatmapShown'), 'success');
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

/**
 * Initialize heatmap interactivity (hover and click)
 */
function initializeHeatmapInteraction() {
    var canvas = document.getElementById('heatmapCanvas');
    if (!canvas) return;

    canvas.addEventListener('mousemove', handleHeatmapMouseMove);
    canvas.addEventListener('click', handleHeatmapClick);
    canvas.addEventListener('mouseleave', handleHeatmapMouseLeave);
}

/**
 * Handle heatmap mouse move - show tooltip
 */
function handleHeatmapMouseMove(event) {
    var canvas = event.target;
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    var cellInfo = getHeatmapCellFromCoords(x, y);
    if (!cellInfo) return;

    showHeatmapTooltip(cellInfo, event.clientX, event.clientY, rect);
}

/**
 * Handle heatmap click - apply parameters
 */
function handleHeatmapClick(event) {
    var canvas = event.target;
    var rect = canvas.getBoundingClientRect();
    var x = event.clientX - rect.left;
    var y = event.clientY - rect.top;

    var cellInfo = getHeatmapCellFromCoords(x, y);
    if (!cellInfo) return;

    // Apply parameters from clicked cell
    applyHeatmapParameters(cellInfo.windowWidth, cellInfo.threshold);
}

/**
 * Handle heatmap mouse leave - hide tooltip
 */
function handleHeatmapMouseLeave() {
    var tooltip = document.getElementById('heatmapTooltip');
    if (tooltip) {
        tooltip.classList.add('hidden');
    }
}

/**
 * Get heatmap cell information from coordinates
 */
function getHeatmapCellFromCoords(x, y) {
    if (!appState.heatmapMatrix) return null;

    var canvas = document.getElementById('heatmapCanvas');
    if (!canvas) return null;

    var rows = appState.heatmapMatrix.length;
    var cols = appState.heatmapMatrix[0].length;
    var cellWidth = canvas.width / cols;
    var cellHeight = canvas.height / rows;

    // Calculate cell indices
    var colIndex = Math.floor(x / cellWidth);
    var rowIndex = Math.floor(y / cellHeight);

    // Check bounds
    if (colIndex < 0 || colIndex >= cols || rowIndex < 0 || rowIndex >= rows) {
        return null;
    }

    // Calculate actual parameter values based on grid search algorithm
    // The grid searches from baseWindow + (matrixSize * step / 2) to baseWindow - ...
    var matrixSize = appState.params.matrixSize;
    var step = appState.params.relativeSize;

    // Reverse calculation from worker's performGridSearch
    var baseWindow = appState.params.windowWidth;
    var baseThreshold = appState.params.threshold;

    // Calculate window width for this column
    var windowWidth = Math.abs(baseWindow + (matrixSize * step / 2) - (rowIndex * step) - 1) + 1;

    // Calculate threshold for this row (using colIndex for threshold)
    var threshFactor = baseThreshold * 100;
    var threshold = (threshFactor + (matrixSize * step / 2) - step * colIndex) / 100;

    // Get NTF value
    var ntfValue = appState.heatmapMatrix[rowIndex][colIndex];

    return {
        row: rowIndex,
        col: colIndex,
        windowWidth: windowWidth,
        threshold: threshold,
        ntfValue: ntfValue
    };
}

/**
 * Show heatmap tooltip at position
 */
function showHeatmapTooltip(cellInfo, mouseX, mouseY, canvasRect) {
    var tooltip = document.getElementById('heatmapTooltip');
    if (!tooltip) return;

    // Build tooltip content
    var tooltipContent = '<strong>' + I18n.t('heatmap.tooltip.title') + '</strong>';
    tooltipContent += '<div class="tooltip-row">';
    tooltipContent += '<span class="tooltip-label">' + I18n.t('heatmap.tooltip.window') + ':</span>';
    tooltipContent += '<span class="tooltip-value">' + cellInfo.windowWidth.toFixed(0) + '</span>';
    tooltipContent += '</div>';
    tooltipContent += '<div class="tooltip-row">';
    tooltipContent += '<span class="tooltip-label">' + I18n.t('heatmap.tooltip.threshold') + ':</span>';
    tooltipContent += '<span class="tooltip-value">' + cellInfo.threshold.toFixed(3) + '</span>';
    tooltipContent += '</div>';
    tooltipContent += '<div class="tooltip-row">';
    tooltipContent += '<span class="tooltip-label">' + I18n.t('heatmap.tooltip.ntf') + ':</span>';
    tooltipContent += '<span class="tooltip-value">' + cellInfo.ntfValue.toFixed(4) + '</span>';
    tooltipContent += '</div>';

    tooltip.innerHTML = tooltipContent;
    tooltip.classList.remove('hidden');

    // Position tooltip near mouse but avoid overflow
    var tooltipWidth = tooltip.offsetWidth;
    var tooltipHeight = tooltip.offsetHeight;
    var pageX = mouseX + 15;
    var pageY = mouseY + 15;

    // Adjust if too close to right edge
    if (pageX + tooltipWidth > window.innerWidth) {
        pageX = mouseX - tooltipWidth - 15;
    }

    // Adjust if too close to bottom edge
    if (pageY + tooltipHeight > window.innerHeight) {
        pageY = mouseY - tooltipHeight - 15;
    }

    tooltip.style.left = pageX + 'px';
    tooltip.style.top = pageY + 'px';
}

/**
 * Apply parameters from heatmap cell
 */
function applyHeatmapParameters(windowWidth, threshold) {
    // Update appState
    appState.params.windowWidth = windowWidth;
    appState.params.threshold = threshold;

    // Update UI elements
    document.getElementById('windowWidth').value = windowWidth.toFixed(0);
    document.getElementById('windowWidthValue').textContent = windowWidth.toFixed(0);
    document.getElementById('threshold').value = threshold.toFixed(3);
    document.getElementById('thresholdValue').textContent = threshold.toFixed(3);

    // Log the parameter change
    UI.log(I18n.t('heatmap.selected', {window: windowWidth.toFixed(0), threshold: threshold.toFixed(3)}), 'info');
}

// ============================================================================
// WORKER COMMUNICATION
// ============================================================================

/**
 * Send message to worker
 */
function sendToWorker(type, data) {
    if (!worker) {
        UI.log('Worker не инициализирован', 'error');
        return;
    }

    currentJobId = generateJobId();

    // Start tracking operation for ETA
    if (type === 'TUNE' || type === 'CLEAN' || type === 'CLEAN_SERIES') {
        appState.operationStartTime = Date.now();
        appState.currentOperation = type.toLowerCase();
        appState.lastProgressUpdate = Date.now();
    }

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
    UI.log(I18n.t('error.worker', {message: error.message}), 'error');
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
    UI.log(I18n.t('error.execution', {message: data.message}), 'error');
    showLoadingOverlay(false);
}

// ============================================================================
// AUTO-TUNE OPERATION
// ============================================================================

/**
 * Auto-tune parameters
 */
function autoTune() {
    try {
        if (!appState.originalData) {
            UI.log(I18n.t('msg.noData'), 'warning');
            return;
        }

        UI.log(I18n.t('msg.tuning'), 'info');

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
    } catch (error) {
        showLoadingOverlay(false);
        ErrorHandler.show(error, ErrorHandler.types.PROCESSING, 'autoTune');
    }
}

/**
 * Handle auto-tune result
 */
function handleTuneResult(data) {
    console.log('[Main] Получен результат автоподбора:', data);
    var optimalParams = data.optimalParams;

    if (!optimalParams) {
        console.error('[Main] Ошибка: optimalParams не определен!');
        UI.log(I18n.t('error.tuneFailed'), 'error');
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

    // Draw NTF heatmap with interactivity
    if (data.NTF) {
        appState.heatmapMatrix = data.NTF;
        appState.heatmapOptimal = optimalParams;
        drawHeatmap(data.NTF, optimalParams);
        initializeHeatmapInteraction();
    }

    // Enable clean button
    document.getElementById('cleanBtn').disabled = false;

    UI.log(I18n.t('msg.tuned', {window: optimalParams.windowWidth.toFixed(0), threshold: optimalParams.threshold.toFixed(2)}), 'success');
    UI.log(I18n.t('msg.readyClean'), 'info');
}

// ============================================================================
// CLEAN OPERATION
// ============================================================================

/**
 * Clean data using current parameters
 */
function cleanData() {
    try {
        if (!appState.originalData) {
            UI.log(I18n.t('msg.noData'), 'warning');
            return;
        }

    UI.log(I18n.t('msg.cleaning'), 'info');

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
    } catch (error) {
        showLoadingOverlay(false);
        ErrorHandler.show(error, ErrorHandler.types.PROCESSING, 'cleanData');
    }
}

/**
 * Handle clean result for a single series
 */
function handleCleanSeriesResult(data) {
    var cleanedData = data.cleanedData;
    var seriesIndex = data.seriesIndex;
    var metrics = data.metrics;
    var outlierMask = data.outlierMask;

    // Update cleaned data for this series
    for (var i = 0; i < cleanedData.length && i < appState.cleanedData.length; i++) {
        appState.cleanedData[i][seriesIndex] = cleanedData[i];
    }

    // Store metrics from worker
    if (appState.seriesMetrics) {
        appState.seriesMetrics[seriesIndex] = metrics;
    }

    // Store outlier mask from first iteration
    if (outlierMask && !appState.outlierMasks) {
        appState.outlierMasks = [];
    }
    if (outlierMask) {
        appState.outlierMasks[seriesIndex] = outlierMask;
    }

    // Track progress
    appState.seriesCleaned++;
    var progress = (appState.seriesCleaned / appState.seriesToClean) * 100;

    UI.log(I18n.t('msg.cleanedSeries', {n: seriesIndex, total: appState.seriesToClean, percent: Math.round(progress)}), 'info');

    // Update progress bar
    updateProgress(progress, I18n.t('msg.cleaningSeries', {n: seriesIndex, total: appState.seriesToClean}));

    // If all series are cleaned, update UI
    if (appState.seriesCleaned >= appState.seriesToClean) {
        UI.log(I18n.t('msg.cleanedAll'), 'success');

        // Update metrics (average of all series from worker results)
        var avgMetrics = computeAverageMetrics();
        updateMetrics(avgMetrics);

        // Update chart
        switchTab('data');
        updateDataChart(appState.originalData, appState.cleanedData);

        // Update table series select
        updateTableSeriesSelect();

        // Enable save button
        document.getElementById('saveBtn').disabled = false;

        UI.log(I18n.t('msg.readySave'), 'info');
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
        UI.log(I18n.t('msg.noCleaned'), 'warning');
        return;
    }

    UI.log(I18n.t('msg.saving'), 'info');

    try {
        var saveRestored = document.getElementById('saveRestored').checked;
        var addValidityFlag = document.getElementById('addValidityFlag').checked;
        var exportFormat = document.getElementById('exportFormat').value;

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

        // Format based on selected export format
        var content;
        if (exportFormat === 'csv') {
            content = formatCsvData(outputData);
        } else {
            content = formatAsciiData(outputData);
        }

        // Generate filename with appropriate extension
        var originalName = appState.currentFile.name;
        var dotIndex = originalName.lastIndexOf('.');
        var baseName = dotIndex > 0 ? originalName.substring(0, dotIndex) : originalName;
        var extension = exportFormat === 'csv' ? '.csv' : '.txt';
        var filename = baseName + '_cleansed' + extension;

        // Trigger download
        Export.downloadFile(content, filename);

        UI.log(I18n.t('msg.saved', {name: filename, rows: outputData.length}), 'success');

    } catch (error) {
        ErrorHandler.show(error, ErrorHandler.types.EXPORT, 'saveData');
    }
}

/**
 * Show reset confirmation modal
 */
function showResetModal() {
    document.getElementById('resetModal').classList.add('show');
}

/**
 * Hide reset confirmation modal
 */
function hideResetModal() {
    document.getElementById('resetModal').classList.remove('show');
}

/**
 * Reset session - clear all data and reset to initial state
 */
function resetSession() {
    try {
        // Clear data
        appState.originalData = null;
        appState.cleanedData = null;
        appState.currentFile = null;
        appState.batchQueue = [];
        appState.optimalParams = null;
        appState.outlierMasks = null;
        appState.seriesToClean = 0;
        appState.seriesCleaned = 0;

        // Reset parameters to defaults
        appState.params = {
            windowWidth: 40,
            threshold: 1.4,
            matrixSize: 16,
            relativeSize: 4,
            fillMethod: 'nearest',
            numChunks: 3,
            useChunks: true
        };

        // Reset sliders
        document.getElementById('windowWidth').value = 40;
        document.getElementById('threshold').value = 1.4;
        document.getElementById('matrixSize').value = 16;
        document.getElementById('relativeSize').value = 4;
        document.getElementById('chunkOptimization').checked = true;
        document.getElementById('numChunks').value = 3;

        // Update parameter displays manually
        document.getElementById('windowWidthValue').textContent = '40';
        document.getElementById('thresholdValue').textContent = '1.40';
        document.getElementById('matrixSizeValue').textContent = '16 × 16';
        document.getElementById('relativeSizeValue').textContent = '4';
        document.getElementById('chunkCountValue').textContent = '3';

        // Reset fill method dropdown
        document.getElementById('fillMethod').value = 'nearest';

        // Clear chart
        if (appState.dataChart) {
            appState.dataChart.data.labels = [];
            appState.dataChart.data.datasets = [];
            appState.dataChart.update();
        }

        // Clear NTF heatmap
        if (appState.NTF) {
            appState.NTF = null;
            document.getElementById('heatmapCanvas').getContext('2d').clearRect(0, 0, 1000, 1000);
        }

        // Clear log
        document.getElementById('logArea').value = '';

        // Hide data panels
        document.getElementById('noDataMessage').style.display = 'block';
        document.getElementById('dataMetrics').style.display = 'none';

        // Disable action buttons
        document.getElementById('loadBtn').disabled = true;
        document.getElementById('tuneBtn').disabled = true;
        document.getElementById('cleanBtn').disabled = true;
        document.getElementById('saveBtn').disabled = true;
        document.getElementById('exportJsonBtn').disabled = true;
        document.getElementById('exportHtmlBtn').disabled = true;

        // Reset progress
        document.getElementById('progressBar').style.width = '0%';

        // Show file info
        document.getElementById('fileInfo').textContent = I18n.t('info.points') + ' 0, ' + I18n.t('info.series') + ' 0';

        // Hide modal
        hideResetModal();

        // Log success
        UI.log(I18n.t('msg.resetComplete'), 'success');

        console.log('Session reset complete');

    } catch (error) {
        console.error('Reset error:', error);
        alert('Error during reset: ' + error.message);
    }
}

/**
 * Zoom control functions
 */
function zoomIn() {
    if (appState.dataChart) {
        appState.dataChart.zoom(1.1);
    }
}

function zoomOut() {
    if (appState.dataChart) {
        appState.dataChart.zoom(0.9);
    }
}

function resetZoom() {
    if (appState.dataChart) {
        appState.dataChart.resetZoom();
    }
}

/**
 * Export JSON report
 */
function exportJsonReport() {
    if (!appState.cleanedData) {
        UI.log(I18n.t('msg.noCleanedForReport'), 'warning');
        return;
    }

    try {
        UI.log(I18n.t('msg.saving'), 'info');

        // Prepare report data
        var report = {
            metadata: {
                filename: appState.currentFile ? appState.currentFile.name : 'unknown',
                timestamp: new Date().toISOString(),
                language: I18n.getLanguage()
            },
            parameters: {
                windowWidth: appState.params.windowWidth,
                threshold: appState.params.threshold,
                matrixSize: appState.params.matrixSize,
                relativeSize: appState.params.relativeSize,
                fillMethod: appState.params.fillMethod
            },
            dataSummary: {
                totalPoints: appState.originalData ? appState.originalData.length : 0,
                totalSeries: appState.originalData ? (appState.originalData[0] ? appState.originalData[0].length - 1 : 0) : 0
            },
            metrics: {}
        };

        // Add metrics for each series
        if (appState.cleanedData && appState.cleanedData.length > 0) {
            report.metrics = {};
            var numSeries = appState.cleanedData[0] ? appState.cleanedData[0].length - 1 : 0;

            for (var s = 0; s < numSeries; s++) {
                report.metrics['series_' + (s + 1)] = {
                    STDF: parseFloat(document.getElementById('STDF_' + s).textContent) || 0,
                    DF: parseFloat(document.getElementById('DF_' + s).textContent) || 0,
                    ASNR: parseFloat(document.getElementById('ASNR_' + s).textContent) || 0,
                    RMSE: parseFloat(document.getElementById('RMSE_' + s).textContent) || 0,
                    RSquared: parseFloat(document.getElementById('RSquared_' + s).textContent) || 0,
                    Pearson: parseFloat(document.getElementById('Pearson_' + s).textContent) || 0
                };
            }
        }

        // Add outlier information
        if (appState.outlierMasks) {
            report.outliers = {
                totalOutliers: 0,
                bySeries: {}
            };

            for (var i = 0; i < appState.outlierMasks.length; i++) {
                var mask = appState.outlierMasks[i];
                var count = 0;
                for (var j = 0; j < mask.length; j++) {
                    if (mask[j] === 1) count++;
                }
                report.outliers.bySeries['series_' + (i + 1)] = count;
                report.outliers.totalOutliers += count;
            }
        }

        // Format as JSON
        var content = JSON.stringify(report, null, 2);

        // Generate filename
        var originalName = appState.currentFile ? appState.currentFile.name : 'data';
        var dotIndex = originalName.lastIndexOf('.');
        var baseName = dotIndex > 0 ? originalName.substring(0, dotIndex) : originalName;
        var filename = baseName + '_report.json';

        // Trigger download
        Export.downloadFile(content, filename);

        UI.log(I18n.t('msg.exportedJson', {name: filename}), 'success');

    } catch (error) {
        ErrorHandler.show(error, ErrorHandler.types.EXPORT, 'exportJsonReport');
    }
}

/**
 * Export HTML report
 */
function exportHtmlReport() {
    if (!appState.cleanedData) {
        UI.log(I18n.t('msg.noCleanedForReport'), 'warning');
        return;
    }

    try {
        UI.log(I18n.t('msg.saving'), 'info');

        // Generate HTML content
        var html = generateHtmlReport();

        // Generate filename
        var originalName = appState.currentFile ? appState.currentFile.name : 'data';
        var dotIndex = originalName.lastIndexOf('.');
        var baseName = dotIndex > 0 ? originalName.substring(0, dotIndex) : originalName;
        var filename = baseName + '_report.html';

        // Trigger download
        Export.downloadFile(html, filename);

        UI.log(I18n.t('msg.exportedHtml', {name: filename}), 'success');

    } catch (error) {
        ErrorHandler.show(error, ErrorHandler.types.EXPORT, 'exportHtmlReport');
    }
}

/**
 * Generate HTML report content
 */
function generateHtmlReport() {
    var lang = I18n.getLanguage();
    var isRu = lang === 'ru';

    // Get chart images
    var dataChartImage = appState.dataChart ? appState.dataChart.toBase64Image() : '';
    var heatmapImage = document.getElementById('heatmapCanvas').toDataURL('image/png');

    // Build HTML
    var html = '<!DOCTYPE html>\n';
    html += '<html lang="' + lang + '">\n';
    html += '<head>\n';
    html += '    <meta charset="UTF-8">\n';
    html += '    <title>' + (isRu ? 'Отчет об очистке данных' : 'Data Cleaning Report') + '</title>\n';
    html += '    <style>\n';
    html += '        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }\n';
    html += '        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }\n';
    html += '        h1 { color: #00aaff; border-bottom: 3px solid #00aaff; padding-bottom: 10px; }\n';
    html += '        h2 { color: #ffaa00; margin-top: 30px; }\n';
    html += '        .section { margin: 20px 0; }\n';
    html += '        .info-table { width: 100%; border-collapse: collapse; margin: 20px 0; }\n';
    html += '        .info-table th { background: #00aaff; color: white; padding: 12px; text-align: left; }\n';
    html += '        .info-table td { padding: 12px; border-bottom: 1px solid #ddd; }\n';
    html += '        .info-table tr:hover { background: #f5f5f5; }\n';
    html += '        .metric-table { width: 100%; border-collapse: collapse; margin: 20px 0; }\n';
    html += '        .metric-table th { background: #ffaa00; color: white; padding: 12px; }\n';
    html += '        .metric-table td { padding: 12px; border-bottom: 1px solid #ddd; text-align: center; }\n';
    html += '        .chart-container { margin: 30px 0; text-align: center; }\n';
    html += '        .chart-container img { max-width: 100%; border: 2px solid #00aaff; }\n';
    html += '        .footer { margin-top: 40px; text-align: center; color: #888; font-size: 12px; }\n';
    html += '        .quality-excellent { color: #00ff88; font-weight: bold; }\n';
    html += '        .quality-good { color: #ffaa00; font-weight: bold; }\n';
    html += '        .quality-poor { color: #ff4444; font-weight: bold; }\n';
    html += '        @media print { body { margin: 0; } .container { box-shadow: none; } }\n';
    html += '    </style>\n';
    html += '</head>\n';
    html += '<body>\n';
    html += '    <div class="container">\n';
    html += '        <h1>' + (isRu ? 'ОТЧЕТ ОБ ОЧИСТКЕ ДАННЫХ' : 'DATA CLEANING REPORT') + '</h1>\n';

    // Metadata section
    html += '        <div class="section">\n';
    html += '            <h2>' + (isRu ? 'Метаданные' : 'Metadata') + '</h2>\n';
    html += '            <table class="info-table">\n';
    html += '                <tr><th>' + (isRu ? 'Параметр' : 'Parameter') + '</th><th>' + (isRu ? 'Значение' : 'Value') + '</th></tr>\n';
    html += '                <tr><td>' + (isRu ? 'Имя файла' : 'Filename') + '</td><td>' + (appState.currentFile ? appState.currentFile.name : 'unknown') + '</td></tr>\n';
    html += '                <tr><td>' + (isRu ? 'Дата создания' : 'Created') + '</td><td>' + new Date().toLocaleString() + '</td></tr>\n';
    html += '            </table>\n';
    html += '        </div>\n';

    // Parameters section
    html += '        <div class="section">\n';
    html += '            <h2>' + (isRu ? 'Параметры очистки' : 'Cleaning Parameters') + '</h2>\n';
    html += '            <table class="info-table">\n';
    html += '                <tr><th>' + (isRu ? 'Параметр' : 'Parameter') + '</th><th>' + (isRu ? 'Значение' : 'Value') + '</th></tr>\n';
    html += '                <tr><td>' + (isRu ? 'Ширина окна' : 'Window Width') + '</td><td>' + appState.params.windowWidth + '</td></tr>\n';
    html += '                <tr><td>' + (isRu ? 'Пороговый коэффициент' : 'Threshold') + '</td><td>' + appState.params.threshold + '</td></tr>\n';
    html += '                <tr><td>' + (isRu ? 'Размер матрицы' : 'Matrix Size') + '</td><td>' + appState.params.matrixSize + '</td></tr>\n';
    html += '                <tr><td>' + (isRu ? 'Относительный размер' : 'Relative Size') + '</td><td>' + appState.params.relativeSize + '</td></tr>\n';
    html += '                <tr><td>' + (isRu ? 'Метод заполнения' : 'Fill Method') + '</td><td>' + appState.params.fillMethod + '</td></tr>\n';
    html += '            </table>\n';
    html += '        </div>\n';

    // Metrics section
    html += '        <div class="section">\n';
    html += '            <h2>' + (isRu ? 'Метрики качества' : 'Quality Metrics') + '</h2>\n';

    if (appState.cleanedData && appState.cleanedData.length > 0) {
        var numSeries = appState.cleanedData[0] ? appState.cleanedData[0].length - 1 : 0;

        html += '            <table class="metric-table">\n';
        html += '                <tr><th>' + (isRu ? 'Серия' : 'Series') + '</th><th>STDF</th><th>DF</th><th>ASNR</th><th>RMSE</th><th>R²</th><th>Pearson</th></tr>\n';

        for (var s = 0; s < numSeries; s++) {
            var stdf = parseFloat(document.getElementById('STDF_' + s).textContent) || 0;
            var df = parseFloat(document.getElementById('DF_' + s).textContent) || 0;
            var asnr = parseFloat(document.getElementById('ASNR_' + s).textContent) || 0;
            var rmse = parseFloat(document.getElementById('RMSE_' + s).textContent) || 0;
            var r2 = parseFloat(document.getElementById('RSquared_' + s).textContent) || 0;
            var pearson = parseFloat(document.getElementById('Pearson_' + s).textContent) || 0;

            var stdfClass = stdf < 0.01 ? 'quality-excellent' : (stdf < 0.05 ? 'quality-good' : 'quality-poor');
            var r2Class = r2 > 0.9 ? 'quality-excellent' : (r2 >= 0.7 ? 'quality-good' : 'quality-poor');
            var pearsonClass = pearson > 0.9 ? 'quality-excellent' : (pearson >= 0.7 ? 'quality-good' : 'quality-poor');

            html += '                <tr>';
            html += '<td><strong>' + (s + 1) + '</strong></td>';
            html += '<td>' + stdf.toFixed(4) + '</td>';
            html += '<td>' + df.toFixed(2) + '%</td>';
            html += '<td>' + asnr.toFixed(2) + ' dB</td>';
            html += '<td>' + rmse.toFixed(4) + '</td>';
            html += '<td class="' + r2Class + '">' + r2.toFixed(4) + '</td>';
            html += '<td class="' + pearsonClass + '">' + pearson.toFixed(4) + '</td>';
            html += '</tr>\n';
        }

        html += '            </table>\n';
    }

    html += '        </div>\n';

    // Outliers section
    if (appState.outlierMasks) {
        html += '        <div class="section">\n';
        html += '            <h2>' + (isRu ? 'Статистика выбросов' : 'Outlier Statistics') + '</h2>\n';
        html += '            <table class="info-table">\n';
        html += '                <tr><th>' + (isRu ? 'Серия' : 'Series') + '</th><th>' + (isRu ? 'Количество' : 'Count') + '</th></tr>\n';

        var totalOutliers = 0;
        for (var i = 0; i < appState.outlierMasks.length; i++) {
            var mask = appState.outlierMasks[i];
            var count = 0;
            for (var j = 0; j < mask.length; j++) {
                if (mask[j] === 1) count++;
            }
            totalOutliers += count;
            html += '                <tr><td>' + (isRu ? 'Серия ' : 'Series ') + (i + 1) + '</td><td>' + count + '</td></tr>\n';
        }

        html += '                <tr><td><strong>' + (isRu ? 'Всего' : 'Total') + '</strong></td><td><strong>' + totalOutliers + '</strong></td></tr>\n';
        html += '            </table>\n';
        html += '        </div>\n';
    }

    // Charts section
    html += '        <div class="section">\n';
    html += '            <h2>' + (isRu ? 'Визуализация' : 'Visualization') + '</h2>\n';
    if (dataChartImage) {
        html += '            <div class="chart-container">\n';
        html += '                <h3>' + (isRu ? 'Данные' : 'Data Chart') + '</h3>\n';
        html += '                <img src="' + dataChartImage + '" alt="Data Chart">\n';
        html += '            </div>\n';
    }
    if (heatmapImage) {
        html += '            <div class="chart-container">\n';
        html += '                <h3>' + (isRu ? 'Карта параметров' : 'Parameter Map') + '</h3>\n';
        html += '                <img src="' + heatmapImage + '" alt="Parameter Map">\n';
        html += '            </div>\n';
    }
    html += '        </div>\n';

    // Footer
    html += '        <div class="footer">\n';
    html += '            <p>ОТК-001 /// СИСТЕМА ОЧИСТКИ ДАННЫХ ВРЕМЕННЫХ РЯДОВ /// ODC-001 Time Series Data Cleaning System</p>\n';
    html += '            <p>' + (isRu ? 'Разработчик: Фунтиков В.М.' : 'Developer: Vladimir M. Funtikov') + '</p>\n';
    html += '        </div>\n';
    html += '    </div>\n';
    html += '</body>\n';
    html += '</html>\n';

    return html;
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
 * Format data as CSV
 */
function formatCsvData(data) {
    var lines = [];

    // Header comment
    lines.push('# ' + I18n.t('msg.fileHeader'));
    lines.push('# ' + I18n.t('msg.generated') + ' ' + new Date().toISOString());

    // Data rows with comma separator
    for (var i = 0; i < data.length; i++) {
        var row = data[i];
        var formatted = row.map(function(v) { return v.toFixed(6); }).join(',');
        lines.push(formatted);
    }

    return lines.join('\n');
}


// ============================================================================
// TABLE VIEW FUNCTIONS
// ============================================================================

/**
 * Initialize view toggle (chart/table)
 */
function initializeViewToggle() {
    var chartViewBtn = document.getElementById('chartViewBtn');
    var tableViewBtn = document.getElementById('tableViewBtn');

    if (chartViewBtn) {
        chartViewBtn.addEventListener('click', function() {
            switchView('chart');
        });
    }

    if (tableViewBtn) {
        tableViewBtn.addEventListener('click', function() {
            switchView('table');
        });
    }

    // Table controls
    var tableFilter = document.getElementById('tableFilter');
    if (tableFilter) {
        tableFilter.addEventListener('input', Utils.debounce(function() {
            appState.tableState.filterText = this.value.toLowerCase();
            appState.tableState.currentPage = 1;
            renderTable();
        }, 200));
    }

    var tableSeriesSelect = document.getElementById('tableSeriesSelect');
    if (tableSeriesSelect) {
        tableSeriesSelect.addEventListener('change', function() {
            appState.tableState.selectedSeries = this.value;
            appState.tableState.currentPage = 1;
            renderTable();
        });
    }

    var exportTableBtn = document.getElementById('exportTableBtn');
    if (exportTableBtn) {
        exportTableBtn.addEventListener('click', exportTableToCSV);
    }

    // Pagination
    var prevPageBtn = document.getElementById('prevPageBtn');
    var nextPageBtn = document.getElementById('nextPageBtn');

    if (prevPageBtn) {
        prevPageBtn.addEventListener('click', function() {
            if (appState.tableState.currentPage > 1) {
                appState.tableState.currentPage--;
                renderTable();
            }
        });
    }

    if (nextPageBtn) {
        nextPageBtn.addEventListener('click', function() {
            var filteredData = getFilteredTableData();
            var maxPage = Math.ceil(filteredData.length / appState.tableState.pageSize);
            if (appState.tableState.currentPage < maxPage) {
                appState.tableState.currentPage++;
                renderTable();
            }
        });
    }
}

/**
 * Switch between chart and table views
 */
function switchView(view) {
    appState.currentView = view;

    var chartContainer = document.getElementById('chartContainer');
    var tableContainer = document.getElementById('tableContainer');
    var chartViewBtn = document.getElementById('chartViewBtn');
    var tableViewBtn = document.getElementById('tableViewBtn');

    if (view === 'chart') {
        chartContainer.style.display = 'block';
        tableContainer.style.display = 'none';
        chartViewBtn.classList.add('active');
        tableViewBtn.classList.remove('active');
    } else {
        chartContainer.style.display = 'none';
        tableContainer.style.display = 'flex';
        chartViewBtn.classList.remove('active');
        tableViewBtn.classList.add('active');
        updateTableSeriesSelect();
        renderTable();
    }
}

/**
 * Update table series select options
 */
function updateTableSeriesSelect() {
    var tableSeriesSelect = document.getElementById('tableSeriesSelect');
    if (!tableSeriesSelect) return;

    // Save current selection
    var currentValue = tableSeriesSelect.value;

    // Clear options
    tableSeriesSelect.innerHTML = '';

    // Add "All Series" option
    var allOption = document.createElement('option');
    allOption.value = 'all';
    allOption.textContent = I18n.t('table.allSeries');
    tableSeriesSelect.appendChild(allOption);

    // Add series options if data exists
    if (appState.originalData && appState.originalData.length > 0) {
        var numSeries = appState.originalData[0].length - 1;
        for (var i = 0; i < numSeries; i++) {
            var option = document.createElement('option');
            option.value = (i + 1).toString();
            option.textContent = 'Серия ' + (i + 1);
            tableSeriesSelect.appendChild(option);
        }
    }

    // Restore selection if possible
    if (currentValue && tableSeriesSelect.querySelector('option[value="' + currentValue + '"]')) {
        tableSeriesSelect.value = currentValue;
    }
}

/**
 * Get filtered and sorted table data
 */
function getFilteredTableData() {
    if (!appState.originalData || !appState.cleanedData) {
        return [];
    }

    var data = [];

    // Build table rows
    for (var i = 0; i < appState.originalData.length; i++) {
        var time = appState.originalData[i][0];
        var originalSeries = appState.originalData[i].slice(1);
        var cleanedSeries = appState.cleanedData[i].slice(1);

        // Determine if this row has outliers
        var hasOutlier = false;
        for (var j = 0; j < originalSeries.length; j++) {
            if (originalSeries[j] !== cleanedSeries[j]) {
                hasOutlier = true;
                break;
            }
        }

        data.push({
            index: i,
            time: time,
            original: originalSeries,
            cleaned: cleanedSeries,
            hasOutlier: hasOutlier
        });
    }

    // Apply series filter
    if (appState.tableState.selectedSeries !== 'all') {
        var seriesIndex = parseInt(appState.tableState.selectedSeries) - 1;
        data = data.map(function(row) {
            return {
                index: row.index,
                time: row.time,
                original: row.original[seriesIndex],
                cleaned: row.cleaned[seriesIndex],
                hasOutlier: row.original[seriesIndex] !== row.cleaned[seriesIndex]
            };
        });
    } else {
        // For all series, flatten data
        var flatData = [];
        for (var i = 0; i < data.length; i++) {
            for (var j = 0; j < data[i].original.length; j++) {
                flatData.push({
                    index: data[i].index,
                    time: data[i].time,
                    series: j + 1,
                    original: data[i].original[j],
                    cleaned: data[i].cleaned[j],
                    hasOutlier: data[i].original[j] !== data[i].cleaned[j]
                });
            }
        }
        data = flatData;
    }

    // Apply text filter
    if (appState.tableState.filterText) {
        data = data.filter(function(row) {
            var text = row.time.toString() + ' ' +
                      row.original.toString() + ' ' +
                      row.cleaned.toString() + ' ' +
                      (row.series ? row.series.toString() : '');
            return text.toLowerCase().includes(appState.tableState.filterText);
        });
    }

    // Apply sorting
    if (appState.tableState.sortColumn) {
        var col = appState.tableState.sortColumn;
        var dir = appState.tableState.sortDirection === 'asc' ? 1 : -1;

        data.sort(function(a, b) {
            var valA, valB;

            switch (col) {
                case 'index':
                    valA = a.index;
                    valB = b.index;
                    break;
                case 'time':
                    valA = a.time;
                    valB = b.time;
                    break;
                case 'original':
                    valA = a.original;
                    valB = b.original;
                    break;
                case 'cleaned':
                    valA = a.cleaned;
                    valB = b.cleaned;
                    break;
                case 'status':
                    valA = a.hasOutlier ? 1 : 0;
                    valB = b.hasOutlier ? 1 : 0;
                    break;
                default:
                    return 0;
            }

            if (valA < valB) return -1 * dir;
            if (valA > valB) return 1 * dir;
            return 0;
        });
    }

    return data;
}

/**
 * Render table with current state
 */
function renderTable() {
    var tableBody = document.getElementById('tableBody');
    var tableSeriesHeader = document.getElementById('tableSeriesHeader');
    var tableNoData = document.getElementById('tableNoData');
    var pageInfo = document.getElementById('pageInfo');
    var prevPageBtn = document.getElementById('prevPageBtn');
    var nextPageBtn = document.getElementById('nextPageBtn');

    if (!tableBody) return;

    // Show/hide series column based on selection
    if (tableSeriesHeader) {
        tableSeriesHeader.style.display = appState.tableState.selectedSeries === 'all' ? 'table-cell' : 'none';
    }

    var data = getFilteredTableData();

    // Show/hide no data message
    if (data.length === 0) {
        tableBody.innerHTML = '';
        tableNoData.classList.add('active');
        pageInfo.textContent = '';
        prevPageBtn.disabled = true;
        nextPageBtn.disabled = true;
        return;
    }

    tableNoData.classList.remove('active');

    // Pagination
    var currentPage = appState.tableState.currentPage;
    var pageSize = appState.tableState.pageSize;
    var totalPages = Math.ceil(data.length / pageSize);

    // Adjust current page if out of range
    if (currentPage > totalPages) {
        currentPage = totalPages;
        appState.tableState.currentPage = currentPage;
    }

    var startIndex = (currentPage - 1) * pageSize;
    var endIndex = Math.min(startIndex + pageSize, data.length);
    var pageData = data.slice(startIndex, endIndex);

    // Render rows
    var html = '';

    for (var i = 0; i < pageData.length; i++) {
        var row = pageData[i];

        html += '<tr>';
        html += '<td>' + (row.index + 1) + '</td>';
        html += '<td>' + row.time.toFixed(6) + '</td>';

        if (row.series !== undefined) {
            html += '<td>' + row.series + '</td>';
        }

        html += '<td>' + (typeof row.original === 'number' ? row.original.toFixed(6) : row.original.join(', ')) + '</td>';
        html += '<td>' + (typeof row.cleaned === 'number' ? row.cleaned.toFixed(6) : row.cleaned.join(', ')) + '</td>';
        html += '<td class="' + (row.hasOutlier ? 'status-outlier' : 'status-valid') + '">';
        html += row.hasOutlier ? I18n.t('table.status.outlier') : I18n.t('table.status.valid');
        html += '</td>';
        html += '</tr>';
    }

    tableBody.innerHTML = html;

    // Update pagination info
    pageInfo.textContent = I18n.t('table.pagination', {
        start: startIndex + 1,
        end: endIndex,
        total: data.length
    });

    // Update button states
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;

    // Update sort indicators
    updateTableSortIndicators();
}

/**
 * Update table column sort indicators
 */
function updateTableSortIndicators() {
    var headers = document.querySelectorAll('#dataTable th[data-sort]');

    headers.forEach(function(header) {
        header.classList.remove('sort-asc', 'sort-desc');

        if (header.dataset.sort === appState.tableState.sortColumn) {
            header.classList.add(appState.tableState.sortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
    });
}

/**
 * Handle table column click for sorting
 */
function handleTableSort(column) {
    if (appState.tableState.sortColumn === column) {
        // Toggle direction
        appState.tableState.sortDirection = appState.tableState.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        appState.tableState.sortColumn = column;
        appState.tableState.sortDirection = 'asc';
    }

    renderTable();
}

/**
 * Export table to CSV
 */
function exportTableToCSV() {
    var data = getFilteredTableData();

    if (data.length === 0) {
        UI.log(I18n.t('msg.noCleanedForReport'), 'error');
        return;
    }

    var lines = [];

    // Header
    var header = [I18n.t('table.index'), I18n.t('table.time')];
    if (appState.tableState.selectedSeries !== 'all') {
        header.push('Series', I18n.t('table.original'), I18n.t('table.cleaned'));
    } else {
        header.push('Series', I18n.t('table.original'), I18n.t('table.cleaned'));
    }
    header.push(I18n.t('table.status'));
    lines.push(header.join(','));

    // Data rows
    for (var i = 0; i < data.length; i++) {
        var row = [
            data[i].index + 1,
            data[i].time.toFixed(6),
            data[i].series !== undefined ? data[i].series : '',
            typeof data[i].original === 'number' ? data[i].original.toFixed(6) : data[i].original.join(';'),
            typeof data[i].cleaned === 'number' ? data[i].cleaned.toFixed(6) : data[i].cleaned.join(';'),
            data[i].hasOutlier ? 'Outlier' : 'Valid'
        ];
        lines.push(row.join(','));
    }

    // Download
    var csvContent = lines.join('\n');
    var filename = (appState.currentFile ? appState.currentFile.name.replace(/\.[^/.]+$/, '') : 'data') + '_table.csv';
    Export.downloadFile(csvContent, filename);

    UI.log(I18n.t('msg.saved', { name: filename, rows: data.length }), 'success');
}

// ============================================================================
//   PRESETS MANAGEMENT
// ============================================================================

/**
 * Default presets configuration
 */
var defaultPresets = {
    'conservative': {
        windowWidth: 60,
        threshold: 2.0,
        matrixSize: 20,
        relativeSize: 5,
        fillMethod: 'nearest',
        useChunks: true,
        numChunks: 2
    },
    'balanced': {
        windowWidth: 40,
        threshold: 1.4,
        matrixSize: 16,
        relativeSize: 4,
        fillMethod: 'nearest',
        useChunks: true,
        numChunks: 3
    },
    'aggressive': {
        windowWidth: 20,
        threshold: 0.8,
        matrixSize: 12,
        relativeSize: 3,
        fillMethod: 'linear',
        useChunks: true,
        numChunks: 4
    }
};

/**
 * Get all presets (default + custom)
 */
function getAllPresets() {
    var presets = JSON.parse(JSON.stringify(defaultPresets));
    var customPresets = Storage.loadPresets();
    if (customPresets) {
        var parsed = JSON.parse(customPresets);
        for (var key in parsed) {
            presets[key] = parsed[key];
        }
    }
    return presets;
}

/**
 * Update preset dropdown options
 */
function updatePresetSelect() {
    var presetSelect = document.getElementById('presetSelect');
    if (!presetSelect) return;

    var currentValue = presetSelect.value;
    presetSelect.innerHTML = '';

    // Add placeholder
    var defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = I18n.t('presets.select');
    presetSelect.appendChild(defaultOption);

    // Add default presets
    for (var key in defaultPresets) {
        var option = document.createElement('option');
        option.value = key;
        option.textContent = I18n.t('presets.' + key);
        presetSelect.appendChild(option);
    }

    // Add separator
    var separator = document.createElement('option');
    separator.value = '---';
    separator.textContent = '--- ' + (currentLanguage === 'ru' ? 'Пользовательские пресеты' : 'Custom Presets') + ' ---';
    separator.disabled = true;
    presetSelect.appendChild(separator);

    // Add custom presets
    var customPresets = Storage.loadPresets();
    if (customPresets) {
        var parsed = JSON.parse(customPresets);
        for (var key in parsed) {
            var customOption = document.createElement('option');
            customOption.value = key;
            customOption.textContent = key;
            presetSelect.appendChild(customOption);
        }
    }

    // Restore selection if still valid
    if (currentValue && (defaultPresets[currentValue] || (parsed && parsed[currentValue]))) {
        presetSelect.value = currentValue;
    }

    updateDeleteButtonState();
}

/**
 * Get current parameter values
 */
function getCurrentParams() {
    return {
        windowWidth: parseInt(document.getElementById('windowWidth').value),
        threshold: parseFloat(document.getElementById('threshold').value),
        matrixSize: parseInt(document.getElementById('matrixSize').value),
        relativeSize: parseInt(document.getElementById('relativeSize').value),
        fillMethod: document.getElementById('fillMethod').value,
        useChunks: document.getElementById('useChunks').checked,
        numChunks: parseInt(document.getElementById('numChunks').value)
    };
}

/**
 * Apply preset parameters
 */
function applyPreset(presetName) {
    var presets = getAllPresets();
    var preset = presets[presetName];

    if (!preset) {
        UI.log('Preset not found: ' + presetName, 'error');
        return;
    }

    // Apply parameters to UI
    document.getElementById('windowWidth').value = preset.windowWidth;
    document.getElementById('windowWidthValue').textContent = preset.windowWidth;

    document.getElementById('threshold').value = preset.threshold;
    document.getElementById('thresholdValue').textContent = preset.threshold;

    document.getElementById('matrixSize').value = preset.matrixSize;
    document.getElementById('matrixSizeValue').textContent = preset.matrixSize;

    document.getElementById('relativeSize').value = preset.relativeSize;
    document.getElementById('relativeSizeValue').textContent = preset.relativeSize;

    document.getElementById('fillMethod').value = preset.fillMethod;

    document.getElementById('useChunks').checked = preset.useChunks;
    document.getElementById('numChunks').value = preset.numChunks;
    document.getElementById('numChunksValue').textContent = preset.numChunks;

    // Update app state
    appState.params = getCurrentParams();

    UI.log(I18n.t('presets.applied', { name: presetName }), 'success');
}

/**
 * Save current settings as preset
 */
function savePreset() {
    var name = prompt(I18n.t('presets.enterName'));

    if (!name || name.trim() === '') {
        return;
    }

    name = name.trim();

    // Get current parameters
    var currentParams = getCurrentParams();

    // Load existing custom presets
    var customPresets = Storage.loadPresets();
    var presets = {};
    if (customPresets) {
        presets = JSON.parse(customPresets);
    }

    // Check if preset already exists
    if (presets[name]) {
        if (!confirm(I18n.t('presets.overwrite'))) {
            return;
        }
    }

    // Save preset
    presets[name] = currentParams;
    Storage.savePresets(presets);

    // Update dropdown
    updatePresetSelect();

    // Select the new preset
    document.getElementById('presetSelect').value = name;

    UI.log(I18n.t('presets.saved', { name: name }), 'success');

    updateDeleteButtonState();
}

/**
 * Delete current preset
 */
function deletePreset() {
    var presetSelect = document.getElementById('presetSelect');
    var presetName = presetSelect.value;

    if (!presetName || presetName === '' || presetName === '---') {
        return;
    }

    // Don't delete default presets
    if (defaultPresets[presetName]) {
        UI.log('Cannot delete default preset: ' + presetName, 'error');
        return;
    }

    if (!confirm(I18n.t('presets.deleted') + '?')) {
        return;
    }

    // Load and update custom presets
    var customPresets = Storage.loadPresets();
    var presets = {};
    if (customPresets) {
        presets = JSON.parse(customPresets);
    }

    delete presets[presetName];
    Storage.savePresets(presets);

    // Update dropdown
    updatePresetSelect();

    UI.log(I18n.t('presets.deleted') + ': ' + presetName, 'success');
}

/**
 * Update delete button state (disabled for default presets)
 */
function updateDeleteButtonState() {
    var presetSelect = document.getElementById('presetSelect');
    var deleteBtn = document.getElementById('deletePresetBtn');

    if (!presetSelect || !deleteBtn) return;

    var presetName = presetSelect.value;

    // Disable delete for no selection, separator, or default presets
    if (!presetName || presetName === '' || presetName === '---' || defaultPresets[presetName]) {
        deleteBtn.disabled = true;
    } else {
        deleteBtn.disabled = false;
    }
}
