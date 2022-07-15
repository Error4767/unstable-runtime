import { execute } from "../runtime.js";
import { setVariable, getProperty } from "../shared.js";
import binaryExpression from "./binaryExpression.js";

export default function assignmentExpression(t, scopes) {
    const { operator, left, right } = t;
    // 获取取值运算符
    const valueComputeOperator = operator.slice(0, -1);
    // 如果大于0，则不是 = , 就调用该运算符的 binaryExpression 计算得到结果，否则直接计算右侧结果
    const newValue = valueComputeOperator.length > 0 ? binaryExpression({ left, right, operator: valueComputeOperator }, scopes) : execute(t.right, scopes);
    // 成员运算符语法
    if (left.type === "MemberExpression") {
        return (execute(left.object, scopes)[getProperty(left, scopes)] = newValue);
    } else if (left.type === "Identifier") {
        // 直接设置值
        return setVariable({ name: left.name, value: newValue }, scopes);
    }
    throw new SyntaxError("Invalid left-hand side in assignment");
}