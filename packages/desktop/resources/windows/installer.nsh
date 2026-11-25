!ifndef AIQ_INSTALLER_NSH_INCLUDED
!define AIQ_INSTALLER_NSH_INCLUDED

!include "${__FILEDIR__}\cli-vars.nsh"

; electron-builder names a one-click per-user install directory after the package name, which every
; channel shares, so AI-Q, AI-Q Beta and AI-Q Dev all installed into one "@opencodedesktop"
; directory and each channel's installer and uninstaller replaced or deleted the others' files.
; Each channel now installs into a directory named after its app ID, like its data directory.
; Only the installer moves, and NSIS rejects a variable that the uninstaller build never sets.
!ifndef BUILD_UNINSTALLER
  Var /GLOBAL sharedInstallDir
  Var /GLOBAL aiqCliZip
  Var /GLOBAL aiqNodeZip
!endif

!macro customInit
  StrCpy $sharedInstallDir ""
  ${StdUtils.GetParentPath} $R0 $INSTDIR
  ${If} $INSTDIR == "$R0\${APP_FILENAME}"
    ${If} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
      StrCpy $sharedInstallDir $INSTDIR
      ; The old uninstaller would delete every channel's files from the shared directory, so the
      ; install skips it and removes only this channel's files afterwards. The install writes the
      ; uninstall entry again for the new directory.
      DeleteRegValue SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY}" UninstallString
      !ifdef UNINSTALL_REGISTRY_KEY_2
        DeleteRegValue SHELL_CONTEXT "${UNINSTALL_REGISTRY_KEY_2}" UninstallString
      !endif
    ${EndIf}
    StrCpy $INSTDIR "$R0\${APP_ID}"
  ${EndIf}
  !insertmacro aiqPromptInstallerProfile
  !insertmacro aiqDownloadCli
!macroend

; Downloads CLI assets during install. Mandatory internet: aborts install on failure.
!macro aiqDownloadCli
  !ifndef BUILD_UNINSTALLER
    StrCpy $aiqCliZip ""
    StrCpy $aiqNodeZip ""
    ${If} "${AIQ_CLI_BUN_URL}" == ""
      Goto aiq_download_done
    ${EndIf}

    InitPluginsDir
    StrCpy $aiqCliZip "$PLUGINSDIR\${AIQ_CLI_BUN_FILE}"
    !insertmacro aiqFetchFile "${AIQ_CLI_BUN_URL}" "$aiqCliZip" "AI-Q CLI"
    ${If} ${Errors}
      Delete "$aiqCliZip"
      StrCpy $aiqCliZip ""
      MessageBox MB_ICONSTOP|MB_RETRYCANCEL "Khong the tai AI-Q CLI tu Internet.$\r$\nCan ket noi mang de hoan tat cai dat.$\r$\n$\r$\nURL: ${AIQ_CLI_BUN_URL}" IDRETRY aiq_download_retry_bun IDCANCEL aiq_download_abort
      aiq_download_retry_bun:
        ClearErrors
        !insertmacro aiqFetchFile "${AIQ_CLI_BUN_URL}" "$aiqCliZip" "AI-Q CLI"
        ${If} ${Errors}
          Delete "$aiqCliZip"
          StrCpy $aiqCliZip ""
          Goto aiq_download_abort
        ${EndIf}
    ${EndIf}

    ; Windows 10 before 1809 (build 17763) needs the Node SEA fallback for ConPTY.
    StrCpy $R8 ""
    ReadRegStr $R8 HKLM "SOFTWARE\Microsoft\Windows NT\CurrentVersion" "CurrentBuildNumber"
    ${If} $R8 != ""
    ${AndIf} $R8 < 17763
    ${AndIf} "${AIQ_CLI_NODE_URL}" != ""
      StrCpy $aiqNodeZip "$PLUGINSDIR\${AIQ_CLI_NODE_FILE}"
      !insertmacro aiqFetchFile "${AIQ_CLI_NODE_URL}" "$aiqNodeZip" "AI-Q CLI (Node)"
      ${If} ${Errors}
        Delete "$aiqNodeZip"
        StrCpy $aiqNodeZip ""
        MessageBox MB_ICONSTOP|MB_RETRYCANCEL "Khong the tai AI-Q CLI (Node) cho Windows cu.$\r$\nCan ket noi mang de hoan tat cai dat.$\r$\n$\r$\nURL: ${AIQ_CLI_NODE_URL}" IDRETRY aiq_download_retry_node IDCANCEL aiq_download_abort
        aiq_download_retry_node:
          ClearErrors
          !insertmacro aiqFetchFile "${AIQ_CLI_NODE_URL}" "$aiqNodeZip" "AI-Q CLI (Node)"
          ${If} ${Errors}
            Delete "$aiqNodeZip"
            StrCpy $aiqNodeZip ""
            Goto aiq_download_abort
          ${EndIf}
      ${EndIf}
    ${EndIf}
    Goto aiq_download_done

    aiq_download_abort:
      Abort
    aiq_download_done:
  !endif
