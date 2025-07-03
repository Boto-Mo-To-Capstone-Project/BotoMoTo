'use client'
import { useEffect, useState } from 'react'

interface User {
  id: number
  name: string
  email: string
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')

  const fetchUsers = async () => {
    const res = await fetch('/api/users')
    const data = await res.json()
    setUsers(data)
  }

  const createUser = async () => {
    await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    })
    setName('')
    setEmail('')
    fetchUsers()
  }

  const deleteUser = async (id: number) => {
    await fetch(`/api/users/${id}`, { method: 'DELETE' })
    fetchUsers()
  }

  const startEdit = (user: User) => {
    setEditingId(user.id)
    setEditName(user.name)
    setEditEmail(user.email)
  }

  const saveEdit = async () => {
    if (editingId === null) return

    await fetch(`/api/users/${editingId}`, {
      method: 'PUT',
      body: JSON.stringify({ name: editName, email: editEmail }),
    })
    setEditingId(null)
    setEditName('')
    setEditEmail('')
    fetchUsers()
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>

      <div className="mb-4 space-x-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className="border p-2"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="border p-2"
        />
        <button
          onClick={createUser}
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Add User
        </button>
      </div>

      <ul className="space-y-2">
        {users.map((user) => (
          <li key={user.id} className="border p-2 rounded flex justify-between items-center">
            {editingId === user.id ? (
              <div className="space-x-2">
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border p-1"
                />
                <input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="border p-1"
                />
                <button onClick={saveEdit} className="bg-green-500 text-white px-2 py-1 rounded">
                  Save
                </button>
              </div>
            ) : (
              <>
                <span>{user.name} - {user.email}</span>
                <div className="space-x-2">
                  <button onClick={() => startEdit(user)} className="bg-yellow-400 px-2 py-1 rounded">
                    Edit
                  </button>
                  <button onClick={() => deleteUser(user.id)} className="bg-red-500 text-white px-2 py-1 rounded">
                    Delete
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
