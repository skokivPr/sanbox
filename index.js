


// --- PROJEKTY DANE ---
let projects = [];
let currentFiltered = []; // Przechowuje aktualny stan filtrowania

// --- DOM ELEMENTS ---
const grid = document.getElementById("projectsGrid");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const themeBtn = document.getElementById("themeToggle");
const loginStatusDisplay = document.getElementById("loginStatusDisplay");
const userStatusText = document.getElementById("userStatusText");

// --- LOGIN STATUS ---
function updateLoginStatus() {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn");
  const userKey = sessionStorage.getItem("userKey");

  if (isLoggedIn === "true" && userKey) {
    // Pokaż pierwsze 4 znaki klucza jako identyfikator
    const keyPreview = userKey.substring(0, 0) + "****";
    userStatusText.textContent = `Key: ${keyPreview}`;
    loginStatusDisplay.style.display = "flex";
  } else {
    userStatusText.textContent = "Zalogowano";
    loginStatusDisplay.style.display = "flex";
  }
}

// Sandbox
const sandboxModal = document.getElementById("sandboxModal");
const sandboxFrame = document.getElementById("sandboxFrame");
const sandboxTitle = document.getElementById("sandboxTitle");
const sandboxExternalLink = document.getElementById("sandboxExternalLink");
const loader = document.getElementById("loader");

// --- URL SANITIZER (Naprawa linków) ---
function sanitizeUrl(url) {
  try {
    if (!url) return "";
    const u = new URL(url);

    // 1. Konwersja GitHub Blob -> Raw
    if (u.hostname === "github.com" && u.pathname.includes("/blob/")) {
      u.hostname = "raw.githubusercontent.com";
      u.pathname = u.pathname.replace("/blob/", "/");
    }

    // 2. Obsługa Gist (Naprawa błędu CORS)
    if (u.hostname === "gist.github.com") {
      u.hostname = "gist.githubusercontent.com";
    }

    return u.toString();
  } catch (e) {
    return url;
  }
}

// --- DATA FETCHING (ZAAWANSOWANE) ---
// Konfiguracja URL 
const URL_MAIN = atob(
  "aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3Nrb2tpdlByL2pzb24tbGlzdGEvbWFpbi9odG1sLmpzb24="
);
const URL_MASTER = atob(
  "aHR0cHM6Ly9yYXcuZ2l0aHVidXNlcmNvbnRlbnQuY29tL3Nrb2tpdlByL2pzb24tbGlzdGEvbWFzdGVyL2h0bWwuanNvbg=="
);

function loadProjects() {
  fetch(URL_MAIN)
    .then((res) => {
      if (res.ok) return res.json();

      return fetch(URL_MASTER).then((resMaster) => {
        if (!resMaster.ok) {
          throw new Error(
            `Nie znaleziono pliku w gałęziach main ani master (Status: ${resMaster.status})`
          );
        }
        return resMaster.json();
      });
    })
    .then((data) => {
      projects = data;
      currentFiltered = data; // Inicjalizacja listy filtrowanej
      renderProjects(projects);
    })
    .catch((error) => {
      // Zmiana ikony błędu na Phosphor (ph-warning)
      grid.innerHTML = `
                        <div style="padding:4rem 2rem; text-align:center; color:var(--text-muted); grid-column:1/-1;">
                            <i class="ph ph-warning" style="font-size: 48px; color: #ef4444; margin-bottom: 1rem;"></i><br>
                            SYSTEM ERROR: UNABLE TO FETCH DATA<br>
                            <span style="font-size:0.8em; opacity:0.7">${error.message}</span><br><br>
                            <div style="font-size:0.7em; color:var(--text-muted); background:var(--bg); padding:1rem; display:inline-block; border:1px solid var(--border-color);">
                                Nie można załadować danych z serwera<br>
                                Sprawdź połączenie internetowe
                            </div>
                        </div>
                    `;
    });
}

// Sprawdź czy użytkownik jest zalogowany i ładuj projekty + status
(function () {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn");
  if (isLoggedIn === "true") {
    loadProjects();
    updateLoginStatus();
  }
})();

// --- AUTO DESCRIPTION HELPER ---
function extractTitleFromHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // ZMIANA: Szukamy konkretnie tagu <title> i zwracamy jego treść
  const titleTag = doc.querySelector("title");

  if (titleTag && titleTag.textContent) {
    return titleTag.textContent.trim();
  }

  return null; // Zwracamy null jeśli nie znaleziono tytułu
}

