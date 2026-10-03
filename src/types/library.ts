export const RULES = {
  loanDays: 14,
  baseFine: 100,
  maxLoans: 3,
  fineCap: 1000, // Capped maximum fine per transaction (Feature 9)
  reservationHoldDays: 3, // Reservation expires in 3 days if uncollected (Feature 10)
};

export const DAY = 864e5; // 86400000 ms

export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');

export const iso = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const ymd = (v: string) => {
  const [y, m, d] = v.split('-').map(Number);
  return {
    start: new Date(y, m - 1, d, 12).getTime(),
    end: new Date(y, m - 1, d, 23, 59, 59).getTime(),
  };
};

export const fmt = (t: number) =>
  new Date(t).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

export const ROSTER_RAW = `311425148001 AKASH NITHIN KUMAR M
311425148002 AMAL HASHIMA M
311425148003 ASHWINI L
311425148004 BHAVANA R
311425148006 DHIVAGAR J
311425148007 ELSHA JOVI J
311425148008 GOKULNATH H
311425148009 GOPIKA S
311425148010 HANSHIKA S
311425148011 HARINI S
311425148012 HARSHAVARDHAN G R
311425148013 HARSHITHA A
311425148014 INBASRI G
311425148015 JANANI J
311425148016 JANNATHUL FAMITHA T A
311425148017 JEEVA BHARATHI S
311425148018 KAVIN SHREYANTH N
311425148019 KEERTHI RAMYA Y
311425148020 KOSHIKA M
311425148021 LAKSHMI SRI S
311425148022 LOHITH PRAKASH S
311425148023 MALATHI G
311425148024 MOHAMED AATHIL MAIDEEN S
311425148026 MOHITH KANNA R
311425148027 NARMADHA V
311425148028 NEERAJ ARAVINDAN A
311425148029 NIRAIMATHI A
311425148030 NITHYA S
311425148031 OMNISHA A
311425148032 PRAVEENA D
311425148033 PREETHIKSHA G
311425148034 PRIYADHARSHINI M
311425148035 RAGAVI R
311425148037 ROHINISH S
311425148038 ROSHNE V
311425148039 SAI MITHESH S
311425148040 SANJANA V
311425148041 SANJANA V
311425148042 SANTHOSH KUMAR K
311425148043 SHAHANAH G L
311425148044 SHALINI S N
311425148045 SHANMUGA PRIYA A
311425148046 SHARAN S
311425148047 SIDHARTH K R
311425148048 SRI DEEPIKA C
311425148049 SUBHIKSHA S
311425148050 SWATHI S
311425148051 SWETHA S
311425148052 VARSHASRI P
311425148054 VARSHINI V
311425148055 VELU V
311425148056 YASVAND G S
311425148301 MALLIHA SHREE M
311425148302 SEJAL KESHRI
311425148303 VIJAY V S
311425148304 YOKKESH RAJ K`;

export type Role = 'librarian' | 'student';

export interface PersonData {
  id: string;
  name: string;
  email?: string;
  role: Role;
  course?: string;
  password?: string;
}

export class Person {
  id: string;
  name: string;
  email?: string;
  role: Role;
  password: string;

  constructor({ id, name, email, role, password }: PersonData) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.role = role;
    this.password = password || (role === 'librarian' ? 'admin123' : id);
  }
}

export class Student extends Person {
  course: string;
  constructor(o: PersonData) {
    super({ ...o, role: 'student' });
    this.course = o.course || '';
  }
}

export class Librarian extends Person {
  constructor(o: PersonData) {
    super({ ...o, role: 'librarian' });
  }
}

export interface BookData {
  id: string;
  title: string;
  author: string;
  category: string;
  copies: number;
  issued?: number;
  price?: number;
}

export class Book implements BookData {
  id: string;
  title: string;
  author: string;
  category: string;
  copies: number;
  issued: number;
  price: number;

  constructor({ id, title, author = '', category = 'Course book', copies, issued = 0, price = 450 }: BookData) {
    this.id = id;
    this.title = title;
    this.author = author;
    this.category = category;
    this.copies = copies;
    this.issued = issued;
    this.price = price || 450;
  }
}

