const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const config = getDefaultConfig(__dirname)

const workspaceRoot = path.resolve(__dirname, '../..')

// Force a single React copy. In this pnpm hoisted-linker monorepo, apps/web
// depends on a newer React than apps/mobile needs for its SDK, so some
// transitive deps (e.g. use-sync-external-store) get their own nested React
// install — causing "Invalid hook call" when Metro resolves the wrong one.
config.resolver.extraNodeModules = {
  react: path.resolve(workspaceRoot, 'node_modules/react'),
  'react/jsx-runtime': path.resolve(workspaceRoot, 'node_modules/react/jsx-runtime'),
  'react/jsx-dev-runtime': path.resolve(workspaceRoot, 'node_modules/react/jsx-dev-runtime'),
}

module.exports = withNativeWind(config, { input: './global.css' })
