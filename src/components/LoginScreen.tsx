import React, { useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
} from '@firebase/auth';
import { auth, googleProvider } from '../lib/firebase';

interface LoginScreenProps {
  firmName?: string;
  firmSubtitle?: string;
  logoUrl?: string;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  firmName,
  firmSubtitle,
  logoUrl,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayName = firmName?.trim() || 'AdvoDesk';
  const displaySubtitle = firmSubtitle?.trim() || 'Gestão Jurídica';
  const displayLogo = logoUrl?.trim() || '';

  // Check redirect login results on mount
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log('Google Redirect login success:', result.user);
        }
      })
      .catch((err) => {
        console.error('Redirect login error:', err);
        if (err?.code) {
          setError(getPortugueseErrorMessage(err.code));
        }
      });
  }, []);

  const getPortugueseErrorMessage = (errCode: string): string => {
    switch (errCode) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'E-mail ou senha incorretos. Verifique suas credenciais de acesso.';
      case 'auth/invalid-email':
        return 'Endereço de e-mail inválido.';
      case 'auth/too-many-requests':
        return 'Muitas tentativas de login. Por favor, aguarde alguns minutos e tente novamente.';
      case 'auth/popup-closed-by-user':
        return 'A janela de autenticação do Google foi fechada antes da conclusão.';
      case 'auth/unauthorized-domain':
        return 'Atenção: O domínio deste site precisa ser liberado no Firebase Console (Authentication > Configurações > Domínios Autorizados) ou utilize o login por E-mail e Senha.';
      case 'auth/operation-not-allowed':
        return 'O login com Google não está habilitado no Firebase Console. Ative o provedor Google no painel do Firebase.';
      case 'auth/popup-blocked':
        return 'O pop-up de login foi bloqueado pelo seu navegador. Tente liberar os pop-ups ou tente novamente.';
      case 'auth/account-exists-with-different-credential':
        return 'Já existe uma conta cadastrada com este e-mail utilizando outro método de autenticação.';
      default:
        return 'Falha ao autenticar. Verifique seus dados e conexão.';
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Por favor, preencha o e-mail e a senha.');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      const msg = getPortugueseErrorMessage(err?.code || '');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Google Auth Popup Error:', err);
      const code = err?.code || '';

      // Fallback to redirect if popup was blocked or failed in iframe
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user') {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectErr: any) {
          console.error('Google Auth Redirect Error:', redirectErr);
          setError(getPortugueseErrorMessage(redirectErr?.code || ''));
        }
      } else {
        setError(getPortugueseErrorMessage(code));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0D0D0D] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Decorative Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#C9A227]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#C9A227]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200/80 border-t-2 border-t-[#C9A227] p-8 sm:p-10 relative z-10 flex flex-col space-y-6">
        {/* Header Branding */}
        <div className="text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-[#C9A227]/40 p-2.5 shadow-sm mb-4 flex items-center justify-center">
            {displayLogo ? (
              <img
                src={displayLogo}
                alt={displayName}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full rounded-xl bg-slate-900 text-[#C9A227] flex items-center justify-center">
                <span className="material-symbols-outlined text-3xl">account_balance</span>
              </div>
            )}
          </div>
          <h1 className="font-display-lg text-2xl font-black text-[#0D0D0D] tracking-tight uppercase">
            {displayName}
          </h1>
          <p className="text-xs text-slate-500 font-extrabold uppercase tracking-widest mt-0.5">
            {displaySubtitle} • Painel Restrito
          </p>
        </div>

        {/* Title */}
        <div className="text-center border-b border-slate-100 pb-3">
          <h2 className="text-base font-bold text-slate-800">Acesso de Usuários Autorizados</h2>
          <p className="text-xs text-slate-500 mt-0.5">Insira suas credenciais para entrar no sistema</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-start space-x-2.5">
            <span className="material-symbols-outlined text-[18px] text-red-600 shrink-0 mt-0.5">
              error
            </span>
            <span className="flex-1 leading-snug">{error}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              E-mail Profissional
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-[18px]">
                mail
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@exemplo.com.br"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400 text-[18px]">
                lock
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-900/20 focus:border-blue-900 transition-all placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full glass-btn-primary py-3 rounded-xl text-white font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">login</span>
                <span>Entrar no Sistema</span>
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-1">
          <div className="border-t border-slate-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider relative z-10">
            ou entrar com
          </span>
        </div>

        {/* Alternative Login Actions */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-white border border-slate-300 text-slate-800 text-xs font-bold hover:bg-slate-50 transition-all flex items-center justify-center space-x-2 shadow-2xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Conta Google</span>
          </button>
        </div>

        {/* Security Footer Note */}
        <p className="text-[11px] text-center text-slate-400 mt-2">
          Acesso seguro autenticado via <strong className="text-slate-600">Firebase Auth</strong> com criptografia de ponta a ponta.
        </p>
      </div>
    </div>
  );
};
