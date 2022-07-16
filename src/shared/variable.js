import { setThisScopeVariable } from "./currentScopeAction.js";

export function getVariable(name, scopes) {
    let scopeIndex = -1;
    let scope = scopes.at(scopeIndex);
    // 沿着作用域链查找变量
    while (scope) {
        if (scope.hasOwnProperty(name)) {
            return scope[name].value;
        }
        scopeIndex -= 1;
        scope = scopes.at(scopeIndex);
    }
    // 如果全局有返回全局的
    if (globalThis[name]) {
        return globalThis[name];
    }
    if (name === "undefined") {
        return undefined;
    }
    if (name === null) {
        return null;
    }
    // 找不到抛出错误
    throw new ReferenceError(`${String(name)} is not defined`);
}

// 设置值的方法
export function setVariable({ name, value, kind }, scopes) {
    let scopeIndex = -1;
    let scope = scopes.at(scopeIndex);
    // 如果有类型，直接设置
    if (kind) {
        return setThisScopeVariable({ name, value, kind }, scope);
    }
    // 沿着作用域链查找变量
    while (scope) {
        if (scope.hasOwnProperty(name)) {
            return setThisScopeVariable({ name, value, kind }, scope);
        }
        scopeIndex -= 1;
        scope = scopes.at(scopeIndex);
    }
    // 如果没有类型，且该作用域找不到变量，设置到顶层作用域
    setThisScopeVariable({ name, value }, scopes[0]);
}

// 获得一个或者一组变量，接受的 value 必须是已经被计算的，不能是 ast
export function getVariables({ id, value }) {
    if(id.type === "Identifier") {
        return {
            [id.name]: value,
        };
    }
    // ----对象和数组解构----，后续支持
    // if(id.type === "ObjectPatterm") {

    // }
    // if(id.type === "ArrayPattern") {
        
    // }
}