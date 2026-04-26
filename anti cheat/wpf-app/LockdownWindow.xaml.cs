using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Windows;
using System.Windows.Threading;
using Microsoft.Win32;

namespace AntiCheatApp
{
    public partial class LockdownWindow : Window
    {
        private const int WhKeyboardLl = 13;
        private const int WmKeydown = 0x0100;
        private const int WmSyskeydown = 0x0104;

        private const int VkTab = 0x09;
        private const int VkEscape = 0x1B;
        private const int VkControl = 0x11;
        private const int VkMenu = 0x12;
        private const int VkShift = 0x10;
        private const int VkLwin = 0x5B;
        private const int VkRwin = 0x5C;
        private const int VkF4 = 0x73;
        private const int VkSleep = 0x5F;
        private const int VkL = 0x4C;
        private const int VkQ = 0x51;
        private const int VkDelete = 0x2E;
        private const int VkApps = 0x5D;

        private const string PolicySystem = @"Software\Microsoft\Windows\CurrentVersion\Policies\System";
        private const string PolicyExplorer = @"Software\Microsoft\Windows\CurrentVersion\Policies\Explorer";

        private readonly List<(string SubKey, string Name, bool KeyExisted, int OldValue)> _registryBackups = new();

        private LowLevelKeyboardProc? _proc;
        private IntPtr _hookId = IntPtr.Zero;
        private bool _blockInputActive;

        public LockdownWindow()
        {
            InitializeComponent();
            _proc = HookCallback;
            _hookId = SetHook(_proc);
            Topmost = true;
        }

        private void Window_Loaded(object sender, RoutedEventArgs e)
        {
            Activate();
            Focus();

            ApplyLockdownPolicies();

            if (BlockInput(true))
                _blockInputActive = true;

            var timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(50) };
            timer.Tick += (_, _) =>
            {
                if (IsActive)
                {
                    var rect = new RECT
                    {
                        Left = 0,
                        Top = 0,
                        Right = (int)SystemParameters.PrimaryScreenWidth,
                        Bottom = (int)SystemParameters.PrimaryScreenHeight
                    };
                    ClipCursor(ref rect);
                }
            };
            timer.Start();
        }

        private void Window_Closing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            if (_hookId != IntPtr.Zero)
            {
                UnhookWindowsHookEx(_hookId);
                _hookId = IntPtr.Zero;
            }

            if (_blockInputActive)
            {
                BlockInput(false);
                _blockInputActive = false;
            }

            RestoreLockdownPolicies();
            ClipCursor(IntPtr.Zero);
        }

        /// <summary>
        /// HKCU policies: Task Manager, Win+L lock, Start Log off, fast user switch (where supported).
        /// Ctrl+Alt+Del is handled by Windows and cannot be blocked from user mode.
        /// </summary>
        private void ApplyLockdownPolicies()
        {
            ApplyOrBackupPolicy(PolicySystem, "DisableTaskMgr", 1);
            ApplyOrBackupPolicy(PolicySystem, "DisableLockWorkstation", 1);
            ApplyOrBackupPolicy(PolicyExplorer, "NoLogOff", 1);
            ApplyOrBackupPolicy(PolicySystem, "HideFastUserSwitching", 1);
        }

        private void ApplyOrBackupPolicy(string subKey, string name, int enforcedValue)
        {
            try
            {
                using var key = Registry.CurrentUser.CreateSubKey(subKey, true);
                if (key == null) return;

                var existing = key.GetValue(name);
                var keyExisted = existing != null;
                var oldVal = 0;
                if (keyExisted)
                {
                    try
                    {
                        oldVal = Convert.ToInt32(existing);
                    }
                    catch
                    {
                        // Non-numeric value; restore as 0 if we had a value at this name
                    }
                }

                _registryBackups.Add((subKey, name, keyExisted, oldVal));
                key.SetValue(name, enforcedValue, RegistryValueKind.DWord);
            }
            catch
            {
                // Insufficient rights or policy hive unavailable
            }
        }

        private void RestoreLockdownPolicies()
        {
            for (var i = _registryBackups.Count - 1; i >= 0; i--)
            {
                var (subKey, name, keyExisted, oldVal) = _registryBackups[i];
                try
                {
                    using var key = Registry.CurrentUser.OpenSubKey(subKey, true);
                    if (key == null) continue;

                    if (keyExisted)
                        key.SetValue(name, oldVal, RegistryValueKind.DWord);
                    else
                        key.DeleteValue(name, false);
                }
                catch
                {
                    // ignore
                }
            }

            _registryBackups.Clear();
        }

        private IntPtr SetHook(LowLevelKeyboardProc proc)
        {
            using var curProcess = System.Diagnostics.Process.GetCurrentProcess();
            using var curModule = curProcess.MainModule;
            if (curModule?.ModuleName == null)
                return IntPtr.Zero;
            return SetWindowsHookEx(WhKeyboardLl, proc, GetModuleHandle(curModule.ModuleName), 0);
        }

        private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

        private static bool IsKeyDown(int vk) => (GetAsyncKeyState(vk) & 0x8000) != 0;

        private IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam)
        {
            if (nCode < 0)
                return CallNextHookEx(_hookId, nCode, wParam, lParam);

            var isKeyMsg = wParam == (IntPtr)WmKeydown || wParam == (IntPtr)WmSyskeydown;
            if (!isKeyMsg)
                return CallNextHookEx(_hookId, nCode, wParam, lParam);

            var vkCode = Marshal.ReadInt32(lParam);
            var alt = IsKeyDown(VkMenu);
            var ctrl = IsKeyDown(VkControl);
            var shift = IsKeyDown(VkShift);
            var win = IsKeyDown(VkLwin) || IsKeyDown(VkRwin);

            if (vkCode == VkQ)
            {
                Dispatcher.BeginInvoke(() => Close());
                return Blocked;
            }

            if (vkCode == VkLwin || vkCode == VkRwin)
                return Blocked;

            if (vkCode == VkTab)
                return Blocked;

            if (vkCode == VkEscape)
                return Blocked;

            if (vkCode == VkF4 && alt)
                return Blocked;

            if (vkCode == VkSleep)
                return Blocked;

            if (vkCode == VkL && win)
                return Blocked;

            if (vkCode == VkDelete && ctrl && shift)
                return Blocked;

            if (vkCode == VkApps)
                return Blocked;

            if (vkCode == VkShift && alt)
                return Blocked;

            if (ctrl && vkCode == VkEscape)
                return Blocked;

            return CallNextHookEx(_hookId, nCode, wParam, lParam);
        }

        private static IntPtr Blocked => (IntPtr)1;

        [DllImport("user32.dll", SetLastError = true)]
        private static extern bool BlockInput(bool fBlockIt);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern bool UnhookWindowsHookEx(IntPtr hhk);

        [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

        [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
        private static extern IntPtr GetModuleHandle(string lpModuleName);

        [DllImport("user32.dll")]
        private static extern short GetAsyncKeyState(int vKey);

        [DllImport("user32.dll")]
        private static extern bool ClipCursor(ref RECT lpRect);

        [DllImport("user32.dll")]
        private static extern bool ClipCursor(IntPtr lpRect);

        [StructLayout(LayoutKind.Sequential)]
        public struct RECT
        {
            public int Left;
            public int Top;
            public int Right;
            public int Bottom;
        }
    }
}
