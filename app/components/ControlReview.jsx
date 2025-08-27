/** @format */

import { toast } from 'react-toastify';
import systemInstruction from './language';

const handleReview = async ({
  code,
  language,
  setLoading,
  setReview,
  setFixedCode,
  setCodeScore,
  detectLanguage,
  isMatch,
  normalizeScore,
  injectScoreInReview,
}) => {
  if (!code.trim()) {
    toast.error('⚠️ Please paste some code first.');
    return;
  }

  const { lang: detected, relevance } = detectLanguage(code);
  const LOW_CONFIDENCE = 8;

  if (!detected || relevance < LOW_CONFIDENCE) {
    toast.warn(
      `🤔 Couldn’t detect language confidently. Please check your code.`
    );
    return;
  }

  if (!isMatch(language, detected)) {
    toast.error(
      `❌ Language mismatch: you selected "${language}", but your code looks like "${detected}".`
    );
    return;
  }

  toast.success(
    `✅ Correct! You selected "${language}" and wrote ${detected}. Starting review...`
  );

  setLoading(true);
  setReview('');
  setFixedCode('');
  setCodeScore(null);

  try {
    const res = await fetch('/api/codereview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, systemInstruction }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `Request failed with ${res.status}`);
    }

    const data = await res.json();
    let text = data.text || '❌ Error: No response from AI.';

    // extract raw score
    const scoreMatch = text.match(/(\d{1,3})\s*\/?\s*100/);
    const rawScore = scoreMatch
      ? Math.min(100, Math.max(0, parseInt(scoreMatch[1], 10)))
      : 0;

    // ✅ normalize score based on review content
    const normalized = normalizeScore(text, rawScore);

    // ✅ update review text with normalized score
    text = injectScoreInReview(text, normalized);

    setReview(text);
    setCodeScore(normalized);

    // extract fixed code automatically
    const match = text.match(/```(?:\w+)?\n([\s\S]*?)```/);
    if (match) setFixedCode(match[1].trim());
  } catch (err) {
    console.error(err);
    toast.error(`❌ Failed to analyze code. ${err.message || ''}`);
  } finally {
    setLoading(false);
  }
};
export default handleReview;
