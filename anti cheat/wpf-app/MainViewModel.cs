using System;
using System.ComponentModel;
using System.Net.Http;
using System.Runtime.CompilerServices;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Threading;
using AntiCheatApp.Models;
using AntiCheatApp.Services;

namespace AntiCheatApp
{
    /// <summary>
    /// Drives UI state, backend session token, and heartbeat while anti-cheat is ON.
    /// </summary>
    public class MainViewModel : INotifyPropertyChanged
    {
        private static readonly HttpClient Http = new HttpClient { Timeout = TimeSpan.FromSeconds(8) };

        private readonly DispatcherTimer _heartbeatTimer;
        private readonly DispatcherTimer _pendingRequestTimer;
        private string? _lastLaunchedTestId;
        private DateTime _lastLaunchTime = DateTime.MinValue;
        private string? _sessionToken;
        private string? _accessToken;
        private string? _refreshToken;

        private AntiCheatUiPhase _phase = AntiCheatUiPhase.Waiting;
        private bool _antiCheatSwitchOn;
        private string _statusDetail = "Turn protection on to unlock the exam.";

        public MainViewModel()
        {
            _heartbeatTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(3) };
            _heartbeatTimer.Tick += (_, _) => _ = SendHeartbeatAsync();

            _pendingRequestTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
            _pendingRequestTimer.Tick += async (s, e) => await CheckPendingLaunchAsync();
            _pendingRequestTimer.Start();
        }

        public bool AntiCheatSwitchOn
        {
            get => _antiCheatSwitchOn;
            set
            {
                if (_antiCheatSwitchOn == value) return;
                _antiCheatSwitchOn = value;
                OnPropertyChanged();
            }
        }

        public AntiCheatUiPhase Phase
        {
            get => _phase;
            private set
            {
                if (_phase == value) return;
                _phase = value;
                OnPropertyChanged();
                OnPropertyChanged(nameof(StatusHeadline));
                OnPropertyChanged(nameof(PhaseName));
                OnPropertyChanged(nameof(ToggleEnabled));
                OnPropertyChanged(nameof(StatusRingAnimating));
            }
        }

        /// <summary>Large label: Disabled / Enabled / Violation.</summary>
        public string StatusHeadline => Phase switch
        {
            AntiCheatUiPhase.Waiting => "Anti-Cheat Disabled",
            AntiCheatUiPhase.Protected => "Anti-Cheat Enabled",
            AntiCheatUiPhase.Violation => "Violation Detected",
            _ => "Anti-Cheat Disabled",
        };

        /// <summary>For XAML <see cref="DataTrigger"/> (enum binding is awkward in WPF).</summary>
        public string PhaseName => Phase.ToString();

        public bool ToggleEnabled => Phase != AntiCheatUiPhase.Violation;

        public bool StatusRingAnimating => Phase == AntiCheatUiPhase.Protected;

        public string StatusDetail
        {
            get => _statusDetail;
            private set
            {
                if (_statusDetail == value) return;
                _statusDetail = value;
                OnPropertyChanged();
            }
        }

        public event PropertyChangedEventHandler? PropertyChanged;

