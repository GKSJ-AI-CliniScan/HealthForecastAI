"use client";

import { useState } from "react";

import {
  Search,
  Plus,
  Edit3,
  UserCheck,
  UserX,
  Users,
  ShieldCheck,
  Stethoscope,
  FlaskConical,
  Building2,
  X,
} from "lucide-react";

import "./users.css";


type UserRole =
  | "Doctor"
  | "Hospital Admin"
  | "Researcher"
  | "System Admin";


type User = {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: "Active" | "Inactive";
  lastLogin: string;
};


const initialUsers: User[] = [
  {
    id: 1,
    name: "Dr. Ananya Sharma",
    email: "ananya.sharma@healthforecast.ai",
    role: "Doctor",
    department: "Cardiology",
    status: "Active",
    lastLogin: "Today, 10:42 AM",
  },
  {
    id: 2,
    name: "Hospital Admin",
    email: "admin@cityhospital.com",
    role: "Hospital Admin",
    department: "Administration",
    status: "Active",
    lastLogin: "Today, 10:21 AM",
  },
  {
    id: 3,
    name: "Priya Reddy",
    email: "priya.reddy@healthforecast.ai",
    role: "Researcher",
    department: "Clinical Research",
    status: "Active",
    lastLogin: "Today, 09:54 AM",
  },
  {
    id: 4,
    name: "System Administrator",
    email: "sysadmin@healthforecast.ai",
    role: "System Admin",
    department: "System Administration",
    status: "Active",
    lastLogin: "Today, 09:31 AM",
  },
  {
    id: 5,
    name: "Dr. Rahul Kumar",
    email: "rahul.kumar@healthforecast.ai",
    role: "Doctor",
    department: "General Medicine",
    status: "Active",
    lastLogin: "Yesterday, 04:15 PM",
  },
  {
    id: 6,
    name: "Kavya Reddy",
    email: "kavya.reddy@healthforecast.ai",
    role: "Researcher",
    department: "Population Health",
    status: "Inactive",
    lastLogin: "Sep 28, 2026",
  },
];


