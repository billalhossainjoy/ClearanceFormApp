import type { Student } from '../types'

export const requiredHeaders = [
  'name',
  'technology',
  'roll',
  'registrationNo',
  'session',
  'shift',
]

export const technologyOptions = [
  'Computer Science and Technology',
  'Printing Technology',
  'Graphic Design',
]

export const sessionOptions = Array.from({ length: 9 }, (_, index) => {
  const startYear = 2021 + index
  return `${startYear}-${startYear + 1}`
})

export const shiftOptions = ['1st', '2nd']

export const templateCsv = `${requiredHeaders.join(',')}
Billal Hossain,Computer Science and Technology,652750,1502201668,2021-2022,1st
`

export function parseStudentCsv(csvText: string): { students: Student[] } | { error: string } {
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

export function normalizeStudent(student: Student): Student {
  return {
    name: student.name.trim(),
    technology: student.technology.trim(),
    roll: student.roll.trim(),
    registrationNo: student.registrationNo.trim(),
    session: student.session.trim(),
    shift: student.shift.trim(),
  }
}

export function createStudentCsv(studentsToWrite: Student[]) {
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
