import { Library, Loan, inr, fmt } from '../types/library.ts';

function downloadCSV(filename: string, csvContent: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function getOverdueCSV(lib: Library): string {
  const overdue = lib.loans.filter((l) => !l.returnedOn && l.dueOn < lib.now);
  const headers = ['Register No', 'Student Name', 'Book Code', 'Book Title', 'Copy ID', 'Due Date', 'Days Late', 'Fine Accrued'];
  const rows = overdue.map((l) => {
    const m = lib.member(l.memberId);
    const b = lib.book(l.bookId);
    const late = l.lateDays(lib.now);
    const fine = lib.fineOf(l);
    return [
      `"${l.memberId}"`,
      `"${m?.name || ''}"`,
      `"${l.bookId}"`,
      `"${b?.title || ''}"`,
      `"${l.copyId}"`,
      `"${fmt(l.dueOn)}"`,
      late,
      `"${inr(fine)}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function exportOverdueListCSV(lib: Library) {
  const csv = getOverdueCSV(lib);
  downloadCSV(`smart-library-overdue-${new Date(lib.now).toISOString().slice(0, 10)}.csv`, csv);
}

export function getCatalogueCSV(lib: Library): string {
  const headers = ['Course Code', 'Title', 'Author', 'Category', 'Total Copies', 'Issued Copies', 'Available Copies', 'Reference Price'];
  const rows = lib.books.map((b) => [
    `"${b.id}"`,
    `"${b.title}"`,
    `"${b.author}"`,
    `"${b.category}"`,
    b.copies,
    b.issued,
    lib.available(b),
    `"${inr(b.price || 450)}"`,
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

export function exportCatalogueCSV(lib: Library) {
  const csv = getCatalogueCSV(lib);
  downloadCSV(`smart-library-catalogue-${new Date(lib.now).toISOString().slice(0, 10)}.csv`, csv);
}

export function getFinesCSV(lib: Library): string {
  const loansWithFines = lib.loans.filter((l) => lib.fineOf(l) > 0);
  const headers = ['Transaction ID', 'Student ID', 'Student Name', 'Book Code', 'Book Title', 'Fine Amount', 'Payment Status', 'Returned Date'];
  const rows = loansWithFines.map((l) => {
    const m = lib.member(l.memberId);
    const b = lib.book(l.bookId);
    const fine = lib.fineOf(l);
    return [
      `"${l.id}"`,
      `"${l.memberId}"`,
      `"${m?.name || ''}"`,
      `"${l.bookId}"`,
      `"${b?.title || ''}"`,
      `"${inr(fine)}"`,
      `"${l.paid ? 'Paid' : l.returnedOn ? 'Unpaid' : 'Still Accruing'}"`,
      `"${l.returnedOn ? fmt(l.returnedOn) : 'Active'}"`,
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

export function exportFinesCollectedCSV(lib: Library) {
  const csv = getFinesCSV(lib);
  downloadCSV(`smart-library-fines-${new Date(lib.now).toISOString().slice(0, 10)}.csv`, csv);
}

export function getStudentsCSV(lib: Library): string {
  const students = lib.members.filter((m) => m.role === 'student');
  const headers = ['Register Number', 'Student Name', 'Department / Course', 'Active Books Borrowed', 'Fines Due'];
  const rows = students.map((s) => [
    `"${s.id}"`,
    `"${s.name}"`,
    `"${(s as any).course || 'B.E. CSE'}"`,
    lib.activeLoans(s.id).length,
    `"${inr(lib.unpaidFines(s.id))}"`,
  ].join(','));

  return [headers.join(','), ...rows].join('\n');
}

export function downloadSampleBooksCSV() {
  const sample = `Code,Title,Author,Category,Copies,Price
CS25C13,Cloud Computing Fundamentals,Andrew Tanenbaum,Course book,5,550
CS25C14,Machine Learning Applications,Peter Norvig,Course book,4,620
CS25C15,Cybersecurity & Cryptography,William Stallings,Course book,3,480`;
  downloadCSV('sample-books-import.csv', sample);
}

export function downloadSampleStudentsCSV() {
  const sample = `RegisterNo,Name,Course
311425148401,AADHITYA K,B.E. CSE
311425148402,DEEPIKA M,B.E. CSE
311425148403,SARAVANAN P,B.E. CSE`;
  downloadCSV('sample-students-import.csv', sample);
}

export function parseCSV(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim().length > 0);
  return lines.map((line) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  });
}
