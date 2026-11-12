!macro customInit
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
!macroend

!macro customInstall
  ${IfNot} ${isNoDesktopShortcut}
    ${If} ${FileExists} "$newDesktopLink"
      CreateShortCut "$newDesktopLink" "$appExe" "" "$INSTDIR\resources\icon.ico" 0 "" "" "${APP_DESCRIPTION}"
      WinShell::SetLnkAUMI "$newDesktopLink" "${APP_ID}"
    ${EndIf}
  ${EndIf}
  ${If} ${FileExists} "$newStartMenuLink"
    CreateShortCut "$newStartMenuLink" "$appExe" "" "$INSTDIR\resources\icon.ico" 0 "" "" "${APP_DESCRIPTION}"
    WinShell::SetLnkAUMI "$newStartMenuLink" "${APP_ID}"
  ${EndIf}
  System::Call 'shell32::SHChangeNotify(i, i, i, i) v (0x08000000, 0, 0, 0)'
!macroend
