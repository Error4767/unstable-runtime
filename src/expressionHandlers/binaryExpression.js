import { execute } from "../runtime.js";

const handlers = {
    "**": (t, scopes) => (execute(t.left, scopes) ** execute(t.right, scopes)),

    "*": (t, scopes) => (execute(t.left, scopes) * execute(t.right, scopes)),
    "/": (t, scopes) => (execute(t.left, scopes) / execute(t.right, scopes)),
    "%": (t, scopes) => (execute(t.left, scopes) % execute(t.right, scopes)),

    "+": (t, scopes) => (execute(t.left, scopes) + execute(t.right, scopes)),
    "-": (t, scopes) => (execute(t.left, scopes) - execute(t.right, scopes)),

    "<<": (t, scopes) => (execute(t.left, scopes) << execute(t.right, scopes)),
    ">>": (t, scopes) => (execute(t.left, scopes) >> execute(t.right, scopes)),
    ">>>": (t, scopes) => (execute(t.left, scopes) >>> execute(t.right, scopes)),

    "<": (t, scopes) => (execute(t.left, scopes) < execute(t.right, scopes)),
    "<=": (t, scopes) => (execute(t.left, scopes) <= execute(t.right, scopes)),
    ">": (t, scopes) => (execute(t.left, scopes) > execute(t.right, scopes)),
    ">=": (t, scopes) => (execute(t.left, scopes) >= execute(t.right, scopes)),
    "in": (t, scopes) => (execute(t.left, scopes) in execute(t.right, scopes)),
    "instanceof": (t, scopes) => (execute(t.left, scopes) instanceof execute(t.right, scopes)),

    "==": (t, scopes) => (execute(t.left, scopes) == execute(t.right, scopes)),
    "!=": (t, scopes) => (execute(t.left, scopes) != execute(t.right, scopes)),
    "===": (t, scopes) => (execute(t.left, scopes) === execute(t.right, scopes)),
    "!==": (t, scopes) => (execute(t.left, scopes) !== execute(t.right, scopes)),

    "&": (t, scopes) => (execute(t.left, scopes) & execute(t.right, scopes)),

    "^": (t, scopes) => (execute(t.left, scopes) ^ execute(t.right, scopes)),

    "|": (t, scopes) => (execute(t.left, scopes) | execute(t.right, scopes)),
};

export default function binaryExpression(binaryExpression, scopes) {
    const operator = binaryExpression.operator;
    if (handlers[operator]) {
        return handlers[operator](binaryExpression, scopes);
    } else {
        throw new SyntaxError("Unexpected token " + binaryExpression.operator);
    }
}