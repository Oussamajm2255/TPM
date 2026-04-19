import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';

export default function LoginPage() {
  const login = useAppStore((s) => s.login);
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setLoading(true);
    try {
      await login(username.trim(), password);
      navigate('/', { replace: true });
    } catch (e) {
      setErr(e.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-full grid place-items-center p-6">
      <div className="card w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-600 text-white grid place-items-center font-bold">T</div>
          <div>
            <div className="font-semibold text-lg">TPM Audit</div>
            <div className="text-xs text-slate-500">Connexion</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label">Nom d'utilisateur</label>
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Mot de passe</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {err && <div className="text-sm text-rose-600">{err}</div>}
          <button className="btn-primary w-full justify-center" disabled={loading}>
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
        <div className="mt-6 text-xs text-slate-500 leading-relaxed">
          <div className="font-medium text-slate-600 mb-1">Comptes de démo :</div>
          admin: <code>Abdelsal</code> · manager: <code>manager</code> · technicien: <code>marwen</code>
          <br />Mot de passe : <code>maintenance2026**</code>
        </div>
      </div>
    </div>
  );
}
