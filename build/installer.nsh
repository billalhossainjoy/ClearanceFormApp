!include LogicLib.nsh

!ifndef BUILD_UNINSTALLER

Var CsvFolder
Var SignatureFolder

!macro customInit
  StrCpy $CsvFolder "$DOCUMENTS"
  StrCpy $SignatureFolder "$DOCUMENTS\Graphic Arts Institute Signatures"

  ReadINIStr $0 "$APPDATA\Graphic Arts Institute\installer-settings.ini" "locations" "csvFolderPath"
  ${If} $0 != ""
    StrCpy $CsvFolder "$0"
  ${EndIf}
  ReadINIStr $0 "$APPDATA\Graphic Arts Institute\installer-settings.ini" "locations" "signatureFolderPath"
  ${If} $0 != ""
    StrCpy $SignatureFolder "$0"
  ${EndIf}
!macroend

!macro customInstall
  CreateDirectory "$APPDATA\Graphic Arts Institute"
  CreateDirectory "$SignatureFolder"
  ${If} $CsvFolder != ""
    WriteINIStr "$APPDATA\Graphic Arts Institute\installer-settings.ini" "locations" "csvFolderPath" "$CsvFolder"
  ${EndIf}
  ${If} $SignatureFolder != ""
    WriteINIStr "$APPDATA\Graphic Arts Institute\installer-settings.ini" "locations" "signatureFolderPath" "$SignatureFolder"
  ${EndIf}
!macroend

!endif
