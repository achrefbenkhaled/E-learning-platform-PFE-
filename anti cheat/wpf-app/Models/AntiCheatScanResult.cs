using System.Collections.Generic;

namespace AntiCheatApp.Models
{
    /// <summary>
    /// Outcome of a local environment scan (processes, displays, RDP, VM hints).
    /// </summary>
    public sealed class AntiCheatScanResult
    {
        public AntiCheatScanResult(bool passed, IReadOnlyList<string> issues)
        {
            Passed = passed;
            Issues = issues;
        }

        public bool Passed { get; }
        public IReadOnlyList<string> Issues { get; }
    }
}
