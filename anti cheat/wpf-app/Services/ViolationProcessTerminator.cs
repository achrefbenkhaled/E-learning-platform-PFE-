using System;
using System.Collections.Generic;
using System.Diagnostics;

namespace AntiCheatApp.Services
{
    /// <summary>
    /// Best-effort termination of specific apps when a violation is detected.
    /// </summary>
    public static class ViolationProcessTerminator
    {
        private static readonly string[] TargetNames =
        {
            "discord",
            "teams",
            "ms-teams",
            "steam",
            "taskmgr",
        };

        public static IReadOnlyList<string> KillTargets()
        {
            var killed = new List<string>();

            foreach (var process in Process.GetProcesses())
            {
                string name;
                try
                {
                    name = process.ProcessName;
                }
                catch
                {
                    continue;
                }

                var lower = name.ToLowerInvariant();
                var shouldKill = false;
                foreach (var t in TargetNames)
                {
                    if (lower.Contains(t, StringComparison.Ordinal))
                    {
                        shouldKill = true;
                        break;
                    }
                }
                if (!shouldKill) continue;

                try
                {
                    process.Kill(true);
                    if (!killed.Contains(name))
                        killed.Add(name);
                }
                catch
                {
                    // Ignore protected/system processes or access denied.
                }
            }

            return killed;
        }
    }
}
