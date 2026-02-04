# GitHub Pages Deployment

## Quick Start

This application can be deployed to GitHub Pages for free hosting.

### Option 1: Deploy from gh-pages branch

```bash
# Create orphan gh-pages branch
git checkout --orphan gh-pages
git reset --hard
git commit --allow-empty -m "Init gh-pages"
git push origin gh-pages

# Go back to master
git checkout master
```

Then enable GitHub Pages in repository settings:
- Settings → Pages
- Source: Deploy from a branch
- Branch: gh-pages
- Folder: / (root)
- Click Save

### Option 2: Deploy with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ master ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Pages
        uses: actions/configure-pages@v5
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: '.'
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

Then enable GitHub Actions and Pages in settings.

### Manual Deployment (Simplest)

1. Go to https://github.com/vmfu/timeseries-outlier-cleaner/settings/pages
2. Under "Build and deployment", select:
   - Source: Deploy from a branch
   - Branch: master
   - Folder: /(root)
3. Click Save

GitHub will automatically build and deploy the site in a few minutes.

The application will be available at:
https://vmfu.github.io/timeseries-outlier-cleaner/

### Следующие шаги (для пользователя):

1. Создать GitHub Release:
  • Перейти на: https://github.com/vmfu/timeseries-outlier-cleaner/releases/new
  • Выбрать тег:  v1.0.0
  • Название:  Version 1.0.0 - Initial Release
  • Описание: Скопировать из сообщения тега
  • Нажать "Publish release"
2. Включить GitHub Pages:
  • Settings → Pages
  • Source: Deploy from a branch
  • Branch: master
  • Folder: /(root)
  • Нажать Save
3. Мониторить после релиза:
  • Следить за Issues
  • Собирать feedback от пользователей
  • Планировать фичи для v2.0.0
