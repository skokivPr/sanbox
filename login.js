// --- THEME TOGGLE FOR LOGIN SCREEN ---
const loginThemeToggle = document.getElementById("loginThemeToggle");

// Load saved theme from localStorage or default to "dark"
const loginSavedTheme = localStorage.getItem("theme") || "dark";

// Set theme on load
document.documentElement.setAttribute("theme", loginSavedTheme);

// Function to update theme icon
function updateLoginThemeIcon(theme) {
  const icon = loginThemeToggle?.querySelector("i");
  if (!icon) return;

  if (theme === "dark") {
    icon.className = "ph ph-sun";
  } else {
    icon.className = "ph ph-moon";
  }
}

// Set correct icon on load
updateLoginThemeIcon(loginSavedTheme);

loginThemeToggle.addEventListener("click", () => {
  const current = document.documentElement.getAttribute("theme");
  const newTheme = current === "dark" ? "light" : "dark";

  // Save to localStorage
  localStorage.setItem("theme", newTheme);

  // Update theme attribute
  document.documentElement.setAttribute("theme", newTheme);

  // Update icon
  updateLoginThemeIcon(newTheme);

  // Refresh glass effect after theme change
  if (window.GlassEffect && window.GlassEffect.updateTheme) {
    window.GlassEffect.updateTheme();
  }
});

// --- STYLE SELECTOR FOR LOGIN SCREEN ---
const loginStyleToggle = document.getElementById("loginStyleToggle");
const loginStyleDropdown = document.getElementById("loginStyleDropdown");
const loginStyleOptions = document.querySelectorAll(".login-style-option");

// Load saved style from localStorage or default to "glitch"
const loginSavedStyle = localStorage.getItem("backgroundStyle") || "glitch";
document.documentElement.setAttribute("data-style", loginSavedStyle);

// Set active style option on load
loginStyleOptions.forEach((option) => {
  if (option.getAttribute("data-style") === loginSavedStyle) {
    option.classList.add("active");
  }
});

// Toggle dropdown
loginStyleToggle.addEventListener("click", (e) => {
  e.stopPropagation();
  loginStyleDropdown.classList.toggle("active");
});

// Close dropdown when clicking outside
document.addEventListener("click", (e) => {
  if (!loginStyleToggle.contains(e.target) && !loginStyleDropdown.contains(e.target)) {
    loginStyleDropdown.classList.remove("active");
  }
});

// Handle style selection
loginStyleOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const selectedStyle = option.getAttribute("data-style");

    // Update active state
    loginStyleOptions.forEach((opt) => opt.classList.remove("active"));
    option.classList.add("active");

    // Save to localStorage (synchronize with main app)
    localStorage.setItem("backgroundStyle", selectedStyle);

    // Update data-style attribute
    document.documentElement.setAttribute("data-style", selectedStyle);

    // Update Glass Effect
    if (window.GlassEffect && window.GlassEffect.updateTheme) {
      window.GlassEffect.updateTheme();
    }

    // Close dropdown
    loginStyleDropdown.classList.remove("active");
  });
});

// --- ENCRYPTION SYSTEM ---
function encrypt(text, key) {
  let result = "";
  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const keyChar = key.charCodeAt(i % key.length);
    const encrypted = charCode ^ keyChar;
    result += String.fromCharCode(encrypted);
  }
  return btoa(result); // Base64 encoding
}

function decrypt(encryptedText, key) {
  try {
    const decoded = atob(encryptedText); // Base64 decoding
    let result = "";
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i);
      const keyChar = key.charCodeAt(i % key.length);
      const decrypted = charCode ^ keyChar;
      result += String.fromCharCode(decrypted);
    }
    return result;
  } catch (e) {
    return "";
  }
}

// --- LOGIN SYSTEM ---
const loginScreen = document.getElementById("loginScreen");
const mainContent = document.getElementById("mainContent");
const keyInput = document.getElementById("keyInput");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");
const loginStatus = document.getElementById("loginStatus");

