import { execute } from "../runtime.js";

// 获取属性名，会根据是否是 compted 自动计算
export function getProperty(t, scopes) {
    let key;
    let computed;
    if (t.type === "MemberExpression") {
        key = t.property;
        computed = t.computed;
    } else if (t.type === "Property") {
        key = t.key;
        computed = t.computed;
    }
    return key.type === "Identifier" && !computed ? key.name : execute(key, scopes);
}