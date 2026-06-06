<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

type PageKey = 'imports' | 'students'

type Student = {
  name: string
  technology: string
  roll: string
  registrationNo: string
  session: string
  shift: string
}

type StoredCsvImport = {
  id: string
  fileName: string
  updatedAt: string
  rowCount: number
  filePath: string
  csvText: string
  students: Student[]
}

type CsvFolderState = {
  folderPath: string
  files: StoredCsvImport[]
}

type CsvFileNotice = {
  fileName: string
  status: 'success' | 'error'
  message: string
  detail?: string
}

type StudentTableRow = Student & {
  sourceFile: string
  sourceFilePath: string
  importId: string
  rowIndex: number
}

const requiredHeaders = [
  'name',
  'technology',
  'roll',
  'registrationNo',
  'session',
  'shift',
]

const technologyOptions = [
  'Computer Science and Technology',
  'Printing Technology',
  'Graphic Design',
]

const sessionOptions = Array.from({ length: 9 }, (_, index) => {
  const startYear = 2021 + index
  return `${startYear}-${startYear + 1}`
})

const shiftOptions = ['1st', '2nd']

const templateCsv = `${requiredHeaders.join(',')}
Billal Hossain,Computer Science and Technology,652750,1502201668,2021-2022,1st
`

const activePage = ref<PageKey>('imports')
const searchTerm = ref('')
const selectedFolderPath = ref('')
const csvImports = ref<StoredCsvImport[]>([])
const isLoadingImports = ref(false)
const editingStudentKey = ref('')
const editingStudent = ref<Student | null>(null)
const saveStatus = ref<CsvFileNotice | null>(null)
let saveStatusTimer: number | undefined

const pages: Array<{
  key: PageKey
  label: string
  description: string
}> = [
  {
    key: 'students',
    label: 'Students',
    description: 'View and update students directly in their source CSV files.',
  },
  {
    key: 'imports',
    label: 'Settings',
    description: 'Choose a CSV folder and review valid CSV files from that location.',
  },
]

const currentPage = computed(() => pages.find((page) => page.key === activePage.value) ?? pages[0])

const students = computed<StudentTableRow[]>(() =>
  csvImports.value.flatMap((csvImport) =>
    csvImport.students.map((student, rowIndex) => ({
      ...student,
      sourceFile: csvImport.fileName,
      sourceFilePath: csvImport.filePath,
      importId: csvImport.id,
      rowIndex,
    })),
  ),
)

const filteredStudents = computed(() => {
  const query = searchTerm.value.trim().toLowerCase()

  if (!query) {
    return students.value
  }

  return students.value.filter((student) =>
    [
      student.name,
      student.technology,
      student.roll,
      student.registrationNo,
      student.session,
      student.shift,
      student.sourceFile,
    ]
      .join(' ')
      .toLowerCase()
      .includes(query),
  )
})

onMounted(() => {
  void loadCsvImports()
})

async function loadCsvImports() {
  isLoadingImports.value = true
  clearSaveStatus()

  try {
    applyCsvFolderState((await window.ipcRenderer.invoke('csv-folder:get')) as CsvFolderState)
  } catch {
  } finally {
    isLoadingImports.value = false
  }
}

async function selectCsvFolder() {
  isLoadingImports.value = true
  clearSaveStatus()

  try {
    applyCsvFolderState((await window.ipcRenderer.invoke('csv-folder:select')) as CsvFolderState)
  } catch {
  } finally {
    isLoadingImports.value = false
  }
}

