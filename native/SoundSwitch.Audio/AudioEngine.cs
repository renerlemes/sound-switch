using System.Runtime.InteropServices;
using System.Runtime.InteropServices.Marshalling;

namespace SoundSwitch.Audio;

internal sealed class AudioDevice
{
    public string Id { get; init; } = "";

    public string Name { get; init; } = "";

    public string IconPath { get; init; } = "";
}

internal sealed partial class AudioEngine : IDisposable
{
    private const int eRender = 0;
    private const int eCapture = 1;
    private const int eMultimedia = 1;
    private const int eConsole = 0;
    private const int eCommunications = 2;
    private const int DeviceStateActive = 1;
    private const int StgmRead = 0;
    private const int ClsctxInprocServer = 1;
    private const ushort VtLpwstr = 31;

    private static readonly PROPERTYKEY FriendlyName = new()
    {
        fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"),
        pid = 14
    };

    private static readonly PROPERTYKEY IconPath = new()
    {
        fmtid = new Guid("259abffc-50a7-47ce-af08-68c9a7d73366"),
        pid = 12
    };

    private readonly StrategyBasedComWrappers _wrappers = new();
    private IMMDeviceEnumerator? _enumerator;
    private NotificationSink? _sink;

    public void Start(Action onChanged)
    {
        _enumerator ??= Create<IMMDeviceEnumerator>(new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"));
        _sink ??= new NotificationSink(onChanged);
        _enumerator.RegisterEndpointNotificationCallback(_sink);
    }

    public IReadOnlyList<AudioDevice> ListPlayback() => List(eRender);

    public IReadOnlyList<AudioDevice> ListRecording() => List(eCapture);

    public string? DefaultPlaybackId() => DefaultId(eRender);

    public string? DefaultRecordingId() => DefaultId(eCapture);

    public bool SetDefault(string deviceId)
    {
        if (string.IsNullOrEmpty(deviceId))
            return false;

        IPolicyConfig? policy = null;
        try
        {
            policy = Create<IPolicyConfig>(new Guid("870af99c-171d-4f9e-af0d-e63df40c2bc9"));
            return policy.SetDefaultEndpoint(deviceId, eConsole) == 0
                && policy.SetDefaultEndpoint(deviceId, eMultimedia) == 0
                && policy.SetDefaultEndpoint(deviceId, eCommunications) == 0;
        }
        catch (COMException)
        {
            return false;
        }
        finally
        {
            Release(policy);
        }
    }

    public bool? GetMute(string deviceId)
    {
        IAudioEndpointVolume? volume = EndpointVolume(deviceId);
        if (volume is null)
            return null;

        try
        {
            return volume.GetMute(out bool muted) == 0 ? muted : null;
        }
        catch (COMException)
        {
            return null;
        }
        finally
        {
            Release(volume);
        }
    }

    public bool SetMute(string deviceId, bool mute)
    {
        IAudioEndpointVolume? volume = EndpointVolume(deviceId);
        if (volume is null)
            return false;

        try
        {
            Guid context = Guid.Empty;
            return volume.SetMute(mute, in context) == 0;
        }
        catch (COMException)
        {
            return false;
        }
        finally
        {
            Release(volume);
        }
    }

    public void Dispose()
    {
        if (_enumerator is not null && _sink is not null)
        {
            try
            {
                _enumerator.UnregisterEndpointNotificationCallback(_sink);
            }
            catch (COMException)
            {
            }
        }

        Release(_enumerator);
        _enumerator = null;
        _sink = null;
    }

    private IReadOnlyList<AudioDevice> List(int dataFlow)
    {
        List<AudioDevice> result = [];
        IMMDeviceEnumerator? enumerator = null;
        IMMDeviceCollection? collection = null;

        try
        {
            enumerator = Create<IMMDeviceEnumerator>(new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"));
            if (enumerator.EnumAudioEndpoints(dataFlow, DeviceStateActive, out collection) != 0 || collection is null)
                return result;

            collection.GetCount(out int count);
            for (int index = 0; index < count; index++)
            {
                IMMDevice? device = null;
                try
                {
                    if (collection.Item(index, out device) != 0 || device is null)
                        continue;

                    AudioDevice? read = Read(device);
                    if (read is not null)
                        result.Add(read);
                }
                finally
                {
                    Release(device);
                }
            }
        }
        catch (COMException)
        {
        }
        finally
        {
            Release(collection);
            Release(enumerator);
        }

        return result;
    }

    private string? DefaultId(int dataFlow)
    {
        IMMDeviceEnumerator? enumerator = null;
        IMMDevice? device = null;
        try
        {
            enumerator = Create<IMMDeviceEnumerator>(new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"));
            if (enumerator.GetDefaultAudioEndpoint(dataFlow, eMultimedia, out device) != 0 || device is null)
                return null;

            return device.GetId(out string id) == 0 ? id : null;
        }
        catch (COMException)
        {
            return null;
        }
        finally
        {
            Release(device);
            Release(enumerator);
        }
    }

    private static AudioDevice? Read(IMMDevice device)
    {
        IPropertyStore? store = null;
        try
        {
            if (device.GetId(out string id) != 0 || string.IsNullOrWhiteSpace(id))
                return null;

            if (device.OpenPropertyStore(StgmRead, out store) != 0 || store is null)
                return new AudioDevice { Id = id, Name = id };

            string? name = ReadString(store, FriendlyName);
            return new AudioDevice
            {
                Id = id,
                Name = string.IsNullOrWhiteSpace(name) ? id : name,
                IconPath = ReadString(store, IconPath) ?? ""
            };
        }
        finally
        {
            Release(store);
        }
    }

    private static string? ReadString(IPropertyStore store, PROPERTYKEY key)
    {
        PROPVARIANT variant = default;
        try
        {
            if (store.GetValue(ref key, out variant) != 0 || variant.vt != VtLpwstr || variant.pointerValue == IntPtr.Zero)
                return null;

            return Marshal.PtrToStringUni(variant.pointerValue);
        }
        catch (COMException)
        {
            return null;
        }
        finally
        {
            PropVariantClear(ref variant);
        }
    }

    private IAudioEndpointVolume? EndpointVolume(string deviceId)
    {
        if (string.IsNullOrEmpty(deviceId))
            return null;

        IMMDeviceEnumerator? enumerator = null;
        IMMDevice? device = null;
        try
        {
            enumerator = Create<IMMDeviceEnumerator>(new Guid("BCDE0395-E52F-467C-8E3D-C4579291692E"));
            if (enumerator.GetDevice(deviceId, out device) != 0 || device is null)
                return null;

            Guid iid = typeof(IAudioEndpointVolume).GUID;
            if (device.Activate(in iid, ClsctxInprocServer, IntPtr.Zero, out IAudioEndpointVolume volume) != 0)
                return null;

            return volume;
        }
        catch (COMException)
        {
            return null;
        }
        finally
        {
            Release(device);
            Release(enumerator);
        }
    }

    private T Create<T>(Guid clsid)
        where T : class
    {
        Guid iid = typeof(T).GUID;
        int hr = CoCreateInstance(in clsid, IntPtr.Zero, ClsctxInprocServer, in iid, out IntPtr pointer);
        if (hr < 0)
            Marshal.ThrowExceptionForHR(hr);

        try
        {
            return (T)_wrappers.GetOrCreateObjectForComInstance(pointer, CreateObjectFlags.UniqueInstance);
        }
        finally
        {
            if (pointer != IntPtr.Zero)
                _ = Marshal.Release(pointer);
        }
    }

    private static void Release(object? com)
    {
        if (com is IDisposable disposable)
            disposable.Dispose();
    }

    [LibraryImport("ole32")]
    private static partial int CoCreateInstance(in Guid rclsid, IntPtr pUnkOuter, uint dwClsContext, in Guid riid, out IntPtr ppv);

    [LibraryImport("ole32")]
    private static partial int PropVariantClear(ref PROPVARIANT pvar);

    [GeneratedComClass]
    private sealed partial class NotificationSink : IMMNotificationClient
    {
        private readonly Action _onChanged;

        public NotificationSink(Action onChanged)
        {
            _onChanged = onChanged;
        }

        public void OnDeviceStateChanged(string pwstrDeviceId, int dwNewState) => _onChanged();

        public void OnDeviceAdded(string pwstrDeviceId) => _onChanged();

        public void OnDeviceRemoved(string pwstrDeviceId) => _onChanged();

        public void OnDefaultDeviceChanged(int flow, int role, string pwstrDefaultDeviceId) => _onChanged();

        public void OnPropertyValueChanged(string pwstrDeviceId, PROPERTYKEY key)
        {
        }
    }
}
