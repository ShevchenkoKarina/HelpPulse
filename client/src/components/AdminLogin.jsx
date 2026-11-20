import { useState } from 'react';
import { Lock } from 'lucide-react';
import { api } from '../api/client.js';
import { setToken } from '../api/auth.js';
import Dialog from './Dialog.jsx';
import Field from './Field.jsx';

/** Маленьке вікно «Вхід для координаторів». onSuccess викликається після правильного пароля. */
export default function AdminLogin({ onClose, onSuccess }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!password) { setError('Введіть пароль'); return; }
    setBusy(true); setError('');
    try {
      const { token } = await api('/auth/login', { method: 'POST', body: { password } });
      setToken(token);
      onSuccess();
    } catch (ex) {
      setError(ex.message);
      setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Вхід для координаторів" onClose={onClose} small>
      <form className="form" onSubmit={submit} noValidate style={{ gap: 16 }}>
        <p className="muted" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Lock size={18} aria-hidden="true" /> Керування платформою доступне лише координатору.
        </p>
        <Field label="Пароль" error={error}>
          <input
            className="input" type="password" autoComplete="current-password" autoFocus
            value={password} onChange={(e) => { setPassword(e.target.value); setError(''); }}
          />
        </Field>
        <div className="dialog__foot">
          <button className="btn btn--primary" type="submit" disabled={busy}>{busy ? 'Перевіряємо…' : 'Увійти'}</button>
          <button className="btn btn--ghost" type="button" onClick={onClose}>Скасувати</button>
        </div>
      </form>
    </Dialog>
  );
}
