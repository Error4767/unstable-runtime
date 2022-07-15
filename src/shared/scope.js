import { bindVariablesToThisScope } from "./currentScopeAction.js";

// 执行栈标记
const stackIdentifier = Symbol("stack");
// 存放栈信息的map
export const stackInfos = new WeakMap();

export const isStack = (scope)=> scope[stackIdentifier];

// 创建原始作用域
export const createRawScope = () => ({});

// 创建作用域，含初始化逻辑
export const createScope = ({ extraVariables, stack, tags } = {}) => {
    const scope = createRawScope();
    tags && (tags.forEach(tag=> (scope[tag] = true)));
    // 如果有栈标记，添加栈标记
    stack && (scope[stackIdentifier] = true);
    // 如果是栈，添加额外信息
    stackInfos.set(scope, { returned: false, returnValue: undefined });
    // 如果有扩展变量，绑定到作用域，目前用于函数参数绑定
    extraVariables && bindVariablesToThisScope(extraVariables, scope);
    return scope;
}

// 找到本次执行栈
export function findStack(scopes) {
    let stackScope = null;
    scopes.forEach((scope) => {
        isStack(scope) && (stackScope = scope);
    });
    return stackScope;
}