!macroend

!macro aiqFetchFile URL OUT NAME
  !ifndef BUILD_UNINSTALLER
    DetailPrint "Dang tai ${NAME}..."
    FileOpen $R1 "$PLUGINSDIR\aiq-dl.ps1" w
    FileWrite $R1 "$$ErrorActionPreference = 'Stop'$\r$\n"
    FileWrite $R1 "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13$\r$\n"
    FileWrite $R1 "$$ProgressPreference = 'SilentlyContinue'$\r$\n"
    FileWrite $R1 "$$url = '${URL}'$\r$\n"
    FileWrite $R1 "$$out = '${OUT}'$\r$\n"
    FileWrite $R1 "for ($$i = 0; $$i -lt 3; $$i++) {$\r$\n"
    FileWrite $R1 "  try { Invoke-WebRequest -Uri $$url -OutFile $$out -UseBasicParsing; exit 0 }$\r$\n"
    FileWrite $R1 "  catch { Start-Sleep -Seconds (2 * ($$i + 1)) }$\r$\n"
    FileWrite $R1 "}$\r$\n"
    FileWrite $R1 "exit 1$\r$\n"
    FileClose $R1
    ClearErrors
    nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\aiq-dl.ps1"'
    Pop $R0
    ${If} $R0 != "0"
      SetErrors
    ${ElseIfNot} ${FileExists} "${OUT}"
      SetErrors
    ${EndIf}
    Delete "$PLUGINSDIR\aiq-dl.ps1"
  !endif
!macroend

!macro aiqExtractCli
  !ifndef BUILD_UNINSTALLER
    ${If} $aiqCliZip != ""
    ${AndIf} ${FileExists} "$aiqCliZip"
      DetailPrint "Dang cai dat AI-Q CLI..."
      !insertmacro aiqUnzip "$aiqCliZip" "$INSTDIR\resources"
      Delete "$aiqCliZip"
      ${If} ${Errors}
        StrCpy $aiqCliZip ""
        MessageBox MB_ICONSTOP|MB_OK "Khong the giai nen AI-Q CLI. Vui long thu cai dat lai."
        Abort
      ${EndIf}
      StrCpy $aiqCliZip ""
      ${If} "${AIQ_CLI_VERSION}" != ""
      ${AndIf} ${FileExists} "$INSTDIR\resources\${AIQ_CLI_BUN_EXE}"
        FileOpen $R1 "$INSTDIR\resources\aiq-cli.version" w
        FileWrite $R1 "${AIQ_CLI_VERSION}"
        FileClose $R1
      ${EndIf}
    ${EndIf}
    ${If} $aiqNodeZip != ""
    ${AndIf} ${FileExists} "$aiqNodeZip"
      DetailPrint "Dang cai dat AI-Q CLI (Node)..."
      !insertmacro aiqUnzip "$aiqNodeZip" "$INSTDIR\resources"
      Delete "$aiqNodeZip"
      ${If} ${Errors}
        StrCpy $aiqNodeZip ""
        MessageBox MB_ICONSTOP|MB_OK "Khong the giai nen AI-Q CLI (Node). Vui long thu cai dat lai."
        Abort
      ${EndIf}
      StrCpy $aiqNodeZip ""
      ${If} "${AIQ_CLI_VERSION}" != ""
      ${AndIf} ${FileExists} "$INSTDIR\resources\${AIQ_CLI_NODE_EXE}"
        FileOpen $R1 "$INSTDIR\resources\aiq-cli-node.version" w
        FileWrite $R1 "${AIQ_CLI_VERSION}"
        FileClose $R1
      ${EndIf}
    ${EndIf}
  !endif
!macroend

!macro aiqUnzip ZIP DEST
  !ifndef BUILD_UNINSTALLER
    CreateDirectory "${DEST}"
    FileOpen $R1 "$PLUGINSDIR\aiq-unzip.ps1" w
    FileWrite $R1 "$$ErrorActionPreference = 'Stop'$\r$\n"
    FileWrite $R1 "$$ProgressPreference = 'SilentlyContinue'$\r$\n"
    FileWrite $R1 "Expand-Archive -LiteralPath '${ZIP}' -DestinationPath '${DEST}' -Force$\r$\n"
    FileClose $R1
    ClearErrors
    nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -File "$PLUGINSDIR\aiq-unzip.ps1"'
    Pop $R0
    ${If} $R0 != "0"
      SetErrors
    ${EndIf}
    Delete "$PLUGINSDIR\aiq-unzip.ps1"
  !endif
!macroend


; C7/C18: collect required user name and explicit terms acceptance before install.
; Simplified: entering a user name and continuing confirms installation and acceptance.
; Best-effort: if the custom dialog cannot be shown in this installer context, continue install
; and let the in-app required setup gate enforce name/acceptance on first run.
!macro aiqPromptInstallerProfile
  !ifndef BUILD_UNINSTALLER
    ClearErrors
    InitPluginsDir
    IfErrors aiq_prompt_done
    Delete "$PLUGINSDIR\aiq-profile.dat"

    ; Prefill name from existing installer profile if present.
    StrCpy $R6 ""
    ReadRegStr $R0 HKCU "Software\com.quanlhk.AIQ.desktop" "UserName"
    ${If} $R0 != ""
      StrCpy $R6 $R0
    ${Else}
      ReadRegStr $R0 HKCU "Software\${APP_ID}" "UserName"
      ${If} $R0 != ""
        StrCpy $R6 $R0
      ${Else}
        ReadRegStr $R0 HKCU "Software\AI-Q" "UserName"
        ${If} $R0 != ""
          StrCpy $R6 $R0
        ${EndIf}
      ${EndIf}
    ${EndIf}

    IfSilent aiq_prompt_silent
    Goto aiq_prompt_show

    aiq_prompt_silent:
      ; Silent installs cannot prompt; reuse an existing accepted profile for updates/reinstalls.
      StrCpy $R9 ""
      ReadRegStr $R8 HKCU "Software\com.quanlhk.AIQ.desktop" "TermsAccepted"
      ${If} $R8 == "1"
        StrCpy $R9 "1"
      ${Else}
        ReadRegStr $R8 HKCU "Software\${APP_ID}" "TermsAccepted"
        ${If} $R8 == "1"
          StrCpy $R9 "1"
        ${Else}
          ReadRegStr $R8 HKCU "Software\AI-Q" "TermsAccepted"
          ${If} $R8 == "1"
            StrCpy $R9 "1"
          ${EndIf}
        ${EndIf}
      ${EndIf}
      ${If} $R6 != ""
      ${AndIf} $R9 == "1"
        WriteINIStr "$PLUGINSDIR\aiq-profile.dat" "Profile" "UserName" "$R6"
        WriteINIStr "$PLUGINSDIR\aiq-profile.dat" "Profile" "TermsAccepted" "1"
      ${EndIf}
      Goto aiq_prompt_done

    aiq_prompt_show:
      ClearErrors
      FileOpen $R1 "$PLUGINSDIR\aiq-profile.ini" w
      IfErrors aiq_prompt_done
      FileWrite $R1 "[Settings]$\r$\n"
      FileWrite $R1 "NumFields=4$\r$\n"
      FileWrite $R1 "$\r$\n"
      FileWrite $R1 "[Field 1]$\r$\n"
      FileWrite $R1 "Type=Label$\r$\n"
      FileWrite $R1 "Text=AI-Q - Thiet lap cai dat$\r$\n"
      FileWrite $R1 "Left=0$\r$\n"
      FileWrite $R1 "Right=-1$\r$\n"
      FileWrite $R1 "Top=0$\r$\n"
      FileWrite $R1 "Bottom=12$\r$\n"
      FileWrite $R1 "$\r$\n"
      FileWrite $R1 "[Field 2]$\r$\n"
      FileWrite $R1 "Type=Label$\r$\n"
      FileWrite $R1 "Text=Nhap ten nguoi dung va tiep tuc de xac nhan cai dat. Bang viec tiep tuc, ban dong y Dieu khoan su dung va Chinh sach quyen rieng tu.$\r$\nRepo: https://github.com/QuanLHK-FSC-HAG/AI-Q$\r$\nDocs: https://quanlhk-fsc-hag.github.io/AI-Q/$\r$\n"
      FileWrite $R1 "Left=0$\r$\n"
      FileWrite $R1 "Right=-1$\r$\n"
      FileWrite $R1 "Top=14$\r$\n"
      FileWrite $R1 "Bottom=58$\r$\n"
      FileWrite $R1 "$\r$\n"
      FileWrite $R1 "[Field 3]$\r$\n"
      FileWrite $R1 "Type=Label$\r$\n"
      FileWrite $R1 "Text=Ten nguoi dung (*):$\r$\n"
      FileWrite $R1 "Left=0$\r$\n"
      FileWrite $R1 "Right=-1$\r$\n"
      FileWrite $R1 "Top=62$\r$\n"
      FileWrite $R1 "Bottom=72$\r$\n"
      FileWrite $R1 "$\r$\n"
      FileWrite $R1 "[Field 4]$\r$\n"
      FileWrite $R1 "Type=Text$\r$\n"
      FileWrite $R1 "Left=0$\r$\n"
      FileWrite $R1 "Right=-1$\r$\n"
      FileWrite $R1 "Top=73$\r$\n"
      FileWrite $R1 "Bottom=87$\r$\n"
      FileWrite $R1 "State=$\r$\n"
      FileClose $R1
      WriteINIStr "$PLUGINSDIR\aiq-profile.ini" "Field 4" "State" "$R6"

      InstallOptions::dialog "$PLUGINSDIR\aiq-profile.ini"
      Pop $R0
      ${If} $R0 == "success"
        ; continue
      ${ElseIf} $R0 == "cancel"
        Abort
      ${ElseIf} $R0 == "back"
        Abort
      ${Else}
        ; Dialog unavailable/failed in this context; do not block install.
        Goto aiq_prompt_done
      ${EndIf}

      ReadINIStr $R2 "$PLUGINSDIR\aiq-profile.ini" "Field 4" "State"
      StrCpy $R6 $R2
      ; Trim leading/trailing spaces for validation.
      aiq_trim_left:
        StrCpy $R4 $R6 1
        ${If} $R4 == " "
          StrCpy $R6 $R6 "" 1
          Goto aiq_trim_left
        ${EndIf}
      aiq_trim_right:
        StrLen $R4 $R6
        ${If} $R4 > 0
          IntOp $R4 $R4 - 1
          StrCpy $R5 $R6 1 $R4
          ${If} $R5 == " "
            StrCpy $R6 $R6 $R4
            Goto aiq_trim_right
          ${EndIf}
        ${EndIf}

      ${If} $R6 == ""
        MessageBox MB_ICONEXCLAMATION|MB_OK "Vui long nhap ten nguoi dung de xac nhan cai dat va tiep tuc."
        Goto aiq_prompt_show
      ${EndIf}

      ; Entering name and continuing = confirm install + accept Terms/Privacy (C7/C18).
      WriteINIStr "$PLUGINSDIR\aiq-profile.dat" "Profile" "UserName" "$R6"
      WriteINIStr "$PLUGINSDIR\aiq-profile.dat" "Profile" "TermsAccepted" "1"
    aiq_prompt_done:
  !endif
