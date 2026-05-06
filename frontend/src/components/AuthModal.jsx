import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { X, Mail, Lock, User, Sparkles } from 'lucide-react';
import './AuthModal.css';

function AuthModal() {
  const { isAuthModalOpen, setIsAuthModalOpen, login, register } = useContext(AppContext);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isAuthModalOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await login(username, password);
      } else {
        await register(username, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
      <div className="auth-modal-content" onClick={e => e.stopPropagation()}>
        <button className="close-btn" onClick={() => setIsAuthModalOpen(false)}>
          <X size={20} />
        </button>
        
        <div className="auth-header">
          <div className="auth-icon-wrapper">
            <Sparkles size={24} className="auth-icon" />
          </div>
          <h2>{isLogin ? 'Hoş Geldiniz' : 'Aramıza Katılın'}</h2>
          <p>{isLogin ? 'NexMod hesabınıza giriş yapın' : 'Yeni bir NexMod hesabı oluşturun'}</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="input-group">
            <User size={18} className="input-icon" />
            <input 
              type="text" 
              placeholder="Kullanıcı Adı" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required 
              minLength={3}
            />
          </div>

          <div className="input-group">
            <Lock size={18} className="input-icon" />
            <input 
              type="password" 
              placeholder="Şifre" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
              minLength={6}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-submit-btn" disabled={isLoading}>
            {isLoading ? 'Lütfen Bekleyin...' : (isLogin ? 'Giriş Yap' : 'Kayıt Ol')}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? 'Hesabınız yok mu?' : 'Zaten hesabınız var mı?'}
            <span className="auth-toggle-link" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
              {isLogin ? ' Kayıt Ol' : ' Giriş Yap'}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default AuthModal;
