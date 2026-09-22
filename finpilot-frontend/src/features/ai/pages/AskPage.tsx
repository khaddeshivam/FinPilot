import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { askFinPilot, type AskResponse } from '../../insights/api/insightsApi';
import { formatCurrency } from '../../../lib/format';
import Button from '../../../components/ui/Button';
import PageHeader from '../../../components/layout/PageHeader';
import Surface from '../../../components/ui/Surface';

const SUGGESTED_QUESTIONS = [
  'How much did I spend on food this month?',
  'Why is my health score what it is?',
  'What am I overspending on?',
];

export default function AskPage() {
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
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Ask FinPilot"
        subtitle="Answers are retrieved from your own transactions, then cited so you can see the source."
      />

      <Surface className="p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => handleAsk(q)}
              className="rounded-full border border-line px-3 py-1.5 text-[13px] text-muted transition-colors hover:bg-canvas hover:text-ink"
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
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your money…"
            className="h-11 flex-1 rounded-[12px] border border-line px-3 text-sm outline-none focus:border-ink/30"
          />
          <Button type="submit" disabled={askMutation.isPending || !question.trim()}>
            {askMutation.isPending ? 'Searching…' : 'Ask'}
          </Button>
        </form>

        {askMutation.isPending && (
          <p className="mt-4 text-sm text-muted">Searching your transactions…</p>
        )}
        {askMutation.isError && !askNotConfigured && (
          <p className="mt-4 text-sm text-negative">Couldn't get an answer right now — please try again.</p>
        )}
        {askNotConfigured && (
          <p className="mt-4 text-sm text-muted">
            Ask FinPilot isn’t configured on this server yet (needs an OpenAI API key).
          </p>
        )}
        {askMutation.isSuccess && <AskResult question={submittedQuestion} result={askMutation.data} />}
      </Surface>
    </div>
  );
}

function AskResult({ question, result }: { question: string; result: AskResponse }) {
  return (
    <div className="mt-6 border-t border-line pt-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted">You asked</p>
      <p className="mt-1 text-sm">{question}</p>
      <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">FinPilot’s answer</p>
      <p className="mt-2 text-[15px] leading-relaxed">{result.answer}</p>
      {result.citedTransactions.length > 0 && (
        <>
          <p className="mt-5 text-[11px] font-medium uppercase tracking-[0.08em] text-muted">Based on these transactions</p>
          <div className="mt-2 space-y-1.5">
            {result.citedTransactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between rounded-xl bg-canvas px-3 py-2 text-xs">
                <span className="text-muted">
                  {tx.description || tx.categoryName} · {tx.categoryName} · {tx.transactionDate}
                </span>
                <span className="font-mono font-medium">{formatCurrency(tx.amount)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
