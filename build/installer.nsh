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
