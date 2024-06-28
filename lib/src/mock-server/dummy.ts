import assertNever from "assert-never";
import { generate as generateRandomString } from "randomstring";
import {ObjectPropertiesType, SchemaProp, Type, TypeKind, TypeTable} from "../types";
import {getScript, saveScript} from "./script-store";
import fetch from "node-fetch";
import {mockConfig} from "./mock-config";


/**
 * Generates dummy data based on a type.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateData(types: TypeTable, type: Type): any {
  if ('schemaProps' in type) {
    const schemaProps: SchemaProp[] | undefined = type.schemaProps
    const defaultValue = schemaProps
      ?.filter((schemaProp) => schemaProp.name === 'default')
      ?.map(schemaProp => schemaProp.value)
    if (defaultValue) {
      return defaultValue[0];
    }
  }
  switch (type.kind) {
    case TypeKind.NULL:
      return null;
    case TypeKind.BOOLEAN:
      return randomBoolean();
    case TypeKind.BOOLEAN_LITERAL:
      return type.value;
    case TypeKind.FILE:
    case TypeKind.STRING:
      return generateRandomString();
    case TypeKind.STRING_LITERAL:
      return type.value;
    case TypeKind.FLOAT:
    case TypeKind.DOUBLE:
    case TypeKind.DECIMAL:
      return randomDouble(100);
    case TypeKind.INT32:
      return randomInteger(100);
    case TypeKind.INT64:
      return Math.pow(2, 50) + randomInteger(10000);
    case TypeKind.DATE:
    case TypeKind.DATE_TIME:
      return new Date().toISOString();
    case TypeKind.INT_LITERAL:
    case TypeKind.FLOAT_LITERAL:
      return type.value;
    case TypeKind.OBJECT:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return type.properties.reduce<{ [key: string]: any }>(
        (
          acc,
          property
        ): {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [key: string]: any;
        } => {
          if (randomBoolean() || !property.optional) {
            acc[property.name] = generateObjectPropertyData(types, property);
          }
          return acc;
        },
        {}
      );
    case TypeKind.ARRAY: {
      const size = randomInteger(10);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const array: any[] = [];
      for (let i = 0; i < size; i++) {
        array.push(generateData(types, type.elementType));
      }
      return array;
    }
    case TypeKind.INTERSECTION:
      return type.types.map(type => generateData(types, type));
    case TypeKind.UNION:
      return generateData(
        types,
        type.types[randomInteger(type.types.length - 1)]
      );
    case TypeKind.REFERENCE: {
      const referencedType = types.get(type.name)?.type;
      if (!referencedType) {
        throw new Error(`Missing referenced type: ${type.name}`);
      }
      return generateData(types, referencedType);
    }
    default:
      throw assertNever(type);
  }
}

function randomBoolean(): boolean {
  return Math.random() > 0.5;
}

function randomInteger(max: number): number {
  return Math.round(randomDouble(max));
}

function randomDouble(max: number): number {
  return Math.random() * max;
}

export function generateObjectPropertyData(types: TypeTable, propertyType: ObjectPropertiesType): any {
  const type = propertyType.type
  switch (type.kind) {
    case TypeKind.BOOLEAN_LITERAL:
      return type.value;
    case TypeKind.INT_LITERAL:
    case TypeKind.FLOAT_LITERAL:
      return type.value;
    case TypeKind.STRING_LITERAL:
      return type.value;
    case TypeKind.NULL:
    case TypeKind.BOOLEAN:
    case TypeKind.FILE:
    case TypeKind.STRING:
    case TypeKind.FLOAT:
    case TypeKind.DOUBLE:
    case TypeKind.DECIMAL:
    case TypeKind.INT32:
    case TypeKind.INT64:
    case TypeKind.DATE:
    case TypeKind.DATE_TIME:
      return generateByScript({
        name: propertyType.name,
        description: propertyType.description,
        type: propertyType.type.kind
      }) ?? generateData(types, type)
    case TypeKind.OBJECT:
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return type.properties.reduce<{ [key: string]: any }>(
        (
          acc,
          property
        ): {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [key: string]: any;
        } => {
          acc[property.name] = generateObjectPropertyData(types, property);
          return acc;
        },
        {}
      );
    case TypeKind.ARRAY: {
      const size = 10;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const array: any[] = [];
      for (let i = 0; i < size; i++) {
        array.push(generateData(types, type.elementType));
      }
      return array;
    }
    case TypeKind.INTERSECTION:
      return type.types.map(type => generateData(types, type));
    case TypeKind.UNION:
      return generateData(
        types,
        type.types[randomInteger(type.types.length - 1)]
      );
    case TypeKind.REFERENCE: {
      const referencedType = types.get(type.name)?.type;
      if (!referencedType) {
        throw new Error(`Missing referenced type: ${type.name}`);
      }
      return generateData(types, referencedType);
    }
    default:
      throw assertNever(type);
  }
}

function generateByScript(meta: {name: string, description?: string, type: TypeKind}) {
  if (!mockConfig.isEnableScript()) {
    return;
  }
  const func = getScript(meta);
  if (func) {
    return func();
  }
  generateScriptFromAI(meta);
  return;
}


function generateScriptFromAI(meta: {name: string, description?: string, type: TypeKind}) {
  const spotQWenApiKey = mockConfig.getQwenApiKey()
  const model = mockConfig.getQwenModel()
  if (!spotQWenApiKey) {
    return
  }
  const tools = [
    {
      type: "function",
      function: {
        name: "generate_data_use_fakerjs",
        description: "执行 @faker-js/faker 语句，返回生成的 mock 数据结果",
        parameters: {
          type: "object",
          properties: {
            script: {
              type: "string",
              description: "使用 @faker-js/faker[version=8.4.1] 生成目标数据的单行语句，以 \"faker.\"开头"
            }
          },
          required: [
            "script",
          ]
        }
      }
    }
  ]

  const body = {
    model: model,
    input: {
      messages: [
        {
          role: "user",
          content: `该 json 描述了一个字段：
"""
  {
    name: "${meta.name}",
    description: "${meta.description}",
    type: "${meta.type}"
  }
"""
使用 @faker-js/faker[version=8.4.1] 生成一个该字段描述的 mock 数据 `
        }
      ]
    },
    parameters: {
      result_format: "message",
      tools: tools
    }
  }
  const url = 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
  // 设置请求头，包括内容类型为 application/json
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      "Authorization": `Bearer ${spotQWenApiKey}`
    },
    body: JSON.stringify(body) // 将 JavaScript 对象转换为 JSON 字符串
  };

  type AiResult = {
    output: {
      choices: {
        finish_reason: string;
        message: {
          tool_calls: {
            function: {
              name: string;
              arguments: string;
            }
          }[]
        }
      }[]
    }
  }
  fetch(url, options)
    .then(res => {
      if (res.ok) {
        res.json().then((data: AiResult) => {
          if (data.output.choices[0].finish_reason === 'tool_calls') {
            const script = JSON.parse(data.output.choices[0].message.tool_calls[0].function.arguments)['script']
            saveScript(meta, script)
          }
        })
      }
    })
}