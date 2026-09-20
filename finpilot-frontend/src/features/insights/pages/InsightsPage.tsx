import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { getInsights, getHealthScore, getNarrative, askFinPilot, type Severity, type HealthLabel, type AskResponse } from '../api/insightsApi';

const SUGGESTED_QUESTIONS = [
  'How much did I spend on food this month?',
  'Why is my health score what it is?',
  'What am I overspending on?',
];

const SEVERITY_STYLES: Record<Severity, string> = {
  INFO: 'bg-blue-50 border-blue-200 text-blue-800',
  WARNING: 'bg-amber-50 border-amber-200 text-amber-800',
  CRITICAL: 'bg-red-50 border-red-200 text-red-800',
};

const SEVERITY_ICON: Record<Severity, string> = {
  INFO: 'ℹ️',
  WARNING: '⚠️',
  CRITICAL: '🔴',
};

const LABEL_STYLES: Record<HealthLabel, string> = {
  EXCELLENT: 'text-emerald-600',
  GOOD: 'text-emerald-500',
  FAIR: 'text-amber-500',
  NEEDS_ATTENTION: 'text-red-500',
};

const LABEL_TEXT: Record<HealthLabel, string> = {
  EXCELLENT: 'Excellent',
  GOOD: 'Good',
  FAIR: 'Fair',
  NEEDS_ATTENTION: 'Needs attention',
};

export default function InsightsPage() {
  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ['insights'],
    queryFn: () => getInsights(),
  });

  const { data: healthScore, isLoading: healthLoading } = useQuery({
    queryKey: ['healthScore'],
    queryFn: () => getHealthScore(),
  });

  // retry: false - a 503 (not configured) or 502 (provider down) won't
  // resolve by retrying immediately, and this call has a real API cost
  // attached, so don't burn extra requests on it.
  const { data: narrative, isLoading: narrativeLoading, error: narrativeError } = useQuery({
    queryKey: ['narrative'],
    queryFn: () => getNarrative(),
    retry: false,
  });

  // A 503 here means the server admin simply hasn't set OPENAI_API_KEY -
  // that's an expected, normal state (this feature is optional by design),
  // not something to show as an alarming error banner.
  const narrativeNotConfigured = isAxiosError(narrativeError) && narrativeError.response?.status === 503;

  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');

  const askMutation = useMutation({
    mutationFn: askFinPilot,
    onSuccess: () => setQuestion(''),
  });

  const askNotConfigured = isAxiosError(askMutation.error) && askMutation.error.response?.status === 503;

  function handleAsk(q?: string) {
    const finalQuestion = (q ?? question).trim();
    if (!finalQuestion) return;
    setSubmittedQuestion(finalQuestion);
    askMutation.mutate(finalQuestion);
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Insights</h1>
        <p className="text-sm text-slate-500 mt-1">
          A quick read on how this month is going, based on your actual transactions and budgets
        </p>
      </div>

      {/* Health score */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Financial health score</h2>
        {healthLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : !healthScore ? (
          <p className="text-sm text-slate-400">Couldn't load your health score.</p>
        ) : (
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-center justify-center w-24 h-24 rounded-full border-4 border-slate-100 shrink-0">
              <span className="text-2xl font-bold text-slate-900">{healthScore.score}</span>
              <span className="text-[10px] text-slate-400">/ 100</span>
            </div>
            <div>
              <p className={`text-lg font-semibold ${LABEL_STYLES[healthScore.label]}`}>
                {LABEL_TEXT[healthScore.label]}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Savings rate: <span className="font-medium text-slate-700">{healthScore.savingsRate.toFixed(0)}%</span>
                {healthScore.budgetAdherence !== null && (
                  <>
                    {' · '}Budget adherence:{' '}
                    <span className="font-medium text-slate-700">{healthScore.budgetAdherence.toFixed(0)}%</span>
                  </>
                )}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Based on how much of your income you're keeping and how well you're sticking to your budgets this month.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* AI narrative - optional layer on top of the health score/insights above */}
      {narrativeLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-sm text-slate-400">Generating your summary...</p>
        </div>
      ) : narrative ? (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">✨ AI Summary</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{narrative.narrative}</p>
        </div>
      ) : narrativeNotConfigured ? null : (
        // Real failure (502) - a quiet note, not an alarming red banner,
        // since the rest of the page works fine regardless.
        <p className="text-xs text-slate-400">AI summary couldn't be generated right now.</p>
      )}

      {/* Ask FinPilot - real retrieval-augmented Q&A, not a scripted demo.
          Every question here hits the actual /intelligence/ask endpoint:
          it embeds the question, retrieves the most relevant transactions
          from this user's real history by cosine similarity, and answers
          grounded in that retrieved context - with the specific
          transactions cited below the answer. */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-sm font-semibold text-slate-900 mb-1">Ask FinPilot</h2>
        <p className="text-xs text-slate-400 mb-4">Grounded in your own transactions - answers cite exactly what they're based on.</p>

        <div className="flex flex-wrap gap-2 mb-4">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleAsk(q)}
              className="text-xs bg-slate-50 text-slate-600 border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-100"
            >
              {q}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex gap-2 mb-4"
        >
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your money..."
            className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
          <button
            type="submit"
            disabled={askMutation.isPending || !question.trim()}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {askMutation.isPending ? 'Asking...' : 'Ask'}
          </button>
        </form>

        {askMutation.isPending && (
          <p className="text-sm text-slate-400">Searching your transactions...</p>
        )}

        {askMutation.isError && !askNotConfigured && (
          <p className="text-sm text-red-600">Couldn't get an answer right now - please try again.</p>
        )}

        {askNotConfigured && (
          <p className="text-sm text-slate-400">
            Ask FinPilot isn't configured on this server yet (needs an OpenAI API key).
          </p>
        )}

        {askMutation.isSuccess && (
          <AskResult question={submittedQuestion} result={askMutation.data} />
        )}
      </div>

      {/* Insights */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">This month's observations</h2>
        {insightsLoading ? (
          <p className="text-sm text-slate-400">Loading...</p>
        ) : !insights || insights.length === 0 ? (
          <p className="text-sm text-slate-400">Nothing to report yet.</p>
        ) : (
          insights.map((insight, index) => (
            <div
              key={index}
              className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${SEVERITY_STYLES[insight.severity]}`}
            >
              <span className="text-base leading-none mt-0.5">{SEVERITY_ICON[insight.severity]}</span>
              <p>{insight.message}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

// The citations are the whole point - an answer with no visible source is
// no better than the "trust me" chat gimmick the competitive landscape
// warns against. Showing exactly which transactions grounded the answer
// is what separates this from a hardcoded demo.
function AskResult({ question, result }: { question: string; result: AskResponse }) {
  return (
    <div className="border-t border-slate-100 pt-4">
      <p className="text-xs text-slate-400 mb-1">You asked</p>
      <p className="text-sm text-slate-700 mb-3">"{question}"</p>

      <p className="text-xs text-slate-400 mb-1">FinPilot's answer</p>
      <p className="text-sm text-slate-800 leading-relaxed mb-4">{result.answer}</p>

      {result.citedTransactions.length > 0 && (
        <>
          <p className="text-xs text-slate-400 mb-2">Based on these transactions</p>
          <div className="space-y-1.5">
            {result.citedTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-3 py-2">
                <span className="text-slate-600">
                  {tx.description || tx.categoryName} · {tx.categoryName} · {tx.transactionDate}
                </span>
                <span className="font-medium text-slate-800">{formatCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
