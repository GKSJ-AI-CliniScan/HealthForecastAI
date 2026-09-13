import type { RiskCategory } from '@/types';

interface RiskBadgeProps {
    category: RiskCategory;
}

const styles: Record<RiskCategory, string> = {
    low: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-300',
    medium: 'border-amber-400/20 bg-amber-400/10 text-amber-300',
    high: 'border-red-400/20 bg-red-400/10 text-red-300',
};

export function RiskBadge({ category }: RiskBadgeProps) {
    return (
        <span
            className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${styles[category]}`}
        >
            {category} risk
        </span>
    );
}