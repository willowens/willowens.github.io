

export default class Book extends HTMLElement {
  constructor() {
    super();

    this.classList.add('book-item');
    this.innerHTML = `
      <div>
      book here
      hello
      </div>
      `;
  }

}
customElements.define('book-item', Book)