export interface LoanData {
  id: string;
  bookId: string;
  memberId: string;
  copyId?: string; // Feature 4: Per-copy tracking (e.g. CS25C08-c1)
  issuedOn: number;
  dueOn: number;
  returnedOn?: number | null;
  fine?: number;
  paid?: boolean;
  paidOn?: number | null;
  renewed?: boolean; // Feature 8: Renewals
}

export class Loan implements LoanData {
  id: string;
  bookId: string;
  memberId: string;
  copyId: string;
  issuedOn: number;
  dueOn: number;
  returnedOn: number | null;
  fine: number;
  paid: boolean;
  paidOn?: number | null;
  renewed: boolean;

  constructor({
    id,
    bookId,
    memberId,
    copyId,
    issuedOn,
    dueOn,
    returnedOn = null,
    fine = 0,
    paid = false,
    paidOn = null,
    renewed = false,
  }: LoanData) {
    this.id = id;
    this.bookId = bookId;
    this.memberId = memberId;
    this.copyId = copyId || `${bookId}-c1`;
    this.issuedOn = issuedOn;
    this.dueOn = dueOn;
    this.returnedOn = returnedOn;
    this.fine = fine;
    this.paid = paid;
    this.paidOn = paidOn || (paid && returnedOn ? returnedOn : null);
    this.renewed = renewed;
  }

  lateDays(now: number): number {
    const end = this.returnedOn ?? now;
    return Math.max(0, Math.ceil((end - this.dueOn) / DAY));
  }

  // Feature 9: Fine Cap calculation
  fineAt(now: number): number {
    const d = this.lateDays(now);
    if (d <= 0) return 0;
    const uncapped = RULES.baseFine * Math.pow(2, Math.min(d, 40) - 1);
    return Math.min(uncapped, RULES.fineCap);
  }
}

export type ReservationStatus = 'waiting' | 'ready' | 'done' | 'cancelled' | 'expired';

export interface ReservationData {
  id: string;
  bookId: string;
  memberId: string;
  on: number;
  readyOn?: number | null; // Feature 10: Timestamp when status became 'ready'
  status?: ReservationStatus;
}

export class Reservation implements ReservationData {
  id: string;
  bookId: string;
  memberId: string;
  on: number;
  readyOn: number | null;
  status: ReservationStatus;

  constructor({ id, bookId, memberId, on, readyOn = null, status = 'waiting' }: ReservationData) {
    this.id = id;
    this.bookId = bookId;
    this.memberId = memberId;
    this.on = on;
    this.readyOn = readyOn;
    this.status = status;
  }
}

export interface LibrarySerialized {
  offset: number;
  seq: number;
  books: BookData[];
  members: PersonData[];
  loans: LoanData[];
  reservations: ReservationData[];
  savedAt?: number;
}

export class Library {
  offset: number;
  seq: number;
  books: Book[];
  members: (Student | Librarian)[];
  loans: Loan[];
  reservations: Reservation[];

  constructor(data: LibrarySerialized) {
    this.offset = data.offset || 0;
    this.seq = data.seq || 100;
    this.books = (data.books || []).map((b) => new Book(b));
    this.members = (data.members || []).map((m) =>
      m.role === 'librarian' ? new Librarian(m) : new Student(m)
    );
    this.loans = (data.loans || []).map((l) => new Loan(l));
    this.reservations = (data.reservations || []).map((r) => new Reservation(r));

    // Ensure book.issued count is strictly in sync with active unreturned loans
    this.books.forEach((b) => {
      b.issued = this.loans.filter((l) => l.bookId === b.id && !l.returnedOn).length;
    });

    // Automatically check reservation expiries
    this.checkReservationExpiries();
  }

  get now(): number {
    return Date.now() + this.offset;
  }

