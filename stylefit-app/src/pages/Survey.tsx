import { useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Shirt, ArrowRight, ArrowLeft, Check, Loader2, Sparkles, Ruler, AlertCircle } from 'lucide-react';
import { useT } from '@/i18n';
import type { UserBodyProfile, Gender, BodyType, SkinTone, StylePreference, Occasion, Season } from '../types';
import { getRecommendations, saveProfile } from '../hooks/useRecommendation';
import { requestAIRecommendation } from '../lib/aiRecommendation';
import LoadingScreen from '@/components/LoadingScreen';

const allSteps = ['survey.step.basic', 'survey.step.body', 'survey.step.style'];

interface BodyTypeOption { value: BodyType; labelKey: string; descKey: string }
const bodyTypeOptions: BodyTypeOption[] = [
  { value: 'slim', labelKey: 'survey.body.slim', descKey: 'survey.body.slim.desc' },
  { value: 'standard', labelKey: 'survey.body.standard', descKey: 'survey.body.standard.desc' },
  { value: 'athletic', labelKey: 'survey.body.athletic', descKey: 'survey.body.athletic.desc' },
  { value: 'curvy', labelKey: 'survey.body.curvy', descKey: 'survey.body.curvy.desc' },
  { value: 'plus', labelKey: 'survey.body.plus', descKey: 'survey.body.plus.desc' },
];

interface SkinToneOption { value: SkinTone; labelKey: string; color: string }
const skinToneOptions: SkinToneOption[] = [
  { value: 'fair', labelKey: 'survey.body.skinTone.fair', color: '#F5E6D3' },
  { value: 'light', labelKey: 'survey.body.skinTone.light', color: '#F0D5B8' },
  { value: 'medium', labelKey: 'survey.body.skinTone.medium', color: '#D4A574' },
  { value: 'tan', labelKey: 'survey.body.skinTone.tan', color: '#C4956A' },
  { value: 'dark', labelKey: 'survey.body.skinTone.dark', color: '#8B5A2B' },
];

interface StyleOption { value: StylePreference; labelKey: string; descKey: string }
const styleOptions: StyleOption[] = [
  { value: 'casual', labelKey: 'survey.style.casual', descKey: 'survey.style.casual.desc' },
  { value: 'business', labelKey: 'survey.style.business', descKey: 'survey.style.business.desc' },
  { value: 'streetwear', labelKey: 'survey.style.streetwear', descKey: 'survey.style.streetwear.desc' },
  { value: 'minimal', labelKey: 'survey.style.minimal', descKey: 'survey.style.minimal.desc' },
  { value: 'elegant', labelKey: 'survey.style.elegant', descKey: 'survey.style.elegant.desc' },
  { value: 'sporty', labelKey: 'survey.style.sporty', descKey: 'survey.style.sporty.desc' },
];

interface OccasionOption { value: Occasion; labelKey: string }
const occasionOptions: OccasionOption[] = [
  { value: 'daily', labelKey: 'survey.occasion.daily' },
  { value: 'work', labelKey: 'survey.occasion.work' },
  { value: 'date', labelKey: 'survey.occasion.date' },
  { value: 'party', labelKey: 'survey.occasion.party' },
  { value: 'travel', labelKey: 'survey.occasion.travel' },
  { value: 'formal', labelKey: 'survey.occasion.formal' },
];

interface SeasonOption { value: Season; labelKey: string }
const seasonOptions: SeasonOption[] = [
  { value: 'spring', labelKey: 'survey.season.spring' },
  { value: 'summer', labelKey: 'survey.season.summer' },
  { value: 'autumn', labelKey: 'survey.season.autumn' },
  { value: 'winter', labelKey: 'survey.season.winter' },
];

interface ValidationErrors {
  height?: string;
  weight?: string;
}

