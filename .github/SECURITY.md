# Security Policy

## Supported Versions

Currently, only the latest version of the Outlier Cleaner is supported with security updates.

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly.

### How to Report

**Do NOT create a public issue for security vulnerabilities.**

Instead, please send an email to: xxcoding@yahoo.com

Include the following information in your report:

- Description of the vulnerability
- Steps to reproduce the vulnerability
- Potential impact of the vulnerability
- Any suggested fixes or mitigations

### What to Expect

- We will acknowledge receipt of your report within 48 hours
- We will provide a detailed response within 7 days regarding the next steps
- If a vulnerability is confirmed, we will aim to release a fix within 14 days
- We will credit you for the discovery (unless you prefer to remain anonymous)

### Security Best Practices

Since this is a client-side web application that processes data locally:

1. **Data Privacy**: All data processing happens in your browser. No data is sent to any server.
2. **File Uploads**: Only upload data files from trusted sources
3. **Browser Security**: Keep your browser updated with the latest security patches
4. **Local Files**: Ensure your local files are properly secured on your system

## Current Security Considerations

- The application runs entirely client-side (in the browser)
- No server-side components
- No data transmission to external servers
- No user authentication required
- No database storage
- File processing is done using JavaScript Web Workers

## Dependency Security

This project has minimal external dependencies:
- No npm dependencies (pure vanilla JavaScript)
- No external libraries for core functionality
- Optional: Browser's native APIs for file handling

We regularly review for potential security issues in the codebase.
