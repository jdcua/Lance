import type { UserProfile } from '../types';
import { isTauri } from '../utils/tauri';

export function getProfileName(profile: UserProfile): string {
  return profile.name || 'Freelancer';
}

export async function saveFile(blob: Blob, defaultName: string): Promise<void> {
  if (!isTauri()) {
    // Browser mode: trigger a normal browser download
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    try {
      localStorage.setItem('lance:has-exported', 'true');
    } catch {
      /* private mode: achievement flag simply isn't persisted */
    }
    return;
  }
  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeFile } = await import('@tauri-apps/plugin-fs');
  const filePath = await save({ defaultPath: defaultName });
  if (!filePath) return;
  const buffer = await blob.arrayBuffer();
  await writeFile(filePath, new Uint8Array(buffer));
  try {
    localStorage.setItem('lance:has-exported', 'true');
  } catch {
    /* private mode: achievement flag simply isn't persisted */
  }
}