// Włącz formularz
loginBtn.disabled = false;
keyInput.disabled = false;
passwordInput.disabled = false;
passwordInput.focus();

// --- AUTHENTICATION DATABASE ---
// Lista zaszyfrowanych tokenów dostępu
// Każdy token został zaszyfrowany kluczem + hasłem
// Bez znajomości klucza, nie wiadomo jakie klucze istnieją
const AUTH_TOKENS = ["ERYCCApcW10=", "Eg8CChQVGV4=", "BQYHCQsD"];

// Sprawdź czy użytkownik jest już zalogowany
function checkLogin() {
  const isLoggedIn = sessionStorage.getItem("isLoggedIn");
  if (isLoggedIn === "true") {
    showMainContent();
  }
}

// Funkcja weryfikacji klucza i hasła
function validateCredentials(key, password) {
  if (!key || !password) {
    return false;
  }

  // Zaszyfruj hasło używając klucza
  const encryptedPassword = encrypt(password, key);

  // Sprawdź czy zaszyfrowane hasło istnieje w bazie tokenów
  return AUTH_TOKENS.includes(encryptedPassword);
}

// Funkcja logowania
function login() {
  const key = keyInput.value;
  const password = passwordInput.value;

  // Sprawdź czy klucz został wprowadzony
  if (!key) {
    loginError.textContent = "WPROWADŹ KLUCZ DOSTĘPU";
    keyInput.style.animation = "shake 0.5s";
    setTimeout(() => {
      keyInput.style.animation = "";
    }, 500);
    return;
  }

  // Sprawdź czy hasło zostało wprowadzone
  if (!password) {
    loginError.textContent = "WPROWADŹ HASŁO";
    passwordInput.style.animation = "shake 0.5s";
    setTimeout(() => {
      passwordInput.style.animation = "";
    }, 500);
    return;
  }

  // Sprawdź czy klucz i hasło są poprawne
  if (!validateCredentials(key, password)) {
    loginError.textContent = "NIEPRAWIDŁOWY KLUCZ LUB HASŁO";
    keyInput.style.animation = "shake 0.5s";
    passwordInput.style.animation = "shake 0.5s";
    setTimeout(() => {
      keyInput.style.animation = "";
      passwordInput.style.animation = "";
    }, 500);
    return;
  }

  // Zapisz klucz w sessionStorage i zaloguj
  sessionStorage.setItem("userKey", key);
  sessionStorage.setItem("isLoggedIn", "true");
  loginError.textContent = "";
  showMainContent();
}

// Pokaż główną zawartość
function showMainContent() {
  loginScreen.style.animation = "fadeOut 0.3s ease-out";
  setTimeout(() => {
    loginScreen.style.display = "none";
    mainContent.style.display = "block";
    mainContent.style.animation = "fadeIn 0.5s ease-out";
    // Załaduj projekty i status dopiero po zalogowaniu
    if (typeof loadProjects === "function") {
      loadProjects();
    }
    if (typeof updateLoginStatus === "function") {
      updateLoginStatus();
    }
  }, 300);
}

// Funkcja wylogowania
function logout() {
  // Wyczyść sesję
  sessionStorage.removeItem("userKey");
  sessionStorage.removeItem("isLoggedIn");

  // Animacja ukrycia głównej zawartości
  mainContent.style.animation = "fadeOut 0.3s ease-out";

  setTimeout(() => {
    mainContent.style.display = "none";
    loginScreen.style.display = "flex";
    loginScreen.style.animation = "fadeIn 0.5s ease-out";

    // Wyczyść pola formularza
    keyInput.value = "";
    passwordInput.value = "";
    loginError.textContent = "";

    // Focus na pole hasła
    passwordInput.focus();
  }, 300);
}

// Event listeners dla logowania
loginBtn.addEventListener("click", login);
keyInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    login();
  }
});
passwordInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    login();
  }
});

