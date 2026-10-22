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
    .map((input) => input.value);
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

function filterBooks(books){
  const query = document.querySelector('.books-search').value.trim().toLowerCase();
  const fields = getSelectedFields();
  const bookSection = document.querySelector('.books-section');

  bookSection.replaceChildren();
  for(const book of books){
    if(bookMatches(book, query, fields)){
      bookSection.appendChild(new BookCard(book));
    }
  }
}

async function loadBooks(){
  const response = await fetch('./data/books.json');
  if(!response.ok) throw new Error('Network response was not ok');

  const books = await response.json();

  document.querySelector('.books-search').addEventListener('input', () => filterBooks(books));
  document.querySelector('.books-fields-list').addEventListener('change', () => filterBooks(books));

  filterBooks(books);
}

loadBooks().catch((error) => console.error('Fetch error:', error));
