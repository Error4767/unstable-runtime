import { execute } from "../runtime.js";
import { getProperty } from "../shared.js";

const handlers = {
    "!": (v, scopes)=> ! execute(v, scopes),
    "~": (v, scopes)=> ~ execute(v, scopes),
    "+": (v, scopes)=> + execute(v, scopes),
    "-": (v, scopes)=> - execute(v, scopes),
    "typeof": (v, scopes)=> typeof execute(v, scopes),
    "void": (v, scopes)=> void execute(v, scopes),
    // delete 特殊处理
    "delete": (t, scopes)=> {
        if(t.type === "MemberExpression") {
            const object = execute(t.object, scopes);
            const property = getProperty(t. scopes);
            delete object[property];
        }else {
            // 目前默认严格模式，不允许直接删除变量，抛出一个错误
            throw new SyntaxError("Delete of an unqualified identifier in strict mode.");
        }
    }
}

export default function unaryExpression(unaryExpression, scopes) {
    const operator = unaryExpression.operator;
    if(handlers[operator]) {
        return handlers[operator](unaryExpression.argument, scopes);
    }else {
        throw new SyntaxError("Unexpected token " + unaryExpression.operator);
    }
}