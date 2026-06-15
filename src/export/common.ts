import type { UserProfile } from '../types';

export function getProfileName(profile: UserProfile): string {
  return profile.name || 'Freelancer';
}

export async function saveFile(blob: Blob, defaultName: string): Promise<void> {
  const { save } = await import('@tauri-apps/plugin-dialog');
  const { writeFile } = await import('@tauri-apps/plugin-fs');
  const filePath = await save({ defaultPath: defaultName });
  if (!filePath) return;
  const buffer = await blob.arrayBuffer();
  await writeFile(filePath, new Uint8Array(buffer));
  localStorage.setItem('lance:has-exported', 'true');
}