// Sprawdź login przy starcie
checkLogin();

// Event listener dla wylogowania
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", logout);
}

// Developer helper
console.log(
  "%c🔐 SYSTEM.PROJEKTY - AUTORYZACJA",
  "color: #00ff88; font-size: 16px; font-weight: bold;"
);
console.log(
  "%cZarejestrowane tokeny: " + AUTH_TOKENS.length,
  "color: #00ccff; font-size: 12px;"
);
console.log(
  "%cPanel deweloperski: Kliknij ikonę </> aby wygenerować nowe tokeny",
  "color: #888; font-style: italic;"
);

// --- DEVELOPER PANEL ---
const devToggle = document.getElementById("devToggle");
const devPanel = document.getElementById("devPanel");
const closeDev = document.getElementById("closeDev");
const devKey = document.getElementById("devKey");
const devPassword = document.getElementById("devPassword");
const generateBtn = document.getElementById("generateBtn");
const encryptedOutput = document.getElementById("encryptedOutput");
const copyEncrypted = document.getElementById("copyEncrypted");

// Ustaw placeholder dla pola klucza
devKey.placeholder = "Twój unikalny klucz (np. MOJKLUCZ2024)";

// Toggle developer panel
devToggle.addEventListener("click", () => {
  devPanel.classList.toggle("active");

  // Zmień ikonę
  const icon = devToggle.querySelector("i");
  if (devPanel.classList.contains("active")) {
    icon.className = "ph ph-x";
  } else {
    icon.className = "ph ph-code";
  }
});

closeDev.addEventListener("click", () => {
  devPanel.classList.remove("active");

  // Przywróć ikonę
  const icon = devToggle.querySelector("i");
  icon.className = "ph ph-code";
});

// Generate encrypted password
generateBtn.addEventListener("click", () => {
  const key = devKey.value;
  const password = devPassword.value;

  if (!password) {
    encryptedOutput.textContent = "⚠️ Wprowadź hasło do zaszyfrowania!";
    encryptedOutput.style.color = "var(--danger-color)";
    return;
  }

  if (!key) {
    encryptedOutput.textContent = "⚠️ Wprowadź klucz szyfrujący!";
    encryptedOutput.style.color = "var(--danger-color)";
    return;
  }

  const encrypted = encrypt(password, key);

  // Weryfikacja: sprawdź czy deszyfrowanie działa poprawnie
  const decrypted = decrypt(encrypted, key);
  const isValid = decrypted === password;

  encryptedOutput.innerHTML = `
    <div style="margin-bottom: 0.5rem;">
      <strong>Zaszyfrowane:</strong> ${encrypted}
    </div>
    <div style="font-size: 0.85em; opacity: 0.8;">
      ✓ Weryfikacja dekodera: ${isValid
      ? '<span style="color: var(--success-color);">POPRAWNE</span>'
      : '<span style="color: var(--danger-color);">BŁĄD</span>'
    }
    </div>
  `;
  encryptedOutput.style.color = isValid
    ? "var(--highlight-color)"
    : "var(--danger-color)";
});

// Copy encrypted password
copyEncrypted.addEventListener("click", () => {
  const text = encryptedOutput.textContent;

  if (text && !text.includes("⚠️") && !text.includes("Wynik")) {
    // Wyciągnij tylko zaszyfrowany tekst (przed "Weryfikacja")
    const encryptedText = text
      .split("Weryfikacja")[0]
      .replace("Zaszyfrowane:", "")
      .trim();

    if (encryptedText) {
      navigator.clipboard.writeText(encryptedText).then(() => {
        const originalText = copyEncrypted.innerHTML;
        copyEncrypted.innerHTML = '<i class="ph ph-check"></i> Skopiowano!';
        copyEncrypted.style.color = "var(--success-color)";

        setTimeout(() => {
          copyEncrypted.innerHTML = originalText;
          copyEncrypted.style.color = "";
        }, 2000);
      });
    }
  }
});
