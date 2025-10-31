# spot-liangjihua

spot-liangjihua 对 @airtasker/spot 进行了如下增强:

1. 添加了对 endpoint 的 extension 的支持
2. 添加了 File 类型参数，可以用于文件上传、下载
3. 添加了 Decimal 类型参数的支持
4. 支持指定 contentType
5. 添加了 tag group 的支持
6. 添加了基于 AI 脚本生成的 mock 功能


## endpoint 支持 extension

```ts
import { queryParams, body, endpoint, request, response } from "spot-liangjihua";

/**
 * sample endpoint
 */
@endpoint({
  path: '/sample',
  method: 'GET',
  extension: {  // 声明扩展字段
    'x-foo': "bar",
    'x-operation-extra-annotation': [  // 扩展的值可以是 array 或 object
      `@PreAuthorize("hasRole('ROLE_ADMIN')")`
    ]
  }
})
class SamplePath {

  @request
  request(
    @queryParams queryParams: {
      /**
       * 请求id
       */
      id: string
    }
  ) {}

  @response({ status: 200 })
  response(
    @body() body: string
  ) {}
}
```

该脚本会生成以下 openapi 片段：
```yaml
# ... 省略部分结构
/sample:
  get:
    x-foo: bar
    x-operation-extra-annotation:
      - '@PreAuthorize("hasRole(''ROLE_ADMIN'')")'
    description: sample endpoint
    summary: sample endpoint
    operationId: SamplePath
    parameters:
      - name: id
        in: query
        description: 请求id
        required: true
        schema:
          type: string
    responses:
      '200':
        description: 200 response
        content:
          application/json:
            schema:
              type: string
```

## File 类型参数

File 类型参数通常需要手动指定请求/响应 contentType

```ts
/**
 * 上传图片，并返回图片
 */
@endpoint({
  path: '/sample',
  method: 'POST'
})
class SampleFile {
  @request
  request(
    @body({contentType: "multipart/form-data"}) body: {
      /**
       * 请求id
       */
      photos: File
    }
  ) {}

  @response({ status: 200 })
  response(
    @body({contentType: "image/png"}) body: File
  ) {}
}
```

该脚本会生成以下 openapi 片段：

```yaml
# ... 省略部分结构
/sample:
  post:
    description: 上传图片，并返回图片
    summary: 上传图片，并返回图片
    operationId: SampleFile
    parameters: []
    requestBody:
      content:
        multipart/form-data:
          schema:
            type: object
            properties:
              photos:
                type: string
                format: binary
                description: 请求id
            required:
              - photos
      required: true
    responses:
      '200':
        description: 200 response
        content:
          image/png:
            schema:
              type: string
              format: binary
```

## Decimal 类型参数

Decimal 类型参数的用于在代码生成中生成 Decimal 类型，而非 double 或 float 。

```ts
/**
 * decimal 参数
 */
@endpoint({
  path: '/sample',
  method: 'POST'
})
class SampleEndpoint {
  @request
  request(
    @body() body: {
      /**
       * 金额
       */
      amount: Decimal
    }
  ) {}

  @response({ status: 200 })
  response(
    @body() body: Decimal
  ) {}
}

```

该脚本会生成以下 openapi 片段：

```yaml
# ... 省略部分结构
/sample:
  post:
    description: decimal 参数
    summary: decimal 参数
    operationId: SampleEndpoint
    parameters: []
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              amount:
                type: number
                description: 金额
            required:
              - amount
      required: true
    responses:
      '200':
        description: 200 response
        content:
          application/json:
            schema:
              type: number
```

## tag group

tag group 是 openapi 提供的分组方式。通常在生成客户端代码时，会根据 tag group 生成不同的模块。

