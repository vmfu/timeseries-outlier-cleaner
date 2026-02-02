# Запуск приложения

## Вариант 1: Через локальный сервер (Рекомендуется)

### Для Windows с Python:
1. Откройте папку проекта в командной строке
2. Запустите файл `start_and_open.bat`
3. Браузер автоматически откроется на `http://localhost:8000`

### Для Linux/Mac с Python:
```bash
cd G:/JOB/Mathlab/Cleaner_Outlier_crush_2
python3 -m http.server 8000
```
Затем откройте `http://localhost:8000` в браузере

### Для Node.js:
```bash
cd G:/JOB/Mathlab/Cleaner_Outlier_crush_2
npx serve
```
Или `npx http-server`

## Вариант 2: Через VS Code Live Server
1. Установите расширение "Live Server"
2. Откройте `index.html` в VS Code
3. Нажмите "Go Live" в правом нижнем углу

## Почему нужен локальный сервер?
Браузеры блокируют Web Workers при открытии файлов напрямую (file:// protocol)
из соображений безопасности. Web Worker необходим для выполнения
тяжелых вычислений без зависания интерфейса.

## Список скриптов запуска
- `start_auto.bat` - Автоматически выбирает доступный сервер (Python/Node.js)
- `start_and_open.bat` - Запускает Python сервер и открывает браузер
- `start_server.bat` - Только запускает Python сервер
