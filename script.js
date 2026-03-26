// ================= ELEMENTS =================
const links = document.querySelectorAll(".sidebar a");
const content = document.getElementById("doc-content");
const quizContainer = document.getElementById("quiz-container");

let currentIndex = 0;
const allLinks = Array.from(links);

// 🔥 RAW BASE (THIS IS KEY)
const RAW_BASE =
  "https://raw.githubusercontent.com/hareeshpalagiri/Active-Directory-to-Entra-ID/main/";

// ================= LOAD PAGE =================
async function loadPage(path, link) {
  try {
    content.innerHTML = "⏳ Loading...";

    const fullPath = RAW_BASE + path;

    console.log("Trying:", fullPath);

    const res = await fetch(fullPath);

    if (!res.ok) {
      content.innerHTML = `
        ❌ Cannot load file<br>
        <b>${fullPath}</b><br><br>
        👉 Open this URL manually to verify
      `;
      return;
    }

    const text = await res.text();

    // ===== RENDER MARKDOWN =====
    content.innerHTML = marked.parse(text);

    // ===== TITLE =====
    if (link) {
      document.getElementById("pageTitle").innerText = link.innerText;

      links.forEach(l => l.classList.remove("active-link"));
      link.classList.add("active-link");
      link.classList.add("completed");
    }

    // ===== PROGRESS =====
    saveProgress(path);
    updateProgress();

    // ===== FEATURES =====
    addCopyButtons();
    loadQuiz(text);
    appendDiagrams(text);

    // ===== FIX INTERNAL LINKS =====
    fixInternalLinks(path);

  } catch (err) {
    console.error(err);
    content.innerHTML = "❌ Critical error loading content";
  }
}

// ================= DIAGRAM APPEND =================
function appendDiagrams(text) {
  let html = "";

  if (text.includes("Kerberos")) {
    html += `
      <div class="diagram-box">
        🔐 Kerberos Flow:<br>
        User → DC → Ticket → Service
      </div>`;
  }

  if (text.includes("DCSync")) {
    html += `
      <div class="diagram-box">
        ⚠️ DCSync:<br>
        Attacker → DC → Hash Dump
      </div>`;
  }

  if (html) {
    const div = document.createElement("div");
    div.innerHTML = html;
    content.appendChild(div);
  }
}

// ================= FIX INTERNAL LINKS =================
function fixInternalLinks(currentPath) {
  document.querySelectorAll("#doc-content a").forEach(a => {
    const href = a.getAttribute("href");

    if (href && href.endsWith(".md")) {
      a.onclick = (e) => {
        e.preventDefault();

        const base = currentPath.substring(
          0,
          currentPath.lastIndexOf("/") + 1
        );

        const newPath = base + href.replace("./", "");

        console.log("Navigate:", newPath);

        loadPage(newPath, null);
      };
    }
  });
}

// ================= PROGRESS =================
function saveProgress(p) {
  let v = JSON.parse(localStorage.getItem("visited") || "[]");

  if (!v.includes(p)) {
    v.push(p);
    localStorage.setItem("visited", JSON.stringify(v));
  }
}

function updateProgress() {
  let v = JSON.parse(localStorage.getItem("visited") || "[]");

  let percent = (v.length / allLinks.length) * 100;

  document.getElementById("progress-bar").style.width =
    percent + "%";

  document.getElementById("progressText").innerText =
    "Progress: " + Math.round(percent) + "%";
}

// ================= QUIZ =================
function loadQuiz(text) {
  quizContainer.innerHTML = `
    <div class="quiz-card">
      <h3>🧠 Quick Quiz</h3>
      <p>Kerberos is used for?</p>
      <button onclick="alert('✅ Correct')">Authentication</button>
      <button onclick="alert('❌ Wrong')">Encryption only</button>
    </div>
  `;
}

// ================= COPY =================
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
    link.parentElement.style.display =
      link.innerText.toLowerCase().includes(filter) ? "" : "none";
  });
};

// ================= COLLAPSIBLE =================
document.querySelectorAll(".collapsible").forEach(c => {
  c.onclick = function () {
    const n = this.nextElementSibling;
    n.style.display =
      n.style.display === "block" ? "none" : "block";
  };
});

// ================= CLICK EVENTS =================
links.forEach((l, i) => {
  l.onclick = (e) => {
    e.preventDefault();
    currentIndex = i;
    loadPage(l.getAttribute("href"), l);
  };
});

// ================= START =================
if (allLinks.length > 0) {
  allLinks[0].click();
}
