# Contributing to Outlier Cleaner

Thank you for your interest in contributing to the Outlier Cleaner project!

## How to Contribute

### Reporting Bugs

Before creating bug reports, please check the existing issues as you might find that the problem has already been reported.

When creating a bug report, please include as many details as possible:

- **Description**: A clear and concise description of what the bug is
- **Reproduction**: Steps to reproduce the behavior
- **Expected behavior**: What you expected to happen
- **Screenshots**: If applicable, add screenshots to help explain your problem
- **Environment**: Browser name and version, OS
- **Data**: Sample data file (if possible and doesn't contain sensitive information)

### Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues. When creating an enhancement suggestion:

- **Use a clear and descriptive title**
- **Provide a detailed description of the suggested enhancement**
- **Explain why this enhancement would be useful**
- **List some examples of how this feature could be implemented**

### Pull Requests

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- **JavaScript**: Use ES6+ syntax, follow existing patterns in the codebase
- **HTML**: Use semantic HTML5 elements
- **CSS**: Follow the existing telemetry-inspired styling conventions
- **Comments**: Keep comments clear and concise

### Development Setup

1. Clone the repository
2. Open `index.html` in your browser to test
3. For serving the app, use:
   ```bash
   # Python 3
   python -m http.server 8000
   # Node.js
   npx serve
   ```

## Project Structure

```
.
├── index.html              # Main HTML structure
├── css/
│   └── telemetry.css       # Telemetry-inspired styling
├── js/
│   ├── main.js             # Main application logic
│   ├── filloutliers.js     # Outlier detection/fill functions
│   ├── metrics.js          # Quality metrics calculations
│   └── worker.js           # Web Worker for non-blocking operations
├── filloutliers.m          # MATLAB version for reference
├── Form_code.m.txt         # MATLAB App Designer code
├── README.md               # This file
└── ARCHITECTURE.md         # System architecture
```

## Areas for Contribution

- **New fill methods**: Add additional interpolation algorithms
- **New metrics**: Implement additional quality metrics
- **UI improvements**: Enhance the user interface
- **Performance**: Optimize algorithms for larger datasets
- **Documentation**: Improve documentation and examples
- **Testing**: Add test cases for edge cases
- **Browser compatibility**: Improve support for older browsers

## Getting Help

If you need help:

- Check the [documentation](README.md)
- Look at existing [issues](../../issues)
- Ask a question by creating a new issue with the "question" label

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