```ts
/**
 * sample one
 */
@endpoint({
  path: '/sample/one',
  method: 'GET',
  tags: [
    'sample',
    'one'
  ]
})
class SampleOne {
  @request
  request() {}

  @response({ status: 200 })
  response() {}
}


/**
 * sample two
 */
@endpoint({
  path: '/sample/two',
  method: 'GET',
  tags: [
    'sample',
    'two'
  ]
})
class SampleTwo {
  @request
  request() {}

  @response({ status: 200 })
  response() {}
}
```

```yaml
# ... 省略部分结构
/sample/one:
  get:
    tags:
      - one
      - sample
    description: sample one
    summary: sample one
    operationId: SampleOne
    parameters: []
    responses:
      '200':
        description: 200 response
  /sample/two:
    get:
      tags:
        - sample
        - two
      description: sample two
      summary: sample two
      operationId: SampleTwo
      parameters: []
      responses:
        '200':
          description: 200 response

# ... 省略部分结构
tags:
  - name: sample
  - name: one
  - name: two
```

在入口文件中可以定义所有 tag 的描述:

```ts
import {api, tag} from "spot-liangjihua";


@api({
  name: "sample api"
})
class Api {

  /**
   * 示例
   */
  @tag
  sample() {}
  
  /**
   * 一号示例
   */
  @tag
  one() {}
  
  /**
   *  二号示例
   */
  @tag
  two() {}
}
```

这会生成以下 openapi 片段：

```yaml

tags:
  - name: sample
    description: 示例
  - name: one
    description: 一号示例
  - name: two
    description: 二号示例
```

## 基于 AI 脚本生成的 mock server

mock server 使得接口在定义完成后立即就可以访问，这解耦了界面开发与接口开发。
但 mock server 返回的数据是混乱的，无意义的。mock server 仅能够根据参数类型生成 mock 数据，无法根据业务逻辑生成 mock 数据。
构造良好的 mock 数据在以前需要工程师使用如 faker.js 之类的库手动编写，这非常耗时。

通过 AIGC，我们可以自动生成有语义的 faker.js 脚本，mock server 调用这些脚本来生成 mock 数据。

如以下接口定义：

```ts
/**
 * 用户信息
 */
@endpoint({
  path: '/api/user',
  method: 'GET',
  tags: [
    'user'
  ]
})
class GetUser {
  @request
  request(){}

  @response({status: 200})
  response(
    @body() body: UserInfo
  ){}
}

/**
 * 用户信息
 */
interface UserInfo {
  
  /** 用户昵称 */
  nickname: string;
  
  /** 用户头像 */
  avatar: string;

  /** 用户手机号 */
  phone: string;
  
  /** 用户ID，大于0 */
  userId: Int64;
}
```

mock server 生成数据（未开启AI）：

```json
{
  "nickname": "CoO17XfPOhgoAzTkHz1oMyZdiswOnPhc",
  "avatar": "GzcGR9GcQyb9CmHc7blkAMSQnhSUdeOx",
  "phone": "858pfhJw8rqs0JOWynMbqTWtJ75wcZiX",
  "userId": 1125899906848255
}
```

mock server 生成数据（开启 AI）：

```json
{
  "nickname": "Hadley",
  "avatar": "https://avatars.githubusercontent.com/u/45949971",
  "phone": "833-3808-4110",
  "userId": 83006
}
```

后者明显要友好的多，也更符合实际业务。

mock server 通过两个参数启用 AI 生成：

- enableScript: 启用脚本生成。`注意，运行未经过检验的脚本可能导致安全问题，不要在服务器上启用此功能`
- qwenApiKey: 提供通义千问调用的 api key，通义千问用于生成 faker.js 脚本

这两个参数可以通过命令行传入 ：

```shell
npx spot-liangjihua mock api.ts --enableScript --qwenApiKey=${YOUR_QWEN_API_KEY}
```

或环境变量：

```shell
export SPOT_ENABLE_SCRIPT=true
export SPOT_QWEN_API_KEY=${YOUR_QWEN_API_KEY}
npx spot-liangjihua mock api.ts
```

同时传入的情况下，命令行的优先级高于环境变量。