export default function Survey() {
  const navigate = useNavigate();
  const { t } = useT();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [submittedProfile, setSubmittedProfile] = useState<UserBodyProfile | null>(null);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const submitInFlight = useRef(false);
  const [profile, setProfile] = useState<Partial<UserBodyProfile>>({
    gender: 'male',
    height: 175,
    weight: 70,
    measurements: {},
  });

  // Progress: 3 survey steps map to first 3 of 4 total steps
  const progress = ((step + 1) / allSteps.length) * 100;

  const update = <K extends keyof UserBodyProfile>(key: K, value: UserBodyProfile[K]) => {
    setProfile((p) => ({ ...p, [key]: value }));
    // Clear related error when user edits
    if (key === 'height') setErrors(e => ({ ...e, height: undefined }));
    if (key === 'weight') setErrors(e => ({ ...e, weight: undefined }));
  };

  const updateMeasurement = (key: keyof UserBodyProfile['measurements'], value: number | undefined) => {
    setProfile((p) => ({
      ...p,
      measurements: { ...p.measurements, [key]: value },
    }));
  };

  const validateStep0 = (): boolean => {
    const newErrors: ValidationErrors = {};
    const h = profile.height;
    const w = profile.weight;

    if (!h || h < 80 || h > 220) {
      newErrors.height = t('survey.error.height');
    }
    if (!w || w < 20 || w > 200) {
      newErrors.weight = t('survey.error.weight');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const canProceed = () => {
    if (step === 0) {
      return (
        profile.gender &&
        profile.height && profile.height >= 80 && profile.height <= 220 &&
        profile.weight && profile.weight >= 20 && profile.weight <= 200
      );
    }
    if (step === 1) {
      return profile.bodyType && profile.skinTone;
    }
    if (step === 2) {
      return profile.stylePreference && profile.occasion && profile.season;
    }
    return false;
  };

  const handleNext = () => {
    if (step === 0) {
      if (!validateStep0()) return;
    }
    setStep(step + 1);
  };

  const generateRecommendation = async (fullProfile: UserBodyProfile) => {
    if (submitInFlight.current) return;
    submitInFlight.current = true;
    setLoading(true);
    const recommendation = await requestAIRecommendation(fullProfile, getRecommendations(fullProfile)).catch(() => null);
    if (recommendation) {
      navigate('/recommendations', { state: { profile: fullProfile, aiRecommendation: recommendation } });
      return;
    }

    setSubmittedProfile(fullProfile);
    setRetryCount((count) => count + 1);
    setLoading(false);
    submitInFlight.current = false;
  };

  const handleSubmit = () => {
    const fullProfile: UserBodyProfile = {
      gender: profile.gender!,
      height: profile.height!,
      weight: profile.weight!,
      bodyType: profile.bodyType!,
      skinTone: profile.skinTone!,
      stylePreference: profile.stylePreference!,
      occasion: profile.occasion!,
      season: profile.season!,
      age: profile.age,
      budget: profile.budget,
      measurements: profile.measurements || {},
    };
    // 持久化到 localStorage，防止刷新后数据丢失
    saveProfile(fullProfile);
    setRetryCount(0);
    generateRecommendation(fullProfile);
  };

  const handleRetry = () => {
    if (submittedProfile) generateRecommendation(submittedProfile);
  };

  if (loading) {
    return <LoadingScreen message="AI 正在生成专属穿搭..." />;
  }

  if (submittedProfile && retryCount > 0) {
    const canUseLocalRecommendation = retryCount >= 1;
    return (
      <div className="phase-two-survey flex min-h-screen items-center justify-center p-4">
        <Card className="survey-failure-card w-full max-w-md">
          <CardContent className="space-y-5 p-8 text-center">
            <AlertCircle className="mx-auto h-10 w-10 text-amber-500" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">AI 推荐暂时没有生成成功</h1>
              <p className="mt-2 text-sm text-slate-500">请稍后重试，已填写的问卷信息会保留。</p>
            </div>
            <Button className="sf-primary-button w-full" onClick={handleRetry}>
              重试生成
            </Button>
            {canUseLocalRecommendation && (
              <>
                <Button className="sf-secondary-button w-full" variant="outline" onClick={() => navigate('/recommendations', { state: { profile: submittedProfile } })}>
                  进入本地推荐
                </Button>
                <p className="text-xs leading-5 text-slate-400">AI 推荐更个性化，需要联网生成；本地推荐立即可用，但个性化程度较低。</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="phase-two-survey min-h-screen">
      <nav className="survey-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <button className="focus-ring flex items-center gap-2 rounded-lg" onClick={() => navigate('/')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#1B1E26]">
              <Shirt className="h-4 w-4 text-[#F7F4EE]" />
            </div>
            <span className="text-xl font-bold text-[#F7F4EE]">StyleFit</span>
          </button>
          <div className="text-right">
            <div className="text-sm text-[#D7C39D]">{t('survey.stepIndicator', { step: step + 1, total: allSteps.length })}</div>
            <div className="mt-0.5 text-xs text-[#AAA49B]">{t(allSteps[step] as any)}</div>
          </div>
        </div>
      </nav>

      <div className="mx-auto max-w-xl px-4 py-7 sm:py-10">
        {/* Step Progress Indicator */}
        <div className="mb-6">
          <Progress value={progress} className="survey-progress mb-4" />
          <div className="flex justify-between">
            {allSteps.map((label, idx) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    idx < step
                      ? 'survey-step-done'
                      : idx === step
                      ? 'survey-step-current'
                      : 'survey-step-pending'
                  }`}
                >
                  {idx < step ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-medium transition-colors ${
                    idx <= step ? 'text-[#D7C39D]' : 'text-[#77756F]'
                  }`}
                >
                  {t(label as any)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Card className="survey-card">
          <CardContent className="p-6 sm:p-8">
            <div key={step} className="phase-two-step-content">
            {/* Step 0: Basic Info */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold text-slate-900">{t('survey.basic.title')}</h2>
                  <p className="text-sm text-slate-500">{t('survey.basic.desc')}</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">{t('survey.basic.gender')}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'male', labelKey: 'common.male' },
                        { value: 'female', labelKey: 'common.female' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => update('gender', opt.value as Gender)}
                          className={`survey-option rounded-xl border-2 px-4 py-3 text-center font-medium transition-all ${
                            profile.gender === opt.value
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {t(opt.labelKey as any)}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="height" className="mb-2 block">{t('survey.basic.height')}</Label>
                      <Input
                        id="height"
                        type="number"
                        value={profile.height || ''}
                        onChange={(e) => update('height', Number(e.target.value))}
                        placeholder={t('survey.placeholder.height')}
                        className={`h-12 ${errors.height ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                        min={80}
                        max={220}
                      />
                      {errors.height && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle className="h-3 w-3" />
                          {errors.height}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="weight" className="mb-2 block">{t('survey.basic.weight')}</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={profile.weight || ''}
                        onChange={(e) => update('weight', Number(e.target.value))}
                        placeholder={t('survey.placeholder.weight')}
                        className={`h-12 ${errors.weight ? 'border-red-400 ring-1 ring-red-400' : ''}`}
                        min={20}
                        max={200}
                      />
                      {errors.weight && (
                        <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                          <AlertCircle className="h-3 w-3" />
                          {errors.weight}
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="age" className="mb-2 block">
                      {t('survey.basic.age')}
                      <span className="ml-1 text-xs font-normal text-slate-400">{t('survey.basic.age.optional')}</span>
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      value={profile.age || ''}
                      onChange={(e) => update('age', Number(e.target.value))}
                      placeholder="25"
                      className="h-12"
                    />
                    <p className="mt-1 text-xs text-slate-400">{t('survey.basic.age.hint')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Body Analysis */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold text-slate-900">{t('survey.body.title')}</h2>
                  <p className="text-sm text-slate-500">{t('survey.body.desc')}</p>
                </div>

                <div className="space-y-5">
                  {/* Body Type */}
                  <div>
                    <Label className="mb-3 block">{t('survey.body.type')}</Label>
                    <div className="space-y-2">
                      {bodyTypeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => update('bodyType', opt.value)}
                          className={`survey-option flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                            profile.bodyType === opt.value
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-semibold">{t(opt.labelKey as any)}</div>
                            <div className={`text-xs ${profile.bodyType === opt.value ? 'text-slate-300' : 'text-slate-400'}`}>{t(opt.descKey as any)}</div>
                          </div>
                          {profile.bodyType === opt.value && <Check className="h-5 w-5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skin Tone */}
                  <div>
                    <Label className="mb-3 block">{t('survey.body.skinTone')}</Label>
                    <p className="mb-2 text-xs text-slate-400">{t('survey.body.skinTone.hint')}</p>
                    <div className="grid grid-cols-5 gap-2">
                      {skinToneOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => update('skinTone', opt.value)}
                          aria-pressed={profile.skinTone === opt.value}
                          className={`survey-option relative flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                            profile.skinTone === opt.value ? 'survey-option-selected' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="h-10 w-10 rounded-full border border-slate-200" style={{ backgroundColor: opt.color }} />
                          <span className="text-xs font-medium text-slate-600">{t(opt.labelKey as any)}</span>
                          {profile.skinTone === opt.value && <Check className="absolute right-2 top-2 h-4 w-4 text-[#d7c39d]" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Measurements - optional */}
                  <div>
                    <Label className="mb-3 flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-slate-400" />
                      {t('survey.body.measurements')}
                      <span className="text-xs font-normal text-slate-400">{t('survey.body.measurements.optional')}</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="mb-1 block text-xs text-slate-500">{t('survey.body.shoulder')}</Label>
                        <Input
                          type="number"
                          value={profile.measurements?.shoulderWidth || ''}
                          onChange={(e) => updateMeasurement('shoulderWidth', e.target.value ? Number(e.target.value) : undefined)}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-slate-500">{t('survey.body.waist')}</Label>
                        <Input
                          type="number"
                          value={profile.measurements?.waist || ''}
                          onChange={(e) => updateMeasurement('waist', e.target.value ? Number(e.target.value) : undefined)}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-slate-500">{t('survey.body.hip')}</Label>
                        <Input
                          type="number"
                          value={profile.measurements?.hip || ''}
                          onChange={(e) => updateMeasurement('hip', e.target.value ? Number(e.target.value) : undefined)}
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-slate-500">{t('survey.body.leg')}</Label>
                        <Input
                          type="number"
                          value={profile.measurements?.legLength || ''}
                          onChange={(e) => updateMeasurement('legLength', e.target.value ? Number(e.target.value) : undefined)}
                          className="h-10"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">{t('survey.body.leg.hint')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Style Preferences */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold text-slate-900">{t('survey.style.title')}</h2>
                  <p className="text-sm text-slate-500">{t('survey.style.desc')}</p>
                </div>
                <div className="space-y-5">
                  <div>
                    <Label className="mb-3 block">{t('survey.style.label')}</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {styleOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => update('stylePreference', opt.value)}
                          className={`survey-option rounded-xl border-2 px-3 py-3 text-center transition-all ${
                            profile.stylePreference === opt.value
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-sm font-semibold">{t(opt.labelKey as any)}</div>
                          <div className={`mt-0.5 text-xs ${profile.stylePreference === opt.value ? 'text-slate-300' : 'text-slate-400'}`}>{t(opt.descKey as any)}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">{t('survey.occasion.label')}</Label>
                    <Select value={profile.occasion} onValueChange={(v) => update('occasion', v as Occasion)}>
                      <SelectTrigger className="h-12"><SelectValue placeholder={t('survey.occasion.placeholder')} /></SelectTrigger>
                      <SelectContent>
                        {occasionOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey as any)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-slate-400">{t('survey.occasion.hint')}</p>
                  </div>
                  <div>
                    <Label className="mb-2 block">{t('survey.season.label')}</Label>
                    <Select value={profile.season} onValueChange={(v) => update('season', v as Season)}>
                      <SelectTrigger className="h-12"><SelectValue placeholder={t('survey.season.placeholder')} /></SelectTrigger>
                      <SelectContent>
                        {seasonOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{t(opt.labelKey as any)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-slate-400">{t('survey.season.hint')}</p>
                  </div>
                  <div>
                    <Label htmlFor="budget" className="mb-2 block">
                      {t('survey.budget.label')}
                      <span className="ml-1 text-xs font-normal text-slate-400">{t('survey.budget.optional')}</span>
                    </Label>
                    <Input
                      id="budget"
                      type="number"
                      value={profile.budget || ''}
                      onChange={(e) => update('budget', e.target.value ? Number(e.target.value) : undefined)}
                      placeholder={t('survey.budget.placeholder')}
                      className="h-12"
                      min={50}
                      max={10000}
                    />
                    <p className="mt-1 text-xs text-slate-400">{t('survey.budget.hint')}</p>
                  </div>
                </div>
              </div>
            )}

            </div>

            {/* Navigation */}
            <div className="mt-8 flex gap-3">
              {step > 0 && (
                <Button variant="outline" className="sf-secondary-button h-12 flex-1" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />{t('survey.btn.prev')}
                </Button>
              )}
              {step < 2 ? (
                <Button className="sf-primary-button h-12 flex-1" disabled={!canProceed()} onClick={handleNext}>
                  {t('survey.btn.next')}<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button className="sf-primary-button h-12 flex-1" disabled={!canProceed() || loading} onClick={handleSubmit}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('survey.btn.generating')}</>
                  ) : (
                    <>{t('survey.btn.submit')}<Sparkles className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
