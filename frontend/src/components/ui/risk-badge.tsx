import type { RiskCategory } from '@/types';

interface RiskBadgeProps {
    category: RiskCategory;
}

const styles: Record<RiskCategory, string> = {
    low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    medium: 'border-amber-200 bg-amber-50 text-amber-700',
    high: 'border-red-200 bg-red-50 text-red-700',
};

export function RiskBadge({ category }: RiskBadgeProps) {
    return (
        <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles[category]}`}
        >
            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
            {category} risk
        </span>
    );
}
