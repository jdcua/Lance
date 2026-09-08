import { getArchetype } from '../archetypes';

/**
 * Tour coach voice engine.
 *
 * The coach knows how each archetype thinks (derived from the archetype
 * config's psychProfile, greeting, sidebar order and quick actions) and
 * speaks accordingly: tempo (terse, respects time), relationship (warm,
 * people-first), craft (respects the work), proof (evidence-led) or
 * pressure (calm, de-pressuring). Ambiguous archetypes get a 10-second
 * "what drives you" question during setup whose answer blends two voices.
 *
 * psychProfile text is an internal design doc: the engine reads its spirit
 * through the family map below and never quotes it at the user.
 */

export type VoiceFamily =
  | 'tempo'
  | 'relationship'
  | 'craft'
  | 'proof'
  | 'pressure'
  | 'neutral';

export type VoiceTempo = 'terse' | 'warm' | 'steady';

export const FAMILY_TEMPO: Record<VoiceFamily, VoiceTempo> = {
  tempo: 'terse',
  relationship: 'warm',
  craft: 'steady',
  proof: 'terse',
  pressure: 'warm',
  neutral: 'steady',
};

/** Base voice family per archetype. Covers every ArchetypeId. */
export const ARCHETYPE_VOICE: Record<string, VoiceFamily> = {
  // Tempo: speed, no waste, sacred timelines.
  developer: 'tempo',
  translator: 'tempo',
  'game-developer': 'tempo',
  recruiter: 'tempo',
  'virtual-assistant': 'tempo',
  'project-manager': 'tempo',
  'event-planner': 'tempo',
  devops: 'tempo',
  embedded: 'tempo',
  'product-manager': 'tempo',
  'social-media': 'tempo',
  // Relationship: people, retention, trust.
  consultant: 'relationship',
  nutritionist: 'relationship',
  wellness: 'relationship',
  tutor: 'relationship',
  trainer: 'relationship',
  'real-estate': 'relationship',
  // Craft: style, rounds, the work itself.
  designer: 'craft',
  illustrator: 'craft',
  photographer: 'craft',
  filmmaker: 'craft',
  animator: 'craft',
  'fashion-designer': 'craft',
  'voice-actor': 'craft',
  musician: 'craft',
  '3d-artist': 'craft',
  'ux-designer': 'craft',
  architect: 'craft',
  // Proof: numbers, ROI, reporting, accuracy.
  marketing: 'proof',
  advertiser: 'proof',
  seo: 'proof',
  growth: 'proof',
  'cx-strategist': 'proof',
  'data-analyst': 'proof',
  accountant: 'proof',
  'ai-engineer': 'proof',
  cybersecurity: 'proof',
  blockchain: 'proof',
  copywriter: 'proof',
  // Pressure: deadlines, anxiety. Coach is calm, never barking.
  writer: 'pressure',
  legal: 'pressure',
  // Fallback clarity.
  default: 'neutral',
  custom: 'neutral',
};

export interface DriveAxis {
  /** Archetype ids that get this question. */
  archetypes: string[];
  question: string;
  /** Low end (-1), middle (0, blended), high end (+1). */
  low: string;
  mid: string;
  high: string;
  lowFamily: VoiceFamily;
  highFamily: VoiceFamily;
}

export const DRIVE_AXES: Record<string, DriveAxis> = {
  deals: {
    archetypes: ['recruiter', 'real-estate'],
    question: 'What drives you more?',
    low: 'Closing deals',
    mid: 'A mix of both',
    high: 'Building relationships',
    lowFamily: 'tempo',
    highFamily: 'relationship',
  },
  feel: {
    archetypes: ['musician', 'voice-actor'],
    question: 'What matters more in your work?',
    low: 'Nailing the craft',
    mid: 'A mix of both',
    high: 'How it makes people feel',
    lowFamily: 'craft',
    highFamily: 'relationship',
  },
};

/** Returns the drive axis id for an archetype, or null when its voice is unambiguous. */
export function driveAxisFor(profession: string): string | null {
  for (const [id, axis] of Object.entries(DRIVE_AXES)) {
    if (axis.archetypes.includes(profession)) return id;
  }
  return null;
}

export interface DriveSetting {
  archetype: string;
  axis: string;
  /** -1 = low end, 0 = blended mix, +1 = high end. */
  value: -1 | 0 | 1;
}

const DRIVE_KEY = 'lance:drive';

export function loadDrive(): DriveSetting | null {
  try {
    const raw = localStorage.getItem(DRIVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DriveSetting;
    if (!parsed || typeof parsed.archetype !== 'string') return null;
    if (parsed.value !== -1 && parsed.value !== 0 && parsed.value !== 1) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDrive(setting: DriveSetting): void {
  try {
    localStorage.setItem(DRIVE_KEY, JSON.stringify(setting));
  } catch {
    /* private mode etc. */
  }
}

export interface ResolvedVoice {
  /** Ordered families to draw lines from. Single entry = pure voice. */
  families: VoiceFamily[];
  tempo: VoiceTempo;
}

/**
 * Resolve the coach voice for a user. A matching drive answer blends or
 * overrides the base family; stale answers (different archetype) are ignored.
 */
export function resolveVoice(profession: string, drive: DriveSetting | null = null): ResolvedVoice {
  const base: VoiceFamily = ARCHETYPE_VOICE[profession] || 'neutral';
  if (drive && drive.archetype === profession) {
    const axis = DRIVE_AXES[drive.axis];
    if (axis) {
      if (drive.value === 0) {
        const families = [axis.lowFamily, axis.highFamily].includes(base)
          ? [base, axis.lowFamily === base ? axis.highFamily : axis.lowFamily]
          : [axis.lowFamily, axis.highFamily];
        return { families, tempo: 'steady' };
      }
      const family = drive.value === -1 ? axis.lowFamily : axis.highFamily;
      return { families: [family], tempo: FAMILY_TEMPO[family] };
    }
  }
  return { families: [base], tempo: FAMILY_TEMPO[base] };
}

export interface TourStop {
  id: string;
  label: string;
  path: string;
}

export interface QuickAction {
  label: string;
  action: string;
}

export interface TourPlan {
  greeting: string;
  subgreeting: string;
  /** Hands-on curriculum: the user's own quick actions, in order. */
  actions: QuickAction[];
  /** Spotlight route: their archetype's top sections. */
  stops: TourStop[];
  voice: ResolvedVoice;
}

/** Build the personalized tour plan: greeting, curriculum, route, voice. */
export function getTourPlan(profession: string, drive: DriveSetting | null = null): TourPlan {
  const config = getArchetype(profession || 'default');
  return {
    greeting: config.dashboard.greeting,
    subgreeting: config.dashboard.subgreeting,
    actions: (config.dashboard.quickActions || []).map((q) => ({
      label: q.label,
      action: q.action,
    })),
    stops: (config.sidebar || []).slice(0, 3).map((s) => ({
      id: s.id,
      label: s.label,
      path: s.path,
    })),
    voice: resolveVoice(profession, drive),
  };
}
