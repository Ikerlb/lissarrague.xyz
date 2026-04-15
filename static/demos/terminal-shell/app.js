// ----- theme -----
(function () {
  const root = document.documentElement;
  const saved = localStorage.getItem("term-theme");
  if (saved) root.setAttribute("data-theme", saved);
  document.getElementById("themeToggle").addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("term-theme", next);
  });
})();

// ----- DOM -----
const out = document.getElementById("output");
const body = document.getElementById("body");
const input = document.getElementById("input");
const inputText = document.getElementById("inputText");
const cwdEl = document.getElementById("cwd");

// ----- state -----
let cwd = []; // array of path segments, [] == ~
const history = [];
let histIdx = -1;

// ----- helpers -----
function esc(s) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function renderCwd() {
  cwdEl.textContent = "~" + (cwd.length ? "/" + cwd.join("/") : "");
}

function nodeAt(parts) {
  let node = window.FS;
  for (const p of parts) {
    if (!node || node.type !== "dir") return null;
    node = node.entries[p];
  }
  return node || null;
}

// Resolve a path string against cwd. Returns { parts, node } or { parts, node: null } if missing.
function resolve(pathStr) {
  let parts;
  if (!pathStr || pathStr === "~" || pathStr === "~/") {
    parts = [];
  } else if (pathStr.startsWith("/")) {
    parts = pathStr.split("/").filter(Boolean);
  } else if (pathStr.startsWith("~/")) {
    parts = pathStr.slice(2).split("/").filter(Boolean);
  } else {
    parts = cwd.concat(pathStr.split("/").filter(Boolean));
  }
  const norm = [];
  for (const p of parts) {
    if (p === "." || p === "") continue;
    if (p === "..") norm.pop();
    else norm.push(p);
  }
  return { parts: norm, node: nodeAt(norm) };
}

function print(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  out.appendChild(div);
  body.scrollTop = body.scrollHeight;
}

function printPrompt(cmd) {
  const where = "~" + (cwd.length ? "/" + cwd.join("/") : "");
  print(
    `<span class="prompt">iker@lissarrague</span><span class="sep">:</span>` +
    `<span class="cwd">${esc(where)}</span><span class="sep">$</span> ` +
    `<span class="cmd">${esc(cmd)}</span>`
  );
}

