+++
logoDirectory = "projects"
title = "day 3"
date = "2021-12-03"
categories = [
	"advent-of-code",
	"python",
	"clojure"
]
+++

you can find the description [here](https://adventofcode.com/2021/day/3)
and you can find the code [here](https://github.com/Ikerlb/AoC2021/tree/master/3)

to solve each part, we basically need a function that can give us the number of bits turned on for a certain digit index:

``` python
def count_by_index(nums, i):
    total = len(nums)
    res = ones = 0
    for n in nums:            
        if (n >> i) & 1:
            ones += 1    
    return ones, total - ones  
```

you can get the gamma rate by simply iterating over each possible index and assigning that index to be the digit of the **most** common digit of all numbers for that index.

analogously, you get epsilon rate by iterating over each possible index and assigning that index to be the digit of the **least** common digit of all numbers for that index.

``` python
# md is the max index of digits
def rate(nums, f, md): 
    res = 0
    for i in range(md, -1, -1):
        o, z = count_by_index(nums, i)
        if f(o, z) == o:
            res += (1 << i)
    return res
```

for the second part, you need to keep filtering by the most or least common digit for each index (depending on the measurement) and return the number that remains.

``` python
# md is the max index of digits
def filter_by(nums, f, md):
    n, i = len(nums), md
    while len(nums) > 1 and i >= 0:
        o, z = count_by_index(nums, i)
        s = f(o, z)
        nums = [n for n in nums if ((n >> i) & 1) == s] 
        i -= 1
    return nums.pop()
```

