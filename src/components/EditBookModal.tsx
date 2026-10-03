import React, { useState, useEffect } from 'react';
import { Book, inr } from '../types/library.ts';

interface EditBookModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookId: string, updates: { title: string; author: string; category: string; copies: number; price?: number }) => void;
  onDelete: (bookId: string) => void;
}

export function EditBookModal({ book, isOpen, onClose, onSave, onDelete }: EditBookModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState('');
  const [copies, setCopies] = useState(1);
  const [price, setPrice] = useState(450);

  useEffect(() => {
    if (book) {
      setTitle(book.title);
      setAuthor(book.author || '');
      setCategory(book.category || 'Course book');
      setCopies(book.copies);
      setPrice(book.price || 450);
    }
  }, [book]);

  if (!isOpen || !book) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onSave(book.id, {
      title: title.trim(),
      author: author.trim(),
      category: category.trim(),
      copies: Math.max(1, copies),
      price: Math.max(1, price),
    });
    onClose();
  };

  const handleDelete = () => {
    if (book.issued > 0) {
      alert(`Cannot delete “${book.title}” while ${book.issued} copy is on loan.`);
      return;
    }
    if (window.confirm(`Are you sure you want to delete “${book.title}” (${book.id}) from the catalogue?`)) {
      onDelete(book.id);
      onClose();
    }
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
          maxWidth: '480px',
          margin: 0,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h3 style={{ margin: 0, fontSize: '20px' }}>Edit Book · {book.id}</h3>
          <button
            type="button"
            className="btn alt"
            style={{ padding: '4px 10px' }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px' }}>
          <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: 'var(--mute)' }}>
            Course Code (Identifier)
            <input type="text" value={book.id} disabled style={{ opacity: 0.7 }} />
          </label>

          <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: 'var(--mute)' }}>
            Title
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </label>

          <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: 'var(--mute)' }}>
            Author
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: 'var(--mute)' }}>
              Category
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </label>

            <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: 'var(--mute)' }}>
              Total Copies
              <input
                type="number"
                min={book.issued || 1}
                value={copies}
                onChange={(e) => setCopies(parseInt(e.target.value, 10) || 1)}
              />
            </label>
          </div>

          <label style={{ display: 'grid', gap: '4px', fontSize: '13px', color: 'var(--mute)' }}>
            Reference Price (₹)
            <input
              type="number"
              min={1}
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value, 10) || 450)}
            />
          </label>

          {book.issued > 0 && (
            <div style={{ fontSize: '12px', color: 'var(--brand)', background: 'var(--brand2)', padding: '6px 10px', borderRadius: '4px' }}>
              ℹ Currently {book.issued} copies are issued on loan. Copies count cannot be lower than {book.issued}.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
            <button
              type="button"
              className="btn warn"
              onClick={handleDelete}
              disabled={book.issued > 0}
              title={book.issued > 0 ? 'Cannot delete while copies are issued' : 'Remove book'}
            >
              Delete Book
            </button>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn alt" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn">
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
