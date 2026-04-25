import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Button } from '@/components/ui/Button';
import { SpeakButton } from '@/components/domain/SpeakButton';
import { useAppStore } from '@/store';
import { HEALTH_ARTICLES, type HealthArticle, HEALTH_SLOGANS, pickSloganOfTheDay } from '@/data/articles';

const CATEGORIES: HealthArticle['category'][] = ['科普', '饮食', '运动', '用药', '心理'];

export function Articles() {
  const user = useAppStore((s) => s.user);
  const [active, setActive] = useState<HealthArticle | null>(null);
  const [tab, setTab] = useState<'推荐' | HealthArticle['category']>('推荐');

  const list = useMemo(() => {
    if (tab === '推荐') {
      const myConditions = new Set(user?.conditions ?? []);
      const matched = HEALTH_ARTICLES.filter((a) => a.tags.some((t) => myConditions.has(t)));
      const others = HEALTH_ARTICLES.filter((a) => !matched.includes(a));
      return [...matched, ...others];
    }
    return HEALTH_ARTICLES.filter((a) => a.category === tab);
  }, [tab, user]);

  const slogan = pickSloganOfTheDay();

  return (
    <div className="space-y-6">
      <section className="rounded-xl2 overflow-hidden shadow-soft">
        <div className="bg-hero-yellow p-6 md:p-8">
          <div className="flex items-center gap-3 text-ink-900">
            <span className="text-3xl">💛</span>
            <h2 className="text-xl md:text-2xl font-bold">健康推文</h2>
          </div>
          <p className="text-ink-700 mt-2 text-base md:text-lg font-medium">
            "{slogan}"
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {HEALTH_SLOGANS.slice(0, 4).map((s) => (
              <span key={s} className="bg-white/70 px-3 py-1 rounded-full text-sm text-ink-700">
                {s}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {(['推荐', ...CATEGORIES] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl font-medium whitespace-nowrap transition-colors ${
              tab === t
                ? 'bg-brand-500 text-ink-900 shadow-glow'
                : 'bg-white border border-brand-200 text-ink-700'
            }`}
            style={{ minHeight: 44 }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {list.map((a) => (
          <Card
            key={a.id}
            className="hover:shadow-glow transition-shadow cursor-pointer"
            onClick={() => setActive(a)}
          >
            <div className="flex gap-4">
              <div className="w-16 h-16 rounded-xl bg-brand-100 text-3xl flex items-center justify-center shrink-0">
                {a.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag>{a.category}</Tag>
                  <span className="text-xs text-ink-500">阅读 {a.readMinutes} 分钟</span>
                </div>
                <h3 className="font-semibold text-base md:text-lg mt-2 leading-snug">{a.title}</h3>
                <p className="text-sm text-ink-700 mt-1 line-clamp-2">{a.summary}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Reader modal-like inline */}
      {active && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
          onClick={() => setActive(null)}
        >
          <div
            className="bg-white w-full max-w-2xl max-h-[90vh] overflow-auto rounded-t-3xl md:rounded-xl2 shadow-soft"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-hero-yellow px-6 py-5 flex items-start gap-4">
              <div className="text-4xl">{active.emoji}</div>
              <div className="flex-1">
                <Tag>{active.category}</Tag>
                <h3 className="text-xl font-bold mt-2">{active.title}</h3>
                <p className="text-ink-700 mt-1">{active.summary}</p>
              </div>
            </div>
            <div className="p-6 leading-relaxed text-ink-900 whitespace-pre-wrap">
              {active.content}
            </div>
            <div className="px-6 py-4 border-t border-brand-100 flex justify-between gap-3 sticky bottom-0 bg-white">
              <SpeakButton text={`${active.title}。${active.content}`} label="读给我听" />
              <Button onClick={() => setActive(null)}>关闭</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
