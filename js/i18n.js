/**
 * i18n.js - Internationalization (i18n) system
 * Manages translations for multiple languages
 */

(function(global) {
    'use strict';

    // ============================================================================
    // TRANSLATION DICTIONARIES
    // ============================================================================

    const translations = {
        'ru': {
            // Header
            'title.prefix': 'ОТК-001',
            'title.main': 'СИСТЕМА ОЧИСТКИ ДАННЫХ',

            // Control Panel
            'panel.control': 'ПАНЕЛЬ УПРАВЛЕНИЯ',
            'panel.status.ready': 'ГОТОВ',
            'panel.status.online': 'ОНЛАЙН',
            'panel.status.processing': 'ВЫПОЛНЕНИЕ...',

            // File Loading
            'section.load': '1. ЗАГРУЗКА ДАННЫХ',
            'label.file': 'Выбор файла данных:',
            'desc.file': 'ASCII формат, столбцы: время, сигналы...',
            'button.open': 'ОТКРЫТЬ ФАЙЛ',
            'file.count': 'Выбрано файлов: {count}',

            // Advanced Settings
            'toggle.advanced': 'ОТКРЫТЬ КАПОТ (расширенные настройки)',
            'desc.advanced': 'Показать параметры настройки алгоритма',
            'section.params': 'ПАРАМЕТРЫ АЛГОРИТМА',

            // Sliders
            'label.window': 'Ширина окна',
            'desc.window': 'Размер скользящего окна (1-100)',
            'unit.window': 'ед.',
            'tooltip.window': 'Размер окна для расчёта статистики\nБольшее окно = более плавная статистика\nМеньшее окно = более чувствительное обнаружение\nРекомендуемые значения: 20-60',
            'label.threshold': 'Пороговый коэффициент',
            'desc.threshold': 'Чувствительность обнаружения (0.1-2.0)',
            'tooltip.threshold': 'Множитель стандартного отклонения\nНизкое значение = больше выбросов\nВысокое значение = меньше выбросов\nРекомендуемые значения: 1.0-1.8',
            'label.matrix': 'Размер матрицы наводки',
            'desc.matrix': 'Размер сетки поиска параметров (10-50)',
            'unit.matrix': '×{value}',
            'tooltip.matrix': 'Размерность сетки параметров\nБольше = точный поиск, медленнее\nМеньше = быстрый поиск, менее точно\nРекомендуемые значения: 10-25',
            'label.relative': 'Относительный размер 2 матрицы',
            'desc.relative': 'Шаг грубого поиска (1-9)',
            'tooltip.relative': 'Шаг для первого этапа оптимизации\n1 = точный, но медленный\n9 = быстрый, но грубый\nРекомендуемые значения: 2-5',

            // Optimization
            'label.chunks': 'Количество тестовых чанков',
            'desc.chunks': 'Чанк=25 точек (1-5)',
            'unit.chunks': 'шт.',
            'checkbox.chunks': 'Оптимизация через чанки',
            'desc.optimization': 'Ускоряет автоподбор в 5-10 раз',

            // Fill Method
            'label.fillMethod': 'Метод заполнения выбросов',
            'desc.fillMethod': 'Способ замещения обнаруженных аномалий',
            'fillMethod.extreme': '↗∞ Экстремальное значение (маркировка)',
            'fillMethod.center': 'Центральное значение (медиана/среднее)',
            'fillMethod.clip': 'Пороговая обрезка',
            'fillMethod.previous': 'Предыдущее верное',
            'fillMethod.next': 'Следующее верное',
            'fillMethod.nearest': 'Ближайшее верное',
            'fillMethod.linear': 'Линейная интерполяция',
            'fillMethod.spline': 'Сплайн-интерполяция',
            'fillMethod.pchip': 'Сплайн² (PCHIP)',
            'fillMethod.makima': 'Модификатор Акимы',

            // Operations
            'section.operations': '2. ОПЕРАЦИИ',
            'button.load': 'ЗАГРУЗИТЬ',
            'desc.load': 'Чтение файла данных',
            'button.tune': 'НАВЕСТЬСЯ',
            'desc.tune': 'Автоподбор параметров',
            'button.clean': 'ОЧИСТИТЬ',
            'desc.clean': 'Применить фильтрацию',
            'button.save': 'СОХРАНИТЬ',
            'desc.save': 'Экспорт результатов',
            'button.reset': 'СБРОС СЕССИИ',
            'desc.reset': 'Очистить все данные и начать заново',

            // Export Report
            'section.report': '4. ЭКСПОРТ ОТЧЕТА',
            'button.exportJson': 'JSON ОТЧЕТ',
            'desc.exportJson': 'Экспорт в структурированный формат',
            'button.exportHtml': 'HTML ОТЧЕТ',
            'desc.exportHtml': 'Экспорт с графиками и метриками',

            // Save Options
            'section.save': '3. ПАРАМЕТРЫ СОХРАНЕНИЯ',
            'checkbox.saveRestored': 'Сохранить восстановленные данные',
            'desc.saveRestored': 'Включить в результат восстановленные значения',
            'checkbox.validityFlag': 'Дополнить признаком истинности',
            'desc.validityFlag': 'Добавить столбец с флагом корректности (0/1)',

            // Progress
            'section.progress': '4. ХОД ПРОЦЕССА',

            // Log
            'section.log': '5. ЖУРНАЛ ОПЕРАЦИЙ',
            'log.init': 'Система готова к работе. Приятного использования!',
            'log.systemInit': 'Система инициализирована. Готова к работе.',
            'log.workerInit': 'Встроенный Web Worker инициализирован.',
            'log.heatmapDraw': 'Отрисовка тепловой карты: {rows}x{cols}, NTF[0][0] = {ntf}',
            'log.heatmapShown': 'Карта параметров отображена',

            // Visualization Panel
            'panel.visualization': 'ПАНЕЛЬ ВИЗУАЛИЗАЦИИ',

            // Tabs
            'tab.data': 'ДАННЫЕ',
            'tab.heatmap': 'КАРТА ПАРАМЕТРОВ',

            // No Data Messages
            'noData.title': 'Нет загруженных данных',
            'noData.subtitle': 'Выберите файл для начала работы',
            'noHeatmap.title': 'Карта параметров недоступна',
            'noHeatmap.subtitle': 'Выполните автоподбор для отображения',

            // Drag & Drop Zone
            'dropZone.text': 'Отпустите файл здесь',
            'dropZone.sub': 'TXT, DAT, CSV, ASC',
            'dropZone.invalidType': 'Неверный тип файла. Поддерживаются: TXT, DAT, CSV, ASC',
            'dropZone.someSkipped': 'Некоторые файлы пропущены (неверный тип)',

            // Metrics
            'section.metrics': 'МЕТРИКИ КАЧЕСТВА',
            'metric.STDF': 'Гладкость',
            'metric.DF': 'Доля удалённых',
            'metric.ASNR': 'С/Ш (дБ)',
            'metric.RMSE': 'СКО',
            'metric.RSquared': 'Детерминация',
            'metric.Pearson': 'Корреляция',
            'tooltip.STDF': 'Показатель гладкости очищенного сигнала\n< 0.01 = отлично\n0.01-0.05 = хорошо\n> 0.05 = требует внимания',
            'tooltip.DF': 'Процент точек, заменённых алгоритмом\n< 5% = мало удалений\n5-20% = умеренно\n> 20% = много удалений',
            'tooltip.ASNR': 'Отношение сигнал/шум в децибелах\n> 30 дБ = отлично\n20-30 дБ = хорошо\n< 20 дБ = требуется улучшение',
            'tooltip.RMSE': 'Среднеквадратическая ошибка\n< 0.1 = очень точная очистка\n0.1-0.5 = хорошая точность\n> 0.5 = низкая точность',
            'tooltip.RSquared': 'Коэффициент детерминации (R²)\n> 0.9 = отличная аппроксимация\n0.7-0.9 = хорошая аппроксимация\n< 0.7 = слабая аппроксимация',
            'tooltip.Pearson': 'Коэффициент корреляции Пирсона\n> 0.9 = очень сильная связь\n0.7-0.9 = сильная связь\n< 0.7 = слабая связь',

            // File Info
            'section.fileInfo': 'ИНФОРМАЦИЯ О ФАЙЛЕ',
            'info.filename': 'Файл:',
            'info.size': 'Размер:',
            'info.points': 'Точек:',
            'info.series': 'Сериев:',
            'info.optWindow': 'Опт. окно:',
            'info.optThreshold': 'Опт. порог:',

            // Progress Bar
            'progress.label': 'ХОД ПРОЦЕССА',

            // Chart
            'chart.xAxis': 'Время / Индекс',
            'chart.yAxis': 'Значение сигнала',
            'chart.original': 'Исходные - Серия {n}',
            'chart.cleaned': 'Очищенные - Серия {n}',
            'chart.visibility': 'Видимость:',
            'chart.showOriginal': 'Исходные',
            'chart.showCleaned': 'Очищенные',
            'chart.showBoth': 'Оба',
            'chart.outliers': 'Выбросы',
            'heatmap.title': 'Карта качества параметров',

            // Messages
            'msg.noFiles': 'Файлы не выбраны.',
            'msg.fileHeader': 'Очищенные данные времени и сигналов',
            'msg.generated': 'Сгенерировано:',
            'msg.noData': 'Сначала загрузите данные',
            'msg.noCleaned': 'Нет очищенных данных для сохранения',
            'msg.optimizationEnabled': 'Оптимизация через чанки: включена',
            'msg.optimizationDisabled': 'Оптимизация через чанки: выключена',
            'msg.settingsShown': 'Расширенные настройки отображены',
            'msg.settingsHidden': 'Расширенные настройки скрыты',
            'msg.filesSelected': 'Выбрано файлов: {count}',
            'msg.loading': 'Загрузка файла: {name}',
            'msg.loaded': 'Файл загружен: {points} точек, {series} серий',
            'msg.readyTune': 'Готовы: 2. Навестись, 3. Очистить',
            'msg.readyClean': 'Готов: 3. Очистить',
            'msg.readySave': 'Готов: 4. Сохранить',
            'msg.tuning': 'Начало автоподбора параметров...',
            'msg.tuned': 'Параметры подобраны: окно={window}, порог={threshold}',
            'msg.cleaning': 'Начало очистки данных...',
            'msg.cleanedSeries': 'Очищена серия {n}/{total} ({percent}%)',
            'msg.cleaningSeries': 'Очистка серии {n} из {total}',
            'msg.cleanedAll': 'Очистка всех серий завершена.',
            'msg.saving': 'Подготовка сохранения...',
            'msg.saved': 'Файл сохранен: {name} ({rows} строк)',

            // Errors
            'error.workerInit': 'Worker не инициализирован',
            'error.loading': 'Ошибка загрузки файла: {message}',
            'error.saving': 'Ошибка сохранения: {message}',
            'error.noData': 'Файл не содержит данных',
            'error.tuneFailed': 'Ошибка автоподбора: параметры не найдены',
            'error.fileLoad': 'Ошибка загрузки файла: {message}',
            'error.workerLoad': 'Ошибка загрузки worker.js, использую встроенный worker...',
            'error.workerInitInternal': 'Ошибка инициализации встроенного Worker: {message}',
            'error.worker': 'Ошибка Worker: {message}',
            'error.execution': 'Ошибка выполнения: {message}',

            // Modal
            'modal.reset.title': 'Подтверждение сброса',
            'modal.reset.message': 'Вы уверены, что хотите сбросить текущую сессию?',
            'modal.reset.warning': '⚠ Все данные, результаты и параметры будут удалены!',
            'modal.close': '✕',
            'modal.confirm': 'Да, сбросить',
            'modal.cancel': 'Отмена',
            'msg.resetComplete': 'Сессия сброшена. Все данные очищены.',

            // Export Messages
            'msg.noCleanedForReport': 'Нет очищенных данных для экспорта',
            'msg.exportedJson': 'JSON отчет сохранен: {name}',
            'msg.exportedHtml': 'HTML отчет сохранен: {name}',

            // Zoom Controls
            'tooltip.zoomIn': 'Увеличить (прокрутка колеса)',
            'tooltip.zoomOut': 'Уменьшить (прокрутка колеса)',
            'tooltip.resetZoom': 'Сбросить масштаб',

            // Footer
            'footer.text': 'ОТК-001 /// СИСТЕМА ОЧИСТКИ ДАННЫХ ВРЕМЕННЫХ РЯДОВ',
            'footer.author': 'Разработчик: Фунтиков В.М.',
            'footer.version': 'Версия: 2.0 (Web)',

            // Language Switcher
            'lang.ru': 'RU',
            'lang.en': 'EN',
            'lang.switch': 'Language / Язык'
        },

        'en': {
            // Header
            'title.prefix': 'ODC-001',
            'title.main': 'DATA CLEANING SYSTEM',

            // Control Panel
            'panel.control': 'CONTROL PANEL',
            'panel.status.ready': 'READY',
            'panel.status.online': 'ONLINE',
            'panel.status.processing': 'PROCESSING...',

            // File Loading
            'section.load': '1. DATA LOADING',
            'label.file': 'Select data file:',
            'desc.file': 'ASCII format, columns: time, signals...',
            'button.open': 'OPEN FILE',
            'file.count': 'Files selected: {count}',

            // Advanced Settings
            'toggle.advanced': 'OPEN HOOD (advanced settings)',
            'desc.advanced': 'Show algorithm tuning parameters',
            'section.params': 'ALGORITHM PARAMETERS',

            // Sliders
            'label.window': 'Window Width',
            'desc.window': 'Sliding window size (1-100)',
            'unit.window': 'units',
            'tooltip.window': 'Window size for statistics calculation\nLarger window = smoother statistics\nSmaller window = more sensitive detection\nRecommended: 20-60',
            'label.threshold': 'Threshold Factor',
            'desc.threshold': 'Detection sensitivity (0.1-2.0)',
            'tooltip.threshold': 'Standard deviation multiplier\nLow value = more outliers detected\nHigh value = fewer outliers detected\nRecommended: 1.0-1.8',
            'label.matrix': 'Targeting Matrix Size',
            'desc.matrix': 'Parameter grid search size (10-50)',
            'unit.matrix': '×{value}',
            'tooltip.matrix': 'Parameter grid dimensionality\nLarger = precise search, slower\nSmaller = fast search, less precise\nRecommended: 10-25',
            'label.relative': 'Relative Matrix 2 Size',
            'desc.relative': 'Coarse search step (1-9)',
            'tooltip.relative': 'Step size for first optimization pass\n1 = precise but slow\n9 = fast but coarse\nRecommended: 2-5',

            // Optimization
            'label.chunks': 'Number of test chunks',
            'desc.chunks': 'Chunk=25 points (1-5)',
            'unit.chunks': 'pcs',
            'checkbox.chunks': 'Chunk optimization',
            'desc.optimization': 'Speeds up auto-tuning 5-10x',

            // Fill Method
            'label.fillMethod': 'Outlier Fill Method',
            'desc.fillMethod': 'Method to replace detected anomalies',
            'fillMethod.extreme': '↗∞ Extreme value (marker)',
            'fillMethod.center': 'Center value (median/mean)',
            'fillMethod.clip': 'Threshold clipping',
            'fillMethod.previous': 'Previous valid',
            'fillMethod.next': 'Next valid',
            'fillMethod.nearest': 'Nearest valid',
            'fillMethod.linear': 'Linear interpolation',
            'fillMethod.spline': 'Spline interpolation',
            'fillMethod.pchip': 'Spline² (PCHIP)',
            'fillMethod.makima': 'Modified Akima',

            // Operations
            'section.operations': '2. OPERATIONS',
            'button.load': 'LOAD',
            'desc.load': 'Read data file',
            'button.tune': 'AUTO-TUNE',
            'desc.tune': 'Auto-tune parameters',
            'button.clean': 'CLEAN',
            'desc.clean': 'Apply filtering',
            'button.save': 'SAVE',
            'desc.save': 'Export results',
            'button.reset': 'RESET SESSION',
            'desc.reset': 'Clear all data and start fresh',

            // Export Report
            'section.report': '4. EXPORT REPORT',
            'button.exportJson': 'JSON REPORT',
            'desc.exportJson': 'Export structured data format',
            'button.exportHtml': 'HTML REPORT',
            'desc.exportHtml': 'Export with charts and metrics',

            // Save Options
            'section.save': '3. SAVE PARAMETERS',
            'checkbox.saveRestored': 'Save restored data',
            'desc.saveRestored': 'Include restored values in results',
            'checkbox.validityFlag': 'Add validity flag',
            'desc.validityFlag': 'Add correctness flag column (0/1)',

            // Progress
            'section.progress': '4. PROGRESS',

            // Log
            'section.log': '5. OPERATION LOG',
            'log.init': 'System ready. Enjoy!',
            'log.systemInit': 'System initialized. Ready to work.',
            'log.workerInit': 'Built-in Web Worker initialized.',
            'log.heatmapDraw': 'Drawing heatmap: {rows}x{cols}, NTF[0][0] = {ntf}',
            'log.heatmapShown': 'Parameter map displayed',

            // Visualization Panel
            'panel.visualization': 'VISUALIZATION PANEL',

            // Tabs
            'tab.data': 'DATA',
            'tab.heatmap': 'PARAMETER MAP',

            // No Data Messages
            'noData.title': 'No data loaded',
            'noData.subtitle': 'Select a file to start',
            'noHeatmap.title': 'Parameter map unavailable',
            'noHeatmap.subtitle': 'Run auto-tune to display',

            // Drag & Drop Zone
            'dropZone.text': 'Drop file here',
            'dropZone.sub': 'TXT, DAT, CSV, ASC',
            'dropZone.invalidType': 'Invalid file type. Supported: TXT, DAT, CSV, ASC',
            'dropZone.someSkipped': 'Some files were skipped (invalid type)',

            // Metrics
            'section.metrics': 'QUALITY METRICS',
            'metric.STDF': 'Smoothness',
            'metric.DF': 'Deleted Fraction',
            'metric.ASNR': 'SNR (dB)',
            'metric.RMSE': 'RMSE',
            'metric.RSquared': 'Determination',
            'metric.Pearson': 'Correlation',
            'tooltip.STDF': 'Smoothness indicator of cleaned signal\n< 0.01 = excellent\n0.01-0.05 = good\n> 0.05 = needs attention',
            'tooltip.DF': 'Percentage of points replaced by algorithm\n< 5% = few deletions\n5-20% = moderate\n> 20% = many deletions',
            'tooltip.ASNR': 'Signal-to-noise ratio in decibels\n> 30 dB = excellent\n20-30 dB = good\n< 20 dB = needs improvement',
            'tooltip.RMSE': 'Root mean square error\n< 0.1 = very accurate\n0.1-0.5 = good accuracy\n> 0.5 = low accuracy',
            'tooltip.RSquared': 'Coefficient of determination (R²)\n> 0.9 = excellent fit\n0.7-0.9 = good fit\n< 0.7 = weak fit',
            'tooltip.Pearson': 'Pearson correlation coefficient\n> 0.9 = very strong correlation\n0.7-0.9 = strong correlation\n< 0.7 = weak correlation',

            // Zoom Controls
            'tooltip.zoomIn': 'Zoom in (scroll wheel)',
            'tooltip.zoomOut': 'Zoom out (scroll wheel)',
            'tooltip.resetZoom': 'Reset zoom',

            // File Info
            'section.fileInfo': 'FILE INFORMATION',
            'info.filename': 'File:',
            'info.size': 'Size:',
            'info.points': 'Points:',
            'info.series': 'Series:',
            'info.optWindow': 'Opt. window:',
            'info.optThreshold': 'Opt. threshold:',

            // Progress Bar
            'progress.label': 'PROGRESS',

            // Chart
            'chart.xAxis': 'Time / Index',
            'chart.yAxis': 'Signal Value',
            'chart.original': 'Original - Series {n}',
            'chart.cleaned': 'Cleaned - Series {n}',
            'chart.visibility': 'Visibility:',
            'chart.showOriginal': 'Original',
            'chart.showCleaned': 'Cleaned',
            'chart.showBoth': 'Both',
            'chart.outliers': 'Outliers',
            'heatmap.title': 'Parameter Quality Map',

            // Messages
            'msg.noFiles': 'No files selected.',
            'msg.fileHeader': 'Cleaned time and signal data',
            'msg.generated': 'Generated:',
            'msg.noData': 'Please load data first',
            'msg.noCleaned': 'No cleaned data to save',
            'msg.optimizationEnabled': 'Chunk optimization: enabled',
            'msg.optimizationDisabled': 'Chunk optimization: disabled',
            'msg.settingsShown': 'Advanced settings shown',
            'msg.settingsHidden': 'Advanced settings hidden',
            'msg.filesSelected': 'Files selected: {count}',
            'msg.loading': 'Loading file: {name}',
            'msg.loaded': 'File loaded: {points} points, {series} series',
            'msg.readyTune': 'Ready: 2. Auto-Tune, 3. Clean',
            'msg.readyClean': 'Ready: 3. Clean',
            'msg.readySave': 'Ready: 4. Save',
            'msg.tuning': 'Starting auto-tuning...',
            'msg.tuned': 'Parameters tuned: window={window}, threshold={threshold}',
            'msg.cleaning': 'Starting data cleaning...',
            'msg.cleanedSeries': 'Cleaned series {n}/{total} ({percent}%)',
            'msg.cleaningSeries': 'Cleaning series {n} of {total}',
            'msg.cleanedAll': 'All series cleaning completed.',
            'msg.saving': 'Preparing save...',
            'msg.saved': 'File saved: {name} ({rows} rows)',

            // Errors
            'error.workerInit': 'Worker not initialized',
            'error.loading': 'File loading error: {message}',
            'error.saving': 'Save error: {message}',
            'error.noData': 'File contains no data',
            'error.tuneFailed': 'Auto-tune failed: parameters not found',
            'error.fileLoad': 'File loading error: {message}',
            'error.workerLoad': 'Error loading worker.js, using built-in worker...',
            'error.workerInitInternal': 'Built-in Worker initialization error: {message}',
            'error.worker': 'Worker error: {message}',
            'error.execution': 'Execution error: {message}',

            // Modal
            'modal.reset.title': 'Confirm Reset',
            'modal.reset.message': 'Are you sure you want to reset the current session?',
            'modal.reset.warning': '⚠ All data, results, and parameters will be lost!',
            'modal.close': '✕',
            'modal.confirm': 'Yes, Reset',
            'modal.cancel': 'Cancel',
            'msg.resetComplete': 'Session reset. All data cleared.',

            // Export Messages
            'msg.noCleanedForReport': 'No cleaned data to export',
            'msg.exportedJson': 'JSON report saved: {name}',
            'msg.exportedHtml': 'HTML report saved: {name}',

            // Footer
            'footer.text': 'ODC-001 /// TIME SERIES DATA CLEANING SYSTEM',
            'footer.author': 'Developer: Vladimir M. Funtikov',
            'footer.version': 'Version: 2.0 (Web)',

            // Language Switcher
            'lang.ru': 'RU',
            'lang.en': 'EN',
            'lang.switch': 'Language / Язык'
        }
    };

    // ============================================================================
    // I18N SYSTEM
    // ============================================================================

    let currentLanguage = 'ru';

    /**
     * Get translation for a key
     * @param {string} key - Translation key (e.g., 'title.main')
     * @param {Object} params - Parameters for string interpolation
     * @returns {string} Translated text
     */
    function t(key, params) {
        const lang = translations[currentLanguage];
        let text = key;

        // Get translation
        if (lang && lang[key]) {
            text = lang[key];
        }

        // Interpolate parameters
        if (params) {
            Object.keys(params).forEach(function(param) {
                text = text.replace('{' + param + '}', params[param]);
            });
        }

        return text;
    }

    /**
     * Set current language
     * @param {string} lang - Language code ('ru' or 'en')
     */
    function setLanguage(lang) {
        if (translations[lang]) {
            currentLanguage = lang;
            saveLanguagePreference(lang);
            updateAllText();
        }
    }

    /**
     * Get current language
     * @returns {string} Current language code
     */
    function getLanguage() {
        return currentLanguage;
    }

    /**
     * Save language preference to localStorage
     * @param {string} lang - Language code
     */
    function saveLanguagePreference(lang) {
        try {
            localStorage.setItem('outlierCleanerLanguage', lang);
        } catch (e) {
            console.warn('Failed to save language preference:', e);
        }
    }

    /**
     * Load language preference from localStorage
     * @returns {string|null} Saved language code or null
     */
    function loadLanguagePreference() {
        try {
            return localStorage.getItem('outlierCleanerLanguage');
        } catch (e) {
            console.warn('Failed to load language preference:', e);
            return null;
        }
    }

    /**
     * Initialize i18n system
     */
    function init() {
        // Load saved language or use browser preference
        const savedLang = loadLanguagePreference();
        if (savedLang && translations[savedLang]) {
            currentLanguage = savedLang;
        } else {
            // Try to detect browser language
            const browserLang = navigator.language || navigator.userLanguage;
            if (browserLang && browserLang.startsWith('en')) {
                currentLanguage = 'en';
            }
        }

        // Update HTML lang attribute
        document.documentElement.lang = currentLanguage;

        console.log('[i18n] Initialized with language:', currentLanguage);
    }

    /**
     * Update all translatable text elements in the DOM
     */
    function updateAllText() {
        // Update elements with data-i18n attribute
        const elements = document.querySelectorAll('[data-i18n]');

        elements.forEach(function(element) {
            const key = element.getAttribute('data-i18n');
            const text = t(key);
            element.textContent = text;
        });

        // Update elements with data-i18n-placeholder attribute
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');

        placeholderElements.forEach(function(element) {
            const key = element.getAttribute('data-i18n-placeholder');
            const text = t(key);
            element.placeholder = text;
        });

        // Update elements with data-i18n-title attribute
        const titleElements = document.querySelectorAll('[data-i18n-title]');

        titleElements.forEach(function(element) {
            const key = element.getAttribute('data-i18n-title');
            const text = t(key);
            element.title = text;
        });

        console.log('[i18n] Updated all text elements');
    }

    // ============================================================================
    // EXPORT
    // ============================================================================

    // Initialize on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export to global scope
    global.I18n = {
        t: t,
        setLanguage: setLanguage,
        getLanguage: getLanguage,
        init: init,
        updateAllText: updateAllText
    };

})(typeof window !== 'undefined' ? window : this);
