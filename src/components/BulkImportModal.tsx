import React, { useState } from 'react';
import { parseCSV, downloadSampleBooksCSV, downloadSampleStudentsCSV } from '../utils/exportUtils.ts';

interface BulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportBooks: (books: { id?: string; title: string; author?: string; category?: string; copies: number; price?: number }[]) => void;
  onImportStudents: (students: { id: string; name: string; course?: string }[]) => void;
}

export function BulkImportModal({ isOpen, onClose, onImportBooks, onImportStudents }: BulkImportModalProps) {
  const [importType, setImportType] = useState<'books' | 'students'>('books');
  const [csvText, setCsvText] = useState('');
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        setStatusMsg(`Loaded ${file.name} (${Math.round(file.size / 1024)} KB)`);
      }
    };
    reader.readAsText(file);
  };

  const handleProcessImport = () => {
    if (!csvText.trim()) {
      setStatusMsg('Please select a file or paste CSV content first.');
      return;
    }

    try {
      const rows = parseCSV(csvText);
      if (rows.length < 2) {
        setStatusMsg('CSV must contain a header row and at least one data row.');
        return;
      }

      // Check header row
      const dataRows = rows.slice(1);

      if (importType === 'books') {
        const books = dataRows
          .filter((r) => r.length >= 2 && r[1])
          .map((r) => ({
            id: r[0] ? r[0].toUpperCase() : undefined,
            title: r[1],
            author: r[2] || '',
            category: r[3] || 'Course book',
            copies: parseInt(r[4], 10) || 1,
            price: parseInt(r[5], 10) || 450,
          }));

        if (!books.length) throw new Error('No valid book rows found in CSV.');
        onImportBooks(books);
        setStatusMsg(`Successfully imported ${books.length} books!`);
      } else {
        const students = dataRows
          .filter((r) => r.length >= 2 && r[0] && r[1])
          .map((r) => ({
            id: r[0].trim(),
            name: r[1].trim().toUpperCase(),
            course: r[2] ? r[2].trim() : 'B.E. CSE',
          }));

        if (!students.length) throw new Error('No valid student rows found in CSV.');
        onImportStudents(students);
        setStatusMsg(`Successfully imported ${students.length} students!`);
      }

      setTimeout(() => {
        onClose();
        setCsvText('');
        setStatusMsg('');
      }, 1200);
    } catch (err: any) {
      setStatusMsg(`Import error: ${err.message}`);
    }
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
        zIndex: 100,
        padding: '16px',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '20px' }}>Bulk Import via CSV / Excel</h3>
          <button
            type="button"
            className="btn alt"
            style={{ padding: '4px 10px' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
          <button
            type="button"
            className={`btn ${importType === 'books' ? '' : 'alt'}`}
            style={{ flex: 1 }}
            onClick={() => {
              setImportType('books');
              setStatusMsg('');
            }}
          >
            Import Books Catalogue
          </button>
          <button
            type="button"
            className={`btn ${importType === 'students' ? '' : 'alt'}`}
            style={{ flex: 1 }}
            onClick={() => {
              setImportType('students');
              setStatusMsg('');
            }}
          >
            Import Students Roster
          </button>
        </div>

        <div
          style={{
            background: 'var(--brand2)',
            padding: '12px',
            borderRadius: '6px',
            marginBottom: '14px',
            fontSize: '13px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>
              Expected columns: <b>{importType === 'books' ? 'Code, Title, Author, Category, Copies, Price' : 'RegisterNo, Name, Course'}</b>
            </span>
            <button
              type="button"
              className="btn alt"
              style={{ fontSize: '12px', padding: '4px 8px' }}
              onClick={importType === 'books' ? downloadSampleBooksCSV : downloadSampleStudentsCSV}
            >
              📥 Download Sample CSV
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gap: '12px' }}>
          <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: 'var(--mute)' }}>
            Choose CSV File
            <input type="file" accept=".csv,text/csv" onChange={handleFileUpload} />
          </label>

          <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: 'var(--mute)' }}>
            Or Paste CSV Content
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={
                importType === 'books'
                  ? 'Code,Title,Author,Category,Copies,Price\nCS25C13,Cloud Computing,Tanenbaum,Course book,5,500'
                  : 'RegisterNo,Name,Course\n311425148501,ANAND S,B.E. CSE'
              }
              style={{
                width: '100%',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '8px',
                fontFamily: 'monospace',
                fontSize: '12px',
              }}
            />
          </label>

          {statusMsg && (
            <div
              style={{
                fontSize: '13px',
                padding: '8px 12px',
                borderRadius: '6px',
                background: statusMsg.includes('error') ? '#f8dcd6' : 'var(--brand2)',
                color: statusMsg.includes('error') ? '#8a2412' : 'var(--brand)',
              }}
            >
              {statusMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button type="button" className="btn alt" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="btn" onClick={handleProcessImport}>
              Process & Import Records
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
