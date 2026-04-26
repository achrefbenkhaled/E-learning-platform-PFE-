using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;

namespace AntiCheatApp.Services
{
    /// <summary>
    /// Manages the Python proctor process lifecycle behind the scenes, capturing the webcam frame and analyzing behavior.
    /// </summary>
    public static class ProctorProcessManager
    {
        private static Process? _proctorProcess;
        private static string? _proctorSummaryPath;
        private static string? _proctorStopFile;
        private static readonly StringBuilder _proctorStdOut = new();
        private static readonly StringBuilder _proctorStdErr = new();
        private static readonly HttpClient Http = new HttpClient { Timeout = TimeSpan.FromSeconds(4) };

        public static string? StartProctor()
        {
            try
            {
                var proctorDir = ResolvePythonProctorDir();
                if (string.IsNullOrWhiteSpace(proctorDir))
                {
                    return "Python detector folder not found. Expected folder:\nExam-Cheating-Detection-Application-Using-Python-main";
                }
                var mainPy = Path.Combine(proctorDir, "main.py");
                if (!File.Exists(mainPy))
                {
                    return $"Python detector not found:\n{mainPy}";
                }

                var tempDir = Path.Combine(Path.GetTempPath(), "anti-cheat-proctor");
                Directory.CreateDirectory(tempDir);
                var id = Guid.NewGuid().ToString("N");
                _proctorSummaryPath = Path.Combine(tempDir, $"summary-{id}.json");
                _proctorStopFile = Path.Combine(tempDir, $"stop-{id}.flag");
                var framePath = Path.Combine(tempDir, $"frame-{id}.jpg");

                _proctorStdOut.Clear();
                _proctorStdErr.Clear();

                var resetPayload = JsonSerializer.Serialize(new { framePath });
                _ = Http.PostAsync(
                    $"{AppConfig.BackendBaseUrl}/api/proctor/reset",
                    new StringContent(resetPayload, Encoding.UTF8, "application/json"));

                bool started = TryStartProctorProcess(proctorDir, framePath, "python", "main.py")
                               || TryStartProctorProcess(proctorDir, framePath, "py", "-3 main.py");

                if (!started)
                {
                    var msg = "Failed to start Python. Install Python and ensure `python` or `py -3` works in PATH.";
                    _ = PushProctorReportAsync("", msg, "=== SESSION SUMMARY ===\n" + msg, null, null);
                    return msg;
                }

                return null;
            }
            catch (Exception ex)
            {
                _ = PushProctorReportAsync("", ex.Message, "=== SESSION SUMMARY ===\nCamera startup failed.", null, null);
                return $"Failed to start camera detector:\n{ex.Message}";
            }
        }

        private static bool TryStartProctorProcess(string proctorDir, string framePath, string fileName, string args)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = fileName,
                    Arguments = args,
                    WorkingDirectory = proctorDir,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    CreateNoWindow = true,
                };
                psi.Environment["PYTHONUNBUFFERED"] = "1";
                psi.Environment["PROCTOR_SUMMARY_PATH"] = _proctorSummaryPath ?? "";
                psi.Environment["PROCTOR_STOP_FILE"] = _proctorStopFile ?? "";
                psi.Environment["PROCTOR_FRAME_PATH"] = framePath;