  static seed(): Library {
    const B = (id: string, title: string, author: string, category: string, copies: number): BookData => ({
      id,
      title,
      author,
      category,
      copies,
      issued: 0,
      price: 450,
    });

    const members: PersonData[] = [
      { id: 'pooja', name: 'Pooja (Head Librarian)', email: 'pooja.librarian@campus.edu', role: 'librarian', password: '123' },
      { id: 'L1', name: 'Pooja (Head Librarian)', email: 'pooja.librarian@campus.edu', role: 'librarian', password: '123' },
      ...ROSTER_RAW.split('\n')
        .filter((l) => l.trim().length > 0)
        .map((l) => {
          const [id, ...n] = l.trim().split(' ');
          return { id, name: n.join(' '), role: 'student' as Role, course: 'B.E. CSE', password: id };
        }),
    ];

    const baseNow = Date.now();

    // Historical returned loans with paid fines to represent monthly collection records
    const historicalLoans: LoanData[] = [
      {
        id: 'HL-01',
        bookId: 'MA25C08',
        memberId: '311425148001',
        copyId: 'MA25C08-c1',
        issuedOn: baseNow - 160 * DAY,
        dueOn: baseNow - 146 * DAY,
        returnedOn: baseNow - 143 * DAY,
        paid: true,
        paidOn: baseNow - 143 * DAY,
        fine: 400,
      },
      {
        id: 'HL-02',
        bookId: 'CS25C10',
        memberId: '311425148003',
        copyId: 'CS25C10-c1',
        issuedOn: baseNow - 130 * DAY,
        dueOn: baseNow - 116 * DAY,
        returnedOn: baseNow - 111 * DAY,
        paid: true,
        paidOn: baseNow - 111 * DAY,
        fine: 750,
      },
      {
        id: 'HL-03',
        bookId: 'CS25C08',
        memberId: '311425148007',
        copyId: 'CS25C08-c2',
        issuedOn: baseNow - 100 * DAY,
        dueOn: baseNow - 86 * DAY,
        returnedOn: baseNow - 80 * DAY,
        paid: true,
        paidOn: baseNow - 80 * DAY,
        fine: 1200,
      },
      {
        id: 'HL-04',
        bookId: 'CS25C09',
        memberId: '311425148011',
        copyId: 'CS25C09-c1',
        issuedOn: baseNow - 95 * DAY,
        dueOn: baseNow - 81 * DAY,
        returnedOn: baseNow - 77 * DAY,
        paid: true,
        paidOn: baseNow - 77 * DAY,
        fine: 500,
      },
      {
        id: 'HL-05',
        bookId: 'CS25C11',
        memberId: '311425148015',
        copyId: 'CS25C11-c1',
        issuedOn: baseNow - 68 * DAY,
        dueOn: baseNow - 54 * DAY,
        returnedOn: baseNow - 49 * DAY,
        paid: true,
        paidOn: baseNow - 49 * DAY,
        fine: 950,
      },
      {
        id: 'HL-06',
        bookId: 'MA25C01',
        memberId: '311425148020',
        copyId: 'MA25C01-c1',
        issuedOn: baseNow - 38 * DAY,
        dueOn: baseNow - 24 * DAY,
        returnedOn: baseNow - 18 * DAY,
        paid: true,
        paidOn: baseNow - 18 * DAY,
        fine: 1100,
      },
      {
        id: 'HL-07',
        bookId: 'PH25C01',
        memberId: '311425148024',
        copyId: 'PH25C01-c1',
        issuedOn: baseNow - 22 * DAY,
        dueOn: baseNow - 8 * DAY,
        returnedOn: baseNow - 4 * DAY,
        paid: true,
        paidOn: baseNow - 4 * DAY,
        fine: 650,
      },
    ];

    return new Library({
      offset: 0,
      seq: 100,
      books: [
        B('MA25C08', 'Discrete Mathematics', '', 'Course book', 5),
        B('CS25C10', 'Object Oriented Software Engineering', '', 'Course book', 5),
        B('CS25C08', 'Data Structures', '', 'Course book', 5),
        B('CS25C09', 'Java Programming', '', 'Course book', 5),
        B('CS25C11', 'Operating Systems', '', 'Course book', 5),
        B('EN25C03', 'English Communication Skills Laboratory – II', '', 'Course book', 5),
        B('MA25C01', 'Calculus and Differential Equations', '', 'Course book', 5),
        B('PH25C01', 'Applied Physics (CSIE) – I', '', 'Course book', 5),
        B('CY25C01', 'Applied Chemistry', '', 'Course book', 5),
        B('GE25C01', 'Tamils and Technology', '', 'Course book', 5),
        B('CS25C01', 'Programming in C', '', 'Course book', 5),
        B('CS25C02', 'Computer Programming Laboratory', '', 'Course book', 5),
        B('EN25C01', 'English Essentials – I', '', 'Course book', 5),
        B('UC25A01', 'Life Skills for Engineers – I*', '', 'Course book', 5),
        B('UC25A02', 'Physical Education – I*', '', 'Course book', 5),
        B('MA25C02', 'Linear Algebra', '', 'Course book', 5),
        B('PH25C03', 'Applied Physics (CSIE) – II', '', 'Course book', 5),
        B('EE25C01', 'Basic Electrical and Electronics Engineering', '', 'Course book', 5),
        B('UC25H02', 'தமிழர்களும் தொழில்நுட்பமும் / Tamils and Technology', '', 'Course book', 5),
        B('CS25C06', 'Digital Principles and Computer Organization', '', 'Course book', 5),
        B('CS25C07', 'Object Oriented Programming', '', 'Course book', 5),
        B('EN25C02', 'English Essentials – II', '', 'Course book', 5),
        B('ME25C05', 'Re-Engineering for Innovation', '', 'Course book', 5),
        B('UC25A03', 'Life Skills for Engineers – II*', '', 'Course book', 5),
        B('UC25A04', 'Physical Education – II*', '', 'Course book', 5),
      ],
      members,
      loans: historicalLoans,
      reservations: [],
    });
  }

