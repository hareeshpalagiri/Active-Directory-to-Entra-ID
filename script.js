const links = document.querySelectorAll(".sidebar a");
const content = document.getElementById("doc-content");
const quizContainer = document.getElementById("quiz-container");

let currentIndex = 0;
const allLinks = Array.from(links);

// 🔥 IMPORTANT: GitHub Pages base path
const basePath = "./";

// ================= LOAD PAGE =================
async function loadPage(path, link) {
  try {
    // Loading state
    content.innerHTML = "⏳ Loading...";

    // 🔥 GitHub RAW base (important)
    const rawBase =
      "https://raw.githubusercontent.com/hareeshpalagiri/Active-Directory-to-Entra-ID/main/";

    const fullPath = rawBase + path;

    console.log("Loading:", fullPath);

    // Fetch markdown
    const res = await fetch(fullPath);

    if (!res.ok) {
      content.innerHTML = "⚠️ File not found<br>" + fullPath;
      return;
    }

    // Convert markdown → HTML
    const text = await res.text();
    const html = marked.parse(text);

    // Render content
    content.innerHTML = html;

    // ================= DIAGRAMS (SAFE APPEND) =================
    const diagramContainer = document.createElement("div");
    diagramContainer.innerHTML = getDiagramHTML(text);
    content.appendChild(diagramContainer);

    // ================= TITLE + ACTIVE LINK =================
    if (link) {
      document.getElementById("pageTitle").innerText = link.innerText;

      document.querySelectorAll(".sidebar a").forEach(l =>
        l.classList.remove("active-link")
      );

      link.classList.add("active-link");
      link.classList.add("completed");
    }

    // ================= PROGRESS =================
    saveProgress(path);
    updateProgress();

    // ================= FEATURES =================
    addCopyButtons();
    loadQuiz(text);

    // ================= FIX INTERNAL LINKS =================
    document.querySelectorAll("#doc-content a").forEach(a => {
      const href = a.getAttribute("href");

      if (href && href.endsWith(".md")) {
        a.onclick = (e) => {
          e.preventDefault();

          const baseFolder = path.substring(0, path.lastIndexOf("/") + 1);
          const newPath = baseFolder + href.replace("./", "");

          loadPage(newPath, null);
        };
      }
    });

  } catch (err) {
    content.innerHTML = "❌ Error loading content";
    console.error(err);
  }
}
// ================= PROGRESS =================
function saveProgress(p) {
  let visited = JSON.parse(localStorage.getItem("visited") || "[]");

  if (!visited.includes(p)) {
    visited.push(p);
    localStorage.setItem("visited", JSON.stringify(visited));
  }
}

function updateProgress() {
  let visited = JSON.parse(localStorage.getItem("visited") || "[]");

  let percent = (visited.length / allLinks.length) * 100;

  document.getElementById("progress-bar").style.width = percent + "%";
  document.getElementById("progressText").innerText =
    "Progress: " + Math.round(percent) + "%";
}

// ================= QUIZ =================
function loadQuiz(text) {
  let question = "Which protocol is more secure?";
  let correct = "Kerberos";
  let wrong = "NTLM";

  if (text.includes("NTLM")) {
    question = "Why is NTLM weaker?";
    correct = "Uses hashes";
    wrong = "Uses tickets";
  }

  quizContainer.innerHTML = `
    <div class="quiz-card">
      <h3>🧠 Quick Quiz</h3>
      <p>${question}</p>
      <button onclick="alert('✅ Correct!')">${correct}</button>
      <button onclick="alert('❌ Try again')">${wrong}</button>
    </div>
  `;
}

// ================= COPY BUTTON =================
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

// ================= DIAGRAMS =================
function addDiagrams(text) {
  if (text.includes("Kerberos")) {
    content.innerHTML += `
      <div class="diagram-box">
        🔐 Kerberos Flow:<br>
        User → Domain Controller → Ticket → Service Access
      </div>`;
  }

  if (text.includes("DCSync")) {
    content.innerHTML += `
      <div class="diagram-box">
        ⚠️ DCSync Attack:<br>
        Attacker → Domain Controller → Password Hash Dump
      </div>`;
  }
}

// ================= NAVIGATION =================
document.getElementById("prevBtn").onclick = () => {
  if (currentIndex > 0) {
    currentIndex--;
    allLinks[currentIndex].click();
  }
};

document.getElementById("nextBtn").onclick = () => {
  if (currentIndex < allLinks.length - 1) {
    currentIndex++;
    allLinks[currentIndex].click();
  }
};

document.getElementById("homeBtn").onclick = () => {
  currentIndex = 0;
  allLinks[0].click();
};

// ================= DARK MODE =================
document.getElementById("darkModeToggle").onclick = () => {
  document.body.classList.toggle("dark");
};

// ================= SEARCH =================
document.getElementById("searchBox").onkeyup = function () {
  const filter = this.value.toLowerCase();

  links.forEach(link => {
    const match = link.innerText.toLowerCase().includes(filter);
    link.parentElement.style.display = match ? "" : "none";
  });
};

// ================= COLLAPSIBLE =================
document.querySelectorAll(".collapsible").forEach(c => {
  c.onclick = function () {
    const n = this.nextElementSibling;
    n.style.display = n.style.display === "block" ? "none" : "block";
  };
});

// ================= CLICK EVENTS =================
links.forEach((l, i) => {
  l.onclick = e => {
    e.preventDefault();
    currentIndex = i;
    loadPage(l.getAttribute("href"), l);
  };
});

// ================= INITIAL LOAD =================
if (allLinks.length > 0) {
  allLinks[0].click();
}
// ================= DIAGRAM HTML HELPER =================
function getDiagramHTML(text) {
  let html = "";

  if (text.includes("Kerberos")) {
    html += `
      <div class="diagram-box">
        🔐 Kerberos Flow:<br>
        User → Domain Controller → Ticket → Service Access
      </div>`;
  }

  if (text.includes("DCSync")) {
    html += `
      <div class="diagram-box">
        ⚠️ DCSync Attack:<br>
        Attacker → Domain Controller → Password Hash Dump
      </div>`;
  }

  return html;
}
