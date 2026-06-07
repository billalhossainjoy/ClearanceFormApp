<script setup lang="ts">
import type { AppDataPaths, StoredCsvImport } from '../../types'

defineProps<{
  selectedFolderPath: string
  appDataPaths: AppDataPaths | null
  csvImports: StoredCsvImport[]
  isLoadingImports: boolean
  requiredHeaders: string[]
}>()

const emit = defineEmits<{
  downloadTemplate: []
  selectFolder: []
  selectSignatureFolder: []
  openImagesFolder: []
  refresh: []
}>()
</script>

<template>
  <section class="imports-layout">
    <div class="panel upload-panel">
      <div class="panel-heading">
        <div>
          <h2>Saved CSV Folder</h2>
          <p>The app reads every .csv file from this saved folder when it starts.</p>
        </div>
        <div class="button-group">
          <button class="secondary-action" type="button" @click="emit('downloadTemplate')">
            Download Template
          </button>
          <button class="primary-action" type="button" @click="emit('selectFolder')">
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

    <div class="panel upload-panel">
      <div class="panel-heading">
        <div>
          <h2>Application Storage</h2>
          <p>Signature images and app settings are stored outside the install folder.</p>
        </div>
        <div class="button-group">
          <button
            class="secondary-action"
            type="button"
            :disabled="!appDataPaths"
            @click="emit('openImagesFolder')"
          >
            Open Signature Folder
          </button>
          <button class="primary-action" type="button" @click="emit('selectSignatureFolder')">
            Change Signature Folder
          </button>
        </div>
      </div>

      <div class="folder-source">
        <span>Signature images folder</span>
        <strong v-if="appDataPaths">{{ appDataPaths.signatureFolderPath }}</strong>
        <strong v-else>Loading app storage location</strong>
        <small>New uploaded signature images are saved here.</small>
      </div>

      <div class="folder-source">
        <span>App data folder</span>
        <strong v-if="appDataPaths">{{ appDataPaths.userDataPath }}</strong>
        <strong v-else>Loading app data location</strong>
      </div>
    </div>

    <div class="panel">
      <div class="panel-heading">
        <div>
          <h2>CSV Files</h2>
          <p>Only valid CSV files are shown here and available in the Students page.</p>
        </div>
        <button class="secondary-action" type="button" @click="emit('refresh')">Refresh</button>
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
        <button class="primary-action" type="button" @click="emit('selectFolder')">
          Browse Folder
        </button>
      </div>
    </div>
  </section>
</template>
