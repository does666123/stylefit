import { useState } from 'react';
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
import type { UserBodyProfile, Gender, BodyType, SkinTone, StylePreference, Occasion, Season } from '../types';
import { saveProfile } from '../hooks/useRecommendation';

const allSteps = ['基础信息', '身材分析', '风格偏好', '推荐结果'];

const bodyTypeOptions: { value: BodyType; label: string; desc: string }[] = [
  { value: 'slim', label: '偏瘦', desc: '肩窄腰细，整体偏纤细' },
  { value: 'standard', label: '标准', desc: '比例匀称，不胖不瘦' },
  { value: 'athletic', label: '运动型', desc: '肩宽腰细，肌肉线条明显' },
  { value: 'curvy', label: '曲线型', desc: '腰臀比例明显，有曲线美' },
  { value: 'plus', label: '丰腴型', desc: '骨架较大或整体偏丰满' },
];

const skinToneOptions: { value: SkinTone; label: string; color: string }[] = [
  { value: 'fair', label: '白皙', color: '#F5E6D3' },
  { value: 'light', label: '偏白', color: '#F0D5B8' },
  { value: 'medium', label: '自然', color: '#D4A574' },
  { value: 'tan', label: '偏黄', color: '#C4956A' },
  { value: 'dark', label: '深色', color: '#8B5A2B' },
];

const styleOptions: { value: StylePreference; label: string; desc: string }[] = [
  { value: 'casual', label: '休闲风', desc: '舒适自在，日常首选' },
  { value: 'business', label: '商务风', desc: '干练专业，职场必备' },
  { value: 'streetwear', label: '街头风', desc: '潮流个性，态度表达' },
  { value: 'minimal', label: '简约风', desc: 'less is more，高级质感' },
  { value: 'elegant', label: '优雅风', desc: '精致气质，约会首选' },
  { value: 'sporty', label: '运动风', desc: '活力动感，健康阳光' },
];

const occasionOptions: { value: Occasion; label: string }[] = [
  { value: 'daily', label: '日常通勤' },
  { value: 'work', label: '职场商务' },
  { value: 'date', label: '约会聚会' },
  { value: 'party', label: '派对活动' },
  { value: 'travel', label: '旅行出游' },
  { value: 'formal', label: '正式场合' },
];

const seasonOptions: { value: Season; label: string }[] = [
  { value: 'spring', label: '春季' },
  { value: 'summer', label: '夏季' },
  { value: 'autumn', label: '秋季' },
  { value: 'winter', label: '冬季' },
];

interface ValidationErrors {
  height?: string;
  weight?: string;
}

