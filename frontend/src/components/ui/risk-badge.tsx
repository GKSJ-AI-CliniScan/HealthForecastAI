
import type { RiskCategory } from '@/types';

interface RiskBadgeProps {
    category: RiskCategory;
}

const styles: Record<
    RiskCategory,
    { container: string; indicator: string; label: string }
> = {
    low: {
        container: 'border-emerald-200 bg-emerald-50 text-emerald-800',
        indicator: 'bg-emerald-500',
        label: 'Low risk',
    },
    medium: {
        container: 'border-amber-200 bg-amber-50 text-amber-800',
        indicator: 'bg-amber-500',
        label: 'Medium risk',
    },
    high: {
        container: 'border-rose-200 bg-rose-50 text-rose-800',
        indicator: 'bg-rose-500',
        label: 'High risk',
    },
};

export function RiskBadge({ category }: RiskBadgeProps) {
    const style = styles[category];

    return (
        <span
            className={[
                'inline-flex items-center gap-2 rounded-full border',
                'px-3 py-1.5 text-xs font-semibold leading-none',
                'tracking-[0.01em]',
                style.container,
            ].join(' ')}
            aria-label={`Risk category: ${style.label}`}
        >
            <span
                className={`h-2 w-2 shrink-0 rounded-full ${style.indicator}`}
                aria-hidden="true"
            />
            {style.label}
        </span>
    );
}
