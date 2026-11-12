; Registro em %TEMP%\SoundSwitch-installer.log, compartilhado pelo instalador e
; pelo desinstalador. Fica inline (sem Function) porque o mesmo código é
; compilado nos dois contextos e funções do instalador não podem ser chamadas
; pelo desinstalador. Usa $0-$7, preservados com Push/Pop; o texto não deve
; referenciar esses registradores.
!macro ssLog TEXT
  Push $0
  Push $1
  Push $2
  Push $3
  Push $4
  Push $5
  Push $6
  Push $7
  System::Alloc 16
  Pop $0
  System::Call 'kernel32::GetLocalTime(p r0)'
  System::Call '*$0(&i2.r1,&i2.r2,&i2.r3,&i2.r4,&i2.r5,&i2.r6,&i2.r7)'
  System::Free $0
  IntFmt $2 "%02d" $2
  IntFmt $4 "%02d" $4
  IntFmt $5 "%02d" $5
  IntFmt $6 "%02d" $6
  IntFmt $7 "%02d" $7
  ClearErrors
  FileOpen $0 "$TEMP\SoundSwitch-installer.log" a
  ${IfNot} ${Errors}
    FileSeek $0 0 END
    FileWrite $0 "$1-$2-$4 $5:$6:$7 [$EXEFILE] ${TEXT}$\r$\n"
    FileClose $0
  ${EndIf}
  Pop $7
  Pop $6
  Pop $5
  Pop $4
  Pop $3
  Pop $2
  Pop $1
  Pop $0
!macroend

; O electron-builder roda o desinstalador antigo até 5 vezes e, se ele sair com
; código diferente de zero, mostra "não é possível fechar o aplicativo", mesmo
; quando o problema não tem relação com o aplicativo estar aberto. Código 2 é
; o que o NSIS devolve quando o desinstalador falha a verificação de integridade
; (arquivo alterado depois de instalado).
!macro ssCheckOldUninstall
  ${If} ${Errors}
    !insertmacro ssLog "old uninstaller could not be started"
    DetailPrint "Uninstall was not successful. Not able to launch uninstaller!"
  ${Else}
    !insertmacro ssLog "old uninstaller exit code: $R0"
    ${If} $R0 != 0
      !insertmacro ssLog "old uninstaller failed. Code 2 usually means its integrity check failed (the file was modified after install)."
      MessageBox MB_OK|MB_ICONEXCLAMATION "$(uninstallFailed): $R0$\r$\n$\r$\n$TEMP\SoundSwitch-installer.log" /SD IDOK
      DetailPrint "Uninstall was not successful. Uninstaller error code: $R0."
      SetErrorLevel 2
      Quit
    ${EndIf}
  ${EndIf}
!macroend

!macro customUnInstallCheck
  !insertmacro ssCheckOldUninstall
!macroend

!macro customUnInstallCheckCurrentUser
  !insertmacro ssCheckOldUninstall
!macroend

!macro customUnInit
  !insertmacro ssLog "uninstaller started: $CMDLINE"
!macroend

!macro customInit
  Push $0
  Push $1
  !insertmacro ssLog "installer ${VERSION} started: $CMDLINE"
  !insertmacro ssLog "exe=$EXEPATH instdir=$INSTDIR mode=$installMode"
  ${If} ${isUpdated}
    !insertmacro ssLog "update run (--updated)"
  ${EndIf}
  ${If} ${FileExists} "$INSTDIR\${UNINSTALL_FILENAME}"
    ClearErrors
    FileOpen $0 "$INSTDIR\${UNINSTALL_FILENAME}" r
    ${IfNot} ${Errors}
      FileSeek $0 0 END $1
      FileClose $0
      !insertmacro ssLog "installed uninstaller found, $1 bytes"
    ${EndIf}
  ${Else}
    !insertmacro ssLog "no installed uninstaller in instdir"
  ${EndIf}
  Pop $1
  Pop $0

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
  !insertmacro ssLog "checking for running SoundSwitch processes"
  checkSoundSwitch:
    nsExec::Exec `"$SYSDIR\taskkill.exe" /F /T /IM "${APP_EXECUTABLE_FILENAME}"`
    Pop $R0
    !insertmacro ssLog "taskkill ${APP_EXECUTABLE_FILENAME}: $R0"
    nsExec::Exec `"$SYSDIR\taskkill.exe" /F /T /IM "SoundSwitch.Audio.exe"`
    Pop $R0
    !insertmacro ssLog "taskkill SoundSwitch.Audio.exe: $R0"
    Sleep 500
    nsExec::Exec `"$SYSDIR\cmd.exe" /C tasklist /FI "IMAGENAME eq ${APP_EXECUTABLE_FILENAME}" /FO CSV /NH | "$SYSDIR\findstr.exe" /B /I /C:"\"${APP_EXECUTABLE_FILENAME}\""`
    Pop $R0
    !insertmacro ssLog "still running ${APP_EXECUTABLE_FILENAME}? (0 = yes, 1 = no): $R0"
    ${If} $R0 != 0
      nsExec::Exec `"$SYSDIR\cmd.exe" /C tasklist /FI "IMAGENAME eq SoundSwitch.Audio.exe" /FO CSV /NH | "$SYSDIR\findstr.exe" /B /I /C:"\"SoundSwitch.Audio.exe\""`
      Pop $R0
      !insertmacro ssLog "still running SoundSwitch.Audio.exe? (0 = yes, 1 = no): $R0"
    ${EndIf}
    ${If} $R0 == 0
      nsExec::Exec `"$SYSDIR\cmd.exe" /C tasklist /FI "IMAGENAME eq SoundSwitch*" /FO CSV /NH >> "$TEMP\SoundSwitch-installer.log"`
      Pop $R0
      !insertmacro ssLog "processes still running, asking the user"
      MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "$(appCannotBeClosed)" /SD IDCANCEL IDRETRY checkSoundSwitch
      !insertmacro ssLog "user cancelled, quitting"
      Quit
    ${EndIf}
    !insertmacro ssLog "no SoundSwitch process running"
!macroend

!macro customInstall
  !insertmacro ssLog "files installed in $INSTDIR"
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
