!macro customInit
  ; Numa atualização o aplicativo ainda está aberto aqui. Desinstalar neste
  ; ponto faz o instalador achar que o SoundSwitch não fechou. A seção de
  ; instalação remove a versão anterior depois que o processo encerrou.
  ${IfNot} ${isUpdated}
    StrCpy $R0 ""
    ReadRegStr $R0 HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\SoundSwitch_is1" "QuietUninstallString"
    ${If} $R0 == ""
      ReadRegStr $R0 HKLM "Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\SoundSwitch_is1" "QuietUninstallString"
    ${EndIf}
    ${If} $R0 == ""
      ReadRegStr $R0 HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\SoundSwitch_is1" "QuietUninstallString"
    ${EndIf}
    ${If} $R0 != ""
      ExecWait $R0
    ${EndIf}
  ${EndIf}
!macroend

; A verificação padrão trata qualquer executável dentro da pasta de instalação
; como o aplicativo. O instalador e o processo oculto de áudio entram nessa
; conta. Aqui só importam os dois executáveis do SoundSwitch.
!macro customCheckAppRunning
  checkSoundSwitch:
    nsExec::Exec `"$SYSDIR\taskkill.exe" /F /T /IM "${APP_EXECUTABLE_FILENAME}"`
    Pop $R0
    nsExec::Exec `"$SYSDIR\taskkill.exe" /F /T /IM "SoundSwitch.Audio.exe"`
    Pop $R0
    Sleep 500
    nsExec::Exec `"$SYSDIR\cmd.exe" /C tasklist /FI "IMAGENAME eq ${APP_EXECUTABLE_FILENAME}" /FO CSV /NH | "$SYSDIR\findstr.exe" /B /I /C:"\"${APP_EXECUTABLE_FILENAME}\""`
    Pop $R0
    ${If} $R0 != 0
      nsExec::Exec `"$SYSDIR\cmd.exe" /C tasklist /FI "IMAGENAME eq SoundSwitch.Audio.exe" /FO CSV /NH | "$SYSDIR\findstr.exe" /B /I /C:"\"SoundSwitch.Audio.exe\""`
      Pop $R0
    ${EndIf}
    ${If} $R0 == 0
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY checkSoundSwitch
      Quit
    ${EndIf}
!macroend

!macro customInstall
  ; A descrição do atalho é o nome que o Gerenciador de Tarefas exibe.
  ${IfNot} ${isNoDesktopShortcut}
    ${If} ${FileExists} "$newDesktopLink"
      CreateShortCut "$newDesktopLink" "$appExe" "" "$INSTDIR\resources\icon.ico" 0 "" "" "${PRODUCT_NAME}"
      WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
    ${EndIf}
  ${EndIf}
  ${If} ${FileExists} "$newStartMenuLink"
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$INSTDIR\resources\icon.ico" 0 "" "" "${PRODUCT_NAME}"
    WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
  ${EndIf}
  System::Call 'shell32::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend
