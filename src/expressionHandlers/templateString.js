import { execute } from "../runtime.js";

export function templateLiteral(templateLiteral, scopes) {
    let result = "";
    templateLiteral.quasis.forEach((templateElement, index)=> {
        result += templateElement.value.cooked;
        templateLiteral?.expressions?.[index] && (result += execute(templateLiteral.expressions[index], scopes));
    });
    return result;
}

export function taggedTemplateExpression(taggedTemplateExpression, scopes) {
    const templateLiteral = taggedTemplateExpression.quasi;
    const param1 = templateLiteral.quasis.map(templateElement=> templateElement.value.cooked);
    Object.defineProperty(param1, "raw", {
        value: templateLiteral.quasis.map(templateElement=> templateElement.value.raw),
        enumerable: false,
    });

    const tag = taggedTemplateExpression.tag;
    // 函数调用部分
    const params = [param1, ...templateLiteral.expressions.map(expression=> execute(expression, scopes))];

    if (tag.type === "MemberExpression") {
        // 对象成员形式的调用，考虑 this
        const object = execute(tag.object, scopes);

        const property = getProperty(tag, scopes);
        return object[property](...params);
    } else {
        // 获得调用者
        const caller = execute(tag, scopes);
        return caller(...params);
    }
}