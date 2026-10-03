import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Library, inr, fmt } from '../types/library.ts';

export interface ScanConfirmation {
  type: 'student_view' | 'issue_ready' | 'return_ready' | 'unrecognized';
  title: string;
  code: string;
  student?: {
    id: string;
    name: string;
    course?: string;
    activeLoansCount: number;
    unpaidFines: number;
  };
  book?: {
    id: string;
    title: string;
    author: string;
    copyId?: string;
    category?: string;
  };
  loan?: {
    id: string;
    borrowerName: string;
    borrowerId: string;
    dueOn: number;
    fine: number;
    isOverdue: boolean;
  };
  message: string;
}

interface ScanModalProps {
  lib: Library;
  isOpen: boolean;
  onClose: () => void;
  onScanIssue: (studentId: string, bookId: string, copyId?: string) => void;
  onScanReturn: (copyOrLoanId: string) => void;
  onViewStudentData?: (studentId: string) => void;
  initialStudentId?: string;
  initialBookId?: string;
}

export function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(960, ctx.currentTime);
    gain.gain.setValueAtTime(0.28, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch (e) {
    // audio context ignored if not unlocked
  }
}

export function ScanModal({
  lib,
  isOpen,
  onClose,
  onScanIssue,
  onScanReturn,
  onViewStudentData,
  initialStudentId = '',
  initialBookId = '',
}: ScanModalProps) {
  const [mode, setMode] = useState<'student_data' | 'issue' | 'return'>('student_data');
  const [studentInput, setStudentInput] = useState(initialStudentId);
  const [bookInput, setBookInput] = useState(initialBookId);
  const [returnInput, setReturnInput] = useState('');

  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraList, setCameraList] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Camera Flash / Torch state for low-light scanning
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState<boolean | null>(null);

  const [statusMessage, setStatusMessage] = useState<string>('Ready to scan barcode.');
  const [lastScanned, setLastScanned] = useState<string>('');
  const [flashGreen, setFlashGreen] = useState(false);

  // Result Confirmation state for auto-closing camera and immediate focus
  const [confirmation, setConfirmation] = useState<ScanConfirmation | null>(null);
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const readerElementId = 'barcode-camera-viewport';

  // Helper to retrieve the current active camera video track
  const getVideoTrack = useCallback((): MediaStreamTrack | null => {
    try {
      const videoEl = document.querySelector(`#${readerElementId} video`) as HTMLVideoElement | null;
      if (videoEl && videoEl.srcObject instanceof MediaStream) {
        const tracks = videoEl.srcObject.getVideoTracks();
        if (tracks.length > 0) return tracks[0];
      }
    } catch (e) {
      console.warn('Error reading video track:', e);
    }
    return null;
  }, [readerElementId]);

  // Stop camera function
  const stopCamera = useCallback(async () => {
    // Turn off torch hardware if running
    try {
      const track = getVideoTrack();
      if (track) {
        await track.applyConstraints({ advanced: [{ torch: false } as any] });
      }
    } catch {}
    setTorchOn(false);

    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (err) {
        console.warn('Error clearing scanner', err);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  }, [getVideoTrack]);

  // Manual camera flash / low-light illumination toggle
  const toggleTorch = useCallback(async () => {
    if (!cameraActive) {
      setStatusMessage('Please start camera to use flash.');
      return;
    }

    const nextTorch = !torchOn;
    let hardwareTorchApplied = false;

    try {
      const track = getVideoTrack();
      if (track) {
        const capabilities = track.getCapabilities ? (track.getCapabilities() as any) : null;
        if (capabilities && capabilities.torch) {
          await track.applyConstraints({
            advanced: [{ torch: nextTorch } as any],
          });
          hardwareTorchApplied = true;
          setTorchSupported(true);
        } else {
          try {
            await track.applyConstraints({
              advanced: [{ torch: nextTorch } as any],
            });
            hardwareTorchApplied = true;
            setTorchSupported(true);
          } catch {
            setTorchSupported(false);
          }
        }
      }
    } catch (err) {
      console.warn('Hardware torch error:', err);
      setTorchSupported(false);
    }

    setTorchOn(nextTorch);

    // Apply digital video contrast/brightness filter to video element
    const videoEl = document.querySelector(`#${readerElementId} video`) as HTMLVideoElement | null;
    if (videoEl) {
      videoEl.style.filter = nextTorch ? 'brightness(1.35) contrast(1.2) saturate(1.05)' : 'none';
      videoEl.style.transition = 'filter 0.25s ease';
    }

    if (nextTorch) {
      setStatusMessage(
        hardwareTorchApplied
          ? '⚡ Camera Flash ON: Hardware torch illuminated for low-light scanning.'
          : '💡 Low-Light Flash ON: Sensor gain and screen illuminator active.'
      );
    } else {
      setStatusMessage('Flash OFF: Standard lighting restored.');
    }
  }, [cameraActive, torchOn, getVideoTrack, readerElementId]);

  useEffect(() => {
    if (initialStudentId) setStudentInput(initialStudentId);
    if (initialBookId) setBookInput(initialBookId);
  }, [initialStudentId, initialBookId]);

  // Handle confirming action from the confirmation dialog
  const handleConfirmAction = useCallback(() => {
    if (!confirmation) return;

    if (confirmation.type === 'student_view' && confirmation.student) {
      const studentId = confirmation.student.id;
      if (mode === 'student_data' && onViewStudentData) {
        onViewStudentData(studentId);
        onClose();
        return;
      }
      if (mode === 'issue') {
        setStudentInput(studentId);
        setConfirmation(null);
        startCamera();
        setStatusMessage(`Student ${confirmation.student.name} selected. Scan book barcode.`);
        return;
      }
    }

    if (confirmation.type === 'return_ready') {
      const codeToReturn = confirmation.code;
      onScanReturn(codeToReturn);
      setConfirmation(null);
      return;
    }

    if (confirmation.type === 'issue_ready' && confirmation.student && confirmation.book) {
      onScanIssue(confirmation.student.id, confirmation.book.id, confirmation.book.copyId);
      setConfirmation(null);
      return;
    }

    if (confirmation.type === 'unrecognized') {
      setConfirmation(null);
      startCamera();
      return;
    }
  }, [confirmation, mode, onViewStudentData, onClose, onScanReturn, onScanIssue]);

  const handleScanAnother = useCallback(() => {
    setConfirmation(null);
    startCamera();
    setStatusMessage('🟢 Live camera active. Ready to scan barcode.');
  }, []);

  // Autofocus the cursor on the confirmation action button whenever dialog appears
  useEffect(() => {
    if (confirmation) {
      const timer = setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [confirmation]);

  // Keyboard navigation: Enter confirms, Escape cancels/scans next
  useEffect(() => {
    if (!confirmation) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirmAction();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleScanAnother();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmation, handleConfirmAction, handleScanAnother]);

  const handleBarcodeInput = useCallback(
    (scannedRaw: string) => {
      const code = scannedRaw.trim().toUpperCase();
      if (!code) return;

      playScanBeep();
      setFlashGreen(true);
      setTimeout(() => setFlashGreen(false), 800);
      setLastScanned(code);

      // Auto-close camera immediately after successful scan
      stopCamera();

      // Check if student barcode scanned
      const studentObj = lib.member(code);
      if (studentObj && studentObj.role === 'student') {
        const activeLoans = lib.activeLoans(code);
        const unpaid = lib.unpaidFines(code);

        if (mode === 'student_data') {
          setConfirmation({
            type: 'student_view',
            title: `Verified Student: ${studentObj.name}`,
            code,
            student: {
              id: studentObj.id,
              name: studentObj.name,
              course: (studentObj as any).course || 'B.E. CSE',
              activeLoansCount: activeLoans.length,
              unpaidFines: unpaid,
            },
            message: `Student verified: ${studentObj.name} (${code}). Camera auto-closed. Press Enter or click below to view complete records.`,
          });
          setStatusMessage(`✓ Verified Student: ${studentObj.name} (${code}). Press Enter to confirm.`);
          return;
        }

        if (mode === 'issue') {
          setStudentInput(code);
          if (bookInput.trim()) {
            const rawBook = bookInput.trim().toUpperCase();
            const copyMatch = rawBook.match(/^([A-Z0-9]+)-C(\d+)$/i);
            const bookId = copyMatch ? copyMatch[1] : rawBook;
            const copyId = copyMatch ? rawBook : undefined;
            const bookObj = lib.book(bookId);

            setConfirmation({
              type: 'issue_ready',
              title: `Confirm Issue: “${bookObj?.title || rawBook}”`,
              code,
              student: {
                id: studentObj.id,
                name: studentObj.name,
                course: (studentObj as any).course || 'B.E. CSE',
                activeLoansCount: activeLoans.length,
                unpaidFines: unpaid,
              },
              book: bookObj ? {
                id: bookObj.id,
                title: bookObj.title,
                author: bookObj.author,
                copyId: copyId || `${bookObj.id}-C1`,
              } : undefined,
              message: `Ready to issue “${bookObj?.title || rawBook}” to ${studentObj.name}. Due in 14 days. Press Enter to confirm.`,
            });
            setStatusMessage(`Verified student & book. Press Enter to issue.`);
            return;
          } else {
            setConfirmation({
              type: 'student_view',
              title: `Student Selected: ${studentObj.name}`,
              code,
              student: {
                id: studentObj.id,
                name: studentObj.name,
                course: (studentObj as any).course || 'B.E. CSE',
                activeLoansCount: activeLoans.length,
                unpaidFines: unpaid,
              },
              message: `Student verified: ${studentObj.name}. Now scan book barcode.`,
            });
            setStatusMessage(`Student selected: ${studentObj.name}. Press Enter to scan book.`);
            return;
          }
        }
      }

      // Return mode
      if (mode === 'return') {
        const activeLoan = lib.loans.find(
          (l) => !l.returnedOn && (l.copyId?.toUpperCase() === code || l.id.toUpperCase() === code || l.bookId.toUpperCase() === code)
        );
        const bookObj = activeLoan ? lib.book(activeLoan.bookId) : lib.book(code);
        const borrower = activeLoan ? lib.member(activeLoan.memberId) : null;
        const fine = activeLoan ? lib.fineOf(activeLoan) : 0;
        const isOverdue = activeLoan ? activeLoan.dueOn < lib.now : false;

        setReturnInput(code);
        setConfirmation({
          type: 'return_ready',
          title: activeLoan ? `Confirm Return: “${bookObj?.title || activeLoan.bookId}”` : `Return Scanned: ${code}`,
          code,
          book: bookObj ? {
            id: bookObj.id,
            title: bookObj.title,
            author: bookObj.author,
            copyId: activeLoan?.copyId || code,
          } : undefined,
          loan: activeLoan ? {
            id: activeLoan.id,
            borrowerName: borrower?.name || activeLoan.memberId,
            borrowerId: activeLoan.memberId,
            dueOn: activeLoan.dueOn,
            fine,
            isOverdue,
          } : undefined,
          message: activeLoan
            ? `Copy ${activeLoan.copyId} borrowed by ${borrower?.name || activeLoan.memberId}. ${isOverdue ? `Overdue penalty: ${inr(fine)}.` : 'Returned on time (no fines).'}`
            : `Scanned code ${code} for return processing.`,
        });
        setStatusMessage(`Scanned copy ${code}. Press Enter to confirm return.`);
        return;
      }

      // Check if book barcode
      const copyMatch = code.match(/^([A-Z0-9]+)-C(\d+)$/i);
      const bookId = copyMatch ? copyMatch[1] : code;
      const copyId = copyMatch ? code : undefined;
      const bookObj = lib.book(bookId);

      if (bookObj) {
        setBookInput(code);
        if (studentInput.trim()) {
          const finalStudent = lib.member(studentInput.trim());
          setConfirmation({
            type: 'issue_ready',
            title: `Confirm Book Issue: “${bookObj.title}”`,
            code,
            student: finalStudent ? {
              id: finalStudent.id,
              name: finalStudent.name,
              course: (finalStudent as any).course || 'B.E. CSE',
              activeLoansCount: lib.activeLoans(finalStudent.id).length,
              unpaidFines: lib.unpaidFines(finalStudent.id),
            } : undefined,
            book: {
              id: bookObj.id,
              title: bookObj.title,
              author: bookObj.author,
              copyId: copyId || `${bookObj.id}-C1`,
            },
            message: `Ready to issue “${bookObj.title}” to ${finalStudent?.name || studentInput}. Press Enter to confirm.`,
          });
          setStatusMessage(`Verified book & student. Press Enter to issue.`);
          return;
        } else {
          setConfirmation({
            type: 'issue_ready',
            title: `Book Identified: “${bookObj.title}”`,
            code,
            book: {
              id: bookObj.id,
              title: bookObj.title,
              author: bookObj.author,
              copyId: copyId || `${bookObj.id}-C1`,
            },
            message: `Book selected: “${bookObj.title}”. Press Enter to proceed to scan student ID.`,
          });
          setStatusMessage(`Book selected: “${bookObj.title}”. Scan student barcode.`);
          return;
        }
      }

      // Unrecognized barcode
      setConfirmation({
        type: 'unrecognized',
        title: `Barcode Scanned: ${code}`,
        code,
        message: mode === 'student_data'
          ? `Barcode ${code} was not found among registered students.`
          : `Barcode ${code} was not recognized as a library book or student ID.`,
      });
      setStatusMessage(`Barcode ${code} was not found.`);
    },
    [mode, studentInput, bookInput, lib, stopCamera]
  );

  // Start camera function triggered by user interaction or load
  const startCamera = async (targetCamId?: string) => {
    setCameraLoading(true);
    setCameraError(null);
    setStatusMessage('Requesting camera permissions...');

    // Stop existing camera if running
    await stopCamera();

    try {
      // 1. First query available video devices
      let devices: { id: string; label: string }[] = [];
      try {
        devices = await Html5Qrcode.getCameras();
        setCameraList(devices);
      } catch (e) {
        console.warn('getCameras error, will try direct stream:', e);
      }

      const cameraIdToUse = targetCamId || selectedCameraId || (devices.length > 0 ? devices[0].id : null);
      if (cameraIdToUse) {
        setSelectedCameraId(cameraIdToUse);
      }

      const viewportEl = document.getElementById(readerElementId);
      if (!viewportEl) {
        setCameraLoading(false);
        return;
      }

      const html5QrCode = new Html5Qrcode(readerElementId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
        ],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      // Try deviceId first, fallback to facingMode environment, then true
      const config = { fps: 15, qrbox: { width: 280, height: 160 }, aspectRatio: 1.333333 };

      if (cameraIdToUse) {
        await html5QrCode.start(
          cameraIdToUse,
          config,
          (decodedText) => handleBarcodeInput(decodedText),
          () => {}
        );
      } else {
        try {
          await html5QrCode.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => handleBarcodeInput(decodedText),
            () => {}
          );
        } catch (envErr) {
          // If environment back-camera fails (e.g. laptop webcam), try any camera
          await html5QrCode.start(
            { facingMode: 'user' },
            config,
            (decodedText) => handleBarcodeInput(decodedText),
            () => {}
          );
        }
      }

      setCameraActive(true);
      setCameraLoading(false);
      setStatusMessage('🟢 Live Camera Active. Hold barcode steadily in front of lens.');
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setCameraLoading(false);
      setCameraActive(false);

      const errorText = err?.message || String(err);
      if (errorText.includes('NotAllowedError') || errorText.includes('Permission')) {
        setCameraError(
          'Camera access was denied by your browser. Please click the camera/lock icon in your browser address bar and choose "Allow".'
        );
      } else if (errorText.includes('NotFoundError') || errorText.includes('DevicesNotFoundError')) {
        setCameraError('No webcam or camera device was detected on your computer/phone.');
      } else {
        setCameraError(`Camera could not start: ${errorText}`);
      }
      setStatusMessage('Camera could not be opened. You can use "📸 Take Photo with Camera" below.');
    }
  };

  // Attempt auto-start when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfirmation(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  // Decode from file / photo snapshot
  const handleDecodeFromImage = async (file: File) => {
    try {
      setStatusMessage('Processing barcode from image...');
      setCameraError(null);
      const html5QrCode = new Html5Qrcode('temp-file-scanner', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
        ],
        verbose: false,
      });

      const decodedText = await html5QrCode.scanFile(file, true);
      handleBarcodeInput(decodedText);
      html5QrCode.clear();
    } catch (err: any) {
      setStatusMessage(`Could not detect a clear barcode in this photo. Please retake closer in good lighting.`);
    }
  };

  if (!isOpen) return null;

  const students = lib.members.filter((m) => m.role === 'student');

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
          maxHeight: '92vh',
          overflowY: 'auto',
          margin: 0,
          position: 'relative',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '20px' }}>📷 Barcode Scanner & Camera</h3>
            <small style={{ color: 'var(--mute)' }}>
              Scan student ID card or book barcode to view data
            </small>
          </div>
          <button
            type="button"
            className="btn alt"
            style={{ padding: '4px 10px' }}
            onClick={() => {
              stopCamera();
              onClose();
            }}
          >
            ✕
          </button>
        </div>

        {/* Mode Switcher */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
          <button
            type="button"
            className={`btn ${mode === 'student_data' ? '' : 'alt'}`}
            style={{ flex: 1, fontSize: '13px' }}
            onClick={() => {
              setMode('student_data');
              setStatusMessage('Scan Student ID to open their data & records.');
            }}
          >
            🎓 View Student Data
          </button>
          <button
            type="button"
            className={`btn ${mode === 'issue' ? '' : 'alt'}`}
            style={{ flex: 1, fontSize: '13px' }}
            onClick={() => {
              setMode('issue');
              setStatusMessage('Scan student and book to issue.');
            }}
          >
            📚 Issue Book
          </button>
          <button
            type="button"
            className={`btn ${mode === 'return' ? '' : 'alt'}`}
            style={{ flex: 1, fontSize: '13px' }}
            onClick={() => {
              setMode('return');
              setStatusMessage('Scan book copy to return.');
            }}
          >
            🔄 Return Book
          </button>
        </div>

        {/* Camera Toolbar: Camera Selection & Manual Flash / Low-Light Torch Toggle */}
        <div
          style={{
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          {cameraList.length > 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', flex: 1, minWidth: '180px' }}>
              <span style={{ color: 'var(--mute)', fontWeight: 600 }}>Camera:</span>
              <select
                value={selectedCameraId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setSelectedCameraId(newId);
                  startCamera(newId);
                }}
                style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
              >
                {cameraList.map((cam, idx) => (
                  <option key={cam.id} value={cam.id}>
                    {cam.label || `Camera ${idx + 1}`}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <span style={{ fontSize: '12px', color: 'var(--mute)' }}>
              Optical Barcode Scanner {cameraActive ? '• 🟢 Live' : ''}
            </span>
          )}

          {/* Manual Camera Flash Toggle Button */}
          <button
            type="button"
            className="btn"
            onClick={toggleTorch}
            disabled={!cameraActive}
            style={{
              background: torchOn ? '#eab308' : 'var(--brand2)',
              color: torchOn ? '#000000' : 'var(--brand)',
              border: torchOn ? '1px solid #ca8a04' : '1px solid var(--line)',
              fontWeight: 600,
              fontSize: '12px',
              padding: '4px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              borderRadius: '6px',
              cursor: cameraActive ? 'pointer' : 'not-allowed',
              opacity: cameraActive ? 1 : 0.6,
              boxShadow: torchOn ? '0 0 10px rgba(234, 179, 8, 0.45)' : 'none',
              transition: 'all 0.18s ease',
            }}
            title={
              cameraActive
                ? torchOn
                  ? 'Turn camera flash OFF'
                  : 'Turn camera flash ON for low-light scanning'
                : 'Start camera to enable flash'
            }
          >
            <span>{torchOn ? '⚡' : '🔦'}</span>
            <span>{torchOn ? 'Flash ON' : 'Flash'}</span>
            {torchOn && (
              <span
                style={{
                  background: '#000000',
                  color: '#fef08a',
                  fontSize: '9px',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  textTransform: 'uppercase',
                  fontWeight: 700,
                }}
              >
                Active
              </span>
            )}
          </button>
        </div>

        {/* Optical Camera Viewport OR Result Confirmation Dialog */}
        <div
          className={torchOn && !confirmation ? 'scanner-viewport-torch' : ''}
          style={{
            position: 'relative',
            background: confirmation ? 'transparent' : '#0a1012',
            borderRadius: '10px',
            overflow: 'hidden',
            marginBottom: cameraActive ? '6px' : '12px',
            border: confirmation
              ? '2px solid #22c55e'
              : flashGreen
              ? '3px solid #22c55e'
              : torchOn
              ? '3px solid #ffffff'
              : '1px solid var(--line)',
            transition: 'border 0.2s ease, box-shadow 0.2s ease',
            boxShadow: confirmation
              ? '0 0 24px rgba(34, 197, 94, 0.35), var(--glass-shadow)'
              : flashGreen
              ? '0 0 16px rgba(34, 197, 94, 0.45)'
              : torchOn
              ? '0 0 0 4px #ffffff, 0 0 28px rgba(255, 255, 255, 0.9)'
              : 'none',
            minHeight: cameraActive || confirmation ? '250px' : '140px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          {confirmation ? (
            /* Result Confirmation Dialog with immediate autoFocus on Primary Action button */
            <div
              style={{
                padding: '22px 20px',
                width: '100%',
                background: 'var(--surface)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                color: 'var(--ink)',
                borderRadius: '10px',
              }}
            >
              {/* Header with verified check badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: confirmation.type === 'unrecognized' ? 'var(--bad)' : '#22c55e',
                      color: '#ffffff',
                      fontSize: '18px',
                      fontWeight: 700,
                      boxShadow: confirmation.type === 'unrecognized' ? '0 0 12px rgba(239, 68, 68, 0.4)' : '0 0 14px rgba(34, 197, 94, 0.5)',
                    }}
                  >
                    {confirmation.type === 'unrecognized' ? '✕' : '✓'}
                  </span>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '17px', color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                      {confirmation.title}
                    </h4>
                    <span style={{ fontSize: '11px', color: 'var(--mute)' }}>
                      Scanned code: <code style={{ fontWeight: 700, color: 'var(--brand)' }}>{confirmation.code}</code> · Camera auto-closed
                    </span>
                  </div>
                </div>

                <span
                  className={`tag ${confirmation.type === 'unrecognized' ? 'bad' : 'ok'}`}
                  style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px' }}
                >
                  {confirmation.type === 'unrecognized' ? 'NOT FOUND' : 'VERIFIED'}
                </span>
              </div>

              {/* Data Summary Container */}
              <div
                style={{
                  background: 'var(--brand2)',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  marginBottom: '18px',
                  border: '1px solid var(--line)',
                  fontSize: '13px',
                }}
              >
                {confirmation.student && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <span style={{ color: 'var(--mute)', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Student</span>
                      <b style={{ color: 'var(--ink)' }}>{confirmation.student.name}</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--mute)', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Register No</span>
                      <code style={{ fontSize: '12px' }}>{confirmation.student.id}</code>
                    </div>
                    <div>
                      <span style={{ color: 'var(--mute)', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Active Borrowed</span>
                      <span>{confirmation.student.activeLoansCount} of 3 books</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--mute)', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Fines Due</span>
                      <b style={{ color: confirmation.student.unpaidFines > 0 ? 'var(--bad)' : 'var(--ok)' }}>
                        {inr(confirmation.student.unpaidFines)}
                      </b>
                    </div>
                  </div>
                )}

                {confirmation.book && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '8px' }}>
                    <div>
                      <span style={{ color: 'var(--mute)', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Book Title</span>
                      <b style={{ color: 'var(--ink)' }}>{confirmation.book.title}</b>
                    </div>
                    {confirmation.book.copyId && (
                      <div>
                        <span style={{ color: 'var(--mute)', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Copy Code</span>
                        <code>{confirmation.book.copyId}</code>
                      </div>
                    )}
                    {confirmation.book.author && (
                      <div>
                        <span style={{ color: 'var(--mute)', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Author</span>
                        <span>{confirmation.book.author}</span>
                      </div>
                    )}
                  </div>
                )}

                {confirmation.loan && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed var(--line)' }}>
                    <div>
                      <span style={{ color: 'var(--mute)', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Borrowed By</span>
                      <span>{confirmation.loan.borrowerName}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--mute)', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Due Date</span>
                      <span>{fmt(confirmation.loan.dueOn)}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--mute)', fontSize: '11px', display: 'block', textTransform: 'uppercase', fontWeight: 600 }}>Return Penalty</span>
                      <b style={{ color: confirmation.loan.isOverdue ? 'var(--bad)' : 'var(--ok)' }}>
                        {confirmation.loan.isOverdue ? inr(confirmation.loan.fine) : 'None (On-Time)'}
                      </b>
                    </div>
                  </div>
                )}

                <p style={{ margin: '8px 0 0', color: 'var(--mute)', fontSize: '12px', lineHeight: 1.45 }}>
                  {confirmation.message}
                </p>
              </div>

              {/* Action Buttons: confirmButtonRef receives immediate focus */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn alt"
                  onClick={handleScanAnother}
                  style={{ fontSize: '13px' }}
                >
                  📷 Scan Another (Esc)
                </button>

                <button
                  ref={confirmButtonRef}
                  type="button"
                  className="btn"
                  onClick={handleConfirmAction}
                  style={{
                    background: confirmation.type === 'unrecognized'
                      ? 'var(--brand)'
                      : 'linear-gradient(180deg, #16a34a 0%, #15803d 100%)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '13px',
                    padding: '8px 18px',
                    boxShadow: confirmation.type === 'unrecognized'
                      ? 'none'
                      : '0 0 16px rgba(22, 163, 74, 0.45)',
                    outline: '2px solid #4ade80',
                    outlineOffset: '2px',
                  }}
                >
                  {confirmation.type === 'student_view' && '📂 View Student Profile (Enter)'}
                  {confirmation.type === 'issue_ready' && '✅ Confirm Issue to Student (Enter)'}
                  {confirmation.type === 'return_ready' && '🔄 Confirm Return & Settle (Enter)'}
                  {confirmation.type === 'unrecognized' && 'Try Scanning Again (Enter)'}
                </button>
              </div>
            </div>
          ) : cameraActive ? (
            <div style={{ width: '100%', position: 'relative', overflow: 'hidden' }}>
              <div id={readerElementId} style={{ width: '100%' }} />

              {/* Floating Camera Flash Toggle Button in Viewfinder */}
              <button
                type="button"
                className="btn"
                onClick={toggleTorch}
                title={torchOn ? 'Turn camera flash OFF' : 'Turn camera flash ON (low-light conditions)'}
                style={{
                  position: 'absolute',
                  top: '10px',
                  left: '10px',
                  zIndex: 20,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: torchOn ? '#eab308' : 'rgba(10, 16, 18, 0.85)',
                  color: torchOn ? '#000000' : '#ffffff',
                  border: torchOn ? '2px solid #fde047' : '1px solid rgba(255, 255, 255, 0.35)',
                  backdropFilter: 'blur(6px)',
                  borderRadius: '20px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: torchOn ? '0 0 14px rgba(234, 179, 8, 0.75)' : '0 2px 8px rgba(0,0,0,0.4)',
                  transition: 'all 0.2s ease',
                }}
              >
                <span style={{ fontSize: '13px' }}>{torchOn ? '⚡' : '🔦'}</span>
                <span>{torchOn ? 'Flash ON' : 'Flash'}</span>
              </button>

              {/* Viewfinder Aiming Reticle with Pulsing Glowing Corners & Sweeping Laser Line */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 5,
                }}
              >
                {/* Aiming Reticle Box */}
                <div
                  className="scanner-reticle-box"
                  style={{
                    position: 'relative',
                    width: '78%',
                    maxWidth: '320px',
                    height: '140px',
                    borderRadius: '8px',
                    boxShadow: flashGreen
                      ? '0 0 0 9999px rgba(0, 0, 0, 0.35), 0 0 24px #22c55e'
                      : '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                    transition: 'box-shadow 0.25s ease',
                  }}
                >
                  {/* Top-Left Corner */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '24px',
                      height: '24px',
                      borderTop: '3px solid #22c55e',
                      borderLeft: '3px solid #22c55e',
                      borderTopLeftRadius: '6px',
                    }}
                  />
                  {/* Top-Right Corner */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      right: 0,
                      width: '24px',
                      height: '24px',
                      borderTop: '3px solid #22c55e',
                      borderRight: '3px solid #22c55e',
                      borderTopRightRadius: '6px',
                    }}
                  />
                  {/* Bottom-Left Corner */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      width: '24px',
                      height: '24px',
                      borderBottom: '3px solid #22c55e',
                      borderLeft: '3px solid #22c55e',
                      borderBottomLeftRadius: '6px',
                    }}
                  />
                  {/* Bottom-Right Corner */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      right: 0,
                      width: '24px',
                      height: '24px',
                      borderBottom: '3px solid #22c55e',
                      borderRight: '3px solid #22c55e',
                      borderBottomRightRadius: '6px',
                    }}
                  />

                  {/* Dynamic Laser Scanning Line (Sweeps up and down while searching) */}
                  <div className="scanner-laser-line" />

                  {/* Prompt inside box */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      left: 0,
                      right: 0,
                      textAlign: 'center',
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '11px',
                      fontWeight: 600,
                      textShadow: '0 1px 4px rgba(0,0,0,0.85)',
                      letterSpacing: '0.2px',
                    }}
                  >
                    Align Barcode in Center
                  </div>
                </div>
              </div>

              {/* Top Bar with Live Indicator & Radar Pulse */}
              <div
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(10, 16, 18, 0.85)',
                  backdropFilter: 'blur(4px)',
                  color: '#4ade80',
                  fontSize: '11px',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  zIndex: 10,
                  border: '1px solid rgba(74, 222, 128, 0.35)',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              >
                <span className="scanner-pulse-dot" />
                <span>{torchOn ? '⚡ Flash Active • Scanning' : 'Camera Active • Searching'}</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '24px', textAlign: 'center', color: '#ffffff', maxWidth: '440px' }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>
                {cameraLoading ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span className="scanner-pulse-dot" style={{ width: '22px', height: '22px' }} />
                  </div>
                ) : (
                  '📷'
                )}
              </div>
              <b style={{ display: 'block', fontSize: '15px', marginBottom: '6px' }}>
                {cameraLoading ? 'Starting Camera Stream...' : 'Camera Not Running'}
              </b>
              <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#b0bec5', lineHeight: 1.4 }}>
                {cameraError ||
                  (cameraLoading
                    ? 'Requesting browser video permissions and calibrating sensor...'
                    : 'Browser permissions may be required or your device may not support direct live streaming.')}
              </p>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#0e7c53', color: '#ffffff' }}
                  onClick={() => startCamera()}
                  disabled={cameraLoading}
                >
                  {cameraLoading ? 'Connecting Camera...' : '🎥 Start Live Camera'}
                </button>

                {/* Instant Native Phone/Laptop Camera Capture */}
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'var(--brand)', color: '#ffffff' }}
                  onClick={() => cameraInputRef.current?.click()}
                >
                  📸 Take Photo of Barcode
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Visual Progress Indicator (Active while camera is searching) */}
        {cameraActive && (
          <div style={{ marginBottom: '10px' }} title="Optical sensor actively scanning frames">
            <div className="scanner-progress-track">
              <div className="scanner-progress-beam" />
            </div>
          </div>
        )}

        {/* Native Camera input - works 100% on phones and laptops */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleDecodeFromImage(file);
          }}
        />

        {/* Regular file upload input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleDecodeFromImage(file);
          }}
        />

        {/* Status Banner with Pulse Feedback */}
        <div
          style={{
            background: flashGreen ? '#d6efe1' : 'var(--brand2)',
            color: flashGreen ? '#14603a' : 'var(--brand)',
            padding: '8px 12px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: flashGreen ? '1px solid #22c55e' : '1px solid transparent',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {cameraActive && !flashGreen && (
              <span className="scanner-pulse-dot" style={{ transform: 'scale(0.85)' }} />
            )}
            {flashGreen && <span style={{ fontWeight: 'bold' }}>✓</span>}
            <span>{statusMessage}</span>
          </div>
          {lastScanned && (
            <span className="tag alt">
              Last: <code>{lastScanned}</code>
            </span>
          )}
        </div>

        {/* Fast Action Buttons: Take Photo & Upload Photo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
          <button
            type="button"
            className="btn"
            style={{ fontSize: '13px', padding: '8px' }}
            onClick={() => cameraInputRef.current?.click()}
          >
            📸 Take Photo with Camera
          </button>
          <button
            type="button"
            className="btn alt"
            style={{ fontSize: '13px', padding: '8px' }}
            onClick={() => fileInputRef.current?.click()}
          >
            🖼️ Upload Barcode Image
          </button>
        </div>

        {/* Manual Barcode or Student Number Search */}
        <div style={{ marginBottom: '12px' }}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (studentInput.trim()) {
                handleBarcodeInput(studentInput.trim());
              }
            }}
            style={{ display: 'flex', gap: '8px' }}
          >
            <input
              type="text"
              placeholder="Or enter barcode number (e.g. 311425148001)"
              value={studentInput}
              onChange={(e) => setStudentInput(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn">
              {mode === 'student_data' ? 'View Student Data ➔' : 'Search Barcode'}
            </button>
          </form>
        </div>

        {/* 1-Tap Student Selector */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: '10px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--mute)', display: 'block', marginBottom: '6px' }}>
            Or click any student below to open their data directly:
          </span>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '6px',
              maxHeight: '160px',
              overflowY: 'auto',
            }}
          >
            {students.slice(0, 16).map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleBarcodeInput(s.id)}
                style={{
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '6px 8px',
                  background: 'var(--brand2)',
                  color: 'var(--ink)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <span>
                  <b>{s.id}</b> · {s.name.split(' ')[0]}
                </span>
                <span className="tag alt" style={{ fontSize: '10px' }}>
                  View Data ➔
                </span>
              </button>
            ))}
          </div>
        </div>

        <div id="temp-file-scanner" style={{ display: 'none' }} />
      </div>
    </div>
  );
}
