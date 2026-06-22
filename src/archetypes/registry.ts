import type { ArchetypeConfig, ArchetypeId } from './types';
import defaultArchetype from './default';
import animator from './animator';
import developer from './developer';
import designer from './designer';
import photographer from './photographer';
import writer from './writer';
import consultant from './consultant';
import filmmaker from './filmmaker';
import illustrator from './illustrator';
import threeDArtist from './3d-artist';
import gameDeveloper from './game-developer';
import uxDesigner from './ux-designer';
import marketing from './marketing';
import socialMedia from './social-media';
import copywriter from './copywriter';
import musician from './musician';
import architect from './architect';
import virtualAssistant from './virtual-assistant';
import translator from './translator';
import seo from './seo';
import dataAnalyst from './data-analyst';
import custom from './custom';

export const ARCHETYPES: Record<string, ArchetypeConfig> = {
  default: defaultArchetype,
  animator,
  developer,
  designer,
  photographer,
  writer,
  consultant,
  filmmaker,
  illustrator,
  '3d-artist': threeDArtist,
  'game-developer': gameDeveloper,
  'ux-designer': uxDesigner,
  marketing,
  'social-media': socialMedia,
  copywriter,
  musician,
  architect,
  'virtual-assistant': virtualAssistant,
  translator,
  seo,
  'data-analyst': dataAnalyst,
  custom,
};

export function getArchetype(id: string): ArchetypeConfig {
  return ARCHETYPES[id] || defaultArchetype;
}

export const ARCHETYPE_LIST = Object.values(ARCHETYPES);

export const ARCHETYPE_CATEGORIES: Record<string, string[]> = {
  'Creative': ['animator', 'designer', 'photographer', 'filmmaker', 'illustrator', '3d-artist', 'musician', 'writer', 'copywriter'],
  'Technical': ['developer', 'game-developer', 'ux-designer', 'data-analyst', 'translator'],
  'Strategic': ['consultant', 'marketing', 'seo', 'architect', 'social-media'],
  'Service': ['virtual-assistant'],
  'Custom': ['custom'],
};

export function getArchetypesByCategory(category: string): ArchetypeConfig[] {
  const ids = ARCHETYPE_CATEGORIES[category] || [];
  return ids.map((id) => getArchetype(id)).filter(Boolean);
}
