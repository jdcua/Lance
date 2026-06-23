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
import advertiser from './advertiser';
import projectManager from './project-manager';
import accountant from './accountant';
import eventPlanner from './event-planner';
import voiceActor from './voice-actor';
import tutor from './tutor';
import wellness from './wellness';
import legal from './legal';
import fashionDesigner from './fashion-designer';
import devops from './devops';
import cybersecurity from './cybersecurity';
import aiEngineer from './ai-engineer';
import embedded from './embedded';
import blockchain from './blockchain';
import productManager from './product-manager';
import growth from './growth';
import cxStrategist from './cx-strategist';
import recruiter from './recruiter';
import trainer from './trainer';
import nutritionist from './nutritionist';
import realEstate from './real-estate';

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
  advertiser,
  'project-manager': projectManager,
  accountant,
  'event-planner': eventPlanner,
  'voice-actor': voiceActor,
  tutor,
  wellness,
  legal,
  'fashion-designer': fashionDesigner,
  devops,
  cybersecurity,
  'ai-engineer': aiEngineer,
  embedded,
  blockchain,
  'product-manager': productManager,
  growth,
  'cx-strategist': cxStrategist,
  recruiter,
  trainer,
  nutritionist,
  'real-estate': realEstate,
};

export function getArchetype(id: string): ArchetypeConfig {
  return ARCHETYPES[id] || defaultArchetype;
}

export const ARCHETYPE_LIST = Object.values(ARCHETYPES);

export const ARCHETYPE_CATEGORIES: Record<string, string[]> = {
  'Creative': ['animator', 'designer', 'photographer', 'filmmaker', 'illustrator', '3d-artist', 'musician', 'writer', 'copywriter', 'event-planner', 'voice-actor', 'fashion-designer'],
  'Technical': ['developer', 'game-developer', 'ux-designer', 'data-analyst', 'translator', 'devops', 'cybersecurity', 'ai-engineer', 'embedded', 'blockchain'],
  'Strategic': ['consultant', 'marketing', 'seo', 'architect', 'social-media', 'advertiser', 'project-manager', 'product-manager', 'growth', 'cx-strategist'],
  'Service': ['virtual-assistant', 'accountant', 'tutor', 'wellness', 'legal', 'recruiter', 'trainer', 'nutritionist', 'real-estate'],
  'Custom': ['custom'],
};

export function getArchetypesByCategory(category: string): ArchetypeConfig[] {
  const ids = ARCHETYPE_CATEGORIES[category] || [];
  return ids.map((id) => getArchetype(id)).filter(Boolean);
}
