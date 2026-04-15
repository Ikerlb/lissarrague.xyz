// theme toggle — persists to localStorage
(function () {
  const root = document.documentElement;
  const btn = document.getElementById("themeToggle");
  const saved = localStorage.getItem("term-theme");
  if (saved) root.setAttribute("data-theme", saved);

  btn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("term-theme", next);
  });

  // press "/" to jump to the interactive shell demo
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(document.activeElement.tagName)) {
      e.preventDefault();
      window.location.href = "../terminal-shell/";
    }
  });
})();
