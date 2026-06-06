<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import AppTopbar from './components/AppTopbar.vue'
import NoticeMessage from './components/NoticeMessage.vue'
import {
  clearanceShifts,
  clearanceSignatureKeys,
  createEmptyClearanceRowSignatures,
  createClearancePdfUrl,
  defaultClearanceRows,
  defaultClearanceSettings,
  downloadClearancePdf,
  loadClearanceSettings,
  saveClearanceSettings as persistClearanceSettings,
  type ClearanceSignatureKey,
  type ClearanceRow,
  type ClearanceSettings,
  type ClearanceShift,
} from './clearancePdf'
import {
  createStudentCsv,
  normalizeStudent,
  parseStudentCsv,
  requiredHeaders,
  sessionOptions,
  shiftOptions,
  technologyOptions,
  templateCsv,
} from './lib/studentCsv'
import type {
  CsvFileNotice,
  CsvFolderState,
  PageKey,
  StoredCsvImport,
  Student,
  StudentTableRow,
} from './types'

const footerSignatureOptions = [
  { key: 'accountantSignature', label: 'Accountant' },
  { key: 'registrarSignature', label: 'Registrar' },
  { key: 'principalSignature', label: 'Principal' },
  { key: 'treasurerSignature', label: 'Treasurer' },
] as const
const shouldShowPdfPreview = import.meta.env.DEV

