/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Library,
  RULES,
  DAY,
  inr,
  iso,
  fmt,
  Book,
  Loan,
} from './types/library.ts';
import { ScanModal } from './components/ScanModal.tsx';
import { EditBookModal } from './components/EditBookModal.tsx';
import { BulkImportModal } from './components/BulkImportModal.tsx';
import { LoginModal } from './components/LoginModal.tsx';
import { ReportsModal } from './components/ReportsModal.tsx';
import { BarcodesView } from './components/BarcodesView.tsx';
import { LoginPage } from './components/LoginPage.tsx';
import { StudentDataModal } from './components/StudentDataModal.tsx';
import { playScanBeep } from './components/ScanModal.tsx';
import { GoogleDriveView } from './components/GoogleDriveView.tsx';
import { CodeExportModal } from './components/CodeExportModal.tsx';
import { RecentActivityPanel } from './components/RecentActivityPanel.tsx';
import {
  loadLibraryFromStorage,
  saveLibraryToStorage,
  saveActiveUser,
  loadActiveUser,
  saveActiveTab,
  loadActiveTab,
  syncWithServer,
  registerPersistenceGuards,
  loadTheme,
  saveTheme,
  AppTheme,
} from './utils/storage.ts';
import { ThemeToggle } from './components/ThemeToggle.tsx';

