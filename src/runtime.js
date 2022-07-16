import expressionHandlers from "./expressionHandlers/index.js";
import statementHandlers from "./statementHandlers/index.js";

function execute(ast, scopes = [{}], params) {
    console.log(ast);
    return executers[ast.type](ast, scopes, params);
}


const executers = {
    "Program": (t) => {
        executers.BlockStatement(t, [], { stack: true });
    },
    ...expressionHandlers,
    ...statementHandlers,
}

export {
    executers,
    execute,
}