function downloadTemplate() {
  const blob = new Blob([templateCsv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = 'gai-students-template.csv'
  link.click()
  URL.revokeObjectURL(url)
}

function applyCsvFolderState(state: CsvFolderState) {
  selectedFolderPath.value = state.folderPath
  editingStudentKey.value = ''
  editingStudent.value = null

  csvImports.value = state.files.flatMap((csvFile) => {
    const result = parseStudentCsv(csvFile.csvText)

    if ('error' in result) {
      return []
    }

    return [{
      ...csvFile,
      rowCount: result.students.length,
      students: result.students,
    }]
  })
}

function getStudentKey(student: StudentTableRow) {
  return `${student.sourceFilePath}-${student.rowIndex}`
}

function startEditingStudent(student: StudentTableRow) {
  editingStudentKey.value = getStudentKey(student)
  editingStudent.value = {
    name: student.name,
    technology: student.technology,
    roll: student.roll,
    registrationNo: student.registrationNo,
    session: student.session,
    shift: student.shift,
  }
}

function cancelEditingStudent() {
  editingStudentKey.value = ''
  editingStudent.value = null
}

function showSaveStatus(status: CsvFileNotice) {
  clearSaveStatus()
  saveStatus.value = status
  saveStatusTimer = window.setTimeout(() => {
    saveStatus.value = null
    saveStatusTimer = undefined
  }, 5000)
}

function clearSaveStatus() {
  if (saveStatusTimer) {
    window.clearTimeout(saveStatusTimer)
    saveStatusTimer = undefined
  }

  saveStatus.value = null
}

async function saveStudent(student: StudentTableRow) {
  if (!editingStudent.value) {
    return
  }

  const updatedStudent = normalizeStudent(editingStudent.value)
  const csvRowNumber = student.rowIndex + 2
  const statusDetail = `Row ${csvRowNumber}: ${updatedStudent.name || student.name} (${updatedStudent.roll || student.roll})`

  if (Object.values(updatedStudent).some((value) => !value)) {
    showSaveStatus({
      fileName: student.sourceFile,
      status: 'error',
      message: 'All student fields are required before saving.',
      detail: statusDetail,
    })
    return
  }

  const targetImport = csvImports.value.find((csvImport) => csvImport.id === student.importId)

  if (!targetImport) {
    return
  }

  const updatedStudents = targetImport.students.map((currentStudent, rowIndex) =>
    rowIndex === student.rowIndex ? updatedStudent : currentStudent,
  )
  const duplicateRoll = updatedStudents.some(
    (currentStudent, rowIndex) =>
      rowIndex !== student.rowIndex && currentStudent.roll === updatedStudent.roll,
  )

  if (duplicateRoll) {
    showSaveStatus({
      fileName: student.sourceFile,
      status: 'error',
      message: `Duplicate roll found in this CSV: ${updatedStudent.roll}`,
      detail: statusDetail,
    })
    return
  }

  try {
    const csvText = createStudentCsv(updatedStudents)
    applyCsvFolderState(
      (await window.ipcRenderer.invoke('csv-file:save', {
        filePath: targetImport.filePath,
        csvText,
      })) as CsvFolderState,
    )
    showSaveStatus({
      fileName: student.sourceFile,
      status: 'success',
      message: 'Student updated in the source CSV file.',
      detail: statusDetail,
    })
  } catch {
    showSaveStatus({
      fileName: student.sourceFile,
      status: 'error',
      message: 'Student could not be saved to the source CSV file.',
      detail: statusDetail,
    })
  }
}

function parseStudentCsv(csvText: string): { students: Student[] } | { error: string } {
  const rows = parseCsvRows(csvText.trim())

  if (rows.length < 2) {
    return { error: 'The CSV must include the header row and at least one student row.' }
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase())
  const normalizedRequiredHeaders = requiredHeaders.map((header) => header.toLowerCase())

  if (headers.join(',') !== normalizedRequiredHeaders.join(',')) {
    return {
      error: `Wrong CSV format. Required header: ${requiredHeaders.join(',')}`,
    }
  }

  const seenRolls = new Set<string>()
  const parsedStudents: Student[] = []

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const row = rows[rowIndex]

    if (row.every((cell) => cell.trim() === '')) {
      continue
    }

    if (row.length !== requiredHeaders.length) {
      return { error: `Row ${rowIndex + 1} has ${row.length} columns. It must have 6 columns.` }
    }

    const [name, technology, roll, registrationNo, session, shift] = row.map((cell) =>
      cell.trim(),
    )

    if (!name || !technology || !roll || !registrationNo || !session || !shift) {
      return {
        error: `Row ${rowIndex + 1} is missing required data. Name, technology, roll, registrationNo, session, and shift are required.`,
      }
    }

    if (seenRolls.has(roll)) {
      return { error: `Duplicate roll found in this CSV: ${roll}` }
    }

    seenRolls.add(roll)
    parsedStudents.push({ name, technology, roll, registrationNo, session, shift })
  }

  if (parsedStudents.length === 0) {
    return { error: 'No student rows were found in the CSV file.' }
  }

  return { students: parsedStudents }
}

function normalizeStudent(student: Student): Student {
  return {
    name: student.name.trim(),
    technology: student.technology.trim(),
    roll: student.roll.trim(),
    registrationNo: student.registrationNo.trim(),
    session: student.session.trim(),
    shift: student.shift.trim(),
  }
}

function createStudentCsv(studentsToWrite: Student[]) {
  const rows = [
    requiredHeaders,
    ...studentsToWrite.map((student) => [
      student.name,
      student.technology,
      student.roll,
      student.registrationNo,
      student.session,
      student.shift,
    ]),
  ]

  return `${rows.map((row) => row.map(formatCsvCell).join(',')).join('\n')}\n`
}

function formatCsvCell(value: string) {
  if (!/[",\r\n]/.test(value)) {
    return value
  }

  return `"${value.replace(/"/g, '""')}"`
}

function parseCsvRows(csvText: string) {
  const rows: string[][] = []
  let currentCell = ''
  let currentRow: string[] = []
  let insideQuotes = false

  for (let index = 0; index < csvText.length; index += 1) {
    const character = csvText[index]
    const nextCharacter = csvText[index + 1]

    if (character === '"' && nextCharacter === '"') {
      currentCell += '"'
      index += 1
      continue
    }

    if (character === '"') {
      insideQuotes = !insideQuotes
      continue
    }

    if (character === ',' && !insideQuotes) {
      currentRow.push(currentCell)
      currentCell = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !insideQuotes) {
      if (character === '\r' && nextCharacter === '\n') {
        index += 1
      }

      currentRow.push(currentCell)
      rows.push(currentRow)
      currentCell = ''
      currentRow = []
      continue
    }

    currentCell += character
  }

  currentRow.push(currentCell)
  rows.push(currentRow)

  return rows
}
</script>

<template>
  <main class="admin-shell">
    <aside class="sidebar">
      <div class="brand">
        <img class="brand-logo" src="/gai-logo.svg" alt="Govt. Graphic Arts Institute logo" />
        <div>
          <strong>Graphic Arts Institute</strong>
          <small>Clearance management</small>
        </div>
      </div>

      <nav class="nav-list" aria-label="Admin pages">
        <button
          v-for="page in pages"
          :key="page.key"
          class="nav-item"
          :class="{ active: activePage === page.key }"
          type="button"
          @click="activePage = page.key"
        >
          <span>{{ page.label }}</span>
        </button>
      </nav>
    </aside>

    <section class="workspace">
      <header class="topbar">
        <div>
          <div class="topbar-brand">
            <img src="/gai-logo.svg" alt="" aria-hidden="true" />
            <p class="eyebrow">Govt. Graphic Arts Institute</p>
          </div>
          <h1>{{ currentPage.label }}</h1>
          <p>{{ currentPage.description }}</p>
        </div>
        <button class="secondary-action" type="button" @click="loadCsvImports">Refresh</button>
      </header>

      <section v-if="activePage === 'imports'" class="imports-layout">
        <div class="panel upload-panel">
          <div class="panel-heading">
            <div>
              <h2>Saved CSV Folder</h2>
              <p>The app reads every .csv file from this saved folder when it starts.</p>
            </div>
            <div class="button-group">
              <button class="secondary-action" type="button" @click="downloadTemplate">
                Download Template
              </button>
              <button class="primary-action" type="button" @click="selectCsvFolder">
                Browse Folder
              </button>
            </div>
          </div>

          <div class="folder-source">
            <span>Selected folder</span>
            <strong v-if="selectedFolderPath">{{ selectedFolderPath }}</strong>
            <strong v-else>No folder selected</strong>
            <small>Only valid .csv files are listed. Required header: {{ requiredHeaders.join(', ') }}</small>
          </div>
        </div>

        <div class="panel">
          <div class="panel-heading">
            <div>
              <h2>CSV Files</h2>
              <p>Only valid CSV files are shown here and available in the Students page.</p>
            </div>
            <button class="secondary-action" type="button" @click="loadCsvImports">Refresh</button>
          </div>

          <div v-if="isLoadingImports" class="empty-state">
            <h3>Loading CSV files</h3>
            <p>Reading the selected folder.</p>
          </div>

          <div v-else-if="csvImports.length" class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CSV File</th>
                  <th>Students</th>
                  <th>Last Updated</th>
                  <th>Location</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="csvImport in csvImports" :key="csvImport.id">
                  <td>{{ csvImport.fileName }}</td>
                  <td>{{ csvImport.rowCount }}</td>
                  <td>{{ csvImport.updatedAt }}</td>
                  <td class="path-cell">{{ csvImport.filePath }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-else class="empty-state">
            <h3>No valid CSV files found</h3>
            <p>Browse for a CSV folder, then add one or more CSV files that match the template.</p>
            <button class="primary-action" type="button" @click="selectCsvFolder">
              Browse Folder
            </button>
          </div>
        </div>
      </section>

      <section v-else-if="activePage === 'students'" class="panel">
        <div class="table-header">
          <div>
            <h2>Student List</h2>
            <p v-if="csvImports.length">Loaded from {{ csvImports.length }} valid CSV file(s).</p>
            <p v-else>No valid CSV file has been loaded yet.</p>
          </div>
          <input v-model="searchTerm" type="search" placeholder="Search students" />
        </div>

        <div v-if="saveStatus" class="notice dismissible-notice" :class="saveStatus.status">
          <div>
            <strong>{{ saveStatus.fileName }}</strong>
            <span>{{ saveStatus.message }}</span>
            <small v-if="saveStatus.detail">{{ saveStatus.detail }}</small>
          </div>
          <button type="button" aria-label="Close notification" @click="clearSaveStatus">x</button>
        </div>

        <div v-if="filteredStudents.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Technology</th>
                <th>Roll</th>
                <th>Registration No</th>
                <th>Session</th>
                <th>Shift</th>
                <th>Source CSV</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="student in filteredStudents" :key="getStudentKey(student)">
                <template v-if="editingStudentKey === getStudentKey(student) && editingStudent">
                  <td><input v-model="editingStudent.name" aria-label="Name" /></td>
                  <td>
                    <select v-model="editingStudent.technology" aria-label="Technology">
                      <option value="" disabled>Select technology</option>
                      <option
                        v-for="technology in technologyOptions"
                        :key="technology"
                        :value="technology"
                      >
                        {{ technology }}
                      </option>
                    </select>
                  </td>
                  <td><input v-model="editingStudent.roll" aria-label="Roll" /></td>
                  <td><input v-model="editingStudent.registrationNo" aria-label="Registration No" /></td>
                  <td>
                    <select v-model="editingStudent.session" aria-label="Session">
                      <option value="" disabled>Select session</option>
                      <option v-for="session in sessionOptions" :key="session" :value="session">
                        {{ session }}
                      </option>
                    </select>
                  </td>
                  <td>
                    <select v-model="editingStudent.shift" aria-label="Shift">
                      <option value="" disabled>Select shift</option>
                      <option v-for="shift in shiftOptions" :key="shift" :value="shift">
                        {{ shift }}
                      </option>
                    </select>
                  </td>
                  <td>{{ student.sourceFile }}</td>
                  <td class="action-cell">
                    <button class="primary-action compact" type="button" @click="saveStudent(student)">
                      Save
                    </button>
                    <button class="secondary-action compact" type="button" @click="cancelEditingStudent">
                      Cancel
                    </button>
                  </td>
                </template>
                <template v-else>
                  <td>{{ student.name }}</td>
                  <td>{{ student.technology }}</td>
                  <td>{{ student.roll }}</td>
                  <td>{{ student.registrationNo }}</td>
                  <td>{{ student.session }}</td>
                  <td>{{ student.shift }}</td>
                  <td>{{ student.sourceFile }}</td>
                  <td>
                    <button class="secondary-action compact" type="button" @click="startEditingStudent(student)">
                      Edit
                    </button>
                  </td>
                </template>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else class="empty-state">
          <h3>No students to show</h3>
          <p>Set a CSV folder on the Settings page to populate this list.</p>
          <button class="primary-action" type="button" @click="activePage = 'imports'">
            Open Settings
          </button>
        </div>
      </section>
    </section>
  </main>
</template>
