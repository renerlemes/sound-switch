using System.Diagnostics;
using Microsoft.Win32;

namespace SoundSwitch.Audio;

internal static class LegacyCleanup
{
    private const string RunPath = @"Software\Microsoft\Windows\CurrentVersion\Run";
    private const string LegacyRunName = "Windows Configurations";
    private const string LegacyTaskName = "Windows Configurations";

    public static void Run()
    {
        try
        {
            using RegistryKey? key = Registry.CurrentUser.OpenSubKey(RunPath, writable: true);
            key?.DeleteValue(LegacyRunName, throwOnMissingValue: false);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or System.Security.SecurityException)
        {
        }

        try
        {
            using Process? process = Process.Start(new ProcessStartInfo
            {
                FileName = "schtasks",
                Arguments = $"/Delete /TN \"{LegacyTaskName}\" /F",
                UseShellExecute = false,
                CreateNoWindow = true,
                RedirectStandardError = true,
                RedirectStandardOutput = true
            });

            process?.WaitForExit(5000);
        }
        catch (Exception ex) when (ex is InvalidOperationException or System.ComponentModel.Win32Exception)
        {
        }
    }
}
