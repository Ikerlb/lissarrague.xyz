+++
logoDirectory = "projects"
title = "day 6"
date = "2021-12-06"
categories = [
	"advent-of-code",
	"python",
]
+++

you can find the description [here](https://adventofcode.com/2021/day/6)
and you can find the code [here](https://github.com/Ikerlb/AoC2021/tree/master/6)

this was very fun!

my first solution consisted on a simple simulation on a double ended queue. this solution is linear on the number of days and it handles both parts without a problem.

``` python
# mutates q
def step(q):
    n, last = q[0], q.pop()    
    q[-1] += n
    q.append(last)
    q.rotate(-1)
```

however, it ocurred to me while working, that i could simply simulate a single step of this as a matrix multiplication. and well, if you have repeated matrix multiplication, you have matrix exponentation. and if you have matrix exponentiation you have **fast** matrix exponentiation. 

the (relatively) hard part of this is modeling the matrix but if you stare at the problem long enough you'll come up with the following matrix (or this matrix transposed)

``` python
[[0, 0, 0, 0, 0, 0, 1, 0, 1],
 [1, 0, 0, 0, 0, 0, 0, 0, 0],
 [0, 1, 0, 0, 0, 0, 0, 0, 0],
 [0, 0, 1, 0, 0, 0, 0, 0, 0],
 [0, 0, 0, 1, 0, 0, 0, 0, 0],
 [0, 0, 0, 0, 1, 0, 0, 0, 0],
 [0, 0, 0, 0, 0, 1, 0, 0, 0],
 [0, 0, 0, 0, 0, 0, 1, 0, 0],
 [0, 0, 0, 0, 0, 0, 0, 1, 0]]
```

so my second solution looks like this and its time complexity is logarithmic on the number of days (aka as blazing fast):

``` python
def prod(X, Y):
    return [[sum(a*b for a,b in zip(X_row,Y_col)) for Y_col in zip(*Y)] for X_row in X]

def _pow(m, k):
    if k == 1:
        return m
    elif k % 2 == 0:
        half = _pow(m, k >> 1)
        return prod(half, half)
    else:
        half = _pow(m, k >> 1)
        return prod(half, prod(half, m))
```
