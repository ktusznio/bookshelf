/* ============================================
   Visual Bookshelf App — JavaScript
   ============================================ */

(function () {
  'use strict';

  // ---- Constants ----
  const BOOKS_PER_SHELF = 12;
  const STORAGE_KEY = 'bookshelf-books';

  const BOOK_COLORS = [
    '#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400',
    '#2c3e50', '#16a085', '#7f1d1d', '#1e3a5f', '#4a235a',
  ];

  const STATUS_LABELS = {
    'reading': 'Currently Reading',
    'read': 'Read',
    'want-to-read': 'Want to Read',
  };

  // ---- Default sample books ----
  const DEFAULT_BOOKS = [
    { id: '1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', status: 'read', rating: 4, color: '#2c3e50' },
    { id: '2', title: 'To Kill a Mockingbird', author: 'Harper Lee', status: 'read', rating: 5, color: '#27ae60' },
    { id: '3', title: '1984', author: 'George Orwell', status: 'read', rating: 5, color: '#c0392b' },
    { id: '4', title: 'Dune', author: 'Frank Herbert', status: 'reading', rating: 4, color: '#d35400' },
    { id: '5', title: 'Project Hail Mary', author: 'Andy Weir', status: 'reading', rating: 5, color: '#2980b9' },
    { id: '6', title: 'Sapiens', author: 'Yuval Noah Harari', status: 'read', rating: 4, color: '#8e44ad' },
    { id: '7', title: 'The Hobbit', author: 'J.R.R. Tolkien', status: 'read', rating: 5, color: '#1e3a5f' },
    { id: '8', title: 'Educated', author: 'Tara Westover', status: 'want-to-read', rating: 0, color: '#16a085' },
    { id: '9', title: 'The Midnight Library', author: 'Matt Haig', status: 'want-to-read', rating: 0, color: '#4a235a' },
    { id: '10', title: 'Atomic Habits', author: 'James Clear', status: 'read', rating: 4, color: '#7f1d1d' },
    { id: '11', title: 'Piranesi', author: 'Susanna Clarke', status: 'reading', rating: 4, color: '#2980b9' },
    { id: '12', title: 'Klara and the Sun', author: 'Kazuo Ishiguro', status: 'want-to-read', rating: 0, color: '#27ae60' },
    { id: '13', title: 'The Name of the Wind', author: 'Patrick Rothfuss', status: 'read', rating: 5, color: '#c0392b' },
    { id: '14', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', status: 'want-to-read', rating: 0, color: '#2c3e50' },
    { id: '15', title: 'The Alchemist', author: 'Paulo Coelho', status: 'read', rating: 3, color: '#d35400' },
  ];

  // ---- State ----
  let books = [];
  let activeFilter = 'all';
  let selectedRating = 0;
  let selectedColor = BOOK_COLORS[0];
  let currentDetailBook = null;

  // ---- DOM References ----
  const bookshelfEl = document.getElementById('bookshelf');
  const modalOverlay = document.getElementById('modalOverlay');
  const detailOverlay = document.getElementById('detailOverlay');
  const bookForm = document.getElementById('bookForm');
  const bookIdInput = document.getElementById('bookId');
  const bookTitleInput = document.getElementById('bookTitleInput');
  const bookAuthorInput = document.getElementById('bookAuthor');
  const bookStatusInput = document.getElementById('bookStatus');
  const bookRatingInput = document.getElementById('bookRating');
  const starRatingEl = document.getElementById('starRating');
  const colorPickerEl = document.getElementById('colorPicker');
  const modalTitleEl = document.getElementById('modalTitle');

  // ---- Persistence ----
  function loadBooks() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        books = JSON.parse(stored);
      } else {
        books = DEFAULT_BOOKS.map(b => ({ ...b }));
        saveBooks();
      }
    } catch {
      books = DEFAULT_BOOKS.map(b => ({ ...b }));
    }
  }

  function saveBooks() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }

  // ---- Helpers ----
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function getBookDimensions(title) {
    // Vary book size based on title length for visual interest
    const len = title.length;
    const width = Math.max(32, Math.min(52, 28 + len * 0.8));
    const height = Math.max(140, Math.min(185, 145 + (len % 7) * 6));
    return { width, height };
  }

  // ---- Rendering ----
  function getFilteredBooks() {
    if (activeFilter === 'all') return books;
    return books.filter(b => b.status === activeFilter);
  }

  function renderStats() {
    const reading = books.filter(b => b.status === 'reading').length;
    const read = books.filter(b => b.status === 'read').length;
    const wantToRead = books.filter(b => b.status === 'want-to-read').length;

    // Remove existing stats bar
    const existing = document.querySelector('.stats-bar');
    if (existing) existing.remove();

    if (books.length === 0) return;

    const statsEl = document.createElement('div');
    statsEl.className = 'stats-bar';
    statsEl.innerHTML = `
      <div class="stat">
        <span class="stat-dot reading"></span>
        <span>Reading</span>
        <span class="stat-count">${reading}</span>
      </div>
      <div class="stat">
        <span class="stat-dot read"></span>
        <span>Read</span>
        <span class="stat-count">${read}</span>
      </div>
      <div class="stat">
        <span class="stat-dot want-to-read"></span>
        <span>Want to Read</span>
        <span class="stat-count">${wantToRead}</span>
      </div>
      <div class="stat">
        <span>Total</span>
        <span class="stat-count">${books.length}</span>
      </div>
    `;

    const main = document.querySelector('main');
    main.insertBefore(statsEl, bookshelfEl);
  }

  function renderBookshelf() {
    const filtered = getFilteredBooks();
    bookshelfEl.innerHTML = '';

    if (filtered.length === 0) {
      bookshelfEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <h2>${activeFilter === 'all' ? 'Your bookshelf is empty' : 'No books in this category'}</h2>
          <p>${activeFilter === 'all' ? 'Add your first book to get started!' : 'Try adding some books or changing filters.'}</p>
        </div>
      `;
      renderStats();
      return;
    }

    // Split into shelves
    const shelves = [];
    for (let i = 0; i < filtered.length; i += BOOKS_PER_SHELF) {
      shelves.push(filtered.slice(i, i + BOOKS_PER_SHELF));
    }

    shelves.forEach(shelfBooks => {
      const shelfEl = document.createElement('div');
      shelfEl.className = 'shelf';

      const booksRow = document.createElement('div');
      booksRow.className = 'shelf-books';

      shelfBooks.forEach(book => {
        const dim = getBookDimensions(book.title);
        const bookEl = document.createElement('div');
        bookEl.className = 'book';
        bookEl.dataset.id = book.id;
        bookEl.style.setProperty('--book-width', dim.width + 'px');
        bookEl.style.setProperty('--book-height', dim.height + 'px');
        bookEl.style.setProperty('--book-color', book.color);

        bookEl.innerHTML = `
          <div class="book-spine" style="
            width: ${dim.width}px;
            height: ${dim.height}px;
            background: ${book.color};
          ">
            <span class="book-title">${escapeHtml(book.title)}</span>
            <span class="book-author">${escapeHtml(book.author)}</span>
            <span class="book-status-dot ${book.status}"></span>
          </div>
        `;

        bookEl.addEventListener('click', () => openDetail(book.id));
        booksRow.appendChild(bookEl);
      });

      const plank = document.createElement('div');
      plank.className = 'shelf-plank';

      const bracketLeft = document.createElement('div');
      bracketLeft.className = 'shelf-bracket-left';

      const bracketRight = document.createElement('div');
      bracketRight.className = 'shelf-bracket-right';

      shelfEl.appendChild(booksRow);
      shelfEl.appendChild(plank);
      shelfEl.appendChild(bracketLeft);
      shelfEl.appendChild(bracketRight);
      bookshelfEl.appendChild(shelfEl);
    });

    renderStats();
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ---- Modal: Add/Edit ----
  function openAddModal() {
    bookIdInput.value = '';
    bookForm.reset();
    modalTitleEl.textContent = 'Add a Book';
    selectedRating = 0;
    selectedColor = BOOK_COLORS[0];
    updateStarDisplay();
    updateColorDisplay();
    modalOverlay.classList.add('active');
    bookTitleInput.focus();
  }

  function openEditModal(book) {
    bookIdInput.value = book.id;
    bookTitleInput.value = book.title;
    bookAuthorInput.value = book.author;
    bookStatusInput.value = book.status;
    selectedRating = book.rating;
    selectedColor = book.color;
    modalTitleEl.textContent = 'Edit Book';
    updateStarDisplay();
    updateColorDisplay();
    modalOverlay.classList.add('active');
    bookTitleInput.focus();
  }

  function closeModal() {
    modalOverlay.classList.remove('active');
  }

  function handleFormSubmit(e) {
    e.preventDefault();
    const id = bookIdInput.value;
    const title = bookTitleInput.value.trim();
    const author = bookAuthorInput.value.trim();
    const status = bookStatusInput.value;
    const rating = selectedRating;
    const color = selectedColor;

    if (!title || !author) return;

    if (id) {
      // Edit existing
      const idx = books.findIndex(b => b.id === id);
      if (idx !== -1) {
        books[idx] = { ...books[idx], title, author, status, rating, color };
      }
    } else {
      // Add new
      books.push({ id: generateId(), title, author, status, rating, color });
    }

    saveBooks();
    renderBookshelf();
    closeModal();
  }

  // ---- Modal: Detail ----
  function openDetail(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    currentDetailBook = book;

    const dim = getBookDimensions(book.title);
    document.getElementById('detailBookPreview').innerHTML = `
      <div class="book-spine" style="
        width: ${dim.width * 1.3}px;
        height: ${dim.height * 1.1}px;
        background: ${book.color};
      ">
        <span class="book-title" style="font-size: 0.8rem">${escapeHtml(book.title)}</span>
        <span class="book-author">${escapeHtml(book.author)}</span>
      </div>
    `;

    document.getElementById('detailTitle').textContent = book.title;
    document.getElementById('detailAuthor').textContent = 'by ' + book.author;

    const statusEl = document.getElementById('detailStatus');
    statusEl.textContent = STATUS_LABELS[book.status];
    statusEl.className = 'detail-status ' + book.status;

    const ratingEl = document.getElementById('detailRating');
    if (book.rating > 0) {
      ratingEl.innerHTML = Array.from({ length: 5 }, (_, i) =>
        `<span class="star ${i < book.rating ? 'active' : ''}">&#9733;</span>`
      ).join('');
    } else {
      ratingEl.innerHTML = '<span style="font-size: 0.85rem; color: #999;">Not rated yet</span>';
    }

    detailOverlay.classList.add('active');
  }

  function closeDetail() {
    detailOverlay.classList.remove('active');
    currentDetailBook = null;
  }

  // ---- Star Rating ----
  function updateStarDisplay() {
    starRatingEl.querySelectorAll('.star').forEach(star => {
      const val = parseInt(star.dataset.value);
      star.classList.toggle('active', val <= selectedRating);
    });
    bookRatingInput.value = selectedRating;
  }

  // ---- Color Picker ----
  function updateColorDisplay() {
    colorPickerEl.querySelectorAll('.color-swatch').forEach(swatch => {
      swatch.classList.toggle('active', swatch.style.background === selectedColor ||
        rgbToHex(swatch.style.backgroundColor) === selectedColor);
    });
  }

  function rgbToHex(rgb) {
    if (rgb.startsWith('#')) return rgb;
    const match = rgb.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (!match) return rgb;
    return '#' + [match[1], match[2], match[3]].map(x =>
      parseInt(x).toString(16).padStart(2, '0')
    ).join('');
  }

  // ---- Event Listeners ----
  function init() {
    loadBooks();
    renderBookshelf();

    // Add book button
    document.getElementById('addBookBtn').addEventListener('click', openAddModal);

    // Modal close
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('cancelBtn').addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', e => {
      if (e.target === modalOverlay) closeModal();
    });

    // Detail close
    document.getElementById('detailClose').addEventListener('click', closeDetail);
    detailOverlay.addEventListener('click', e => {
      if (e.target === detailOverlay) closeDetail();
    });

    // Form submit
    bookForm.addEventListener('submit', handleFormSubmit);

    // Star rating
    starRatingEl.addEventListener('click', e => {
      const star = e.target.closest('.star');
      if (!star) return;
      selectedRating = parseInt(star.dataset.value);
      updateStarDisplay();
    });

    // Color picker
    colorPickerEl.addEventListener('click', e => {
      const swatch = e.target.closest('.color-swatch');
      if (!swatch) return;
      selectedColor = rgbToHex(swatch.style.backgroundColor);
      updateColorDisplay();
    });

    // Filter buttons
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeFilter = btn.dataset.filter;
        renderBookshelf();
      });
    });

    // Edit book from detail
    document.getElementById('editBookBtn').addEventListener('click', () => {
      if (!currentDetailBook) return;
      closeDetail();
      setTimeout(() => openEditModal(currentDetailBook), 300);
    });

    // Delete book from detail
    document.getElementById('deleteBookBtn').addEventListener('click', () => {
      if (!currentDetailBook) return;
      books = books.filter(b => b.id !== currentDetailBook.id);
      saveBooks();
      closeDetail();
      renderBookshelf();
    });

    // Keyboard: Escape to close modals
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (modalOverlay.classList.contains('active')) closeModal();
        if (detailOverlay.classList.contains('active')) closeDetail();
      }
    });
  }

  init();
})();
