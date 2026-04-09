import { beforeEach, describe, expect, it, mock } from 'bun:test';

let commandOutputs = new Map<string, string>();
let existingPaths = new Set<string>();

mock.module('node:child_process', () => ({
  execFileSync: (command: string, args: string[]) => {
    const binaryName = args[0] ?? '';
    const key = `${command}:${binaryName}`;
    const output = commandOutputs.get(key);
    if (output === undefined) {
      throw new Error(`Unexpected execFileSync call: ${key}`);
    }
    return output;
  },
}));

mock.module('node:fs', () => ({
  existsSync: (path: string) => existingPaths.has(path),
}));

import {
  resolveBackendHostTooling,
  resolveBackendRuntimePaths,
} from '../internal/runtime-resolver.ts';
import type { BackendHostRuntimeContext } from '../types.ts';

function createHostRuntime(): BackendHostRuntimeContext {
  return {
    appRootPath: '/app',
    resourcesPath: '/resources',
    isPackaged: false,
  };
}

function setCommandOutput(binaryName: string, output: string): void {
  commandOutputs.set(`where:${binaryName}`, output);
  commandOutputs.set(`which:${binaryName}`, output);
}

describe('runtime-resolver PATH fallbacks', () => {
  beforeEach(() => {
    commandOutputs = new Map();
    existingPaths = new Set();
  });

  it('selects the first existing bun path from multi-line PATH output', () => {
    const bunPath = 'C:\\Users\\test\\AppData\\Local\\Microsoft\\WinGet\\Links\\bun.exe';
    setCommandOutput('bun', `${bunPath}\r\nC:\\Users\\test\\AppData\\Roaming\\npm\\bun.cmd`);
    existingPaths.add(bunPath);

    const result = resolveBackendRuntimePaths(createHostRuntime());

    expect(result.bundledRuntimePath).toBe(bunPath);
    expect(result.nodeRuntimePath).toBe(bunPath);
  });

  it('selects the first existing rg path from multi-line PATH output', () => {
    const rgPath = 'C:\\Users\\test\\AppData\\Local\\Programs\\rg.exe';
    setCommandOutput('rg', `${rgPath}\r\nC:\\Users\\test\\AppData\\Roaming\\npm\\rg.cmd`);
    existingPaths.add(rgPath);

    const result = resolveBackendHostTooling(createHostRuntime());

    expect(result.ripgrepPath).toBe(rgPath);
  });
});
