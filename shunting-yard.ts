// Implementation of the shunting yard algorithm for operator precedence parsing
// https://en.wikipedia.org/wiki/Shunting_yard_algorithm
interface LPar {
  t: "LPar"
  s: "("
}

interface RPar {
  t: "RPar"
  s: ")"
}

interface Num {
  t: "Num"
  n: number
}

interface Op {
  t: "Op"
  s: string
}

interface Id {
  t: "Id"
  s: string
}

type Token = LPar | RPar | Num | Op | Id

const tokenizeOne = (s: string): [Token[], string] => {
  const spaceMatch = s.match(/^(\s+)(.*)$/)
  if (spaceMatch) {
    const [_1, _2, rest] = spaceMatch
    return [[], rest]
  }

  if (s[0] === "(") {
    const t: Token[] = [{ t: "LPar", s: "(" }]
    return [t, s.slice(1)]
  }

  if (s[0] === ")") {
    const t: Token[] = [{ t: "RPar", s: ")" }]
    return [t, s.slice(1)]
  }

  const numMatch = s.match(/^([0-9]+)(.*)$/)
  if (numMatch) {
    const [_, n, rest] = numMatch
    const t: Token[] = [{ t: "Num", n: Number(n) }]
    return [t, rest]
  }

  const opMatch = s.match(/^([!.^*/+\-:=<>&|$!#¤%?@£€¥~§½¶]+)(.*)$/)
  if (opMatch) {
    const [_, s, rest] = opMatch
    const t: Token[] = [{ t: "Op", s }]
    return [t, rest]
  }

  const idMatch = s.match(/^([a-zA-Z][_0-9A-Za-z]*)(.*)$/)
  if (idMatch) {
    const [_, s, rest] = idMatch
    const t: Token[] = [{ t: "Id", s }]
    return [t, rest]
  }

  throw Error("Could not parse input beginning with" + s[0])
}

const tokenize = (s: string) => {
  let left = s
  let tokens: Token[] = []
  while (left.length > 0) {
    const [newTokens, rest] = tokenizeOne(left)
    left = rest
    tokens = [...tokens, ...newTokens]
  }
  return tokens
}

type Assoc = "L" | "R" | "N"

type OpDefinition = { precedence: number; association: Assoc }

// https://www.haskell.org/onlinereport/decls.html#fixity
const opDefs: Record<string, OpDefinition> = {
  "!!": { precedence: 9, association: "L" },
  ".": { precedence: 9, association: "R" },
  "^": { precedence: 8, association: "R" },
  "^^": { precedence: 8, association: "R" },
  "**": { precedence: 8, association: "R" },
  "*": { precedence: 7, association: "L" },
  "/": { precedence: 7, association: "L" },
  "+": { precedence: 6, association: "L" },
  "-": { precedence: 6, association: "L" },
  ":": { precedence: 5, association: "R" },
  "++": { precedence: 5, association: "R" },
  "==": { precedence: 4, association: "N" },
  "!=": { precedence: 4, association: "N" },
  "/=": { precedence: 4, association: "N" },
  "<": { precedence: 4, association: "N" },
  "<=": { precedence: 4, association: "N" },
  ">": { precedence: 4, association: "N" },
  ">=": { precedence: 4, association: "N" },
  "&&": { precedence: 3, association: "R" },
  "||": { precedence: 2, association: "R" },
  ">>": { precedence: 1, association: "L" },
  ">>=": { precedence: 1, association: "L" },
  $: { precedence: 0, association: "R" },
  "$!": { precedence: 0, association: "R" },
}

const opDef = (op: Op): OpDefinition => {
  return opDefs[op.s] ? opDefs[op.s] : { precedence: 10, association: "L" }
}

const topp = <T>(a: T[]): T => a[a.length - 1]

interface App {
  t: "App"
  fn: Expr
  args: Expr[] // Should probably just have one arg but whatever
}

interface Enclosed {
  t: "Enclosed"
  e: Expr
}

interface OpApp {
  t: "OpApp"
  e1: Expr
  op: Op
  e2: Expr
}

type Expr = Num | Id | App | Enclosed | OpApp

// Loosely follows https://en.wikipedia.org/wiki/Shunting_yard_algorithm#The_algorithm_in_detail
// We have ML style function application instead of comma separation,
// we handle parenthesis with a recursion,
// and we build a tree directly
const shuntingYard = (start: number, input: Token[]): [Expr[], number] => {
  const output: Expr[] = []
  const operatorStack: Op[] = []

  const pushExpression = () => {
    const e2 = output.pop()
    const e1 = output.pop()
    const op = operatorStack.pop()
    if (e1 === undefined || op === undefined || e2 === undefined) {
      throw new Error(`Unbalanced expressions; e1(${e1}) op(${op}) e2(${e2})`)
    }
    output.push({ t: "OpApp", e1, op, e2 })
  }

  let i = start
  for (; i < input.length; i++) {
    const token = input[i]
    switch (token.t) {
      case "Num": {
        output.push(token)
        continue
      }
      case "Op": {
        while (
          operatorStack.length > 0 &&
          (opDef(topp(operatorStack)).precedence > opDef(token).precedence ||
            (opDef(token).association === "L" && opDef(topp(operatorStack)).precedence === opDef(token).precedence))
        ) {
          pushExpression()
        }
        operatorStack.push(token)
        continue
      }
      case "Id": {
        const args: Expr[] = []
        while (true) {
          const next = input[i + 1]
          if (next === undefined || !(next.t === "Id" || next.t === "Num" || next.t === "LPar")) {
            break
          }

          i++
          if (next.t === "Id" || next.t === "Num") {
            args.push(next)
          } else {
            // next is an LPar
            const _: LPar = next
            const [[expr], j] = shuntingYard(i + 1, input)
            args.push({ t: "Enclosed", e: expr })
            const t = input[j]
            if (t.t !== "RPar") {
              throw new Error("Expected closing parenthesis but found " + t.t)
            }
            i = j
          }
        }
        if (args.length === 0) {
          output.push(token)
        } else {
          output.push({ t: "App", fn: token, args })
        }
        continue
      }
      case "LPar": {
        const _: LPar = token
        const [[expr], j] = shuntingYard(i + 1, input)
        output.push({ t: "Enclosed", e: expr })
        const t = input[j]
        if (t === undefined || t.t !== "RPar") {
          throw new Error(`Expected closing parenthesis but found ${t === undefined ? "end of input" : t.t}`)
        }
        i = j
        continue
      }
      case "RPar": {
        while (operatorStack.length > 0) {
          if (operatorStack.length === 0) {
            throw new Error("Mismatched parenthesis")
          }
          pushExpression()
        }
        if (operatorStack.length === 0) {
          return [output, i]
        }
        operatorStack.pop()
        continue
      }
    }
  }
  while (operatorStack.length > 0) {
    pushExpression()
  }
  return [output, i]
}

const showExprPrec = (expr: Expr | Op): string => {
  switch (expr.t) {
    case "Num":
      return String(expr.n)
    case "Op":
    case "Id":
      return expr.s
    case "App":
      return "{" + showExprPrec(expr.fn) + " " + expr.args.map(e => showExprPrec(e)).join(" ") + "}"
    case "Enclosed":
      return "(" + showExprPrec(expr.e) + ")"
    case "OpApp":
      return "{" + showExprPrec(expr.e1) + expr.op.s + showExprPrec(expr.e2) + "}"
  }
}

const showExpr = (expr: Expr | Op): string => {
  switch (expr.t) {
    case "Num":
      return String(expr.n)
    case "Op":
    case "Id":
      return expr.s
    case "App":
      return showExpr(expr.fn) + " " + expr.args.map(e => showExpr(e)).join(" ")
    case "Enclosed":
      return "(" + showExpr(expr.e) + ")"
    case "OpApp":
      return showExpr(expr.e1) + " " + expr.op.s + " " + showExpr(expr.e2)
  }
}

const showDepthNExpr = (showDepth: number, depth: number, expr: Expr | Op): string => {
  const nextDepth = depth + 1
  switch (expr.t) {
    case "Num":
    case "Op":
    case "Id": {
      const show = showExpr(expr)
      return depth === showDepth + 1 ? show : " ".repeat(show.length)
    }
    case "App":
      return (
        showDepthNExpr(showDepth, nextDepth, expr.fn) +
        " " +
        expr.args.map(e => showDepthNExpr(showDepth, nextDepth, e)).join(" ")
      )
    case "Enclosed":
      return (
        (depth === showDepth ? "(" : " ") +
        showDepthNExpr(showDepth, nextDepth - 1, expr.e) +
        (depth === showDepth ? ")" : " ")
      )
    case "OpApp": {
      const op = depth === showDepth ? expr.op.s : " ".repeat(expr.op.s.length)
      return (
        showDepthNExpr(showDepth, nextDepth, expr.e1) + " " + op + " " + showDepthNExpr(showDepth, nextDepth, expr.e2)
      )
    }
  }
}

const logDepthExpr = (expr: Expr) => {
  for (let i = 0; i < 12; i++) {
    console.log(showDepthNExpr(i, 0, expr))
  }
}

const args: string = Deno.args.join(" ")
const input: Token[] = tokenize(args)
const [[expr], _] = shuntingYard(0, input)
console.log(showExprPrec(expr))
console.log(showExpr(expr))
logDepthExpr(expr)