  uid(prefix: string): string {
    this.seq++;
    return `${prefix}${this.seq}`;
  }

  book(id: string): Book | undefined {
    return this.books.find((b) => b.id === id);
  }

  member(id: string): (Student | Librarian) | undefined {
    return this.members.find((m) => m.id === id);
  }

  held(bookId: string): number {
    return this.reservations.filter((r) => r.bookId === bookId && r.status === 'ready').length;
  }

  available(b: Book): number {
    return b.copies - b.issued - this.held(b.id);
  }

  activeLoans(mid: string): Loan[] {
    return this.loans.filter((l) => l.memberId === mid && !l.returnedOn);
  }

  fineOf(l: Loan): number {
    return l.returnedOn ? l.fine : l.fineAt(this.now);
  }

  unpaidFines(mid: string): number {
    return this.loans
      .filter((l) => l.memberId === mid && !l.paid)
      .reduce((s, l) => s + this.fineOf(l), 0);
  }

  // Feature 4: Find available copy accession ID
  getAvailableCopyId(bookId: string): string {
    const b = this.book(bookId);
    if (!b) return `${bookId}-c1`;
    const activeIssuedCopies = new Set(
      this.loans.filter((l) => l.bookId === bookId && !l.returnedOn).map((l) => l.copyId)
    );
    for (let i = 1; i <= b.copies; i++) {
      const candidate = `${bookId}-c${i}`;
      if (!activeIssuedCopies.has(candidate)) {
        return candidate;
      }
    }
    return `${bookId}-c${b.issued + 1}`;
  }

  // Feature 6: Edit book details
  editBook(bookId: string, o: { title: string; author?: string; category?: string; copies: number; price?: number }) {
    const b = this.book(bookId);
    if (!b) throw new Error('Book not found.');
    if (o.copies < b.issued) {
      throw new Error(`Cannot set copies to ${o.copies}: ${b.issued} copies are currently on loan.`);
    }
    b.title = o.title.trim();
    if (o.author !== undefined) b.author = o.author.trim();
    if (o.category !== undefined) b.category = o.category.trim();
    b.copies = Math.max(1, o.copies);
    if (o.price !== undefined) b.price = Math.max(1, o.price);
  }

  // Feature 6: Delete a book
  deleteBook(bookId: string) {
    const b = this.book(bookId);
    if (!b) throw new Error('Book not found.');
    if (b.issued > 0) {
      throw new Error(`Cannot delete “${b.title}”: ${b.issued} copy is currently checked out.`);
    }
    if (this.reservations.some((r) => r.bookId === bookId && (r.status === 'waiting' || r.status === 'ready'))) {
      throw new Error(`Cannot delete “${b.title}”: active reservations exist for this book.`);
    }
    this.books = this.books.filter((x) => x.id !== bookId);
  }

