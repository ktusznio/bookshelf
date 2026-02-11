/* ============================================
   Visual Bookshelf App — JavaScript
   ============================================ */

(function () {
  'use strict';

  // ---- Constants ----
  const STORAGE_KEY = 'bookshelf-books';
  const SHELVES_STORAGE_KEY = 'bookshelf-shelves';
  const TABS_STORAGE_KEY = 'bookshelf-tabs';
  const DRAG_THRESHOLD = 8;

  const BOOK_COLORS = [
    '#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400',
    '#2c3e50', '#16a085', '#7f1d1d', '#1e3a5f', '#4a235a',
  ];

  const STATUS_LABELS = {
    'reading': 'Currently Reading',
    'read': 'Read',
    'want-to-read': 'Want to Read',
  };

  // ---- Default sample data ----
  const DEFAULT_TABS = [
    { id: 'tab-1', name: 'My Library' },
  ];

  const DEFAULT_SHELVES = [
    { id: 'shelf-1', name: 'Favorites', tabId: 'tab-1' },
    { id: 'shelf-2', name: 'Up Next', tabId: 'tab-1' },
  ];

  const DEFAULT_BOOKS = [
    { id: '1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', status: 'read', rating: 4, color: '#2c3e50', shelfId: 'shelf-1' },
    { id: '2', title: 'To Kill a Mockingbird', author: 'Harper Lee', status: 'read', rating: 5, color: '#27ae60', shelfId: 'shelf-1' },
    { id: '3', title: '1984', author: 'George Orwell', status: 'read', rating: 5, color: '#c0392b', shelfId: 'shelf-1' },
    { id: '4', title: 'Dune', author: 'Frank Herbert', status: 'reading', rating: 4, color: '#d35400', shelfId: 'shelf-1' },
    { id: '5', title: 'Project Hail Mary', author: 'Andy Weir', status: 'reading', rating: 5, color: '#2980b9', shelfId: 'shelf-1' },
    { id: '6', title: 'Sapiens', author: 'Yuval Noah Harari', status: 'read', rating: 4, color: '#8e44ad', shelfId: 'shelf-1' },
    { id: '7', title: 'The Hobbit', author: 'J.R.R. Tolkien', status: 'read', rating: 5, color: '#1e3a5f', shelfId: 'shelf-1' },
    { id: '8', title: 'Educated', author: 'Tara Westover', status: 'want-to-read', rating: 0, color: '#16a085', shelfId: 'shelf-2' },
    { id: '9', title: 'The Midnight Library', author: 'Matt Haig', status: 'want-to-read', rating: 0, color: '#4a235a', shelfId: 'shelf-2' },
    { id: '10', title: 'Atomic Habits', author: 'James Clear', status: 'read', rating: 4, color: '#7f1d1d', shelfId: 'shelf-1' },
    { id: '11', title: 'Piranesi', author: 'Susanna Clarke', status: 'reading', rating: 4, color: '#2980b9', shelfId: 'shelf-1' },
    { id: '12', title: 'Klara and the Sun', author: 'Kazuo Ishiguro', status: 'want-to-read', rating: 0, color: '#27ae60', shelfId: 'shelf-2' },
    { id: '13', title: 'The Name of the Wind', author: 'Patrick Rothfuss', status: 'read', rating: 5, color: '#c0392b', shelfId: 'shelf-1' },
    { id: '14', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', status: 'want-to-read', rating: 0, color: '#2c3e50', shelfId: 'shelf-2' },
    { id: '15', title: 'The Alchemist', author: 'Paulo Coelho', status: 'read', rating: 3, color: '#d35400', shelfId: 'shelf-1' },
  ];

  // ---- State ----
  let books = [];
  let shelves = [];
  let tabs = [];
  let activeTabId = null;
  let activeFilter = 'all';
  let selectedRating = 0;
  let selectedColor = BOOK_COLORS[0];
  let currentDetailBook = null;
  let dragState = null;
  let tabDragState = null;

  // ---- DOM References ----
  const tabBarEl = document.getElementById('tabBar');
  const bookshelfEl = document.getElementById('bookshelf');
  const modalOverlay = document.getElementById('modalOverlay');
  const detailOverlay = document.getElementById('detailOverlay');
  const bookForm = document.getElementById('bookForm');
  const bookIdInput = document.getElementById('bookId');
  const bookTitleInput = document.getElementById('bookTitleInput');
  const bookAuthorInput = document.getElementById('bookAuthor');
  const bookStatusInput = document.getElementById('bookStatus');
  const bookShelfInput = document.getElementById('bookShelf');
  const bookRatingInput = document.getElementById('bookRating');
  const starRatingEl = document.getElementById('starRating');
  const colorPickerEl = document.getElementById('colorPicker');
  const modalTitleEl = document.getElementById('modalTitle');

  // ---- Persistence ----
  function loadData() {
    try {
      const storedTabs = localStorage.getItem(TABS_STORAGE_KEY);
      const storedShelves = localStorage.getItem(SHELVES_STORAGE_KEY);
      const storedBooks = localStorage.getItem(STORAGE_KEY);

      if (storedTabs) {
        tabs = JSON.parse(storedTabs);
      }

      if (storedShelves) {
        shelves = JSON.parse(storedShelves);
      }

      if (storedBooks) {
        books = JSON.parse(storedBooks);
      }

      // Fresh start — no data at all
      if (!storedShelves && !storedBooks) {
        tabs = DEFAULT_TABS.map(t => ({ ...t }));
        shelves = DEFAULT_SHELVES.map(s => ({ ...s }));
        books = DEFAULT_BOOKS.map(b => ({ ...b }));
        activeTabId = tabs[0].id;
        saveData();
        return;
      }

      // Migration: books exist but no shelves (upgrading from v1)
      if (!storedShelves && books.length > 0) {
        shelves = [{ id: 'shelf-1', name: 'My Books', tabId: 'tab-1' }];
        books.forEach(b => { if (!b.shelfId) b.shelfId = 'shelf-1'; });
      }

      // Migration: shelves exist but no tabs (upgrading from v2)
      if (!storedTabs || tabs.length === 0) {
        const defaultTab = { id: 'tab-1', name: 'My Library' };
        tabs = [defaultTab];
        shelves.forEach(s => { if (!s.tabId) s.tabId = defaultTab.id; });
      }

      // Ensure at least one tab
      if (tabs.length === 0) {
        tabs = [{ id: generateId(), name: 'My Library' }];
      }

      // Ensure at least one shelf
      if (shelves.length === 0) {
        shelves = [{ id: generateId(), name: 'My Books', tabId: tabs[0].id }];
      }

      // Fix orphaned shelves (no valid tabId)
      const tabIds = new Set(tabs.map(t => t.id));
      const fallbackTabId = tabs[0].id;
      shelves.forEach(s => {
        if (!s.tabId || !tabIds.has(s.tabId)) s.tabId = fallbackTabId;
      });

      // Fix orphaned books
      const shelfIds = new Set(shelves.map(s => s.id));
      const fallbackShelfId = shelves[0].id;
      books.forEach(b => {
        if (!b.shelfId || !shelfIds.has(b.shelfId)) b.shelfId = fallbackShelfId;
      });

      activeTabId = tabs[0].id;
      saveData();
    } catch {
      tabs = DEFAULT_TABS.map(t => ({ ...t }));
      shelves = DEFAULT_SHELVES.map(s => ({ ...s }));
      books = DEFAULT_BOOKS.map(b => ({ ...b }));
      activeTabId = tabs[0].id;
    }
  }

  function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    localStorage.setItem(SHELVES_STORAGE_KEY, JSON.stringify(shelves));
    localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
  }

  // ---- Helpers ----
  function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function getBookDimensions(title) {
    const len = title.length;
    const width = Math.max(32, Math.min(52, 28 + len * 0.8));
    const height = Math.max(210, Math.min(278, 218 + (len % 7) * 9));
    return { width, height };
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getBooksForShelf(shelfId) {
    let result = books.filter(b => b.shelfId === shelfId);
    if (activeFilter !== 'all') {
      result = result.filter(b => b.status === activeFilter);
    }
    return result;
  }

  // ---- Tab Management ----
  function addTab() {
    const tab = { id: generateId(), name: 'New Tab' };
    tabs.push(tab);
    // Create a default shelf in the new tab
    const shelf = { id: generateId(), name: 'My Books', tabId: tab.id };
    shelves.push(shelf);
    activeTabId = tab.id;
    saveData();
    renderTabs();
    renderBookshelf();
    // Auto-focus the tab name for editing
    const tabEl = tabBarEl.querySelector('.tab[data-tab-id="' + tab.id + '"]');
    if (tabEl) {
      const nameEl = tabEl.querySelector('.tab-name');
      if (nameEl) startEditingTabName(nameEl, tab.id);
    }
  }

  function renameTab(tabId, newName) {
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      tab.name = newName.trim() || 'Unnamed Tab';
      saveData();
    }
  }

  function deleteTab(tabId) {
    if (tabs.length <= 1) return;
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;
    const shelfCount = shelves.filter(s => s.tabId === tabId).length;
    const bookCount = books.filter(b => {
      const s = shelves.find(s => s.id === b.shelfId);
      return s && s.tabId === tabId;
    }).length;
    let msg = 'Delete tab "' + tab.name + '"?';
    if (shelfCount > 0 || bookCount > 0) {
      msg += '\n\nIts ' + shelfCount + ' shelf' + (shelfCount === 1 ? '' : 'es') +
        ' and ' + bookCount + ' book' + (bookCount === 1 ? '' : 's') +
        ' will be moved to another tab.';
    }
    if (!confirm(msg)) return;
    const idx = tabs.indexOf(tab);
    // Move shelves (and their books) to the first remaining tab
    const targetTabId = tabs[idx === 0 ? 1 : 0].id;
    shelves.forEach(s => { if (s.tabId === tabId) s.tabId = targetTabId; });
    tabs.splice(idx, 1);
    if (activeTabId === tabId) activeTabId = tabs[0].id;
    saveData();
    renderTabs();
    renderBookshelf();
  }

  function startEditingTabName(nameEl, tabId) {
    const tab = tabs.find(t => t.id === tabId);
    if (!tab) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'tab-name-input';
    input.value = tab.name;

    const finishEdit = () => {
      renameTab(tabId, input.value);
      nameEl.textContent = tab.name;
      nameEl.style.display = '';
      input.remove();
    };

    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = tab.name; input.blur(); }
    });
    input.addEventListener('keyup', e => e.stopPropagation());
    // Prevent click from bubbling to tab button (which would switch tabs)
    input.addEventListener('pointerdown', e => e.stopPropagation());
    input.addEventListener('click', e => e.stopPropagation());

    nameEl.style.display = 'none';
    nameEl.parentNode.insertBefore(input, nameEl.nextSibling);
    input.focus();
    input.select();
  }

  function switchTab(tabId) {
    activeTabId = tabId;
    renderTabs();
    renderBookshelf();
  }

  function setupTabDrag(tabEl, tabId) {
    tabEl.addEventListener('pointerdown', onPointerDown);

    function onPointerDown(e) {
      // Ignore if clicking the close button or editing name
      if (e.target.closest('.tab-close') || e.target.closest('.tab-name-input')) return;
      if (e.button !== 0) return;
      e.preventDefault();
      tabEl.setPointerCapture(e.pointerId);

      tabDragState = {
        tabId,
        tabEl,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        isDragging: false,
        ghostEl: null,
        dropIndicator: null,
      };

      tabEl.addEventListener('pointermove', onPointerMove);
      tabEl.addEventListener('pointerup', onPointerUp);
      tabEl.addEventListener('pointercancel', onPointerCancel);
    }

    function onPointerMove(e) {
      if (!tabDragState) return;

      const dx = e.clientX - tabDragState.startX;
      const dy = e.clientY - tabDragState.startY;

      if (!tabDragState.isDragging) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
        tabDragState.isDragging = true;
        tabDragState.tabEl.classList.add('tab-dragging');

        // Create ghost
        const ghost = document.createElement('div');
        ghost.className = 'tab-drag-ghost';
        ghost.textContent = tabs.find(t => t.id === tabId)?.name || '';
        document.body.appendChild(ghost);
        tabDragState.ghostEl = ghost;

        // Create drop indicator
        tabDragState.dropIndicator = document.createElement('div');
        tabDragState.dropIndicator.className = 'tab-drop-indicator';
      }

      // Move ghost
      tabDragState.ghostEl.style.left = (e.clientX + 10) + 'px';
      tabDragState.ghostEl.style.top = (e.clientY - 16) + 'px';

      // Position drop indicator among tabs
      if (tabDragState.dropIndicator.parentNode) tabDragState.dropIndicator.remove();

      const el = document.elementFromPoint(e.clientX, e.clientY);
      const overTab = el ? el.closest('.tab') : null;
      const overBar = el ? el.closest('.tab-bar') : null;

      if (overBar) {
        const tabEls = Array.from(tabBarEl.querySelectorAll('.tab:not(.tab-dragging)'));
        let inserted = false;
        for (const other of tabEls) {
          const rect = other.getBoundingClientRect();
          if (e.clientX < rect.left + rect.width / 2) {
            tabBarEl.insertBefore(tabDragState.dropIndicator, other);
            inserted = true;
            break;
          }
        }
        if (!inserted && tabEls.length > 0) {
          // After the last tab but before the add button
          const addBtn = tabBarEl.querySelector('.add-tab-btn');
          tabBarEl.insertBefore(tabDragState.dropIndicator, addBtn);
        }
      }
    }

    function onPointerUp(e) {
      if (!tabDragState) return;
      cleanup();

      if (tabDragState.isDragging) {
        // Find the target position
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const overBar = el ? el.closest('.tab-bar') : null;

        if (overBar) {
          const tabEls = Array.from(tabBarEl.querySelectorAll('.tab:not(.tab-dragging)'));
          let targetIndex = tabs.length; // default: end
          for (let i = 0; i < tabEls.length; i++) {
            const rect = tabEls[i].getBoundingClientRect();
            if (e.clientX < rect.left + rect.width / 2) {
              // Find this tab's index in the tabs array
              const targetTabId = tabEls[i].dataset.tabId;
              targetIndex = tabs.findIndex(t => t.id === targetTabId);
              break;
            }
          }

          // Move the tab in the array
          const currentIndex = tabs.findIndex(t => t.id === tabDragState.tabId);
          if (currentIndex !== -1 && currentIndex !== targetIndex) {
            const [tab] = tabs.splice(currentIndex, 1);
            // Adjust target if it was after the removed item
            const adjustedIndex = targetIndex > currentIndex ? targetIndex - 1 : targetIndex;
            tabs.splice(adjustedIndex, 0, tab);
            saveData();
          }
        }

        tabDragState.ghostEl.remove();
        if (tabDragState.dropIndicator.parentNode) tabDragState.dropIndicator.remove();
        tabDragState.tabEl.classList.remove('tab-dragging');
        tabDragState = null;
        renderTabs();
      } else {
        // It was a click — switch tab
        const id = tabDragState.tabId;
        tabDragState = null;
        switchTab(id);
      }
    }

    function onPointerCancel() {
      if (!tabDragState) return;
      if (tabDragState.isDragging) {
        tabDragState.ghostEl.remove();
        if (tabDragState.dropIndicator.parentNode) tabDragState.dropIndicator.remove();
        tabDragState.tabEl.classList.remove('tab-dragging');
      }
      cleanup();
      tabDragState = null;
    }

    function cleanup() {
      tabEl.removeEventListener('pointermove', onPointerMove);
      tabEl.removeEventListener('pointerup', onPointerUp);
      tabEl.removeEventListener('pointercancel', onPointerCancel);
    }
  }

  function renderTabs() {
    tabBarEl.innerHTML = '';
    tabs.forEach(tab => {
      const tabEl = document.createElement('button');
      tabEl.className = 'tab' + (tab.id === activeTabId ? ' active' : '');
      tabEl.dataset.tabId = tab.id;

      const nameEl = document.createElement('span');
      nameEl.className = 'tab-name';
      nameEl.textContent = tab.name;

      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = 'Delete tab';
      if (tabs.length <= 1) closeBtn.style.display = 'none';

      closeBtn.addEventListener('click', e => {
        e.stopPropagation();
        deleteTab(tab.id);
      });

      tabEl.addEventListener('dblclick', e => {
        e.preventDefault();
        startEditingTabName(nameEl, tab.id);
      });

      tabEl.appendChild(nameEl);
      tabEl.appendChild(closeBtn);
      tabBarEl.appendChild(tabEl);
      setupTabDrag(tabEl, tab.id);
    });

    // Add tab button
    const addBtn = document.createElement('button');
    addBtn.className = 'add-tab-btn';
    addBtn.textContent = '+';
    addBtn.title = 'Add tab';
    addBtn.addEventListener('click', addTab);
    tabBarEl.appendChild(addBtn);
  }

  // ---- Shelf Management ----
  function addShelf() {
    const shelf = { id: generateId(), name: 'New Shelf', tabId: activeTabId };
    shelves.push(shelf);
    saveData();
    renderBookshelf();
    // Auto-focus the name for editing
    const shelfEl = bookshelfEl.querySelector('.shelf[data-shelf-id="' + shelf.id + '"]');
    if (shelfEl) {
      const nameEl = shelfEl.querySelector('.shelf-name');
      if (nameEl) startEditingShelfName(nameEl, shelf.id);
    }
  }

  function renameShelf(shelfId, newName) {
    const shelf = shelves.find(s => s.id === shelfId);
    if (shelf) {
      shelf.name = newName.trim() || 'Unnamed Shelf';
      saveData();
    }
  }

  function deleteShelf(shelfId) {
    const tabShelves = shelves.filter(s => s.tabId === activeTabId);
    if (tabShelves.length <= 1) return;
    const shelf = shelves.find(s => s.id === shelfId);
    if (!shelf) return;
    const bookCount = books.filter(b => b.shelfId === shelfId).length;
    let msg = 'Delete shelf "' + shelf.name + '"?';
    if (bookCount > 0) {
      msg += '\n\nIts ' + bookCount + ' book' + (bookCount === 1 ? '' : 's') +
        ' will be moved to another shelf.';
    }
    if (!confirm(msg)) return;
    const idx = shelves.indexOf(shelf);
    // Move books to another shelf in the same tab
    const otherShelf = tabShelves.find(s => s.id !== shelfId);
    if (otherShelf) {
      books.forEach(b => { if (b.shelfId === shelfId) b.shelfId = otherShelf.id; });
    }
    shelves.splice(idx, 1);
    saveData();
    renderBookshelf();
  }

  function startEditingShelfName(nameEl, shelfId) {
    const shelf = shelves.find(s => s.id === shelfId);
    if (!shelf) return;

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'shelf-name-input';
    input.value = shelf.name;

    const finishEdit = () => {
      renameShelf(shelfId, input.value);
      nameEl.textContent = shelf.name;
      nameEl.style.display = '';
      input.remove();
    };

    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') input.blur();
      if (e.key === 'Escape') { input.value = shelf.name; input.blur(); }
    });

    nameEl.style.display = 'none';
    nameEl.parentNode.insertBefore(input, nameEl.nextSibling);
    input.focus();
    input.select();
  }

  // ---- Book Movement ----
  function moveBook(bookId, targetShelfId, insertBeforeBookId) {
    const bookIdx = books.findIndex(b => b.id === bookId);
    if (bookIdx === -1) return;

    const book = books.splice(bookIdx, 1)[0];
    book.shelfId = targetShelfId;

    if (insertBeforeBookId) {
      const targetIdx = books.findIndex(b => b.id === insertBeforeBookId);
      if (targetIdx !== -1) {
        books.splice(targetIdx, 0, book);
      } else {
        books.push(book);
      }
    } else {
      // Insert at end of target shelf
      let lastIdx = -1;
      for (let i = 0; i < books.length; i++) {
        if (books[i].shelfId === targetShelfId) lastIdx = i;
      }
      books.splice(lastIdx + 1, 0, book);
    }

    saveData();
  }

  // ---- Rendering ----
  function populateShelfSelector(selectedShelfId) {
    bookShelfInput.innerHTML = '';
    // Show shelves grouped by tab
    tabs.forEach(tab => {
      const tabShelves = shelves.filter(s => s.tabId === tab.id);
      if (tabShelves.length === 0) return;
      const group = document.createElement('optgroup');
      group.label = tab.name;
      tabShelves.forEach(shelf => {
        const option = document.createElement('option');
        option.value = shelf.id;
        option.textContent = shelf.name;
        if (shelf.id === selectedShelfId) option.selected = true;
        group.appendChild(option);
      });
      bookShelfInput.appendChild(group);
    });
  }

  function renderStats() {
    // Scope stats to the active tab's shelves
    const tabShelfIds = new Set(shelves.filter(s => s.tabId === activeTabId).map(s => s.id));
    const tabBooks = books.filter(b => tabShelfIds.has(b.shelfId));

    const counts = {
      'all': tabBooks.length,
      'reading': tabBooks.filter(b => b.status === 'reading').length,
      'read': tabBooks.filter(b => b.status === 'read').length,
      'want-to-read': tabBooks.filter(b => b.status === 'want-to-read').length,
    };

    const existing = document.querySelector('.stats-bar');
    if (existing) existing.remove();
    if (tabBooks.length === 0) return;

    const statsEl = document.createElement('div');
    statsEl.className = 'stats-bar';

    const filters = [
      { key: 'all', label: 'All' },
      { key: 'reading', label: 'Reading' },
      { key: 'read', label: 'Read' },
      { key: 'want-to-read', label: 'Want to Read' },
    ];

    filters.forEach(f => {
      const btn = document.createElement('button');
      btn.className = 'stat' + (activeFilter === f.key ? ' active' : '');
      btn.dataset.filter = f.key;

      if (f.key !== 'all') {
        const dot = document.createElement('span');
        dot.className = 'stat-dot ' + f.key;
        btn.appendChild(dot);
      }

      const label = document.createElement('span');
      label.textContent = f.label;
      btn.appendChild(label);

      const count = document.createElement('span');
      count.className = 'stat-count';
      count.textContent = counts[f.key];
      btn.appendChild(count);

      btn.addEventListener('click', () => {
        activeFilter = f.key;
        renderStats();
        renderBookshelf();
      });

      statsEl.appendChild(btn);
    });

    const main = document.querySelector('main');
    main.insertBefore(statsEl, bookshelfEl);
  }

  function renderBookshelf() {
    bookshelfEl.innerHTML = '';
    let anyVisible = false;

    // Only show shelves belonging to the active tab
    const tabShelves = shelves.filter(s => s.tabId === activeTabId);

    tabShelves.forEach(shelf => {
      const shelfBooks = getBooksForShelf(shelf.id);

      // In filter mode, hide shelves with no matching books
      if (activeFilter !== 'all' && shelfBooks.length === 0) return;
      anyVisible = anyVisible || shelfBooks.length > 0;

      const shelfEl = document.createElement('div');
      shelfEl.className = 'shelf';
      shelfEl.dataset.shelfId = shelf.id;

      // -- Shelf header --
      const headerEl = document.createElement('div');
      headerEl.className = 'shelf-header';

      const nameEl = document.createElement('span');
      nameEl.className = 'shelf-name';
      nameEl.textContent = shelf.name;

      const countEl = document.createElement('span');
      countEl.className = 'shelf-book-count';
      const totalOnShelf = books.filter(b => b.shelfId === shelf.id).length;
      countEl.textContent = '(' + totalOnShelf + ')';

      const editBtn = document.createElement('button');
      editBtn.className = 'shelf-header-btn edit';
      editBtn.innerHTML = '&#9998;';
      editBtn.title = 'Rename shelf';
      editBtn.addEventListener('click', () => startEditingShelfName(nameEl, shelf.id));

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'shelf-header-btn delete';
      deleteBtn.innerHTML = '&times;';
      deleteBtn.title = 'Delete shelf';
      if (tabShelves.length <= 1) deleteBtn.style.display = 'none';
      deleteBtn.addEventListener('click', () => deleteShelf(shelf.id));

      headerEl.appendChild(nameEl);
      headerEl.appendChild(countEl);
      headerEl.appendChild(editBtn);
      headerEl.appendChild(deleteBtn);

      // -- Books row --
      const booksRow = document.createElement('div');
      booksRow.className = 'shelf-books';
      booksRow.dataset.shelfId = shelf.id;

      if (shelfBooks.length === 0) {
        booksRow.classList.add('empty');
        const hint = document.createElement('span');
        hint.className = 'shelf-empty-hint';
        hint.textContent = 'Drag books here';
        booksRow.appendChild(hint);
      } else {
        shelfBooks.forEach(book => {
          booksRow.appendChild(createBookElement(book));
        });
      }

      // -- Plank and brackets --
      const plank = document.createElement('div');
      plank.className = 'shelf-plank';
      const bracketLeft = document.createElement('div');
      bracketLeft.className = 'shelf-bracket-left';
      const bracketRight = document.createElement('div');
      bracketRight.className = 'shelf-bracket-right';

      shelfEl.appendChild(headerEl);
      shelfEl.appendChild(booksRow);
      shelfEl.appendChild(plank);
      shelfEl.appendChild(bracketLeft);
      shelfEl.appendChild(bracketRight);
      bookshelfEl.appendChild(shelfEl);
    });

    // Empty state for filtered view
    if (!anyVisible && activeFilter !== 'all') {
      bookshelfEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <h2>No books in this category</h2>
          <p>Try adding some books or changing filters.</p>
        </div>
      `;
    } else if (books.length === 0) {
      bookshelfEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📚</div>
          <h2>Your bookshelf is empty</h2>
          <p>Add your first book to get started!</p>
        </div>
      `;
    }

    // Add shelf button
    const addRow = document.createElement('div');
    addRow.className = 'add-shelf-row';
    const addBtn = document.createElement('button');
    addBtn.className = 'add-shelf-btn';
    addBtn.textContent = '+ Add Shelf';
    addBtn.addEventListener('click', addShelf);
    addRow.appendChild(addBtn);
    bookshelfEl.appendChild(addRow);

    renderStats();
  }

  function createBookElement(book) {
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

    setupBookDrag(bookEl, book.id);
    return bookEl;
  }

  // ---- Drag and Drop (Pointer Events) ----
  function setupBookDrag(bookEl, bookId) {
    bookEl.addEventListener('pointerdown', onPointerDown);

    function onPointerDown(e) {
      if (e.button !== 0) return;
      e.preventDefault();
      bookEl.setPointerCapture(e.pointerId);

      dragState = {
        bookId,
        bookEl,
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        isDragging: false,
        ghostEl: null,
        dropIndicator: null,
      };

      bookEl.addEventListener('pointermove', onPointerMove);
      bookEl.addEventListener('pointerup', onPointerUp);
      bookEl.addEventListener('pointercancel', onPointerCancel);
    }

    function onPointerMove(e) {
      if (!dragState) return;

      const dx = e.clientX - dragState.startX;
      const dy = e.clientY - dragState.startY;

      if (!dragState.isDragging) {
        if (Math.sqrt(dx * dx + dy * dy) < DRAG_THRESHOLD) return;
        // Begin drag
        dragState.isDragging = true;
        dragState.bookEl.classList.add('dragging');

        // Create ghost
        const ghost = dragState.bookEl.cloneNode(true);
        ghost.className = 'drag-ghost';
        ghost.style.width = dragState.bookEl.offsetWidth + 'px';
        ghost.style.height = dragState.bookEl.offsetHeight + 'px';
        document.body.appendChild(ghost);
        dragState.ghostEl = ghost;

        // Create drop indicator
        dragState.dropIndicator = document.createElement('div');
        dragState.dropIndicator.className = 'drop-indicator';
      }

      // Move ghost
      dragState.ghostEl.style.left = (e.clientX - dragState.bookEl.offsetWidth / 2) + 'px';
      dragState.ghostEl.style.top = (e.clientY - dragState.bookEl.offsetHeight / 2) + 'px';

      // Find target shelf under pointer
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const targetShelf = el ? el.closest('.shelf') : null;

      // Update drop-target class
      document.querySelectorAll('.shelf.drop-target').forEach(s => s.classList.remove('drop-target'));
      if (targetShelf) targetShelf.classList.add('drop-target');

      // Position drop indicator
      if (dragState.dropIndicator.parentNode) dragState.dropIndicator.remove();

      if (targetShelf) {
        const booksRow = targetShelf.querySelector('.shelf-books');
        const bookEls = Array.from(booksRow.querySelectorAll('.book:not(.dragging)'));
        let inserted = false;
        for (const other of bookEls) {
          const rect = other.getBoundingClientRect();
          if (e.clientX < rect.left + rect.width / 2) {
            booksRow.insertBefore(dragState.dropIndicator, other);
            inserted = true;
            break;
          }
        }
        if (!inserted) {
          const hint = booksRow.querySelector('.shelf-empty-hint');
          if (hint) hint.style.display = 'none';
          booksRow.appendChild(dragState.dropIndicator);
        }
      }
    }

    function onPointerUp(e) {
      if (!dragState) return;
      cleanup(e);

      if (dragState.isDragging) {
        const el = document.elementFromPoint(e.clientX, e.clientY);
        const targetShelf = el ? el.closest('.shelf') : null;
        const targetShelfId = targetShelf ? targetShelf.dataset.shelfId : null;

        if (targetShelfId) {
          const booksRow = targetShelf.querySelector('.shelf-books');
          const bookEls = Array.from(booksRow.querySelectorAll('.book:not(.dragging)'));
          let insertBeforeId = null;
          for (const other of bookEls) {
            const rect = other.getBoundingClientRect();
            if (e.clientX < rect.left + rect.width / 2) {
              insertBeforeId = other.dataset.id;
              break;
            }
          }
          moveBook(dragState.bookId, targetShelfId, insertBeforeId);
        }

        dragState.ghostEl.remove();
        if (dragState.dropIndicator.parentNode) dragState.dropIndicator.remove();
        document.querySelectorAll('.shelf.drop-target').forEach(s => s.classList.remove('drop-target'));
        dragState.bookEl.classList.remove('dragging');
        dragState = null;
        renderBookshelf();
      } else {
        // It was a click — open detail
        const id = dragState.bookId;
        dragState = null;
        openDetail(id);
      }
    }

    function onPointerCancel() {
      if (!dragState) return;
      if (dragState.isDragging) {
        dragState.ghostEl.remove();
        if (dragState.dropIndicator.parentNode) dragState.dropIndicator.remove();
        document.querySelectorAll('.shelf.drop-target').forEach(s => s.classList.remove('drop-target'));
        dragState.bookEl.classList.remove('dragging');
      }
      cleanup();
      dragState = null;
    }

    function cleanup(e) {
      bookEl.removeEventListener('pointermove', onPointerMove);
      bookEl.removeEventListener('pointerup', onPointerUp);
      bookEl.removeEventListener('pointercancel', onPointerCancel);
    }
  }

  // ---- Modal: Add/Edit ----
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
    populateShelfSelector(book.shelfId);
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
    const shelfId = bookShelfInput.value;
    const rating = selectedRating;
    const color = selectedColor;

    if (!title || !author) return;

    if (id) {
      const idx = books.findIndex(b => b.id === id);
      if (idx !== -1) {
        const oldShelfId = books[idx].shelfId;
        books[idx] = { ...books[idx], title, author, status, rating, color, shelfId };
        // If shelf changed, move to end of new shelf
        if (shelfId !== oldShelfId) {
          moveBook(id, shelfId, null);
        }
      }
    } else {
      books.push({ id: generateId(), title, author, status, rating, color, shelfId });
    }

    saveData();
    renderBookshelf();
    closeModal();
  }

  // ---- Modal: Detail ----
  function openDetail(bookId) {
    const book = books.find(b => b.id === bookId);
    if (!book) return;
    currentDetailBook = book;

    document.getElementById('detailBookPreview').innerHTML = `
      <div class="book-cover" style="background: ${book.color};">
        <div class="cover-frame"></div>
        <div class="cover-inner">
          <div class="cover-rule"></div>
          <div class="cover-title">${escapeHtml(book.title)}</div>
          <div class="cover-rule"></div>
          <div class="cover-author">${escapeHtml(book.author)}</div>
          <div class="cover-ornament">&#10053;</div>
        </div>
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

  // ---- Goodreads CSV Import ----
  function parseCSV(text) {
    const rows = [];
    let i = 0;
    while (i < text.length) {
      const row = [];
      while (i < text.length) {
        let value = '';
        if (text[i] === '"') {
          // Quoted field
          i++;
          while (i < text.length) {
            if (text[i] === '"') {
              if (text[i + 1] === '"') {
                value += '"';
                i += 2;
              } else {
                i++; // closing quote
                break;
              }
            } else {
              value += text[i];
              i++;
            }
          }
        } else {
          // Unquoted field
          while (i < text.length && text[i] !== ',' && text[i] !== '\n' && text[i] !== '\r') {
            value += text[i];
            i++;
          }
        }
        row.push(value);
        if (i < text.length && text[i] === ',') {
          i++; // skip comma
        } else {
          break; // end of row
        }
      }
      // Skip line endings
      while (i < text.length && (text[i] === '\r' || text[i] === '\n')) i++;
      if (row.length > 1 || row[0] !== '') rows.push(row);
    }
    return rows;
  }

  function importGoodreadsCSV(text) {
    const rows = parseCSV(text);
    if (rows.length < 2) return 0;

    const header = rows[0].map(h => h.trim());
    const colIdx = (name) => header.indexOf(name);

    const titleCol = colIdx('Title');
    const authorCol = colIdx('Author');
    const ratingCol = colIdx('My Rating');
    const shelfCol = colIdx('Exclusive Shelf');

    if (titleCol === -1 || authorCol === -1) return 0;

    // Map Goodreads shelf names to our status values
    const statusMap = {
      'read': 'read',
      'currently-reading': 'reading',
      'to-read': 'want-to-read',
    };

    // Create a dedicated shelf for the import in the active tab
    const importShelf = { id: generateId(), name: 'Goodreads Import', tabId: activeTabId };
    shelves.push(importShelf);

    let count = 0;
    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      const title = (row[titleCol] || '').trim();
      const author = (row[authorCol] || '').trim();
      if (!title) continue;

      const rawRating = ratingCol !== -1 ? parseInt(row[ratingCol]) || 0 : 0;
      const rawShelf = shelfCol !== -1 ? (row[shelfCol] || '').trim() : '';
      const status = statusMap[rawShelf] || 'want-to-read';
      const color = BOOK_COLORS[count % BOOK_COLORS.length];

      books.push({
        id: generateId(),
        title,
        author,
        status,
        rating: rawRating,
        color,
        shelfId: importShelf.id,
      });
      count++;
    }

    if (count === 0) {
      // Remove the empty shelf if no books were imported
      shelves.pop();
    }

    saveData();
    return count;
  }

  function importGoodreadsJSON(text) {
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return 0;
    }
    if (!Array.isArray(data) || data.length === 0) return 0;

    const statusMap = {
      'read': 'read',
      'currently-reading': 'reading',
      'to-read': 'want-to-read',
    };

    const importShelf = { id: generateId(), name: 'Goodreads Import', tabId: activeTabId };
    shelves.push(importShelf);

    let count = 0;
    data.forEach(item => {
      const title = (item.title || '').trim();
      const author = (item.author || '').trim();
      if (!title) return;

      const rating = parseInt(item.rating) || 0;
      const rawShelf = (item.shelf || '').trim();
      const status = statusMap[rawShelf] || 'want-to-read';
      const color = BOOK_COLORS[count % BOOK_COLORS.length];

      books.push({
        id: generateId(),
        title,
        author,
        status,
        rating,
        color,
        shelfId: importShelf.id,
      });
      count++;
    });

    if (count === 0) {
      shelves.pop();
    }

    saveData();
    return count;
  }

  // ---- Book Search (Google Books API) ----
  const searchInput = document.getElementById('bookSearchInput');
  const searchDropdown = document.getElementById('bookSearchDropdown');
  let searchTimeout = null;
  let highlightedIndex = -1;
  let searchResults = [];

  function searchBooks(query) {
    if (!query || query.length < 2) {
      hideDropdown();
      return;
    }

    searchDropdown.innerHTML = '<div class="book-search-loading">Searching...</div>';
    searchDropdown.classList.add('visible');

    const url = 'https://www.googleapis.com/books/v1/volumes?q=' +
      encodeURIComponent(query) + '&maxResults=5&printType=books';

    fetch(url)
      .then(r => r.json())
      .then(data => {
        // Only update if input still matches (avoid stale results)
        if (searchInput.value.trim() !== query) return;

        searchResults = [];
        searchDropdown.innerHTML = '';

        if (data.items && data.items.length > 0) {
          data.items.forEach((item, i) => {
            const info = item.volumeInfo || {};
            const title = info.title || '';
            const author = (info.authors || []).join(', ');
            const thumb = info.imageLinks?.smallThumbnail || '';

            searchResults.push({ title, author, thumb });

            const el = document.createElement('div');
            el.className = 'book-search-item';
            el.dataset.index = i;

            if (thumb) {
              const img = document.createElement('img');
              img.className = 'book-search-thumb';
              img.src = thumb;
              img.alt = '';
              el.appendChild(img);
            } else {
              const placeholder = document.createElement('div');
              placeholder.className = 'book-search-thumb no-cover';
              placeholder.textContent = '?';
              el.appendChild(placeholder);
            }

            const infoDiv = document.createElement('div');
            infoDiv.className = 'book-search-info';
            infoDiv.innerHTML =
              '<div class="book-search-title">' + escapeHtml(title) + '</div>' +
              '<div class="book-search-author">' + escapeHtml(author) + '</div>';
            el.appendChild(infoDiv);

            el.addEventListener('click', () => selectSearchResult(i));
            searchDropdown.appendChild(el);
          });
        }

        // Always add "Add manually" option
        const manual = document.createElement('div');
        manual.className = 'book-search-manual';
        manual.textContent = '+ Add "' + query + '" manually';
        manual.addEventListener('click', () => {
          hideDropdown();
          openAddModalWithTitle(query);
        });
        searchDropdown.appendChild(manual);

        highlightedIndex = -1;
        searchDropdown.classList.add('visible');
      })
      .catch(() => {
        // On error, show manual option
        searchDropdown.innerHTML = '';
        const manual = document.createElement('div');
        manual.className = 'book-search-manual';
        manual.textContent = '+ Add "' + query + '" manually';
        manual.addEventListener('click', () => {
          hideDropdown();
          openAddModalWithTitle(query);
        });
        searchDropdown.appendChild(manual);
        searchDropdown.classList.add('visible');
      });
  }

  function selectSearchResult(index) {
    const result = searchResults[index];
    if (!result) return;
    hideDropdown();
    openAddModalWithTitle(result.title, result.author);
  }

  function openAddModalWithTitle(title, author) {
    searchInput.value = '';
    bookIdInput.value = '';
    bookForm.reset();
    modalTitleEl.textContent = 'Add a Book';
    bookTitleInput.value = title || '';
    bookAuthorInput.value = author || '';
    selectedRating = 0;
    selectedColor = BOOK_COLORS[Math.floor(Math.random() * BOOK_COLORS.length)];
    updateStarDisplay();
    updateColorDisplay();
    const activeTabShelves = shelves.filter(s => s.tabId === activeTabId);
    populateShelfSelector(activeTabShelves[0]?.id || shelves[0]?.id);
    modalOverlay.classList.add('active');
  }

  function hideDropdown() {
    searchDropdown.classList.remove('visible');
    searchDropdown.innerHTML = '';
    searchResults = [];
    highlightedIndex = -1;
  }

  function updateHighlight() {
    const items = searchDropdown.querySelectorAll('.book-search-item');
    items.forEach((el, i) => {
      el.classList.toggle('highlighted', i === highlightedIndex);
    });
  }

  // ---- Init ----
  function init() {
    loadData();
    renderTabs();
    renderBookshelf();

    // Book search input
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      const query = searchInput.value.trim();
      if (query.length < 2) { hideDropdown(); return; }
      searchTimeout = setTimeout(() => searchBooks(query), 300);
    });

    searchInput.addEventListener('keydown', e => {
      if (!searchDropdown.classList.contains('visible')) return;
      const items = searchDropdown.querySelectorAll('.book-search-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        highlightedIndex = Math.min(highlightedIndex + 1, items.length - 1);
        updateHighlight();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        highlightedIndex = Math.max(highlightedIndex - 1, -1);
        updateHighlight();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < items.length) {
          selectSearchResult(highlightedIndex);
        } else {
          // Enter with no selection — add manually with typed text
          const query = searchInput.value.trim();
          if (query) {
            hideDropdown();
            openAddModalWithTitle(query);
          }
        }
      } else if (e.key === 'Escape') {
        hideDropdown();
        searchInput.blur();
      }
    });

    // Close dropdown on outside click
    document.addEventListener('pointerdown', e => {
      if (!e.target.closest('#bookSearchWrap')) hideDropdown();
    });

    // Import Goodreads (CSV or JSON)
    const importBtn = document.getElementById('importBtn');
    const importFileInput = document.getElementById('importFileInput');
    importBtn.addEventListener('click', () => importFileInput.click());
    importFileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result;
        const isJSON = file.name.endsWith('.json') || text.trimStart().startsWith('[');
        const count = isJSON ? importGoodreadsJSON(text) : importGoodreadsCSV(text);
        if (count > 0) {
          renderBookshelf();
          alert('Imported ' + count + ' book' + (count === 1 ? '' : 's') + ' from Goodreads!');
        } else {
          alert('No books found. Accepts Goodreads CSV export or JSON from the scraper script.');
        }
        importFileInput.value = '';
      };
      reader.readAsText(file);
    });

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

    // Edit book from detail
    document.getElementById('editBookBtn').addEventListener('click', () => {
      if (!currentDetailBook) return;
      const book = currentDetailBook;
      closeDetail();
      setTimeout(() => openEditModal(book), 300);
    });

    // Delete book from detail
    document.getElementById('deleteBookBtn').addEventListener('click', () => {
      if (!currentDetailBook) return;
      if (!confirm('Delete "' + currentDetailBook.title + '"?')) return;
      books = books.filter(b => b.id !== currentDetailBook.id);
      saveData();
      closeDetail();
      renderBookshelf();
    });

    // Escape to close modals
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (modalOverlay.classList.contains('active')) closeModal();
        if (detailOverlay.classList.contains('active')) closeDetail();
      }
    });
  }

  init();
})();
