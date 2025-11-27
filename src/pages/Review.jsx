import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { CheckCircle, XCircle, Clock, Calendar } from 'lucide-react';
import { db } from '../services/db';
import questionsData from '../data/questions.json';

export default function Review() {
    const attempts = useLiveQuery(() => db.attempts.orderBy('timestamp').reverse().toArray());

    if (!attempts) return <div className="p-8 text-white">Loading...</div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-8">Review History</h1>

            <div className="space-y-4">
                {attempts.length === 0 ? (
                    <div className="text-gray-400 text-center py-12 bg-gray-800 rounded-xl">
                        No attempts yet. Go take a quiz!
                    </div>
                ) : (
                    attempts.map((attempt) => {
                        const question = questionsData.find(q => q.id === attempt.questionId);
                        if (!question) return null;

                        return (
                            <div key={attempt.id} className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        {attempt.isCorrect ? (
                                            <CheckCircle className="text-green-400" size={24} />
                                        ) : (
                                            <XCircle className="text-red-400" size={24} />
                                        )}
                                        <div>
                                            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                {question.category} • {question.difficulty}
                                            </span>
                                            <h3 className="text-lg font-medium text-white mt-1">{question.text}</h3>
                                        </div>
                                    </div>
                                    <div className="text-right text-sm text-gray-500">
                                        <div className="flex items-center justify-end gap-1 mb-1">
                                            <Calendar size={14} />
                                            {new Date(attempt.timestamp).toLocaleDateString()}
                                        </div>
                                        <div className="flex items-center justify-end gap-1">
                                            <Clock size={14} />
                                            {new Date(attempt.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>

                                <div className="pl-9">
                                    <div className="text-sm text-gray-400 mb-2">
                                        Correct Answer: <span className="text-green-400 font-medium">{question.options[question.correctIndex]}</span>
                                    </div>
                                    <div className="text-xs text-gray-600">
                                        Time taken: {attempt.timeTaken}s
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
