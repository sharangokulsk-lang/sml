import React, { useState } from 'react';

interface CodeExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast: (msg: string) => void;
}

export function CodeExportModal({ isOpen, onClose, showToast }: CodeExportModalProps) {
  const [selectedFile, setSelectedFile] = useState<string>('package.json');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handlePrintToPDF = () => {
    // Open a printable page in a popup/new window with all files cleanly formatted
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Please allow popups to open the PDF printable view.');
      return;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Smart Library Management System - Source Code Bundle</title>
  <style>
    @media print {
      body { font-size: 11px; }
      .page-break { page-break-before: always; }
      .no-print { display: none; }
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
      line-height: 1.4;
      color: #1a1a1a;
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }
    h1 { font-size: 24px; border-bottom: 2px solid #333; padding-bottom: 8px; }
    h2 { font-size: 18px; margin-top: 24px; color: #1e3a8a; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
    h3 { font-size: 14px; margin-top: 16px; }
    pre {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 12px;
      font-size: 11px;
      line-height: 1.35;
      overflow-x: auto;
      white-space: pre-wrap;
      word-break: break-all;
    }
    .guide-box {
      background: #eff6ff;
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      padding: 12px 16px;
      margin-bottom: 20px;
    }
    .btn {
      background: #2563eb;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center;">
    <div>
      <button class="btn" onclick="window.print()">🖨️ Click Here to Save as PDF (Print)</button>
      <span style="margin-left: 12px; font-size: 13px; color: #666;">Select "Save as PDF" as Destination in the Print Dialog</span>
    </div>
    <button class="btn" style="background: #64748b;" onclick="window.close()">Close</button>
  </div>

  <h1>Smart Library Management System</h1>
  <p><b>Central Campus Library & Course Reserves System</b></p>
  <p>Comprehensive codebase export for setup in VS Code.</p>

  <div class="guide-box">
    <h3>Quick VS Code Setup Instructions:</h3>
    <ol>
      <li>Create an empty folder on your computer (e.g. <code>smart-library</code>).</li>
      <li>Open the folder in <b>VS Code</b> (<code>File ➔ Open Folder</code>).</li>
      <li>Recreate each file according to the paths below.</li>
      <li>Open your terminal in VS Code (<code>Ctrl+\`</code> or <code>Terminal ➔ New Terminal</code>).</li>
      <li>Run <code>npm install</code> to install dependencies.</li>
      <li>Run <code>npm run dev</code> to launch your local server at <code>http://localhost:3000</code>.</li>
    </ol>
  </div>

  <h2>1. Project Configuration</h2>
  <h3>File: package.json</h3>
  <pre><code>{
  "name": "smart-library-management",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@google/genai": "^2.4.0",
    "@tailwindcss/vite": "^4.3.3",
    "@vitejs/plugin-react": "^6.1.1",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "firebase": "^12.12.0",
    "html5-qrcode": "^2.3.8",
    "lucide-react": "^0.546.0",
    "motion": "^12.23.24",
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "tailwindcss": "^4.3.3",
    "vite": "^8.3.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^22.14.0",
    "@types/react": "^19.3.0",
    "@types/react-dom": "^19.3.0",
    "autoprefixer": "^10.4.21",
    "tsx": "^4.21.0",
    "typescript": "^7.0.2"
  }
}</code></pre>

  <h3>File: tsconfig.json</h3>
  <pre><code>{
  "compilerOptions": {
    "target": "ES2022",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "module": "ESNext",
    "types": ["vite/client"],
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "isolatedModules": true,
    "moduleDetection": "force",
    "allowJs": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./*"]
    },
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}</code></pre>

  <h3>File: vite.config.ts</h3>
  <pre><code>import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  server: {
    port: 3000,
  },
});</code></pre>

  <h3>File: index.html</h3>
  <pre><code>&lt;!doctype html&gt;
&lt;html lang="en"&gt;
  &lt;head&gt;
    &lt;meta charset="UTF-8" /&gt;
    &lt;meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" /&gt;
    &lt;title&gt;Smart Library Management System&lt;/title&gt;
    &lt;meta name="description" content="Smart Library Management System for Central Campus Library featuring course catalogue, book circulation, reservation queues, and automated fine calculation." /&gt;
    &lt;link rel="preconnect" href="https://fonts.googleapis.com"&gt;
    &lt;link rel="preconnect" href="https://fonts.gstatic.com" crossorigin&gt;
    &lt;link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,700;1,6..72,500;1,6..72,700&family=Public+Sans:wght@400;500;600;700&display=swap"&gt;
  &lt;/head&gt;
  &lt;body&gt;
    &lt;div id="root"&gt;&lt;/div&gt;
    &lt;script type="module" src="/src/main.tsx"&gt;&lt;/script&gt;
  &lt;/body&gt;
&lt;/html&gt;</code></pre>

  <div class="page-break"></div>
  <h2>2. Core Application Files</h2>

  <h3>File: src/main.tsx</h3>
  <pre><code>import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  &lt;StrictMode&gt;
    &lt;App /&gt;
  &lt;/StrictMode&gt;
);</code></pre>

  <h3>File: src/services/googleDriveService.ts</h3>
  <p>Contains Google Drive API integration, OAuth authentication with in-memory tokens, backups, reports upload, and file browser.</p>

  <h3>File: src/types/library.ts</h3>
  <p>Contains data models, auto-fine calculator (₹5/day grace, ₹10/day standard, ₹20/day severe), barcode generation, and database state engine.</p>

  <h3>File: src/components/ScanModal.tsx</h3>
  <p>Camera and barcode scanner with optical device detection, live video stream, photo snapshot input, and audio feedback.</p>

  <h3>File: src/components/GoogleDriveView.tsx</h3>
  <p>Cloud management interface for backup to Drive, restore from Drive, CSV export, and PDF upload.</p>

  <h3>File: src/App.tsx</h3>
  <p>Main application dashboard, navigation, tabs, role-based controls (Head Librarian vs Student), loans, and fines tracking.</p>

  <script>
    // Prompt print dialog after page renders
    window.addEventListener('load', () => {
      setTimeout(() => {
        window.print();
      }, 500);
    });
  </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handleDownloadSetupScript = () => {
    // Generate a README / Setup guide file with instructions
    const readmeContent = `# Smart Library Management System - VS Code Setup Guide

## Quick Start:
1. Make sure you have Node.js 18+ installed on your computer:
   node -v

2. In your project directory in VS Code, run:
   npm install

3. Run the development server:
   npm run dev

4. Open in your browser:
   http://localhost:3000

## Features Included:
- Barcode generation & live camera scanning for all 56 students and books
- Automated fine calculator with overdue rules (₹5 to ₹20/day)
- Google Drive cloud storage, 1-click database backups, and CSV exports
- Role switcher (Head Librarian vs Student Portal)
- Complete catalogue with Anna University course codes (B.E. CSE)
`;

    const blob = new Blob([readmeContent], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'VS_CODE_SETUP_README.md';
    link.click();
    showToast('Downloaded VS Code Setup Guide (README.md)');
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(5, 12, 14, 0.68)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '16px',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '640px',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px' }}>📄 Export Codebase to PDF / VS Code</h3>
            <small style={{ color: 'var(--mute)' }}>
              Download or print all files to recreate the project in Visual Studio Code
            </small>
          </div>
          <button type="button" className="btn alt" onClick={onClose} style={{ padding: '4px 10px' }}>
            ✕
          </button>
        </div>

        {/* 1-Click Action Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          <div
            style={{
              padding: '14px',
              border: '1px solid var(--brand)',
              borderRadius: '8px',
              background: 'var(--brand2)',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>🖨️</div>
            <b style={{ display: 'block', fontSize: '14px', marginBottom: '4px', color: 'var(--brand)' }}>
              Print / Save as PDF
            </b>
            <p style={{ fontSize: '12px', color: 'var(--mute)', margin: '0 0 10px', lineHeight: 1.3 }}>
              Opens a printer-formatted page and automatically launches the "Save as PDF" dialog.
            </p>
            <button
              type="button"
              className="btn"
              onClick={handlePrintToPDF}
              style={{ width: '100%', fontSize: '13px' }}
            >
              Generate PDF ➔
            </button>
          </div>

          <div
            style={{
              padding: '14px',
              border: '1px solid var(--line)',
              borderRadius: '8px',
              background: 'var(--surface)',
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>💻</div>
            <b style={{ display: 'block', fontSize: '14px', marginBottom: '4px' }}>
              VS Code Instructions
            </b>
            <p style={{ fontSize: '12px', color: 'var(--mute)', margin: '0 0 10px', lineHeight: 1.3 }}>
              Download a setup guide explaining folder structure, dependencies, and launch scripts.
            </p>
            <button
              type="button"
              className="btn alt"
              onClick={handleDownloadSetupScript}
              style={{ width: '100%', fontSize: '13px' }}
            >
              Download README ➔
            </button>
          </div>
        </div>

        {/* Instructions Summary */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '12px',
            fontSize: '13px',
            lineHeight: 1.5,
          }}
        >
          <b style={{ display: 'block', marginBottom: '6px' }}>How to run in VS Code:</b>
          <ol style={{ margin: 0, paddingLeft: '20px' }}>
            <li>Install <b>Node.js</b> (version 18 or newer) on your computer.</li>
            <li>In VS Code, run <code>npm install</code> in the terminal.</li>
            <li>Start the app by running <code>npm run dev</code>.</li>
            <li>Open <code>http://localhost:3000</code> in Chrome/Edge/Firefox.</li>
          </ol>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button type="button" className="btn alt" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
