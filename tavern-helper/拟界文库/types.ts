type LocalVariableOption = {
  type: 'global' | 'script';
  script_id?: string;
};

type VariableRoot = Record<string, unknown>;
type VariableTable = Record<string, VariableRoot | undefined>;

function getVariableTable(option: LocalVariableOption): VariableTable | null {
  const get_variables = getApiFunction('getVariables');
  if (typeof get_variables !== 'function') {
    return null;
  }
  try {
    return (get_variables(option) as VariableTable | null) || {};
  } catch (error) {
    console.warn('[LoreFrame] 读取酒馆变量失败', option, error);
    return null;
  }
}

function replaceVariableTable(variables: VariableTable, option: LocalVariableOption): boolean {
  const replace_variables = getApiFunction('replaceVariables');
  if (typeof replace_variables !== 'function') {
    return false;
  }
  try {
    replace_variables(variables, option);
    return true;
  } catch (error) {
    console.warn('[LoreFrame] 写入酒馆变量失败', option, error);
    return false;
  }
}

function getCurrentScriptVariableOption(): LocalVariableOption {
  const get_script_id = getApiFunction('getScriptId');
  if (typeof get_script_id === 'function') {
    try {
      const script_id = get_script_id() as string | null | undefined;
      if (script_id) {
        return { type: 'script', script_id };
      }
    } catch (error) {
      console.warn('[LoreFrame] 获取脚本 ID 失败，尝试使用当前脚本上下文', error);
    }
  }
  return { type: 'script' };
}

function readGlobalVariableValue<T>(key: string, fallback: T): T {
  const variables = getVariableTable({ type: 'global' });
  const new_value = variables?.[VARIABLE_ROOT_KEY]?.[key] as T | undefined;
  if (new_value !== undefined) {
    return new_value;
  }
  const old_value = variables?.[OLD_VARIABLE_ROOT_KEY]?.[key] as T | undefined;
  if (old_value !== undefined) {
    writeGlobalVariableValue(key, old_value);
    return old_value;
  }
  return fallback;
}

function readGlobalVariableValueFromRoot<T>(root_key: string, key: string, fallback: T): T {
  const variables = getVariableTable({ type: 'global' });
  return (variables?.[root_key]?.[key] as T | undefined) ?? fallback;
}

function writeGlobalVariableValue(key: string, value: unknown): boolean {
  const variables = getVariableTable({ type: 'global' });
  if (!variables) {
    return false;
  }
  const root =
    variables[VARIABLE_ROOT_KEY] && typeof variables[VARIABLE_ROOT_KEY] === 'object'
      ? (variables[VARIABLE_ROOT_KEY] as VariableRoot)
      : {};
  return replaceVariableTable(
    {
      ...variables,
      [VARIABLE_ROOT_KEY]: {
        ...root,
        [key]: value,
      },
    },
    { type: 'global' },
  );
}

function readScriptVariableValue<T>(key: string, fallback: T): T {
  const variables = getVariableTable(getCurrentScriptVariableOption()) || getVariableTable({ type: 'script' });
  const new_value = variables?.[VARIABLE_ROOT_KEY]?.[key] as T | undefined;
  if (new_value !== undefined) {
    return new_value;
  }
  const old_value = variables?.[OLD_VARIABLE_ROOT_KEY]?.[key] as T | undefined;
  if (old_value !== undefined) {
    writeScriptVariableValue(key, old_value);
    return old_value;
  }
  return fallback;
}

function writeScriptVariableValue(key: string, value: unknown): boolean {
  const option = getCurrentScriptVariableOption();
  const variables = getVariableTable(option) || getVariableTable({ type: 'script' });
  if (!variables) {
    return false;
  }
  const root =
    variables[VARIABLE_ROOT_KEY] && typeof variables[VARIABLE_ROOT_KEY] === 'object'
      ? (variables[VARIABLE_ROOT_KEY] as VariableRoot)
      : {};
  const next_variables = {
    ...variables,
    [VARIABLE_ROOT_KEY]: {
      ...root,
      [key]: value,
    },
  };
  return replaceVariableTable(next_variables, option) || replaceVariableTable(next_variables, { type: 'script' });
}

function createPromptId() {
  return `prompt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createGenerationId() {
  return `${SCRIPT_ID}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
