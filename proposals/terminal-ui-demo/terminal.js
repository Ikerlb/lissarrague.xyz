/* ----------------------------------------------------------------------------
 * lissarrague.xyz — terminal UI prototype
 *
 * vanilla JS, ~400 lines, no build step. designed to map 1:1 onto a hugo
 * partial: replace the `fs` constant below with a JSON file generated at
 * build time from `content/`, and replace the rendered file contents with
 * the page HTML hugo already produces.
 * -------------------------------------------------------------------------- */

(() => {
  "use strict";

  /* -------------------- mock filesystem -------------------- */
  /* mirrors the real `content/` layout. in the hugo integration this would
     be served as `/fs.json` generated at build time. */

  const fs = {
    "/": {
      type: "dir",
      children: ["about.txt", "contact.txt", "projects", "reading_log"],
    },

    "/about.txt": {
      type: "file",
      content: [
        "# about",
        "",
        "iker lissarrague — software engineer.",
        "",
        "i'm constantly looking for ways to make people's lives better with",
        "software. lately i've been focusing more on the backend of the stack",
        "but i've spent plenty of time as a fullstack developer too.",
        "",
        "i love trying out new technologies, especially programming languages",
        "that feel novel compared to what i'm used to.",
        "",
        "feel free to reach out — `cat contact.txt`.",
      ].join("\n"),
    },

    "/contact.txt": {
      type: "file",
      content: [
        "# contact",
        "",
        "  email     iker@lissarrague.xyz   (try: open email)",
        "  github    Ikerlb               (try: open github)",
        "  linkedin  iker-lissarrague     (try: open linkedin)",
      ].join("\n"),
    },

    "/projects": {
      type: "dir",
      children: [
        "toy-totp.md",
        "mandelrust.md",
        "go-ray-tracer.md",
        "rust-ray-tracer.md",
        "advent-of-code-2021",
      ],
    },
    "/projects/toy-totp.md": {
      type: "file",
      content: [
        "## toy totp",
        "",
        "an interactive tool to visualize how TOTP (the algorithm behind",
        "google authenticator / authy) works under the hood.",
        "",
        "› hmac-sha1 + a time window + some bit manipulation, laid out step",
        "  by step.",
        "",
        "demo: https://lissarrague.xyz/toy-totp/",
      ].join("\n"),
    },
    "/projects/mandelrust.md": {
      type: "file",
      content: [
        "## mandelrust",
        "",
        "a mandelbrot explorer written in rust, compiled to wasm and",
        "rendered to a canvas.",
        "",
        "demo: https://lissarrague.xyz/mandelrust/",
      ].join("\n"),
    },
    "/projects/go-ray-tracer.md": {
      type: "file",
      content: "## go ray tracer\n\na ray tracer in go. weekend project.",
    },
    "/projects/rust-ray-tracer.md": {
      type: "file",
      content: "## rust ray tracer\n\nthe same idea, but in rust. faster, prettier.",
    },
    "/projects/advent-of-code-2021": {
      type: "dir",
      children: ["day1.md", "day2.md", "day3.md", "...", "day12.md"],
    },

    "/reading_log": {
      type: "dir",
      children: ["2022.md", "2021.md"],
    },
    "/reading_log/2022.md": {
      type: "file",
      content: [
        "## 2022",
        "",
        "› terraform: up & running — really cool. good book.",
        "› building event-driven microservices — currently reading.",
        "› the man from the future — currently reading.",
        "› deep learning with python — currently reading.",
      ].join("\n"),
    },
    "/reading_log/2021.md": {
      type: "file",
      content: [
        "## 2021",
        "",
        "› designing data intensive applications — can't recommend it enough.",
        "› programming rust — love rust, great book.",
        "› learning go — book is ok, can't get excited about go.",
        "› the joy of clojure — really really good time.",
        "› purely functional data structures — would love a haskell version.",
      ].join("\n"),
    },
  };

  /* -------------------- state -------------------- */

  const state = {
    cwd: "/",
    history: [],
    historyIdx: -1,
  };

  const SOCIAL = {
    email: "mailto:iker@lissarrague.xyz",
    github: "https://github.com/Ikerlb/",
    linkedin: "https://www.linkedin.com/in/iker-lissarrague/",
  };

  /* -------------------- DOM refs -------------------- */

  const $output = document.getElementById("output");
  const $form = document.getElementById("prompt-form");
  const $input = document.getElementById("prompt-input");
  const $path = document.getElementById("prompt-path");
  const $terminal = document.getElementById("terminal");

  /* -------------------- path helpers -------------------- */

  function normalize(path) {
    if (!path.startsWith("/")) path = state.cwd.replace(/\/$/, "") + "/" + path;
    const parts = path.split("/").filter(Boolean);
    const out = [];
    for (const p of parts) {
      if (p === ".") continue;
      if (p === "..") out.pop();
      else out.push(p);
    }
    return "/" + out.join("/");
  }

  function exists(path) {
    return Object.prototype.hasOwnProperty.call(fs, path);
  }

  function displayPath(path) {
    if (path === "/") return "~";
    return "~" + path;
  }

  /* -------------------- output helpers -------------------- */

  function write(text, cls = "") {
    const div = document.createElement("div");
    div.className = "line" + (cls ? " " + cls : "");
    div.textContent = text;
    $output.appendChild(div);
    scrollToBottom();
  }

  function writeHTML(html, cls = "") {
    const div = document.createElement("div");
    div.className = "line" + (cls ? " " + cls : "");
    div.innerHTML = html;
    $output.appendChild(div);
    scrollToBottom();
  }

  function writeRule() {
    const hr = document.createElement("hr");
    hr.className = "rule";
    $output.appendChild(hr);
  }

  function scrollToBottom() {
    $output.scrollTop = $output.scrollHeight;
  }

  function escapeHTML(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  /* render plain text with `# heading`, bare URLs, and `code` */
  function renderContent(text) {
    const lines = text.split("\n");
    const html = lines.map((line) => {
      let l = escapeHTML(line);
      l = l.replace(
        /(https?:\/\/[^\s)]+)/g,
        '<a href="$1" target="_blank" rel="noopener">$1</a>'
      );
      if (/^### /.test(line)) return `<h3>${l.replace(/^### /, "")}</h3>`;
      if (/^## /.test(line))  return `<h2>${l.replace(/^## /, "")}</h2>`;
      if (/^# /.test(line))   return `<h1>${l.replace(/^# /, "")}</h1>`;
      return l;
    }).join("\n");
    writeHTML(html);
  }

  /* -------------------- commands -------------------- */

  const commands = {
    help() {
      writeHTML([
        "available commands:",
        "",
        "  <strong>help</strong>          show this message",
        "  <strong>ls</strong> [path]     list directory contents",
        "  <strong>cd</strong> &lt;path&gt;     change directory",
        "  <strong>pwd</strong>           print working directory",
        "  <strong>cat</strong> &lt;file&gt;    print file contents",
        "  <strong>clear</strong>         clear the screen",
        "  <strong>whoami</strong>        about me",
        "  <strong>history</strong>       show command history",
        "  <strong>theme</strong> &lt;name&gt;  green | amber | mono | light",
        "  <strong>crt</strong> on|off    toggle scanline effect",
        "  <strong>open</strong> &lt;name&gt;   open social link (github, linkedin, email)",
        "  <strong>echo</strong> &lt;text&gt;   echo arguments",
        "  <strong>date</strong>          current date/time",
        "",
        "tip: use ↑/↓ for history, tab for completion. you can also click",
        "the nav above instead of typing.",
      ].join("\n"));
    },

    ls(args) {
      const target = args[0] ? normalize(args[0]) : state.cwd;
      if (!exists(target)) return write(`ls: ${target}: no such file or directory`, "line--err");
      const node = fs[target];
      if (node.type !== "dir") return write(target.split("/").pop(), "");
      const items = node.children.map((name) => {
        const childPath = (target === "/" ? "" : target) + "/" + name;
        const child = fs[childPath];
        const isDir = child && child.type === "dir";
        return isDir ? `<span class="line--ok">${name}/</span>` : name;
      });
      writeHTML(items.join("  "));
    },

    cd(args) {
      const target = args[0] ? normalize(args[0]) : "/";
      if (!exists(target)) return write(`cd: ${target}: no such file or directory`, "line--err");
      if (fs[target].type !== "dir") return write(`cd: ${target}: not a directory`, "line--err");
      state.cwd = target;
      $path.textContent = displayPath(target);
      // in the hugo integration: history.pushState + fetch the page
    },

    pwd() {
      write(state.cwd);
    },

    cat(args) {
      if (!args[0]) return write("usage: cat <file>", "line--warn");
      const target = normalize(args[0]);
      if (!exists(target)) return write(`cat: ${target}: no such file`, "line--err");
      const node = fs[target];
      if (node.type !== "file") return write(`cat: ${target}: is a directory`, "line--err");
      renderContent(node.content);
    },

    clear() {
      $output.innerHTML = "";
    },

    whoami() {
      commands.cat(["/about.txt"]);
    },

    history() {
      state.history.forEach((cmd, i) => write(`  ${String(i + 1).padStart(3)}  ${cmd}`));
    },

    theme(args) {
      const name = args[0];
      const valid = ["green", "amber", "mono", "light"];
      if (!valid.includes(name)) {
        return write(`theme: pick one of: ${valid.join(", ")}`, "line--warn");
      }
      document.body.dataset.theme = name;
      try { localStorage.setItem("term-theme", name); } catch {}
      write(`theme set to ${name}`, "line--ok");
    },

    crt(args) {
      const v = args[0];
      if (v !== "on" && v !== "off") return write("usage: crt on|off", "line--warn");
      document.body.dataset.crt = v;
      try { localStorage.setItem("term-crt", v); } catch {}
      write(`crt ${v}`, "line--ok");
    },

    open(args) {
      const name = args[0];
      if (!SOCIAL[name]) return write(`open: unknown target '${name}'. try: ${Object.keys(SOCIAL).join(", ")}`, "line--err");
      window.open(SOCIAL[name], "_blank", "noopener");
      write(`opening ${name}…`, "line--ok");
    },

    echo(args) {
      write(args.join(" "));
    },

    date() {
      write(new Date().toString());
    },

    sudo() {
      write("permission denied: nice try.", "line--err");
    },
  };

  /* -------------------- parser & runner -------------------- */

  function run(raw) {
    const line = raw.trim();
    if (!line) return;

    state.history.push(line);
    state.historyIdx = state.history.length;

    // echo the prompt + command into the output area
    const promptPath = displayPath(state.cwd);
    writeHTML(
      `<span class="echo-prompt">iker@lissarrague:${escapeHTML(promptPath)}$ </span>${escapeHTML(line)}`,
      "line--cmd"
    );

    const [cmd, ...args] = line.split(/\s+/);
    const fn = commands[cmd];
    if (!fn) {
      write(`${cmd}: command not found. type 'help' for available commands.`, "line--err");
      return;
    }
    try {
      fn(args);
    } catch (e) {
      write(`error: ${e.message}`, "line--err");
    }
  }

  /* -------------------- tab completion -------------------- */

  function complete(value) {
    const parts = value.split(/\s+/);
    const last = parts[parts.length - 1];
    // command completion (first token)
    if (parts.length === 1) {
      const matches = Object.keys(commands).filter((c) => c.startsWith(last));
      if (matches.length === 1) parts[0] = matches[0] + " ";
      else if (matches.length > 1) write(matches.join("  "));
      return parts.join(" ");
    }
    // path completion
    const slash = last.lastIndexOf("/");
    const dirPart = slash >= 0 ? last.slice(0, slash + 1) : "";
    const basePart = slash >= 0 ? last.slice(slash + 1) : last;
    const dirAbs = normalize(dirPart || ".");
    if (!exists(dirAbs) || fs[dirAbs].type !== "dir") return value;
    const matches = fs[dirAbs].children.filter((c) => c.startsWith(basePart));
    if (matches.length === 1) {
      parts[parts.length - 1] = dirPart + matches[0];
      return parts.join(" ");
    } else if (matches.length > 1) {
      write(matches.join("  "));
    }
    return value;
  }

  /* -------------------- event wiring -------------------- */

  $form.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = $input.value;
    $input.value = "";
    run(value);
  });

  $input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (state.historyIdx > 0) state.historyIdx--;
      $input.value = state.history[state.historyIdx] ?? "";
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (state.historyIdx < state.history.length - 1) {
        state.historyIdx++;
        $input.value = state.history[state.historyIdx];
      } else {
        state.historyIdx = state.history.length;
        $input.value = "";
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      $input.value = complete($input.value);
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      commands.clear();
    }
  });

  // click anywhere in the terminal to refocus the prompt
  $terminal.addEventListener("click", (e) => {
    if (e.target.tagName === "A") return;
    $input.focus();
  });

  // nav links: dispatch the data-cmd as if it were typed
  document.querySelectorAll(".nav a[data-cmd]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      run(a.dataset.cmd);
      $input.focus();
    });
  });

  /* -------------------- boot -------------------- */

  (function boot() {
    try {
      const t = localStorage.getItem("term-theme");
      if (t) document.body.dataset.theme = t;
      const c = localStorage.getItem("term-crt");
      if (c) document.body.dataset.crt = c;
    } catch {}

    const banner =
`  _ _
 | (_)___ ___  __ _ _ __ _ __ __ _  __ _ _   _  ___
 | | / __/ __|/ _\` | '__| '__/ _\` |/ _\` | | | |/ _ \\
 | | \\__ \\__ \\ (_| | |  | | | (_| | (_| | |_| |  __/
 |_|_|___/___/\\__,_|_|  |_|  \\__,_|\\__, |\\__,_|\\___|
                                   |___/   . x y z     `;

    const div = document.createElement("pre");
    div.className = "ascii";
    div.textContent = banner;
    $output.appendChild(div);

    write("welcome. this is a terminal-themed personal site.");
    write("type 'help' to see what you can do, or just click the nav above.");
    writeRule();

    $path.textContent = displayPath(state.cwd);
    $input.focus();
  })();
})();
