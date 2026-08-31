import { Badge, Card, Cell, ErrorNote, Row, Table } from '@/components/ui';
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
    return <ErrorNote>User management is restricted to system administrators.</ErrorNote>;
  }

  let users: User[] = [];
  let error: string | null = null;

  try {
    users = await apiFetch<User[]>('/users?limit=100', { cache: 'no-store' }, token);
  } catch {
    error = 'Could not load users. Is the backend running?';
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Users</h1>
        <p className="mt-1 text-sm opacity-70">
          Every platform account and the role it holds.
        </p>
      </div>

      {error ? (
        <ErrorNote>{error}</ErrorNote>
      ) : (
        <Card>
          <Table
            headers={['Name', 'Email', 'Role', 'Department', 'Status']}
            empty="No users yet."
          >
            {users.map((platformUser) => (
              <Row key={platformUser.id}>
                <Cell>{platformUser.full_name}</Cell>
                <Cell>{platformUser.email}</Cell>
                <Cell>
                  <Badge>{platformUser.role}</Badge>
                </Cell>
                <Cell>{platformUser.department ?? '-'}</Cell>
                <Cell>{platformUser.is_active ? 'Active' : 'Inactive'}</Cell>
              </Row>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
