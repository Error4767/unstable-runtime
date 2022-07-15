import { execute } from "../runtime.js";

const handlers = {
    "&&": (t, scopes) => (execute(t.left, scopes) && execute(t.right, scopes)),
    
    "||": (t, scopes) => (execute(t.left, scopes) || execute(t.right, scopes)),
    "??": (t, scopes) => (execute(t.left, scopes) ?? execute(t.right, scopes)),
}

export default function logicalExpression(binaryExpression, scopes) {
    const operator = binaryExpression.operator;
    if (handlers[operator]) {
        return handlers[operator](binaryExpression, scopes);
    } else {
        throw new SyntaxError("Unexpected token " + binaryExpression.operator);
    }
}