const activePage = ref<PageKey>('imports')
const searchTerm = ref('')
const selectedFolderPath = ref('')
const csvImports = ref<StoredCsvImport[]>([])
const isLoadingImports = ref(false)
const editingStudentKey = ref('')
const editingStudent = ref<Student | null>(null)
const saveStatus = ref<CsvFileNotice | null>(null)
const clearanceSettings = ref<ClearanceSettings>(loadClearanceSettings())
const selectedClearanceShift = ref<ClearanceShift>('1st')
const clearanceStatus = ref<CsvFileNotice | null>(null)
const downloadingStudentKey = ref('')
const previewingStudentKey = ref('')
const previewStudent = ref<StudentTableRow | null>(null)
const previewPdfUrl = ref('')
const previewFrame = ref<HTMLIFrameElement | null>(null)
const printPdfUrl = ref('')
const printFrame = ref<HTMLIFrameElement | null>(null)
let saveStatusTimer: number | undefined
let clearanceStatusTimer: number | undefined

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
  {
    key: 'clearance',
    label: 'Clearance',
    description: 'Edit clearance PDF text, department rows, and signature images.',
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

onUnmounted(() => {
  clearPdfPreview()
  clearPrintPdf()
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

function showClearanceStatus(status: CsvFileNotice) {
  clearClearanceStatus()
  clearanceStatus.value = status
  clearanceStatusTimer = window.setTimeout(() => {
    clearanceStatus.value = null
    clearanceStatusTimer = undefined
  }, 5000)
}

function clearClearanceStatus() {
  if (clearanceStatusTimer) {
    window.clearTimeout(clearanceStatusTimer)
    clearanceStatusTimer = undefined
  }

  clearanceStatus.value = null
}

function saveClearanceOptions() {
  persistClearanceSettings(clearanceSettings.value)
  showClearanceStatus({
    fileName: 'Clearance PDF',
    status: 'success',
    message: 'Clearance PDF options saved.',
  })
}

function resetClearanceOptions() {
  clearanceSettings.value = structuredClone(defaultClearanceSettings)
  persistClearanceSettings(clearanceSettings.value)
  showClearanceStatus({
    fileName: 'Clearance PDF',
    status: 'success',
    message: 'Default clearance PDF options restored.',
  })
}

function addClearanceRow() {
  const nextIndex = clearanceSettings.value.rows.length + 1

  clearanceSettings.value.rows.push({
    id: `row-${Date.now()}`,
    serial: `${nextIndex}`,
    department: '',
    signatures: createEmptyClearanceRowSignatures(),
  })
}

function removeClearanceRow(row: ClearanceRow) {
  clearanceSettings.value.rows = clearanceSettings.value.rows.filter(
    (currentRow) => currentRow.id !== row.id,
  )
}

async function uploadSignature(
  event: Event,
  target: ClearanceRow | 'accountantSignature' | 'registrarSignature' | 'principalSignature' | 'treasurerSignature',
  signatureKey?: ClearanceSignatureKey,
) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    showClearanceStatus({
      fileName: file.name,
      status: 'error',
      message: 'Only PNG and JPEG signatures are supported.',
    })
    input.value = ''
    return
  }

  const dataUrl = await readFileAsDataUrl(file)

  if (typeof target === 'string') {
    clearanceSettings.value[target] = dataUrl
  } else if (signatureKey) {
    target.signatures[selectedClearanceShift.value][signatureKey] = dataUrl
  }

  input.value = ''
}

function clearSignature(
  target: ClearanceRow | 'accountantSignature' | 'registrarSignature' | 'principalSignature' | 'treasurerSignature',
  signatureKey?: ClearanceSignatureKey,
) {
  if (typeof target === 'string') {
    clearanceSettings.value[target] = ''
    return
  }

  if (signatureKey) {
    target.signatures[selectedClearanceShift.value][signatureKey] = ''
  }
}

function restoreDefaultClearanceRows() {
  clearanceSettings.value.rows = structuredClone(defaultClearanceRows)
}

async function downloadStudentClearance(student: StudentTableRow) {
  const studentKey = getStudentKey(student)
  downloadingStudentKey.value = studentKey

  try {
    await downloadClearancePdf(student, clearanceSettings.value)
  } catch (error) {
    console.error('Clearance PDF generation failed.', error)
    showSaveStatus({
      fileName: student.sourceFile,
      status: 'error',
      message: getErrorMessage(error),
      detail: `${student.name} (${student.roll})`,
    })
  } finally {
    downloadingStudentKey.value = ''
  }
}

async function previewStudentClearance(student: StudentTableRow) {
  const studentKey = getStudentKey(student)
  previewingStudentKey.value = studentKey

  try {
    clearPdfPreview()
    clearPrintPdf()
    const pdfUrl = await createClearancePdfUrl(student, clearanceSettings.value)

    if (shouldShowPdfPreview) {
      previewPdfUrl.value = pdfUrl
      previewStudent.value = student
    } else {
      printPdfUrl.value = pdfUrl
    }
  } catch (error) {
    console.error('Clearance PDF preview failed.', error)
    showSaveStatus({
      fileName: student.sourceFile,
      status: 'error',
      message: getErrorMessage(error),
      detail: `${student.name} (${student.roll})`,
    })
  } finally {
    previewingStudentKey.value = ''
  }
}

function printStudentClearance() {
  const frameWindow = printFrame.value?.contentWindow

  if (!frameWindow) {
    return
  }

  frameWindow.focus()
  frameWindow.print()
}

function clearPdfPreview() {
  if (previewPdfUrl.value) {
    URL.revokeObjectURL(previewPdfUrl.value)
  }

  previewPdfUrl.value = ''
  previewStudent.value = null
}

function clearPrintPdf() {
  if (printPdfUrl.value) {
    URL.revokeObjectURL(printPdfUrl.value)
  }

  printPdfUrl.value = ''
}

function downloadPreviewPdf() {
  if (!previewPdfUrl.value || !previewStudent.value) {
    return
  }

  const link = document.createElement('a')
  link.href = previewPdfUrl.value
  link.download = `clearance-form-${previewStudent.value.roll || 'student'}.pdf`
  link.click()
}

function printPreviewPdf() {
  if (!previewPdfUrl.value) {
    return
  }

  const frameWindow = previewFrame.value?.contentWindow

  if (frameWindow) {
    frameWindow.focus()
    frameWindow.print()
    return
  }

  window.open(previewPdfUrl.value, '_blank')?.print()
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return `Clearance PDF could not be generated: ${error.message}`
  }

  return 'Clearance PDF could not be generated.'
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
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

</script>

<template>
  <main class="admin-shell">
    <AppSidebar v-model:active-page="activePage" :pages="pages" />

    <section class="workspace">
      <AppTopbar :page="currentPage" @refresh="loadCsvImports" />

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

        <NoticeMessage v-if="saveStatus" :notice="saveStatus" @close="clearSaveStatus" />

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
                  <td class="action-cell">
                    <button class="secondary-action compact" type="button" @click="startEditingStudent(student)">
                      Edit
                    </button>
                    <button
                      class="secondary-action compact"
                      type="button"
                      :disabled="previewingStudentKey === getStudentKey(student)"
                      @click="previewStudentClearance(student)"
                    >
                      {{ previewingStudentKey === getStudentKey(student) ? 'Preparing' : shouldShowPdfPreview ? 'Preview' : 'Print' }}
                    </button>
                    <button
                      class="primary-action compact"
                      type="button"
                      :disabled="downloadingStudentKey === getStudentKey(student)"
                      @click="downloadStudentClearance(student)"
                    >
                      {{ downloadingStudentKey === getStudentKey(student) ? 'Preparing' : 'Download PDF' }}
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

        <div v-if="shouldShowPdfPreview && previewPdfUrl && previewStudent" class="pdf-preview">
          <div class="pdf-preview-header">
            <div>
              <h2>Clearance Preview</h2>
              <p>{{ previewStudent.name }} ({{ previewStudent.roll }})</p>
            </div>
            <div class="button-group">
              <button class="secondary-action" type="button" @click="printPreviewPdf">
                Print
              </button>
              <button class="primary-action" type="button" @click="downloadPreviewPdf">
                Download
              </button>
              <button class="secondary-action" type="button" @click="clearPdfPreview">
                Close
              </button>
            </div>
          </div>
          <iframe
            ref="previewFrame"
            class="pdf-frame"
            :src="previewPdfUrl"
            title="Clearance PDF preview"
          />
        </div>
        <iframe
          v-if="!shouldShowPdfPreview && printPdfUrl"
          ref="printFrame"
          class="print-frame"
          :src="printPdfUrl"
          title="Clearance PDF print"
          @load="printStudentClearance"
        />
      </section>

      <section v-else-if="activePage === 'clearance'" class="clearance-layout">
        <div class="panel">
          <div class="panel-heading">
            <div>
              <h2>PDF Text</h2>
              <p>These values are printed at the top of every clearance PDF.</p>
            </div>
            <div class="button-group">
              <button class="secondary-action" type="button" @click="resetClearanceOptions">
                Reset All
              </button>
              <button class="primary-action" type="button" @click="saveClearanceOptions">
                Save Options
              </button>
            </div>
          </div>

          <NoticeMessage
            v-if="clearanceStatus"
            :notice="clearanceStatus"
            @close="clearClearanceStatus"
          />

          <form class="clearance-form" @submit.prevent="saveClearanceOptions">
            <label>
              Verify URL
              <input v-model="clearanceSettings.verifyUrl" />
            </label>
            <label>
              Institute Name
              <input v-model="clearanceSettings.instituteName" />
            </label>
            <label>
              PDF Title
              <input v-model="clearanceSettings.title" />
            </label>
            <label>
              Subtitle
              <input v-model="clearanceSettings.subtitle" />
            </label>
            <label class="full-width">
              Notice Text
              <textarea v-model="clearanceSettings.notice" rows="3" />
            </label>
          </form>
        </div>

        <div class="panel">
          <div class="panel-heading">
            <div>
              <h2>Department Rows</h2>
              <p>Add the rows and signatures that should appear in the clearance table.</p>
            </div>
            <label class="shift-selector">
              Shift Signatures
              <select v-model="selectedClearanceShift">
                <option v-for="shift in clearanceShifts" :key="shift" :value="shift">
                  {{ shift }} shift
                </option>
              </select>
            </label>
            <div class="button-group">
              <button class="secondary-action" type="button" @click="restoreDefaultClearanceRows">
                Default Rows
              </button>
              <button class="primary-action" type="button" @click="addClearanceRow">
                Add Row
              </button>
            </div>
          </div>

          <div class="clearance-rows">
            <article v-for="row in clearanceSettings.rows" :key="row.id" class="clearance-row">
              <div class="row-fields">
                <label>
                  Serial
                  <input v-model="row.serial" />
                </label>
                <label>
                  Department
                  <input v-model="row.department" />
                </label>
                <button class="danger-action compact" type="button" @click="removeClearanceRow(row)">
                  Remove
                </button>
              </div>

              <div class="signature-grid">
                <div v-for="signatureKey in clearanceSignatureKeys" :key="signatureKey" class="signature-slot">
                  <span>{{ selectedClearanceShift }} shift - {{ signatureKey === 'sign1' ? 'Signature 1' : signatureKey === 'sign2' ? 'Signature 2' : 'Signature 3' }}</span>
                  <img
                    v-if="row.signatures[selectedClearanceShift][signatureKey]"
                    :src="row.signatures[selectedClearanceShift][signatureKey]"
                    alt=""
                  />
                  <small v-else>No signature</small>
                  <div class="signature-actions">
                    <label class="file-action">
                      Upload
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        @change="uploadSignature($event, row, signatureKey)"
                      />
                    </label>
                    <button class="secondary-action compact" type="button" @click="clearSignature(row, signatureKey)">
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>

        <div class="panel">
          <div class="panel-heading">
            <div>
              <h2>Bottom Signatures</h2>
              <p>Upload optional signatures for the footer approval areas.</p>
            </div>
          </div>

          <div class="footer-signature-grid">
            <div
              v-for="footerSignature in footerSignatureOptions"
              :key="footerSignature.key"
              class="signature-slot"
            >
              <span>{{ footerSignature.label }}</span>
              <img v-if="clearanceSettings[footerSignature.key]" :src="clearanceSettings[footerSignature.key]" alt="" />
              <small v-else>No signature</small>
              <div class="signature-actions">
                <label class="file-action">
                  Upload
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    @change="uploadSignature($event, footerSignature.key)"
                  />
                </label>
                <button class="secondary-action compact" type="button" @click="clearSignature(footerSignature.key)">
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>
