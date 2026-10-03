import React from 'react';
import { Library, inr, fmt, RULES } from '../types/library.ts';
import { Barcode } from '../utils/barcode.tsx';

interface StudentDataModalProps {
  lib: Library;
  studentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onReturnBook: (copyOrLoanId: string) => void;
  onRenewBook: (loanId: string) => void;
  onPayFine: (loanId: string) => void;
  onOpenAsUser?: (studentId: string) => void;
}

export function StudentDataModal({
  lib,
  studentId,
  isOpen,
  onClose,
  onReturnBook,
  onRenewBook,
  onPayFine,
  onOpenAsUser,
}: StudentDataModalProps) {
  if (!isOpen || !studentId) return null;

  const student = lib.member(studentId);
  if (!student) return null;

  const activeLoans = lib.activeLoans(studentId);
  const pastLoans = lib.loans.filter((l) => l.memberId === studentId && l.returnedOn);
  const totalUnpaidFines = lib.unpaidFines(studentId);
  const reservations = lib.reservations.filter((r) => r.memberId === studentId);

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
        zIndex: 110,
        padding: '16px',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '92vh',
          overflowY: 'auto',
          margin: 0,
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            marginBottom: '16px',
            borderBottom: '1px solid var(--line)',
            paddingBottom: '12px',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="tag ok" style={{ fontSize: '11px' }}>
                Verified Student ID
              </span>
              <code style={{ fontSize: '14px', fontWeight: 700, color: 'var(--brand)' }}>
                {student.id}
              </code>
            </div>
            <h2 style={{ margin: '4px 0 2px', fontSize: '22px', fontFamily: 'Newsreader, serif' }}>
              {student.name}
            </h2>
            <div style={{ fontSize: '13px', color: 'var(--mute)' }}>
              Course: <b>{(student as any).course || 'B.E. CSE'}</b> · Central Campus Library Record
            </div>
          </div>
          <button
            type="button"
            className="btn alt"
            style={{ padding: '4px 10px' }}
            onClick={onClose}
          >
            ✕ Close
          </button>
        </div>

        {/* Quick Summary Stats */}
        <div className="grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
          <div className="stat" style={{ padding: '12px' }}>
            <b style={{ fontSize: '20px' }}>
              {activeLoans.length}/{RULES.maxLoans}
            </b>
            <span style={{ fontSize: '12px' }}>Active Books Held</span>
          </div>

          <div
            className="stat"
            style={{
              padding: '12px',
              border: totalUnpaidFines > RULES.fineCap * 0.5 ? '2px solid var(--bad)' : undefined,
              background:
                totalUnpaidFines > RULES.fineCap * 0.5
                  ? 'color-mix(in srgb, var(--bad) 8%, var(--surface))'
                  : undefined,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b
                style={{
                  fontSize: '20px',
                  color: totalUnpaidFines > 0 ? 'var(--bad)' : 'var(--ok)',
                }}
              >
                {inr(totalUnpaidFines)}
              </b>
              {totalUnpaidFines > RULES.fineCap * 0.5 && (
                <span
                  style={{
                    background: 'var(--bad)',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 5px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  &gt;50% Cap
                </span>
              )}
            </div>
            <span style={{ fontSize: '12px' }}>Outstanding Fines</span>
          </div>

          <div className="stat" style={{ padding: '12px' }}>
            <b style={{ fontSize: '20px' }}>{reservations.length}</b>
            <span style={{ fontSize: '12px' }}>Reservations Queue</span>
          </div>
        </div>

        {/* Automated Warning Label: Unpaid Fines Exceed 50% of Maximum Fine Cap */}
        {totalUnpaidFines > RULES.fineCap * 0.5 && (
          <div
            style={{
              background: 'color-mix(in srgb, var(--bad) 10%, var(--surface))',
              border: '2px solid var(--bad)',
              borderRadius: '8px',
              padding: '14px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              boxShadow: '0 3px 10px rgba(179, 52, 31, 0.14)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px' }}>⚠️</span>
                <span
                  style={{
                    background: 'var(--bad)',
                    color: '#ffffff',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase',
                  }}
                >
                  Fine Cap Warning
                </span>
                <b style={{ color: 'var(--bad)', fontSize: '14px' }}>
                  Immediate Settlement Required
                </b>
              </div>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--bad)' }}>
                {inr(totalUnpaidFines)} / {inr(RULES.fineCap)} Max
              </span>
            </div>

            <p style={{ margin: 0, fontSize: '12px', lineHeight: 1.45, color: 'var(--ink)' }}>
              <b>Notice:</b> Unpaid fines have exceeded 50% of the maximum allowable fine cap ({inr(RULES.fineCap * 0.5)} threshold exceeded). Immediate settlement is required. Issue of new course books and renewals are restricted until dues are settled.
            </p>
          </div>
        )}

        {/* Barcode representation */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ transform: 'scale(0.85)', transformOrigin: 'left center' }}>
            <Barcode value={student.id} name={student.name} height={40} barWidth={1.4} />
          </div>
          {onOpenAsUser && (
            <button
              type="button"
              className="btn"
              style={{ fontSize: '12px', padding: '6px 12px' }}
              onClick={() => {
                onOpenAsUser(student.id);
                onClose();
              }}
            >
              🔑 Open As Student Portal
            </button>
          )}
        </div>

        {/* Active Loans Section */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ margin: 0, fontSize: '15px' }}>
              📚 Currently Borrowed Books ({activeLoans.length})
            </h4>
            <span style={{ fontSize: '12px', color: 'var(--mute)' }}>
              Limit: {RULES.maxLoans} books
            </span>
          </div>

          {activeLoans.length === 0 ? (
            <div
              style={{
                background: 'var(--brand2)',
                padding: '16px',
                borderRadius: '6px',
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--mute)',
              }}
            >
              No books currently borrowed by this student.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Book Details</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Fine</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeLoans.map((loan) => {
                    const book = lib.book(loan.bookId);
                    const isLate = loan.dueOn < lib.now;
                    const fineAmt = lib.fineOf(loan);

                    return (
                      <tr key={loan.id} className={isLate ? 'late' : ''}>
                        <td>
                          <b>{book?.title || loan.bookId}</b>
                          <br />
                          <small style={{ color: 'var(--mute)' }}>
                            Copy ID: <code>{loan.copyId}</code>
                          </small>
                        </td>
                        <td>
                          {fmt(loan.dueOn)}
                          <br />
                          <small style={{ color: isLate ? 'var(--bad)' : 'var(--mute)' }}>
                            {isLate ? 'Overdue!' : `${Math.ceil((loan.dueOn - lib.now) / (1000 * 60 * 60 * 24))} days left`}
                          </small>
                        </td>
                        <td>
                          {isLate ? (
                            <span className="tag bad">Overdue</span>
                          ) : (
                            <span className="tag ok">Active</span>
                          )}
                        </td>
                        <td>{fineAmt > 0 ? inr(fineAmt) : '₹0'}</td>
                        <td>
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="btn alt"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              onClick={() => onReturnBook(loan.copyId)}
                            >
                              Return
                            </button>
                            <button
                              type="button"
                              className="btn alt"
                              style={{ fontSize: '11px', padding: '3px 8px' }}
                              disabled={loan.renewed}
                              onClick={() => onRenewBook(loan.id)}
                            >
                              {loan.renewed ? 'Renewed' : 'Renew'}
                            </button>
                            {fineAmt > 0 && (
                              <button
                                type="button"
                                className="btn"
                                style={{ fontSize: '11px', padding: '3px 8px' }}
                                onClick={() => onPayFine(loan.id)}
                              >
                                Pay
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Circulation History */}
        {pastLoans.length > 0 && (
          <div>
            <h4 style={{ margin: '0 0 8px', fontSize: '15px' }}>
              🕒 Previous Returns History ({pastLoans.length})
            </h4>
            <div style={{ maxHeight: '160px', overflowY: 'auto' }}>
              <table style={{ width: '100%', fontSize: '12px' }}>
                <thead>
                  <tr>
                    <th>Book</th>
                    <th>Borrowed</th>
                    <th>Returned</th>
                    <th>Fine</th>
                  </tr>
                </thead>
                <tbody>
                  {pastLoans.map((l) => {
                    const b = lib.book(l.bookId);
                    return (
                      <tr key={l.id}>
                        <td>{b?.title || l.bookId} (<code>{l.copyId}</code>)</td>
                        <td>{fmt(l.issuedOn)}</td>
                        <td>{fmt(l.returnedOn!)}</td>
                        <td>{l.fine > 0 ? inr(l.fine) : 'None'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
