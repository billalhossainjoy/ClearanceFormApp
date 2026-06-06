export type PageKey = 'imports' | 'students' | 'clearance'

export type PageDefinition = {
  key: PageKey
  label: string
  description: string
}

export type Student = {
  name: string
  technology: string
  roll: string
  registrationNo: string
  session: string
  shift: string
}

export type StoredCsvImport = {
  id: string
  fileName: string
  updatedAt: string
  rowCount: number
  filePath: string
  csvText: string
  students: Student[]
}

export type CsvFolderState = {
  folderPath: string
  files: StoredCsvImport[]
}

export type AppDataPaths = {
  userDataPath: string
  imageFolderPath: string
}

export type CsvFileNotice = {
  fileName: string
  status: 'success' | 'error'
  message: string
  detail?: string
}

export type StudentTableRow = Student & {
  sourceFile: string
  sourceFilePath: string
  importId: string
  rowIndex: number
}
