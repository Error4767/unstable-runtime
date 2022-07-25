import { getVariables } from "./variable.js";

// 获取参数，返回一个对象，内含所有需要绑定的参数，需要绑定到作用域中
export function getParams({ params, realParams, this: self }, scopes) {
    const result = {};
    // 如果有绑定 this
    if (self) {
        scope["this"] = self;
    }
    params?.forEach((param, index) => {

        const hasValue = realParams.hasOwnProperty(index);
        const value = hasValue ? realParams[index] : undefined;

        if (param.type === "AssignmentPattern") {
            const { left, right: initial } = param;
            Object.assign(result, getVariables({ id: left, value: value || initial }, scopes));
        } else if (param) {
            Object.assign(result, getVariables({ id: param, value }, scopes));
        }
    });
    return result;
}