  addBook(o: { id?: string; title: string; author?: string; category?: string; copies: number; price?: number }) {
    const id = o.id || this.uid('B');
    this.books.push(
      new Book({
        id,
        title: o.title,
        author: o.author || '',
        category: o.category || 'Course book',
        copies: o.copies,
        issued: 0,
        price: o.price || 450,
      })
    );
  }

  addStudent(o: { id?: string; name: string; course?: string; password?: string }) {
    const id = o.id || this.uid('S');
    this.members.push(
      new Student({
        id,
        name: o.name,
        email: `${id.toLowerCase()}@student.library.edu`,
        role: 'student',
        course: o.course || '',
        password: o.password || id,
      })
    );
  }

  // Feature 10: Reservation expiry after 3 days
  checkReservationExpiries(): string[] {
    const expiredMsgs: string[] = [];
    const expiryThreshold = RULES.reservationHoldDays * DAY;

    this.reservations.forEach((r) => {
      if (r.status === 'ready' && r.readyOn) {
        if (this.now - r.readyOn > expiryThreshold) {
          r.status = 'expired';
          const b = this.book(r.bookId);
          const m = this.member(r.memberId);
          expiredMsgs.push(`Reservation for “${b?.title}” by ${m?.name} expired after 3 days.`);

          // Allocate to next waiting student
          const next = this.reservations
            .filter((x) => x.bookId === r.bookId && x.status === 'waiting')
            .sort((a, c) => a.on - c.on)[0];
          if (next) {
            next.status = 'ready';
            next.readyOn = this.now;
          }
        }
      }
    });

    return expiredMsgs;
  }

  // Feature 8: Loan Renewal
  renewLoan(loanId: string, memberId: string): string {
    const l = this.loans.find((x) => x.id === loanId);
    if (!l) throw new Error('Loan not found.');
    if (l.memberId !== memberId && this.member(memberId)?.role !== 'librarian') {
      throw new Error('You can only renew your own loans.');
    }
    if (l.returnedOn) throw new Error('This book has already been returned.');
    if (l.renewed) throw new Error('This loan has already been renewed once. Maximum 1 renewal allowed.');
    if (l.dueOn < this.now) {
      throw new Error('Overdue books cannot be renewed. Please return the book and settle fines.');
    }
    // Check if another member has a reservation waiting
    const hasWaiting = this.reservations.some(
      (r) => r.bookId === l.bookId && r.status === 'waiting'
    );
    if (hasWaiting) {
      throw new Error('Cannot renew: another student has reserved this book.');
    }

    l.dueOn += RULES.loanDays * DAY;
    l.renewed = true;
    const b = this.book(l.bookId);
    return `Renewed “${b?.title}” for another 14 days. New return date: ${fmt(l.dueOn)}.`;
  }

