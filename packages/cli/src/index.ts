import * as relayerEngine from "@wormhole-foundation/relayer-engine";
import { EngineInitFn, EnvType, Plugin } from '@wormhole-foundation/relayer-engine';

function getEnvValue<T>(name: T) {
  return process.env[name as string] as T;
}

type DefPlugin = {
  fn: EngineInitFn<Plugin>;
  pluginName: string;
}

async function loadConfig(pluginPackage: string, envType: string = 'devnet') {
  const configFile = require.resolve(`${pluginPackage}/config/${envType.toLowerCase()}.json`);
  const config = await relayerEngine.loadFileAndParseToObject(configFile);
  return config as unknown;
}

async function initialize(pluginPackage: string): Promise<DefPlugin|undefined> {
  try {
    const config = await loadConfig(pluginPackage, process.env.ENV_TYPE);
    const { default: plugin} = await import(pluginPackage);
    return plugin.init(config);
  } catch (err: any) {
    console.error(`Unable to initialize plugin ${pluginPackage}`, err);
    return;
  }
}

async function main() {
  const plugins = process.argv.slice(2);
  const initialized = [];
  for (const pluginPackage of plugins) {
    const plugin = await initialize(pluginPackage);
    if (plugin) {
      initialized.push(plugin);
    }
  }
  const mode =
    (process.env.RELAYER_ENGINE_MODE?.toUpperCase() as relayerEngine.Mode) ||
    relayerEngine.Mode.BOTH;
      // run relayer engine
  await relayerEngine.run({
    configs: "./relayer-engine-config",
    plugins: initialized,
    mode,
  });
}

// allow main to be an async function and block until it rejects or resolves
main().catch(e => {
  console.error(e);
  process.exit(1);
});
