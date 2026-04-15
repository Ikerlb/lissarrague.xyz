// Virtual filesystem mirroring the real site. In production, this object
// would be generated at Hugo build time from .Site.Pages. For the demo
// it's hardcoded.
//
// Shape:
//   type: "dir"  -> entries: { name -> node }
//   type: "file" -> content: string, url?: string (real URL to "open")
//   type: "link" -> url: string (external; opens in new tab)

window.FS = {
  type: "dir",
  entries: {
    "about.md": {
      type: "file",
      url: "/about/",
      content:
        "# about\n" +
        "iker lissarrague — software engineer.\n\n" +
        "- constantly looking for ways to make people's lives better with software.\n" +
        "- lately focused on the backend; comfortable doing fullstack.\n" +
        "- loves trying novel programming languages.\n" +
        "- feel free to reach out.\n"
    },
    "contact.txt": {
      type: "file",
      content:
        "email:    iker@lissarrague.xyz\n" +
        "github:   https://github.com/Ikerlb/\n" +
        "linkedin: https://www.linkedin.com/in/iker-lissarrague/\n"
    },
    "reading_log": {
      type: "dir",
      entries: {
        "2021.md": {
          type: "file",
          url: "/reading_log/",
          content:
            "# reading log — 2021\n" +
            "- Terraform: Up & Running\n" +
            "- Building Microservices\n"
        },
        "2022.md": {
          type: "file",
          url: "/reading_log/",
          content:
            "# reading log — 2022\n" +
            "- The Rust Programming Language\n" +
            "- The Go Programming Language\n" +
            "- Clojure for the Brave and True\n"
        }
      }
    },
    "projects": {
      type: "dir",
      entries: {
        "mandelrust.md": {
          type: "file",
          url: "/projects/mandelrust/",
          content:
            "# mandelrust\n" +
            "Interactive Mandelbrot renderer written in Rust, compiled to WASM.\n" +
            "Run `open mandelrust.md` to launch it."
        },
        "rust-ray-tracer.md": {
          type: "file",
          url: "/projects/rust-ray-tracer/",
          content: "# rust-ray-tracer\nA ray tracer written in Rust, following 'Ray Tracing in One Weekend'."
        },
        "go-ray-tracer.md": {
          type: "file",
          url: "/projects/go-ray-tracer/",
          content: "# go-ray-tracer\nA ray tracer written in Go. Same book, different language."
        },
        "toy-totp.md": {
          type: "file",
          url: "/projects/toy-totp/",
          content: "# toy-totp\nA minimal TOTP implementation for learning purposes."
        },
        "advent-of-code-2021": {
          type: "dir",
          entries: {
            "README.md": {
              type: "file",
              url: "/projects/advent-of-code-2021/",
              content: "# advent of code 2021\n12 days of solutions. See the index page for each day."
            }
          }
        }
      }
    },
    "github.link": {
      type: "link",
      url: "https://github.com/Ikerlb/"
    },
    "linkedin.link": {
      type: "link",
      url: "https://www.linkedin.com/in/iker-lissarrague/"
    }
  }
};
