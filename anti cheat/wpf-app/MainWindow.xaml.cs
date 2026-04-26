using System;
using System.ComponentModel;
using System.Net.Http;
using System.Text.Json;
using System.Windows;
using System.Windows.Media.Animation;
using System.Windows.Threading;

namespace AntiCheatApp
{
    public partial class MainWindow : Window
    {
        private static readonly HttpClient Http = new HttpClient { Timeout = TimeSpan.FromSeconds(2) };
        private readonly MainViewModel _viewModel = new();
        private bool _suppressToggle;
        private Storyboard? _pulseStoryboard;

        public MainWindow()
        {
            InitializeComponent();
            DataContext = _viewModel;

            _viewModel.PropertyChanged += ViewModelOnPropertyChanged;
        }

        private void ViewModelOnPropertyChanged(object? sender, PropertyChangedEventArgs e)
        {
            if (e.PropertyName == nameof(MainViewModel.AntiCheatSwitchOn))
            {
                _suppressToggle = true;
                AntiCheatToggle.IsChecked = _viewModel.AntiCheatSwitchOn;
                _suppressToggle = false;
            }

            if (e.PropertyName == nameof(MainViewModel.StatusRingAnimating))
            {
                if (_viewModel.StatusRingAnimating)
                {
                    _pulseStoryboard = (Storyboard)FindResource("StatusPulse");
                    _pulseStoryboard.Begin(StatusRing, true);
                }
                else
                {
                    _pulseStoryboard?.Stop(StatusRing);
                    StatusRing.Opacity = 1;
                }
            }
        }

        private async void AntiCheatToggle_Checked(object sender, RoutedEventArgs e)
        {
            if (_suppressToggle) return;
            await _viewModel.OnAntiCheatToggleRequestedAsync(true);
        }

        private async void AntiCheatToggle_Unchecked(object sender, RoutedEventArgs e)
        {
            if (_suppressToggle) return;
            await _viewModel.OnAntiCheatToggleRequestedAsync(false);
        }




        private async void OnExitClick(object sender, RoutedEventArgs e)
        {
            await _viewModel.StopSessionAsync();
            Application.Current.Shutdown();
        }

        protected override void OnMouseLeftButtonDown(System.Windows.Input.MouseButtonEventArgs e)
        {
            base.OnMouseLeftButtonDown(e);
            DragMove();
        }

        protected override async void OnClosed(EventArgs e)
        {
            await _viewModel.StopSessionAsync();
            base.OnClosed(e);
        }
    }
}
