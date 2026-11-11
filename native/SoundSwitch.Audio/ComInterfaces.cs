using System.Runtime.InteropServices;
using System.Runtime.InteropServices.Marshalling;

namespace SoundSwitch.Audio;

[GeneratedComInterface]
[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
internal partial interface IMMDeviceEnumerator
{
    [PreserveSig]
    int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IMMDeviceCollection ppDevices);

    [PreserveSig]
    int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);

    [PreserveSig]
    int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string pwstrId, out IMMDevice ppDevice);

    [PreserveSig]
    int RegisterEndpointNotificationCallback(IMMNotificationClient pClient);

    [PreserveSig]
    int UnregisterEndpointNotificationCallback(IMMNotificationClient pClient);
}

[GeneratedComInterface]
[Guid("7991EEC9-7E89-4D85-8390-6C703CEC60C0")]
internal partial interface IMMNotificationClient
{
    void OnDeviceStateChanged([MarshalAs(UnmanagedType.LPWStr)] string pwstrDeviceId, int dwNewState);

    void OnDeviceAdded([MarshalAs(UnmanagedType.LPWStr)] string pwstrDeviceId);

    void OnDeviceRemoved([MarshalAs(UnmanagedType.LPWStr)] string pwstrDeviceId);

    void OnDefaultDeviceChanged(int flow, int role, [MarshalAs(UnmanagedType.LPWStr)] string pwstrDefaultDeviceId);

    void OnPropertyValueChanged([MarshalAs(UnmanagedType.LPWStr)] string pwstrDeviceId, PROPERTYKEY key);
}

[GeneratedComInterface]
[Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E")]
internal partial interface IMMDeviceCollection
{
    [PreserveSig]
    int GetCount(out int pcDevices);

    [PreserveSig]
    int Item(int nDevice, out IMMDevice ppDevice);
}

[GeneratedComInterface]
[Guid("D666063F-1587-4E43-81F1-B948E807363F")]
internal partial interface IMMDevice
{
    [PreserveSig]
    int Activate(in Guid iid, int dwClsCtx, IntPtr pActivationParams, out IAudioEndpointVolume ppInterface);

    [PreserveSig]
    int OpenPropertyStore(int stgmAccess, out IPropertyStore ppProperties);

    [PreserveSig]
    int GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
}

[GeneratedComInterface]
[Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99")]
internal partial interface IPropertyStore
{
    [PreserveSig]
    int GetCount(out int cProps);

    [PreserveSig]
    int GetAt(int iProp, out PROPERTYKEY pkey);

    [PreserveSig]
    int GetValue(ref PROPERTYKEY key, out PROPVARIANT pv);
}

[GeneratedComInterface]
[Guid("5CDF2C82-841E-4546-9722-0CF74078229A")]
internal partial interface IAudioEndpointVolume
{
    [PreserveSig]
    int RegisterControlChangeNotify(IntPtr pNotify);

    [PreserveSig]
    int UnregisterControlChangeNotify(IntPtr pNotify);

    [PreserveSig]
    int GetChannelCount(out int pnChannelCount);

    [PreserveSig]
    int SetMasterVolumeLevel(float fLevelDB, in Guid pguidEventContext);

    [PreserveSig]
    int SetMasterVolumeLevelScalar(float fLevel, in Guid pguidEventContext);

    [PreserveSig]
    int GetMasterVolumeLevel(out float pfLevelDB);

    [PreserveSig]
    int GetMasterVolumeLevelScalar(out float pfLevel);

    [PreserveSig]
    int SetChannelVolumeLevel(uint nChannel, float fLevelDB, in Guid pguidEventContext);

    [PreserveSig]
    int SetChannelVolumeLevelScalar(uint nChannel, float fLevel, in Guid pguidEventContext);

    [PreserveSig]
    int GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);

    [PreserveSig]
    int GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);

    [PreserveSig]
    int SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, in Guid pguidEventContext);

    [PreserveSig]
    int GetMute([MarshalAs(UnmanagedType.Bool)] out bool pbMute);
}

/// <summary>
/// A ordem dos métodos é a ordem da vtable. IPolicyConfig não é documentada.
/// </summary>
[GeneratedComInterface]
[Guid("f8679f50-850a-41cf-9c72-430f290290c8")]
internal partial interface IPolicyConfig
{
    [PreserveSig]
    int GetMixFormat([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, out IntPtr ppFormat);

    [PreserveSig]
    int GetDeviceFormat([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, int bDefault, out IntPtr ppFormat);

    [PreserveSig]
    int ResetDeviceFormat([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName);

    [PreserveSig]
    int SetDeviceFormat([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, IntPtr pEndpointFormat, IntPtr pMixFormat);

    [PreserveSig]
    int GetProcessingPeriod([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, int bDefault, out long pmftDefaultPeriod, out long pmftMinimumPeriod);

    [PreserveSig]
    int SetProcessingPeriod([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, ref long pmftPeriod);

    [PreserveSig]
    int GetShareMode([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, IntPtr pMode);

    [PreserveSig]
    int SetShareMode([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, IntPtr pMode);

    [PreserveSig]
    int GetPropertyValue([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, int bFxStore, ref PROPERTYKEY key, out PROPVARIANT pv);

    [PreserveSig]
    int SetPropertyValue([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, int bFxStore, ref PROPERTYKEY key, ref PROPVARIANT pv);

    [PreserveSig]
    int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string wszDeviceId, int eRole);

    [PreserveSig]
    int SetEndpointVisibility([MarshalAs(UnmanagedType.LPWStr)] string pszDeviceName, int bVisible);
}

[StructLayout(LayoutKind.Sequential)]
internal struct PROPERTYKEY
{
    public Guid fmtid;
    public int pid;
}

/// <summary>
/// O PROPVARIANT nativo tem 24 bytes em x64. Um struct menor faz o GetValue escrever fora do buffer.
/// </summary>
[StructLayout(LayoutKind.Sequential)]
internal struct PROPVARIANT
{
    public ushort vt;
    public ushort wReserved1;
    public ushort wReserved2;
    public ushort wReserved3;
    public IntPtr pointerValue;
    public IntPtr unionRemainder;
}