// --- UPDATE DESCRIPTIONS ---
async function updateCardDescriptions(projectsList) {
  for (let i = 0; i < projectsList.length; i++) {
    const project = projectsList[i];
    // Szukamy elementu po ID (generowanym w createCardHTML)
    const element = document.getElementById(`desc-${i}`);

    if (!element || !project.url) continue;

    try {
      const safeUrl = sanitizeUrl(project.url);
      const res = await fetch(safeUrl);

      if (res.ok) {
        const html = await res.text();
        // Używamy nowej funkcji do wyciągania <title>
        const pageTitle = extractTitleFromHtml(html);

        if (pageTitle) {
          // Płynna zmiana tekstu
          element.style.opacity = "0";
          setTimeout(() => {
            element.textContent = pageTitle;
            element.style.opacity = "1";
            element.style.color = "var(--text-muted)";
          }, 300);
        }
      }
    } catch (e) {
      // Cichy błąd - nie logujemy
    }
  }
}

// --- THEME LOGIC ---
// Load saved theme from localStorage or default to "dark"
const savedTheme = localStorage.getItem("theme") || "dark";
let isDark = savedTheme === "dark";

// Set theme on load
document.documentElement.setAttribute("theme", savedTheme);

// Set correct icon on load
themeBtn.innerHTML = isDark
  ? '<i class="ph ph-sun" style="font-size:20px"></i>'
  : '<i class="ph ph-moon" style="font-size:20px"></i>';

themeBtn.addEventListener("click", () => {
  isDark = !isDark;
  const newTheme = isDark ? "dark" : "light";

  // Save to localStorage
  localStorage.setItem("theme", newTheme);

  // Update theme attribute
  document.documentElement.setAttribute("theme", newTheme);

  // Update icon
  themeBtn.innerHTML = isDark
    ? '<i class="ph ph-sun" style="font-size:20px"></i>'
    : '<i class="ph ph-moon" style="font-size:20px"></i>';

  // Update glass effect background
  if (window.GlassEffect && window.GlassEffect.updateTheme) {
    window.GlassEffect.updateTheme();
  }
});

// --- STYLE SELECTOR ---
const styleToggleBtn = document.getElementById("styleToggle");
const styleDropdown = document.getElementById("styleDropdown");
const styleOptions = document.querySelectorAll(".style-option");

// Load saved style or default to "glitch"
const savedStyle = localStorage.getItem("backgroundStyle") || "glitch";
document.documentElement.setAttribute("data-style", savedStyle);

// Set active style option
styleOptions.forEach(option => {
  if (option.dataset.style === savedStyle) {
    option.classList.add("active");
  }
});

// Toggle dropdown
styleToggleBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  styleDropdown.classList.toggle("active");
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!styleDropdown.contains(e.target) && e.target !== styleToggleBtn) {
    styleDropdown.classList.remove("active");
  }
});

// Handle style selection
styleOptions.forEach(option => {
  option.addEventListener("click", () => {
    const selectedStyle = option.dataset.style;

    // Update active state
    styleOptions.forEach(opt => opt.classList.remove("active"));
    option.classList.add("active");

    // Save to localStorage
    localStorage.setItem("backgroundStyle", selectedStyle);

    // Update data-style attribute
    document.documentElement.setAttribute("data-style", selectedStyle);

    // Update glass effect
    if (window.GlassEffect && window.GlassEffect.updateTheme) {
      window.GlassEffect.updateTheme();
    }

    // Close dropdown
    styleDropdown.classList.remove("active");
  });
});

// --- GRID LAYOUT HELPER ---
// Oblicza ile jest kolumn w gridzie na podstawie szerokości okna
// Wartości muszą odpowiadać tym z CSS media queries
function getGridColumns() {
  const w = window.innerWidth;
  if (w >= 1280) return 4;
  if (w >= 1024) return 3;
  if (w >= 640) return 2;
  return 1;
}

// --- RENDER CARD ---
function createCardHTML(project, index) {
  const paddedId = (project.id || 0).toString().padStart(2, "0");
  // Mapping prosty: jeśli w JSON jest 'box', Phosphor ma 'package'.
  // Jeśli ikona nieznana, Phosphor wyświetli pusty znak lub nic, dlatego warto mieć fallback.
  let iconName = project.icon || "package";
  if (iconName === "box") iconName = "package"; // Mapowanie wsteczne dla starych danych

  return `
                <div onclick="openSandbox('${project.url}', '${project.title}')" class="project-card">
                    <span class="corner top-left"></span>
                    <span class="corner top-right"></span>
                    <span class="corner bottom-left"></span>
                    <span class="corner bottom-right"></span>
                    
                    <div class="card-header">
                        <div class="card-meta">SYS.ID_${paddedId}</div>
                        <i class="ph ph-duotone ph-vinyl-record arrow-icon"></i>
                    </div>
                    
                    <h3 class="card-title">${project.title}</h3>
                    <div class="card-icon-container">
                         <i class="ph ph-${iconName} card-icon"></i>
                         <div class="card-divider"></div>
                    </div>
                    <!-- ZMIANA: Przywrócono ID, aby funkcja JS mogła podmienić treść na pobrany <title> -->
                    <p id="desc-${index}" class="card-desc">Wczytywanie...</p>
                </div>
            `;
}

