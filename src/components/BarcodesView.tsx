import React, { useState } from 'react';
import { Library } from '../types/library.ts';
import { Barcode } from '../utils/barcode.tsx';
import { playScanBeep } from './ScanModal.tsx';

interface BarcodesViewProps {
  lib: Library;
  onSelectCode?: (code: string) => void;
  onOpenStudent?: (studentId: string) => void;
  onViewStudentData?: (studentId: string) => void;
}

export function BarcodesView({ lib, onSelectCode, onOpenStudent, onViewStudentData }: BarcodesViewProps) {
  const [subTab, setSubTab] = useState<'students' | 'books'>('students');
  const [search, setSearch] = useState('');

  const students = lib.members.filter((m) => m.role === 'student');
  const q = search.trim().toLowerCase();

  const filteredStudents = students.filter(
    (s) => s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
  );

  const filteredBooks = lib.books.filter(
    (b) => b.title.toLowerCase().includes(q) || b.id.toLowerCase().includes(q) || (b.author && b.author.toLowerCase().includes(q))
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <style>{`
        @media print {
          header, nav, .bar, .filter-bar, button, #toast, .hd {
            display: none !important;
          }
          body, main {
            background: #ffffff !important;
            color: #000000 !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .barcode-print-page {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
          }
          .barcode-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 28px 24px !important;
            page-break-inside: avoid !important;
          }
          .barcode-container {
            border: none !important;
            padding: 8px !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      <div className="bar">
        <div>
          <h2>Student & Book Barcodes (Code 128)</h2>
          <small style={{ color: 'var(--mute)' }}>
            High-density Code 128 barcodes matching campus student ID cards and book accession labels.
          </small>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className="btn"
            onClick={handlePrint}
          >
            🖨️ Print Barcode Sheet (PDF)
          </button>
        </div>
      </div>

      <div className="filter-bar panel" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
        <button
          type="button"
          className={`btn ${subTab === 'students' ? '' : 'alt'}`}
          onClick={() => setSubTab('students')}
        >
          🎓 Student ID Barcodes ({students.length})
        </button>
        <button
          type="button"
          className={`btn ${subTab === 'books' ? '' : 'alt'}`}
          onClick={() => setSubTab('books')}
        >
          📚 Book & Copy Barcodes ({lib.books.length} titles)
        </button>
        <div style={{ marginLeft: 'auto', minWidth: '240px' }}>
          <input
            type="search"
            placeholder={subTab === 'students' ? 'Search student name or register no.' : 'Search book title or course code'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {subTab === 'students' ? (
        <div className="panel barcode-print-page" style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '22px', margin: '0 0 4px', fontFamily: 'Newsreader, serif' }}>
              Student Barcodes — Code 128
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--mute)' }}>
              Central Campus Library · Batch of {students.length} Students · Click to view student data or open account
            </span>
          </div>

          <div
            className="barcode-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '20px',
              justifyItems: 'center',
            }}
          >
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                style={{ width: '100%', maxWidth: '320px', textAlign: 'center' }}
              >
                <Barcode
                  value={s.id}
                  name={s.name}
                  sublabel={s.id}
                  height={65}
                  barWidth={1.8}
                  onClick={() => {
                    playScanBeep();
                    if (onViewStudentData) onViewStudentData(s.id);
                  }}
                />
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    className="btn"
                    style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}
                    onClick={() => {
                      playScanBeep();
                      if (onViewStudentData) onViewStudentData(s.id);
                    }}
                    title="View this student's books, due dates, and fines"
                  >
                    📊 View Student Data
                  </button>
                  <button
                    type="button"
                    className="btn alt"
                    style={{ fontSize: '11px', padding: '4px 8px', flex: 1 }}
                    onClick={() => {
                      playScanBeep();
                      if (onOpenStudent) onOpenStudent(s.id);
                    }}
                    title="Sign in to this student's portal"
                  >
                    🔑 Open Portal
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredStudents.length === 0 && (
            <p className="empty" style={{ textAlign: 'center', padding: '24px 0' }}>
              No student barcodes match “{search}”.
            </p>
          )}
        </div>
      ) : (
        <div className="panel barcode-print-page" style={{ padding: '24px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '22px', margin: '0 0 4px', fontFamily: 'Newsreader, serif' }}>
              Book & Copy Accession Barcodes — Code 128
            </h3>
            <span style={{ fontSize: '13px', color: 'var(--mute)' }}>
              Printable stickers for book spine & inside cover labels
            </span>
          </div>

          <div style={{ display: 'grid', gap: '24px' }}>
            {filteredBooks.map((b) => (
              <div
                key={b.id}
                style={{
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '16px',
                  background: 'var(--surface)',
                }}
              >
                <div style={{ marginBottom: '12px' }}>
                  <b style={{ fontSize: '16px' }}>{b.title}</b>
                  <div style={{ fontSize: '13px', color: 'var(--mute)', marginTop: '2px' }}>
                    Code: <b>{b.id}</b> {b.author ? `· Author: ${b.author}` : ''} · Category: {b.category} · {b.copies} copies total
                  </div>
                </div>

                <div
                  className="barcode-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                    gap: '14px',
                  }}
                >
                  {/* Master book code */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: 'var(--mute)', marginBottom: '4px', fontWeight: 600 }}>
                      MASTER TITLE CODE
                    </div>
                    <Barcode
                      value={b.id}
                      name={b.title.length > 28 ? b.title.slice(0, 26) + '...' : b.title}
                      sublabel={b.id}
                      height={55}
                      barWidth={1.6}
                      onClick={() => onSelectCode && onSelectCode(b.id)}
                    />
                  </div>

                  {/* Individual copies accession barcodes */}
                  {Array.from({ length: b.copies }, (_, i) => {
                    const copyId = `${b.id}-c${i + 1}`;
                    return (
                      <div key={copyId} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '11px', color: 'var(--brand)', marginBottom: '4px', fontWeight: 600 }}>
                          COPY #{i + 1} ACCESSION
                        </div>
                        <Barcode
                          value={copyId}
                          name={b.title.length > 28 ? b.title.slice(0, 26) + '...' : b.title}
                          sublabel={copyId}
                          height={55}
                          barWidth={1.6}
                          onClick={() => onSelectCode && onSelectCode(copyId)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {filteredBooks.length === 0 && (
            <p className="empty" style={{ textAlign: 'center', padding: '24px 0' }}>
              No books match “{search}”.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