                _proctorProcess = new Process { StartInfo = psi };
                _proctorProcess.OutputDataReceived += (_, e) =>
                {
                    if (!string.IsNullOrWhiteSpace(e.Data))
                    {
                        lock (_proctorStdOut) { _proctorStdOut.AppendLine(e.Data); }
                    }
                };
                _proctorProcess.ErrorDataReceived += (_, e) =>
                {
                    if (!string.IsNullOrWhiteSpace(e.Data))
                    {
                        lock (_proctorStdErr) { _proctorStdErr.AppendLine(e.Data); }
                    }
                };
                _proctorProcess.Start();
                _proctorProcess.BeginOutputReadLine();
                _proctorProcess.BeginErrorReadLine();
                return true;
            }
            catch
            {
                return false;
            }
        }

        private static string? ResolvePythonProctorDir()
        {
            var candidates = new List<string>();

            // 1) Original configured relative path from app base
            candidates.Add(Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", "..", "..", AppConfig.PythonProctorRelativeDir)));

            // 2) Try from current working directory
            candidates.Add(Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, AppConfig.PythonProctorRelativeDir)));

            // 3) Walk parent folders
            var dir = new DirectoryInfo(AppContext.BaseDirectory);
            for (var i = 0; i < 8 && dir != null; i++)
            {
                candidates.Add(Path.Combine(dir.FullName, "Exam-Cheating-Detection-Application-Using-Python-main"));
                candidates.Add(Path.GetFullPath(Path.Combine(dir.FullName, AppConfig.PythonProctorRelativeDir)));
                // Quick hack for specific anti-cheat environment as user has it
                candidates.Add(dir.FullName); 
                dir = dir.Parent;
            }

            foreach (var c in candidates)
            {
                try
                {
                    var main = Path.Combine(c, "main.py");
                    if (Directory.Exists(c) && File.Exists(main))
                        return c;
                }
                catch
                {
                    // skip invalid candidate paths
                }
            }

            return null;
        }

        public static void StopProctorAndReport()
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(_proctorStopFile))
                {
                    File.WriteAllText(_proctorStopFile, "stop");
                }

                if (_proctorProcess != null && !_proctorProcess.HasExited)
                {
                    if (!_proctorProcess.WaitForExit(10000))
                    {
                        _proctorProcess.Kill(true);
                    }
                }

                string stdOut;
                string stdErr;
                lock (_proctorStdOut) stdOut = _proctorStdOut.ToString();
                lock (_proctorStdErr) stdErr = _proctorStdErr.ToString();

                var summaryText = "";
                string? sessionCode = null;
                object? proctoringData = null;

                if (!string.IsNullOrWhiteSpace(_proctorSummaryPath) && File.Exists(_proctorSummaryPath))
                {
                    var json = File.ReadAllText(_proctorSummaryPath);
                    using var doc = JsonDocument.Parse(json);
                    var r = doc.RootElement;
                    var duration = r.TryGetProperty("duration_seconds", out var d) ? d.GetInt32() : 0;
                    sessionCode = r.TryGetProperty("session_code", out var sc) ? sc.GetString() : null;
                    var awayPct = r.TryGetProperty("looking_away_percent", out var ap) ? ap.GetDouble() : 0;
                    var phonePct = r.TryGetProperty("phone_detection_percent", out var pp) ? pp.GetDouble() : 0;
                    var multiPct = r.TryGetProperty("unauthorized_person_percent", out var up) ? up.GetDouble() : 0;
                    var noPersonPct = r.TryGetProperty("no_person_percent", out var np) ? np.GetDouble() : 0;
                    
                    var awayCount = r.TryGetProperty("away_count", out var ac) ? ac.GetInt32() : 0;
                    var phoneCount = r.TryGetProperty("phone_detected_count", out var pc) ? pc.GetInt32() : 0;
                    var multiCount = r.TryGetProperty("unauthorized_person_detected_count", out var mc) ? mc.GetInt32() : 0;
                    var noFaceCount = r.TryGetProperty("no_person_detected_count", out var npfc) ? npfc.GetInt32() : 0;

                    proctoringData = new
                    {
                        lookingAwayCount = awayCount,
                        phoneDetectedCount = phoneCount,
                        multiplePersonsCount = multiCount,
                        noPersonCount = noFaceCount,
                        lookingAwayPercent = awayPct,
                        phoneDetectionPercent = phonePct,
                        unauthorizedPersonPercent = multiPct,
                        noPersonPercent = noPersonPct
                    };

                    summaryText =
                        "=== SESSION SUMMARY ===\n" +
                        $"Total Duration: {duration} seconds\n" +
                        $"Looking Away: {awayPct:F2}%\n" +
                        $"Phone Detection: {phonePct:F2}%\n" +
                        $"Unauthorized Person Detection: {multiPct:F2}%\n" +
                        $"No Person Detection: {noPersonPct:F2}%";
                }

                _ = PushProctorReportAsync(stdOut, stdErr, summaryText, sessionCode, proctoringData);
            }
            catch
            {
                // Best effort
            }
            finally 
            {
                _proctorProcess = null;
            }
        }

        private static async Task PushProctorReportAsync(string stdout, string stderr, string summaryText, string? sessionCode, object? proctoringData)
        {
            try
            {
                var payload = JsonSerializer.Serialize(new
                {
                    stdout,
                    stderr,
                    summary = summaryText,
                    session_code = sessionCode,
                    proctoringData
                });
                using var content = new StringContent(payload, Encoding.UTF8, "application/json");
                await Http.PostAsync($"{AppConfig.BackendBaseUrl}/api/proctor/report", content);
            }
            catch
            {
                // optional feature, ignore transport failures
            }
        }
    }
}
