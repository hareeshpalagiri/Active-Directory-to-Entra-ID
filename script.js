const links = document.querySelectorAll(".sidebar a");
const content = document.getElementById("doc-content");
const quizContainer = document.getElementById("quiz-container");

let currentIndex = 0;
const allLinks = Array.from(links);

// LOAD PAGE
async function loadPage(path, link) {
  const res = await fetch(path);

  if (!res.ok) {
    content.innerHTML = "❌ File not found";
    return;
  }

  const text = await res.text();
  content.innerHTML = marked.parse(text);

  document.getElementById("pageTitle").innerText = link.innerText;

  // progress
  saveProgress(path);
  updateProgress();

  // highlight
  links.forEach(l => l.classList.remove("active-link"));
  link.classList.add("active-link");
  link.classList.add("completed");

  addCopyButtons();
  loadQuiz(text);
  addDiagrams(text);
}

// PROGRESS
function saveProgress(p) {
  let v = JSON.parse(localStorage.getItem("visited") || "[]");
  if (!v.includes(p)) v.push(p);
  localStorage.setItem("visited", JSON.stringify(v));
}

function updateProgress() {
  let v = JSON.parse(localStorage.getItem("visited") || "[]");
  let percent = (v.length / allLinks.length) * 100;
  document.getElementById("progress-bar").style.width = percent + "%";
  document.getElementById("progressText").innerText =
    "Progress: " + Math.round(percent) + "%";
}

// QUIZ
function loadQuiz(text) {
  quizContainer.innerHTML = `
    <div class="quiz-card">
      <h3>Quick Quiz</h3>
      <p>Which protocol is most secure?</p>
      <button onclick="alert('Correct')">Kerberos</button>
      <button onclick="alert('Wrong')">NTLM</button>
    </div>
  `;
}

// COPY BUTTON
function addCopyButtons() {
  document.querySelectorAll("pre code").forEach(block => {
    const btn = document.createElement("button");
    btn.innerText = "Copy";
    btn.className = "copy-btn";

    btn.onclick = () => {
      navigator.clipboard.writeText(block.innerText);
      btn.innerText = "Copied!";
      setTimeout(() => (btn.innerText = "Copy"), 2000);
    };

    block.parentElement.style.position = "relative";
    block.parentElement.appendChild(btn);
  });
}

// DIAGRAMS
function addDiagrams(text) {
  if (text.includes("Kerberos")) {
    content.innerHTML += `
      <div class="diagram-box">
        🔐 Kerberos Flow: User → DC → Ticket → Service
      </div>`;
  }
}

// NAV
document.getElementById("prevBtn").onclick = () => {
  if (currentIndex > 0) allLinks[currentIndex - 1].click();
};

document.getElementById("nextBtn").onclick = () => {
  if (currentIndex < allLinks.length - 1)
    allLinks[currentIndex + 1].click();
};

document.getElementById("homeBtn").onclick = () => {
  allLinks[0].click();
};

// DARK MODE
document.getElementById("darkModeToggle").onclick = () => {
  document.body.classList.toggle("dark");
};

// SEARCH
document.getElementById("searchBox").onkeyup = function () {
  const filter = this.value.toLowerCase();
  links.forEach(link => {
    link.parentElement.style.display =
      link.innerText.toLowerCase().includes(filter) ? "" : "none";
  });
};

// COLLAPSIBLE
document.querySelectorAll(".collapsible").forEach(c => {
  c.onclick = function () {
    const n = this.nextElementSibling;
    n.style.display = n.style.display === "block" ? "none" : "block";
  };
});

// CLICK
links.forEach((l, i) => {
  l.onclick = e => {
    e.preventDefault();
    currentIndex = i;
    loadPage(l.getAttribute("href"), l);
  };
});

// START
if (allLinks.length > 0) allLinks[0].click();
