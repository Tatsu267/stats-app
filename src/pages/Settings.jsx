import React, { useState, useEffect } from 'react';
import { Save, Key, AlertCircle } from 'lucide-react';
import { saveApiKey, getApiKey } from '../services/db';

export default function Settings() {
    const [apiKey, setApiKey] = useState('');
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        getApiKey().then(key => {
            if (key) setApiKey(key);
        });
    }, []);

    const handleSave = async () => {
        await saveApiKey(apiKey);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="p-8 max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>

            <div className="bg-gray-800 rounded-xl p-8 shadow-lg">
                <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                    <Key className="text-blue-400" />
                    AI Configuration
                </h2>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                            OpenAI / Gemini API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                        />
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                            <AlertCircle size={12} />
                            Your API key is stored locally in your browser and never sent to our servers.
                        </p>
                    </div>

                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors mt-4"
                    >
                        <Save size={18} />
                        {saved ? 'Saved!' : 'Save Configuration'}
                    </button>
                </div>
            </div>
        </div>
    );
}
