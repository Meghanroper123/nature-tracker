import { View, type ViewProps, useColorScheme } from 'react-native';

export function ThemedView(props: ViewProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View
      {...props}
      style={[
        { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' },
        props.style,
      ]}
    />
  );
}