!macroend

!macro customInstall
  ; Chromium's sandbox needs read/execute access to the installed runtime files.
  ; https://github.com/electron/electron/issues/49143#issuecomment-3618354787
  nsExec::ExecToLog '"$SYSDIR\icacls.exe" "$INSTDIR" /grant "*S-1-15-2-2:(OI)(CI)(RX)"'
  Pop $0
  !insertmacro leaveSharedInstall
  !insertmacro aiqExtractCli
  ; Persist installer-provided profile for first-launch import by the desktop app.
  !ifndef BUILD_UNINSTALLER
    ${If} ${FileExists} "$PLUGINSDIR\aiq-profile.dat"
      ReadINIStr $R2 "$PLUGINSDIR\aiq-profile.dat" "Profile" "UserName"
      ReadINIStr $R3 "$PLUGINSDIR\aiq-profile.dat" "Profile" "TermsAccepted"
      ${If} $R2 != ""
      ${AndIf} $R3 == "1"
        WriteRegStr HKCU "Software\com.quanlhk.AIQ.desktop" "UserName" "$R2"
        WriteRegStr HKCU "Software\com.quanlhk.AIQ.desktop" "TermsAccepted" "1"
        WriteRegStr HKCU "Software\AI-Q" "UserName" "$R2"
        WriteRegStr HKCU "Software\AI-Q" "TermsAccepted" "1"
        ${If} "${APP_ID}" != "com.quanlhk.AIQ.desktop"
          WriteRegStr HKCU "Software\${APP_ID}" "UserName" "$R2"
          WriteRegStr HKCU "Software\${APP_ID}" "TermsAccepted" "1"
        ${EndIf}
      ${EndIf}
    ${EndIf}
  !endif
