export const variableCache: Record<string, number> = {}

export const VARIABLE_PATTERN = /([a-zA-Z]+)\s*=\s*([0-9\.]+)/g
export const EQUATION_PATTERN = /([a-zA-Z]+)\s*=\s*([a-zA-Z0-9\+\-\*\/\^\(\) ]+)/g
export const FUNCTION_PATTERN = /([a-zA-Z]+)\s*\(([^)]+)\)/g
export const OPERATOR_PATTERN = /([+\-*\/\^])/g

export const FUNCTION_NAME_PATTERN = /([a-zA-Z]+)\s*\(/g
export const FUNCTION_ARGS_PATTERN = /\(([^)]+)\)/g
export const FUNCTION_ARGS_SPLIT_PATTERN = /,\s*/

export const evaluateExpression = (equation: string, variables: Record<string, number> = {}): number => {
  // Replace variables in the equation with their values
  const replacedEquation = equation.replace(VARIABLE_PATTERN, (_, variable, value) => {
    variables[variable] = parseFloat(value)
    return ''
  })

  // Replace functions in the equation with their values
  const replacedFunctions = replacedEquation.replace(FUNCTION_PATTERN, (_, functionName, args) => {
    const argsArray = args.split(FUNCTION_ARGS_SPLIT_PATTERN).map((arg: string) => parseFloat(arg.trim()))
    return `${functionName}(${argsArray.join(',')})`
  })

  // Evaluate the equation
  const evaluatedEquation = replacedFunctions.replace(OPERATOR_PATTERN, (_, operator) => {
    return ` ${operator} `
  })

  // Return the result
  return eval(evaluatedEquation)
}

export const evaluate = (equation: string, variables: Record<string, number> = {}): number => {
  // Replace variables in the equation with their values
  const replacedEquation = equation.replace(VARIABLE_PATTERN, (_, variable, value) => {
    variables[variable] = parseFloat(value)
    return ''
  })

  // Evaluate the equation
  const evaluatedEquation = replacedEquation.replace(EQUATION_PATTERN, (_, variable, expression) => {
    return `${variable} = ${evaluateExpression(expression, variables)}`
  })

  // Return the result
  return evaluateExpression(evaluatedEquation, variables)
}