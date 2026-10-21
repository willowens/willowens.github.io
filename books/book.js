class BookCard extends HTMLElement {
  constructor(book) {
    super();
    this.classList.add('book-card');
    this.book = book;
  }

  connectedCallback() {
    if (this._rendered) return;
    this._rendered = true;

    const { title, author, rating, review, cover } = this.book;
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
        <div class="rating" aria-label="${rating} out of 5 stars">${stars}</div>
      </div>
    `;

    this.addEventListener('click', () => {
      this.classList.toggle('flipped');
    });
  }
}

customElements.define('book-card', BookCard);

async function loadBooks() {
  const response = await fetch('./data/books.json');
  if (!response.ok) throw new Error('Network response was not ok');

  const books = await response.json();
  const bookSection = document.querySelector('.books-section');

  for (const book of books) {
    bookSection.appendChild(new BookCard(book));
  }
}

loadBooks().catch((error) => console.error('Fetch error:', error));
