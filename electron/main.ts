import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import fs from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const APP_DISPLAY_NAME = 'Graphic Arts Institute'

app.setName(APP_DISPLAY_NAME)

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null
let updateCheckStarted = false

type StoredCsvImport = {
  id: string
  fileName: string
  updatedAt: string
  rowCount: number
  filePath: string
  csvText: string
  students: Array<{
    name: string
    technology: string
    roll: string
    registrationNo: string
    session: string
    shift: string
  }>
}

type CsvFolderSettings = {
  folderPath: string
}

type AppLocationSettings = {
  csvFolderPath: string
  signatureFolderPath: string
  firstRunSetupCompleted: boolean
}

type SaveCsvFileRequest = {
  filePath: string
  csvText: string
}

type SaveSignatureImageRequest = {
  dataUrl: string
  originalName: string
}

type DeleteSignatureImageRequest = {
  fileUrl: string
}

type AppUpdateStatus = {
  state: 'available' | 'downloading' | 'downloaded' | 'installing'
  message: string
  version?: string
  percent?: number
}

function getUniquePaths(paths: string[]) {
  return Array.from(new Set(paths))
}

function getUserDataPathCandidates() {
  return getUniquePaths([
    app.getPath('userData'),
    path.join(app.getPath('appData'), APP_DISPLAY_NAME),
    path.join(app.getPath('appData'), 'gai'),
  ])
}

async function readFirstExistingTextFile(paths: string[]) {
  for (const filePath of paths) {
    try {
      return await fs.readFile(filePath, 'utf8')
    } catch {
      // Continue through known app data locations from older/package-name builds.
    }
  }

  return ''
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'app-settings.json')
}

function getSettingsPathCandidates() {
  return getUserDataPathCandidates().map((folderPath) => path.join(folderPath, 'app-settings.json'))
}

function getLegacyCsvSettingsPathCandidates() {
  return getUserDataPathCandidates().map((folderPath) => path.join(folderPath, 'csv-settings.json'))
}

function getInstallerSettingsPathCandidates() {
  return getUserDataPathCandidates().map((folderPath) => path.join(folderPath, 'installer-settings.ini'))
}

function getImageFolderPath() {
  return path.join(app.getPath('userData'), 'images')
}

function getDefaultSignatureFolderPath() {
  return path.join(getImageFolderPath(), 'signatures')
}

function createDefaultAppLocationSettings(): AppLocationSettings {
  return {
    csvFolderPath: '',
    signatureFolderPath: getDefaultSignatureFolderPath(),
    firstRunSetupCompleted: false,
  }
}

async function readLegacyCsvFolderPath() {
  try {
    const content = await readFirstExistingTextFile(getLegacyCsvSettingsPathCandidates())

    if (!content) {
      return ''
    }

    const settings = JSON.parse(content) as CsvFolderSettings

    return settings.folderPath || ''
  } catch {
    return ''
  }
}

async function readInstallerLocationSettings(): Promise<Partial<AppLocationSettings>> {
  try {
    const content = await readFirstExistingTextFile(getInstallerSettingsPathCandidates())

    if (!content) {
      return {}
    }

    const settings: Partial<AppLocationSettings> = {}

    for (const line of content.split(/\r?\n/)) {
      const separatorIndex = line.indexOf('=')

      if (separatorIndex === -1) {
        continue
      }

      const key = line.slice(0, separatorIndex).trim()
      const value = line.slice(separatorIndex + 1).trim()

      if (key === 'csvFolderPath') {
        settings.csvFolderPath = value
      }

      if (key === 'signatureFolderPath') {
        settings.signatureFolderPath = value
      }
    }

    if (settings.csvFolderPath && settings.signatureFolderPath) {
      settings.firstRunSetupCompleted = true
    }

    return settings
  } catch {
    return {}
  }
}

async function readAppLocationSettings(): Promise<AppLocationSettings> {
  const defaults = createDefaultAppLocationSettings()
  const installerSettings = await readInstallerLocationSettings()

  try {
    const content = await readFirstExistingTextFile(getSettingsPathCandidates())

    if (!content) {
      throw new Error('No app settings found.')
    }

    const settings = JSON.parse(content) as Partial<AppLocationSettings>

    return {
      ...defaults,
      ...installerSettings,
      ...settings,
      csvFolderPath: settings.csvFolderPath || installerSettings.csvFolderPath || await readLegacyCsvFolderPath(),
      signatureFolderPath: settings.signatureFolderPath || installerSettings.signatureFolderPath || defaults.signatureFolderPath,
      firstRunSetupCompleted: Boolean(settings.firstRunSetupCompleted || installerSettings.firstRunSetupCompleted),
    }
  } catch {
    return {
      ...defaults,
      ...installerSettings,
      csvFolderPath: installerSettings.csvFolderPath || await readLegacyCsvFolderPath(),
      signatureFolderPath: installerSettings.signatureFolderPath || defaults.signatureFolderPath,
      firstRunSetupCompleted: Boolean(installerSettings.firstRunSetupCompleted),
    }
  }
}