  // Feature 7: Reminders check for a student
  checkReminders(memberId: string): { type: 'overdue' | 'dueToday' | 'dueSoon' | 'readyRes'; text: string; loanId?: string }[] {
    const reminders: { type: 'overdue' | 'dueToday' | 'dueSoon' | 'readyRes'; text: string; loanId?: string }[] = [];
    const myLoans = this.activeLoans(memberId);

    // Automated fine cap threshold alert
    const unpaid = this.unpaidFines(memberId);
    if (unpaid > RULES.fineCap * 0.5) {
      reminders.push({
        type: 'overdue',
        text: `⚠️ URGENT: Unpaid fines (${inr(unpaid)}) exceed 50% of institution cap (${inr(RULES.fineCap)}). Immediate payment required.`,
      });
    }

    myLoans.forEach((l) => {
      const b = this.book(l.bookId);
      const title = b?.title || l.bookId;
      const diffDays = Math.ceil((l.dueOn - this.now) / DAY);

      if (l.dueOn < this.now) {
        const late = l.lateDays(this.now);
        reminders.push({
          type: 'overdue',
          text: `“${title}” is overdue by ${late} day${late > 1 ? 's' : ''}! Return today to avoid compounding fines.`,
          loanId: l.id,
        });
      } else if (diffDays <= 0) {
        reminders.push({
          type: 'dueToday',
          text: `“${title}” is due TODAY (${fmt(l.dueOn)}).`,
          loanId: l.id,
        });
      } else if (diffDays <= 2) {
        reminders.push({
          type: 'dueSoon',
          text: `“${title}” is due in ${diffDays} day${diffDays > 1 ? 's' : ''} (${fmt(l.dueOn)}).`,
          loanId: l.id,
        });
      }
    });

    // Reservations ready to collect
    this.reservations
      .filter((r) => r.memberId === memberId && r.status === 'ready')
      .forEach((r) => {
        const b = this.book(r.bookId);
        const title = b?.title || r.bookId;
        const remainingDays = r.readyOn
          ? Math.max(0, Math.ceil((r.readyOn + RULES.reservationHoldDays * DAY - this.now) / DAY))
          : 3;
        reminders.push({
          type: 'readyRes',
          text: `“${title}” is ready for pickup! Hold expires in ${remainingDays} day(s).`,
        });
      });

    return reminders;
  }

  issue(bookId: string, memberId: string, issuedOn: number = this.now, dueOn: number = issuedOn + RULES.loanDays * DAY, copyId?: string) {
    const b = this.book(bookId);
    const m = this.member(memberId);
    if (!b || !m) throw new Error('Select a book and a student.');
    if (m.role !== 'student') throw new Error('Only students can borrow books.');
    if (this.activeLoans(memberId).some((l) => l.bookId === bookId)) {
      throw new Error(`${m.name} already holds this book.`);
    }
    if (this.activeLoans(memberId).length >= RULES.maxLoans) {
      throw new Error(`${m.name} has reached the limit of ${RULES.maxLoans} books.`);
    }
    if (this.unpaidFines(memberId) > 0) {
      throw new Error(`${m.name} must pay ${inr(this.unpaidFines(memberId))} in fines first.`);
    }
    const res = this.reservations.find(
      (r) => r.bookId === bookId && r.memberId === memberId && r.status === 'ready'
    );
    if (res) {
      res.status = 'done';
    } else if (this.available(b) <= 0) {
      throw new Error('No copy is free. Reserve it instead.');
    }

    const assignedCopy = copyId || this.getAvailableCopyId(bookId);
    b.issued++;
    this.loans.push(new Loan({ id: this.uid('T'), bookId, memberId, copyId: assignedCopy, issuedOn, dueOn }));
    return `Issued “${b.title}” [Copy: ${assignedCopy}] to ${m.name}. Due ${fmt(dueOn)}.`;
  }

  issueMany(memberId: string, ids: string[], from?: string, to?: string) {
    let issuedOn = this.now;
    let dueOn = issuedOn + RULES.loanDays * DAY;
    if (from) {
      const f = ymd(from);
      issuedOn = iso(f.start) === iso(this.now) ? this.now : f.start;
      if (issuedOn > this.now) throw new Error('Borrow date cannot be in the future.');
      dueOn = issuedOn + RULES.loanDays * DAY;
    }
    if (to) {
      dueOn = ymd(to).end;
      if (dueOn <= issuedOn) throw new Error('Return date must be after the borrow date.');
      if (dueOn - issuedOn > 60 * DAY) throw new Error('Return date can be at most 60 days after the borrow date.');
    }
    const ok: string[] = [];
    const bad: string[] = [];
    ids.forEach((id) => {
      try {
        this.issue(id, memberId, issuedOn, dueOn);
        ok.push(id);
      } catch (e: any) {
        bad.push(`${id}: ${e.message}`);
      }
    });
    if (!ok.length) throw new Error(bad[0] || 'Tick at least one book first.');
    const m = this.member(memberId);
    return `Issued ${ok.join(', ')} to ${m?.name ?? memberId}. Return by ${fmt(dueOn)}.${
      bad.length ? ` Skipped ${bad.join('; ')}` : ''
    }`;
  }

