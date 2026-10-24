class BookCard extends HTMLElement{
  constructor(book){
    super();
    this.classList.add('book-card');
    this.book = book;
  }

  connectedCallback(){
    if(this._rendered) return;
    this._rendered = true;

    const { title, author, rating, pageCount, review, cover } = this.book;
    const coverSrc = cover ? `./covers/${cover}` : '';
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

    this.innerHTML = `
      <div class="cover-wrapper">
        <div class="cover-inner">
          <div class="cover-face cover-front">
            <img class="cover" src="${coverSrc}" alt="${title} cover">
          </div>
          <div class="cover-face cover-back">
            <p class="review">${review}</p>
          </div>
        </div>
      </div>
      <div class="content">
        <h3 class="title">${title}</h3>
        <p class="author">by ${author}</p>
        <div class="meta">
          <div class="rating" aria-label="${rating} out of 5 stars">${stars}</div>
          <span class="page-count">${pageCount} pages</span>
        </div>
      </div>
    `;

    this.addEventListener('click', () => {
      this.classList.toggle('flipped');
    });
  }
}
customElements.define('book-card', BookCard);

function getSelectedFields(){
  return [...document.querySelectorAll('input[name="field"]:checked')]
    .map(input => input.value);
}

function bookMatches(book, query, fields){
  if(!query) return true;
  if(fields.length === 0) return false;

  return fields.some((field) => {
    const value = book[field];
    if(value == null) return false;
    return String(value).toLowerCase().includes(query);
  });
}

function sortBooks(books, sortField, sortOrder = 'asc'){
  return [...books].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    let comparison = 0;
    if (typeof valA === 'string') {
      valA = valA ? valA.toLowerCase() : '';
      valB = valB ? valB.toLowerCase() : '';
      comparison = valA.localeCompare(valB);
    } else {
      comparison = (valA ?? 0) - (valB ?? 0);
    }

    return sortOrder === 'desc' ? -comparison : comparison;
  });
}

function filterBooks(books){
  const query = document.querySelector('.books-search').value.trim().toLowerCase();
  const fields = getSelectedFields();
  const sortField = document.querySelector('input[name="sort"]:checked').value;
  const sortOrder = document.querySelector('input[name="order"]:checked').value;
  const bookSection = document.querySelector('.books-section');

  const matchedBooks = books.filter((book) => bookMatches(book, query, fields));
  const sortedBooks = sortBooks(matchedBooks, sortField, sortOrder);

  bookSection.replaceChildren();
  for(const book of sortedBooks){
    bookSection.appendChild(new BookCard(book));
  }
}

function setupDropdownCloseHandler(){
  document.addEventListener('click', event => {
    const dropdowns = document.querySelectorAll('.books-fields, .books-sort, .books-order');
    dropdowns.forEach(dropdown => {
      if (dropdown.hasAttribute('open') && !dropdown.contains(event.target)) {
        dropdown.removeAttribute('open');
      }
    });
  });
}

async function loadBooks(){
  setupDropdownCloseHandler();

  const response = await fetch('./data/books.json');
  if(!response.ok) throw new Error('Network response was not ok');

  const books = await response.json();

  document.querySelector('.books-search').addEventListener('input', () => filterBooks(books));
  document.querySelector('.books-fields-list').addEventListener('change', () => filterBooks(books));
  document.querySelector('.books-sort-list').addEventListener('change', () => filterBooks(books));
  document.querySelector('.books-order-list').addEventListener('change', () => filterBooks(books));

  filterBooks(books);
}

loadBooks().catch((error) => console.error('Fetch error:', error));
