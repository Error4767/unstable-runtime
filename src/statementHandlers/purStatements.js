import { execute } from "../runtime.js";
import { setVariable, getParams } from "../shared.js";

// 纯的语句，除作用域和栈外无其他依赖，不需要改动多处，所有逻辑均在此处的语句
export default {
    "VariableDeclaration": (t, scopes) => {
        t.declarations?.forEach(declaration => {
            setVariable({ name: declaration.id.name, value: execute(declaration.init, scopes), kind: t.kind }, scopes);
        });
    },
    "FunctionDeclaration": (t, scopes) => {
        t.id.name && (
            setVariable(
                {
                    name: t.id.name,
                    value: function (...realParams) {
                        return (execute(t.body, scopes, { extraVariables: getParams({ params: t.params, realParams }, scopes), stack: true }));
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
}