+++
logoDirectory = "projects"
title = "day 12"
date = "2021-12-12"
categories = [
	"advent-of-code",
	"python",
]
+++

you can find the description [here](https://adventofcode.com/2021/day/12)
and you can find the code [here](https://github.com/Ikerlb/AoC2021/tree/master/12)

as long as there are no upper-cased direct loops (ie, A - B), simple dfs works for both cases:

for part 1:

``` python
def dfs1(g, node, visited):
    if node == "end":
        return 1
    res = 0
    for nn in g[node]:    
        if nn.isupper() or nn not in visited:
            visited.add(nn) 
            res += dfs1(g, nn, visited)
            visited.discard(nn)    
    return res
```

for part 2:

``` python
def dfs2(g, node, visited, used):
    if node == "end":        
        return 1
    res = 0
    for nn in g[node]:
        if nn.isupper():    
            res += dfs2(g, nn, visited, used)    
        elif nn in visited and nn != "start" and not used:
            res += dfs2(g, nn, visited, True)
        elif nn not in visited:
            visited.add(nn)
            res += dfs2(g, nn, visited, used)
            visited.discard(nn)
    return res
```

