import type { PageDefinition } from '../types'

export const pages: PageDefinition[] = [
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
