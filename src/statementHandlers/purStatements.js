import { execute } from "../runtime.js";
import { setVariable, getParams, getVariables } from "../shared.js";

// 纯的语句，除作用域和栈外无其他依赖，不需要改动多处，所有逻辑均在此处的语句
export default {
    "VariableDeclaration": (t, scopes) => {
        t.declarations?.forEach(declaration => {
            // 获取变量，可能是一个或是解构的多个
            const variables = getVariables({ id: declaration.id, value: execute(declaration.init, scopes) }, scopes);
            // 绑定到作用域
            Object.entries(variables).forEach(([key, value]) => setVariable({ name: key, value, kind: t.kind }, scopes));
        });
    },
    "FunctionDeclaration": (t, scopes) => {
        t.id.name && (
            setVariable(
                {
                    name: t.id.name,
                    value: function (...realParams) {
                        // 执行并且绑定参数和this
                        return (execute(t.body, scopes, { extraVariables: { "this": this, ...getParams({ params: t.params, realParams }, scopes) }, stack: true }));
                    },
                    kind: "var"
                },
                scopes
            )
        );
    },
    "ExpressionStatement": (t, scopes) => {
        execute(t.expression, scopes);
    },
    "IfStatement": (t, scopes) => {
        execute(t.test, scopes) ? execute(t.consequent, scopes) : (t.alternate && execute(t.alternate, scopes));
    },
    "ThrowStatement": (t, scopes) => {
        throw execute(t.argument, scopes);
    },
    "DebuggerStatement": () => {
        debugger;
    },
    "EmptyStatement": () => { },
    "TryStatement": (t, scopes) => {
        try {
            execute(t.block, scopes);
        } catch (e) {
            if (t.handler) {
                let extraVariables = t.handler.param ? getVariables({ id: t.handler.param, value: e }, scopes) : {};
                execute(t.handler.body, scopes, { extraVariables });
            }
        } finally {
            t.finalizer && execute(t.finalizer, scopes);
        }
    }
}