export default function App() {
  // Manual Theme override state ('light' | 'dark'), overriding system preference
  const [theme, setTheme] = useState<AppTheme>(() => loadTheme());

  // Robust initial state load from browser localStorage (with backup fallback)
  const initialStorageRef = useRef(loadLibraryFromStorage());
  const [lib, setLib] = useState<Library>(() => initialStorageRef.current.lib);
  const lastSavedAtRef = useRef<number>(initialStorageRef.current.savedAt);
  const libRef = useRef<Library>(lib);
  libRef.current = lib;

  const [user, setUser] = useState<string | null>(() => loadActiveUser());
  const [tab, setTab] = useState<string>(() => loadActiveTab('dash'));
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [tgt, setTgt] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [clockText, setClockText] = useState<string>('');

  // Modals state
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [isCodeExportOpen, setIsCodeExportOpen] = useState(false);
  const [viewingStudentId, setViewingStudentId] = useState<string | null>(null);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [showRemindersDropdown, setShowRemindersDropdown] = useState(false);

  // History tab search and filters
  const [histQ, setHistQ] = useState<string>('');
  const [histFilter, setHistFilter] = useState<'all' | 'ontime' | 'fine'>('all');
  const [histMemberFilter, setHistMemberFilter] = useState<string>('all');

  // Date inputs for borrowing / issuing
  const [dfrom, setDfrom] = useState<string>('');
  const [dto, setDto] = useState<string>('');

  // New book form state
  const [bookCode, setBookCode] = useState<string>('');
  const [bookTitle, setBookTitle] = useState<string>('');
  const [bookAuthor, setBookAuthor] = useState<string>('');
  const [bookCopies, setBookCopies] = useState<number>(1);
  const [bookPrice, setBookPrice] = useState<number>(450);

  // New student form state
  const [studentReg, setStudentReg] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [studentCourse, setStudentCourse] = useState<string>('');

  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Robust save handler: writes to primary & backup localStorage + pushes to backend
  const saveLibrary = useCallback((updated: Library) => {
    const res = saveLibraryToStorage(updated);
    if (res.success) {
      lastSavedAtRef.current = res.savedAt;
    }
  }, []);

  // Save active user and tab to localStorage whenever they change
  useEffect(() => {
    saveActiveUser(user);
  }, [user]);

  useEffect(() => {
    saveActiveTab(tab);
  }, [tab]);

  // Synchronize manual theme changes to HTML root element and localStorage
  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  const handleThemeChange = (newTheme: AppTheme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
    showToast(`Switched to ${newTheme === 'dark' ? 'Dark Mode 🌙' : 'Light Mode ☀️'}`);
  };

  // Guarantee cross-tab sync and beforeunload flush
  useEffect(() => {
    const unregister = registerPersistenceGuards(
      () => libRef.current,
      (synchronizedLib) => {
        setLib(synchronizedLib);
      }
    );
    return () => unregister();
  }, []);

  // Safe server synchronization without overwriting newer local changes
  useEffect(() => {
    const performSync = () => {
      syncWithServer(libRef.current, lastSavedAtRef.current, (remoteLib, remoteSavedAt) => {
        lastSavedAtRef.current = remoteSavedAt;
        setLib(remoteLib);
      });
    };

    // Initial check after short mount delay
    const initialSyncTimer = setTimeout(performSync, 600);
    // Background polling every 12 seconds
    const syncInterval = setInterval(performSync, 12000);

    return () => {
      clearTimeout(initialSyncTimer);
      clearInterval(syncInterval);
    };
  }, []);

  const showToast = (message: string) => {
    setToastMessage(message);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 3600);
  };

  const runAction = (fn: (currentLib: Library) => string | void) => {
    try {
      const result = fn(lib);
      if (typeof result === 'string' && result.trim()) {
        showToast(result);
      }
      saveLibrary(lib);
      setLib(new Library(lib.toJSON()));
    } catch (err: any) {
      showToast(err.message || 'An error occurred.');
    }
  };

  // Clock updating every 1000ms
  useEffect(() => {
    const updateClock = () => {
      const liveStr = new Date(lib.now).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      setClockText(`Live: ${liveStr}`);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [lib.now]);

  // Keep dates initialized based on current simulated time
  useEffect(() => {
    const t = lib.now;
    setDfrom(iso(t));
    setDto(iso(t + RULES.loanDays * DAY));
  }, [lib.offset]);

  // Initialize target student if empty
  useEffect(() => {
    if (!tgt) {
      const firstStudent = lib.members.find((m) => m.role === 'student');
      if (firstStudent) setTgt(firstStudent.id);
    }
  }, [lib.members, tgt]);

  // Global hardware barcode scanner auto-listener (works with USB guns & keyboard wedges)
  useEffect(() => {
    let buffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && target.getAttribute('type') !== 'hidden') {
        return;
      }

      const now = Date.now();
      if (now - lastKeyTime > 120) {
        buffer = '';
      }
      lastKeyTime = now;

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          const code = buffer.trim().toUpperCase();
          buffer = '';
          if (lib.member(code)) {
            // Student barcode scanned: Go directly to their data!
            playScanBeep();
            setViewingStudentId(code);
            showToast(`✓ Scanned ${lib.member(code)?.name}: Displaying student data.`);
          } else if (lib.book(code) || code.includes('-C')) {
            setIsScanOpen(true);
            showToast(`⚡ Barcode Scanner: Identified Book ${code}`);
          }
        }
        buffer = '';
      } else if (e.key.length === 1) {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lib]);

  const currentUserId = user || 'pooja';
  const me = user ? (lib.member(user) || lib.member('pooja') || lib.member('L1')) : null;
  const isLib = me?.role === 'librarian';

  // Feature 7: Reminders list for current user
  const reminders = me?.role === 'student' && user ? lib.checkReminders(user) : [];

  // Make sure active tab is valid for current role
  useEffect(() => {
    const validTabs = isLib
      ? ['dash', 'cat', 'circ', 'res', 'mem', 'fine', 'hist', 'barcodes', 'drive']
      : ['dash', 'cat', 'res', 'fine', 'hist', 'barcodes', 'drive'];
    if (!validTabs.includes(tab)) {
      setTab('dash');
    }
  }, [isLib, tab]);

  const handleLogin = (newUserId: string) => {
    setUser(newUserId);
    saveActiveUser(newUserId);
    setTab('dash');
    saveActiveTab('dash');
    setSel(new Set());
    setShowRemindersDropdown(false);
    showToast(`Signed in as ${lib.member(newUserId)?.name || newUserId}.`);
  };

  const handleLogout = () => {
    setUser(null);
    saveActiveUser(null);
    setTab('dash');
    saveActiveTab('dash');
    showToast('Signed out successfully.');
  };

  const handleToggleSelect = (bookId: string, checked: boolean) => {
    setSel((prev) => {
      const next = new Set(prev);
      if (checked) next.add(bookId);
      else next.delete(bookId);
      return next;
    });
  };

  const handleSkipDays = (days: number) => {
    lib.offset += days * DAY;
    const expiredMsgs = lib.checkReservationExpiries();
    saveLibrary(lib);
    setLib(new Library(lib.toJSON()));
    if (expiredMsgs.length > 0) {
      showToast(`+${days} days: ${expiredMsgs[0]}`);
    } else {
      showToast(`Calendar moved forward ${days} days.`);
    }
  };

  const handleResetDemo = () => {
    if (window.confirm('Reset all data to the demo set?')) {
      const fresh = Library.seed();
      setUser('L1');
      saveActiveUser('L1');
      setSel(new Set());
      setTab('dash');
      saveActiveTab('dash');
      saveLibrary(fresh);
      setLib(fresh);
      showToast('Library demo reset successfully.');
    }
  };

  const handleIssueSelected = () => {
    const memberId = isLib ? tgt : user;
    if (!memberId) {
      showToast('Select a student first.');
      return;
    }
    runAction((currentLib) => {
      const msg = currentLib.issueMany(memberId, Array.from(sel), dfrom, dto);
      setSel(new Set());
      return msg;
    });
    if (!isLib) {
      setTab('dash');
    }
  };

  const handleAddNewBook = () => {
    runAction((currentLib) => {
      if (!bookTitle.trim()) {
        throw new Error('Enter a book title.');
      }
      const code = bookCode.trim().toUpperCase();
      if (code && currentLib.book(code)) {
        throw new Error('This course code already exists.');
      }
      currentLib.addBook({
        id: code || undefined,
        title: bookTitle.trim(),
        author: bookAuthor.trim(),
        category: 'Course book',
        copies: Math.max(1, Number(bookCopies) || 1),
        price: Math.max(1, Number(bookPrice) || 450),
      });
      setBookCode('');
      setBookTitle('');
      setBookAuthor('');
      setBookCopies(1);
      setBookPrice(450);
      return 'Book added to the catalogue.';
    });
  };

  const handleAddNewStudent = () => {
    runAction((currentLib) => {
      if (!studentReg.trim() || !studentName.trim()) {
        throw new Error('Enter a register number and a name.');
      }
      const reg = studentReg.trim();
      if (currentLib.member(reg)) {
        throw new Error('This register number already exists.');
      }
      currentLib.addStudent({
        id: reg,
        name: studentName.trim().toUpperCase(),
        course: studentCourse.trim() || 'B.E. CSE',
      });
      setStudentReg('');
      setStudentName('');
      setStudentCourse('');
      return 'Student registered.';
    });
  };

  // Feature 3: Scan Issue & Scan Return handlers
  const handleScanIssue = (studentId: string, bookId: string, copyId?: string) => {
    runAction((currentLib) => {
      return currentLib.issue(bookId, studentId, currentLib.now, currentLib.now + RULES.loanDays * DAY, copyId);
    });
    setIsScanOpen(false);
  };

  const handleScanReturn = (copyOrLoanOrBookId: string) => {
    runAction((currentLib) => {
      // Find active loan matching copyId, loan id, or bookId
      const targetLoan = currentLib.loans.find(
        (l) => !l.returnedOn && (l.copyId === copyOrLoanOrBookId || l.id === copyOrLoanOrBookId || l.bookId === copyOrLoanOrBookId)
      );
      if (!targetLoan) {
        throw new Error(`No active loan found for scanned code “${copyOrLoanOrBookId}”.`);
      }
      return currentLib.returnBook(targetLoan.id);
    });
    setIsScanOpen(false);
  };

  // Feature 8: Renewal action
  const handleRenewLoan = (loanId: string) => {
    runAction((currentLib) => {
      return currentLib.renewLoan(loanId, currentUserId);
    });
  };

  // Nav tabs list
  const navTabs: [string, string][] = isLib
    ? [
        ['dash', 'Dashboard'],
        ['cat', 'Catalogue'],
        ['circ', 'Issue & return'],
        ['res', 'Reservations'],
        ['mem', 'Students'],
        ['fine', 'Fines'],
        ['hist', 'History'],
        ['barcodes', 'Barcodes'],
        ['drive', '📁 Google Drive'],
      ]
    : [
        ['dash', 'My library'],
        ['cat', 'Catalogue'],
        ['res', 'My reservations'],
        ['fine', 'My fines'],
        ['hist', 'History'],
        ['barcodes', 'Barcodes'],
        ['drive', '📁 Google Drive'],
      ];

  const renderDates = () => {
    const t = lib.now;
    return (
      <>
        <label>
          Borrow date (get)
          <input
            type="date"
            id="dfrom"
            value={dfrom}
            max={iso(t)}
            onChange={(e) => setDfrom(e.target.value)}
          />
        </label>
        <label>
          Return date (give)
          <input
            type="date"
            id="dto"
            value={dto}
            min={iso(t - 60 * DAY)}
            onChange={(e) => setDto(e.target.value)}
          />
        </label>
      </>
    );
  };

  const renderOverduePanel = () => {
    const overdueLoans = lib.loans.filter((l) => !l.returnedOn && l.dueOn < lib.now);
    const hasOverdue = overdueLoans.length > 0;

    return (
      <div className="panel" style={hasOverdue ? { borderColor: 'var(--bad)' } : undefined}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={hasOverdue ? { color: 'var(--bad)', margin: 0 } : { margin: 0 }}>
            Overdue students ({overdueLoans.length})
          </h3>
          <span style={{ fontSize: '12px', color: 'var(--mute)' }}>
            Fine cap: {inr(RULES.fineCap)} per book max
          </span>
        </div>
        {!hasOverdue ? (
          <p className="empty">
            No overdue books. A student who misses the return date appears here in red.
          </p>
        ) : (
          <div className="wrap">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Book & Copy</th>
                  <th>Was due</th>
                  <th>Late</th>
                  <th>Fine now</th>
                </tr>
              </thead>
              <tbody>
                {overdueLoans.map((l) => {
                  const m = lib.member(l.memberId);
                  const b = lib.book(l.bookId);
                  const lateDays = l.lateDays(lib.now);
                  const fine = lib.fineOf(l);
                  return (
                    <tr key={l.id} className="late">
                      <td>
                        <span className="nm">● {m?.name || l.memberId}</span>
                        <br />
                        <small style={{ color: 'var(--mute)' }}>{l.memberId}</small>
                      </td>
                      <td>
                        <b>{b?.title || l.bookId}</b>
                        <br />
                        <small style={{ color: 'var(--mute)' }}>Copy: {l.copyId}</small>
                      </td>
                      <td>{fmt(l.dueOn)}</td>
                      <td>
                        {lateDays} day{lateDays > 1 ? 's' : ''}
                      </td>
                      <td>
                        <b>{inr(fine)}</b>
                        {fine >= RULES.fineCap && (
                          <span className="tag bad" style={{ marginLeft: '4px', fontSize: '11px' }}>
                            Capped
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderLoanRows = (loans: Loan[], withAction: boolean) => {
    if (!loans.length) {
      return <p className="empty">No books on loan.</p>;
    }
    return (
      <div className="wrap">
        <table>
          <thead>
            <tr>
              <th>Book & Copy</th>
              <th>Student</th>
              <th>Issued</th>
              <th>Due</th>
              <th>Status</th>
              {withAction && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loans.map((l) => {
              const b = lib.book(l.bookId);
              const m = lib.member(l.memberId);
              const isOverdue = l.dueOn < lib.now;
              const f = lib.fineOf(l);
              const d = l.lateDays(lib.now);
              const canRenew = !l.renewed && !isOverdue && lib.reservations.every((r) => r.bookId !== l.bookId || r.status !== 'waiting');

              return (
                <tr key={l.id} className={isOverdue ? 'late' : ''}>
                  <td>
                    <b>{b?.title || l.bookId}</b>
                    <br />
                    <small style={{ color: 'var(--mute)' }}>
                      Code: {l.bookId} · <span className="tag alt" style={{ padding: '1px 6px', fontSize: '11px' }}>{l.copyId}</span>
                    </small>
                  </td>
                  <td>
                    <span className="nm">
                      {isOverdue ? '● ' : ''}
                      {m?.name || l.memberId}
                    </span>
                    <br />
                    <small style={{ color: 'var(--mute)' }}>{l.memberId}</small>
                  </td>
                  <td>{fmt(l.issuedOn)}</td>
                  <td>
                    {fmt(l.dueOn)}
                    {l.renewed && (
                      <span className="tag ok" style={{ marginLeft: '4px', fontSize: '11px' }}>
                        Renewed
                      </span>
                    )}
                  </td>
                  <td>
                    {isOverdue ? (
                      <span className="tag bad">
                        Overdue {d} day{d > 1 ? 's' : ''} · {inr(f)}
                      </span>
                    ) : (
                      <span className="tag ok">On time</span>
                    )}
                  </td>
                  {withAction && (
                    <td>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <button
                          className="btn"
                          onClick={() => runAction((currentLib) => currentLib.returnBook(l.id))}
                        >
                          Return
                        </button>
                        {canRenew && (
                          <button
                            className="btn alt"
                            title="Extend loan for another 14 days"
                            onClick={() => handleRenewLoan(l.id)}
                          >
                            Renew (+14d)
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  /* ----- Views ----- */

  const renderDashboardView = () => {
    const s = lib.stats();
    const activeLoans = lib.loans.filter((l) => !l.returnedOn);

    return (
      <div>
        <div className="grid">
          <div className="stat">
            <b>{s.titles}</b>
            <span>Titles</span>
          </div>
          <div className="stat">
            <b>{s.copies}</b>
            <span>Total copies</span>
          </div>
          <div className="stat">
            <b>{s.issued}</b>
            <span>Books issued</span>
          </div>
          <div className="stat">
            <b>{s.overdue}</b>
            <span>Overdue</span>
          </div>
          <div className="stat">
            <b>{s.reserved}</b>
            <span>Open reservations</span>
          </div>
          <div className="stat">
            <b>{inr(s.fines)}</b>
            <span>Fines due</span>
          </div>
        </div>

        {renderOverduePanel()}

        {/* Chronological Recent Activity: Last 10 library actions with categorization tags */}
        <RecentActivityPanel
          lib={lib}
          onViewStudent={(studentId) => setViewingStudentId(studentId)}
          maxItems={10}
        />

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0 }}>Books currently on loan</h3>
            <button className="btn alt" style={{ fontSize: '13px' }} onClick={() => setIsScanOpen(true)}>
              📷 Scan Return
            </button>
          </div>
          {renderLoanRows(activeLoans, true)}
        </div>

        <div className="panel">
          <h3>Library rules & Smart features</h3>
          <p style={{ margin: 0, color: 'var(--mute)' }}>
            Loan period {RULES.loanDays} days · Fine ₹100 on the first late day, doubling up to a maximum cap of {inr(RULES.fineCap)} · Up to {RULES.maxLoans} books per student · Loan renewals (+14 days) available once if unreserved · Ready reservations held for {RULES.reservationHoldDays} days before auto-releasing.
          </p>
        </div>
      </div>
    );
  };

  const renderMyLibraryView = () => {
    const myActiveLoans = lib.activeLoans(currentUserId);
    const hasOverdue = myActiveLoans.some((l) => l.dueOn < lib.now);
    const unpaidFinesAmount = lib.unpaidFines(currentUserId);
    const fineCapLimit = RULES.fineCap;
    const fineThreshold = fineCapLimit * 0.5; // 50% of the maximum fine cap = ₹500
    const isExceedingFineThreshold = unpaidFinesAmount > fineThreshold;

    return (
      <div>
        {/* Automated Urgent Warning Banner: When unpaid fines exceed 50% of the fine cap */}
        {isExceedingFineThreshold && (
          <div
            className="panel late"
            style={{
              background: 'color-mix(in srgb, var(--bad) 10%, var(--surface))',
              border: '2px solid var(--bad)',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: '0 4px 14px rgba(179, 52, 31, 0.16)',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <span style={{ fontSize: '24px', lineHeight: 1 }}>⚠️</span>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
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
                      Urgent Warning
                    </span>
                    <b style={{ color: 'var(--bad)', fontSize: '16px' }}>
                      Unpaid Fines Exceed 50% of Maximum Fine Cap
                    </b>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--mute)', marginTop: '4px' }}>
                    Current Fines: <b style={{ color: 'var(--bad)' }}>{inr(unpaidFinesAmount)}</b> · 50% Cap Threshold: {inr(fineThreshold)} · Maximum Limit: {inr(fineCapLimit)}
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn"
                style={{
                  background: 'var(--bad)',
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  padding: '7px 14px',
                }}
                onClick={() => setTab('fine')}
              >
                💳 Settle Fines Immediately ➔
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--ink)' }}>
              <b>Immediate payment required:</b> Your accumulated library penalty has reached{' '}
              <span style={{ color: 'var(--bad)', fontWeight: 700 }}>{inr(unpaidFinesAmount)}</span>, surpassing 50% of the institution's {inr(fineCapLimit)} maximum cap limit. Student accounts exceeding this threshold face restriction from issuing course books and suspension of library access. Please settle outstanding dues immediately online or at the circulation desk.
            </p>

            {/* Fine Cap Utilization Meter */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  fontWeight: 600,
                  marginBottom: '4px',
                }}
              >
                <span>Fine Cap Utilization</span>
                <span style={{ color: 'var(--bad)' }}>
                  {Math.min(100, Math.round((unpaidFinesAmount / fineCapLimit) * 100))}% of Maximum Cap
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'rgba(0,0,0,0.08)',
                  borderRadius: '999px',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                {/* 50% threshold indicator pin */}
                <div
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    background: 'var(--ink)',
                    opacity: 0.5,
                    zIndex: 2,
                  }}
                  title="50% Fine Cap Threshold"
                />
                <div
                  style={{
                    width: `${Math.min(100, (unpaidFinesAmount / fineCapLimit) * 100)}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #f59e0b 0%, var(--bad) 65%)',
                    borderRadius: '999px',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {hasOverdue && !isExceedingFineThreshold && (
          <div
            className="panel late"
            style={{ borderColor: 'var(--bad)', color: 'var(--bad)', marginBottom: '16px' }}
          >
            <b>You have overdue books.</b> Return them now: fines double daily up to {inr(RULES.fineCap)}.
          </div>
        )}

        <div className="grid">
          <div className="stat">
            <b>
              {myActiveLoans.length}/{RULES.maxLoans}
            </b>
            <span>Books borrowed</span>
          </div>
          <div
            className="stat"
            style={
              isExceedingFineThreshold
                ? {
                    borderColor: 'var(--bad)',
                    background: 'color-mix(in srgb, var(--bad) 6%, var(--surface))',
                  }
                : {}
            }
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <b style={{ color: isExceedingFineThreshold ? 'var(--bad)' : 'inherit' }}>
                {inr(unpaidFinesAmount)}
              </b>
              {isExceedingFineThreshold && (
                <span
                  style={{
                    background: 'var(--bad)',
                    color: '#ffffff',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  &gt;50% Cap
                </span>
              )}
            </div>
            <span>Fines due</span>
          </div>
        </div>

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <h3 style={{ margin: 0 }}>My borrowed books</h3>
            <span style={{ fontSize: '13px', color: 'var(--mute)' }}>
              Eligible books can be renewed once for +14 days.
            </span>
          </div>
          {renderLoanRows(myActiveLoans, true)}
        </div>

        {/* Recent Library Activity */}
        <RecentActivityPanel
          lib={lib}
          onViewStudent={(studentId) => setViewingStudentId(studentId)}
          maxItems={10}
        />
      </div>
    );
  };

  const renderCatalogueView = () => {
    const filterText = q.trim().toLowerCase();
    const rows = lib.books.filter((b) =>
      (b.id + b.title + b.author + b.category).toLowerCase().includes(filterText)
    );

    return (
      <div>
        {isLib && (
          <div className="panel" id="fb">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ margin: 0 }}>Add a book</h3>
              <button
                type="button"
                className="btn alt"
                style={{ fontSize: '13px' }}
                onClick={() => setIsBulkOpen(true)}
              >
                📥 Bulk CSV Import
              </button>
            </div>
            <div className="form">
              <label>
                Course code
                <input
                  name="code"
                  placeholder="e.g. CS25C12"
                  value={bookCode}
                  onChange={(e) => setBookCode(e.target.value)}
                />
              </label>
              <label>
                Title
                <input
                  name="title"
                  placeholder="Book title"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                />
              </label>
              <label>
                Author (optional)
                <input
                  name="author"
                  placeholder="Author name"
                  value={bookAuthor}
                  onChange={(e) => setBookAuthor(e.target.value)}
                />
              </label>
              <label>
                Copies
                <input
                  name="copies"
                  type="number"
                  min="1"
                  value={bookCopies}
                  onChange={(e) => setBookCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                />
              </label>
              <label>
                Price (₹)
                <input
                  name="price"
                  type="number"
                  min="1"
                  value={bookPrice}
                  onChange={(e) => setBookPrice(Math.max(1, parseInt(e.target.value, 10) || 450))}
                />
              </label>
              <button className="btn" onClick={handleAddNewBook}>
                Add book
              </button>
            </div>
          </div>
        )}

        <div className="bar">
          <h2>Catalogue</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {isLib && (
              <button
                type="button"
                className="btn alt"
                style={{ fontSize: '13px' }}
                onClick={() => setIsScanOpen(true)}
              >
                📷 Barcode Scan Issue
              </button>
            )}
            <input
              type="search"
              id="q"
              placeholder="Search title, author or category"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 'min(300px, 100%)' }}
            />
          </div>
        </div>

        {!isLib && (
          <div className="panel">
            <div className="form">
              {renderDates()}
              <button
                className="btn"
                id="selbtn"
                onClick={handleIssueSelected}
                disabled={sel.size === 0}
              >
                Borrow selected ({sel.size})
              </button>
            </div>
            <p className="empty" style={{ margin: '8px 0 0' }}>
              Pick the borrow date and the return date, tick one or more books below, then press Borrow
              selected. Limit {RULES.maxLoans} books. Late fine: {inr(RULES.baseFine)} on the first day,
              doubling every day up to {inr(RULES.fineCap)}.
            </p>
          </div>
        )}

        <div className="panel wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Book & Accession</th>
                <th>Code</th>
                <th>Availability</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="list">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <p className="empty">No books match your search.</p>
                  </td>
                </tr>
              ) : (
                rows.map((b: Book) => {
                  const availableCount = lib.available(b);
                  const isHeldForMe = lib.reservations.some(
                    (r) => r.bookId === b.id && r.memberId === user && r.status === 'ready'
                  );
                  const canSelect = !isLib && (availableCount > 0 || isHeldForMe);
                  const canReserve = !isLib && availableCount <= 0 && !isHeldForMe;

                  return (
                    <tr key={b.id}>
                      <td>
                        {canSelect ? (
                          <input
                            type="checkbox"
                            aria-label={`Select ${b.title}`}
                            checked={sel.has(b.id)}
                            onChange={(e) => handleToggleSelect(b.id, e.target.checked)}
                          />
                        ) : null}
                      </td>
                      <td>
                        <b>{b.title}</b>
                        {b.author && (
                          <>
                            <br />
                            <small style={{ color: 'var(--mute)' }}>{b.author}</small>
                          </>
                        )}
                        <br />
                        <small style={{ color: 'var(--mute)' }}>
                          Ref Price: {inr(b.price || 450)} · Next Free Copy: <code>{lib.getAvailableCopyId(b.id)}</code>
                        </small>
                      </td>
                      <td>{b.id}</td>
                      <td>
                        <span
                          className={`tag ${
                            availableCount > 0 ? 'ok' : isHeldForMe ? 'wait' : 'bad'
                          }`}
                        >
                          {availableCount > 0
                            ? `${availableCount} of ${b.copies} available`
                            : isHeldForMe
                            ? 'Held for you (ready)'
                            : 'All issued'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {canReserve && (
                            <button
                              className="btn alt"
                              onClick={() =>
                                runAction((currentLib) => currentLib.reserve(b.id, currentUserId))
                              }
                            >
                              Reserve
                            </button>
                          )}
                          {isLib && (
                            <button
                              className="btn alt"
                              style={{ fontSize: '13px', padding: '4px 8px' }}
                              onClick={() => setEditingBook(b)}
                            >
                              Edit / Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCirculationView = () => {
    const activeLoans = lib.loans.filter((l) => !l.returnedOn);

    return (
      <div>
        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0 }}>Issue books</h3>
            <button className="btn alt" onClick={() => setIsScanOpen(true)}>
              📷 Scan Barcode / QR to Issue
            </button>
          </div>
          <p className="empty" style={{ marginTop: 0 }}>
            Choose a student, tick one or more books, then press Issue (or use the Barcode Scan).
          </p>
          <div className="form">
            <label>
              Student
              <select id="tgt" value={tgt} onChange={(e) => setTgt(e.target.value)}>
                {lib.members
                  .filter((m) => m.role === 'student')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} – {m.name}
                    </option>
                  ))}
              </select>
            </label>
            {renderDates()}
            <button
              className="btn"
              id="selbtn"
              onClick={handleIssueSelected}
              disabled={sel.size === 0}
            >
              Issue selected ({sel.size})
            </button>
          </div>

          <div className="wrap" style={{ marginTop: '12px' }}>
            <table>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Book</th>
                  <th>Code</th>
                  <th>Copy Accession</th>
                  <th>Free copies</th>
                </tr>
              </thead>
              <tbody>
                {lib.books.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`Select ${b.title}`}
                        checked={sel.has(b.id)}
                        onChange={(e) => handleToggleSelect(b.id, e.target.checked)}
                      />
                    </td>
                    <td>{b.title}</td>
                    <td>{b.id}</td>
                    <td><code>{lib.getAvailableCopyId(b.id)}</code></td>
                    <td>
                      {lib.available(b)} of {b.copies}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0 }}>Return a book</h3>
            <button className="btn alt" onClick={() => setIsScanOpen(true)}>
              📷 Scan Barcode to Return
            </button>
          </div>
          {renderLoanRows(activeLoans, true)}
        </div>
      </div>
    );
  };

  const renderReservationsView = () => {
    const reservationsList = lib.reservations.filter(
      (r) => (r.status === 'waiting' || r.status === 'ready') && (isLib || r.memberId === user)
    );

    return (
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0 }}>{isLib ? 'Reservation queue' : 'My reservations'}</h3>
          <span style={{ fontSize: '12px', color: 'var(--mute)' }}>
            Holds expire after {RULES.reservationHoldDays} days if uncollected.
          </span>
        </div>
        {reservationsList.length === 0 ? (
          <p className="empty">
            No active reservations. Reserve a book from the catalogue when all copies are issued.
          </p>
        ) : (
          <div className="wrap">
            <table>
              <thead>
                <tr>
                  <th>Book</th>
                  <th>Student</th>
                  <th>Reserved on</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {reservationsList.map((r) => {
                  const b = lib.book(r.bookId);
                  const m = lib.member(r.memberId);
                  const remainingDays = r.readyOn
                    ? Math.max(0, Math.ceil((r.readyOn + RULES.reservationHoldDays * DAY - lib.now) / DAY))
                    : RULES.reservationHoldDays;

                  return (
                    <tr key={r.id}>
                      <td>{b?.title || r.bookId}</td>
                      <td>{m?.name || r.memberId}</td>
                      <td>{fmt(r.on)}</td>
                      <td>
                        {r.status === 'ready' ? (
                          <span className="tag ok">
                            Ready to collect (expires in {remainingDays}d)
                          </span>
                        ) : (
                          <span className="tag wait">Waiting in queue</span>
                        )}
                      </td>
                      <td>
                        <button
                          className="btn warn"
                          onClick={() =>
                            runAction((currentLib) => currentLib.cancelReservation(r.id))
                          }
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderStudentsView = () => {
    const studentMembers = lib.members.filter((m) => m.role === 'student');

    return (
      <div>
        <div className="panel" id="fs">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h3 style={{ margin: 0 }}>Register a student</h3>
            <button className="btn alt" onClick={() => setIsBulkOpen(true)}>
              📥 Bulk CSV Student Import
            </button>
          </div>
          <div className="form">
            <label>
              Register no.
              <input
                name="reg"
                inputMode="numeric"
                placeholder="e.g. 311425148305"
                value={studentReg}
                onChange={(e) => setStudentReg(e.target.value)}
              />
            </label>
            <label>
              Name
              <input
                name="name"
                placeholder="Full student name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
              />
            </label>
            <label>
              Course
              <input
                name="course"
                placeholder="e.g. B.E. CSE"
                value={studentCourse}
                onChange={(e) => setStudentCourse(e.target.value)}
              />
            </label>
            <button className="btn" onClick={handleAddNewStudent}>
              Register
            </button>
          </div>
        </div>

        <div className="panel wrap">
          <h3>Students ({studentMembers.length})</h3>
          <table>
            <thead>
              <tr>
                <th>Register no.</th>
                <th>Name</th>
                <th>Books held</th>
                <th>Fines due</th>
                <th>ID Barcode</th>
              </tr>
            </thead>
            <tbody>
              {studentMembers.map((m) => {
                const late = lib.activeLoans(m.id).some((l) => l.dueOn < lib.now);
                const activeLoansCount = lib.activeLoans(m.id).length;
                const finesDue = lib.unpaidFines(m.id);

                return (
                  <tr key={m.id} className={late ? 'late' : ''}>
                    <td><code>{m.id}</code></td>
                    <td>
                      <span className="nm">{late ? '● ' : ''}{m.name}</span>
                      {late && <span className="tag bad" style={{ marginLeft: '6px' }}>Overdue</span>}
                    </td>
                    <td>{activeLoansCount}</td>
                    <td>{inr(finesDue)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn alt"
                        style={{ fontSize: '11px', padding: '3px 8px' }}
                        onClick={() => {
                          setTab('barcodes');
                        }}
                      >
                        🏷️ Barcode
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFinesView = () => {
    const loansWithFines = lib.loans.filter(
      (l) => lib.fineOf(l) > 0 && (isLib || l.memberId === currentUserId)
    );

    return (
      <div className="panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h3 style={{ margin: 0 }}>{isLib ? 'Fines & Penalties' : 'My fines'}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', color: 'var(--mute)' }}>
              Doubling formula capped at {inr(RULES.fineCap)} per book.
            </span>
            {loansWithFines.length > 0 && isLib && (
              <button
                type="button"
                className="btn alt"
                style={{ fontSize: '12px', padding: '3px 8px' }}
                onClick={() => {
                  if (window.confirm('Clear and waive all current fines?')) {
                    runAction((currentLib) => {
                      currentLib.loans.forEach((l) => {
                        l.fine = 0;
                        l.paid = true;
                      });
                      return 'All fines cleared and marked paid.';
                    });
                  }
                }}
              >
                Clear All Fines
              </button>
            )}
          </div>
        </div>
        {loansWithFines.length === 0 ? (
          <p className="empty">
            No fines. Fines appear when a book is kept past its due date.
          </p>
        ) : (
          <div className="wrap">
            <table>
              <thead>
                <tr>
                  <th>Book & Copy</th>
                  <th>Student</th>
                  <th>Due</th>
                  <th>Fine</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loansWithFines.map((l) => {
                  const b = lib.book(l.bookId);
                  const m = lib.member(l.memberId);
                  const fine = lib.fineOf(l);

                  return (
                    <tr key={l.id}>
                      <td>
                        <b>{b?.title || l.bookId}</b>
                        <br />
                        <small style={{ color: 'var(--mute)' }}>Copy: {l.copyId}</small>
                      </td>
                      <td>{m?.name || l.memberId}</td>
                      <td>{fmt(l.dueOn)}</td>
                      <td>
                        {inr(fine)}
                        {fine >= RULES.fineCap && (
                          <span className="tag bad" style={{ marginLeft: '4px', fontSize: '11px' }}>
                            Cap Reached
                          </span>
                        )}
                      </td>
                      <td>
                        {l.paid ? (
                          <span className="tag ok">Paid</span>
                        ) : l.returnedOn ? (
                          <span className="tag bad">Unpaid</span>
                        ) : (
                          <span className="tag wait">Still accruing</span>
                        )}
                      </td>
                      <td>
                        {!l.paid && l.returnedOn && isLib && (
                          <button
                            className="btn"
                            onClick={() =>
                              runAction((currentLib) => currentLib.payFine(l.id))
                            }
                          >
                            Collect payment
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderHistoryView = () => {
    // Completed loans have returnedOn set
    const allCompleted = lib.loans.filter(
      (l) => l.returnedOn != null && (isLib || l.memberId === user)
    );

    // Member filter for librarian
    const memberFiltered =
      isLib && histMemberFilter !== 'all'
        ? allCompleted.filter((l) => l.memberId === histMemberFilter)
        : allCompleted;

    // Filter by on-time / with fines
    const statusFiltered = memberFiltered.filter((l) => {
      if (histFilter === 'ontime') return (l.fine || 0) === 0;
      if (histFilter === 'fine') return (l.fine || 0) > 0;
      return true;
    });

    // Search query matching book title, code, author, student name, or register ID
    const query = histQ.trim().toLowerCase();
    const filteredHistory = statusFiltered.filter((l) => {
      const b = lib.book(l.bookId);
      const m = lib.member(l.memberId);
      const combined = `${b?.title || ''} ${b?.id || ''} ${b?.author || ''} ${m?.name || ''} ${l.memberId} ${l.copyId || ''}`.toLowerCase();
      return combined.includes(query);
    });

    // Sort by return date descending
    filteredHistory.sort((a, b) => (b.returnedOn || 0) - (a.returnedOn || 0));

    // Stats
    const totalCount = memberFiltered.length;
    const onTimeCount = memberFiltered.filter((l) => (l.fine || 0) === 0).length;
    const totalFinesPaid = memberFiltered.reduce(
      (sum, l) => sum + (l.paid ? l.fine || 0 : 0),
      0
    );
    const onTimeRate = totalCount > 0 ? Math.round((onTimeCount / totalCount) * 100) : 100;

    return (
      <div>
        <div className="grid">
          <div className="stat">
            <b>{totalCount}</b>
            <span>{isLib ? 'Completed loans' : 'My completed loans'}</span>
          </div>
          <div className="stat">
            <b>{onTimeRate}%</b>
            <span>On-time returns ({onTimeCount}/{totalCount})</span>
          </div>
          <div className="stat">
            <b>{inr(totalFinesPaid)}</b>
            <span>Fines collected & paid</span>
          </div>
        </div>

        <div className="bar">
          <h2>{isLib ? 'Completed Loans History' : 'My Loan History'}</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {isLib && allCompleted.length > 0 && (
              <button
                type="button"
                className="btn alt"
                style={{ fontSize: '13px', padding: '6px 10px' }}
                onClick={() => {
                  if (window.confirm('Delete all completed loan history records?')) {
                    runAction((currentLib) => {
                      currentLib.loans = currentLib.loans.filter((l) => !l.returnedOn);
                      return 'Completed loan history cleared.';
                    });
                  }
                }}
              >
                Clear History
              </button>
            )}
            {isLib && (
              <select
                value={histMemberFilter}
                onChange={(e) => setHistMemberFilter(e.target.value)}
                aria-label="Filter history by student"
              >
                <option value="all">All students</option>
                {lib.members
                  .filter((m) => m.role === 'student')
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.id} – {m.name}
                    </option>
                  ))}
              </select>
            )}
            <input
              type="search"
              placeholder="Search book, code, or student..."
              value={histQ}
              onChange={(e) => setHistQ(e.target.value)}
              style={{ minWidth: 'min(280px, 100%)' }}
            />
          </div>
        </div>

        <div
          className="panel"
          style={{
            padding: '10px 14px',
            marginBottom: '14px',
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--mute)', fontWeight: 500 }}>
            Filter:
          </span>
          <button
            type="button"
            className={`btn ${histFilter === 'all' ? '' : 'alt'}`}
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => setHistFilter('all')}
          >
            All ({memberFiltered.length})
          </button>
          <button
            type="button"
            className={`btn ${histFilter === 'ontime' ? '' : 'alt'}`}
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => setHistFilter('ontime')}
          >
            On time ({memberFiltered.filter((l) => (l.fine || 0) === 0).length})
          </button>
          <button
            type="button"
            className={`btn ${histFilter === 'fine' ? '' : 'alt'}`}
            style={{ padding: '4px 10px', fontSize: '12px' }}
            onClick={() => setHistFilter('fine')}
          >
            With fines ({memberFiltered.filter((l) => (l.fine || 0) > 0).length})
          </button>
        </div>

        <div className="panel wrap">
          {filteredHistory.length === 0 ? (
            <p className="empty">
              {query || histFilter !== 'all' || histMemberFilter !== 'all'
                ? 'No completed loans match your search filters.'
                : 'No completed book loans yet. When books are returned, their transaction history will appear here.'}
            </p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Book & Copy</th>
                  <th>Student</th>
                  <th>Original Issue Date</th>
                  <th>Due Date</th>
                  <th>Return Date</th>
                  <th>Fines Paid</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((l) => {
                  const b = lib.book(l.bookId);
                  const m = lib.member(l.memberId);
                  const hadFine = (l.fine || 0) > 0;
                  const lateDays =
                    l.dueOn && l.returnedOn
                      ? Math.max(0, Math.ceil((l.returnedOn - l.dueOn) / DAY))
                      : 0;

                  return (
                    <tr key={l.id}>
                      <td>
                        <b>{b?.title || l.bookId}</b>
                        <br />
                        <small style={{ color: 'var(--mute)' }}>
                          {l.bookId} · Copy: <code>{l.copyId}</code>
                          {b?.author ? ` · ${b.author}` : ''}
                        </small>
                      </td>
                      <td>
                        <span className="nm">{m?.name || l.memberId}</span>
                        <br />
                        <small style={{ color: 'var(--mute)' }}>{l.memberId}</small>
                      </td>
                      <td>{fmt(l.issuedOn)}</td>
                      <td>{fmt(l.dueOn)}</td>
                      <td>
                        <b>{l.returnedOn ? fmt(l.returnedOn) : '-'}</b>
                        {lateDays > 0 ? (
                          <>
                            <br />
                            <small style={{ color: 'var(--bad)' }}>
                              ({lateDays} day{lateDays > 1 ? 's' : ''} late)
                            </small>
                          </>
                        ) : (
                          <>
                            <br />
                            <small style={{ color: 'var(--ok)' }}>(on time)</small>
                          </>
                        )}
                      </td>
                      <td>
                        {!hadFine ? (
                          <span className="tag ok">₹0 (None)</span>
                        ) : l.paid ? (
                          <span className="tag ok">
                            {inr(l.fine)} Paid
                          </span>
                        ) : (
                          <span className="tag bad">
                            {inr(l.fine)} Unpaid
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    );
  };

  if (!user) {
    return (
      <>
        <div style={{ position: 'fixed', top: '16px', right: '16px', zIndex: 120 }}>
          <ThemeToggle theme={theme} onThemeChange={handleThemeChange} />
        </div>
        <LoginPage lib={lib} onLoginSuccess={handleLogin} />
        {toastMessage && (
          <div id="toast" role="status">
            {toastMessage}
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <header>
        <div>
          <h1>Smart Library</h1>
          <small>Management System · Central Campus Library</small>
        </div>
        <div className="hd">
          {/* Manual Theme Toggle: explicitly overrides system preference */}
          <ThemeToggle theme={theme} onThemeChange={handleThemeChange} />

          <span className="clock" id="clock">
            {clockText}
          </span>
          <button
            className="btn alt"
            onClick={() => handleSkipDays(7)}
            title="Move the library calendar forward to test due dates and fines"
          >
            +7 days
          </button>

          {/* Feature 7: Reminder Bell Icon with notification badge */}
          {reminders.length > 0 && (
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="btn alt"
                style={{ padding: '6px 10px', position: 'relative' }}
                onClick={() => setShowRemindersDropdown(!showRemindersDropdown)}
                title="Due date reminders & alerts"
              >
                🔔 <span className="tag bad" style={{ padding: '1px 5px', fontSize: '11px', marginLeft: '2px' }}>{reminders.length}</span>
              </button>

              {showRemindersDropdown && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: 'calc(100% + 6px)',
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '12px',
                    width: '300px',
                    zIndex: 110,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <b style={{ fontSize: '13px', color: 'var(--ink)' }}>Your Library Alerts</b>
                    <button
                      type="button"
                      className="btn alt"
                      style={{ padding: '1px 6px', fontSize: '11px' }}
                      onClick={() => setShowRemindersDropdown(false)}
                    >
                      ✕
                    </button>
                  </div>
                  <div style={{ display: 'grid', gap: '8px', maxHeight: '240px', overflowY: 'auto' }}>
                    {reminders.map((rem, i) => (
                      <div
                        key={i}
                        style={{
                          fontSize: '12px',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          background: rem.type === 'overdue' ? '#f8dcd6' : 'var(--brand2)',
                          color: rem.type === 'overdue' ? '#8a2412' : 'var(--brand)',
                        }}
                      >
                        {rem.text}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Barcode scanner quick launch */}
          <button
            type="button"
            className="btn alt"
            onClick={() => setIsScanOpen(true)}
            title="Scan student ID card or book barcode"
          >
            📷 Scan
          </button>

          {/* Quick Barcode ID Login / Gate Entry */}
          <button
            type="button"
            className="btn"
            style={{ background: '#0e7c53', color: '#ffffff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}
            onClick={() => setIsLoginOpen(true)}
            title="Scan student ID barcode to open account"
          >
            🏷️ Scan Barcode to Open
          </button>

          {/* Reports & Charts */}
          <button
            type="button"
            className="btn alt"
            onClick={() => setIsReportsOpen(true)}
            title="Charts, analytics, and CSV exports"
          >
            📊 Reports
          </button>

          {/* Google Drive Cloud Integration */}
          <button
            type="button"
            className={`btn ${tab === 'drive' ? '' : 'alt'}`}
            onClick={() => setTab('drive')}
            title="Google Drive cloud storage, backups, and course materials"
            style={{ fontSize: '13px' }}
          >
            📁 Google Drive
          </button>

          {/* Export Code to PDF / VS Code */}
          <button
            type="button"
            className="btn alt"
            onClick={() => setIsCodeExportOpen(true)}
            title="Save complete codebase as PDF or export for VS Code"
            style={{ fontSize: '13px' }}
          >
            📄 Code & PDF
          </button>

          {/* Feature 2: Real Login & Account Switcher + Sign Out */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              type="button"
              className="btn alt"
              onClick={() => setIsLoginOpen(true)}
              style={{ fontSize: '13px' }}
              title="Switch user account"
            >
              {isLib ? '👩‍💼 Head Librarian: Pooja' : `🎓 ${me?.name?.split(' ')[0] || user} (${me?.id})`}
            </button>
            <button
              type="button"
              className="btn alt"
              onClick={handleLogout}
              style={{ fontSize: '12px', padding: '5px 10px', color: '#c02626' }}
              title="Sign out and return to secure login gateway"
            >
              🚪 Sign Out
            </button>
          </div>

          <button className="btn alt" onClick={handleResetDemo}>
            Reset demo
          </button>
        </div>
      </header>

      <nav id="nav">
        {navTabs.map(([tabKey, label]) => (
          <button
            key={tabKey}
            className={tab === tabKey ? 'on' : ''}
            onClick={() => {
              setTab(tabKey);
              setSel(new Set());
            }}
          >
            {label}
          </button>
        ))}
      </nav>

      <main id="view">
        {tab === 'dash' && (isLib ? renderDashboardView() : renderMyLibraryView())}
        {tab === 'cat' && renderCatalogueView()}
        {tab === 'circ' && renderCirculationView()}
        {tab === 'res' && renderReservationsView()}
        {tab === 'mem' && renderStudentsView()}
        {tab === 'fine' && renderFinesView()}
        {tab === 'hist' && renderHistoryView()}
        {tab === 'barcodes' && (
          <BarcodesView
            lib={lib}
            onOpenStudent={(studentId) => {
              handleLogin(studentId);
              setTab('dash');
            }}
            onViewStudentData={(studentId) => {
              setViewingStudentId(studentId);
            }}
            onSelectCode={(code) => {
              if (lib.member(code)) {
                setViewingStudentId(code);
              } else {
                setIsScanOpen(true);
              }
            }}
          />
        )}
        {tab === 'drive' && (
          <GoogleDriveView
            lib={lib}
            onRestoreLibrary={(restored) => {
              const newLib = new Library(restored);
              setLib(newLib);
              saveLibrary(newLib);
            }}
            showToast={showToast}
          />
        )}
      </main>

      {/* Feature Modals */}
      <ScanModal
        lib={lib}
        isOpen={isScanOpen}
        onClose={() => setIsScanOpen(false)}
        onScanIssue={handleScanIssue}
        onScanReturn={handleScanReturn}
        onViewStudentData={(studentId) => {
          setViewingStudentId(studentId);
        }}
      />

      <StudentDataModal
        lib={lib}
        studentId={viewingStudentId}
        isOpen={viewingStudentId !== null}
        onClose={() => setViewingStudentId(null)}
        onReturnBook={handleScanReturn}
        onRenewBook={handleRenewLoan}
        onPayFine={(loanId) => {
          runAction((currentLib) => currentLib.payFine(loanId));
        }}
        onOpenAsUser={(studentId) => {
          handleLogin(studentId);
          setTab('dash');
        }}
      />

      <EditBookModal
        book={editingBook}
        isOpen={editingBook !== null}
        onClose={() => setEditingBook(null)}
        onSave={(bookId, updates) => {
          runAction((currentLib) => {
            currentLib.editBook(bookId, updates);
            return `Updated “${updates.title}”.`;
          });
        }}
        onDelete={(bookId) => {
          runAction((currentLib) => {
            currentLib.deleteBook(bookId);
            return `Book ${bookId} deleted from catalogue.`;
          });
        }}
      />

      <BulkImportModal
        isOpen={isBulkOpen}
        onClose={() => setIsBulkOpen(false)}
        onImportBooks={(books) => {
          runAction((currentLib) => {
            books.forEach((b) => currentLib.addBook(b));
            return `Imported ${books.length} books successfully.`;
          });
        }}
        onImportStudents={(students) => {
          runAction((currentLib) => {
            students.forEach((s) => currentLib.addStudent(s));
            return `Imported ${students.length} students successfully.`;
          });
        }}
      />

      <LoginModal
        lib={lib}
        currentUser={user}
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLogin}
      />

      <ReportsModal
        lib={lib}
        isOpen={isReportsOpen}
        onClose={() => setIsReportsOpen(false)}
      />

      <CodeExportModal
        isOpen={isCodeExportOpen}
        onClose={() => setIsCodeExportOpen(false)}
        showToast={showToast}
      />

      {toastMessage && (
        <div id="toast" role="status">
          {toastMessage}
        </div>
      )}
    </>
  );
}
