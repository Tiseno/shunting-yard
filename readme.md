# Shunting Yard precedence parsing

An implementation of the [shunting yard algorithm](https://en.wikipedia.org/wiki/Shunting_yard_algorithm#The_algorithm_in_detail) by Dijkstra.

Needs deno.
```
$ make

deno run shunting-yard.ts "8 ** 3 . (r <= z != s * 5) /= z + h 17 >= fn a1 a2 ^ m < (8 - q) !! 8 ^^ i || 3 >>= y >> u ??? d / q ++ n  13 : v && l > 19 == 19"
{{{{{8**{3.({r<={z!={s*5}}})}}/={{z+{h 17}}>={{{fn a1 a2}^m}<{{({8-q})!!8}^^i}}}}||3}>>=y}>>{{{{u???d}/q}++{{n 13}:v}}&&{l>{19==19}}}}
8 ** 3 . (r <= z != s * 5) /= z + h 17 >= fn a1 a2 ^ m < (8 - q) !! 8 ^^ i || 3 >>= y >> u ??? d / q ++ n 13 : v && l > 19 == 19
                                                                                      >>
                                                                                >>= y                            &&
                                                                           || 3                      ++             l >
                           /=                                                                    / q         : v        19 == 19
8 **                                   >=                                                u ??? d        n 13
     3 .                      z +                      <
         (r <=           )        h 17             ^ m                ^^ i
               z !=                       fn a1 a2               !! 8
                    s * 5                                (8 - q)
```
