
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
        <section className="hf-panel group relative overflow-hidden p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
            <div
                className="absolute inset-x-0 top-0 h-0.5 bg-slate-200 transition-colors duration-200 group-hover:bg-teal-500"
                aria-hidden="true"
            />

            <div className="flex min-h-[100px] flex-col justify-between">
                <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold leading-5 tracking-wide text-slate-500">
                        {title}
                    </p>

                    <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-200/80 transition-colors duration-200 group-hover:bg-teal-50 group-hover:text-teal-700 group-hover:ring-teal-100"
                        aria-hidden="true"
                    >
                        <svg
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4"
                        >
                            <path
                                d="M4 19V5m0 14h16M8 15v-4m4 4V7m4 8v-6"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                    </span>
                </div>

                <div className="mt-4">
                    <p className="break-words text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                        {value}
                    </p>

                    {description && (
                        <p className="mt-2 text-xs leading-5 text-slate-500">
                            {description}
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
}
