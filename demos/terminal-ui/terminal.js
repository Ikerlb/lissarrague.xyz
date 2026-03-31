/* ============================================
   Terminal Portfolio - JS
   ============================================ */

(function () {
  "use strict";

  const ASCII_BANNER = `
<span class="ascii-art"> _ _
| (_)___ ___  __ _ _ __ _ __ __ _  __ _ _   _  ___
| | / __/ __|/ _\` | '__| '__/ _\` |/ _\` | | | |/ _ \\
| | \\__ \\__ \\ (_| | |  | | | (_| | (_| | |_| |  __/
|_|_|___/___/\\__,_|_|  |_|  \\__,_|\\__, |\\__,_|\\___|
                                   |___/             </span>`;

  // --- Site content (would come from Hugo in real build) ---
  const CONTENT = {
    about: [
      "i'm <span class='text-accent'>iker lissarrague</span>, a software engineer constantly looking",
      "for ways to make people's lives better with software.",
      "",
      "as of late, i've been focusing more and more on the backend of the",
      "stack but i've had some experience as a fullstack developer.",
      "",
      "i love trying out new technologies, specially programming languages",
      "that feel very novel from what i'm used to.",
      "",
      "feel free to reach out! type <span class='text-green'>contact</span> to see how.",
    ],
    projects: [
      "<span class='text-dim'>drwxr-xr-x  projects/</span>",
      "",
      '<div class="listing-row"><span class="listing-date">2026-03-14</span><span class="listing-name" onclick="terminalExec(\'open toy-totp\')">toy-totp</span></div>',
      '<div class="listing-row"><span class="listing-date">2022-01-01</span><span class="listing-name" onclick="terminalExec(\'open advent-of-code-2021\')">advent-of-code-2021</span></div>',
      '<div class="listing-row"><span class="listing-date">2021-09-15</span><span class="listing-name" onclick="terminalExec(\'open rust-ray-tracer\')">rust-ray-tracer</span></div>',
      '<div class="listing-row"><span class="listing-date">2021-06-01</span><span class="listing-name" onclick="terminalExec(\'open go-ray-tracer\')">go-ray-tracer</span></div>',
      '<div class="listing-row"><span class="listing-date">2021-03-01</span><span class="listing-name" onclick="terminalExec(\'open mandelrust\')">mandelrust</span></div>',
      "",
      "<span class='text-dim'>click a project or type: open &lt;project-name&gt;</span>",
    ],
    "toy-totp": [
      "<span class='text-accent'>toy-totp</span> <span class='text-dim'>// 2026-03-14</span>",
      "",
      "an interactive TOTP (time-based one-time password) algorithm",
      "visualizer built in vanilla JavaScript. demonstrates how the",
      "TOTP algorithm works step-by-step.",
      "",
      "<span class='text-dim'>tags: javascript, cryptography, interactive</span>",
    ],
    "rust-ray-tracer": [
      "<span class='text-accent'>rust-ray-tracer</span> <span class='text-dim'>// 2021-09-15</span>",
      "",
      "a ray tracer implemented in Rust, leveraging Rayon for",
      "parallelized rendering. follows \"Ray Tracing in One Weekend\".",
      "",
      "<span class='text-dim'>tags: rust, graphics, rayon</span>",
    ],
    "go-ray-tracer": [
      "<span class='text-accent'>go-ray-tracer</span> <span class='text-dim'>// 2021-06-01</span>",
      "",
      "earlier implementation of a ray tracer in Go.",
      "",
      "<span class='text-dim'>tags: go, graphics</span>",
    ],
    mandelrust: [
      "<span class='text-accent'>mandelrust</span> <span class='text-dim'>// 2021-03-01</span>",
      "",
      "mandelbrot set visualization powered by AWS Lambda, written",
      "in Rust with Terraform for infrastructure.",
      "",
      "<span class='text-dim'>tags: rust, aws-lambda, terraform, fractals</span>",
    ],
    "advent-of-code-2021": [
      "<span class='text-accent'>advent-of-code-2021</span> <span class='text-dim'>// 2022-01-01</span>",
      "",
      "solutions and write-ups for Advent of Code 2021, solved in",
      "Python and Clojure. 12 daily challenges documented.",
      "",
      "<span class='text-dim'>tags: python, clojure, algorithms</span>",
    ],
    "reading-log": [
      "<span class='text-dim'>-rw-r--r--  reading_log.txt</span>",
      "",
      "<span class='text-warn'>2022</span>",
      "  - Designing Data-Intensive Applications (Kleppmann)",
      "  - Hands-On Machine Learning (Geron)",
      "  - System Design Interview (Xu)",
      "",
      "<span class='text-warn'>2021</span>",
      "  - The Rust Programming Language (Klabnik & Nichols)",
      "  - Programming in Go (Summerfield)",
      "  - Clojure for the Brave and True (Higginbotham)",
      "  - Infrastructure as Code (Morris)",
    ],
    contact: [
      "<span class='text-accent'>--- contact ---</span>",
      "",
      "  <span class='text-green'>email</span>    <a href='mailto:iker@lissarrague.xyz'>iker@lissarrague.xyz</a>",
      "  <span class='text-green'>github</span>   <a href='https://github.com/Ikerlb/' target='_blank'>github.com/Ikerlb</a>",
      "  <span class='text-green'>linkedin</span> <a href='https://www.linkedin.com/in/iker-lissarrague/' target='_blank'>linkedin.com/in/iker-lissarrague</a>",
    ],
  };

  const HELP_TEXT = [
    "<span class='text-accent'>available commands:</span>",
    "",
    "  <span class='text-green'>about</span>          who i am",
    "  <span class='text-green'>projects</span>       list my projects",
    "  <span class='text-green'>open</span> <span class='text-dim'>&lt;name&gt;</span>    view a project",
    "  <span class='text-green'>reading-log</span>    books i've read",
    "  <span class='text-green'>contact</span>        how to reach me",
    "  <span class='text-green'>theme</span>          toggle light/dark mode",
    "  <span class='text-green'>clear</span>          clear the terminal",
    "  <span class='text-green'>help</span>           show this message",
    "",
    "<span class='text-dim'>tip: click the buttons below the terminal, or just type!</span>",
  ];

  // --- DOM refs ---
  const output = document.getElementById("output");
  const input = document.getElementById("command-input");
  const terminalBody = document.getElementById("terminal-body");
  const cursorBlock = document.getElementById("cursor-block");
  const promptPath = document.getElementById("prompt-path");

  let commandHistory = [];
  let historyIndex = -1;
  let currentPath = "~";

  // --- Helpers ---

  function scrollToBottom() {
    terminalBody.scrollTop = terminalBody.scrollHeight;
  }

  function appendBlock(html) {
    const div = document.createElement("div");
    div.className = "output-block";
    div.innerHTML = html;
    output.appendChild(div);
    scrollToBottom();
  }

  function renderPrompt(cmd) {
    return `<span class="prompt">visitor@lissarrague.xyz<span class="prompt-separator">:</span><span class="prompt-path">${currentPath}</span><span class="prompt-dollar">$</span></span> <span class="output-command">${escapeHtml(cmd)}</span>`;
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function outputLines(lines) {
    return `<div class="output-text">${lines.join("\n")}</div>`;
  }

  // --- Command processing ---

  function processCommand(raw) {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;

    commandHistory.push(raw);
    historyIndex = commandHistory.length;

    // Show the command that was entered
    appendBlock(renderPrompt(raw));

    if (cmd === "help" || cmd === "?") {
      appendBlock(outputLines(HELP_TEXT));
    } else if (cmd === "about" || cmd === "whoami") {
      appendBlock(outputLines(CONTENT.about));
    } else if (cmd === "projects" || cmd === "ls projects") {
      currentPath = "~/projects";
      promptPath.textContent = currentPath;
      appendBlock(outputLines(CONTENT.projects));
    } else if (cmd === "reading-log" || cmd === "reading" || cmd === "books") {
      appendBlock(outputLines(CONTENT["reading-log"]));
    } else if (cmd === "contact" || cmd === "email") {
      appendBlock(outputLines(CONTENT.contact));
    } else if (cmd === "theme" || cmd === "toggle theme") {
      toggleTheme();
      appendBlock(
        outputLines([
          `<span class="text-dim">theme switched to ${document.documentElement.getAttribute("data-theme")} mode</span>`,
        ])
      );
    } else if (cmd === "clear" || cmd === "cls") {
      output.innerHTML = "";
      currentPath = "~";
      promptPath.textContent = currentPath;
    } else if (cmd.startsWith("open ")) {
      const project = cmd.slice(5).trim();
      if (CONTENT[project]) {
        currentPath = `~/projects/${project}`;
        promptPath.textContent = currentPath;
        appendBlock(outputLines(CONTENT[project]));
      } else {
        appendBlock(
          outputLines([
            `<span class="text-error">project not found: ${escapeHtml(project)}</span>`,
            `<span class="text-dim">type 'projects' to see available projects</span>`,
          ])
        );
      }
    } else if (cmd === "cd ~" || cmd === "cd" || cmd === "home") {
      currentPath = "~";
      promptPath.textContent = currentPath;
    } else if (cmd === "cd .." || cmd === "back") {
      if (currentPath.includes("/")) {
        currentPath = currentPath.substring(0, currentPath.lastIndexOf("/"));
      } else {
        currentPath = "~";
      }
      promptPath.textContent = currentPath;
    } else {
      appendBlock(
        outputLines([
          `<span class="text-error">command not found: ${escapeHtml(cmd)}</span>`,
          `<span class="text-dim">type 'help' for available commands</span>`,
        ])
      );
    }

    scrollToBottom();
  }

  // Expose for onclick handlers in project listings
  window.terminalExec = function (cmd) {
    processCommand(cmd);
  };

  // --- Theme toggle ---

  function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute("data-theme");
    html.setAttribute("data-theme", current === "dark" ? "light" : "dark");
  }

  // --- Cursor positioning ---

  function updateCursorPosition() {
    // Create a hidden span to measure text width
    const measure = document.createElement("span");
    measure.style.visibility = "hidden";
    measure.style.position = "absolute";
    measure.style.whiteSpace = "pre";
    measure.style.font = getComputedStyle(input).font;
    measure.textContent = input.value.substring(0, input.selectionStart);
    document.body.appendChild(measure);
    const inputRect = input.getBoundingClientRect();
    const textWidth = measure.getBoundingClientRect().width;
    document.body.removeChild(measure);
    cursorBlock.style.left = (input.offsetLeft + textWidth) + "px";
  }

  // --- Event listeners ---

  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      processCommand(input.value);
      input.value = "";
      updateCursorPosition();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex > 0) {
        historyIndex--;
        input.value = commandHistory[historyIndex];
        updateCursorPosition();
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex < commandHistory.length - 1) {
        historyIndex++;
        input.value = commandHistory[historyIndex];
      } else {
        historyIndex = commandHistory.length;
        input.value = "";
      }
      updateCursorPosition();
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      processCommand("clear");
      input.value = "";
    }
  });

  input.addEventListener("input", updateCursorPosition);
  input.addEventListener("click", updateCursorPosition);

  // Keep input focused
  terminalBody.addEventListener("click", function (e) {
    if (!e.target.closest("a") && !e.target.closest(".listing-name")) {
      input.focus();
    }
  });

  // Hint buttons
  document.querySelectorAll(".hint-cmd").forEach(function (btn) {
    btn.addEventListener("click", function () {
      processCommand(btn.getAttribute("data-cmd"));
      input.focus();
    });
  });

  // --- Welcome message ---

  function showWelcome() {
    appendBlock(ASCII_BANNER);
    appendBlock(
      outputLines([
        "",
        "welcome to <span class='text-accent'>lissarrague.xyz</span>",
        "",
        "<span class='text-dim'>type</span> <span class='text-green'>help</span> <span class='text-dim'>for commands, or click the buttons below.</span>",
        "",
      ])
    );
    updateCursorPosition();
  }

  showWelcome();
  input.focus();
})();
