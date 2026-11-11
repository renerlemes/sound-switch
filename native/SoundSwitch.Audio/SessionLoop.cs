using System.Collections.Concurrent;
using System.Runtime.InteropServices;

namespace SoundSwitch.Audio;

internal static partial class SessionLoop
{
    private const uint WmWtsSessionChange = 0x02B1;
    private const uint WmApp = 0x8000;
    private const int WtsConsoleConnect = 1;
    private const int WtsConsoleDisconnect = 2;
    private const int WtsRemoteConnect = 3;
    private const int WtsRemoteDisconnect = 4;
    private const int WtsSessionLock = 7;
    private const int WtsSessionUnlock = 8;

    private static readonly ConcurrentQueue<string> Lines = new();
    private static readonly Native.WndProc Proc = WindowProc;
    private static IntPtr _window;
    private static Action<string>? _onLine;

    public static void Run(Action<string> onLine)
    {
        _onLine = onLine;
        IntPtr className = Marshal.StringToHGlobalUni("SoundSwitchAudioWindow");
        try
        {
            Native.WNDCLASSW windowClass = new()
            {
                lpfnWndProc = Marshal.GetFunctionPointerForDelegate(Proc),
                lpszClassName = className
            };

            if (Native.RegisterClass(ref windowClass) == 0)
                throw new InvalidOperationException("Não foi possível criar a janela de sessão.");

            _window = Native.CreateWindowEx(0, "SoundSwitchAudioWindow", "", 0, 0, 0, 0, 0, new IntPtr(-3), IntPtr.Zero, IntPtr.Zero, IntPtr.Zero);
            if (_window == IntPtr.Zero)
                throw new InvalidOperationException("Não foi possível criar a janela de sessão.");

            _ = Native.WTSRegisterSessionNotification(_window, 0);
            Drain();

            while (Native.GetMessage(out Native.MSG message, IntPtr.Zero, 0, 0) > 0)
            {
                _ = Native.TranslateMessage(ref message);
                _ = Native.DispatchMessage(ref message);
            }
        }
        finally
        {
            Marshal.FreeHGlobal(className);
        }
    }

    public static void Post(string line)
    {
        Lines.Enqueue(line);
        if (_window != IntPtr.Zero)
            _ = Native.PostMessage(_window, WmApp, IntPtr.Zero, IntPtr.Zero);
    }

    private static IntPtr WindowProc(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam)
    {
        if (msg == WmApp)
        {
            Drain();
            return IntPtr.Zero;
        }

        if (msg == WmWtsSessionChange)
            EmitSession(wParam.ToInt32());

        return Native.DefWindowProc(hWnd, msg, wParam, lParam);
    }

    private static void Drain()
    {
        while (Lines.TryDequeue(out string? line))
            _onLine?.Invoke(line);
    }

    private static void EmitSession(int code)
    {
        string? reason = code switch
        {
            WtsSessionLock => "lock",
            WtsSessionUnlock => "unlock",
            WtsConsoleDisconnect => "consoleDisconnect",
            WtsConsoleConnect => "consoleConnect",
            WtsRemoteDisconnect => "remoteDisconnect",
            WtsRemoteConnect => "remoteConnect",
            _ => null
        };

        if (reason is not null)
            Protocol.Event("session", reason);
    }

    private static partial class Native
    {
        internal delegate IntPtr WndProc(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

        [StructLayout(LayoutKind.Sequential)]
        internal struct MSG
        {
            public IntPtr hwnd;
            public uint message;
            public uint padMessage;
            public IntPtr wParam;
            public IntPtr lParam;
            public uint time;
            public int ptX;
            public int ptY;
        }

        [StructLayout(LayoutKind.Sequential)]
        internal struct WNDCLASSW
        {
            public uint style;
            public IntPtr lpfnWndProc;
            public int cbClsExtra;
            public int cbWndExtra;
            public IntPtr hInstance;
            public IntPtr hIcon;
            public IntPtr hCursor;
            public IntPtr hbrBackground;
            public IntPtr lpszMenuName;
            public IntPtr lpszClassName;
        }

        [LibraryImport("user32", EntryPoint = "RegisterClassW")]
        internal static partial ushort RegisterClass(ref WNDCLASSW lpWndClass);

        [LibraryImport("user32", EntryPoint = "CreateWindowExW", StringMarshalling = StringMarshalling.Utf16)]
        internal static partial IntPtr CreateWindowEx(uint dwExStyle, string lpClassName, string lpWindowName, uint dwStyle, int x, int y, int nWidth, int nHeight, IntPtr hWndParent, IntPtr hMenu, IntPtr hInstance, IntPtr lpParam);

        [LibraryImport("user32", EntryPoint = "DefWindowProcW")]
        internal static partial IntPtr DefWindowProc(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

        [LibraryImport("user32", EntryPoint = "GetMessageW")]
        internal static partial int GetMessage(out MSG lpMsg, IntPtr hWnd, uint wMsgFilterMin, uint wMsgFilterMax);

        [LibraryImport("user32")]
        internal static partial int TranslateMessage(ref MSG lpMsg);

        [LibraryImport("user32", EntryPoint = "DispatchMessageW")]
        internal static partial IntPtr DispatchMessage(ref MSG lpMsg);

        [LibraryImport("user32", EntryPoint = "PostMessageW")]
        internal static partial int PostMessage(IntPtr hWnd, uint msg, IntPtr wParam, IntPtr lParam);

        [LibraryImport("wtsapi32")]
        internal static partial int WTSRegisterSessionNotification(IntPtr hWnd, uint dwFlags);
    }
}
