import { useState } from 'react';
import { useAppStore } from '../store/useAppStore';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';

const ROLES = ['admin', 'manager', 'technician'];

export default function UsersPage() {
  const users = useAppStore((s) => s.users);
  const upsertUser = useAppStore((s) => s.upsertUser);
  const removeUser = useAppStore((s) => s.removeUser);
  const [editing, setEditing] = useState(null);

  const openNew = () => setEditing({
    id: `U${Date.now().toString(36)}`, username: '', displayName: '', role: 'technician', password: 'maintenance2026**', active: true,
  });

  const save = async () => {
    if (!editing.username) return;
    if (!editing.displayName) editing.displayName = editing.username;
    await upsertUser(editing);
    setEditing(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-500">{users.length} utilisateur(s)</div>
        <button className="btn-primary" onClick={openNew}>+ Nouvel utilisateur</button>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr><th className="th">Identifiant</th><th className="th">Nom affiché</th><th className="th">Rôle</th><th className="th">Statut</th><th className="th"></th></tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="td font-medium">{u.username}</td>
                <td className="td">{u.displayName}</td>
                <td className="td capitalize">{u.role}</td>
                <td className="td">
                  <Badge variant={u.active !== false ? 'success' : 'neutral'}>
                    {u.active !== false ? 'Actif' : 'Inactif'}
                  </Badge>
                </td>
                <td className="td text-right">
                  <button className="btn-ghost" onClick={() => setEditing({ ...u })}>Modifier</button>
                  <button className="btn-ghost text-rose-600" onClick={() => {
                    if (confirm(`Supprimer ${u.username} ?`)) removeUser(u.id);
                  }}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?.id?.startsWith('U') && !users.find((u) => u.id === editing.id) ? 'Nouvel utilisateur' : 'Modifier utilisateur'}
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setEditing(null)}>Annuler</button>
            <button className="btn-primary" onClick={save}>Enregistrer</button>
          </div>
        }
      >
        {editing && (
          <div className="space-y-3">
            <div><label className="label">Identifiant</label>
              <input className="input" value={editing.username} onChange={(e) => setEditing({ ...editing, username: e.target.value })} /></div>
            <div><label className="label">Nom affiché</label>
              <input className="input" value={editing.displayName} onChange={(e) => setEditing({ ...editing, displayName: e.target.value })} /></div>
            <div><label className="label">Rôle</label>
              <select className="input" value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select></div>
            <div><label className="label">Mot de passe</label>
              <input className="input" value={editing.password} onChange={(e) => setEditing({ ...editing, password: e.target.value })} /></div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
              Utilisateur actif
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
