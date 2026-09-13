interface StatCardProps {
    title: string;
    value: string | number;
    description?: string;
}

export function StatCard({
    title,
    value,
    description,
}: StatCardProps) {
    return (
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
            <p className="text-sm font-medium text-slate-500">{title}</p>

            <p className="mt-2 text-3xl font-black tracking-tight text-white">
                {value}
            </p>

            {description && (
                <p className="mt-1 text-xs text-slate-500">{description}</p>
            )}
        </div>
    );
}