import { Text, type TextProps } from 'react-native';
import { useColorScheme } from '@/hooks/useColorScheme';

export function ThemedText(props: TextProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Text
      {...props}
      style={[
        { color: isDark ? '#FFFFFF' : '#000000' },
        props.style,
      ]}
    />
  );
}
