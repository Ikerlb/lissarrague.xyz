+++
logoDirectory = "projects"
title = "day 4"
date = "2021-12-04"
categories = [
	"advent-of-code",
	"python",
]
+++

you can find the description [here](https://adventofcode.com/2021/day/4)
and you can find the code [here](https://github.com/Ikerlb/AoC2021/tree/master/4)

ok. this was fun!

for both parts, i just simulated all boards with a class.
only interesting thing is i kept track of all numbers contained in a board and added a rows and cols array, containing how many remaining numbers until a bingo in each row/col. this made it very easy to know if marking a number in a board yields a bingo.

``` python
class Board:
    def __init__(self, grid):
        n, m = len(grid), len(grid[0])
        self.elems = {grid[r][c]:(r, c) for r in range(n) for c in range(m)}
        self.rows = [m for _ in range(n)] 
        self.cols = [n for _ in range(m)]
            
    def mark(self, n):
        if n not in self.elems:
            return False
        
        r, c = self.elems[n]    
        del self.elems[n]
        self.rows[r] -= 1
        self.cols[c] -= 1
        return self.rows[r] == 0 or self.cols[c] == 0
```

for part one, just mark each board if it contains the number. if either the row or the column is all marked (board.rows[r] == 0 or board.cols[r] == 0) that board is the solution

for part two, just remove each board as it gets a bingo until to have no more boards left. the answer is the last board you removed
