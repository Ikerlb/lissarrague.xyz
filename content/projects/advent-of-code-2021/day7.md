+++
logoDirectory = "projects"
title = "day 7"
date = "2021-12-07"
categories = [
	"advent-of-code",
	"python",
]
+++

you can find the description [here](https://adventofcode.com/2021/day/7)
and you can find the code [here](https://github.com/Ikerlb/AoC2021/tree/master/7)


``` python
def cost(l, n, f):
    return sum(f(e, n) for e in l)
```

for the first part, the solution is the median.

``` python
def median(l):
    return l[len(l) >> 1]

def part1(l):
    m = median(l)
    return cost(l, m, lambda x, y: abs(x - y))
```

for the second part, the solution is the average.

``` python
def part2(l):
    avg = sum(l) / len(l)
    f = lambda x, y: gauss(abs(x - y))
    return min(cost(l, ceil(avg), f), cost(l, floor(avg), f)) 
```
