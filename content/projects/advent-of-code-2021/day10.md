+++
logoDirectory = "projects"
title = "day 10"
date = "2021-12-10"
categories = [
	"advent-of-code",
	"python",
]
+++

you can find the description [here](https://adventofcode.com/2021/day/10)
and you can find the code [here](https://github.com/Ikerlb/AoC2021/tree/master/10)

using a stack, you can figure out exactly where does the string become invalid, if at all

``` python
m = {"{":"}", "(":")", "[":"]", "<":">"}
def parse(l):
    s = []
    for c in l:
        if c in m:
            s.append(c)    
        elif s and m[s[-1]] == c:
            s.pop()
        else:
            return s, c
    return s, None
```

if the stack is not empty at the end, it means it is incomplete and that the only way to complete it would be to reverse the stack and append it to the original string


``` python
mm = {"(":1, "[":2, "{":3, "<":4}
def encode(s):
    rr = 0
    # reversed because it is a stack
    for c in reversed(s):
        rr *= 5
        rr += mm[c]
    return rr
```

