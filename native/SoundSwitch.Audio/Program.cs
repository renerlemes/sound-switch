using System.Text;
using System.Text.Json;

namespace SoundSwitch.Audio;

internal static partial class Program
{
    private static AudioEngine? _audio;

    [STAThread]
    private static void Main()
    {
        Console.InputEncoding = new UTF8Encoding(false);
        Console.OutputEncoding = new UTF8Encoding(false);
        Console.SetOut(new StreamWriter(Console.OpenStandardOutput(), new UTF8Encoding(false)) { AutoFlush = true });

        _ = CoInitializeEx(IntPtr.Zero, 2);

        _audio = new AudioEngine();
        try
        {
            _audio.Start(() => Protocol.Event("devicesChanged"));
        }
        catch (Exception)
        {
            // Sem o observador os comandos ainda respondem.
        }

        Thread reader = new(ReadInput) { IsBackground = true };
        reader.Start();
        SessionLoop.Run(HandleLine);
        _audio.Dispose();
    }

    private static void ReadInput()
    {
        string? line;
        while ((line = Console.ReadLine()) is not null)
        {
            if (line.Length > 0)
                SessionLoop.Post(line);
        }

        SessionLoop.Post("{\"id\":0,\"cmd\":\"exit\"}");
    }

    private static void HandleLine(string line)
    {
        Inbound? inbound;
        try
        {
            inbound = JsonSerializer.Deserialize(line, AppJsonContext.Default.Inbound);
        }
        catch (JsonException)
        {
            return;
        }

        if (inbound is null)
            return;

        if (inbound.Cmd == "exit")
        {
            _ = PostQuitMessage(0);
            return;
        }

        try
        {
            Dispatch(inbound);
        }
        catch (Exception)
        {
            Protocol.Fail(inbound.Id, "O comando de áudio falhou.");
        }
    }

    private static void Dispatch(Inbound inbound)
    {
        AudioEngine audio = _audio ?? throw new InvalidOperationException();
        switch (inbound.Cmd)
        {
            case "list":
                Protocol.Ok(inbound.Id, writer =>
                {
                    WriteDevices(writer, "playback", audio.ListPlayback());
                    WriteDevices(writer, "recording", audio.ListRecording());
                    writer.WriteString("defaultPlayback", audio.DefaultPlaybackId() ?? "");
                    writer.WriteString("defaultRecording", audio.DefaultRecordingId() ?? "");
                });
                break;
            case "setDefault":
                Protocol.Ok(inbound.Id, writer => writer.WriteBoolean("changed", audio.SetDefault(inbound.DeviceId)));
                break;
            case "getMute":
            {
                bool? muted = audio.GetMute(inbound.DeviceId);
                if (muted is null)
                    Protocol.Fail(inbound.Id, "Não foi possível ler o mudo.");
                else
                    Protocol.Ok(inbound.Id, writer => writer.WriteBoolean("muted", muted.Value));
                break;
            }
            case "setMute":
                Protocol.Ok(inbound.Id, writer => writer.WriteBoolean("changed", audio.SetMute(inbound.DeviceId, inbound.Mute == true)));
                break;
            case "icon":
            {
                (int Width, int Height, byte[] Bgra)? icon = IconPixels.Load(inbound.Path, inbound.Size == 0 ? 32 : inbound.Size);
                if (icon is null)
                    Protocol.Fail(inbound.Id, "Não foi possível ler o ícone.");
                else
                    Protocol.Ok(inbound.Id, writer =>
                    {
                        writer.WriteNumber("width", icon.Value.Width);
                        writer.WriteNumber("height", icon.Value.Height);
                        writer.WriteString("bgra", Convert.ToBase64String(icon.Value.Bgra));
                    });
                break;
            }
            case "removeLegacy":
                LegacyCleanup.Run();
                Protocol.Ok(inbound.Id);
                break;
            default:
                Protocol.Fail(inbound.Id, "Comando desconhecido.");
                break;
        }
    }

    private static void WriteDevices(Utf8JsonWriter writer, string name, IReadOnlyList<AudioDevice> devices)
    {
        writer.WriteStartArray(name);
        foreach (AudioDevice device in devices)
        {
            writer.WriteStartObject();
            writer.WriteString("id", device.Id);
            writer.WriteString("name", device.Name);
            writer.WriteString("iconPath", device.IconPath);
            (int Width, int Height, byte[] Bgra)? icon = IconPixels.Load(device.IconPath, 32);
            if (icon is not null)
            {
                writer.WriteNumber("iconWidth", icon.Value.Width);
                writer.WriteNumber("iconHeight", icon.Value.Height);
                writer.WriteString("iconBgra", Convert.ToBase64String(icon.Value.Bgra));
            }

            int traySize = IconPixels.TraySize();
            (int Width, int Height, byte[] Bgra)? tray = traySize == 32 ? icon : IconPixels.Load(device.IconPath, traySize);
            if (tray is not null)
            {
                writer.WriteNumber("trayIconWidth", tray.Value.Width);
                writer.WriteNumber("trayIconHeight", tray.Value.Height);
                writer.WriteString("trayIconBgra", Convert.ToBase64String(tray.Value.Bgra));
            }

            writer.WriteEndObject();
        }

        writer.WriteEndArray();
    }

    [System.Runtime.InteropServices.LibraryImport("ole32")]
    private static partial int CoInitializeEx(IntPtr pvReserved, uint dwCoInit);

    [System.Runtime.InteropServices.LibraryImport("user32")]
    private static partial int PostQuitMessage(int nExitCode);
}
