const InterviewSimulation = require('../models/InterviewSimulation');
const { env } = require('../config/env');
const { createHttpError } = require('../utils/httpError');
const { ensureProfileById, rewardSimulationQuestCompletion } = require('./rpgService');
const {
  SIM_DIFFICULTY,
  SIM_DIFFICULTY_ORDER,
  SIM_ROUND_TYPE,
  SIM_ROUND_TYPE_ORDER,
  SIM_STATUS,
  SIM_TOTAL_QUESTIONS,
  SIM_XP_REWARD,
} = require('../constants/interviewSimulator');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const asString = (value, fallback = '') => {
  const next = String(value || '').trim();
  return next || fallback;
};

const sanitizeTextArray = (value, maxItems = 6) => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asString(item))
    .filter(Boolean)
    .slice(0, maxItems);
};

const safeJsonParse = (value) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const extractJsonObject = (content) => {
  const trimmed = String(content || '').trim();
  if (!trimmed) {
    return null;
  }

  const direct = safeJsonParse(trimmed);
  if (direct && typeof direct === 'object') {
    return direct;
  }

  const blockMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/i);
  if (blockMatch?.[1]) {
    const parsed = safeJsonParse(blockMatch[1]);
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return safeJsonParse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  return null;
};

const stripHtml = (value) =>
  String(value || '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeDifficulty = (value) =>
  SIM_DIFFICULTY_ORDER.includes(String(value || '').trim().toLowerCase())
    ? String(value).trim().toLowerCase()
    : SIM_DIFFICULTY.MEDIUM;

const normalizeRoundType = (value) =>
  SIM_ROUND_TYPE_ORDER.includes(String(value || '').trim().toLowerCase())
    ? String(value).trim().toLowerCase()
    : SIM_ROUND_TYPE.MIXED;

const resolveRoundForQuestion = (simulationRoundType, questionNumber) => {
  if (simulationRoundType !== SIM_ROUND_TYPE.MIXED) {
    return simulationRoundType;
  }

  const ordered = [
    SIM_ROUND_TYPE.CODING,
    SIM_ROUND_TYPE.LLD,
    SIM_ROUND_TYPE.BEHAVIORAL,
    SIM_ROUND_TYPE.CODING,
  ];

  return ordered[(questionNumber - 1) % ordered.length];
};

const fallbackQuestionByRound = (roundType, difficulty, questionNumber) => {
  if (roundType === SIM_ROUND_TYPE.CODING) {
    if (difficulty === SIM_DIFFICULTY.HARD) {
      return `Question ${questionNumber}: Design an algorithm to find the shortest transformation sequence between two words where each step changes one character and every intermediate word must exist in a dictionary. Explain complexity and edge cases.`;
    }

    if (difficulty === SIM_DIFFICULTY.EASY) {
      return `Question ${questionNumber}: Given an array of integers, return the first pair that sums to a target. Explain your approach and trade-offs between brute force and hash map.`;
    }

    return `Question ${questionNumber}: Implement an LRU cache supporting get and put in O(1). Explain data structures and complexity.`;
  }

  if (roundType === SIM_ROUND_TYPE.LLD) {
    if (difficulty === SIM_DIFFICULTY.HARD) {
      return `Question ${questionNumber}: Design a low-level architecture for a rate-limited notification system with retry policies, channel prioritization, and observability hooks.`;
    }

    if (difficulty === SIM_DIFFICULTY.EASY) {
      return `Question ${questionNumber}: Design a low-level model for a task manager app supporting tasks, tags, and due dates. Explain classes and responsibilities.`;
    }

    return `Question ${questionNumber}: Design a low-level architecture for a parking lot system with multiple vehicle types, pricing strategy, and slot allocation.`;
  }

  if (difficulty === SIM_DIFFICULTY.HARD) {
    return `Question ${questionNumber}: Tell me about a time you had to challenge a senior decision with limited data. How did you balance bias for action and earning trust?`;
  }

  if (difficulty === SIM_DIFFICULTY.EASY) {
    return `Question ${questionNumber}: Tell me about a project where you learned something quickly and delivered impact.`;
  }

  return `Question ${questionNumber}: Describe a time you disagreed with a teammate, how you handled it, and what changed afterward.`;
};

const buildQuestionPrompt = ({ difficulty, roundType, questionNumber, previousQuestions = [] }) => {
  const styleGuide = [
    'Act as a strict but fair interviewer from Amazon or Google.',
    'Anchor behavioral framing to leadership principles (ownership, customer obsession, bias for action, earn trust).',
    'Return strict JSON only with key: question.',
    'Question must be one item only, concise but deep, and interview-realistic.',
    'No markdown, no bullets, no code fences.',
  ].join(' ');

  return [
    styleGuide,
    `Difficulty: ${difficulty}.`,
    `Round type: ${roundType}.`,
    `Question number: ${questionNumber} out of ${SIM_TOTAL_QUESTIONS}.`,
    `Do not repeat previous questions: ${JSON.stringify(previousQuestions)}.`,
  ].join(' ');
};

const buildEvaluationPrompt = ({ difficulty, roundType, question, answerText, answerCode }) => {
  const schema = {
    rating: 'number from 1 to 10',
    gaps: 'array of up to 4 concise strings',
    betterAnswer: 'string under 900 chars',
    weaknesses: 'array of up to 4 lowercase weakness tags',
  };

  return [
    'You are a staff-level interviewer at Amazon/Google assessing an interview answer.',
    'Use leadership principles in feedback where relevant.',
    'Return strict JSON only and follow schema exactly.',
    `Schema: ${JSON.stringify(schema)}.`,
    `Difficulty: ${difficulty}. Round: ${roundType}.`,
    `Question: ${question}.`,
    `Answer text: ${answerText || '[empty]'}.`,
    `Answer code: ${answerCode || '[none]'}.`,
  ].join(' ');
};

const callGeminiText = async (prompt) => {
  if (env.aiCoachFallbackOnly || !env.geminiApiKey) {
    throw createHttpError(503, 'Gemini is unavailable in fallback mode');
  }

  const timeoutController = new AbortController();
  const timeoutHandle = setTimeout(() => timeoutController.abort(), env.geminiTimeoutMs);

  try {
    const response = await fetch(
      `${env.geminiBaseUrl}/models/${env.geminiModel}:generateContent?key=${encodeURIComponent(env.geminiApiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 1100,
          },
        }),
        signal: timeoutController.signal,
      },
    );

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw createHttpError(response.status || 502, payload?.error?.message || 'Gemini request failed');
    }

    const text = (payload?.candidates?.[0]?.content?.parts || [])
      .map((part) => part?.text || '')
      .join('\n')
      .trim();

    if (!text) {
      throw createHttpError(502, 'Gemini response was empty');
    }

    return text;
  } finally {
    clearTimeout(timeoutHandle);
  }
};

const generateQuestion = async ({ difficulty, roundType, questionNumber, previousQuestions = [] }) => {
  try {
    const raw = await callGeminiText(
      buildQuestionPrompt({
        difficulty,
        roundType,
        questionNumber,
        previousQuestions,
      }),
    );

    const parsed = extractJsonObject(raw);
    const question = asString(parsed?.question, asString(raw, ''));
    if (!question) {
      throw createHttpError(502, 'Invalid Gemini question output');
    }

    return question;
  } catch {
    return fallbackQuestionByRound(roundType, difficulty, questionNumber);
  }
};

const fallbackEvaluation = ({ answerText, answerCode, questionRound }) => {
  const textLength = asString(answerText).length;
  const codeLength = asString(answerCode).length;

  let rating = 4;
  if (textLength > 140) {
    rating += 2;
  }
  if (textLength > 300) {
    rating += 1;
  }
  if (questionRound === SIM_ROUND_TYPE.CODING && codeLength > 80) {
    rating += 2;
  }

  rating = clamp(rating, 1, 10);

  return {
    rating,
    gaps: [
      'Answer can be more structured with a clearer opening summary.',
      questionRound === SIM_ROUND_TYPE.CODING
        ? 'Mention complexity and edge-case handling explicitly.'
        : 'Tie outcomes to measurable impact and decision reasoning.',
      'Add a concise closing statement on trade-offs and next steps.',
    ],
    betterAnswer:
      'Start with context, explain your approach step-by-step, include trade-offs and measurable impact, then end with what you would improve in a second iteration.',
    weaknesses: questionRound === SIM_ROUND_TYPE.CODING
      ? ['complexity-clarity', 'edge-cases', 'communication-structure']
      : ['impact-quantification', 'story-structure', 'principle-alignment'],
  };
};

const evaluateAnswer = async ({ difficulty, roundType, question, answerText, answerCode }) => {
  try {
    const raw = await callGeminiText(
      buildEvaluationPrompt({
        difficulty,
        roundType,
        question,
        answerText,
        answerCode,
      }),
    );

    const parsed = extractJsonObject(raw);
    if (!parsed || typeof parsed !== 'object') {
      throw createHttpError(502, 'Invalid Gemini evaluation output');
    }

    return {
      rating: clamp(Number(parsed.rating) || 0, 1, 10),
      gaps: sanitizeTextArray(parsed.gaps, 4),
      betterAnswer: asString(parsed.betterAnswer, ''),
      weaknesses: sanitizeTextArray(parsed.weaknesses, 4).map((item) => item.toLowerCase()),
    };
  } catch {
    return fallbackEvaluation({ answerText, answerCode, questionRound: roundType });
  }
};

const summarizeSimulation = (simulation) => {
  const ratings = (simulation.questions || [])
    .map((item) => Number(item.rating) || 0)
    .filter((item) => item > 0);

  const overall10 = ratings.length
    ? Number((ratings.reduce((sum, item) => sum + item, 0) / ratings.length).toFixed(2))
    : 0;

  const weaknessMap = new Map();
  (simulation.questions || []).forEach((item) => {
    (item.weaknesses || []).forEach((weakness) => {
      const key = asString(weakness).toLowerCase();
      if (!key) {
        return;
      }

      weaknessMap.set(key, (weaknessMap.get(key) || 0) + 1);
    });
  });

  const weaknesses = [...weaknessMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map((entry) => entry[0]);

  const summary = overall10 >= 8
    ? 'Strong performance with good interview readiness signals.'
    : overall10 >= 6
      ? 'Solid baseline with clear room for sharper structure and depth.'
      : 'Foundational progress, but consistency and clarity need focused practice.';

  return {
    overallScore10: overall10,
    overallScore100: Math.round(overall10 * 10),
    overallSummary: summary,
    weaknesses,
  };
};

const toPublicQuestion = (question) => ({
  questionNumber: question.questionNumber,
  roundType: question.roundType,
  prompt: question.prompt,
  answerRichText: question.answerRichText || '',
  answerText: question.answerText || '',
  answerCode: question.answerCode || '',
  rating: question.rating || null,
  gaps: question.gaps || [],
  improvedAnswer: question.improvedAnswer || '',
  weaknesses: question.weaknesses || [],
});

const toPublicSimulation = (simulation, reward = null) => {
  const currentQuestion = simulation.status === SIM_STATUS.ACTIVE
    ? simulation.questions[simulation.currentQuestionIndex] || null
    : null;

  return {
    simulationId: simulation._id,
    difficulty: simulation.difficulty,
    roundType: simulation.roundType,
    status: simulation.status,
    totalQuestions: simulation.totalQuestions,
    currentQuestionIndex: simulation.currentQuestionIndex,
    currentQuestion: currentQuestion
      ? {
        questionNumber: currentQuestion.questionNumber,
        roundType: currentQuestion.roundType,
        prompt: currentQuestion.prompt,
      }
      : null,
    questions: (simulation.questions || []).map((item) => toPublicQuestion(item)),
    overall: simulation.status === SIM_STATUS.COMPLETED
      ? {
        score10: simulation.overallScore10,
        score100: simulation.overallScore100,
        summary: simulation.overallSummary,
        weaknesses: simulation.weaknesses || [],
      }
      : null,
    completedAt: simulation.completedAt || null,
    createdAt: simulation.createdAt,
    reward,
  };
};

const createSimulation = async (userId, payload = {}) => {
  await ensureProfileById(userId);

  const difficulty = normalizeDifficulty(payload.difficulty);
  const roundType = normalizeRoundType(payload.roundType);
  const firstRound = resolveRoundForQuestion(roundType, 1);
  const firstQuestion = await generateQuestion({
    difficulty,
    roundType: firstRound,
    questionNumber: 1,
    previousQuestions: [],
  });

  const simulation = await InterviewSimulation.create({
    userId,
    difficulty,
    roundType,
    status: SIM_STATUS.ACTIVE,
    totalQuestions: SIM_TOTAL_QUESTIONS,
    currentQuestionIndex: 0,
    questions: [
      {
        questionNumber: 1,
        roundType: firstRound,
        prompt: firstQuestion,
      },
    ],
  });

  return toPublicSimulation(simulation.toObject());
};

const getSimulationHistory = async (userId, options = {}) => {
  await ensureProfileById(userId);

  const limit = clamp(Number(options.limit) || 20, 1, 100);

  const items = await InterviewSimulation.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return items.map((item) => ({
    simulationId: item._id,
    createdAt: item.createdAt,
    completedAt: item.completedAt,
    difficulty: item.difficulty,
    roundType: item.roundType,
    status: item.status,
    score10: item.overallScore10 || 0,
    score100: item.overallScore100 || 0,
    weaknesses: item.weaknesses || [],
  }));
};

const getSimulationById = async (userId, simulationId) => {
  const simulation = await InterviewSimulation.findOne({ _id: simulationId, userId }).lean();
  if (!simulation) {
    throw createHttpError(404, 'Simulation session not found');
  }

  return toPublicSimulation(simulation);
};

const answerSimulationQuestion = async (userId, simulationId, payload = {}) => {
  await ensureProfileById(userId);

  const simulation = await InterviewSimulation.findOne({ _id: simulationId, userId });
  if (!simulation) {
    throw createHttpError(404, 'Simulation session not found');
  }

  if (simulation.status !== SIM_STATUS.ACTIVE) {
    throw createHttpError(400, 'Simulation is already completed');
  }

  const currentIndex = Number(simulation.currentQuestionIndex) || 0;
  const currentQuestion = simulation.questions[currentIndex];
  if (!currentQuestion) {
    throw createHttpError(400, 'Current question is unavailable');
  }

  const answerRichText = asString(payload.answerRichText, '');
  const answerCode = asString(payload.answerCode, '');
  const answerText = stripHtml(answerRichText);

  if (!answerText && !answerCode) {
    throw createHttpError(400, 'Answer text or code is required');
  }

  const evaluation = await evaluateAnswer({
    difficulty: simulation.difficulty,
    roundType: currentQuestion.roundType,
    question: currentQuestion.prompt,
    answerText,
    answerCode,
  });

  currentQuestion.answerRichText = answerRichText;
  currentQuestion.answerText = answerText;
  currentQuestion.answerCode = answerCode;
  currentQuestion.rating = evaluation.rating;
  currentQuestion.gaps = evaluation.gaps;
  currentQuestion.improvedAnswer = evaluation.betterAnswer;
  currentQuestion.weaknesses = evaluation.weaknesses;

  let reward = null;

  if (currentIndex + 1 >= simulation.totalQuestions) {
    const summary = summarizeSimulation(simulation);

    simulation.status = SIM_STATUS.COMPLETED;
    simulation.currentQuestionIndex = simulation.totalQuestions;
    simulation.overallScore10 = summary.overallScore10;
    simulation.overallScore100 = summary.overallScore100;
    simulation.overallSummary = summary.overallSummary;
    simulation.weaknesses = summary.weaknesses;
    simulation.completedAt = new Date();

    if (!simulation.rewardXpGranted) {
      reward = await rewardSimulationQuestCompletion(userId, {
        xpBonus: SIM_XP_REWARD,
      });
      simulation.rewardXpGranted = true;
    }
  } else {
    const nextQuestionNumber = currentIndex + 2;
    const nextRound = resolveRoundForQuestion(simulation.roundType, nextQuestionNumber);
    const nextPrompt = await generateQuestion({
      difficulty: simulation.difficulty,
      roundType: nextRound,
      questionNumber: nextQuestionNumber,
      previousQuestions: simulation.questions.map((item) => item.prompt),
    });

    simulation.questions.push({
      questionNumber: nextQuestionNumber,
      roundType: nextRound,
      prompt: nextPrompt,
    });

    simulation.currentQuestionIndex = currentIndex + 1;
  }

  await simulation.save();

  return toPublicSimulation(simulation.toObject(), reward ? {
    xpAwarded: SIM_XP_REWARD,
    mockInterviewChecked: true,
    profile: reward.profile,
    todayQuest: reward.quest,
    level: reward.level,
    rank: reward.rank,
    leaderboard: reward.leaderboard,
  } : null);
};

module.exports = {
  answerSimulationQuestion,
  createSimulation,
  getSimulationById,
  getSimulationHistory,
};
