const KEY = 'rts.tutorial-seen';

export function hasSeenTutorial(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function markTutorialSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    // Worst case the tutorial shows again next time.
  }
}
