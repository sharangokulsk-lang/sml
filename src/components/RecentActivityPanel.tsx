import React, { useState, useMemo } from 'react';
import { Library, fmt, inr, DAY } from '../types/library.ts';

export type ActivityType = 'issue' | 'return' | 'fine_paid' | 'renewal' | 'reservation';

export interface LibraryActivityItem {
  id: string;
  type: ActivityType;
  title: string;
  timestamp: number;
  memberId: string;
  memberName: string;
  bookId?: string;
  bookTitle?: string;
  copyId?: string;
  amount?: number;
}

interface RecentActivityPanelProps {
  lib: Library;
  onViewStudent?: (studentId: string) => void;
  onViewBook?: (bookId: string) => void;
  maxItems?: number;
}

export function RecentActivityPanel({
  lib,
  onViewStudent,
  maxItems = 10,
}: RecentActivityPanelProps) {
  const [filter, setFilter] = useState<'all' | ActivityType>('all');

  // Compute all chronological library actions from current loans, history, and reservations
  const allActivities = useMemo(() => {
    const list: LibraryActivityItem[] = [];

    // 1. Process all loans for issue, return, renewal, and fine payments
    lib.loans.forEach((l) => {
      const b = lib.book(l.bookId);
      const m = lib.member(l.memberId);
      const memberName = m?.name || l.memberId;
      const bookTitle = b?.title || l.bookId;

      // Issue event
      list.push({
        id: `issue-${l.id}`,
        type: 'issue',
        timestamp: l.issuedOn,
        title: `Book “${bookTitle}” issued to ${memberName}`,
        memberId: l.memberId,
        memberName,
        bookId: l.bookId,
        bookTitle,
        copyId: l.copyId,
      });

      // Return event
      if (l.returnedOn) {
        list.push({
          id: `return-${l.id}`,
          type: 'return',
          timestamp: l.returnedOn,
          title: `Book “${bookTitle}” returned by ${memberName}`,
          memberId: l.memberId,
          memberName,
          bookId: l.bookId,
          bookTitle,
          copyId: l.copyId,
        });
      }

      // Renewal event
      if (l.renewed) {
        // Renewal timestamp: 14 days before the updated due date
        const renewalTime = Math.max(l.issuedOn, l.dueOn - 14 * DAY);
        list.push({
          id: `renewal-${l.id}`,
          type: 'renewal',
          timestamp: renewalTime,
          title: `Loan for “${bookTitle}” renewed by ${memberName}`,
          memberId: l.memberId,
          memberName,
          bookId: l.bookId,
          bookTitle,
          copyId: l.copyId,
        });
      }

      // Fine payment event
      if (l.paid && (l.paidOn || (l.fine && l.fine > 0))) {
        list.push({
          id: `fine-${l.id}`,
          type: 'fine_paid',
          timestamp: l.paidOn || l.returnedOn || l.dueOn,
          title: `Fine of ${inr(l.fine || 0)} paid by ${memberName}`,
          memberId: l.memberId,
          memberName,
          bookId: l.bookId,
          bookTitle,
          amount: l.fine,
        });
      }
    });

    // 2. Process all reservations
    lib.reservations.forEach((r) => {
      const b = lib.book(r.bookId);
      const m = lib.member(r.memberId);
      const memberName = m?.name || r.memberId;
      const bookTitle = b?.title || r.bookId;

      list.push({
        id: `res-${r.id}`,
        type: 'reservation',
        timestamp: r.on,
        title: `Book “${bookTitle}” reserved by ${memberName}`,
        memberId: r.memberId,
        memberName,
        bookId: r.bookId,
        bookTitle,
      });
    });

    // 3. Sort chronologically: newest actions first
    list.sort((a, b) => b.timestamp - a.timestamp);

    return list;
  }, [lib.loans, lib.reservations, lib.books, lib.members]);

  // Filter activities and clamp to requested maximum items (last 10)
  const displayedActivities = useMemo(() => {
    let result = allActivities;
    if (filter !== 'all') {
      result = result.filter((item) => item.type === filter);
    }
    return result.slice(0, maxItems);
  }, [allActivities, filter, maxItems]);

  // Relative or formatted time helper based on library simulated clock
  const formatActivityTime = (ts: number): string => {
    const diff = lib.now - ts;
    if (diff < 0) return 'Just now';
    if (diff < 60 * 1000) return 'Just now';
    if (diff < 60 * 60 * 1000) {
      const mins = Math.floor(diff / (60 * 1000));
      return `${mins}m ago`;
    }
    if (diff < 24 * 60 * 60 * 1000) {
      const hours = Math.floor(diff / (60 * 60 * 1000));
      return `${hours}h ago`;
    }
    if (diff < 7 * DAY) {
      const days = Math.floor(diff / DAY);
      return `${days}d ago`;
    }
    return fmt(ts);
  };

  const renderTag = (type: ActivityType) => {
    switch (type) {
      case 'issue':
        return (
          <span
            className="tag"
            style={{
              background: 'rgba(92, 194, 192, 0.16)',
              color: 'var(--brand)',
              border: '1px solid rgba(92, 194, 192, 0.35)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '2px 7px',
            }}
          >
            ISSUED
          </span>
        );
      case 'return':
        return (
          <span
            className="tag ok"
            style={{
              background: 'rgba(28, 122, 75, 0.16)',
              color: 'var(--ok)',
              border: '1px solid rgba(28, 122, 75, 0.35)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '2px 7px',
            }}
          >
            RETURNED
          </span>
        );
      case 'fine_paid':
        return (
          <span
            className="tag wait"
            style={{
              background: 'rgba(199, 125, 10, 0.16)',
              color: 'var(--accent)',
              border: '1px solid rgba(199, 125, 10, 0.35)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '2px 7px',
            }}
          >
            FINE PAID
          </span>
        );
      case 'renewal':
        return (
          <span
            className="tag alt"
            style={{
              background: 'rgba(15, 76, 79, 0.12)',
              color: 'var(--brand)',
              border: '1px solid rgba(15, 76, 79, 0.28)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '2px 7px',
            }}
          >
            RENEWED
          </span>
        );
      case 'reservation':
        return (
          <span
            className="tag"
            style={{
              background: 'rgba(124, 58, 237, 0.14)',
              color: '#8b5cf6',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.04em',
              padding: '2px 7px',
            }}
          >
            RESERVED
          </span>
        );
    }
  };

  const getActionIcon = (type: ActivityType) => {
    switch (type) {
      case 'issue':
        return '📖';
      case 'return':
        return '📥';
      case 'fine_paid':
        return '💳';
      case 'renewal':
        return '🔄';
      case 'reservation':
        return '🔖';
    }
  };

  return (
    <div className="panel" style={{ position: 'relative' }}>
      {/* Panel Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '14px',
          borderBottom: '1px solid var(--line)',
          paddingBottom: '10px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ margin: 0, fontSize: '18px' }}>⚡ Recent Activity</h3>
            <span
              style={{
                fontSize: '11px',
                color: 'var(--mute)',
                background: 'var(--brand2)',
                padding: '2px 8px',
                borderRadius: '99px',
                fontWeight: 600,
                border: '1px solid var(--line)',
              }}
            >
              Last {displayedActivities.length} of {allActivities.length} actions
            </span>
          </div>
          <small style={{ color: 'var(--mute)', display: 'block', marginTop: '2px' }}>
            Chronological audit trail of book issues, returns, fine settlements, and reservations
          </small>
        </div>

        {/* Filter Tags */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'issue', label: 'Issues' },
              { key: 'return', label: 'Returns' },
              { key: 'fine_paid', label: 'Fines' },
              { key: 'reservation', label: 'Reservations' },
            ] as const
          ).map((btn) => (
            <button
              key={btn.key}
              type="button"
              onClick={() => setFilter(btn.key)}
              style={{
                background: filter === btn.key ? 'var(--brand)' : 'var(--surface-glass)',
                color: filter === btn.key ? '#fff' : 'var(--mute)',
                border: '1px solid var(--glass-border)',
                borderRadius: '99px',
                padding: '3px 10px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Activity List */}
      {displayedActivities.length === 0 ? (
        <p className="empty" style={{ textAlign: 'center', padding: '24px 0' }}>
          No activity records found matching this category.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {displayedActivities.map((act) => {
            return (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '10px',
                  padding: '9px 12px',
                  background: 'var(--surface-glass)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  borderRadius: '10px',
                  border: '1px solid var(--glass-border)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Left Side: Tag + Description */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1 1 280px' }}>
                  <span style={{ fontSize: '15px', lineHeight: 1 }} title={act.type}>
                    {getActionIcon(act.type)}
                  </span>

                  {renderTag(act.type)}

                  <div style={{ fontSize: '13px', lineHeight: 1.35 }}>
                    <span>{act.title}</span>
                    {act.memberId && onViewStudent && (
                      <button
                        type="button"
                        onClick={() => onViewStudent(act.memberId)}
                        title={`View student record for ${act.memberName}`}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '0 4px',
                          color: 'var(--brand)',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          fontSize: '11px',
                          fontWeight: 600,
                        }}
                      >
                        ({act.memberId})
                      </button>
                    )}
                  </div>
                </div>

                {/* Right Side: Copy/Amount Badge + Relative Time */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '12px',
                    color: 'var(--mute)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {act.copyId && (
                    <span
                      style={{
                        background: 'var(--brand2)',
                        border: '1px solid var(--line)',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        fontSize: '11px',
                        color: 'var(--brand)',
                        fontFamily: 'monospace',
                        fontWeight: 600,
                      }}
                    >
                      {act.copyId}
                    </span>
                  )}

                  {act.amount !== undefined && act.amount > 0 && (
                    <span
                      style={{
                        background: 'rgba(28, 122, 75, 0.12)',
                        border: '1px solid rgba(28, 122, 75, 0.25)',
                        borderRadius: '4px',
                        padding: '1px 6px',
                        fontSize: '11px',
                        color: 'var(--ok)',
                        fontWeight: 700,
                      }}
                    >
                      {inr(act.amount)}
                    </span>
                  )}

                  <span
                    title={new Date(act.timestamp).toLocaleString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    style={{
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 500,
                    }}
                  >
                    🕒 {formatActivityTime(act.timestamp)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
