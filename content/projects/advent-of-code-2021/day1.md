+++
logoDirectory = "projects"
title = "day 1"
date = "2021-12-01"
categories = [
	"advent-of-code",
	"python",
	"clojure"
]
+++

you can find the description [here](https://adventofcode.com/2021/day/1)
and you can find the code [here](https://github.com/Ikerlb/AoC2021/tree/master/1)

well my solution uses a very simple (fixed size) sliding window technique, with the first part being a size 1 window and the second part a size 3 window. 


``` python
def solve(l: [int], k: int):
    s = sum(l[:k])    
    res = 0
    for i in range(k, len(l)):
        ss = s - l[i - k] + l[i]
        res += s < ss
        s = ss
    return res
```
