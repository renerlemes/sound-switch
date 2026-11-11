using System.Text.Json;
using System.Text.Json.Serialization;

namespace SoundSwitch.Audio;

internal sealed class Inbound
{
    public int Id { get; set; }

    public string Cmd { get; set; } = "";

    public string DeviceId { get; set; } = "";

    public bool? Mute { get; set; }

    public string Path { get; set; } = "";

    public int Size { get; set; }
}

[JsonSourceGenerationOptions(PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase, PropertyNameCaseInsensitive = true)]
[JsonSerializable(typeof(Inbound))]
internal partial class AppJsonContext : JsonSerializerContext;

internal static class Protocol
{
    private static readonly Lock Gate = new();

    public static void Write(Action<Utf8JsonWriter> write)
    {
        using MemoryStream stream = new();
        using (Utf8JsonWriter writer = new(stream))
        {
            writer.WriteStartObject();
            write(writer);
            writer.WriteEndObject();
        }

        lock (Gate)
        {
            Console.Out.WriteLine(System.Text.Encoding.UTF8.GetString(stream.ToArray()));
            Console.Out.Flush();
        }
    }

    public static void Event(string name, string? reason = null)
    {
        Write(writer =>
        {
            writer.WriteString("event", name);
            if (reason is not null)
                writer.WriteString("reason", reason);
        });
    }

    public static void Ok(int id, Action<Utf8JsonWriter>? extra = null)
    {
        Write(writer =>
        {
            writer.WriteNumber("id", id);
            writer.WriteBoolean("ok", true);
            extra?.Invoke(writer);
        });
    }

    public static void Fail(int id, string error)
    {
        Write(writer =>
        {
            writer.WriteNumber("id", id);
            writer.WriteBoolean("ok", false);
            writer.WriteString("error", error);
        });
    }
}