!macroend

; Removes this channel's files from the shared directory, and the directory with the files every
; channel shared once no other channel's uninstaller is left in it. A taskbar pin still starts the
; old executable, so it is pointed at the new one.
!macro leaveSharedInstall
  ; A silent upgrade restores the registered folder from the registry after customInit, so the shared directory
  ; can be the one this install just wrote to. Removing its files would delete the new install.
  ${If} $sharedInstallDir != ""
  ${AndIf} $sharedInstallDir != $INSTDIR
    Delete "$sharedInstallDir\${APP_EXECUTABLE_FILENAME}"
    Delete "$sharedInstallDir\${UNINSTALL_FILENAME}"
    !insertmacro removeStagedUpdates $sharedInstallDir
    FindFirst $R0 $R1 "$sharedInstallDir\Uninstall *.exe"
    FindClose $R0
    ${If} $R1 == ""
      RMDir /r $sharedInstallDir
    ${EndIf}
    ${If} ${FileExists} "$QUICKLAUNCH\User Pinned\TaskBar\${SHORTCUT_NAME}.lnk"
      CreateShortCut "$QUICKLAUNCH\User Pinned\TaskBar\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0
      WinShell::SetLnkAUMI "$QUICKLAUNCH\User Pinned\TaskBar\${SHORTCUT_NAME}.lnk" "${APP_ID}"
    ${EndIf}
  ${EndIf}
!macroend

!macro customUnInstall
  ${IfNot} ${isUpdated}
    !insertmacro removeStagedUpdates $INSTDIR
    MessageBox MB_ICONQUESTION|MB_YESNOCANCEL|MB_DEFBUTTON2 "Chon kieu go cai dat AI-Q:$\r$\n$\r$\nCo = Go hoan toan (xoa ca du lieu, cai dat, phien lam viec, tai khoan da dang nhap tren may)$\r$\nKhong = Chi go ung dung (giu du lieu de cai lai sau)$\r$\nHuy = Khong go cai dat" IDYES aiq_uninstall_full IDNO aiq_uninstall_keep
      Abort
    aiq_uninstall_full:
      RMDir /r "$APPDATA\${APP_ID}"
      RMDir /r "$APPDATA\${PRODUCT_FILENAME}"
      RMDir /r "$LOCALAPPDATA\${APP_ID}"
      RMDir /r "$LOCALAPPDATA\${APP_FILENAME}"
      RMDir /r "$LOCALAPPDATA\${PRODUCT_FILENAME}"
      RMDir /r "$LOCALAPPDATA\${PRODUCT_FILENAME}-updater"
      DeleteRegKey HKCU "Software\${APP_ID}"
      ${If} "${APP_ID}" == "com.quanlhk.AIQ.desktop"
        DeleteRegKey HKCU "Software\com.quanlhk.AIQ.desktop"
        DeleteRegKey HKCU "Software\AI-Q"
      ${EndIf}
    aiq_uninstall_keep:
  ${EndIf}
