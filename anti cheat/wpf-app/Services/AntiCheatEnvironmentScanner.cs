using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using AntiCheatApp.Models;

namespace AntiCheatApp.Services
{
    /// <summary>
    /// Heuristic checks suitable for a lab prototype. Production anti-cheat needs drivers and attestation.
    /// </summary>
    public static class AntiCheatEnvironmentScanner
    {
        // High-signal process name substrings (case-insensitive).
        private static readonly string[] ForbiddenSubstrings =
        {
            "taskmgr",
            "cheatengine",
            "obs64",
            "obs32",
            "obs-studio",
            "xsplit",
            "bandicam",
            "discord",
            "teams",
            "anydesk",
            "teamviewer",
            "chromeremotedesktop",
            "vboxservice",
            "vmtoolsd",
            "vmware",
            "qemu-ga",
            "wireshark",
            "fiddler",
            "processhacker",
        };

        private const int SmCmonitors = 80;
        private const int SmRemoteSession = 0x1000;

        public static AntiCheatScanResult Run()
        {
            var issues = new List<string>();

            if (GetSystemMetrics(SmRemoteSession) != 0)
                issues.Add("Remote desktop session detected");

            var monitorCount = GetSystemMetrics(SmCmonitors);
            if (monitorCount > 1)
                issues.Add($"Multiple displays detected ({monitorCount} monitors)");

            TryAppendProcessViolations(issues);

            return new AntiCheatScanResult(issues.Count == 0, issues);
        }

        private static void TryAppendProcessViolations(List<string> issues)
        {
            try
            {
                foreach (var p in Process.GetProcesses())
                {
                    string name;
                    try
                    {
                        name = p.ProcessName;
                    }
                    catch
                    {
                        continue;
                    }

                    var n = name.ToLowerInvariant();
                    foreach (var forbidden in ForbiddenSubstrings)
                    {
                        if (n.Contains(forbidden, StringComparison.Ordinal))
                        {
                            issues.Add($"Blocked software running: {name}");
                            break;
                        }
                    }
                }
            }
            catch
            {
                issues.Add("Unable to enumerate processes (access denied)");
            }
        }

        [DllImport("user32.dll")]
        private static extern int GetSystemMetrics(int nIndex);
    }
}
