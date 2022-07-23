import { execute } from "../runtime.js";
import { createScope, isStack, stackInfos, findStack, getVariables, bindVariablesToThisScope, setVariable } from "../shared.js";

import purStatements from "./purStatements.js";

// 找到循环作用域
function findLoopScope(scopes) {
    let loopScope = null;
    scopes.forEach((scope) => {
        loopScopesInfos.get(scope) && (loopScope = scope);
    });
    return loopScope;
}

// 存放循环作用域的信息的 map (scope -> loopScopeInfos)
const loopScopesInfos = new WeakMap(); // Map<{breaked: boolean, continued: boolean}>

function executeBody(t, scopes) {
    let loopScopeInfo = loopScopesInfos.get(findLoopScope(scopes));
    const stackInfo = stackInfos.get(findStack(scopes));

    if (loopScopeInfo?.breaked || loopScopeInfo?.continued || stackInfo?.returned) {
        return;
    }

    // 运行主体代码
    t.body?.some(stmt => {
        // 循环 break, continue, return
        if (loopScopeInfo?.breaked || loopScopeInfo?.continued || stackInfo?.returned) {
            return;
        }
        if (stmt.type === "ReturnStatement") {
            try {
                // return 标记和参数
                stackInfo.returned = true;
                stackInfo.returnValue = execute(stmt.argument, scopes);
            } catch (err) {
                throw new Error("找不到要 return 的函数");
            }
            return true;
        }
        if (stmt.type === "BreakStatement") {
            try {
                // break 标记
                loopScopeInfo.breaked = true;
            } catch (err) {
                throw new Error("找不到要 break 的循环");
            }
            return true;
        } else if (stmt.type === "ContinueStatement") {
            try {
                // continue 标记
                loopScopeInfo.continued = true;
            } catch (err) {
                throw new Error("找不到要 continue 的循环");
            }
            return true;
        }
        stmt?.type && execute(stmt, scopes);
        return false;
    });
    // 如果是栈，返回返回值
    if (isStack(scopes.at(-1))) {
        return stackInfo.returnValue;
    }
}

export default {
    ...purStatements,
    "BlockStatement": (t, scopes, options) => {
        const scope = createScope(options);

        const newScopes = [...scopes, scope];

        return executeBody(t, newScopes);
    },
    "WhileStatement": (t, scopes) => {
        const scope = createScope();
        const newScopes = [...scopes, scope];

        loopScopesInfos.set(scope, { breaked: false, continued: false });

        // continued 重置
        while ((loopScopesInfos.get(scope).continued = false, execute(t.test, newScopes))) {
            execute(t.body, newScopes);
            // 检查标记break，和当前栈是否 return
            if (loopScopesInfos.get(scope)?.breaked || stackInfos.get(findStack(scopes))?.returned) {
                break;
            }
        }
    },
    "ForStatement": (t, scopes) => {
        // 上次循环的变量值
        let preVariables;

        while (true) {
            const scope = createScope();
            loopScopesInfos.set(scope, { breaked: false, continued: false });

            const newScopes = [...scopes, scope];
            // 需要绑定到下次循环的值，是初始化 let 或者 const 产生的量
            let bindKeys;
            // 如果没有上次的值，代表尚未初始化，初始化一次
            if (!preVariables) {
                // 初始化
                execute(t.init, newScopes);
                bindKeys = Reflect.ownKeys(scope);
                preVariables = { ...scope };
            } else {
                // 如果有，将上一次循环的值绑定到这次，因为已经经过了包装，所以直接合并
                Object.assign(scope, preVariables);
                bindKeys = Reflect.ownKeys(scope);
            }
            // 如果通过条件执行，否则 break
            const condition = execute(t.test, newScopes);
            if (condition) {
                executeBody(t.body, newScopes);
                // 检查标记break，和当前栈是否 return
                if (loopScopesInfos.get(scope)?.breaked || stackInfos.get(findStack(scopes))?.returned) {
                    break;
                }
            } else {
                break;
            }
            // 执行更新
            execute(t.update, newScopes);
            // 执行完毕，保存初始化的值目前的值
            bindKeys.forEach(key => (preVariables[key] = scope[key]));
        }
    },
    "ForInStatement": (t, scopes) => {
        let id = t;
        let kind = null;
        // 如果是 VariableDeclaration 则 id 从 declarations 中取第一个
        if (t.left.type === "VariableDeclaration") {
            id = t.left.declarations[0].id;
            kind = t.left.kind;
        }
        for (let key in execute(t.right, scopes)) {
            const scope = createScope({});
            const newScopes = [...scopes, scope];
            loopScopesInfos.set(scope, { breaked: false, continued: false });
            // 获取出需要绑定的变量
            const variables = getVariables({ id, value: key });
            // 如果有类型，直接绑定到当前作用域
            if (kind) {
                bindVariablesToThisScope({ variables, kind }, scope);
            } else {
                // 没有类型，使用 setVariable 设置每个值
                Object.entries(variables).forEach(([key, value]) => setVariable({ name: key, value }, newScopes));
            }
            executeBody(t.body, newScopes);
            // 检查标记break，和当前栈是否 return
            if (loopScopesInfos.get(scope)?.breaked || stackInfos.get(findStack(scopes))?.returned) {
                break;
            }
        }
    },
}