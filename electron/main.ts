import { app, BrowserWindow, Menu, ipcMain, dialog, shell } from 'electron'
import fs from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

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

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'csv-settings.json')
}

function getImageFolderPath() {
  return path.join(app.getPath('userData'), 'images')
}

function getSignatureFolderPath() {
  return path.join(getImageFolderPath(), 'signatures')
}

async function ensureAppDataFolders() {
  await fs.mkdir(getSignatureFolderPath(), { recursive: true })
}

async function readCsvSettings(): Promise<CsvFolderSettings> {
  try {
    const content = await fs.readFile(getSettingsPath(), 'utf8')
    return JSON.parse(content) as CsvFolderSettings
  } catch {
    return { folderPath: '' }
  }
}

async function writeCsvSettings(settings: CsvFolderSettings) {
  await fs.writeFile(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf8')
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

    return {
      userDataPath: app.getPath('userData'),
      imageFolderPath: getImageFolderPath(),
    }
  })

  ipcMain.handle('app-data:open-images-folder', async () => {
    await ensureAppDataFolders()
    await shell.openPath(getImageFolderPath())
  })

  ipcMain.handle('signature-image:save', async (_event, request: SaveSignatureImageRequest) => {
    await ensureAppDataFolders()

    const image = parseImageDataUrl(request.dataUrl)
    const extension = getImageExtension(request.originalName, image.mimeType)
    const fileName = `signature-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`
    const filePath = path.join(getSignatureFolderPath(), fileName)

    await fs.writeFile(filePath, image.content)

    return {
      filePath,
      fileUrl: pathToFileURL(filePath).toString(),
    }
  })

  ipcMain.handle('signature-image:delete', async (_event, request: DeleteSignatureImageRequest) => {
    await ensureAppDataFolders()

    const filePath = getFilePathFromSignatureUrl(request.fileUrl)

    if (!filePath || !isPathInsideFolder(filePath, getSignatureFolderPath())) {
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

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'gai-logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
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

app.whenReady().then(() => {
  Menu.setApplicationMenu(null)
  registerAppDataHandlers()
  registerCsvFolderHandlers()
  createWindow()
})
