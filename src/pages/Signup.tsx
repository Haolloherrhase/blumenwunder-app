import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Signup = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setError(error.message);
            setLoading(false);
        } else {
            navigate('/dashboard');
        }
    };

    return (
        <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-neutral-bg">
            <div className="mb-8 text-center">
                <h1 className="text-4xl font-bold text-primary mb-2">Blumenwunder</h1>
                <p className="text-secondary-dark font-medium">Neues Konto erstellen</p>
            </div>

            <Card className="w-full max-w-sm">
                <h2 className="text-xl font-semibold mb-6">Registrieren</h2>

                <form onSubmit={handleSignup} className="space-y-4">
                    <Input
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        placeholder="deine@email.de"
                    />

                    <Input
                        label="Passwort"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={6}
                        placeholder="Mind. 6 Zeichen"
                    />

                    {error && (
                        <div className="text-red-500 text-sm bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <Button type="submit" fullWidth disabled={loading}>
                        {loading ? 'Lade...' : 'Registrieren'}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-600">
                    Bereits ein Konto?{' '}
                    <Link to="/login" className="text-primary font-medium hover:underline">
                        Anmelden
                    </Link>
                </div>
            </Card>
        </div>
    );
};

export default Signup;
