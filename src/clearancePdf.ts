import banglaFontUrl from './assets/noto.ttf?url'
import type { Student } from './types'
import { depertmentDataOptions } from '../clearanceForm/form.data'

export type ClearanceRow = {
  id: string
  serial: string
  department: string
  signatures: ClearanceRowSignatures
}

export type ClearanceSettings = {
  verifyUrl: string
  instituteName: string
  title: string
  subtitle: string
  notice: string
  rows: ClearanceRow[]
  accountantSignature: string
  registrarSignature: string
  principalSignature: string
  treasurerSignature: string
}

export type ClearanceShift = '1st' | '2nd'
export type ClearanceSignatureKey = 'sign1' | 'sign2' | 'sign3'
export type ClearanceShiftSignatures = Record<ClearanceSignatureKey, string>
export type ClearanceRowSignatures = Record<ClearanceShift, ClearanceShiftSignatures>

type ClearanceTableRow = {
  serial: string
  depertment: string
  sign1: string | null
  sign2: string | null
  sign3: string | null
}

export const clearanceStorageKey = 'gai-clearance-settings-v1'
export const clearanceShifts = ['1st', '2nd'] as const
export const clearanceSignatureKeys = ['sign1', 'sign2', 'sign3'] as const
const clearanceDefaultsVersion = 3

export const defaultClearanceRows: ClearanceRow[] = depertmentDataOptions.map((row, index) => ({
  id: `row-${index + 1}`,
  serial: row.id,
  department: row.depertment,
  signatures: createEmptyClearanceRowSignatures(),
}))

export const defaultClearanceSettings: ClearanceSettings = {
  verifyUrl: '',
  instituteName: 'গ্রাফিক আর্টস ইনস্টিটিউট',
  title: 'দায় মুক্তি ফর্ম',
  subtitle: '',
  notice:
    'গ্রাফিক আর্টস ইনস্টিটিউটের নিম্মেবর্নিত ছাত্র-ছাত্রীর অধ্যায়ন সম্পন্ন হয়েছে/ভর্তি বাতিল হয়েছে / অধ্যায়ন করবে না, ফলে ইনস্টিটিউটে উক্ত শিক্ষার্থীর নিকট পাওনাদি সম্পর্কে তথ্যাদি প্রয়োজন -',
  rows: defaultClearanceRows,
  accountantSignature: '',
  registrarSignature: '',
  principalSignature: '',
  treasurerSignature: '',
}

type StoredClearanceSettings = Partial<ClearanceSettings> & {
  defaultsVersion?: number
}

type StoredClearanceRow = Partial<ClearanceRow> & Partial<ClearanceShiftSignatures>

let fontRegistered = false
let rendererReady: Promise<{ pdf: any }> | null = null
let h: any
let Document: unknown
let Image: unknown
let Page: unknown
let Text: unknown
let View: unknown
let styles: any

const textSize = 10

