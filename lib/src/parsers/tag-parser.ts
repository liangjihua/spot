import {ClassDeclaration, MethodDeclaration} from "ts-morph";
import {Tag} from "../definitions";
import {ParserError} from "../errors";
import {ok, Result} from "../util";
import {TypeTable} from "../types";
import {LociTable} from "../locations";
import {getJsDoc} from "./parser-helpers";


export function parseTags(
  klass: ClassDeclaration,
  typeTable: TypeTable,
  lociTable: LociTable
): Result<Tag[], ParserError> {
  const tagMethods = klass
    .getMethods()
    .filter(m => m.getDecorator("tag") !== undefined);

  const tags: Tag[] = [];
  for (const method of tagMethods) {
    const serverResult = parseTag(method, typeTable, lociTable);
    if (serverResult.isErr()) return serverResult;
    tags.push(serverResult.unwrap());
  }
  return ok(tags);
}

export function parseTag(
  tagMethod: MethodDeclaration,
  typeTable: TypeTable,
  lociTable: LociTable
): Result<Tag, ParserError> {
  tagMethod.getDecoratorOrThrow("tag");
  if (tagMethod.getParameters().length > 0) {
    throw new ParserError(
      `@tag method can not have any parameter`, {
        file: tagMethod.getSourceFile().getFilePath(),
        position: tagMethod.getPos()
      }
    )
  }
  const name = tagMethod.getName()
  const description = getJsDoc(tagMethod)?.getDescription().trim()
  return ok({
    name,
    description
  })
}