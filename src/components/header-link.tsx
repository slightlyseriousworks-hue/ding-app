import { Link, type Href } from 'expo-router';
import { Platform, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type HeaderLinkProps = {
  href: Href;
  label: string;
};

/** A text button for the navigation header. Works on iOS, Android, and web. */
export function HeaderLink({ href, label }: HeaderLinkProps) {
  return (
    <Link href={href} asChild>
      <Pressable
        hitSlop={Spacing.two}
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <ThemedText type="smallBold">{label}</ThemedText>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  link: {
    // Native headers add their own side margin; web does not.
    paddingHorizontal: Platform.OS === 'web' ? Spacing.three : 0,
  },
  pressed: {
    opacity: 0.6,
  },
});