// ----- commands -----
const COMMANDS = {
  help() {
    print(
      [
        "available commands:",
        "  <span class='ok'>help</span>                  show this message",
        "  <span class='ok'>ls</span> [path]             list directory contents",
        "  <span class='ok'>cd</span> [path]             change directory (<span class='dim'>cd</span> or <span class='dim'>cd ~</span> goes home)",
        "  <span class='ok'>pwd</span>                   print working directory",
        "  <span class='ok'>cat</span> &lt;file&gt;            print file contents",
        "  <span class='ok'>open</span> &lt;file|url&gt;       open the underlying page in a new tab",
        "  <span class='ok'>whoami</span>                who am i",
        "  <span class='ok'>about</span>                 short bio (alias of <span class='dim'>cat ~/about.md</span>)",
        "  <span class='ok'>contact</span>               how to reach me",
        "  <span class='ok'>theme</span> dark|light      switch palette",
        "  <span class='ok'>clear</span>                 clear the screen",
        "  <span class='ok'>neofetch</span>              system info, sort of",
        "",
        "tips: <span class='dim'>↑/↓ history · tab completes · / refocuses prompt</span>"
      ].join("<br>")
    );
  },

  ls(arg) {
    const { node, parts } = resolve(arg || ".");
    if (!node) return print(`<span class="err">ls: ${esc(arg)}: no such file or directory</span>`);
    if (node.type !== "dir") {
      return print(`<span class="file">${esc(parts[parts.length - 1])}</span>`);
    }
    const names = Object.keys(node.entries).sort();
    if (!names.length) return print("<span class='dim'>(empty)</span>");
    const grid = names
      .map((n) => {
        const e = node.entries[n];
        if (e.type === "dir") return `<a class="dir" href="#" data-cmd="cd ${esc(parts.concat(n).join("/") || "~")}">${esc(n)}/</a>`;
        if (e.type === "link") return `<a class="link" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(n)}</a>`;
        return `<a class="file" href="#" data-cmd="cat ${esc([...parts, n].join("/"))}">${esc(n)}</a>`;
      })
      .join("");
    print(`<div class="ls-grid">${grid}</div>`);
  },

  cd(arg) {
    if (!arg || arg === "~") { cwd = []; renderCwd(); return; }
    const { node, parts } = resolve(arg);
    if (!node) return print(`<span class="err">cd: ${esc(arg)}: no such file or directory</span>`);
    if (node.type !== "dir") return print(`<span class="err">cd: ${esc(arg)}: not a directory</span>`);
    cwd = parts;
    renderCwd();
  },

  pwd() {
    print("/home/iker" + (cwd.length ? "/" + cwd.join("/") : ""));
  },

  cat(arg) {
    if (!arg) return print(`<span class="err">cat: missing file operand</span>`);
    const { node } = resolve(arg);
    if (!node) return print(`<span class="err">cat: ${esc(arg)}: no such file or directory</span>`);
    if (node.type === "dir") return print(`<span class="err">cat: ${esc(arg)}: is a directory</span>`);
    if (node.type === "link") return print(`<a class="link" href="${esc(node.url)}" target="_blank" rel="noopener">${esc(node.url)}</a>`);
    let html = esc(node.content).replace(/^# (.+)$/m, "<h1>$1</h1>");
    if (node.url) html += `\n<span class="meta">-- <a class="link" href="${esc(node.url)}" target="_blank" rel="noopener">open in full page</a></span>`;
    print(`<pre class="cat">${html}</pre>`);
  },

  open(arg) {
    if (!arg) return print(`<span class="err">open: missing operand</span>`);
    if (/^https?:\/\//.test(arg)) { window.open(arg, "_blank", "noopener"); return; }
    const { node } = resolve(arg);
    if (!node) return print(`<span class="err">open: ${esc(arg)}: no such file or directory</span>`);
    if (node.type === "link") { window.open(node.url, "_blank", "noopener"); return; }
    if (node.type === "file" && node.url) { window.open(node.url, "_blank", "noopener"); return; }
    print(`<span class="warn">open: ${esc(arg)}: no URL associated — try 'cat' instead</span>`);
  },

  whoami() { print("iker"); },

  about() { COMMANDS.cat("~/about.md"); },

  contact() { COMMANDS.cat("~/contact.txt"); },

  theme(arg) {
    if (!["dark", "light"].includes(arg)) return print(`<span class="err">usage: theme dark|light</span>`);
    document.documentElement.setAttribute("data-theme", arg);
    localStorage.setItem("term-theme", arg);
  },

  clear() { out.innerHTML = ""; },

  neofetch() {
    print(
      [
        "<span class='ok'>iker@lissarrague</span>",
        "<span class='dim'>------------------</span>",
        "<b>OS</b>:       Hugo / static",
        "<b>Host</b>:     lissarrague.xyz",
        "<b>Kernel</b>:   JetBrainsMono 5.15",
        "<b>Shell</b>:    webshell v0.1",
        "<b>Languages</b>: Rust, Go, Python, TypeScript, Clojure",
        "<b>Uptime</b>:   since the first commit",
        "<b>Theme</b>:    " + document.documentElement.getAttribute("data-theme")
      ].join("<br>")
    );
  },

  sudo(rest) {
    if (/^rm\s+-rf\s+\//.test(rest || "")) {
      print("<span class='warn'>nice try 😉</span>");
      return;
    }
    print(`<span class="err">sudo: permission denied</span>`);
  }
};

// ----- exec -----
function exec(raw) {
  const line = raw.trim();
  if (!line) return;
  history.push(line);
  histIdx = history.length;

  const [head, ...rest] = line.split(/\s+/);
  const arg = rest.join(" ");

  if (head in COMMANDS) {
    COMMANDS[head](arg, rest);
  } else if (head === ".exit" || head === "exit") {
    print("<span class='dim'>(no-op in browser)</span>");
  } else {
    print(`<span class="err">${esc(head)}: command not found — try 'help'</span>`);
  }
}

// ----- input rendering -----
function sync() {
  inputText.textContent = input.value;
  body.scrollTop = body.scrollHeight;
}

// ----- tab completion -----
function complete() {
  const val = input.value;
  // complete last token
  const m = val.match(/(\S*)$/);
  const tok = m[1];
  const prefix = val.slice(0, val.length - tok.length);

  // figure out base directory to look in
  let basePath = "";
  let fragment = tok;
  const lastSlash = tok.lastIndexOf("/");
  if (lastSlash >= 0) {
    basePath = tok.slice(0, lastSlash + 1);
    fragment = tok.slice(lastSlash + 1);
  }

  const { node } = resolve(basePath || ".");
  if (!node || node.type !== "dir") return;
  const matches = Object.keys(node.entries).filter((n) => n.startsWith(fragment));
  if (matches.length === 1) {
    const only = matches[0];
    const suffix = node.entries[only].type === "dir" ? "/" : "";
    input.value = prefix + basePath + only + suffix;
    sync();
  } else if (matches.length > 1) {
    printPrompt(val);
    print(matches.map((n) => (node.entries[n].type === "dir" ? `<span class="dir">${esc(n)}/</span>` : esc(n))).join("   "));
    // keep input as-is but extend common prefix
    let common = fragment;
    outer: for (let i = fragment.length; i < matches[0].length; i++) {
      const ch = matches[0][i];
      for (const m2 of matches) if (m2[i] !== ch) break outer;
      common += ch;
    }
    if (common !== fragment) {
      input.value = prefix + basePath + common;
      sync();
    }
  }
}

// ----- events -----
input.addEventListener("input", sync);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const v = input.value;
    printPrompt(v);
    input.value = "";
    sync();
    exec(v);
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    if (histIdx > 0) { histIdx--; input.value = history[histIdx]; sync(); }
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    if (histIdx < history.length - 1) { histIdx++; input.value = history[histIdx]; sync(); }
    else { histIdx = history.length; input.value = ""; sync(); }
  } else if (e.key === "Tab") {
    e.preventDefault();
    complete();
  } else if (e.key === "l" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    COMMANDS.clear();
  }
});

// clicks on output act as commands
document.addEventListener("click", (e) => {
  const t = e.target.closest("[data-cmd]");
  if (t) {
    e.preventDefault();
    const cmd = t.getAttribute("data-cmd");
    printPrompt(cmd);
    exec(cmd);
  }
});

// refocus prompt on any body click / "/" key
body.addEventListener("click", () => input.focus());
document.addEventListener("keydown", (e) => {
  if (e.key === "/" && document.activeElement !== input) {
    e.preventDefault();
    input.focus();
  }
});

// ----- boot -----
renderCwd();
print(
  [
    "<span class='dim'>webshell v0.1 · type <span class='ok'>help</span> to get started, or use the quick nav above.</span>",
    ""
  ].join("<br>")
);
COMMANDS.neofetch();
print("");
input.focus();
