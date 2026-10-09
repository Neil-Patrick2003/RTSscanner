import { File, Paths } from 'expo-file-system';

/** Marker file: its presence means the walkthrough has been completed or skipped. */
const marker = () => new File(Paths.document, 'tutorial-seen');

export function hasSeenTutorial(): boolean {
  try {
    return marker().exists;
  } catch {
    return false;
  }
}

export function markTutorialSeen() {
  try {
    const file = marker();
    if (!file.exists) file.write('1');
  } catch {
    // Worst case the tutorial shows again next time.
  }
}
