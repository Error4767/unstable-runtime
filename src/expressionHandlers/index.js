import { default as unaryExpression } from "./unaryExpression.js";
import { default as binaryExpression } from "./binaryExpression.js";
import { default as assignmentExpression } from "./assignmentExpression.js";
import { default as updateExpression } from "./updateExpression.js";

import { getVariable, getProperty, getParams } from "../shared.js";
import { execute } from "../runtime.js";

export default {
    "Literal": (t) => t.value,
    "Identifier": (t, scopes) => {
        return getVariable(t.name, scopes);
    },
    "FunctionExpression": (t, scopes) => {
        return function (...realParams) {
            return (execute(t.body, scopes, { extraVariables: getParams({ params: t.params, realParams }, scopes), stack: true }))
        };
    },
    "ArrowFunctionExpression": (t, scopes) => {
        return (...realParams) => (execute(t.body, scopes, { extraVariables: getParams({ params: t.params, realParams }, scopes), stack: true }));
    },
    "ArrayExpreesion": (t, scopes) => {
        return t?.elements?.map(element => execute(element, scopes)) || [];
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
        // 获得调用者
        const caller = execute(t.callee, scopes);
        // 调用 ----后续需考虑 this 问题----
        return caller(...(t?.arguments?.map(param => execute(param, scopes)) || []));
    },
    "UpdateExpression": updateExpression,
    "UnaryExpression": unaryExpression,
    "BinaryExpression": binaryExpression,
    "ConditionalExpression": (t, scopes) => (execute(t.test, scopes) ? execute(t.consequent, scopes) : execute(t.alternate, scopes)),
    "AssignmentExpression": assignmentExpression,
}