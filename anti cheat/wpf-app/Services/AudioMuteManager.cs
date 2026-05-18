using System;
using System.Collections.Generic;
using System.Diagnostics;
using NAudio.CoreAudioApi;

namespace AntiCheatApp.Services
{
    /// <summary>
    /// Mutes all audio sessions on the system EXCEPT the current process (the WPF exam host).
    /// Uses NAudio's CoreAudioApi for reliable Windows audio session management.
    /// Call MuteOtherApps() when the exam window opens and RestoreAll() when it closes.
    /// </summary>
    public static class AudioMuteManager
    {
        private static readonly List<SessionBackup> _mutedSessions = new();
        private static bool _isActive;

        private class SessionBackup
        {
            public AudioSessionControl Session = null!;
            public bool WasMuted;
        }

        /// <summary>
        /// Mute every audio session that does NOT belong to the current process.
        /// </summary>
        public static void MuteOtherApps()
        {
            if (_isActive) return;
            _isActive = true;
            _mutedSessions.Clear();

            try
            {
                var currentPid = Process.GetCurrentProcess().Id;

                using var enumerator = new MMDeviceEnumerator();
                var device = enumerator.GetDefaultAudioEndpoint(DataFlow.Render, Role.Multimedia);
                if (device == null) return;

                var sessionManager = device.AudioSessionManager;
                if (sessionManager == null) return;

                var sessions = sessionManager.Sessions;
                if (sessions == null) return;

                for (int i = 0; i < sessions.Count; i++)
                {
                    try
                    {
                        var session = sessions[i];
                        if (session == null) continue;

                        var pid = (int)session.GetProcessID;

                        // Skip our own process and system sounds (pid 0)
                        if (pid == currentPid || pid == 0) continue;

                        var wasMuted = session.SimpleAudioVolume.Mute;

                        // Mute this session
                        session.SimpleAudioVolume.Mute = true;

                        _mutedSessions.Add(new SessionBackup
                        {
                            Session = session,
                            WasMuted = wasMuted
                        });

                        Debug.WriteLine($"AudioMute: Muted PID {pid}");
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine($"AudioMute: Failed to mute session {i}: {ex.Message}");
                    }
                }

                Debug.WriteLine($"AudioMute: Muted {_mutedSessions.Count} sessions, kept PID {currentPid}");
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"AudioMuteManager.MuteOtherApps failed: {ex.Message}");
            }
        }

        /// <summary>
        /// Restore all sessions we previously muted back to their original state.
        /// </summary>
        public static void RestoreAll()
        {
            if (!_isActive) return;

            foreach (var backup in _mutedSessions)
            {
                try
                {
                    // Only un-mute if it wasn't already muted before we touched it
                    if (!backup.WasMuted)
                    {
                        backup.Session.SimpleAudioVolume.Mute = false;
                        Debug.WriteLine($"AudioMute: Restored PID {backup.Session.GetProcessID}");
                    }
                }
                catch
                {
                    // Session may no longer exist
                }
            }

            _mutedSessions.Clear();
            _isActive = false;
            Debug.WriteLine("AudioMute: All sessions restored");
        }
    }
}
