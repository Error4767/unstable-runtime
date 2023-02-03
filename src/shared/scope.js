import { bindVariablesToThisScope } from "./currentScopeAction.js";

// 存放栈信息的map
export const stackInfos = new WeakMap(); // Map<{ returned: boolean, returnValue: any }>

export const isStack = (scope) => stackInfos.get(scope) ? true : false;

// 创建原始作用域
export const createRawScope = () => ({});

// 创建作用域，含初始化逻辑
export const createScope = ({ extraVariables, stack, tags, scopeHandleHook } = {}) => {
    const scope = createRawScope();
    tags && (tags.forEach(tag => (scope[tag] = true)));
    // 如果是栈，添加额外信息
    stack && stackInfos.set(scope, { returned: false, returnValue: undefined });
    // 如果有扩展变量，绑定到作用域，目前用于函数参数绑定
    extraVariables && bindVariablesToThisScope({ variables: extraVariables }, scope);
    typeof scopeHandleHook === "function" && scopeHandleHook(scope);
    return scope;
}

// 找到本次执行栈
export function findStack(scopes) {
    let stackScope = null;
    scopes.findLast((scope) => {
        if(isStack(scope)) {
            stackScope = scope
            return true;
        }
    });
    return stackScope;
}

// 存放循环作用域的信息的 map (scope -> loopScopeInfos)
export const loopScopesInfos = new WeakMap(); // Map<{ breaked: boolean, continued: boolean }>

// 存放标签语句信息的 map
export const labeledScopesInfos = new WeakMap(); // Map<{ breaked: boolean }>

// 查找作用域链中，是否有存在 scopeMaps 中的作用域，有则返回最近的那个作用域
export const findScopeInScopeMapsInThisStack = (scopes, scopeMaps) => {
    let targetScope = undefined;
    scopes.findLast((scope, i) => {
        // 遇到最近的栈了，停止查找
        if (isStack(scope)) {
            return true;
        }
        if (scopeMaps.get(scope)) {
            targetScope = scope
            return true;
        }
        return false;
    });
    return targetScope;
};

// 查找最近的指定 label 的作用域
export const findLabelScopeInThisStack = (scopes, label) => {
    let targetScope = undefined;
    scopes.findLast((scope) => {
         // 遇到最近的栈了，停止查找
        if(isStack(scope)) {
            return true;
        }
        const labelScopeInfo = labeledScopesInfos.get(scope);
        if (labelScopeInfo && labelScopeInfo.label === label) {
            targetScope = scope;
            return true;
        }
        return false;
    });
    return targetScope;
};

// 检测这层作用域是否执行完毕
export const scopeIsExecuted = (scope)=> (
    loopScopesInfos.get(scope)?.breaked
    ||
    loopScopesInfos.get(scope)?.continued
    ||
    labeledScopesInfos.get(scope)?.breaked
    ||
    stackInfos.get(scope)?.returned
);

// 检测自己及上层作用域是否已经执行结束
export const scopeChainIsExecuted = (scopes) => scopes.some(scope => scopeIsExecuted(scope));