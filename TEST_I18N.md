# I18n Testing Checklist

## Language Switcher Testing

### Basic Functionality
- [ ] Language switcher buttons visible in header (RU / EN)
- [ ] Clicking RU button switches interface to Russian
- [ ] Clicking EN button switches interface to English
- [ ] Active language button highlighted with cyan glow
- [ ] Language preference saved to localStorage
- [ ] On page reload, previously selected language is restored

### UI Elements Translation
- [ ] All buttons translated correctly
- [ ] All labels translated correctly
- [ ] All section titles translated correctly
- [ ] All tooltips translated correctly (when implemented)
- [ ] All dropdown options translated correctly
- [ ] Status indicators translated correctly

### Chart Translation
- [ ] Chart X-axis title updates on language change
- [ ] Chart Y-axis title updates on language change
- [ ] Chart dataset labels update on language change
- [ ] Chart legend updates on language change
- [ ] No animation when updating chart labels

### Dynamic Messages Translation
- [ ] Log messages appear in selected language
- [ ] Error messages appear in selected language
- [ ] Warning messages appear in selected language
- [ ] Success messages appear in selected language
- [ ] Status updates appear in selected language

### Parameter Interpolation
- [ ] Messages with parameters display correctly:
  - File count: "Выбрано файлов: {count}" / "Files selected: {count}"
  - File load: "Файл загружен: {points} точек, {series} серий" / "File loaded: {points} points, {series} series"
  - Tune result: "окно={window}, порог={threshold}" / "window={window}, threshold={threshold}"
  - Cleaned series: "Серия {n}/{total}" / "Series {n}/{total}"

### File Export
- [ ] Exported file header in correct language:
  - RU: "# Очищенные данные времени и сигналов"
  - EN: "# Cleaned time and signal data"
  - Both: "# Сгенерировано:" / "# Generated:"

### Edge Cases
- [ ] Language switching while data loaded
- [ ] Language switching during processing
- [ ] Language switching with error state
- [ ] Multiple rapid language switches
- [ ] localStorage disabled (falls back to browser language)

### Browser Compatibility
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if available)

## Known Issues
None yet - testing in progress

## Test Data Files
Use: `data/TEST_data.txt` for comprehensive testing

## Manual Testing Steps
1. Open http://localhost:8000 in browser
2. Click language switcher buttons
3. Load a data file
4. Run auto-tune
5. Run clean operation
6. Save results
7. Verify all text in selected language
8. Reload page and verify language preference preserved
9. Switch language and repeat steps 3-7
