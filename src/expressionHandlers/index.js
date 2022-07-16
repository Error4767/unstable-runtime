import { default as unaryExpression } from "./unaryExpression.js";
import { default as binaryExpression } from "./binaryExpression.js";
import { default as assignmentExpression } from "./assignmentExpression.js";
import { default as updateExpression } from "./updateExpression.js";
import { default as logicalExpression } from "./logicalExpression.js";

import { getVariable, getProperty, getParams, createScope } from "../shared.js";
import { execute } from "../runtime.js";

export default {
    "Literal": (t) => t.value,
    "Identifier": (t, scopes) => {
        return getVariable(t.name, scopes);
    },
    "FunctionExpression": (t, scopes) => {
        return function (...realParams) {
            // 执行并且绑定参数和this
            return (execute(t.body, scopes, { extraVariables: { "this": this, ...getParams({ params: t.params, realParams }, scopes) }, stack: true }))
        };
    },
    "ArrowFunctionExpression": (t, scopes) => {
        return (...realParams) => {
            const scopeOptions = { extraVariables: getParams({ params: t.params, realParams }, scopes), stack: true };
            if (t.body.type !== "BlockStatement") {
                const scope = createScope(scopeOptions);
                return execute(t.body, [...scopes, scope]);
            }
            return (execute(t.body, scopes, scopeOptions));
        };
    },
    "ObjectExpression": (t, scopes) => {
        const result = {};
        t?.properties?.forEach((property) => {
            // 如果是标识符并且非计算属性，就直接取name, 否则获取其值
            result[getProperty(property, scopes)] = execute(property.value, scopes);
        });
        return result;
    },
    "ArrayExpression": (t, scopes) => (t?.elements?.map(el => execute(el, scopes)) || []),
    "MemberExpression": (t, scopes) => execute(t.object, scopes)[getProperty(t, scopes)],
    "CallExpression": (t, scopes) => {
        const params = [...(t?.arguments?.map(param => execute(param, scopes)) || [])];
        if (t.callee.type === "MemberExpression") {
            // 对象成员形式的调用，考虑 this
            const object = execute(t.callee.object, scopes);

            const property = getProperty(t.callee, scopes);
            return object[property](...params);
        } else {
            // 获得调用者
            const caller = execute(t.callee, scopes);
            return caller(...params);
        }
    },
    "UpdateExpression": updateExpression,
    "UnaryExpression": unaryExpression,
    "BinaryExpression": binaryExpression,
    "LogicalExpression": logicalExpression,
    "ConditionalExpression": (t, scopes) => (execute(t.test, scopes) ? execute(t.consequent, scopes) : execute(t.alternate, scopes)),
    "AssignmentExpression": assignmentExpression,
}