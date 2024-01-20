import { ParameterDeclaration } from "ts-morph";
import { Body } from "../definitions";
import { OptionalNotAllowedError, ParserError } from "../errors";
import { LociTable } from "../locations";
import { TypeTable } from "../types";
import { err, ok, Result } from "../util";
import { parseType } from "./type-parser";
import {
  getDecoratorConfigOrThrow,
  getObjLiteralPropOrThrow,
  getPropValueAsStringOrThrow
} from "./parser-helpers";
import {BodyConfig} from "../syntax/body";

export function parseBody(
  parameter: ParameterDeclaration,
  typeTable: TypeTable,
  lociTable: LociTable
): Result<Body, ParserError> {
  // TODO: retrieve JsDoc as body description https://github.com/dsherret/ts-morph/issues/753
  parameter.getDecoratorOrThrow("body");
  if (parameter.hasQuestionToken()) {
    return err(
      new OptionalNotAllowedError("@body parameter cannot be optional", {
        file: parameter.getSourceFile().getFilePath(),
        position: parameter.getQuestionTokenNodeOrThrow().getPos()
      })
    );
  }

  const decorator = parameter.getDecoratorOrThrow("body");
  const decoratorConfig = getDecoratorConfigOrThrow(decorator);
  const contentTypeProp = getObjLiteralPropOrThrow<BodyConfig>(
    decoratorConfig,
    "contentType"
  );
  const contentTypeLiteral = getPropValueAsStringOrThrow(contentTypeProp);
  const typeResult = parseType(
    parameter.getTypeNodeOrThrow(),
    typeTable,
    lociTable
  );

  if (typeResult.isErr()) return typeResult;
  // TODO: add loci information
  return ok({
    contentType: contentTypeLiteral.getLiteralValue(),
    type: typeResult.unwrap(),
    required: !parameter.isOptional()
  });
}
