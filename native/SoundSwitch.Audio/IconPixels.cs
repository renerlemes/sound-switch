using System.Runtime.InteropServices;

namespace SoundSwitch.Audio;

internal static partial class IconPixels
{
    public static int TraySize()
    {
        int size = GetSystemMetrics(49);
        if (size < 16)
            return 16;
        if (size > 64)
            return 64;
        return size;
    }

    public static (int Width, int Height, byte[] Bgra)? Load(string iconPath, int size)
    {
        if (size <= 0 || size > 256 || !TryParse(iconPath, out string file, out int index))
            return null;

        IntPtr icon = IntPtr.Zero;
        try
        {
            if (SHDefExtractIcon(file, index, 0, out icon, IntPtr.Zero, (uint)size) != 0 || icon == IntPtr.Zero)
                return null;

            return Render(icon, size);
        }
        finally
        {
            if (icon != IntPtr.Zero)
                _ = DestroyIcon(icon);
        }
    }

    /// <summary>
    /// GetDIBits no bitmap do ícone zera o alfa e deixa o fundo preto. DrawIconEx
    /// num DIB de 32 bits preserva a transparência, como o HICON usado pela bandeja.
    /// </summary>
    private static (int Width, int Height, byte[] Bgra)? Render(IntPtr icon, int size)
    {
        BITMAPINFO info = new()
        {
            Header = new BITMAPINFOHEADER
            {
                biSize = Marshal.SizeOf<BITMAPINFOHEADER>(),
                biWidth = size,
                biHeight = -size,
                biPlanes = 1,
                biBitCount = 32
            }
        };

        IntPtr screen = GetDC(IntPtr.Zero);
        IntPtr dib = CreateDIBSection(screen, ref info, 0, out IntPtr bits, IntPtr.Zero, 0);
        if (dib == IntPtr.Zero || bits == IntPtr.Zero)
        {
            if (dib != IntPtr.Zero)
                _ = DeleteObject(dib);
            _ = ReleaseDC(IntPtr.Zero, screen);
            return null;
        }

        IntPtr dc = CreateCompatibleDC(screen);
        IntPtr previous = SelectObject(dc, dib);
        try
        {
            if (!DrawIconEx(dc, 0, 0, icon, size, size, 0, IntPtr.Zero, 3))
                return null;

            byte[] copy = new byte[size * size * 4];
            Marshal.Copy(bits, copy, 0, copy.Length);
            return (size, size, copy);
        }
        finally
        {
            _ = SelectObject(dc, previous);
            _ = DeleteDC(dc);
            _ = DeleteObject(dib);
            _ = ReleaseDC(IntPtr.Zero, screen);
        }
    }

    private static bool TryParse(string iconPath, out string file, out int index)
    {
        file = "";
        index = 0;
        if (string.IsNullOrWhiteSpace(iconPath))
            return false;

        string location = Environment.ExpandEnvironmentVariables(iconPath.Trim()).Trim('"');
        int separator = location.LastIndexOf(',');
        if (separator < 0)
        {
            file = location;
            return file.Length > 0;
        }

        if (!int.TryParse(location[(separator + 1)..].Trim(), out index))
            return false;

        file = location[..separator].Trim().Trim('"');
        return file.Length > 0;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct BITMAPINFOHEADER
    {
        public int biSize;
        public int biWidth;
        public int biHeight;
        public short biPlanes;
        public short biBitCount;
        public int biCompression;
        public int biSizeImage;
        public int biXPelsPerMeter;
        public int biYPelsPerMeter;
        public int biClrUsed;
        public int biClrImportant;
    }

    [StructLayout(LayoutKind.Sequential)]
    private struct BITMAPINFO
    {
        public BITMAPINFOHEADER Header;
        public uint Dummy;
    }

    [LibraryImport("shell32.dll", EntryPoint = "SHDefExtractIconW", StringMarshalling = StringMarshalling.Utf16)]
    private static partial int SHDefExtractIcon(string pszIconFile, int iIndex, uint uFlags, out IntPtr phiconLarge, IntPtr phiconSmall, uint nIconSize);

    [LibraryImport("user32")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool DestroyIcon(IntPtr hIcon);

    [LibraryImport("user32")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool DrawIconEx(IntPtr hdc, int x, int y, IntPtr hIcon, int cx, int cy, uint istepIfAniCur, IntPtr hbrFlickerFreeDraw, uint diFlags);

    [LibraryImport("user32")]
    private static partial int GetSystemMetrics(int nIndex);

    [LibraryImport("gdi32")]
    private static partial IntPtr CreateDIBSection(IntPtr hdc, ref BITMAPINFO pbmi, uint usage, out IntPtr ppvBits, IntPtr hSection, uint offset);

    [LibraryImport("gdi32")]
    private static partial IntPtr CreateCompatibleDC(IntPtr hdc);

    [LibraryImport("gdi32")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool DeleteDC(IntPtr hdc);

    [LibraryImport("gdi32")]
    private static partial IntPtr SelectObject(IntPtr hdc, IntPtr h);

    [LibraryImport("gdi32")]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static partial bool DeleteObject(IntPtr ho);

    [LibraryImport("user32")]
    private static partial IntPtr GetDC(IntPtr hWnd);

    [LibraryImport("user32")]
    private static partial int ReleaseDC(IntPtr hWnd, IntPtr hdc);
}