        protected void OnPropertyChanged([CallerMemberName] string? name = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(name));
        }

        /// <summary>User flipped the large toggle.</summary>
        public async Task OnAntiCheatToggleRequestedAsync(bool turnOn)
        {
            if (Phase == AntiCheatUiPhase.Violation && turnOn)
            {
                StatusDetail = "Resolve violations, then restart the application.";
                return;
            }

            if (!turnOn)
            {
                await StopSessionAsync();
                Phase = AntiCheatUiPhase.Waiting;
                StatusDetail = "Anti-cheat is off. The exam cannot be opened.";
                AntiCheatSwitchOn = false;
                return;
            }

            Phase = AntiCheatUiPhase.Waiting;
            StatusDetail = "Running environment checks…";
            AntiCheatSwitchOn = true;

            var scan = AntiCheatEnvironmentScanner.Run();
            if (!scan.Passed)
            {
                Phase = AntiCheatUiPhase.Violation;
                AntiCheatSwitchOn = false;
                var killed = ViolationProcessTerminator.KillTargets();
                var killInfo = killed.Count > 0
                    ? $"{Environment.NewLine}Closed apps: {string.Join(", ", killed)}"
                    : string.Empty;
                StatusDetail = string.Join(Environment.NewLine, scan.Issues) + killInfo;
                return;
            }

            try
            {
                using var res = await Http.PostAsync(
                    $"{AppConfig.BackendBaseUrl}/api/anticheat/start",
                    new StringContent("{}", Encoding.UTF8, "application/json"));
                res.EnsureSuccessStatusCode();
                var json = await res.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                var token = doc.RootElement.GetProperty("token").GetString();
                if (string.IsNullOrEmpty(token))
                    throw new InvalidOperationException("No token in response");

                _sessionToken = token;
                Phase = AntiCheatUiPhase.Protected;

                var proctorWarning = ProctorProcessManager.StartProctor();
                
                StatusDetail = "Environment verified. Session is bound to this desktop client." + 
                    (string.IsNullOrEmpty(proctorWarning) ? "" : "\nWarning: " + proctorWarning);

                _heartbeatTimer.Start();
                _pendingRequestTimer.Start();
                System.Media.SystemSounds.Asterisk.Play();
            }
            catch (Exception ex)
            {
                _sessionToken = null;
                AntiCheatSwitchOn = false;
                Phase = AntiCheatUiPhase.Waiting;
                StatusDetail = $"Cannot reach anti-cheat API. Is the backend running? ({ex.Message})";
                System.Media.SystemSounds.Hand.Play();
            }
        }

        /// <summary>Opens the React exam inside a locked fullscreen WebView2 window (not the external browser).</summary>
        public void OpenExamInBrowser(string? testId = null)
        {
            if (string.IsNullOrEmpty(_sessionToken) || Phase != AntiCheatUiPhase.Protected)
                return;

            string baseUrl = "http://localhost:5173/tests";
            if (!string.IsNullOrEmpty(testId)) 
            {
                baseUrl = $"http://localhost:5173/tests/{testId}/take";
            }

            var url = $"{baseUrl}?token={Uri.EscapeDataString(_sessionToken ?? "")}&autoStart=true";
            
            // Append Auth Tokens if present for SSO
            if (!string.IsNullOrEmpty(_accessToken)) url += $"&accessToken={Uri.EscapeDataString(_accessToken)}";
            if (!string.IsNullOrEmpty(_refreshToken)) url += $"&refreshToken={Uri.EscapeDataString(_refreshToken)}";
            try
            {
                var host = new ExamHostWindow(url);
                host.ShowDialog();
            }
            catch (Exception ex)
            {
                StatusDetail = $"Failed to open exam: {ex.Message}";
            }
        }

        public bool IsProtectedWithToken(string? token)
            => Phase == AntiCheatUiPhase.Protected
               && !string.IsNullOrEmpty(_sessionToken)
               && string.Equals(_sessionToken, token, StringComparison.Ordinal);

        public void OpenExamForToken(string token)
        {
            if (!IsProtectedWithToken(token))
                return;
            OpenExamInBrowser();
        }

        public async Task StopSessionAsync()
        {
            _heartbeatTimer.Stop();
            _pendingRequestTimer.Stop();
            
            ProctorProcessManager.StopProctorAndReport();

            if (string.IsNullOrEmpty(_sessionToken))
            {
                _sessionToken = null;
                return;
            }

            var token = _sessionToken;
            _sessionToken = null;
            try
            {
                var body = JsonSerializer.Serialize(new { token });
                using var content = new StringContent(body, Encoding.UTF8, "application/json");
                await Http.PostAsync($"{AppConfig.BackendBaseUrl}/api/anticheat/stop", content);
            }
            catch
            {
                // Best-effort
            }
        }

        private async Task SendHeartbeatAsync()
        {
            if (string.IsNullOrEmpty(_sessionToken) || Phase != AntiCheatUiPhase.Protected)
                return;

            var scan = AntiCheatEnvironmentScanner.Run();
            var payload = new
            {
                token = _sessionToken,
                checksPassed = scan.Passed,
                messages = scan.Issues,
            };

            try
            {
                var body = JsonSerializer.Serialize(payload);
                using var content = new StringContent(body, Encoding.UTF8, "application/json");
                using var res = await Http.PostAsync($"{AppConfig.BackendBaseUrl}/api/anticheat/heartbeat", content);
                if (!res.IsSuccessStatusCode)
                {
                    await HandleHeartbeatFailureAsync("Server rejected heartbeat.");
                    return;
                }

                if (!scan.Passed)
                {
                    Phase = AntiCheatUiPhase.Violation;
                    AntiCheatSwitchOn = false;
                    _heartbeatTimer.Stop();
                    var killed = ViolationProcessTerminator.KillTargets();
                    var killInfo = killed.Count > 0
                        ? $" | Closed apps: {string.Join(", ", killed)}"
                        : string.Empty;
                    StatusDetail = "Protection lost: " + string.Join("; ", scan.Issues) + killInfo;
                    await StopSessionAsync();
                }
            }
            catch
            {
                await HandleHeartbeatFailureAsync("Heartbeat failed — check network and backend.");
            }
        }

        private async Task HandleHeartbeatFailureAsync(string message)
        {
            Phase = AntiCheatUiPhase.Waiting;
            AntiCheatSwitchOn = false;
            _heartbeatTimer.Stop();
            _pendingRequestTimer.Stop();
            StatusDetail = message;
            await StopSessionAsync();
        }

        private async Task CheckPendingLaunchAsync()
        {
            if (Phase != AntiCheatUiPhase.Protected || string.IsNullOrEmpty(_sessionToken))
                return;

            try
            {
                using var res = await Http.GetAsync($"{AppConfig.BackendBaseUrl}/api/anticheat/exam-start-pending");
                if (!res.IsSuccessStatusCode) return;

                var json = await res.Content.ReadAsStringAsync();
                using var doc = JsonDocument.Parse(json);
                bool pending = doc.RootElement.GetProperty("pending").GetBoolean();
                
                if (pending)
                {
                    string? token = doc.RootElement.GetProperty("token").GetString();
                    string? testId = doc.RootElement.GetProperty("testId").GetString();
                    _accessToken = doc.RootElement.TryGetProperty("accessToken", out var at) ? at.GetString() : null;
                    _refreshToken = doc.RootElement.TryGetProperty("refreshToken", out var rt) ? rt.GetString() : null;

                    if (!string.IsNullOrEmpty(token) && token == _sessionToken)
                    {
                        // Debounce: Don't reopen the same test if it was launched in the last 10 seconds
                        if (_lastLaunchedTestId == testId && (DateTime.Now - _lastLaunchTime).TotalSeconds < 10)
                        {
                            return;
                        }

                        _lastLaunchedTestId = testId;
                        _lastLaunchTime = DateTime.Now;
                        OpenExamInBrowser(testId);
                    }
                }
            }
            catch
            {
                // Silent for polling
            }
        }
    }

    public enum AntiCheatUiPhase
    {
        Waiting,
        Protected,
        Violation,
    }

}
