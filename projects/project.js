class ProjectCard extends HTMLElement{
  constructor(project) {
    super();
    this.classList.add('project-card');
    this.project = project;
  }

  connectedCallback(){
    if (this._rendered) return;
    this._rendered = true;

    const { slug, title, summary, tags = [] } = this.project;
    const tagHtml = tags.map(tag => `<span class="tag">${tag}</span>`).join('');

    this.innerHTML = `
      <div class="preview">
        <span class="preview-label">${title}</span>
      </div>
      <div class="content">
        <h3 class="title">${title}</h3>
        <p class="summary">${summary}</p>
        <div class="tags">${tagHtml}</div>
      </div>
    `;

    this.addEventListener('click', () => {
      window.location.href = `./${slug}/`;
    });
  }
}
customElements.define('project-card', ProjectCard);

async function loadProjects(){
  const response = await fetch('./data/projects.json');
  if(!response.ok) throw new Error('Network response was not ok');

  const projects = await response.json();
  const projectSection = document.querySelector('.projects-section');

  for(const project of projects){
    projectSection.appendChild(new ProjectCard(project));
  }
}

loadProjects().catch((error) => console.error('Fetch error:', error));
