const path = require('node:path')

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return
  }

  const { rcedit } = await import('rcedit')
  const executableName = `${context.packager.appInfo.productFilename}.exe`
  const executablePath = path.join(context.appOutDir, executableName)
  const iconPath = path.join(context.packager.projectDir, 'build', 'icon.ico')

  await rcedit(executablePath, {
    icon: iconPath,
  })
}
