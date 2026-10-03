import React, { useState } from 'react';
import { Library, inr, fmt } from '../types/library.ts';
import { exportOverdueListCSV, exportCatalogueCSV, exportFinesCollectedCSV } from '../utils/exportUtils.ts';
import { MonthlyFinesBarChart } from './MonthlyFinesBarChart.tsx';

interface ReportsModalProps {
  lib: Library;
  isOpen: boolean;
  onClose: () => void;
}

export function ReportsModal({ lib, isOpen, onClose }: ReportsModalProps) {
  const [activeTab, setActiveTab] = useState<'exports' | 'charts'>('charts');

  if (!isOpen) return null;

  // Compute subject / category counts
  const categoryCounts: Record<string, number> = {};
  lib.books.forEach((b) => {
    categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1;
  });

  // Most borrowed books (by total historical and active loans)
  const borrowCounts: Record<string, number> = {};
  lib.loans.forEach((l) => {
    borrowCounts[l.bookId] = (borrowCounts[l.bookId] || 0) + 1;
  });

  const topBorrowed = Object.entries(borrowCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([bookId, count]) => ({
      book: lib.book(bookId),
      count,
    }));

  const maxBorrow = Math.max(...Object.values(borrowCounts), 1);

  const handlePrint = () => {
    window.print();
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
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '20px' }}>Reports, Analytics & Exports</h3>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn alt"
              style={{ fontSize: '13px', padding: '4px 10px' }}
              onClick={handlePrint}
            >
              🖨️ Print / Save PDF
            </button>
            <button
              type="button"
              className="btn alt"
              style={{ padding: '4px 10px' }}
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            className={`btn ${activeTab === 'charts' ? '' : 'alt'}`}
            style={{ flex: 1 }}
            onClick={() => setActiveTab('charts')}
          >
            📊 Visual Charts & Analytics
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'exports' ? '' : 'alt'}`}
            style={{ flex: 1 }}
            onClick={() => setActiveTab('exports')}
          >
            📥 Excel / CSV Data Exports
          </button>
        </div>

        {activeTab === 'charts' ? (
          <div>
            {/* Bar Chart: Total Fines Collected per Month */}
            <MonthlyFinesBarChart lib={lib} />

            <div className="panel" style={{ background: 'var(--brand2)', marginBottom: '16px' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>Top 5 Most Borrowed Titles</h4>
              {topBorrowed.length === 0 ? (
                <p style={{ margin: 0, color: 'var(--mute)' }}>No circulation records yet.</p>
              ) : (
                <div style={{ display: 'grid', gap: '10px' }}>
                  {topBorrowed.map(({ book, count }) => {
                    const pct = Math.round((count / maxBorrow) * 100);
                    return (
                      <div key={book?.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '3px' }}>
                          <b>{book?.title || 'Unknown Title'} ({book?.id})</b>
                          <span>{count} times</span>
                        </div>
                        <div style={{ height: '10px', background: 'var(--line)', borderRadius: '99px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              background: 'var(--brand)',
                              borderRadius: '99px',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="panel" style={{ background: 'var(--brand2)' }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '15px' }}>Subject & Category Distribution</h4>
              <div style={{ display: 'grid', gap: '8px' }}>
                {Object.entries(categoryCounts).map(([cat, count]) => {
                  const pct = Math.round((count / lib.books.length) * 100);
                  return (
                    <div key={cat}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '3px' }}>
                        <span>{cat}</span>
                        <b>{count} titles ({pct}%)</b>
                      </div>
                      <div style={{ height: '8px', background: 'var(--line)', borderRadius: '99px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${pct}%`,
                            background: 'var(--accent)',
                            borderRadius: '99px',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--line)', borderRadius: '8px' }}>
              <div>
                <b>Overdue Students & Fine Accruals</b>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--mute)' }}>
                  Download CSV of all currently overdue students, days late, and fines due.
                </p>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => exportOverdueListCSV(lib)}
              >
                📥 Export Overdue
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--line)', borderRadius: '8px' }}>
              <div>
                <b>Catalogue Inventory</b>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--mute)' }}>
                  Export complete list of all titles, copies, barcodes, and current availability.
                </p>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => exportCatalogueCSV(lib)}
              >
                📥 Export Catalogue
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid var(--line)', borderRadius: '8px' }}>
              <div>
                <b>Fines Collected & Pending Ledger</b>
                <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--mute)' }}>
                  Audit log of all paid and unpaid fine transactions with student IDs.
                </p>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => exportFinesCollectedCSV(lib)}
              >
                📥 Export Fines
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
