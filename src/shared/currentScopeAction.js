// 设置指定作用域变量
export function setThisScopeVariable({ name, value, kind = "var" }, scope) {
    // 当前作用域不存在该变量，直接设置
    if (!scope.hasOwnProperty(name)) {
        return scope[name] = { kind, value };
    } else {
        const variable = scope[name];
        // ----严格模式 重复声明变量会报错----
        // 不允许修改常量
        if (variable.kind === "const") {
            throw new TypeError("Assignment to constant variable.");
        } else {
            return scope[name] = { kind, value };
        }
    }
}

// 绑定变量到这个作用域
export function bindVariablesToThisScope({ variables, kind = "var" }, scope) {
    for (let key in variables) {
        const value = variables[key];
        setThisScopeVariable({ name: key, value }, scope);
    }
}