  returnBook(loanId: string): string {
    const l = this.loans.find((x) => x.id === loanId);
    if (!l) throw new Error('Loan not found.');
    const b = this.book(l.bookId);
    if (!b) throw new Error('Book not found.');
    l.returnedOn = this.now;
    l.fine = l.fineAt(this.now);
    l.paid = l.fine === 0;
    b.issued = Math.max(0, b.issued - 1);

    const next = this.reservations
      .filter((r) => r.bookId === b.id && r.status === 'waiting')
      .sort((a, c) => a.on - c.on)[0];
    if (next) {
      next.status = 'ready';
      next.readyOn = this.now;
    }

    let msg = `Returned “${b.title}” [Copy: ${l.copyId}].`;
    if (l.fine > 0) msg += ` Fine: ${inr(l.fine)}.`;
    if (next) {
      const nm = this.member(next.memberId)?.name || next.memberId;
      msg += ` Held for ${nm} (reservation ready for 3 days).`;
    }
    return msg;
  }

  reserve(bookId: string, memberId: string): string {
    const b = this.book(bookId);
    if (!b) throw new Error('Book not found.');
    if (this.available(b) > 0) throw new Error('A copy is free now. Ask the librarian to issue it.');
    if (this.activeLoans(memberId).some((l) => l.bookId === bookId)) {
      throw new Error('You already hold this book.');
    }
    if (
      this.reservations.some(
        (r) => r.bookId === bookId && r.memberId === memberId && (r.status === 'waiting' || r.status === 'ready')
      )
    ) {
      throw new Error('You already reserved this book.');
    }
    this.reservations.push(new Reservation({ id: this.uid('R'), bookId, memberId, on: this.now }));
    return `Reserved “${b.title}”. You will be notified when it is ready.`;
  }

  cancelReservation(id: string): string {
    const r = this.reservations.find((x) => x.id === id);
    if (!r) throw new Error('Reservation not found.');
    const was = r.status;
    r.status = 'cancelled';
    if (was === 'ready') {
      const n = this.reservations
        .filter((x) => x.bookId === r.bookId && x.status === 'waiting')
        .sort((a, c) => a.on - c.on)[0];
      if (n) {
        n.status = 'ready';
        n.readyOn = this.now;
      }
    }
    return 'Reservation cancelled.';
  }

  payFine(loanId: string): string {
    const l = this.loans.find((x) => x.id === loanId);
    if (!l) throw new Error('Loan not found.');
    l.fine = this.fineOf(l);
    l.paid = true;
    l.paidOn = this.now;
    return `Fine of ${inr(l.fine)} paid.`;
  }

  stats() {
    const act = this.loans.filter((l) => !l.returnedOn);
    return {
      titles: this.books.length,
      copies: this.books.reduce((s, b) => s + b.copies, 0),
      issued: act.length,
      overdue: act.filter((l) => l.dueOn < this.now).length,
      reserved: this.reservations.filter((r) => r.status === 'waiting' || r.status === 'ready').length,
      fines: this.loans.filter((l) => !l.paid).reduce((s, l) => s + this.fineOf(l), 0),
    };
  }

  toJSON(): LibrarySerialized {
    return {
      savedAt: Date.now(),
      offset: this.offset,
      seq: this.seq,
      books: this.books.map((b) => ({
        id: b.id,
        title: b.title,
        author: b.author,
        category: b.category,
        copies: b.copies,
        issued: b.issued,
        price: b.price,
      })),
      members: this.members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        course: (m as Student).course,
        password: m.password,
      })),
      loans: this.loans.map((l) => ({
        id: l.id,
        bookId: l.bookId,
        copyId: l.copyId,
        memberId: l.memberId,
        issuedOn: l.issuedOn,
        dueOn: l.dueOn,
        returnedOn: l.returnedOn,
        fine: l.fine,
        paid: l.paid,
        paidOn: l.paidOn,
        renewed: l.renewed,
      })),
      reservations: this.reservations.map((r) => ({
        id: r.id,
        bookId: r.bookId,
        memberId: r.memberId,
        on: r.on,
        readyOn: r.readyOn,
        status: r.status,
      })),
    };
  }
}