export default function UsersPage() {

  const [users, setUsers] = useState(initialUsers);

  const [search, setSearch] = useState("");

  const [roleFilter, setRoleFilter] = useState("All Roles");

  const [showModal, setShowModal] = useState(false);

  const [editingUser, setEditingUser] =
    useState<User | null>(null);


  const filteredUsers = users.filter((user) => {

    const matchesSearch =
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === "All Roles" ||
      user.role === roleFilter;

    return matchesSearch && matchesRole;
  });


  const activeUsers =
    users.filter((user) => user.status === "Active").length;

  const inactiveUsers =
    users.filter((user) => user.status === "Inactive").length;


  const openAddUser = () => {
    setEditingUser(null);
    setShowModal(true);
  };


  const openEditUser = (user: User) => {
    setEditingUser(user);
    setShowModal(true);
  };


  const toggleUserStatus = (id: number) => {

    setUsers((currentUsers) =>
      currentUsers.map((user) =>
        user.id === id
          ? {
              ...user,
              status:
                user.status === "Active"
                  ? "Inactive"
                  : "Active",
            }
          : user
      )
    );
  };


  const getRoleIcon = (role: UserRole) => {

    if (role === "Doctor") {
      return <Stethoscope size={16} />;
    }

    if (role === "Hospital Admin") {
      return <Building2 size={16} />;
    }

    if (role === "Researcher") {
      return <FlaskConical size={16} />;
    }

    return <ShieldCheck size={16} />;
  };


  const getInitials = (name: string) => {

    const words = name.split(" ");

    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }

    return (
      words[0][0] +
      words[words.length - 1][0]
    ).toUpperCase();
  };


  return (
    <div className="users-page">

      {/* PAGE HEADER */}

      <div className="users-page-header">

        <div>
          <p className="users-eyebrow">
            SYSTEM ADMINISTRATION
          </p>

          <h1>
            Users & Roles
          </h1>

          <p className="users-description">
            Manage platform users and their access roles.
          </p>
        </div>


        <button
          className="users-add-button"
          onClick={openAddUser}
        >
          <Plus size={18} />
          Add User
        </button>

      </div>


      {/* SUMMARY */}

      <div className="users-summary">

        <div className="users-summary-card">

          <div className="users-summary-icon blue">
            <Users size={20} />
          </div>

          <div>
            <span>Total Users</span>
            <strong>{users.length}</strong>
          </div>

        </div>


        <div className="users-summary-card">

          <div className="users-summary-icon green">
            <UserCheck size={20} />
          </div>

          <div>
            <span>Active Users</span>
            <strong>{activeUsers}</strong>
          </div>

        </div>


        <div className="users-summary-card">

          <div className="users-summary-icon orange">
            <UserX size={20} />
          </div>

          <div>
            <span>Inactive Users</span>
            <strong>{inactiveUsers}</strong>
          </div>

        </div>


        <div className="users-summary-card">

          <div className="users-summary-icon purple">
            <ShieldCheck size={20} />
          </div>

          <div>
            <span>System Roles</span>
            <strong>4</strong>
          </div>

        </div>

      </div>


      {/* USERS CARD */}

      <div className="users-card">

        {/* CARD HEADER */}

        <div className="users-card-header">

          <div>
            <h2>
              Platform Users
            </h2>

            <p>
              View and manage registered users.
            </p>
          </div>


          <div className="users-filters">

            {/* SEARCH */}

            <div className="users-search">

              <Search size={17} />

              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
              />

            </div>


            {/* ROLE FILTER */}

            <select
              value={roleFilter}
              onChange={(e) =>
                setRoleFilter(e.target.value)
              }
              className="users-role-filter"
            >
              <option>All Roles</option>
              <option>Doctor</option>
              <option>Hospital Admin</option>
              <option>Researcher</option>
              <option>System Admin</option>
            </select>

          </div>

        </div>


        {/* TABLE */}

        <div className="users-table-wrapper">

          <table className="users-table">

            <thead>

              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last Login</th>
                <th>Actions</th>
              </tr>

            </thead>


            <tbody>

              {filteredUsers.length > 0 ? (

                filteredUsers.map((user) => (

                  <tr key={user.id}>

                    {/* USER */}

                    <td>

                      <div className="user-cell">

                        <div className="user-avatar">
                          {getInitials(user.name)}
                        </div>

                        <div>

                          <strong>
                            {user.name}
                          </strong>

                          <span>
                            {user.email}
                          </span>

                        </div>

                      </div>

                    </td>


                    {/* ROLE */}

                    <td>

                      <div
                        className={`role-badge role-${user.role
                          .toLowerCase()
                          .replace(" ", "-")}`}
                      >

                        {getRoleIcon(user.role)}

                        {user.role}

                      </div>

                    </td>


                    {/* DEPARTMENT */}

                    <td>
                      <span className="department-text">
                        {user.department}
                      </span>
                    </td>


                    {/* STATUS */}

                    <td>

                      <span
                        className={
                          user.status === "Active"
                            ? "status-badge active"
                            : "status-badge inactive"
                        }
                      >
                        <span className="status-dot" />
                        {user.status}
                      </span>

                    </td>


                    {/* LAST LOGIN */}

                    <td>

                      <span className="last-login">
                        {user.lastLogin}
                      </span>

                    </td>


                    {/* ACTIONS */}

                    <td>

                      <div className="user-actions">

                        <button
                          className="action-edit"
                          title="Edit user"
                          onClick={() =>
                            openEditUser(user)
                          }
                        >
                          <Edit3 size={16} />
                        </button>


                        <button
                          className={
                            user.status === "Active"
                              ? "action-disable"
                              : "action-enable"
                          }
                          title={
                            user.status === "Active"
                              ? "Deactivate user"
                              : "Activate user"
                          }
                          onClick={() =>
                            toggleUserStatus(user.id)
                          }
                        >

                          {user.status === "Active" ? (
                            <UserX size={16} />
                          ) : (
                            <UserCheck size={16} />
                          )}

                        </button>

                      </div>

                    </td>

                  </tr>

                ))

              ) : (

                <tr>

                  <td
                    colSpan={6}
                    className="users-empty"
                  >
                    No users found.
                  </td>

                </tr>

              )}

            </tbody>

          </table>

        </div>


        {/* FOOTER */}

        <div className="users-card-footer">

          <span>
            Showing {filteredUsers.length} of {users.length} users
          </span>

          <span>
            Access is managed by System Administrator
          </span>

        </div>

      </div>


      {/* ADD / EDIT MODAL */}

      {showModal && (

        <div
          className="user-modal-overlay"
          onClick={() => setShowModal(false)}
        >

          <div
            className="user-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="user-modal-header">

              <div>

                <h2>
                  {editingUser
                    ? "Edit User"
                    : "Add User"}
                </h2>

                <p>
                  {editingUser
                    ? "Update user information and role."
                    : "Create a new platform user."}
                </p>

              </div>


              <button
                className="modal-close"
                onClick={() =>
                  setShowModal(false)
                }
              >
                <X size={19} />
              </button>

            </div>


            <div className="user-form">

              <div className="form-group">

                <label>
                  Full Name
                </label>

                <input
                  type="text"
                  defaultValue={
                    editingUser?.name || ""
                  }
                  placeholder="Enter full name"
                />

              </div>


              <div className="form-group">

                <label>
                  Email Address
                </label>

                <input
                  type="email"
                  defaultValue={
                    editingUser?.email || ""
                  }
                  placeholder="Enter email address"
                />

              </div>


              <div className="form-row">

                <div className="form-group">

                  <label>
                    Role
                  </label>

                  <select
                    defaultValue={
                      editingUser?.role ||
                      "Doctor"
                    }
                  >
                    <option>Doctor</option>
                    <option>Hospital Admin</option>
                    <option>Researcher</option>
                    <option>System Admin</option>
                  </select>

                </div>


                <div className="form-group">

                  <label>
                    Status
                  </label>

                  <select
                    defaultValue={
                      editingUser?.status ||
                      "Active"
                    }
                  >
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>

                </div>

              </div>


              <div className="form-group">

                <label>
                  Department
                </label>

                <input
                  type="text"
                  defaultValue={
                    editingUser?.department || ""
                  }
                  placeholder="Enter department"
                />

              </div>

            </div>


            <div className="user-modal-actions">

              <button
                className="modal-cancel"
                onClick={() =>
                  setShowModal(false)
                }
              >
                Cancel
              </button>

              <button
                className="modal-save"
                onClick={() =>
                  setShowModal(false)
                }
              >
                {editingUser
                  ? "Save Changes"
                  : "Create User"}
              </button>

            </div>

          </div>

        </div>

      )}

    </div>
  );
}