namespace AntiCheatApp
{
    /// <summary>
    /// Central place for URLs (replace with appsettings.json in production).
    /// </summary>
    public static class AppConfig
    {
        public const string BackendBaseUrl = "http://localhost:3001";

        /// <summary>React SPA (LearnHub main app). Production example: https://myexamplatform.com/tests</summary>
        public const string ExamFrontBaseUrl = "http://localhost:5173/tests";

        /// <summary>Python detector folder relative to the wpf-app folder.</summary>
        public const string PythonProctorRelativeDir = @"..\Exam-Cheating-Detection-Application-Using-Python-main";

        /// <summary>Default secure exam duration in minutes.</summary>
        public const int ExamDurationMinutes = 5;
    }
}
