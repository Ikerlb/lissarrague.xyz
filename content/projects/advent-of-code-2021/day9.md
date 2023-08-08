+++
logoDirectory = "projects"
title = "day 9"
date = "2021-12-09"
categories = [
	"advent-of-code",
	"python",
]
+++

you can find the description [here](https://adventofcode.com/2021/day/9)
and you can find the code [here](https://github.com/Ikerlb/AoC2021/tree/master/9)

for part one, simply count the number of cells in which all neighbors are strictly greater.

for part two, floodfill until you have previously visited or until you find a height 9

``` python
def floodfill(grid, r, c):
    if grid[r][c] is None or grid[r][c] == 9: 
        return 0    
    s, grid[r][c] = 1, None
    for nr, nc in neighbors(grid, r, c):
        s += floodfill(grid, nr, nc)    
    return s
```
