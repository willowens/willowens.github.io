class BookCard extends HTMLElement {
  constructor() {
    super();

    this.classList.add('book-card');
    this.isExpanded = false;
    const cover = this.getAttribute('cover') || '';
    const title = this.getAttribute('title') || 'Untitled';
    const author = this.getAttribute('author') || 'Unknown Author';
    const rating = Math.max(0, Math.min(5, parseInt(this.getAttribute('rating')) || 0));
    const description = this.getAttribute('description') || 'No description available.';
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);

    this.innerHTML = `
      <div class="card-container">
        <div class="cover-wrapper">
          <img class="cover" src="${cover}" alt="${title} cover">
        </div>
        <div class="content">
          <h3 class="title">${title}</h3>
          <p class="author">by ${author}</p>
          <div class="rating" aria-label="${rating} out of 5 stars">${stars}</div>
        </div>
        <div class="description-box">
          <p style="margin:0;">${description}</p>
        </div>
      </div>
    `;

    this.querySelector('.card-container').addEventListener('click', () => {
      this.isExpanded = !this.isExpanded;
      if (this.isExpanded) {
        this.setAttribute('expanded', '');
      } else {
        this.removeAttribute('expanded');
      }
    });
  }
}

customElements.define('book-card', BookCard);
