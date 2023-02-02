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
    if (name === "this") {
        // 可能没有 this ，此时返回顶层作用域
        return scopes[0];
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

// 解构，返回一个对象，含有所有被解构的变量，key为变量名，value是对象属性路径
function getPropertyPaths(id, variablePath = []) {
    const variablesPaths = {};
    // ----对象和数组解构----，后续支持
    if (id.type === "ObjectPattern") {
        id.properties?.forEach(item => {
            const { key, value: pattern } = item;

            if (pattern.type === "Identifier") {
                variablesPaths[pattern.name] = [...variablePath, key.name];
            }
            if (pattern.type === "ObjectPattern" || pattern.type === "ArrayPattern") {
                const innerVariablePaths = getPropertyPaths(pattern, [...variablePath, key.name]);
                Object.assign(variablesPaths, innerVariablePaths);
            }
        });
    }
    if (id.type === "ArrayPattern") {
        id.elements?.forEach((pattern, index) => {
            // 如果为空，直接返回，因为数组解构模式可以含有空位
            if (!pattern) { return };
            if (pattern.type === "Identifier") {
                variablesPaths[pattern.name] = [...variablePath, index];
            }
            if (pattern.type === "ObjectPattern" || pattern.type === "ArrayPattern") {
                const innerVariablePaths = getPropertyPaths(pattern, [...variablePath, index]);
                Object.assign(variablesPaths, innerVariablePaths);
            }
        });
    }
    return variablesPaths;
}

// 获得一个或者一组变量，接受的 value 必须是已经被计算的，不能是 ast
export function getVariables({ id, value }) {
    if (id.type === "Identifier") {
        return {
            [id.name]: value,
        };
    }
    if (id.type === "ObjectPattern" || id.type === "ArrayPattern") {
        const variablesPaths = getPropertyPaths(id);
        const variables = {};
        for (const key in variablesPaths) {
            // 根据属性链获取值
            variables[key] = variablesPaths[key].reduce((object, key) => {
                return object[key];
            }, value);
        }
        return variables;
    }
}