import { default as unaryExpression } from "./unaryExpression.js";
import { default as binaryExpression } from "./binaryExpression.js";
import { default as assignmentExpression } from "./assignmentExpression.js";
import { default as updateExpression } from "./updateExpression.js";
import { default as logicalExpression } from "./logicalExpression.js";
import { templateLiteral, taggedTemplateExpression } from "./templateString.js";

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
            // 如果是展开运算符，混入到对象
            if (property.type === "SpreadElement") {
                Object.assign(result, { ...execute(property.argument, scopes) });
            } else {
                // 如果是标识符并且非计算属性，就直接取name, 否则获取其值
                result[getProperty(property, scopes)] = execute(property.value, scopes);
            }
        });
        return result;
    },
    "ArrayExpression": (t, scopes) => {
        let result = [];
        t?.elements?.forEach(el => {
            // 数组空位
            if (!el) {
                // 只有 concat 方法可以连接空位, 使用 concat 添加空位
                result = result.concat([,]);
                return;
            }
            // 如果是展开运算符，添加每一项
            if (el.type === "SpreadElement") {
                result.push(...execute(el.argument, scopes));
            } else {
                result.push(execute(el, scopes));
            }
        });
        return result;
    },
    "MemberExpression": (t, scopes, extraInfos = { optionalChainFailed: false }) => {
        // 只要链失败，直接结束
        if (extraInfos.optionalChainFailed) {
            return;
        }
        const object = execute(t.object, scopes, extraInfos);
        // 只要链失败，直接结束
        if (extraInfos.optionalChainFailed) {
            return;
        }
        // 如果可选且不存在，那么直接返回，并且整个链就失败，返回 undefined
        if (t.optional && object === undefined) {
            extraInfos.optionalChainFailed = true;
            return;
        }
        // 如果，那么继续动作
        const result = object[getProperty(t, scopes)];
        return result;
    },
    "CallExpression": (t, scopes, extraInfos = { optionalChainFailed: false }) => {
        // 只要链失败，直接结束
        if (extraInfos.optionalChainFailed) {
            return;
        }
        const params = [...(t?.arguments?.map(param => execute(param, scopes)) || [])];
        if (t.callee.type === "MemberExpression") {
            // 对象成员形式的调用，考虑 this
            const object = execute(t.callee.object, scopes);
            const property = getProperty(t.callee, scopes);
            // 只要链失败，直接结束
            if (extraInfos.optionalChainFailed) {
                return;
            }
            // 如果可选且不存在，那么直接返回，并且整个链就失败，返回 undefined
            if (t.optional && object[property] === undefined) {
                extraInfos.optionalChainFailed = true;
                return;
            }
            return object[property](...params);
        } else {
            // 获得调用者
            const caller = execute(t.callee, scopes);
            // 只要链失败，直接结束
            if (extraInfos.optionalChainFailed) {
                return;
            }
            // 如果可选且不存在，那么直接返回，并且整个链就失败，返回 undefined
            if (t.optional && object === undefined) {
                extraInfos.optionalChainFailed = true;
                return;
            }
            return caller(...params);
        }
    },
    "ChainExpression": (t, scopes)=> execute(t.expression, scopes),
    "UpdateExpression": updateExpression,
    "UnaryExpression": unaryExpression,
    "BinaryExpression": binaryExpression,
    "LogicalExpression": logicalExpression,
    "ConditionalExpression": (t, scopes) => (execute(t.test, scopes) ? execute(t.consequent, scopes) : execute(t.alternate, scopes)),
    "AssignmentExpression": assignmentExpression,
    "TemplateLiteral": templateLiteral,
    "TaggedTemplateExpression": taggedTemplateExpression,
}