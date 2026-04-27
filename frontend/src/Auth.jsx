import React, { useState } from 'react';

export default function Auth({ onLogin }) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ username: '', email: '', password: '' });
  const [message, setMessage] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    const endpoint = isLogin ? '/api/login' : '/api/register';
    
    try {
      const res = await fetch(`${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isLogin ? { email: formData.email, password: formData.password } : formData
        )
      });
      const data = await res.json();
      
      if (res.ok) {
        if (isLogin) {
          onLogin(data);
        } else {
          setMessage('Registration successful! Please log in.');
          setIsLogin(true);
        }
      } else {
        setMessage(data.detail || data.error || 'Request failed');
      }
    } catch (err) {
      setMessage('Network error bridging to server');
    }
  };

  return (
    <div style={{
      maxWidth: '400px',
      width: '100%',
      margin: '0 auto',
      padding: '2.5rem',
      backgroundColor: 'var(--bg-surface-elevated)',
      border: '1px solid var(--border-default)',
      borderRadius: '16px',
      boxShadow: 'var(--auth-card-shadow)',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5rem',
      boxSizing: 'border-box'
    }}>
      <h2 style={{ textAlign: 'center', fontSize: '1.8rem', color: 'var(--text-primary)', margin: 0 }}>
        {isLogin ? 'Welcome Back' : 'Create Account'}
      </h2>
      
      {message && (
        <div style={{
          padding: '1rem',
          borderRadius: '8px',
          backgroundColor: message.includes('successful') ? 'var(--success-soft-bg)' : 'var(--error-soft-bg)',
          color: message.includes('successful') ? 'var(--success-soft-text)' : 'var(--error-soft-text)',
          border: `1px solid ${message.includes('successful') ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
          textAlign: 'center',
          fontSize: '0.9rem'
        }}>
          {message}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {!isLogin && (
          <input 
            name="username" 
            placeholder="Username" 
            required 
            value={formData.username} 
            onChange={handleChange} 
          />
        )}
        <input 
          name="email" 
          type="email" 
          placeholder="Email address" 
          required 
          value={formData.email} 
          onChange={handleChange} 
        />
        <input 
          name="password" 
          type="password" 
          placeholder="Password" 
          required 
          value={formData.password} 
          onChange={handleChange} 
        />
        <button type="submit" style={{ marginTop: '0.5rem' }}>
          {isLogin ? 'Sign In' : 'Sign Up'}
        </button>
      </form>
      
      <button 
        type="button"
        onClick={() => { setIsLogin(!isLogin); setMessage(''); }} 
        style={{ 
          background: 'none', 
          border: 'none', 
          color: 'var(--text-secondary)', 
          fontSize: '0.9rem',
          padding: '0',
          marginTop: '0.5rem',
          transition: 'color 0.2s',
        }}
        onMouseEnter={(e) => { e.target.style.color = 'var(--text-primary)'; }}
        onMouseLeave={(e) => { e.target.style.color = 'var(--text-secondary)'; }}
      >
        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
      </button>

      <div style={{ borderTop: '1px solid var(--border-default)', marginTop: '1rem', paddingTop: '1.5rem', textAlign: 'center' }}>
        <button 
          type="button" 
          onClick={() => onLogin({ user_id: 'test_dev_id', username: 'Developer' })}
          style={{ backgroundColor: 'var(--bg-muted)', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '8px 16px', border: '1px solid var(--border-strong)' }}
        >
          Bypass Login (Dev Mode)
        </button>
      </div>
    </div>
  );
}