async function writeAppLocationSettings(settings: AppLocationSettings) {
  await fs.mkdir(app.getPath('userData'), { recursive: true })
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf8')
}

async function updateAppLocationSettings(
  updates: Partial<AppLocationSettings>,
): Promise<AppLocationSettings> {
  const settings = {
    ...await readAppLocationSettings(),
    ...updates,
  }

  await writeAppLocationSettings(settings)
  return settings
}

async function getSignatureFolderPath() {
  const settings = await readAppLocationSettings()

  return settings.signatureFolderPath || getDefaultSignatureFolderPath()
}

async function ensureAppDataFolders() {
  await fs.mkdir(await getSignatureFolderPath(), { recursive: true })
}

async function readCsvSettings(): Promise<CsvFolderSettings> {
  const settings = await readAppLocationSettings()

  return { folderPath: settings.csvFolderPath }
}

async function writeCsvSettings(settings: CsvFolderSettings) {
  await updateAppLocationSettings({ csvFolderPath: settings.folderPath })
}

async function scanCsvFolder(folderPath: string): Promise<StoredCsvImport[]> {
  if (!folderPath) {
    return []
  }

  try {
    const entries = await fs.readdir(folderPath, { withFileTypes: true })
    const csvFiles = entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.csv'))
      .sort((first, second) => first.name.localeCompare(second.name))

    return Promise.all(
      csvFiles.map(async (entry) => {
        const filePath = path.join(folderPath, entry.name)
        const [csvText, stats] = await Promise.all([
          fs.readFile(filePath, 'utf8'),
          fs.stat(filePath),
        ])

        return {
          id: filePath,
          fileName: entry.name,
          updatedAt: stats.mtime.toLocaleString(),
          rowCount: 0,
          filePath,
          csvText,
          students: [],
        }
      }),
    )
  } catch {
    return []
  }
}

function isPathInsideFolder(filePath: string, folderPath: string) {
  const relativePath = path.relative(path.resolve(folderPath), path.resolve(filePath))

  return relativePath !== '' && !relativePath.startsWith('..') && !path.isAbsolute(relativePath)
}

function registerCsvFolderHandlers() {
  ipcMain.handle('csv-folder:get', async () => {
    const settings = await readCsvSettings()
    const files = await scanCsvFolder(settings.folderPath)

    return {
      folderPath: settings.folderPath,
      files,
    }
  })

  ipcMain.handle('csv-folder:select', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select CSV folder',
    })

    if (result.canceled || !result.filePaths[0]) {
      const settings = await readCsvSettings()
      return {
        folderPath: settings.folderPath,
        files: await scanCsvFolder(settings.folderPath),
      }
    }

    const folderPath = result.filePaths[0]
    await writeCsvSettings({ folderPath })

    return {
      folderPath,
      files: await scanCsvFolder(folderPath),
    }
  })

  ipcMain.handle('csv-file:save', async (_event, request: SaveCsvFileRequest) => {
    const settings = await readCsvSettings()

    if (!settings.folderPath || !isPathInsideFolder(request.filePath, settings.folderPath)) {
      throw new Error('CSV file is outside the selected folder.')
    }

    await fs.writeFile(request.filePath, request.csvText, 'utf8')

    return {
      folderPath: settings.folderPath,
      files: await scanCsvFolder(settings.folderPath),
    }
  })
}

function getImageExtension(fileName: string, mimeType: string) {
  const extension = path.extname(fileName).toLowerCase()

  if (['.png', '.jpg', '.jpeg'].includes(extension)) {
    return extension
  }

  return mimeType === 'image/png' ? '.png' : '.jpg'
}

function parseImageDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|jpeg));base64,(.+)$/)

  if (!match) {
    throw new Error('Only PNG and JPEG signatures are supported.')
  }

  return {
    mimeType: match[1],
    content: Buffer.from(match[2], 'base64'),
  }
}

function getFilePathFromSignatureUrl(fileUrl: string) {
  if (!fileUrl.startsWith('file:')) {
    return ''
  }

  try {
    return fileURLToPath(fileUrl)
  } catch {
    return ''
  }
}

