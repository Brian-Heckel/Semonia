import { confirm } from '@tauri-apps/plugin-dialog';

// Tauri's dialog plugin replaces window.confirm with an async version that returns a
// Promise (always truthy), so `if (!confirm(...))` never cancels. Always await this instead.
export function confirmAction(message: string): Promise<boolean> {
  return confirm(message, { title: 'Semonia', kind: 'warning' });
}
