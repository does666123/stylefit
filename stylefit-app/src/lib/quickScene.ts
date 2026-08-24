import type { UserBodyProfile } from '@/types';

export const QUICK_SCENE_STORAGE_KEY = 'stylefit_quick_scene_context';
const QUICK_SCENE_TTL = 30 * 60 * 1000;

export const QUICK_SCENES = ['work', 'date', 'sport', 'party', 'travel', 'formal'] as const;
export type QuickScene = typeof QUICK_SCENES[number];

export type QuickSceneContext = {
  entryMode: 'quick_scene';
  scene: QuickScene;
  profile: UserBodyProfile;
  createdAt: number;
};

export function saveQuickSceneContext(scene: QuickScene, profile: UserBodyProfile) {
  try {
    sessionStorage.setItem(QUICK_SCENE_STORAGE_KEY, JSON.stringify({
      entryMode: 'quick_scene',
      scene,
      profile,
      createdAt: Date.now(),
    } satisfies QuickSceneContext));
    return true;
  } catch {
    return false;
  }
}

export function readQuickSceneContext(scene: string | null): QuickSceneContext | null {
  if (!scene || !QUICK_SCENES.includes(scene as QuickScene)) return null;

  try {
    const raw = sessionStorage.getItem(QUICK_SCENE_STORAGE_KEY);
    if (!raw) return null;
    const context = JSON.parse(raw) as Partial<QuickSceneContext>;
    if (
      context.entryMode !== 'quick_scene'
      || context.scene !== scene
      || !context.profile
      || typeof context.createdAt !== 'number'
      || Date.now() - context.createdAt > QUICK_SCENE_TTL
    ) {
      sessionStorage.removeItem(QUICK_SCENE_STORAGE_KEY);
      return null;
    }
    return context as QuickSceneContext;
  } catch {
    return null;
  }
}
