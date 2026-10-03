import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  googleSignOut,
  initAuth,
  listDriveFiles,
  uploadFileToDrive,
  uploadBinaryFileToDrive,
  readDriveFileText,
  deleteDriveFile,
  DriveFileItem,
} from '../services/googleDriveService.ts';
import { Library, iso } from '../types/library.ts';
import { getStudentsCSV, getCatalogueCSV, getFinesCSV } from '../utils/exportUtils.ts';

interface GoogleDriveViewProps {
  lib: Library;
  onRestoreLibrary: (restoredData: any) => void;
  showToast: (msg: string) => void;
}

export function GoogleDriveView({ lib, onRestoreLibrary, showToast }: GoogleDriveViewProps) {
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<DriveFileItem | null>(null);
  const [restoreConfirmItem, setRestoreConfirmItem] = useState<DriveFileItem | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Initialize auth listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setGoogleUser(user);
        loadFiles('');
      },
      () => {
        setGoogleUser(null);
        setFiles([]);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (!res) return;
      if ('cancelled' in res) {
        showToast('Sign-in cancelled. Click "Sign in with Google" when you are ready.');
        return;
      }
      setGoogleUser(res.user);
      showToast(`✓ Connected to Google Drive as ${res.user.displayName || res.user.email}`);
      await loadFiles('');
    } catch (err: any) {
      showToast(`Google Sign In notice: ${err.message || err}`);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setGoogleUser(null);
      setFiles([]);
      showToast('Disconnected from Google Drive.');
    } catch (err: any) {
      showToast(`Failed to disconnect: ${err.message}`);
    }
  };

  const loadFiles = async (q = '') => {
    setIsLoadingFiles(true);
    try {
      const driveFiles = await listDriveFiles(q);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error('Error listing files:', err);
      if (googleUser) {
        showToast(`Could not load files: ${err.message}`);
      }
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleBackupToDrive = async () => {
    setIsBackingUp(true);
    setUploadMessage('Saving library state to Google Drive...');
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Smart_Library_Backup_${timestamp}.json`;
      const serialized = JSON.stringify(lib.toJSON(), null, 2);

      const created = await uploadFileToDrive(filename, serialized, 'application/json');
      showToast(`✓ Library backup saved to Google Drive: ${created.name}`);
      await loadFiles(searchQuery);
    } catch (err: any) {
      showToast(`Backup failed: ${err.message}`);
    } finally {
      setIsBackingUp(false);
      setUploadMessage(null);
    }
  };

  const handleExportReportToDrive = async (type: 'students' | 'books' | 'fines') => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().split('T')[0];
      let filename = '';
      let csvContent = '';

      if (type === 'students') {
        filename = `Library_Students_Circulation_${timestamp}.csv`;
        csvContent = getStudentsCSV(lib);
      } else if (type === 'books') {
        filename = `Library_Books_Catalogue_${timestamp}.csv`;
        csvContent = getCatalogueCSV(lib);
      } else {
        filename = `Library_Fines_Ledger_${timestamp}.csv`;
        csvContent = getFinesCSV(lib);
      }

      const created = await uploadFileToDrive(filename, csvContent, 'text/csv');
      showToast(`✓ Report saved to Google Drive: ${created.name}`);
      await loadFiles(searchQuery);
    } catch (err: any) {
      showToast(`Export failed: ${err.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadMessage(`Uploading ${file.name} to Google Drive...`);
    try {
      const created = await uploadBinaryFileToDrive(file);
      showToast(`✓ Uploaded to Google Drive: ${created.name}`);
      await loadFiles(searchQuery);
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`);
    } finally {
      setUploadMessage(null);
      e.target.value = '';
    }
  };

  const executeDeleteFile = async () => {
    if (!deleteConfirmItem) return;
    try {
      await deleteDriveFile(deleteConfirmItem.id);
      showToast(`Deleted ${deleteConfirmItem.name} from Google Drive.`);
      setFiles((prev) => prev.filter((f) => f.id !== deleteConfirmItem.id));
      setDeleteConfirmItem(null);
    } catch (err: any) {
      showToast(`Delete failed: ${err.message}`);
    }
  };

  const executeRestoreBackup = async () => {
    if (!restoreConfirmItem) return;
    try {
      setUploadMessage('Downloading backup from Google Drive...');
      const text = await readDriveFileText(restoreConfirmItem.id);
      const parsed = JSON.parse(text);
      if (!parsed.books || !parsed.members) {
        throw new Error('Selected file is not a valid library backup JSON.');
      }
      onRestoreLibrary(parsed);
      showToast(`✓ Library state successfully restored from Google Drive: ${restoreConfirmItem.name}`);
      setRestoreConfirmItem(null);
    } catch (err: any) {
      showToast(`Restore failed: ${err.message}`);
    } finally {
      setUploadMessage(null);
    }
  };

  const formatFileSize = (bytes?: string) => {
    if (!bytes) return '-';
    const b = parseInt(bytes, 10);
    if (isNaN(b)) return '-';
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{ display: 'grid', gap: '20px' }}>
      {/* Header bar */}
      <div className="bar">
        <div>
          <h2>Google Drive Cloud Storage</h2>
          <small style={{ color: 'var(--mute)' }}>
            Backup library database, export CSV circulation spreadsheets, and store course PDF materials.
          </small>
        </div>

        {googleUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
              {googleUser.photoURL && (
                <img
                  src={googleUser.photoURL}
                  alt={googleUser.displayName || 'Google user'}
                  style={{ width: '28px', height: '28px', borderRadius: '50%' }}
                />
              )}
              <span>
                <b>{googleUser.displayName || 'Google User'}</b> ({googleUser.email})
              </span>
            </div>
            <button
              type="button"
              className="btn alt"
              style={{ fontSize: '12px', padding: '4px 10px' }}
              onClick={handleSignOut}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Google Authentication Box (if not signed in) */}
      {!googleUser ? (
        <div
          className="panel"
          style={{
            textAlign: 'center',
            padding: '36px 20px',
            background: 'linear-gradient(180deg, var(--surface) 0%, var(--brand2) 100%)',
          }}
        >
          <div style={{ maxWidth: '480px', margin: '0 auto' }}>
            <div style={{ fontSize: '40px', marginBottom: '10px' }}>📁</div>
            <h3 style={{ margin: '0 0 8px', fontSize: '20px' }}>
              Connect Your Google Drive
            </h3>
            <p style={{ margin: '0 0 20px', fontSize: '14px', color: 'var(--mute)', lineHeight: 1.5 }}>
              Sign in with your Google account to enable automatic cloud backups, sync circulation reports
              directly into Google Drive, and upload course study materials for students.
            </p>

            {/* Official Google Sign-in Button */}
            <button
              type="button"
              onClick={handleSignIn}
              disabled={isSigningIn}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '12px',
                background: '#ffffff',
                color: '#3c4043',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSigningIn ? 'wait' : 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                transition: 'background-color .2s, box-shadow .2s',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 48 48">
                <path
                  fill="#EA4335"
                  d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                  fill="#4285F4"
                  d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                  fill="#FBBC05"
                  d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                  fill="#34A853"
                  d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
                <path fill="none" d="M0 0h48v48H0z" />
              </svg>
              <span>{isSigningIn ? 'Connecting to Google...' : 'Sign in with Google'}</span>
            </button>

            {/* Helpful Browser Note */}
            <p style={{ marginTop: '16px', fontSize: '12px', color: 'var(--mute)', lineHeight: 1.4 }}>
              💡 If the sign-in window closes or is blocked, check your browser's address bar to ensure popups are allowed for this site, then try again.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Action Cards */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Card 1: Cloud Database Backup */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>☁️</span>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Library Database Backup</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--mute)', margin: '0 0 14px', lineHeight: 1.4 }}>
                  Creates a timestamped snapshot of all books, 56 student profiles, active loans, fines, and
                  reservations directly in your Google Drive.
                </p>
              </div>
              <button
                type="button"
                className="btn"
                onClick={handleBackupToDrive}
                disabled={isBackingUp}
                style={{ width: '100%', fontSize: '13px' }}
              >
                {isBackingUp ? 'Saving Backup...' : 'Backup Database to Google Drive ➔'}
              </button>
            </div>

            {/* Card 2: Export Reports to Drive */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📊</span>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Save Reports to Drive</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--mute)', margin: '0 0 14px', lineHeight: 1.4 }}>
                  Export circulation spreadsheets and book inventories into Google Sheets format in Google Drive.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                <button
                  type="button"
                  className="btn alt"
                  onClick={() => handleExportReportToDrive('students')}
                  disabled={isExporting}
                  style={{ fontSize: '12px', padding: '6px' }}
                >
                  Student Roster CSV
                </button>
                <button
                  type="button"
                  className="btn alt"
                  onClick={() => handleExportReportToDrive('books')}
                  disabled={isExporting}
                  style={{ fontSize: '12px', padding: '6px' }}
                >
                  Catalogue CSV
                </button>
              </div>
            </div>

            {/* Card 3: Upload Course Materials & E-Books */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '20px' }}>📤</span>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>Upload Course Materials</h3>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--mute)', margin: '0 0 14px', lineHeight: 1.4 }}>
                  Upload PDF lecture notes, textbooks, and syllabus files to Google Drive for students and faculty.
                </p>
              </div>
              <label
                className="btn alt"
                style={{
                  textAlign: 'center',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'block',
                  margin: 0,
                }}
              >
                <span>Upload PDF / File to Drive ➔</span>
                <input
                  type="file"
                  style={{ display: 'none' }}
                  onChange={handleFileUpload}
                />
              </label>
            </div>
          </div>

          {uploadMessage && (
            <div
              style={{
                background: 'var(--brand2)',
                color: 'var(--brand)',
                padding: '10px 14px',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⏳</span>
              <span>{uploadMessage}</span>
            </div>
          )}

          {/* Drive File Browser */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px' }}>Google Drive File Browser</h3>
                <small style={{ color: 'var(--mute)' }}>
                  Files accessible in your connected Google Drive account
                </small>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="search"
                  placeholder="Search Drive files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') loadFiles(searchQuery);
                  }}
                  style={{ fontSize: '13px', padding: '5px 10px', width: '220px' }}
                />
                <button
                  type="button"
                  className="btn alt"
                  onClick={() => loadFiles(searchQuery)}
                  style={{ fontSize: '12px', padding: '5px 10px' }}
                >
                  🔍 Search
                </button>
                <button
                  type="button"
                  className="btn alt"
                  onClick={() => {
                    setSearchQuery('');
                    loadFiles('');
                  }}
                  style={{ fontSize: '12px', padding: '5px 10px' }}
                >
                  🔄 Refresh
                </button>
              </div>
            </div>

            {isLoadingFiles ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--mute)' }}>
                Loading files from Google Drive...
              </div>
            ) : files.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--mute)' }}>
                No files found in Google Drive matching your search.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', fontSize: '13px' }}>
                  <thead>
                    <tr>
                      <th>File Name</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Modified</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((file) => {
                      const isBackup = file.name.startsWith('Smart_Library_Backup') && file.name.endsWith('.json');

                      return (
                        <tr key={file.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{isBackup ? '💾' : '📄'}</span>
                              <b style={{ wordBreak: 'break-word' }}>{file.name}</b>
                              {isBackup && (
                                <span className="tag ok" style={{ fontSize: '10px' }}>
                                  Library Backup
                                </span>
                              )}
                            </div>
                          </td>
                          <td style={{ fontSize: '12px', color: 'var(--mute)' }}>
                            {file.mimeType.split('/').pop()?.toUpperCase() || 'FILE'}
                          </td>
                          <td style={{ fontSize: '12px' }}>{formatFileSize(file.size)}</td>
                          <td style={{ fontSize: '12px', color: 'var(--mute)' }}>
                            {file.modifiedTime ? new Date(file.modifiedTime).toLocaleDateString() : '-'}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn alt"
                                  style={{
                                    fontSize: '11px',
                                    padding: '3px 8px',
                                    textDecoration: 'none',
                                    display: 'inline-block',
                                  }}
                                  title="Open file in Google Drive"
                                >
                                  Open in Drive ↗
                                </a>
                              )}

                              {isBackup && (
                                <button
                                  type="button"
                                  className="btn"
                                  style={{ fontSize: '11px', padding: '3px 8px', background: '#0e7c53', color: '#fff' }}
                                  onClick={() => setRestoreConfirmItem(file)}
                                  title="Restore library state from this backup"
                                >
                                  📥 Restore
                                </button>
                              )}

                              <button
                                type="button"
                                className="btn alt"
                                style={{ fontSize: '11px', padding: '3px 8px', color: '#c02626' }}
                                onClick={() => setDeleteConfirmItem(file)}
                                title="Delete file from Google Drive"
                              >
                                🗑️ Delete
                              </button>
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
        </>
      )}

      {/* Mandatory User Confirmation Modal for Destructive Delete (Workspace Skill Requirement) */}
      {deleteConfirmItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '16px',
          }}
        >
          <div className="panel" style={{ width: '100%', maxWidth: '440px', margin: 0 }}>
            <h3 style={{ margin: '0 0 8px', color: 'var(--bad)', fontSize: '18px' }}>
              ⚠️ Delete File from Google Drive?
            </h3>
            <p style={{ fontSize: '14px', lineHeight: 1.5, margin: '0 0 16px' }}>
              Are you sure you want to delete <b>“{deleteConfirmItem.name}”</b> from your Google Drive?
              This operation will permanently remove the file.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn alt"
                onClick={() => setDeleteConfirmItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: '#c02626', color: '#ffffff' }}
                onClick={executeDeleteFile}
              >
                Yes, Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Modal for Database Restore */}
      {restoreConfirmItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 200,
            padding: '16px',
          }}
        >
          <div className="panel" style={{ width: '100%', maxWidth: '460px', margin: 0 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: 'var(--ink)' }}>
              📥 Restore Library Database from Google Drive?
            </h3>
            <p style={{ fontSize: '14px', lineHeight: 1.5, margin: '0 0 16px' }}>
              You are about to restore the library state from:
              <br />
              <b>“{restoreConfirmItem.name}”</b>.
              <br /><br />
              This will overwrite the currently loaded books, loans, and reservations with the state
              from this backup file.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button
                type="button"
                className="btn alt"
                onClick={() => setRestoreConfirmItem(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn"
                style={{ background: '#0e7c53', color: '#ffffff' }}
                onClick={executeRestoreBackup}
              >
                Confirm Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
