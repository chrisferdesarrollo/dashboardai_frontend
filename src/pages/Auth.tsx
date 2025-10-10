import { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { SignupForm } from '@/components/auth/SignupForm';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center flex flex-col items-center space-y-4">
          {/* Logo animado */}
          <img 
            src="/iconoTopias.png" 
            alt="TopIA's Logo" 
            className="h-32 w-32 object-contain logo-animated"
          />
          {/* Texto TopIA's con badge BETA */}
          <div className="flex items-center gap-3">
            <h1 className="brand-logo text-4xl">
              TOPIA<span className="brand-logo-apostrophe">'</span>S
            </h1>
            <span className="px-2 py-1 text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-md">
              BETA
            </span>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Sistema de gestión para agentes de inteligencia artificial
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow rounded-lg">
          {isLogin ? (
            <LoginForm onSwitchToSignup={() => setIsLogin(false)} />
          ) : (
            <SignupForm onSwitchToLogin={() => setIsLogin(true)} />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
