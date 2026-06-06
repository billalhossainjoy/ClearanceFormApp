!include nsDialogs.nsh
!include LogicLib.nsh

!ifndef BUILD_UNINSTALLER

Var CsvFolder
Var SignatureFolder
Var CsvFolderInput
Var SignatureFolderInput

!macro customInit
  StrCpy $CsvFolder "$DOCUMENTS"
  StrCpy $SignatureFolder "$DOCUMENTS\Graphic Arts Institute Signatures"
!macroend

!macro customPageAfterChangeDir
  Page custom AppLocationPageCreate AppLocationPageLeave
!macroend

Function AppLocationPageCreate
  nsDialogs::Create 1018
  Pop $0

  ${If} $0 == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 24u "Choose the CSV and signature folders. You can change both later from Settings."
  Pop $0

  ${NSD_CreateLabel} 0 34u 100% 10u "CSV files folder"
  Pop $0
  ${NSD_CreateDirRequest} 0 47u 74% 12u "$CsvFolder"
  Pop $CsvFolderInput
  ${NSD_CreateBrowseButton} 78% 46u 22% 14u "Browse..."
  Pop $0
  ${NSD_OnClick} $0 BrowseCsvFolder

  ${NSD_CreateLabel} 0 72u 100% 10u "Signature images folder"
  Pop $0
  ${NSD_CreateDirRequest} 0 85u 74% 12u "$SignatureFolder"
  Pop $SignatureFolderInput
  ${NSD_CreateBrowseButton} 78% 84u 22% 14u "Browse..."
  Pop $0
  ${NSD_OnClick} $0 BrowseSignatureFolder

  nsDialogs::Show
FunctionEnd

Function BrowseCsvFolder
  nsDialogs::SelectFolderDialog "Select CSV files folder" "$CsvFolder"
  Pop $0

  ${If} $0 != error
    StrCpy $CsvFolder "$0"
    ${NSD_SetText} $CsvFolderInput "$CsvFolder"
  ${EndIf}
FunctionEnd

Function BrowseSignatureFolder
  nsDialogs::SelectFolderDialog "Select signature images folder" "$SignatureFolder"
  Pop $0

  ${If} $0 != error
    StrCpy $SignatureFolder "$0"
    ${NSD_SetText} $SignatureFolderInput "$SignatureFolder"
  ${EndIf}
FunctionEnd

Function AppLocationPageLeave
  ${NSD_GetText} $CsvFolderInput $CsvFolder
  ${NSD_GetText} $SignatureFolderInput $SignatureFolder

  ${If} $CsvFolder == ""
    MessageBox MB_ICONEXCLAMATION "Please select the CSV files folder."
    Abort
  ${EndIf}

  ${If} $SignatureFolder == ""
    MessageBox MB_ICONEXCLAMATION "Please select the signature images folder."
    Abort
  ${EndIf}
FunctionEnd

!macro customInstall
  CreateDirectory "$APPDATA\Graphic Arts Institute"
  CreateDirectory "$SignatureFolder"
  WriteINIStr "$APPDATA\Graphic Arts Institute\installer-settings.ini" "locations" "csvFolderPath" "$CsvFolder"
  WriteINIStr "$APPDATA\Graphic Arts Institute\installer-settings.ini" "locations" "signatureFolderPath" "$SignatureFolder"
!macroend

!endif
