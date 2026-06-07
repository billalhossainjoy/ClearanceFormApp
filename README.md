# Graphic Arts Institute Clearance App

Desktop clearance management software for Graphic Arts Institute. The app reads student data from CSV files, lets staff update student records, and generates clearance PDFs with configurable department rows and signatures.

## Features

- Read all valid `.csv` student files from a selected folder.
- View, search, filter, edit, and save student records back to the source CSV file.
- Download a student CSV template.
- Configure clearance PDF title text, notice text, department rows, and signatures.
- Upload and manage signature images outside the application install folder.
- Generate, preview in development, print, and download clearance PDFs.
- Windows one-click installer with automatic update download and install on app start.

## Tech Stack

- Electron
- Vue 3
- TypeScript
- Vite
- electron-builder
- electron-updater
- pnpm

## Requirements

- Node.js 22.x
- pnpm 11.x
- Windows for the release build used by GitHub Actions

Install dependencies:

```powershell
pnpm install
```

## Development

Start the Vite development server:

```powershell
pnpm dev
```

Build the app and installer:

```powershell
pnpm build
```

Build only the Windows target:

```powershell
pnpm build:win
```

Build output is written to:

```text
release/<version>/
```

## CSV Format

Student CSV files must use the required headers from the app template. Use the Settings page in the app to download `gai-students-template.csv`.

The app only loads valid CSV files from the selected folder. Invalid files are ignored.

## Application Data

User data is stored outside the install directory so updates do not remove app settings or uploaded signature images.

The app stores:

- selected CSV folder path
- signature image folder path
- clearance PDF settings
- uploaded signature images

## Windows Installer

The Windows release uses an NSIS one-click installer:

- installs for the current user
- uses the default install location
- does not show a setup wizard
- creates update metadata for `electron-updater`

## Auto Update

Published GitHub releases are used as the update feed. On app start, the packaged app checks for updates, downloads them automatically, then installs and restarts when the update is ready.

For auto-update to work:

- `package.json` version must be higher than the installed version
- a matching Git tag must be pushed, for example `v1.0.5`
- the GitHub release workflow must publish the Windows installer and `latest.yml`

## Release

The release workflow runs when a tag matching `v*` is pushed.

Before tagging, update `package.json`:

```json
"version": "1.0.6"
```

Then commit, tag, and push:

```powershell
git add package.json
git commit -m "Release 1.0.6"
git tag -a v1.0.6 -m "Release 1.0.6"
git push origin main
git push origin v1.0.6
```

The workflow checks that the tag version matches `package.json`. If `package.json` is `1.0.6`, the tag must be `v1.0.6`.

## Project Structure

```text
electron/                 Electron main and preload code
src/                      Vue renderer application
src/components/           App pages and shared UI components
src/clearancePdf.ts       Clearance PDF generation
build/                    Installer icons and electron-builder hooks
.github/workflows/        Release automation
electron-builder.json5    Packaging and publish configuration
```
