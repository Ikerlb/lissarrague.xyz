+++
logoDirectory = "projects"
title = "day 2"
date = "2021-12-02"
categories = [
	"advent-of-code",
	"python",
	"clojure"
]
+++

you can find the description [here](https://adventofcode.com/2021/day/2)
and you can find the code [here](https://github.com/Ikerlb/AoC2021/tree/master/2)

for part one, it is a very straight forward simulation.

``` clojure
(defn step-part1 [x y cmd i]
  (cond
    (= cmd "forward") [(+ x i) y]
    (= cmd "up") [x (- y i)]
    :else [x (+ y i)]))
```

part two is very similar but we also need to keep track of the aim

``` clojure
(defn step-part2 [x y aim cmd i]
  (cond
    (= cmd "forward") [(+ x i) (- y (* aim i)) aim]
    (= cmd "up") [x y (+ aim i)]
    :else [x y (- aim i)]))	
```
