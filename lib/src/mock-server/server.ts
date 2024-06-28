import cors from "cors";
import express from "express";
import { Contract } from "../definitions";
import {TypeKind, TypeTable} from "../types";
import { Logger } from "../utilities/logger";
import { generateData } from "./dummy";
import { isRequestForEndpoint } from "./matcher";
import { proxyRequest } from "./proxy";
import {mockConfig} from "./mock-config";


export interface ProxyConfig {
  isHttps: boolean;
  host: string;
  port: number | null;
  path: string;
}

/**
 * Runs a mock server that returns dummy data that conforms to an API definition.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export function runMockServer(
  api: Contract,
  {
    port,
    pathPrefix,
    proxyConfig,
    proxyMockConfig,
    proxyFallbackConfig,
    logger,
    qwenApiKey,
    qwenModel,
    enableScript
  }: {
    port: number;
    pathPrefix: string;
    proxyConfig?: ProxyConfig | null;
    proxyMockConfig?: ProxyConfig | null;
    proxyFallbackConfig?: ProxyConfig | null;
    logger: Logger;
    qwenApiKey?: string;
    qwenModel?: string;
    enableScript: boolean
  }
) {

  mockConfig.init({qwenApiKey, qwenModel, enableScript}, logger)

  const app = express();
  app.use(express.raw({ type: () => true }));
  app.use(cors());
  app.use((req, resp, next) => {
    if (req.path.includes("/_draft/")) {
      req.url = req.url.replace("/_draft/", "/");
    }
    next();
  });
  app.use((req, resp) => {
    for (const endpoint of api.endpoints) {
      if (isRequestForEndpoint(req, pathPrefix, endpoint)) {
        // non-draft end points get real response
        const shouldProxy = !endpoint.draft;

        // Proxy non-draft requests if we have a proxy config.
        if (shouldProxy && proxyConfig) {
          return proxyRequest({
            incomingRequest: req,
            response: resp,
            proxyConfig
          });
        }

        // For draft endpoints, either proxy or generate a mocked response.
        if (proxyMockConfig) {
          return proxyRequest({
            incomingRequest: req,
            response: resp,
            proxyConfig: proxyMockConfig
          });
        } else {
          logger.log(`Request hit for ${endpoint.name} registered.`);
          const response = endpoint.responses[0] ?? endpoint.defaultResponse;
          if (!response) {
            logger.error(`No response defined for endpoint ${endpoint.name}`);
            return;
          }
          resp.status("status" in response ? response.status : 200);
          resp.header("content-type", response.body?.contentType);
          if (response.body) {
            if (response.body.type.kind === TypeKind.FILE) {
              resp.setHeader('Content-disposition', 'attachment; filename=mockfile');
              resp.write("mockfile")
              resp.status(200)
              resp.end()
            } else {
              resp.send(
                JSON.stringify(
                  generateData(TypeTable.fromArray(api.types), response.body.type)
                )
              );
            }
          }
        }
        return;
      }
    }

    logger.log(`No match for request ${req.method} at ${req.path}.`);
    if (proxyFallbackConfig) {
      return proxyRequest({
        incomingRequest: req,
        response: resp,
        proxyConfig: proxyFallbackConfig
      });
    } else {
      resp.status(404);
      resp.send();
    }
  });
  return {
    app,
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    defer: () => new Promise<void>(resolve => app.listen(port, resolve))
  };
}
