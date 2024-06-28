import { Command, flags } from "@oclif/command";
import { runMockServer } from "../../../lib/src/mock-server/server";
import { parse } from "../../../lib/src/parser";
import inferProxyConfig from "../common/infer-proxy-config";

const ARG_API = "spot_contract";

/**
 * oclif command to run a mock server based on a Spot contract
 */
export default class Mock extends Command {
  static description = "Run a mock server based on a Spot contract";

  static examples = ["$ spot mock api.ts"];

  static args = [
    {
      name: ARG_API,
      required: true,
      description: "path to Spot contract",
      hidden: false
    }
  ];

  static flags = {
    help: flags.help({ char: "h" }),
    proxyBaseUrl: flags.string({
      description:
        "If set, the server will act as a proxy and fetch data from the given remote server instead of mocking it"
    }),
    proxyFallbackBaseUrl: flags.string({
      description:
        "Like proxyBaseUrl, except used when the requested API does not match defined SPOT contract. If unset, 404 will always be returned."
    }),
    proxyMockBaseUrl: flags.string({
      description:
        "Like proxyBaseUrl, except used to proxy draft endpoints instead of returning mocked responses."
    }),
    port: flags.integer({
      char: "p",
      description: "Port on which to run the mock server",
      default: 3010,
      required: true
    }),
    pathPrefix: flags.string({
      description: "Prefix to prepend to each endpoint path"
    }),
    qwenModel: flags.string({
      description: "指定通义千问大模型，目前实现试验下来，对于 tool calling 支持比较好的只有 qwen-max 系列，qwen-plus 输出的结果不太稳定",
      char: "m"
    }),
    qwenApiKey: flags.string({
      description: "指定通义千问大模型的 api key，开启 AI 脚本生成",
      char: "k"
    }),
    enableScript: flags.boolean({
      description: "是否启用脚本功能，启用脚本功能将使用基于 AI 生成的脚本来生成模拟数据。通过这种方式生成的数据具有更好的可用性。你还需要指定 qwenApiKey 参数来开启 AI 脚本生成。",
      default: false,
      char: "s"
    }),
  };

  async run(): Promise<void> {
    const {
      args,
      flags: {
        port,
        pathPrefix,
        proxyBaseUrl,
        proxyMockBaseUrl,
        proxyFallbackBaseUrl = "",
        qwenApiKey,
        qwenModel,
        enableScript
      }
    } = this.parse(Mock);
    try {
      const proxyConfig = inferProxyConfig(proxyBaseUrl || "");
      const proxyMockConfig = inferProxyConfig(proxyMockBaseUrl || "");
      const proxyFallbackConfig = inferProxyConfig(proxyFallbackBaseUrl || "");
      const contract = parse(args[ARG_API]);
      await runMockServer(contract, {
        port,
        pathPrefix: pathPrefix ?? "",
        proxyConfig,
        proxyMockConfig,
        proxyFallbackConfig,
        logger: this,
        qwenApiKey,
        qwenModel,
        enableScript
      }).defer();
      this.log(`Mock server is running on port ${port}.`);
    } catch (e) {
      this.error(e as Error, { exit: 1 });
    }
  }
}
