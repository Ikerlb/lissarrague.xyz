+++
logoDirectory = "projects"
title = "day 5"
date = "2021-12-05"
categories = [
	"advent-of-code",
	"python",
]
+++

you can find the description [here](https://adventofcode.com/2021/day/5)
and you can find the code [here](https://github.com/Ikerlb/AoC2021/tree/master/5)

nothing interesting for this problem. just walk from p1 to p2 and add all the points you walk to a counter. for part one, simply filter those who are diagonal (start[1] == end[1] or start[0] == end[0])

for part two, don't filter.

``` python
def span(p1, p2):
    sx, sy = p1 
    ex, ey = p2
    dx = delta(sx, ex)
    dy = delta(sy, ey)
    while p1 != p2:
        yield p1    
        p1 = (p1[0] + dx, p1[1] + dy)
    yield p1

def count_points(segments):
    c = Counter()
    for p1, p2 in segments:
        for p in span(p1, p2):
            c[p] += 1
    return c
```
