import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const LoginDebug = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [response, setResponse] = useState<unknown>(null);
  const [error, setError] = useState<unknown>(null);

  const createTestUser = async () => {
    try {
      console.log('� Debug: Creando usuario de prueba');
      const response = await fetch('http://localhost:8080/api/debug/create-test-user', {
        method: 'POST',
      });

      const data = await response.text();
      console.log('� Debug: Resultado:', data);
      
      if (response.ok) {
        setResponse({ message: data });
        setError(null);
      } else {
        setError({ status: response.status, message: data });
      }
    } catch (err) {
      console.error('❌ Debug: Error creando usuario:', err);
      setError(err);
    }
  };

  const listUsers = async () => {
    try {
      console.log('🔧 Debug: Listando usuarios');
      const response = await fetch('http://localhost:8080/api/debug/list-users', {
        method: 'GET',
      });

      const data = await response.text();
      console.log('🔧 Debug: Resultado:', data);
      
      if (response.ok) {
        setResponse({ message: data });
        setError(null);
      } else {
        setError({ status: response.status, message: data });
      }
    } catch (err) {
      console.error('❌ Debug: Error listando usuarios:', err);
      setError(err);
    }
  };

  const testDirectLoginNoProxy = async () => {
    try {
      console.log('🔵 Debug: Probando login directo SIN proxy');
      console.log('🔵 Debug: Username:', username);
      console.log('🔵 Debug: Password length:', password.length);
      
      setError(null);
      setResponse(null);

      const requestBody = { username, password };
      console.log('🔵 Debug: Request body:', requestBody);

      const response = await fetch('http://localhost:8080/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🔵 Debug: Respuesta directa del login:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        url: response.url
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Debug: Error response directo:', errorData);
        setError({ status: response.status, message: errorData });
        return;
      }

      const data = await response.json();
      console.log('✅ Debug: Login directo exitoso:', data);
      setResponse(data);
    } catch (err) {
      console.error('❌ Debug: Error en login directo:', err);
      setError(err);
    }
  };

  const testDirectLogin = async () => {
    try {
      console.log('🔵 Debug: Probando login directo');
      console.log('🔵 Debug: Username:', username);
      console.log('🔵 Debug: Password length:', password.length);
      
      setError(null);
      setResponse(null);

      const requestBody = { username, password };
      console.log('🔵 Debug: Request body:', requestBody);

      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('🔵 Debug: Respuesta del fetch:', {
        ok: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Debug: Error response:', errorData);
        setError({ status: response.status, message: errorData });
        return;
      }

      const data = await response.json();
      console.log('✅ Debug: Datos recibidos:', data);
      setResponse(data);
    } catch (err) {
      console.error('❌ Debug: Error en fetch:', err);
      setError(err);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Debug Login</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Button 
          onClick={testDirectLogin} 
          className="w-full"
          disabled={!username.trim() || !password.trim()}
        >
          Test Login (Con Proxy)
        </Button>
        
        <Button 
          onClick={testDirectLoginNoProxy} 
          className="w-full"
          variant="outline"
          disabled={!username.trim() || !password.trim()}
        >
          Test Login (Directo)
        </Button>
        
        <Button 
          onClick={createTestUser} 
          className="w-full"
          variant="secondary"
        >
          Create Test User
        </Button>
        
        <Button 
          onClick={listUsers} 
          className="w-full"
          variant="secondary"
        >
          List Users
        </Button>
        
        {response && (
          <div className="p-4 bg-green-100 rounded">
            <h3 className="font-bold text-green-800">Success:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(response, null, 2)}
            </pre>
          </div>
        )}
        
        {error && (
          <div className="p-4 bg-red-100 rounded">
            <h3 className="font-bold text-red-800">Error:</h3>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(error, null, 2)}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