export default function Survey() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
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
      newErrors.height = '身高需在 80-220cm 之间';
    }
    if (!w || w < 20 || w > 200) {
      newErrors.weight = '体重需在 20-200kg 之间';
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

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1500));
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
      measurements: profile.measurements || {},
    };
    // 持久化到 localStorage，防止刷新后数据丢失
    saveProfile(fullProfile);
    navigate('/recommendations', { state: { profile: fullProfile } });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <div className="flex cursor-pointer items-center gap-2" onClick={() => navigate('/')}>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
              <Shirt className="h-4 w-4 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">StyleFit</span>
          </div>
          <div className="text-sm text-slate-400">步骤 {step + 1} / {allSteps.length}</div>
        </div>
      </nav>

      <div className="mx-auto max-w-xl px-4 py-8 page-enter">
        {/* Step Progress Indicator */}
        <div className="mb-6">
          <Progress value={progress} className="mb-4" />
          <div className="flex justify-between">
            {allSteps.map((label, idx) => (
              <div key={label} className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                    idx < step
                      ? 'bg-slate-900 text-white'
                      : idx === step
                      ? 'bg-slate-900 text-white ring-4 ring-slate-200'
                      : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {idx < step ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span
                  className={`text-xs font-medium transition-colors ${
                    idx <= step ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <Card className="border-0 shadow-lg animate-fade-in-up">
          <CardContent className="p-6 sm:p-8">
            {/* Step 0: Basic Info */}
            {step === 0 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold text-slate-900">基础信息</h2>
                  <p className="text-sm text-slate-500">让我们先了解你的基本身体数据</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="mb-2 block">性别</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { value: 'male', label: '男士' },
                        { value: 'female', label: '女士' },
                      ].map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => update('gender', opt.value as Gender)}
                          className={`rounded-xl border-2 px-4 py-3 text-center font-medium transition-all ${
                            profile.gender === opt.value
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="height" className="mb-2 block">身高 (cm)</Label>
                      <Input
                        id="height"
                        type="number"
                        value={profile.height || ''}
                        onChange={(e) => update('height', Number(e.target.value))}
                        placeholder="175（范围 80-220）"
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
                      <Label htmlFor="weight" className="mb-2 block">体重 (kg)</Label>
                      <Input
                        id="weight"
                        type="number"
                        value={profile.weight || ''}
                        onChange={(e) => update('weight', Number(e.target.value))}
                        placeholder="70（范围 20-200）"
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
                      年龄
                      <span className="ml-1 text-xs font-normal text-slate-400">（可选）</span>
                    </Label>
                    <Input
                      id="age"
                      type="number"
                      value={profile.age || ''}
                      onChange={(e) => update('age', Number(e.target.value))}
                      placeholder="25"
                      className="h-12"
                    />
                    <p className="mt-1 text-xs text-slate-400">填写年龄可进一步优化推荐</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 1: Body Analysis */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold text-slate-900">身材分析</h2>
                  <p className="text-sm text-slate-500">更详细的身体数据让推荐更精准</p>
                </div>

                <div className="space-y-5">
                  {/* Body Type */}
                  <div>
                    <Label className="mb-3 block">体型类型</Label>
                    <div className="space-y-2">
                      {bodyTypeOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => update('bodyType', opt.value)}
                          className={`flex w-full items-center gap-4 rounded-xl border-2 px-4 py-3 text-left transition-all ${
                            profile.bodyType === opt.value
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="font-semibold">{opt.label}</div>
                            <div className={`text-xs ${profile.bodyType === opt.value ? 'text-slate-300' : 'text-slate-400'}`}>{opt.desc}</div>
                          </div>
                          {profile.bodyType === opt.value && <Check className="h-5 w-5 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skin Tone */}
                  <div>
                    <Label className="mb-3 block">肤色</Label>
                    <p className="mb-2 text-xs text-slate-400">选择最接近你手腕内侧肤色的选项</p>
                    <div className="grid grid-cols-5 gap-2">
                      {skinToneOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => update('skinTone', opt.value)}
                          className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all ${
                            profile.skinTone === opt.value ? 'border-slate-900' : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="h-10 w-10 rounded-full border border-slate-200" style={{ backgroundColor: opt.color }} />
                          <span className="text-xs font-medium text-slate-600">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Measurements - optional */}
                  <div>
                    <Label className="mb-3 flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-slate-400" />
                      详细尺寸
                      <span className="text-xs font-normal text-slate-400">（可选，推荐填写）</span>
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="mb-1 block text-xs text-slate-500">肩宽 (cm)</Label>
                        <Input
                          type="number"
                          value={profile.measurements?.shoulderWidth || ''}
                          onChange={(e) => updateMeasurement('shoulderWidth', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="42"
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-slate-500">腰围 (cm)</Label>
                        <Input
                          type="number"
                          value={profile.measurements?.waist || ''}
                          onChange={(e) => updateMeasurement('waist', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="75"
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-slate-500">臀围 (cm)</Label>
                        <Input
                          type="number"
                          value={profile.measurements?.hip || ''}
                          onChange={(e) => updateMeasurement('hip', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="90"
                          className="h-10"
                        />
                      </div>
                      <div>
                        <Label className="mb-1 block text-xs text-slate-500">腿长/内缝 (cm)</Label>
                        <Input
                          type="number"
                          value={profile.measurements?.legLength || ''}
                          onChange={(e) => updateMeasurement('legLength', e.target.value ? Number(e.target.value) : undefined)}
                          placeholder="80"
                          className="h-10"
                        />
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-slate-400">腿长测量方法：从裆部垂直量到脚踝骨</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Style Preferences */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold text-slate-900">风格偏好</h2>
                  <p className="text-sm text-slate-500">选择你喜欢的风格和穿着场景</p>
                </div>
                <div className="space-y-5">
                  <div>
                    <Label className="mb-3 block">偏好风格</Label>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {styleOptions.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => update('stylePreference', opt.value)}
                          className={`rounded-xl border-2 px-3 py-3 text-center transition-all ${
                            profile.stylePreference === opt.value
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          <div className="text-sm font-semibold">{opt.label}</div>
                          <div className={`mt-0.5 text-xs ${profile.stylePreference === opt.value ? 'text-slate-300' : 'text-slate-400'}`}>{opt.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <Label className="mb-2 block">穿着场合</Label>
                    <Select value={profile.occasion} onValueChange={(v) => update('occasion', v as Occasion)}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="选择主要穿着场合" /></SelectTrigger>
                      <SelectContent>
                        {occasionOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-slate-400">我们会优先推荐适合该场合的搭配</p>
                  </div>
                  <div>
                    <Label className="mb-2 block">当前季节</Label>
                    <Select value={profile.season} onValueChange={(v) => update('season', v as Season)}>
                      <SelectTrigger className="h-12"><SelectValue placeholder="选择当前季节" /></SelectTrigger>
                      <SelectContent>
                        {seasonOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="mt-1 text-xs text-slate-400">推荐将基于当季适穿的单品</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex gap-3">
              {step > 0 && (
                <Button variant="outline" className="h-12 flex-1" onClick={() => setStep(step - 1)}>
                  <ArrowLeft className="mr-2 h-4 w-4" />上一步
                </Button>
              )}
              {step < 2 ? (
                <Button className="h-12 flex-1 bg-slate-900 hover:bg-slate-800" disabled={!canProceed()} onClick={handleNext}>
                  下一步<ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button className="h-12 flex-1 bg-slate-900 hover:bg-slate-800" disabled={!canProceed() || loading} onClick={handleSubmit}>
                  {loading ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />AI 分析中...</>
                  ) : (
                    <><>获取推荐</><Sparkles className="ml-2 h-4 w-4" /></>
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