// --- RENDER GRID ---
function renderProjects(projectsToRender) {
  // Aktualizujemy stan globalny dla resize listenera
  currentFiltered = projectsToRender;

  // 1. Generuj HTML dla prawdziwych projektów
  let html = projectsToRender.map((p, i) => createCardHTML(p, i)).join("");

  // 2. Oblicz ile pustych kart potrzeba, aby wypełnić rząd
  if (projectsToRender.length > 0) {
    const cols = getGridColumns();
    const remainder = projectsToRender.length % cols;
    const missing = remainder === 0 ? 0 : cols - remainder;

    // Generuj puste karty (fillery)
    for (let i = 0; i < missing; i++) {
      html += `<div class="project-card empty-slot" style="background: rgb(var(--bg-rgb),0.5); pointer-events: none;"><style>.empty-slot::before { display: none !important; }</style></div>`;
    }
  }

  grid.innerHTML = html;

  if (projectsToRender.length === 0) {
    emptyState.classList.add("visible");
    grid.style.display = "none";
  } else {
    emptyState.classList.remove("visible");
    grid.style.display = "grid";

    // ZMIANA: Ponownie włączamy funkcję, która pobierze tytuły
    updateCardDescriptions(projectsToRender);
  }
  // Phosphor nie wymaga wywołania .createIcons()!
}

// Nasłuchiwanie na zmianę rozmiaru okna, aby przeliczyć puste sloty
window.addEventListener("resize", () => {
  if (currentFiltered.length > 0) {
    renderProjects(currentFiltered);
  }
});

// --- SANDBOX LOGIC ---
async function openSandbox(url, title) {
  sandboxTitle.textContent = title;

  // Napraw URL przed użyciem
  const safeUrl = sanitizeUrl(url);
  sandboxExternalLink.href = safeUrl;

  sandboxModal.classList.add("open");
  document.body.classList.add("modal-open");

  loader.style.display = "block";

  // Clear previous
  sandboxFrame.srcdoc = "";

  try {
    const response = await fetch(safeUrl);
    if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
    const code = await response.text();

    // Inject code
    sandboxFrame.srcdoc = code;

    sandboxFrame.onload = () => {
      loader.style.display = "none";
    };
  } catch (error) {
    loader.style.display = "none";
    let errorMsg = error.message;

    // Tłumaczenie błędu CORS
    if (errorMsg.includes("Failed to fetch")) {
      errorMsg =
        "Błąd sieci lub blokada CORS.<br>Przeglądarka zablokowała żądanie do tego zasobu.";
    }

    sandboxFrame.srcdoc = `
                    <div style="font-family:'JetBrains Mono', monospace; color:#ef4444; text-align:center; padding:50px; line-height:1.6;">
                        <i class="ph ph-warning-octagon" style="font-size:48px; margin-bottom:1rem; display:inline-block;"></i><br>
                        <strong>NIE UDAŁO SIĘ ZAŁADOWAĆ KODU</strong><br>
                        <span style="opacity:0.8; font-size:0.9em">${errorMsg}</span><br><br>
                        <a href="${safeUrl}" target="_blank" style="display:inline-block; padding:0.5rem 1rem; border:1px solid #ef4444; color:#ef4444; text-decoration:none; margin-top:1rem; transition:0.2s;">
                            OTWÓRZ W NOWYM OKNIE
                        </a>
                    </div>
                `;
  }
}

function closeSandbox() {
  sandboxModal.classList.remove("open");
  document.body.classList.remove("modal-open");
  setTimeout(() => {
    sandboxFrame.srcdoc = "";
  }, 300);
}

function handleOverlayClick(e) {
  if (e.target === sandboxModal) closeSandbox();
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeSandbox();
});

// --- SEARCH LOGIC ---
searchInput.addEventListener("input", (e) => {
  const term = e.target.value.toLowerCase();
  const filtered = projects.filter((p) => p.title.toLowerCase().includes(term));
  renderProjects(filtered);
});

