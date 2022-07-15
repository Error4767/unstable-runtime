import { getVariable, setVariable, getProperty } from "../shared.js";

import { execute } from "../runtime.js";

export default function updateExpression(t, scopes) {
    let target = t.argument;
    // 如果是成员赋值运算
    if (target.type === "MemberExpression") {
        const object = execute(target.object, scopes);
        // 如果是标识符并且非计算属性，就直接取name, 否则获取其值
        const property = getProperty(target, scopes);
        const preValue = object[property];
        if (t.operator === "--") {
            object[property]--;
        } else if (t.operator === "++") {
            object[property]++;
        }
        // 前置运算符就返回最新值，后置则返回操作前的旧值
        return t.prefix ? object[property] : preValue;
    }
    const name = t.argument.name;
    const preValue = getVariable(name, scopes);
    let newValue = preValue;
    // 否则直接运算
    if (t.operator === "--") {
        newValue = preValue - 1;
        setVariable({ name, value: newValue }, scopes);
    } else if (t.operator === "++") {
        newValue = preValue + 1;
        setVariable({ name, value: newValue }, scopes);
    }
    // 前置运算符就返回最新值，后置则返回操作前的旧值
    return t.prefix ? newValue : preValue;
}