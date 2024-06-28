import {Logger} from "../utilities/logger";

class MockConfig {
  private qwenApiKey?: string;
  private qwenModel?: string;
  private enableScript?: boolean

  getQwenApiKey(): string | undefined {
    return this.qwenApiKey ?? process.env.SPOT_QWEN_API_KEY;
  }
  getQwenModel(): string {
    return this.qwenModel ?? process.env.SPOT_QWEN_MODEL ?? "qwen-max-0428";
  }
  isEnableScript(): boolean | undefined {
    return this.enableScript ?? process.env.SPOT_ENABLE_SCRIPT === "true"
  }

  init({qwenApiKey, qwenModel, enableScript}: {qwenApiKey?: string, qwenModel?: string, enableScript?: boolean},
       logger: Logger) {
    this.qwenApiKey = qwenApiKey;
    this.qwenModel = qwenModel;
    this.enableScript = enableScript;
    if (this.isEnableScript()) {
      logger.log("启用脚本 mock。请注意，这可能导致不安全的脚本被执行。")
      if(this.getQwenApiKey()) {
        logger.log("启用 AI 脚本生成，代码生成模型： " + this.getQwenModel())
      }
    } else if (this.getQwenApiKey()) {
      logger.log("检测到 qwen_api_key，但未启用脚本 mock，AI脚本生成不会被启用。")
    }
  }
}

const mockConfig = new MockConfig();

export { mockConfig };