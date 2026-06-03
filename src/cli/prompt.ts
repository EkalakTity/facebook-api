import inquirer from 'inquirer'

export async function askText(question: string, defaultValue = ''): Promise<string> {
  const { answer } = await inquirer.prompt([{
    type: 'input',
    name: 'answer',
    message: question,
    default: defaultValue,
  }])
  return answer as string
}

export async function askSelect<T>(
  question: string,
  choices: { name: string; value: T }[]
): Promise<T> {
  const { answer } = await inquirer.prompt([{
    type: 'list',
    name: 'answer',
    message: question,
    choices,
  }])
  return answer as T
}

export async function askConfirm(question: string, defaultValue = false): Promise<boolean> {
  const { answer } = await inquirer.prompt([{
    type: 'confirm',
    name: 'answer',
    message: question,
    default: defaultValue,
  }])
  return answer as boolean
}

export async function askNumber(question: string, defaultValue = 1): Promise<number> {
  const { answer } = await inquirer.prompt([{
    type: 'number',
    name: 'answer',
    message: question,
    default: defaultValue,
  }])
  return Number(answer)
}
