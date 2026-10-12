import { Badge, Card, Cell, ErrorNote, PageHeader, Row, Table } from '@/components/ui';
import { roleLabel } from '@/components/ui/labels';
import { SectionError } from '@/components/ui/states';
import { apiFetch } from '@/lib/api';
import { can, getToken, requireUser } from '@/lib/session';
import type { User } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * User management view, for the System Administrator role.
 *
 * The link to this page is hidden from other roles, and the backend refuses them
 * independently, so a role that reaches this URL directly still sees nothing.
 */
export default async function UsersPage() {
  const user = await requireUser();
  const token = await getToken();

  if (!can(user, 'user:manage')) {
    return (
      <SectionError
        error={{
          kind: 'forbidden',
          status: 403,
          message: 'User management is restricted to system administrators.',
        }}
      />
    );
  }

  let users: User[] = [];
  let error: string | null = null;

  try {
    users = await apiFetch<User[]>('/users?limit=100', { cache: 'no-store' }, token);
  } catch {
    error = 'Could not load users. Is the backend running?';
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Users" description="Every platform account and the role it holds." />

      {error ? (
        <ErrorNote>{error}</ErrorNote>
      ) : (
        <Card
          description={
            users.length > 0
              ? `${users.length} ${users.length === 1 ? 'account' : 'accounts'}.`
              : undefined
          }
        >
          <Table
            headers={['Name', 'Email', 'Role', 'Department', 'Status']}
            empty="No users yet."
          >
            {users.map((platformUser) => (
              <Row key={platformUser.id}>
                <Cell>
                  <span className="font-semibold text-ink">{platformUser.full_name}</span>
                </Cell>
                <Cell>
                  <span className="text-ink-muted">{platformUser.email}</span>
                </Cell>
                <Cell>
                  <Badge>{roleLabel(platformUser.role)}</Badge>
                </Cell>
                <Cell>{platformUser.department ?? '-'}</Cell>
                <Cell>
                  <span
                    className={`inline-flex items-center gap-1.5 text-sm font-semibold ${
                      platformUser.is_active ? 'text-ink' : 'text-ink-muted'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${
                        platformUser.is_active ? 'bg-brand' : 'border border-ink-muted'
                      }`}
                    />
                    {platformUser.is_active ? 'Active' : 'Inactive'}
                  </span>
                </Cell>
              </Row>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
