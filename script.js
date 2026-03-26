// Elements
const links = document.querySelectorAll('.sidebar a');
const content = document.getElementById('doc-content');
const searchBox = document.getElementById('searchBox');
const sidebar = document.getElementById('sidebar');
const hamburger = document.getElementById('hamburger');

let currentIndex = 0;
const allLinks = Array.from(links);

// ----------------------
// LOAD MARKDOWN FUNCTION
// ----------------------
async function loadPage(path, linkElement = null) {
  const fullPath = window.location.origin +
    window.location.pathname.replace(/\/$/, '') +
    '/' + path;

  try {
    const response = await fetch(fullPath);

    if (!response.ok) {
      content.innerHTML = `<p style="color:red;">⚠️ File not found:<br>${fullPath}</p>`;
      return;
    }

    const text = await response.text();
    content.innerHTML = marked.parse(text);

    // Update breadcrumb
    if (linkElement) {
      document.getElementById('breadcrumb').innerText = linkElement.textContent;
    }

    // Highlight active link
    links.forEach(l => l.classList.remove('active-link'));
    if (linkElement) linkElement.classList.add('active-link');

    // Generate TOC
    generateTOC();

  } catch (error) {
    content.innerHTML = `<p style="color:red;">⚠️ Error loading content</p>`;
  }
}

// ----------------------
// CLICK EVENTS
// ----------------------
links.forEach((link, index) => {
  link.addEventListener('click', (e) => {
    e.preventDefault();

    currentIndex = index;
    const path = link.getAttribute('href');

    loadPage(path, link);

    // Close sidebar on mobile
    if (window.innerWidth < 768) {
      sidebar.classList.remove('open');
    }
  });
});

// ----------------------
// SEARCH FUNCTION
// ----------------------
searchBox.addEventListener('keyup', () => {
  const filter = searchBox.value.toLowerCase();

  allLinks.forEach(link => {
    const text = link.textContent.toLowerCase();
    link.parentElement.style.display =
      text.includes(filter) ? '' : 'none';
  });
});

// ----------------------
// SIDEBAR TOGGLE
// ----------------------
hamburger.addEventListener('click', () => {
  sidebar.classList.toggle('open');
});

// ----------------------
// COLLAPSIBLE MENU
// ----------------------
document.querySelectorAll(".collapsible").forEach(c => {
  c.addEventListener("click", function() {
    this.classList.toggle("open");

    const nested = this.nextElementSibling;
    nested.style.display =
      nested.style.display === "block" ? "none" : "block";
  });
});

// Open first section by default
document.querySelectorAll('.nested')[0].style.display = 'block';
document.querySelectorAll('.collapsible')[0].classList.add('open');

// ----------------------
// NAVIGATION BUTTONS
// ----------------------
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const homeBtn = document.getElementById('homeBtn');

if (prevBtn && nextBtn && homeBtn) {

  prevBtn.onclick = () => {
    if (currentIndex > 0) {
      allLinks[currentIndex - 1].click();
    }
  };

  nextBtn.onclick = () => {
    if (currentIndex < allLinks.length - 1) {
      allLinks[currentIndex + 1].click();
    }
  };

  homeBtn.onclick = () => {
    allLinks[0].click();
  };
}

// ----------------------
// TOC (RIGHT PANEL)
// ----------------------
function generateTOC() {
  const toc = document.getElementById('toc');
  if (!toc) return;

  toc.innerHTML = '<strong>On this page</strong>';

  const headings = content.querySelectorAll('h2, h3');

  headings.forEach(h => {
    const id = h.innerText.replace(/\s+/g, '-').toLowerCase();
    h.id = id;

    const link = document.createElement('a');
    link.href = '#' + id;
    link.innerText = h.innerText;

    link.style.display = 'block';
    link.style.marginBottom = '6px';

    toc.appendChild(link);
  });
}

// ----------------------
// AUTO LOAD FIRST PAGE
// ----------------------
if (allLinks.length > 0) {
  allLinks[0].click();
}