function registerAppDataHandlers() {
  ipcMain.handle('app-data:get', async () => {
    await ensureAppDataFolders()
    const signatureFolderPath = await getSignatureFolderPath()

    return {
      userDataPath: app.getPath('userData'),
      imageFolderPath: getImageFolderPath(),
      signatureFolderPath,
    }
  })

  ipcMain.handle('app-data:open-images-folder', async () => {
    await ensureAppDataFolders()
    await shell.openPath(await getSignatureFolderPath())
  })

  ipcMain.handle('app-data:select-signature-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory'],
      title: 'Select signature images folder',
    })

    if (!result.canceled && result.filePaths[0]) {
      await updateAppLocationSettings({ signatureFolderPath: result.filePaths[0] })
      await ensureAppDataFolders()
    }

    const signatureFolderPath = await getSignatureFolderPath()

    return {
      userDataPath: app.getPath('userData'),
      imageFolderPath: getImageFolderPath(),
      signatureFolderPath,
    }
  })

  ipcMain.handle('signature-image:save', async (_event, request: SaveSignatureImageRequest) => {
    await ensureAppDataFolders()

    const image = parseImageDataUrl(request.dataUrl)
    const extension = getImageExtension(request.originalName, image.mimeType)
    const fileName = `signature-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`
    const filePath = path.join(await getSignatureFolderPath(), fileName)

    await fs.writeFile(filePath, image.content)

    return {
      filePath,
      fileUrl: pathToFileURL(filePath).toString(),
    }
  })

  ipcMain.handle('signature-image:delete', async (_event, request: DeleteSignatureImageRequest) => {
    await ensureAppDataFolders()

    const filePath = getFilePathFromSignatureUrl(request.fileUrl)
    const signatureFolderPath = await getSignatureFolderPath()

    if (
      !filePath
      || (
        !isPathInsideFolder(filePath, signatureFolderPath)
        && !isPathInsideFolder(filePath, getDefaultSignatureFolderPath())
      )
    ) {
      return { deleted: false }
    }

    try {
      await fs.unlink(filePath)
      return { deleted: true }
    } catch {
      return { deleted: false }
    }
  })
}

async function promptForFolder(title: string, message: string) {
  const choice = await dialog.showMessageBox({
    type: 'question',
    buttons: ['Select Folder', 'Skip'],
    defaultId: 0,
    cancelId: 1,
    title,
    message,
  })

  if (choice.response !== 0) {
    return ''
  }

  const result = await dialog.showOpenDialog({
    properties: ['openDirectory', 'createDirectory'],
    title,
  })

  return result.canceled ? '' : result.filePaths[0] || ''
}

function sendUpdateStatus(status: AppUpdateStatus) {
  win?.webContents.send('app-update:status', status)
}

function registerUpdateHandlers() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('update-available', (info) => {
    sendUpdateStatus({
      state: 'available',
      message: `Version ${info.version} is available. Downloading update...`,
      version: info.version,
    })
  })

  autoUpdater.on('download-progress', (progress) => {
    sendUpdateStatus({
      state: 'downloading',
      message: `Downloading update: ${Math.round(progress.percent)}%`,
      percent: progress.percent,
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendUpdateStatus({
      state: 'downloaded',
      message: `Version ${info.version} downloaded. Installing update...`,
      version: info.version,
    })

    setTimeout(() => {
      sendUpdateStatus({
        state: 'installing',
        message: 'Installing update. The app will restart automatically.',
        version: info.version,
      })
      autoUpdater.quitAndInstall(true, true)
    }, 1500)
  })

  autoUpdater.on('error', () => {})

  ipcMain.handle('app-update:check', async () => {
    await checkForUpdates()
  })
}

async function checkForUpdates() {
  if (!app.isPackaged) {
    return
  }

  try {
    await autoUpdater.checkForUpdates()
  } catch {
    // Keep update checks silent when no published release/update feed exists.
  }
}

async function runFirstLaunchFolderSetup() {
  const settings = await readAppLocationSettings()

  if (settings.firstRunSetupCompleted || settings.csvFolderPath || settings.signatureFolderPath) {
    if (!settings.firstRunSetupCompleted) {
      await writeAppLocationSettings({
        ...settings,
        firstRunSetupCompleted: true,
      })
    }

    return
  }

  const csvFolderPath = settings.csvFolderPath || await promptForFolder(
    'Select CSV folder',
    'Choose the folder that contains the student CSV files.',
  )
  const signatureFolderPath = await promptForFolder(
    'Select signature folder',
    'Choose where signature images should be saved.',
  )

  await writeAppLocationSettings({
    ...settings,
    csvFolderPath,
    signatureFolderPath: signatureFolderPath || settings.signatureFolderPath || getDefaultSignatureFolderPath(),
    firstRunSetupCompleted: true,
  })
  await ensureAppDataFolders()
}

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'gai-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })
  win.maximize()

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
    if (!updateCheckStarted) {
      updateCheckStarted = true
      setTimeout(() => {
        void checkForUpdates()
      }, 1500)
    }
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  Menu.setApplicationMenu(null)
  registerUpdateHandlers()
  await runFirstLaunchFolderSetup()
  registerAppDataHandlers()
  registerCsvFolderHandlers()
  createWindow()
})
