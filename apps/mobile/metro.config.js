const { getDefaultConfig } = require('expo/metro-config')
const { withNativeWind } = require('nativewind/metro')
const path = require('path')

const config = getDefaultConfig(__dirname)

const workspaceRoot = path.resolve(__dirname, '../..')
const rootNodeModules = path.resolve(workspaceRoot, 'node_modules')

// Force a single React copy. In this pnpm hoisted-linker monorepo, apps/web
// depends on a newer React than apps/mobile needs for its SDK, so some
// transitive deps (e.g. use-sync-external-store) get their own nested React
// install. Metro's normal hierarchical lookup finds that nested copy before
// ever consulting extraNodeModules (which is only a fallback, not an
// override), so resolveRequest intercepts these module names directly.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'react' || moduleName.startsWith('react/')) {
    return {
      type: 'sourceFile',
      filePath: require.resolve(moduleName, { paths: [rootNodeModules] }),
    }
  }
  return context.resolveRequest(context, moduleName, platform)
}

module.exports = withNativeWind(config, { input: './global.css' })
