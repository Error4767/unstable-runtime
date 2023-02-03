import { execute } from "../runtime.js";
import { 
    createScope, 
    isStack, 
    stackInfos, 
    findStack, 
    getVariables, 
    bindVariablesToThisScope, 
    setVariable,
    loopScopesInfos,
    labeledScopesInfos,
    findScopeInScopeMapsInThisStack,
    findLabelScopeInThisStack,
    scopeChainIsExecuted,
} from "../shared.js";

import purStatements from "./purStatements.js";

function executeBody(t, scopes) {

    // 循环作用域
    const loopScope = findScopeInScopeMapsInThisStack(scopes, loopScopesInfos);
    const loopScopeInfo = loopScopesInfos.get(loopScope);

    // 标签作用域
    const labeledScope = findScopeInScopeMapsInThisStack(scopes, labeledScopesInfos);

    // 所有可 break 的作用域取其在作用域链的位置排序，取最近的一个，下面如果只有 break，则是 break 该作用域
    const breakedScopeIndex = [scopes.indexOf(loopScope), scopes.indexOf(labeledScope)].filter(index => index !== -1).sort((v1, v2) => v1 - v2)?.[0];
    const breakedScope = scopes?.[breakedScopeIndex];
    // 找到这个作用域的信息
    const breakedScopeInfo = loopScopesInfos.get(breakedScope) || labeledScopesInfos.get(breakedScope);

    // 栈
    const stack = findStack(scopes);
    const stackInfo = stackInfos.get(stack);

    if (scopeChainIsExecuted(scopes)) {
        return;
    }

    // 运行主体代码
    t.body?.some(stmt => {
        // 循环 break, continue, return
        if (scopeChainIsExecuted(scopes)) {
            return true;
        }
        if (stmt.type === "ReturnStatement") {
            try {
                // return 标记和参数
                stackInfo.returned = true;
                stackInfo.returnValue = execute(stmt.argument, scopes);
            } catch (err) {
                throw new SyntaxError("Illegal return statement");
            }
            return true;
        }
        if (stmt.type === "BreakStatement") {
            if(stmt.label) {
                const scope = findLabelScopeInThisStack(scopes, stmt.label.name);
                try {
                    labeledScopesInfos.get(scope).breaked = true;
                } catch (err) {
                    throw new SyntaxError(`Uncaught SyntaxError: Undefined label '${stmt.label.name}'`);
                }
            }else {
                try {
                    // break 标记
                    breakedScopeInfo.breaked = true;
                } catch (err) {
                    throw new SyntaxError("Illegal break statement");
                }
            }
            return true;
        } else if (stmt.type === "ContinueStatement") {
            if(stmt.label) {
                // 找到该 label 的作用域
                const scope = findLabelScopeInThisStack(scopes, stmt.label.name);
                // 如果 continue label 而不是循环，抛出错误
                if(!loopScopesInfos.get(scope)) {
                    throw new Error(`Uncaught SyntaxError: Illegal continue statement: '${stmt.label.name}' does not denote an iteration statement`)
                }
                try {
                    labeledScopesInfos.get(scope).continued = true;
                } catch (err) {
                    throw new SyntaxError(`Uncaught SyntaxError: Undefined label '${stmt.label.name}'`);
                }
            }else {
                try {
                    // continue 标记
                    loopScopeInfo.continued = true;
                } catch (err) {
                    throw new SyntaxError("Illegal continue statement: no surrounding iteration statement");
                }
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
    "WhileStatement": (t, scopes, options) => {
        const scope = createScope(options);
        const newScopes = [...scopes, scope];

        loopScopesInfos.set(scope, { breaked: false, continued: false });

        // continued 重置
        while ((loopScopesInfos.get(scope).continued = false, execute(t.test, newScopes))) {
            execute(t.body, newScopes);
            // 检查标记break，和当前栈是否 return
            if (loopScopesInfos.get(scope)?.breaked || stackInfos.get(findStack(scopes))?.returned || labeledScopesInfos.get(scope)?.breaked) {
                break;
            }
        }
    },
    "ForStatement": (t, scopes, options) => {
        // 上次循环的变量值
        let preVariables;

        while (true) {
            const scope = createScope(options);
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
                if (loopScopesInfos.get(scope)?.breaked || stackInfos.get(findStack(scopes))?.returned || labeledScopesInfos.get(scope)?.breaked) {
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
    "ForInStatement": (t, scopes, options = {}) => {
        let id = t;
        let kind = null;
        // 如果是 VariableDeclaration 则 id 从 declarations 中取第一个
        if (t.left.type === "VariableDeclaration") {
            id = t.left.declarations[0].id;
            kind = t.left.kind;
        }
        for (let key in execute(t.right, scopes)) {
            const scope = createScope(options);
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
            if (loopScopesInfos.get(scope)?.breaked || stackInfos.get(findStack(scopes))?.returned || labeledScopesInfos.get(scope)?.breaked) {
                break;
            }
        }
    },
    "SwitchStatement": (t, scopes, options) => {
        /* 
            1. switch 的行为，一旦有一个 case 成功，那么就会执行其和其后 case 的动作，并且之后的 case 的动作不会触发条件检测，会直接执行动作，使用 break 退出 switch 语句
            switch default 的行为: 
                如果 default 在末尾，那么当其他所有 case 不匹配时，default 将执行
                如果 default 不在末尾
                    如果其他 case 中存在匹配成功的，则从那个成功的开始，是 1 对应的动作，故如果 default 在前，匹配成功的 case 在后，则不会执行 default，会跳过，从匹配成功的开始执行，如果在后，则不影响执行，和 1 一样，后续的 case 无视条件，所以会被执行，除非 break
                    如果其他 case 中不存在成功的，则会从 default 开始执行，以及 default 之后的 case, 同 1 动作一样，无视条件，可以理解为将 default 视为一个成功的 case

            上述解释是 switch 的一些行为，这可以帮助理解下面的代码为何如此执行，使得其符合 JS 标准
        */

        // 需要匹配的值
        const matchValue = execute(t.discriminant, scopes);

        // 创建 switch 主体作用域
        const scope = createScope(options);
        const newScopes = [...scopes, scope];
        // 由于break 和循环相近，便于实现这里直接设置其为循环，赋予其循环的性质
        loopScopesInfos.set(scope, { breaked: false, continued: false });

        // 如果 default 数量超过1，报错 
        const defaultNumber = t.cases?.reduce((o, n) => {
            return !n.test ? o + 1 : o;
        }, 0);
        if (defaultNumber > 1) {
            throw new SyntaxError("More than one default clause in switch statement");
        }

        // 运行 case 的方法
        const run = (switchCaseItem) => {
            // 判断成功并且有对应动作代码就执行，这里直接 executeBody，因为 case 属于 switch 主体的那个作用域，不需要再次创建一个作用域
            switchCaseItem.consequent && executeBody({ body: switchCaseItem.consequent }, newScopes);
            // 检查标记break，和当前栈是否 return, 如果是，结束遍历执行
            if (loopScopesInfos.get(scope)?.breaked || stackInfos.get(findStack(scopes))?.returned || labeledScopesInfos.get(scope)?.breaked) {
                return true;
            }
        }

        // 已经匹配成功过了，switch 只要匹配一次成功，剩余的匹配就会不再执行
        let isTestSucceed = false;
        // 从 default 开始截取的 cases
        let splitedCasesStartFromDefualt = null;
        // 执行 switch 主体匹配
        t.cases?.some((switchCaseItem, index) => {
            // 如果已经成功过了，直接运行代码
            if (isTestSucceed) {
                return run(switchCaseItem);
            }
            if (switchCaseItem.test) {
                // 执行代码, 如果已经成功过，那么直接跳过判断，否则检测 test 表达式
                const testResult = isTestSucceed || execute(switchCaseItem.test, newScopes) === matchValue;
                // 判断成功
                if (testResult) {
                    // 已匹配过为false, 那么就设置为已匹配过
                    !isTestSucceed && (isTestSucceed = true);
                    return run(switchCaseItem);
                }
                // 不成功，则不做动作
            } else {
                // 如果是最后一个，则直接运行，不是，则先记录
                if (index === t.cases.length - 1) {
                    // 这里设置为 true 以便下面不在运行
                    isTestSucceed = true;
                    return run(switchCaseItem);
                } else {
                    // 存储从 default 开始的 switch
                    splitedCasesStartFromDefualt = t.cases.slice(index);
                }
            }
        });
        // 如果 default 以外其他的没有匹配成功的，那么以 default 作为第一个成功的执行其以及其后的所有 case (如果有的话)
        if (!isTestSucceed && splitedCasesStartFromDefualt) {
            splitedCasesStartFromDefualt.some(switchCaseItem => run(switchCaseItem));
        }
    },
    "LabeledStatement": (t, scopes) => {
        execute(t.body, scopes, {
            scopeHandleHook(scope) {
                labeledScopesInfos.set(scope, { label: t.label.name, breaked: false, continued: false });
            }
        });
    },
}