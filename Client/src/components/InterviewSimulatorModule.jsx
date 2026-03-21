import { useEffect, useMemo, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  answerInterviewSimulation,
  getInterviewSimulationById,
  getInterviewSimulationHistory,
  startInterviewSimulation,
} from '../api/interviewSimulatorApi';

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const ROUND_OPTIONS = [
  { value: 'coding', label: 'Coding' },
  { value: 'lld', label: 'LLD' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'mixed', label: 'Mixed' },
];

const asText = (value) =>
  String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

function InterviewSimulatorModule() {
  const editorRef = useRef(null);
  const answerBoxRef = useRef(null);

  const [difficulty, setDifficulty] = useState('medium');
  const [roundType, setRoundType] = useState('mixed');
  const [includeCode, setIncludeCode] = useState(false);
  const [codeAnswer, setCodeAnswer] = useState('');
  const [answerRichText, setAnswerRichText] = useState('');
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const currentQuestion = session?.currentQuestion || null;
  const askedQuestions = session?.questions || [];
  const lastAnswered = useMemo(() => {
    if (!askedQuestions.length) {
      return null;
    }

    const answered = askedQuestions.filter((item) => Number(item.rating) > 0);
    return answered[answered.length - 1] || null;
  }, [askedQuestions]);

  const canSubmit = useMemo(() => {
    return Boolean(asText(answerRichText) || codeAnswer.trim());
  }, [answerRichText, codeAnswer]);

  const loadHistory = async () => {
    setHistoryLoading(true);

    try {
      const data = await getInterviewSimulationHistory(20);
      setHistory(data || []);
    } catch {
      // Avoid interrupting primary flow for history failures.
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const onStart = async () => {
    setLoading(true);
    setError('');
    setStatus('');

    try {
      const data = await startInterviewSimulation({
        difficulty,
        roundType,
      });

      setSession(data);
      setAnswerRichText('');
      setCodeAnswer('');
      if (answerBoxRef.current) {
        answerBoxRef.current.innerHTML = '';
      }

      setStatus('Simulation started. Answer the question and submit for AI feedback.');
      await loadHistory();
    } catch (requestError) {
      setError(requestError.message || 'Unable to start simulation.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitAnswer = async () => {
    if (!session?.simulationId || !canSubmit) {
      return;
    }

    setSubmitting(true);
    setError('');
    setStatus('');

    try {
      const data = await answerInterviewSimulation(session.simulationId, {
        answerRichText,
        answerCode: includeCode ? codeAnswer : '',
      });

      setSession(data);
      setAnswerRichText('');
      setCodeAnswer('');
      if (answerBoxRef.current) {
        answerBoxRef.current.innerHTML = '';
      }

      if (data?.status === 'completed') {
        setStatus(`Simulation completed. Score: ${data?.overall?.score10 || 0}/10.`);
      } else {
        setStatus('Feedback generated. Continue to the next question.');
      }

      await loadHistory();
    } catch (requestError) {
      setError(requestError.message || 'Unable to submit answer.');
    } finally {
      setSubmitting(false);
    }
  };

  const onLoadSession = async (simulationId) => {
    if (!simulationId) {
      return;
    }

    setLoading(true);
    setError('');
    setStatus('');

    try {
      const data = await getInterviewSimulationById(simulationId);
      setSession(data);
      setAnswerRichText('');
      setCodeAnswer('');
      if (answerBoxRef.current) {
        answerBoxRef.current.innerHTML = '';
      }
    } catch (requestError) {
      setError(requestError.message || 'Unable to load simulation details.');
    } finally {
      setLoading(false);
    }
  };

  const applyFormat = (command) => {
    if (document.activeElement !== answerBoxRef.current) {
      answerBoxRef.current?.focus();
    }

    document.execCommand(command, false);
    setAnswerRichText(answerBoxRef.current?.innerHTML || '');
  };

  const onDownloadPdf = async () => {
    if (!session || session.status !== 'completed') {
      return;
    }

    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF('p', 'pt', 'a4');
    const margin = 40;
    const width = 515;
    let y = margin;

    const writeBlock = (label, value, gap = 18) => {
      const lines = doc.splitTextToSize(String(value || ''), width);
      doc.setFont('helvetica', 'bold');
      doc.text(String(label || ''), margin, y);
      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.text(lines, margin, y);
      y += (lines.length * 14) + gap;

      if (y > 760) {
        doc.addPage();
        y = margin;
      }
    };

    doc.setFontSize(18);
    doc.text('GrindForge AI Interview Simulation Transcript', margin, y);
    y += 26;

    doc.setFontSize(11);
    writeBlock('Session', `Difficulty: ${session.difficulty} | Round: ${session.roundType} | Completed: ${new Date(session.completedAt || Date.now()).toLocaleString()}`);
    writeBlock('Overall Score', `${session?.overall?.score10 || 0}/10 (${session?.overall?.score100 || 0}/100)`);
    writeBlock('Overall Summary', session?.overall?.summary || '');
    writeBlock('Weaknesses', (session?.overall?.weaknesses || []).join(', ') || 'None identified');

    (session.questions || []).forEach((question, index) => {
      writeBlock(`Q${index + 1} (${question.roundType})`, question.prompt || '');
      writeBlock('Your Answer', asText(question.answerRichText) || question.answerText || '[No text answer provided]');
      if (question.answerCode) {
        writeBlock('Your Code', question.answerCode);
      }
      writeBlock('AI Rating', `${question.rating || 0}/10`);
      writeBlock('Gaps', (question.gaps || []).join(' | ') || 'No gaps reported');
      writeBlock('Suggested Better Answer', question.improvedAnswer || '');
    });

    doc.save(`grindforge-interview-sim-${session.simulationId || Date.now()}.pdf`);
  };

  return (
    <section className="interview-sim-module">
      <section className="panel interview-sim-config">
        <div className="panel__head">
          <h2>AI Interview Simulator</h2>
          <p>Gemini-powered interviewer with one-question-at-a-time feedback</p>
        </div>

        <div className="interview-sim-controls">
          <label className="field">
            <span>Difficulty</span>
            <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
              {DIFFICULTY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Round Type</span>
            <select value={roundType} onChange={(event) => setRoundType(event.target.value)}>
              {ROUND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>

          <label className="interview-sim-toggle">
            <input
              type="checkbox"
              checked={includeCode}
              onChange={(event) => setIncludeCode(event.target.checked)}
            />
            <span>Include Code Editor</span>
          </label>

          <button type="button" className="button" onClick={onStart} disabled={loading || submitting}>
            {loading ? 'Starting...' : 'Start New Simulation'}
          </button>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}
        {status ? <p className="status-banner">{status}</p> : null}
      </section>

      <section className="interview-sim-layout">
        <section className="panel interview-sim-session">
          <div className="panel__head">
            <h3>Live Session</h3>
            <p>{session ? `${session.currentQuestionIndex}/${session.totalQuestions} answered` : 'No active session yet'}</p>
          </div>

          {session ? (
            <>
              <div className="interview-sim-session-meta">
                <span>Difficulty: {session.difficulty}</span>
                <span>Round: {session.roundType}</span>
                <span>Status: {session.status}</span>
              </div>

              {currentQuestion ? (
                <article className="interview-question-card">
                  <h4>Question {currentQuestion.questionNumber} ({currentQuestion.roundType})</h4>
                  <p>{currentQuestion.prompt}</p>
                </article>
              ) : null}

              {session.status !== 'completed' ? (
                <>
                  <div className="interview-rich-toolbar">
                    <button type="button" className="button ghost" onClick={() => applyFormat('bold')}>Bold</button>
                    <button type="button" className="button ghost" onClick={() => applyFormat('italic')}>Italic</button>
                    <button type="button" className="button ghost" onClick={() => applyFormat('insertUnorderedList')}>Bullet List</button>
                  </div>

                  <div
                    ref={answerBoxRef}
                    className="interview-rich-answer"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(event) => setAnswerRichText(event.currentTarget.innerHTML)}
                    data-placeholder="Write your interview answer here..."
                  />

                  {includeCode ? (
                    <div className="interview-code-editor">
                      <Editor
                        height="280px"
                        defaultLanguage="javascript"
                        language="javascript"
                        value={codeAnswer}
                        onMount={(editor) => {
                          editorRef.current = editor;
                        }}
                        onChange={(value) => setCodeAnswer(String(value || ''))}
                        theme="vs-dark"
                        options={{
                          minimap: { enabled: false },
                          fontSize: 13,
                          wordWrap: 'on',
                        }}
                      />
                    </div>
                  ) : null}

                  <div className="interview-submit-row">
                    <button
                      type="button"
                      className="button"
                      disabled={submitting || !canSubmit}
                      onClick={onSubmitAnswer}
                    >
                      {submitting ? 'Submitting...' : 'Submit Answer'}
                    </button>
                  </div>
                </>
              ) : (
                <div className="interview-complete-panel">
                  <h4>Simulation Completed</h4>
                  <p>Overall score: <strong>{session?.overall?.score10 || 0}/10</strong></p>
                  <p>{session?.overall?.summary || ''}</p>
                  {session?.reward?.xpAwarded ? (
                    <p className="status-banner">Reward applied: +{session.reward.xpAwarded} XP and mock checkbox auto-ticked.</p>
                  ) : null}
                  <button type="button" className="button button-secondary" onClick={onDownloadPdf}>
                    Download PDF Transcript
                  </button>
                </div>
              )}

              {lastAnswered ? (
                <section className="interview-feedback-card">
                  <h4>Latest AI Feedback</h4>
                  <p className="interview-rating">Rating: <strong>{lastAnswered.rating || 0}/10</strong></p>
                  <p><strong>Gaps:</strong> {(lastAnswered.gaps || []).join(' | ') || 'No gaps listed.'}</p>
                  <p><strong>Better Answer:</strong> {lastAnswered.improvedAnswer || 'No suggestion provided.'}</p>
                </section>
              ) : null}
            </>
          ) : (
            <p className="empty-text">Start a simulation to begin an interactive interview round.</p>
          )}
        </section>

        <section className="panel interview-sim-history">
          <div className="panel__head">
            <h3>Past Simulations</h3>
            <p>Stored in Mongo with score and weaknesses</p>
          </div>

          {historyLoading ? <p className="loading">Loading history...</p> : null}

          {!historyLoading && history.length ? (
            <div className="interview-history-list">
              {history.map((item) => (
                <article key={item.simulationId} className="interview-history-item">
                  <div>
                    <strong>{new Date(item.createdAt).toLocaleString()}</strong>
                    <p>{item.roundType} · {item.difficulty} · {item.status}</p>
                    <p>Score: {item.score10 || 0}/10</p>
                    <p>Weaknesses: {(item.weaknesses || []).join(', ') || 'none'}</p>
                  </div>
                  <button
                    type="button"
                    className="button ghost"
                    onClick={() => onLoadSession(item.simulationId)}
                  >
                    Open
                  </button>
                </article>
              ))}
            </div>
          ) : null}

          {!historyLoading && !history.length ? (
            <p className="empty-text">No interview simulations yet.</p>
          ) : null}
        </section>
      </section>
    </section>
  );
}

export default InterviewSimulatorModule;
