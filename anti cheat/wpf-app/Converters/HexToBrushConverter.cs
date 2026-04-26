using System;
using System.Globalization;
using System.Windows.Data;
using System.Windows.Media;

namespace AntiCheatApp.Converters
{
    /// <summary>Converts #RRGGBB strings to SolidColorBrush for XAML bindings.</summary>
    public sealed class HexToBrushConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is not string hex || string.IsNullOrWhiteSpace(hex))
                return Brushes.Gray;
            try
            {
                return (Brush)new BrushConverter().ConvertFrom(hex)!;
            }
            catch
            {
                return Brushes.Gray;
            }
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotSupportedException();
        }
    }
}
