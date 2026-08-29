const patients = [
  {
    id: "P001",
    name: "Ananya Sharma",
    age: 45,
    status: "Active",
  },
  {
    id: "P002",
    name: "Rahul Kumar",
    age: 62,
    status: "High Risk",
  },
  {
    id: "P003",
    name: "Priya Reddy",
    age: 51,
    status: "Active",
  },
  {
    id: "P004",
    name: "Arjun Rao",
    age: 69,
    status: "Monitoring",
  },
];

const navigation = [
  "Dashboard",
  "Patients",
  "Medical History",
  "Treatments",
  "Admissions",
  "Analytics",
  "Reports",
];

export default function DoctorPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Top navigation */}
      <header className="flex h-16 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6">
        <div>
          <h1 className="text-lg font-bold">HealthForecast AI</h1>
          <p className="text-xs text-slate-500">
            Predictive Healthcare Intelligence
          </p>
        </div>

        <div className="flex items-center gap-4">
          <button className="text-slate-500 hover:text-slate-900">
            🔔
          </button>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 font-semibold">
              D
            </div>
            <div>
              <p className="text-sm font-medium">Doctor</p>
              <p className="text-xs text-slate-500">Healthcare Team</p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden min-h-[calc(100vh-4rem)] w-64 border-r border-[var(--border)] bg-[var(--surface)] p-4 md:block">
          <div className="mb-6">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Main Menu
            </p>
          </div>

          <nav className="space-y-1">
            {navigation.map((item, index) => (
              <a
                key={item}
                href="#"
                className={`block rounded-lg px-3 py-2.5 text-sm font-medium ${
                  index === 0
                    ? "bg-slate-900 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {item}
              </a>
            ))}
          </nav>

          <div className="mt-8 border-t border-[var(--border)] pt-6">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              System
            </p>

            <a
              href="#"
              className="mt-2 block rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Settings
            </a>
          </div>
        </aside>

        {/* Main content */}
        <section className="flex-1 p-6 md:p-8">
          {/* Page heading */}
          <div className="mb-8">
            <p className="text-sm font-medium text-slate-500">
              Healthcare Dashboard
            </p>

            <h2 className="mt-1 text-2xl font-bold tracking-tight">
              Welcome back, Doctor
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Monitor patient health, risks, treatments and admissions.
            </p>
          </div>

          {/* Statistics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-sm text-slate-500">Total Patients</p>
              <p className="mt-2 text-3xl font-bold">120</p>
              <p className="mt-1 text-xs text-slate-500">
                Patients under care
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-sm text-slate-500">High Risk Patients</p>
              <p className="mt-2 text-3xl font-bold">18</p>
              <p className="mt-1 text-xs text-slate-500">
                Require attention
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-sm text-slate-500">Readmissions</p>
              <p className="mt-2 text-3xl font-bold">12</p>
              <p className="mt-1 text-xs text-slate-500">
                Recent readmissions
              </p>
            </div>

            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <p className="text-sm text-slate-500">Active Treatments</p>
              <p className="mt-2 text-3xl font-bold">34</p>
              <p className="mt-1 text-xs text-slate-500">
                Currently monitored
              </p>
            </div>
          </div>

          {/* Patient section */}
          <div className="mt-8 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] p-5">
              <div>
                <h3 className="font-semibold">Recent Patients</h3>
                <p className="mt-1 text-sm text-slate-500">
                  Recently accessed patient records
                </p>
              </div>

              <button className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium hover:bg-slate-100">
                View All
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-5 py-4">Patient ID</th>
                    <th className="px-5 py-4">Name</th>
                    <th className="px-5 py-4">Age</th>
                    <th className="px-5 py-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 font-medium">{patient.id}</td>

                      <td className="px-5 py-4">{patient.name}</td>

                      <td className="px-5 py-4">{patient.age}</td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium ${
                            patient.status === "High Risk"
                              ? "bg-red-100 text-red-700"
                              : patient.status === "Monitoring"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {patient.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick actions */}
          <div className="mt-8">
            <h3 className="mb-4 font-semibold">Quick Actions</h3>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <button className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left hover:bg-slate-50">
                <p className="font-medium">Add Patient</p>
                <p className="mt-1 text-sm text-slate-500">
                  Create a patient record
                </p>
              </button>

              <button className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left hover:bg-slate-50">
                <p className="font-medium">Patient Search</p>
                <p className="mt-1 text-sm text-slate-500">
                  Find patient records
                </p>
              </button>

              <button className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left hover:bg-slate-50">
                <p className="font-medium">View Admissions</p>
                <p className="mt-1 text-sm text-slate-500">
                  Review admission history
                </p>
              </button>

              <button className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-left hover:bg-slate-50">
                <p className="font-medium">Analytics</p>
                <p className="mt-1 text-sm text-slate-500">
                  View healthcare analytics
                </p>
              </button>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}