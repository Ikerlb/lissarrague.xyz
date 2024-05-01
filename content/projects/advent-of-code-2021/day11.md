+++
logoDirectory = "projects"
title = "day 11"
date = "2021-12-11"
categories = [
	"advent-of-code",
	"python",
]
+++

you can find the description [here](https://adventofcode.com/2021/day/11)
and you can find the code [here](https://github.com/Ikerlb/AoC2021/tree/master/11)

the only thing we have to be careful about in this problem is avoid counting octopuses more than once

but otherwise, just simulate the steps

here's the step function i used, that returns the number of flashes that happened during each time period

``` python
# mutates grid
def step(grid):
    n, m = len(grid), len(grid[0])
    s = []
    for r, c in product(range(n), range(m)):   
        grid[r][c] += 1        
        if grid[r][c] == 10: 
            s.extend(neighbors(grid, r, c))
    while s:
        r, c = s.pop()    
        grid[r][c] += 1   
        if grid[r][c] == 10:
            s.extend(neighbors(grid, r, c))    

    flashes = 0
    for r, c in product(range(n), range(m)):
        if grid[r][c] > 9:
            grid[r][c] = 0    
            flashes += 1
    return flashes
```