!macroend

; The stock check starts Windows PowerShell up to five times per installer and again in the old
; uninstaller, about 1.2 s each. This walks the process list in-process instead and keeps the stock
; behaviour: stop every process whose image lives under $INSTDIR. An update gives the quitting app
; 10 s to exit on its own; a manual install asks first, then stops it at once.
!macro customCheckAppRunning
  System::Call "kernel32::GetCurrentProcessId() i .R9"
  ; $R8 is the tick count after which processes still running are terminated.
  System::Call "kernel32::GetTickCount() i .R8"
  IntOp $R8 $R8 + 10000
  StrCpy $0 ""

  ${Do}
    System::Call "kernel32::GetTickCount() i .r1"
    IntOp $1 $1 - $R8
    StrCpy $R7 0
    System::Call "kernel32::CreateToolhelp32Snapshot(i 2, i 0) p .R0"
    ${If} $R0 <> -1
      ; PROCESSENTRY32W for the 32-bit installer: nine 4-byte fields, then WCHAR szExeFile[260].
      System::Alloc 556
      Pop $R1
      System::Call "*$R1(i 556)"
      System::Call "kernel32::Process32FirstW(p R0, p R1) i .R2"
      ${DoWhile} $R2 != 0
        System::Call "*$R1(i, i, i .R3)"
        ${If} $R3 != $R9
          System::Call "kernel32::OpenProcess(i 0x1000, i 0, i R3) p .R4"
          ${If} $R4 != 0
            System::Call "kernel32::QueryFullProcessImageNameW(p R4, i 0, w .R5, *i ${NSIS_MAX_STRLEN}) i .R6"
            System::Call "kernel32::CloseHandle(p R4)"
            ${If} $R6 != 0
              ; A channel leaving the shared directory stops its own app there, but not the others'.
              StrCpy $2 0
              !ifndef BUILD_UNINSTALLER
                ${If} $sharedInstallDir != ""
                ${AndIf} $R5 == "$sharedInstallDir\${APP_EXECUTABLE_FILENAME}"
                  StrCpy $2 1
                ${EndIf}
              !endif
              StrLen $R6 "$INSTDIR\"
              StrCpy $R5 $R5 $R6
              ${If} $R5 == "$INSTDIR\"
                StrCpy $2 1
              ${EndIf}
              ${If} $2 == 1
                IntOp $R7 $R7 + 1
                ${If} $1 >= 0
                  System::Call "kernel32::OpenProcess(i 1, i 0, i R3) p .R4"
                  ${If} $R4 != 0
                    System::Call "kernel32::TerminateProcess(p R4, i 1)"
                    System::Call "kernel32::CloseHandle(p R4)"
                  ${EndIf}
                ${EndIf}
              ${EndIf}
            ${EndIf}
          ${EndIf}
        ${EndIf}
        System::Call "kernel32::Process32NextW(p R0, p R1) i .R2"
      ${Loop}
      System::Free $R1
      System::Call "kernel32::CloseHandle(p R0)"
    ${EndIf}

    ${If} $R7 == 0
      ${ExitDo}
    ${EndIf}

    ${If} $0 == ""
      StrCpy $0 "running"
      ${IfNot} ${isUpdated}
        ${If} ${Cmd} `MessageBox MB_OKCANCEL|MB_ICONEXCLAMATION "$(appRunning)" /SD IDOK IDCANCEL`
          Quit
        ${EndIf}
        System::Call "kernel32::GetTickCount() i .R8"
      ${EndIf}
      DetailPrint "$(appClosing)"
    ${ElseIf} $1 >= 2000
      ${If} ${Cmd} `MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDCANCEL`
        Quit
      ${EndIf}
      System::Call "kernel32::GetTickCount() i .R8"
    ${EndIf}

    Sleep 100
  ${Loop}
!macroend

