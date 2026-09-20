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
        <div className="hf-panel p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                {title}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {value}
            </p>
            {description && (
                <p className="mt-1 text-xs leading-5 text-slate-500">
                    {description}
                </p>
            )}
        </div>
    );
}
