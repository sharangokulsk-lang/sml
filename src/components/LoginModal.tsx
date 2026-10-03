import React, { useState } from 'react';
import { Library, Student } from '../types/library.ts';
import { Barcode } from '../utils/barcode.tsx';
import { playScanBeep } from './ScanModal.tsx';

interface LoginModalProps {
  lib: Library;
  currentUser: string;
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (userId: string) => void;
}

export function LoginModal({ lib, currentUser, isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [tab, setTab] = useState<'barcode' | 'password'>('barcode');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchStudent, setSearchStudent] = useState('');

  if (!isOpen) return null;

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const code = barcodeInput.trim().toUpperCase();
    if (!code) return;

    const student = lib.member(code) || lib.members.find((m) => m.id.toUpperCase() === code);
    if (student) {
      playScanBeep();
      onLoginSuccess(student.id);
      onClose();
      return;
    }

    if (code === 'L1' || code === 'LIBRARIAN') {
      playScanBeep();
      onLoginSuccess('L1');
      onClose();
      return;
    }

    setErrorMsg(`No student found for barcode "${code}". Check register number.`);
  };

  const handleStudentSelect = (studentId: string) => {
    playScanBeep();
    onLoginSuccess(studentId);
    onClose();
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    const id = identifier.trim().toUpperCase();

    // Check librarian
    if (id === 'POOJA' || id === 'LIBRARIAN' || id === 'L1') {
      const librarian = lib.member('pooja') || lib.member('L1');
      if (password === '123' || password === librarian?.password || password === 'admin') {
        onLoginSuccess('pooja');
        onClose();
        return;
      }
    }

    // Check student
    const student = lib.member(id) || lib.members.find((m) => m.id.toUpperCase() === id);
    if (student) {
      if (password === student.password || password === student.id || password === 'library123') {
        onLoginSuccess(student.id);
        onClose();
        return;
      }
    }

    setErrorMsg('Invalid credentials. Student password is your own Register Number. Head Librarian is pooja / 123.');
  };

  const students = lib.members.filter((m): m is Student => m.role === 'student');
  const q = searchStudent.trim().toLowerCase();
  const filteredStudents = students.filter(
    (s) => s.id.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
  );

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
          maxWidth: '540px',
          maxHeight: '92vh',
          overflowY: 'auto',
          margin: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px' }}>Library Entrance & Login</h3>
            <small style={{ color: 'var(--mute)' }}>Scan ID Barcode to open student portal</small>
          </div>
          <button
            type="button"
            className="btn alt"
            style={{ padding: '4px 10px' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <button
            type="button"
            className={`btn ${tab === 'barcode' ? '' : 'alt'}`}
            style={{ flex: 1 }}
            onClick={() => setTab('barcode')}
          >
            🏷️ Scan Barcode to Open
          </button>
          <button
            type="button"
            className={`btn ${tab === 'password' ? '' : 'alt'}`}
            style={{ flex: 1 }}
            onClick={() => setTab('password')}
          >
            🔐 Librarian / Password
          </button>
        </div>

        {tab === 'barcode' ? (
          <div>
            <form onSubmit={handleBarcodeSubmit} style={{ display: 'grid', gap: '10px', marginBottom: '16px' }}>
              <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: 'var(--mute)' }}>
                Scan or Enter Student Barcode (Register No.)
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 311425148001"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <button type="submit" className="btn">
                    Open Account ➔
                  </button>
                </div>
              </label>
            </form>

            <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <b style={{ fontSize: '13px' }}>1-Tap Any Student Barcode to Open:</b>
                <input
                  type="search"
                  placeholder="Filter student..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  style={{ fontSize: '12px', padding: '3px 8px', maxWidth: '160px' }}
                />
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '8px',
                  maxHeight: '260px',
                  overflowY: 'auto',
                  padding: '4px',
                }}
              >
                {filteredStudents.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handleStudentSelect(s.id)}
                    style={{
                      textAlign: 'left',
                      padding: '8px 10px',
                      background: 'var(--brand2)',
                      border: '1px solid var(--line)',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                    }}
                    title="Click to open this student's account immediately"
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <code style={{ fontWeight: 700, color: 'var(--brand)', fontSize: '12px' }}>{s.id}</code>
                      <span className="tag ok" style={{ fontSize: '10px', padding: '1px 5px' }}>Open</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink)' }}>
                      {s.name}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--mute)' }}>
                      {s.course}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handlePasswordSubmit} style={{ display: 'grid', gap: '12px' }}>
            <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: 'var(--mute)' }}>
              Register Number or Staff ID
              <input
                type="text"
                required
                placeholder="e.g. LIBRARIAN or 311425148001"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoFocus
              />
            </label>

            <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: 'var(--mute)' }}>
              Password
              <input
                type="password"
                required
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>

            <div style={{ fontSize: '12px', color: 'var(--mute)', background: 'var(--brand2)', padding: '8px 10px', borderRadius: '4px' }}>
              🔑 <b>Head Librarian:</b> <code>pooja</code> · Password: <code>123</code>
              <br />
              🎓 <b>Student:</b> Register No. (e.g. <code>311425148001</code>) · Password: Your Register No.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button type="button" className="btn alt" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn">
                Sign In
              </button>
            </div>
          </form>
        )}

        {errorMsg && (
          <div style={{ color: 'var(--bad)', fontSize: '12px', marginTop: '10px' }}>
            {errorMsg}
          </div>
        )}
      </div>
    </div>
  );
}