function createStyles(StyleSheet: any) {
  return StyleSheet.create({
  verifyLink: {
    position: 'absolute',
    right: 0,
    fontSize: 7,
    margin: 5,
  },
  title: { marginTop: 30 },
  text: {
    width: '100%',
    textAlign: 'center',
    fontFamily: 'Bangla',
    fontSize: textSize,
    marginBottom: -4,
  },
  text2: {
    width: '100%',
    textAlign: 'center',
    fontFamily: 'Bangla',
    textDecoration: 'underline',
    paddingBottom: 2,
    fontSize: textSize,
  },
  text3: {
    width: '100%',
    fontFamily: 'Bangla',
    paddingBottom: 18,
    fontSize: textSize,
    textAlign: 'left',
    paddingHorizontal: 20,
  },
  text4: {
    width: '100%',
    fontFamily: 'Bangla',
    paddingBottom: 18,
    fontSize: textSize,
    textAlign: 'left',
  },
  t: { padding: 20, marginTop: -40 },
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableColName: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColTech: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCol: {
    width: '14%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColId: {
    width: '4%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColDept: {
    width: '30%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableColSign: {
    width: '22%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#000',
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  tableCell: {
    margin: 0.1,
    fontSize: textSize,
    textAlign: 'center',
    fontFamily: 'Bangla',
  },
  register: {
    width: '40%',
    fontFamily: 'Bangla',
    fontSize: textSize,
    paddingBottom: 14,
    marginLeft: 350,
    marginTop: 15,
  },
  t2: { padding: 20, marginTop: -52, paddingBottom: 0 },
  wrapper: {
    padding: 50,
    paddingBottom: 0,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  box: {
    border: '1px solid black',
    width: '40%',
    padding: 10,
    margin: 10,
    display: 'flex',
    flexDirection: 'column',
    gap: 40,
  },
  sign: {
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sign2: {
    width: 150,
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'center',
  },
  image: { width: 50, height: 20, objectFit: 'contain' },
  imageContainer: {
    display: 'flex',
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  })
}

export function loadClearanceSettings(): ClearanceSettings {
  try {
    const rawSettings = window.localStorage.getItem(clearanceStorageKey)

    if (!rawSettings) {
      const initialSettings = createDefaultClearanceSettings()
      saveClearanceSettings(initialSettings)
      return initialSettings
    }

    const parsedSettings = JSON.parse(rawSettings) as StoredClearanceSettings
    const savedRows = (parsedSettings.rows ?? []) as StoredClearanceRow[]

    if (parsedSettings.defaultsVersion !== clearanceDefaultsVersion) {
      const migratedSettings = {
        ...createDefaultClearanceSettings(),
        verifyUrl: parsedSettings.verifyUrl ?? defaultClearanceSettings.verifyUrl,
        rows: mergeDefaultRowsWithSavedSignatures(savedRows),
        accountantSignature: parsedSettings.accountantSignature || '',
        registrarSignature: parsedSettings.registrarSignature || '',
        principalSignature: parsedSettings.principalSignature || '',
        treasurerSignature: parsedSettings.treasurerSignature || '',
      }

      saveClearanceSettings(migratedSettings)
      return migratedSettings
    }

    return {
      ...createDefaultClearanceSettings(),
      ...parsedSettings,
      title: parsedSettings.title === 'নো ডিউস / ক্লিয়ারেন্স ফরম'
        ? defaultClearanceSettings.title
        : parsedSettings.title || defaultClearanceSettings.title,
      notice: parsedSettings.notice?.includes('কোন পাওনা নেই')
        ? defaultClearanceSettings.notice
        : parsedSettings.notice || defaultClearanceSettings.notice,
      rows: savedRows.length >= defaultClearanceRows.length
        ? savedRows.map((row, index) => normalizeClearanceRow(row, index))
        : structuredClone(defaultClearanceRows),
    }
  } catch {
    return createDefaultClearanceSettings()
  }
}

export function saveClearanceSettings(settings: ClearanceSettings) {
  window.localStorage.setItem(
    clearanceStorageKey,
    JSON.stringify({
      ...settings,
      defaultsVersion: clearanceDefaultsVersion,
    }),
  )
}

function createDefaultClearanceSettings(): ClearanceSettings {
  return structuredClone(defaultClearanceSettings)
}

export function createEmptyClearanceRowSignatures(): ClearanceRowSignatures {
  return {
    '1st': { sign1: '', sign2: '', sign3: '' },
    '2nd': { sign1: '', sign2: '', sign3: '' },
  }
}

function normalizeClearanceRow(row: StoredClearanceRow, index: number): ClearanceRow {
  return {
    id: row.id || `row-${index + 1}`,
    serial: row.serial || `${index + 1}`,
    department: row.department || '',
    signatures: normalizeClearanceRowSignatures(row),
  }
}

function normalizeClearanceRowSignatures(row?: StoredClearanceRow): ClearanceRowSignatures {
  const signatures = createEmptyClearanceRowSignatures()

  if (!row) {
    return signatures
  }

  for (const shift of clearanceShifts) {
    for (const key of clearanceSignatureKeys) {
      signatures[shift][key] = row.signatures?.[shift]?.[key] || ''
    }
  }

  if (!row.signatures) {
    signatures['1st'].sign1 = row.sign1 || ''
    signatures['1st'].sign2 = row.sign2 || ''
    signatures['1st'].sign3 = row.sign3 || ''
  }

  return signatures
}

function mergeDefaultRowsWithSavedSignatures(savedRows: StoredClearanceRow[]) {
  return defaultClearanceRows.map((defaultRow) => {
    const savedRow = savedRows.find((row) => row.id === defaultRow.id)

    return {
      ...defaultRow,
      signatures: normalizeClearanceRowSignatures(savedRow),
    }
  })
}

export async function createClearancePdfUrl(student: Student, settings: ClearanceSettings) {
  const renderer = await ensurePdfRenderer()

  const blob = await renderer.pdf(createClearanceDocument(student, settings)).toBlob()

  return URL.createObjectURL(blob)
}

export async function downloadClearancePdf(student: Student, settings: ClearanceSettings) {
  const url = await createClearancePdfUrl(student, settings)
  const link = document.createElement('a')

  try {
    link.href = url
    link.download = `clearance-form-${student.roll || 'student'}.pdf`
    link.click()
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function ensurePdfRenderer() {
  if (!rendererReady) {
    rendererReady = Promise.all([
      import('react'),
      import('@react-pdf/renderer'),
    ]).then(([ReactModule, Renderer]) => {
      const reactDefault = ReactModule.default as { createElement?: any }
      h = reactDefault.createElement ?? ReactModule.createElement
      Document = Renderer.Document
      Image = Renderer.Image
      Page = Renderer.Page
      Text = Renderer.Text
      View = Renderer.View
      styles = createStyles(Renderer.StyleSheet)

      if (!fontRegistered) {
        Renderer.Font.register({
          family: 'Bangla',
          src: banglaFontUrl,
        })
        fontRegistered = true
      }

      return { pdf: Renderer.pdf as any }
    })
  }

  return rendererReady as Promise<{ pdf: any }>
}

function createClearanceDocument(student: Student, settings: ClearanceSettings) {
  const fullUrl = settings.verifyUrl || `Verify:${window.location.origin}${location.pathname}${location.search}`
  const studentShift = getClearanceShift(student.shift)
  const tableData = settings.rows.map<ClearanceTableRow>((row) => {
    const signatures = row.signatures?.[studentShift] ?? createEmptyClearanceRowSignatures()[studentShift]

    return {
      serial: row.serial,
      depertment: row.department,
      sign1: signatures.sign1 || null,
      sign2: signatures.sign2 || null,
      sign3: signatures.sign3 || null,
    }
  })

  return h(
    Document,
    null,
    h(
      Page,
      { size: 'LEGAL' },
      h(View, { style: styles.verifyLink }, h(Text, null, fullUrl)),
      h(
        View,
        { style: styles.title },
        h(Text, { style: styles.text }, 'গণপ্রজাতন্ত্রী বাংলাদেশ সরকার '),
        h(Text, { style: styles.text }, 'অধ্যক্ষের কার্যালয় '),
        h(Text, { style: styles.text }, settings.instituteName || defaultClearanceSettings.instituteName),
        h(Text, { style: styles.text2 }, 'সাত মসজিদ রোড, ঢাকা-১২০৭ '),
        h(Text, { style: styles.text2 }, settings.title || defaultClearanceSettings.title),
      ),
      h(
        View,
        null,
        h(Text, { style: styles.text3 }, settings.notice || defaultClearanceSettings.notice),
        h(
          View,
          { style: styles.t },
          h(
            View,
            { style: styles.table },
            h(
              View,
              { style: styles.tableRow },
              h(View, { style: styles.tableColName }, h(Text, { style: styles.tableCell }, 'ছাত্র-ছাত্রীর নামঃ')),
              h(View, { style: styles.tableColTech }, h(Text, { style: styles.tableCell }, ' টেকনোলজি ')),
              h(View, { style: styles.tableCol }, h(Text, { style: styles.tableCell }, ' রোল ')),
              h(View, { style: styles.tableCol }, h(Text, { style: styles.tableCell }, 'রেজি নং ')),
              h(View, { style: styles.tableCol }, h(Text, { style: styles.tableCell }, 'সেশন ')),
              h(View, { style: styles.tableCol }, h(Text, { style: styles.tableCell }, 'শিফট ')),
            ),
            h(
              View,
              { style: styles.tableRow },
              h(View, { style: styles.tableColName }, h(Text, { style: styles.tableCell }, student.name)),
              h(View, { style: styles.tableColTech }, h(Text, { style: styles.tableCell }, student.technology)),
              h(View, { style: styles.tableCol }, h(Text, { style: styles.tableCell }, student.roll)),
              h(View, { style: styles.tableCol }, h(Text, { style: styles.tableCell }, student.registrationNo)),
              h(View, { style: styles.tableCol }, h(Text, { style: styles.tableCell }, student.session)),
              h(View, { style: styles.tableCol }, h(Text, { style: styles.tableCell }, student.shift)),
            ),
          ),
          h(
            View,
            { style: styles.register },
            h(Text, { style: styles.text }, '..........................................'),
            h(Text, { style: styles.text }, 'রেজিস্টার '),
            h(Text, { style: styles.text }, 'গ্রাফিক আর্টস ইনস্টিটিউট'),
          ),
        ),
      ),
      h(
        View,
        null,
        h(
          View,
          { style: styles.t2 },
          h(
            View,
            { style: styles.table },
            h(
              View,
              { style: styles.tableRow },
              h(View, { style: styles.tableColId }, h(Text, { style: styles.tableCell }, 'নং ')),
              h(View, { style: styles.tableColDept }, h(Text, { style: styles.tableCell }, ' বিভাগ/শাখার নাম ')),
              h(View, { style: styles.tableColSign }, h(Text, { style: styles.tableCell }, 'টিআর/সপ/ল্যাব সহকারী')),
              h(
                View,
                { style: styles.tableColSign },
                h(Text, { style: styles.tableCell }, 'শাখা প্রধান/ওয়ার্ক শপ সুপারের স্বাক্ষর'),
              ),
              h(
                View,
                { style: styles.tableColSign },
                h(Text, { style: styles.tableCell }, 'বিভাগীয় প্রধানের স্বাক্ষর'),
              ),
            ),
            ...tableData.map((row) => createDepartmentRow(row)),
          ),
          h(
            Text,
            { style: styles.text4 },
            'আমানতের টাকা ........................ হতে টাকা কর্তন করে অবশিষ্ট ........................ টাকা ফেরত প্রদান করা জেতে পারে ।',
          ),
          h(
            View,
            { style: styles.sign },
            h(View, { style: styles.sign2 }, h(Text, null, '.....................'), h(Text, { style: styles.text }, 'হিসাব রক্ষক')),
            h(View, { style: styles.sign2 }, h(Text, null, '.....................'), h(Text, { style: styles.text }, 'রেজিস্টার ')),
            h(View, { style: styles.sign2 }, h(Text, null, '.....................'), h(Text, { style: styles.text }, 'অধ্যক্ষ ')),
          ),
        ),
      ),
      h(
        View,
        { style: styles.wrapper },
        createReceiptBox('উপরিমতে টাকা .................. মাত্র গ্রহন করলাম', 'ছাত্র ছাত্রীর স্বাক্ষর '),
        createReceiptBox('উপরিমতে টাকা .................. মাত্র প্রদান করলাম', 'কোষাধক্ষ্য '),
      ),
    ),
  )
}

function getClearanceShift(shift: string): ClearanceShift {
  return shift.trim().toLowerCase().includes('2') ? '2nd' : '1st'
}

function createDepartmentRow(row: ClearanceTableRow) {
  return h(
    View,
    { key: `${row.serial}-${row.depertment}`, style: styles.tableRow },
    h(View, { style: styles.tableColId }, h(Text, { style: styles.tableCell }, row.serial)),
    h(View, { style: styles.tableColDept }, h(Text, { style: styles.tableCell }, row.depertment)),
    createSignatureCell(row.sign1),
    createSignatureCell(row.sign2),
    createSignatureCell(row.sign3),
  )
}

function createSignatureCell(signature: string | null) {
  return h(
    View,
    { style: styles.tableColSign },
    h(
      View,
      { style: styles.imageContainer },
      signature && signature.length > 50 ? h(Image, { src: signature, style: styles.image }) : null,
    ),
  )
}

function createReceiptBox(text: string, signatureLabel: string) {
  return h(
    View,
    { style: styles.box },
    h(Text, { style: styles.text }, text),
    h(
      View,
      null,
      h(Text, { style: styles.text }, '.................................'),
      h(Text, { style: styles.text }, signatureLabel),
    ),
  )
}