; Staged updates. Once an update has downloaded, the running app starts its installer with --stage.
; That unpacks the app next to the install directory, as "<install dir>.update-<payload hash>",
; while the user keeps working. After the restart, the install renames that directory into place
; instead of decompressing 700 MB. Anything unexpected falls back to the normal extraction.
!macro removeStagedUpdates DIR
  RMDir /r "${DIR}.staging"
  ${StdUtils.GetParentPath} $R8 "${DIR}"
  FindFirst $R9 $R7 "${DIR}.update-*"
  ${DoWhile} $R7 != ""
    RMDir /r "$R8\$R7"
    FindNext $R9 $R7
  ${Loop}
  FindClose $R9
!macroend

!ifndef BUILD_UNINSTALLER
!ifdef APP_64 | APP_ARM64
  !ifdef APP_64 & APP_ARM64
    !error "Staged updates expect one architecture per installer"
  !endif
  !ifdef APP_ARM64
    !define STAGED_PACKAGE "${APP_ARM64}"
    !define STAGED_PACKAGE_HASH "${APP_ARM64_HASH}"
    !define STAGED_PACKAGE_SIZE "${APP_ARM64_UNPACKED_SIZE}"
  !else
    !define STAGED_PACKAGE "${APP_64}"
    !define STAGED_PACKAGE_HASH "${APP_64_HASH}"
    !define STAGED_PACKAGE_SIZE "${APP_64_UNPACKED_SIZE}"
  !endif

  ; Runs first in .onInit, before the single-instance check, and exits 0 only when it staged.
  !macro preInit
    ${StdUtils.TestParameter} $R0 "stage"
    ${If} $R0 == "true"
      SetErrorLevel 2
      ReadRegStr $R1 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
      ; Leave room for the staged copy and as much again, in MB.
      ${DriveSpace} "$R1" "/D=F /S=M" $R2
      IntOp $R3 ${STAGED_PACKAGE_SIZE} / 512
      ${If} $R1 != ""
      ${AndIf} ${FileExists} "$R1\${APP_EXECUTABLE_FILENAME}"
      ${AndIf} $R2 > $R3
        !insertmacro removeStagedUpdates $R1
        ; Stage beside the directory the install will use, which customInit moves out of the shared one.
        ${StdUtils.GetParentPath} $R5 $R1
        ${If} $R1 == "$R5\${APP_FILENAME}"
          StrCpy $R1 "$R5\${APP_ID}"
          !insertmacro removeStagedUpdates $R1
        ${EndIf}
        InitPluginsDir
        ; Stored like the template's copy, so the installer keeps one copy of the payload.
        !ifdef COMPRESS
          SetCompress off
        !endif
        File /oname=$PLUGINSDIR\staged.7z "${STAGED_PACKAGE}"
        !ifdef COMPRESS
          SetCompress "${COMPRESS}"
        !endif
        ClearErrors
        SetOutPath "$R1.staging"
        ${IfNot} ${Errors}
          Nsis7z::Extract "$PLUGINSDIR\staged.7z"
          SetOutPath $PLUGINSDIR
          StrCpy $R4 "${STAGED_PACKAGE_HASH}" 16
          ClearErrors
          Rename "$R1.staging" "$R1.update-$R4"
          ${IfNot} ${Errors}
            SetErrorLevel 0
          ${EndIf}
        ${EndIf}
      ${EndIf}
      Quit
    ${EndIf}
  !macroend

  ; Called by the patched app-builder-lib template in place of extraction. Sets $R0 to "installed"
  ; when it moved the staged app into the empty install directory.
  !macro customInstallStagedApp
    StrCpy $R0 ""
    StrCpy $R1 "${STAGED_PACKAGE_HASH}" 16
    ${If} ${FileExists} "$INSTDIR.update-$R1\${APP_EXECUTABLE_FILENAME}"
      SetOutPath $PLUGINSDIR
      ; Removes the directory only while it is empty, so the rename never mixes two versions.
      RMDir $INSTDIR
      ClearErrors
      Rename "$INSTDIR.update-$R1" $INSTDIR
      ${IfNot} ${Errors}
        StrCpy $R0 "installed"
      ${EndIf}
      SetOutPath $INSTDIR
    ${EndIf}
    !insertmacro removeStagedUpdates $INSTDIR
  !macroend
!endif
!endif

!endif ; AIQ_INSTALLER_NSH_INCLUDED
