<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import AppSidebar from './components/AppSidebar.vue'
import AppTopbar from './components/AppTopbar.vue'
import ClearanceSettingsPage from './components/clearance/ClearanceSettingsPage.vue'
import ImportSettingsPage from './components/imports/ImportSettingsPage.vue'
import NoticeMessage from './components/NoticeMessage.vue'
import { pages } from './constants/navigation'
import {
  createClearanceBatchPdfUrl,
  createClearancePdfUrl,
  defaultClearanceSettings,
  downloadClearanceBatchPdf,
  downloadClearancePdf,
  loadClearanceSettings,
  saveClearanceSettings as persistClearanceSettings,
  type ClearanceSettings,
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
  AppDataPaths,
  AppUpdateStatus,
  CsvFileNotice,
  CsvFolderState,
  PageKey,
  StoredCsvImport,
  Student,
  StudentTableRow,
} from './types'

const shouldShowPdfPreview = import.meta.env.DEV

const activePage = ref<PageKey>('students')
const searchTerm = ref('')
const departmentFilter = ref('')
const sessionFilter = ref('')
const shiftFilter = ref('')
const selectedStudentKeys = ref<string[]>([])
const selectedFolderPath = ref('')
const appDataPaths = ref<AppDataPaths | null>(null)
const csvImports = ref<StoredCsvImport[]>([])
const isLoadingImports = ref(false)
const editingStudentKey = ref('')
const editingStudent = ref<Student | null>(null)
const saveStatus = ref<CsvFileNotice | null>(null)
const clearanceSettings = ref<ClearanceSettings>(loadClearanceSettings())
const clearanceStatus = ref<CsvFileNotice | null>(null)
const downloadingStudentKey = ref('')
const previewingStudentKey = ref('')
const previewStudent = ref<StudentTableRow | null>(null)
const previewPdfUrl = ref('')
const previewFrame = ref<HTMLIFrameElement | null>(null)
const printPdfUrl = ref('')
const printFrame = ref<HTMLIFrameElement | null>(null)
const appUpdateStatus = ref<AppUpdateStatus | null>(null)
const isProcessingSelectedStudents = ref(false)
let saveStatusTimer: number | undefined
let clearanceStatusTimer: number | undefined

const currentPage = computed(() => pages.find((page) => page.key === activePage.value) ?? pages[0])
const shouldShowUpdateModal = computed(() =>
  appUpdateStatus.value
  && ['available', 'downloading', 'downloaded', 'installing'].includes(appUpdateStatus.value.state),
)
const updateProgressPercent = computed(() => Math.max(0, Math.min(100, appUpdateStatus.value?.percent ?? 0)))
const selectedStudentKeySet = computed(() => new Set(selectedStudentKeys.value))

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

  return students.value.filter((student) =>
    (!departmentFilter.value || student.technology === departmentFilter.value)
    && (!sessionFilter.value || student.session === sessionFilter.value)
    && (!shiftFilter.value || student.shift === shiftFilter.value)
    && (
      !query
      || [
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
        .includes(query)
    ),
  )
})

const departmentFilterOptions = computed(() => getUniqueSortedOptions(students.value.map((student) => student.technology)))
const sessionFilterOptions = computed(() => getUniqueSortedOptions(students.value.map((student) => student.session)))
const shiftFilterOptions = computed(() => getUniqueSortedOptions(students.value.map((student) => student.shift)))
const selectedStudents = computed(() =>
  students.value.filter((student) => selectedStudentKeySet.value.has(getStudentKey(student))),
)
const allFilteredStudentsSelected = computed(() =>
  filteredStudents.value.length > 0
  && filteredStudents.value.every((student) => selectedStudentKeySet.value.has(getStudentKey(student))),
)

onMounted(() => {
  window.ipcRenderer.on('app-update:status', handleAppUpdateStatus)
  void loadAppDataPaths()
  void loadCsvImports()
})

onUnmounted(() => {
  window.ipcRenderer.off('app-update:status', handleAppUpdateStatus)
  clearPdfPreview()
  clearPrintPdf()
})

function handleAppUpdateStatus(_event: unknown, status: AppUpdateStatus) {
  appUpdateStatus.value = status
}

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

async function loadAppDataPaths() {
  try {
    appDataPaths.value = (await window.ipcRenderer.invoke('app-data:get')) as AppDataPaths
  } catch {
    appDataPaths.value = null
  }
}

async function openImagesFolder() {
  await window.ipcRenderer.invoke('app-data:open-images-folder')
}

