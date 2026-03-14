+++
logoDirectory = "projects"
title = "toy totp"
date = "2026-03-14"
categories = [
    "development",
    "security",
    "javascript",
    "cryptography",
]
+++

### what?
an interactive tool to visualize and understand how TOTP (time-based one-time passwords) work under the hood — the algorithm behind authenticator apps like google authenticator or authy.

### why?
  * i wanted to demystify how 2fa codes are generated
  * totp is elegant: it's basically just hmac-sha1 + a time window + some bit manipulation. it's worth seeing it laid out step by step.
  * building interactive visualizations is a fun way to solidify understanding

### links
  * [demo](https://lissarrague.xyz/toy-totp/)
