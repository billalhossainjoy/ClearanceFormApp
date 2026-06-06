<script setup lang="ts">
import { ref } from 'vue'
import {
  clearanceShifts,
  clearanceSignatureKeys,
  createEmptyClearanceRowSignatures,
  defaultClearanceRows,
  type ClearanceRow,
  type ClearanceSettings,
  type ClearanceShift,
  type ClearanceSignatureKey,
} from '../../clearancePdf'
import type { CsvFileNotice } from '../../types'
import NoticeMessage from '../NoticeMessage.vue'

type FooterSignatureKey =
  | 'accountantSignature'
  | 'registrarSignature'
  | 'principalSignature'
  | 'treasurerSignature'

const props = defineProps<{
  settings: ClearanceSettings
  status: CsvFileNotice | null
}>()

const emit = defineEmits<{
  save: []
  reset: []
  clearStatus: []
}>()

const selectedClearanceShift = ref<ClearanceShift>('1st')

const footerSignatureOptions: Array<{
  key: FooterSignatureKey
  label: string
}> = [
  { key: 'accountantSignature', label: 'Accountant' },
  { key: 'registrarSignature', label: 'Registrar' },
  { key: 'principalSignature', label: 'Principal' },
  { key: 'treasurerSignature', label: 'Treasurer' },
]

function addClearanceRow() {
  const nextIndex = props.settings.rows.length + 1

  props.settings.rows.push({
    id: `row-${Date.now()}`,
    serial: `${nextIndex}`,
    department: '',
    signatures: createEmptyClearanceRowSignatures(),
  })
}

function removeClearanceRow(row: ClearanceRow) {
  props.settings.rows = props.settings.rows.filter((currentRow) => currentRow.id !== row.id)
}

function restoreDefaultClearanceRows() {
  props.settings.rows = structuredClone(defaultClearanceRows)
}

async function uploadSignature(
  event: Event,
  target: ClearanceRow | FooterSignatureKey,
  signatureKey?: ClearanceSignatureKey,
) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file) {
    return
  }

  if (!['image/png', 'image/jpeg'].includes(file.type)) {
    input.value = ''
    return
  }

  const dataUrl = await readFileAsDataUrl(file)
  const signatureSource = await saveSignatureImage(file.name, dataUrl)

  if (typeof target === 'string') {
    props.settings[target] = signatureSource
  } else if (signatureKey) {
    target.signatures[selectedClearanceShift.value][signatureKey] = signatureSource
  }

  input.value = ''
}

async function clearSignature(target: ClearanceRow | FooterSignatureKey, signatureKey?: ClearanceSignatureKey) {
  if (typeof target === 'string') {
    await deleteSignatureImage(props.settings[target])
    props.settings[target] = ''
    return
  }

  if (signatureKey) {
    await deleteSignatureImage(target.signatures[selectedClearanceShift.value][signatureKey])
    target.signatures[selectedClearanceShift.value][signatureKey] = ''
  }
}

async function deleteSignatureImage(fileUrl: string) {
  if (!fileUrl.startsWith('file:')) {
    return
  }

  try {
    await window.ipcRenderer.invoke('signature-image:delete', { fileUrl })
  } catch {
  }
}

async function saveSignatureImage(originalName: string, dataUrl: string) {
  try {
    const savedImage = (await window.ipcRenderer.invoke('signature-image:save', {
      originalName,
      dataUrl,
    })) as { fileUrl: string }

    return savedImage.fileUrl
  } catch {
    return dataUrl
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
</script>

<template>
  <section class="clearance-layout">
    <div class="panel">
      <div class="panel-heading">
        <div>
          <h2>PDF Text</h2>
          <p>These values are printed at the top of every clearance PDF.</p>
        </div>
        <div class="button-group">
          <button class="secondary-action" type="button" @click="emit('reset')">
            Reset All
          </button>
          <button class="primary-action" type="button" @click="emit('save')">
            Save Options
          </button>
        </div>
      </div>

      <NoticeMessage
        v-if="status"
        :notice="status"
        @close="emit('clearStatus')"
      />

      <form class="clearance-form" @submit.prevent="emit('save')">
        <label>
          Institute Name
          <input v-model="settings.instituteName" />
        </label>
        <label>
          PDF Title
          <input v-model="settings.title" />
        </label>
        <label>
          Subtitle
          <input v-model="settings.subtitle" />
        </label>
        <label class="full-width">
          Notice Text
          <textarea v-model="settings.notice" rows="3" />
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
        <article v-for="row in settings.rows" :key="row.id" class="clearance-row">
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
          <img v-if="settings[footerSignature.key]" :src="settings[footerSignature.key]" alt="" />
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
</template>
