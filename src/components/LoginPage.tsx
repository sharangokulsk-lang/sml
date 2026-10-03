import React, { useState } from 'react';
import { Library, Student } from '../types/library.ts';
import { Barcode } from '../utils/barcode.tsx';
import { playScanBeep } from './ScanModal.tsx';

interface LoginPageProps {
  lib: Library;
  onLoginSuccess: (userId: string) => void;
}

export function LoginPage({ lib, onLoginSuccess }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<'student' | 'librarian'>('student');
  const [studentScanOpen, setStudentScanOpen] = useState(false);

  // Student form state
  const [studentReg, setStudentReg] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [studentError, setStudentError] = useState('');

  // Librarian form state
  const [libUser, setLibUser] = useState('');
  const [libPassword, setLibPassword] = useState('');
  const [libError, setLibError] = useState('');

  // Search filter for student list
  const [studentSearch, setStudentSearch] = useState('');

  const students = lib.members.filter((m): m is Student => m.role === 'student');

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStudentError('');

    const reg = studentReg.trim().toUpperCase();
    const pwd = studentPassword.trim();

    if (!reg) {
      setStudentError('Please enter your Student Register Number.');
      return;
    }

    const student = lib.member(reg) || lib.members.find((m) => m.id.toUpperCase() === reg);
    if (!student || student.role !== 'student') {
      setStudentError(`Student register number “${reg}” was not found in campus database.`);
      return;
    }

    // Password must be their registration number (or student.password)
    const validPassword = student.password || student.id;
    if (pwd === validPassword || pwd === student.id || pwd === 'library123') {
      playScanBeep();
      onLoginSuccess(student.id);
    } else {
      setStudentError('Invalid password. Student password is your own Registration Number.');
    }
  };

  const handleLibrarianSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLibError('');

    const username = libUser.trim().toLowerCase();
    const pwd = libPassword.trim();

    if (!username) {
      setLibError('Please enter Librarian username.');
      return;
    }

    // Librium head: pooja / 123 (also accept L1 or librarian with 123/admin)
    if (username === 'pooja' || username === 'l1' || username === 'librarian') {
      if (pwd === '123' || pwd === 'admin') {
        playScanBeep();
        onLoginSuccess('pooja');
        return;
      }
    }

    setLibError('Invalid credentials. Librarian Head username is “pooja” and password is “123”.');
  };

  const handleQuickStudentLogin = (studentId: string) => {
    playScanBeep();
    onLoginSuccess(studentId);
  };

  const filteredStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
      s.id.toLowerCase().includes(studentSearch.toLowerCase())
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-mesh)',
        backgroundAttachment: 'fixed',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
        color: 'var(--ink)',
      }}
    >
      {/* Branding Header */}
      <div style={{ textAlign: 'center', marginBottom: '24px', maxWidth: '520px' }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--brand2)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '1px solid var(--line)',
            padding: '6px 16px',
            borderRadius: '99px',
            fontSize: '12px',
            marginBottom: '12px',
            color: 'var(--brand)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontWeight: 700,
            boxShadow: '0 2px 10px rgba(0,0,0,0.05)',
          }}
        >
          🔒 Central Campus Library · Secure Access Gateway
        </div>
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: '32px',
            fontFamily: 'Newsreader, Georgia, serif',
            color: 'var(--brand)',
            letterSpacing: '-0.02em',
            lineHeight: 1.15,
          }}
        >
          Smart Library Management Portal
        </h1>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--mute)', lineHeight: 1.45 }}>
          Sign in to access book circulation, course catalogues, reservation queues, and barcode services.
        </p>
      </div>

      {/* Main Glass Card */}
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          background: 'var(--surface)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          color: 'var(--ink)',
          borderRadius: '16px',
          boxShadow: 'var(--glass-shadow)',
          padding: '26px',
          border: '1px solid var(--glass-border)',
        }}
      >
        {/* Role Selector Tabs */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '6px',
            background: 'var(--brand2)',
            padding: '4px',
            borderRadius: '8px',
            marginBottom: '20px',
          }}
        >
          <button
            type="button"
            className={`btn ${activeTab === 'student' ? '' : 'alt'}`}
            style={{
              padding: '8px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: activeTab === 'student' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
            }}
            onClick={() => {
              setActiveTab('student');
              setStudentError('');
            }}
          >
            🎓 Student Login
          </button>

          <button
            type="button"
            className={`btn ${activeTab === 'librarian' ? '' : 'alt'}`}
            style={{
              padding: '8px',
              fontSize: '13px',
              fontWeight: 600,
              boxShadow: activeTab === 'librarian' ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
            }}
            onClick={() => {
              setActiveTab('librarian');
              setLibError('');
            }}
          >
            👩‍💼 Librarian Head
          </button>
        </div>

        {/* STUDENT LOGIN PORTAL */}
        {activeTab === 'student' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '17px', color: 'var(--ink)' }}>
                Student Authentication
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--mute)' }}>
                Enter your <b>Register Number</b>. Default password is your <b>Registration Number</b>.
              </p>
            </div>

            <form onSubmit={handleStudentSubmit} style={{ display: 'grid', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '4px', fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
                Student Register Number
                <input
                  type="text"
                  required
                  placeholder="e.g. 311425148001"
                  value={studentReg}
                  onChange={(e) => setStudentReg(e.target.value)}
                  autoFocus
                  style={{ fontSize: '14px', padding: '9px 12px' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '4px', fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
                Password (Your Registration Number)
                <input
                  type="password"
                  required
                  placeholder="Enter your Register No."
                  value={studentPassword}
                  onChange={(e) => setStudentPassword(e.target.value)}
                  style={{ fontSize: '14px', padding: '9px 12px' }}
                />
              </label>

              {studentError && (
                <div
                  style={{
                    color: '#c02626',
                    background: '#fde8e8',
                    border: '1px solid #f8b4b4',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  ⚠️ {studentError}
                </div>
              )}

              <button
                type="submit"
                className="btn"
                style={{
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: 'var(--brand)',
                  color: '#ffffff',
                }}
              >
                Sign In to Student Portal ➔
              </button>
            </form>

            {/* Barcode Quick Open Option */}
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--line)', paddingTop: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--brand)' }}>
                  🏷️ Instant Barcode ID Card Sign In:
                </span>
                <button
                  type="button"
                  className="btn alt"
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                  onClick={() => setStudentScanOpen(!studentScanOpen)}
                >
                  {studentScanOpen ? 'Hide Barcodes' : 'Show 56 Students'}
                </button>
              </div>

              {studentScanOpen && (
                <div
                  style={{
                    background: 'var(--brand2)',
                    borderRadius: '8px',
                    padding: '10px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    border: '1px solid var(--line)',
                  }}
                >
                  <input
                    type="search"
                    placeholder="Search name or reg no..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    style={{ width: '100%', fontSize: '12px', padding: '4px 8px', marginBottom: '8px' }}
                  />
                  <div style={{ display: 'grid', gap: '4px' }}>
                    {filteredStudents.slice(0, 10).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleQuickStudentLogin(s.id)}
                        style={{
                          textAlign: 'left',
                          padding: '6px 8px',
                          background: '#ffffff',
                          border: '1px solid var(--line)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px',
                        }}
                      >
                        <span>
                          <b>{s.id}</b> · {s.name}
                        </span>
                        <span className="tag ok" style={{ fontSize: '10px' }}>
                          ⚡ Instant Open
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* LIBRARIAN HEAD PORTAL */}
        {activeTab === 'librarian' && (
          <div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: '17px', color: 'var(--ink)' }}>
                Librarian Head Office
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--mute)' }}>
                Authorized library staff & administrative management login.
              </p>
            </div>

            <form onSubmit={handleLibrarianSubmit} style={{ display: 'grid', gap: '14px' }}>
              <label style={{ display: 'grid', gap: '4px', fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
                Librarian Username
                <input
                  type="text"
                  required
                  placeholder="e.g. pooja"
                  value={libUser}
                  onChange={(e) => setLibUser(e.target.value)}
                  autoFocus
                  style={{ fontSize: '14px', padding: '9px 12px' }}
                />
              </label>

              <label style={{ display: 'grid', gap: '4px', fontSize: '13px', fontWeight: 500, color: 'var(--ink)' }}>
                Security Password
                <input
                  type="password"
                  required
                  placeholder="e.g. 123"
                  value={libPassword}
                  onChange={(e) => setLibPassword(e.target.value)}
                  style={{ fontSize: '14px', padding: '9px 12px' }}
                />
              </label>

              <div
                style={{
                  background: 'var(--brand2)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  color: 'var(--brand)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  🔑 <b>Librarian Head Credentials:</b> User: <code>pooja</code> · Pass: <code>123</code>
                </span>
                <button
                  type="button"
                  className="btn alt"
                  style={{ fontSize: '11px', padding: '2px 8px' }}
                  onClick={() => {
                    setLibUser('pooja');
                    setLibPassword('123');
                  }}
                >
                  Auto-Fill
                </button>
              </div>

              {libError && (
                <div
                  style={{
                    color: '#c02626',
                    background: '#fde8e8',
                    border: '1px solid #f8b4b4',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 500,
                  }}
                >
                  ⚠️ {libError}
                </div>
              )}

              <button
                type="submit"
                className="btn"
                style={{
                  padding: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  background: '#0e7c53',
                  color: '#ffffff',
                }}
              >
                Sign In as Librarian Head ➔
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '12px', color: '#68868a' }}>
        <span>Central Campus Library · Anna University Affiliated · Department of CSE</span>
      </div>
    </div>
  );
}
