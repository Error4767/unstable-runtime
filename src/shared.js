export {
    stackInfos,
    isStack,
    findStack,
    createRawScope,
    createScope,
    loopScopesInfos, 
    labeledScopesInfos, 
    findScopeInScopeMapsInThisStack, 
    findLabelScopeInThisStack, 
    scopeIsExecuted, 
    scopeChainIsExecuted,
} from "./shared/scope.js";
export { getVariable, setVariable, getVariables } from "./shared/variable.js";
export { setThisScopeVariable, bindVariablesToThisScope } from "./shared/currentScopeAction.js";
export { getParams } from "./shared/function.js";
export { getProperty } from "./shared/property.js";