async function selectSignatureFolder() {
  try {
    appDataPaths.value = (await window.ipcRenderer.invoke('app-data:select-signature-folder')) as AppDataPaths
  } catch {
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
  selectedStudentKeys.value = []

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

function getUniqueSortedOptions(options: string[]) {
  return Array.from(new Set(options.filter(Boolean))).sort((first, second) => first.localeCompare(second))
}

function resetStudentFilters() {
  searchTerm.value = ''
  departmentFilter.value = ''
  sessionFilter.value = ''
  shiftFilter.value = ''
}

function toggleStudentSelection(student: StudentTableRow, checked: boolean) {
  const studentKey = getStudentKey(student)

  if (checked) {
    selectedStudentKeys.value = Array.from(new Set([...selectedStudentKeys.value, studentKey]))
    return
  }

  selectedStudentKeys.value = selectedStudentKeys.value.filter((key) => key !== studentKey)
}

function toggleAllFilteredStudents(checked: boolean) {
  const filteredKeys = filteredStudents.value.map((student) => getStudentKey(student))

  if (checked) {
    selectedStudentKeys.value = Array.from(new Set([...selectedStudentKeys.value, ...filteredKeys]))
    return
  }

  const filteredKeySet = new Set(filteredKeys)
  selectedStudentKeys.value = selectedStudentKeys.value.filter((key) => !filteredKeySet.has(key))
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

async function printSelectedStudents() {
  if (!selectedStudents.value.length) {
    return
  }

  isProcessingSelectedStudents.value = true

  try {
    clearPdfPreview()
    clearPrintPdf()
    printPdfUrl.value = await createClearanceBatchPdfUrl(selectedStudents.value, clearanceSettings.value)
  } catch (error) {
    console.error('Selected clearance PDF print failed.', error)
    showSaveStatus({
      fileName: 'Selected students',
      status: 'error',
      message: getErrorMessage(error),
      detail: `${selectedStudents.value.length} selected row(s)`,
    })
  } finally {
    isProcessingSelectedStudents.value = false
  }
}

async function downloadSelectedStudents() {
  if (!selectedStudents.value.length) {
    return
  }

  isProcessingSelectedStudents.value = true

  try {
    await downloadClearanceBatchPdf(selectedStudents.value, clearanceSettings.value)
  } catch (error) {
    console.error('Selected clearance PDF download failed.', error)
    showSaveStatus({
      fileName: 'Selected students',
      status: 'error',
      message: getErrorMessage(error),
      detail: `${selectedStudents.value.length} selected row(s)`,
    })
  } finally {
    isProcessingSelectedStudents.value = false
  }
}

async function deleteSelectedStudents() {
  const studentsToDelete = selectedStudents.value

  if (!studentsToDelete.length) {
    return
  }

  const confirmed = window.confirm(`Delete ${studentsToDelete.length} selected student row(s) from the source CSV file(s)?`)

  if (!confirmed) {
    return
  }

  const selectedKeys = new Set(studentsToDelete.map((student) => getStudentKey(student)))
  const affectedImports = csvImports.value.filter((csvImport) =>
    csvImport.students.some((_student, rowIndex) =>
      selectedKeys.has(`${csvImport.filePath}-${rowIndex}`),
    ),
  )

  isProcessingSelectedStudents.value = true

  try {
    let latestState: CsvFolderState | null = null

    for (const csvImport of affectedImports) {
      const remainingStudents = csvImport.students.filter(
        (_student, rowIndex) => !selectedKeys.has(`${csvImport.filePath}-${rowIndex}`),
      )

      latestState = (await window.ipcRenderer.invoke('csv-file:save', {
        filePath: csvImport.filePath,
        csvText: createStudentCsv(remainingStudents),
      })) as CsvFolderState
    }

    if (latestState) {
      applyCsvFolderState(latestState)
    }

    showSaveStatus({
      fileName: 'Selected students',
      status: 'success',
      message: `${studentsToDelete.length} selected row(s) deleted from source CSV file(s).`,
    })
  } catch {
    showSaveStatus({
      fileName: 'Selected students',
      status: 'error',
      message: 'Selected rows could not be deleted from the source CSV file(s).',
    })
  } finally {
    isProcessingSelectedStudents.value = false
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

      <div v-if="shouldShowUpdateModal && appUpdateStatus" class="update-overlay" aria-live="assertive">
        <div class="update-modal" role="dialog" aria-modal="true" aria-labelledby="update-title">
          <div class="update-loader" aria-hidden="true" />
          <div>
            <h2 id="update-title">Updating application</h2>
            <p>{{ appUpdateStatus.message }}</p>
          </div>
          <div class="update-progress" aria-hidden="true">
            <span :style="{ width: `${appUpdateStatus.state === 'downloading' ? updateProgressPercent : 100}%` }" />
          </div>
          <small>Please wait. The app will restart automatically after the update is installed.</small>
        </div>
      </div>

      <ImportSettingsPage
        v-if="activePage === 'imports'"
        :selected-folder-path="selectedFolderPath"
        :app-data-paths="appDataPaths"
        :csv-imports="csvImports"
        :is-loading-imports="isLoadingImports"
        :required-headers="requiredHeaders"
        @download-template="downloadTemplate"
        @select-folder="selectCsvFolder"
        @select-signature-folder="selectSignatureFolder"
        @open-images-folder="openImagesFolder"
        @refresh="loadCsvImports"
      />

      <section v-else-if="activePage === 'students'" class="panel">
        <div class="table-header">
          <div>
            <h2>Student List</h2>
            <p v-if="csvImports.length">Loaded from {{ csvImports.length }} valid CSV file(s).</p>
            <p v-else>No valid CSV file has been loaded yet.</p>
          </div>
          <div class="student-search">
            <input v-model="searchTerm" type="search" placeholder="Search students" />
          </div>
        </div>

        <NoticeMessage v-if="saveStatus" :notice="saveStatus" @close="clearSaveStatus" />

        <div class="student-controls">
          <label>
            <span>Department</span>
            <select v-model="departmentFilter">
              <option value="">All departments</option>
              <option v-for="department in departmentFilterOptions" :key="department" :value="department">
                {{ department }}
              </option>
            </select>
          </label>
          <label>
            <span>Session</span>
            <select v-model="sessionFilter">
              <option value="">All sessions</option>
              <option v-for="session in sessionFilterOptions" :key="session" :value="session">
                {{ session }}
              </option>
            </select>
          </label>
          <label>
            <span>Shift</span>
            <select v-model="shiftFilter">
              <option value="">All shifts</option>
              <option v-for="shift in shiftFilterOptions" :key="shift" :value="shift">
                {{ shift }}
              </option>
            </select>
          </label>
          <button class="secondary-action" type="button" @click="resetStudentFilters">
            Clear Filters
          </button>
        </div>

        <div v-if="students.length" class="selection-toolbar">
          <strong>{{ selectedStudents.length }} selected</strong>
          <div class="button-group">
            <button
              class="secondary-action compact"
              type="button"
              :disabled="!selectedStudents.length || isProcessingSelectedStudents"
              @click="printSelectedStudents"
            >
              Print Selected
            </button>
            <button
              class="primary-action compact"
              type="button"
              :disabled="!selectedStudents.length || isProcessingSelectedStudents"
              @click="downloadSelectedStudents"
            >
              Download Selected
            </button>
            <button
              class="danger-action compact"
              type="button"
              :disabled="!selectedStudents.length || isProcessingSelectedStudents"
              @click="deleteSelectedStudents"
            >
              Delete Selected
            </button>
          </div>
        </div>

        <div v-if="filteredStudents.length" class="table-wrap">
          <table>
            <thead>
              <tr>
                <th class="select-column">
                  <input
                    type="checkbox"
                    aria-label="Select all visible students"
                    :checked="allFilteredStudentsSelected"
                    @change="toggleAllFilteredStudents(($event.target as HTMLInputElement).checked)"
                  />
                </th>
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
                  <td class="select-column">
                    <input
                      type="checkbox"
                      aria-label="Select student"
                      :checked="selectedStudentKeySet.has(getStudentKey(student))"
                      @change="toggleStudentSelection(student, ($event.target as HTMLInputElement).checked)"
                    />
                  </td>
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
                  <td class="select-column">
                    <input
                      type="checkbox"
                      aria-label="Select student"
                      :checked="selectedStudentKeySet.has(getStudentKey(student))"
                      @change="toggleStudentSelection(student, ($event.target as HTMLInputElement).checked)"
                    />
                  </td>
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
          v-if="printPdfUrl"
          ref="printFrame"
          class="print-frame"
          :src="printPdfUrl"
          title="Clearance PDF print"
          @load="printStudentClearance"
        />
      </section>

      <ClearanceSettingsPage
        v-else-if="activePage === 'clearance'"
        :settings="clearanceSettings"
        :status="clearanceStatus"
        @save="saveClearanceOptions"
        @reset="resetClearanceOptions"
        @clear-status="clearClearanceStatus"
      />
    </section>
  </main>
</template>
