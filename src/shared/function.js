// 获取参数，返回一个对象，内含所有需要绑定的参数，需要绑定到作用域中
export function getParams({ params, realParams, this: self }, scopes) {
    const result = {};
    // 如果有绑定 this
    if (self) {
        scope["this"] = self;
    }
    params?.forEach((param, index) => {
        const hasValue = realParams.hasOwnProperty(index);
        if (param.type === "Identifier") {
            // 有的时候才绑定
            hasValue && (result[param.name] = realParams[index]);
        } else if (param.type === "AssignmentPattern") {
            const { left, right: initial } = param;
            if (left.type === "Identifier") {
                result[left.name] = realParams[index] || execute(initial, scopes);
            } else {
                // ----解构暂未支持----
                throw new Error("解构暂时不支持");
            }
        } else if (null) {// ----解构暂未支持----

        }
    });
    return result;
}