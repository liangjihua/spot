import path from "path";
import {homedir} from "os";
import fs from "fs-extra";
import {TypeKind} from "../types";
import importSync from "import-sync";
import { execSync } from 'child_process';

const destinationPath = path.join(homedir(), '.spot-liangjihua-cache')
fs.ensureDirSync(destinationPath)
execSync('npm i @faker-js/faker@8.4.1', {cwd: destinationPath})


export function getScript(meta: {name: string, description?: string, type: TypeKind}) {
  const fileName = generateScriptFileName(meta);
  const filePath = path.join(destinationPath, fileName)
  if (fs.existsSync(filePath)) {
    const script = importSync(filePath)
    return script['generate']
  }
}

export function saveScript(meta: {name: string, description?: string, type: TypeKind}, script: String) {
  const fileName = generateScriptFileName(meta);
  const filePath = path.join(destinationPath, fileName)
  fs.writeFileSync(filePath, `
import { faker } from '@faker-js/faker';
export function generate () {
  return eval(\`${script}\`);
}
  `)
}

function generateScriptFileName(meta: {name: string, description?: string, type: TypeKind}) {
  return `${meta.name}${meta.description ? '_' + meta.description : ''}_${meta.type}.js`
}

