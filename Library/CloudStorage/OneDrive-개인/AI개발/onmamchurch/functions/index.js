'use strict';

const functions = require('firebase-functions');

const LAAS_API_URL =
  process.env.LAAS_API_URL ||
  'https://api-laas.wanted.co.kr/api/preset/v2/chat/completions';

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function removeMarkdown(text) {
  return String(text || '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/^\s*\d+\.\s+/gm, '• ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function truncateForKakao(text, maxLength = 1000) {
  const normalized = String(text || '').trim();
  if (!normalized) {
    return '응답을 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.';
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1)}…`;
}

function buildSimpleText(text) {
  return {
    version: '2.0',
    template: {
      outputs: [
        {
          simpleText: {
            text: truncateForKakao(text),
          },
        },
      ],
    },
  };
}

function buildDeferredResponse(message) {
  return {
    version: '2.0',
    useCallback: true,
    data: {
      text: message,
    },
  };
}

async function callLaaSAPI(userMessage) {
  const projectId = getRequiredEnv('LAAS_PROJECT_ID');
  const apiKey = getRequiredEnv('LAAS_API_KEY');
  const hash = getRequiredEnv('LAAS_HASH');
  const systemPrompt = process.env.LAAS_APPEND_PROMPT || '';

  const content = [userMessage, systemPrompt].filter(Boolean).join('\n\n');

  const response = await fetch(LAAS_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      project: projectId,
      apiKey: apiKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content,
        },
      ],
      hash,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LaaS request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const contentText = data?.choices?.[0]?.message?.content;

  if (!contentText) {
    throw new Error('LaaS response did not include message content.');
  }

  return truncateForKakao(removeMarkdown(contentText));
}

async function sendCallback(callbackUrl, payload) {
  const response = await fetch(callbackUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Callback failed: ${response.status} ${errorText}`);
  }
}

async function processLaaSAndCallback(userMessage, callbackUrl, userId) {
  try {
    functions.logger.info('Processing request', { userId });
    const answer = await callLaaSAPI(userMessage);
    await sendCallback(callbackUrl, buildSimpleText(answer));
    functions.logger.info('Callback sent', { userId });
  } catch (error) {
    functions.logger.error('Failed to process callback flow', {
      userId,
      error: error.message,
    });

    try {
      await sendCallback(
        callbackUrl,
        buildSimpleText(
          '죄송합니다. 답변을 생성하는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.'
        )
      );
    } catch (callbackError) {
      functions.logger.error('Failed to send fallback callback', {
        userId,
        error: callbackError.message,
      });
    }
  }
}

exports.kakaobot = functions
  .region(process.env.FUNCTION_REGION || 'asia-northeast3')
  .runWith({
    timeoutSeconds: 60,
    memory: '256MB',
  })
  .https.onRequest(async (req, res) => {
    if (req.method !== 'POST') {
      res.status(405).json(buildSimpleText('POST 요청만 지원합니다.'));
      return;
    }

    try {
      const userMessage = req.body?.userRequest?.utterance;
      const callbackUrl = req.body?.userRequest?.callbackUrl;
      const userId = req.body?.userRequest?.user?.id || 'anonymous';

      if (!userMessage || !callbackUrl) {
        res
          .status(200)
          .json(buildSimpleText('요청 형식이 올바르지 않습니다. 다시 시도해 주세요.'));
        return;
      }

      res.status(200).json(
        buildDeferredResponse(
          process.env.KAKAO_PENDING_MESSAGE ||
            '답변을 생성하고 있습니다. 잠시만 기다려 주세요.'
        )
      );

      await processLaaSAndCallback(userMessage, callbackUrl, userId);
    } catch (error) {
      functions.logger.error('Initial request failed', { error: error.message });
      res
        .status(200)
        .json(buildSimpleText('죄송합니다. 요청을 처리하는 중 오류가 발생했습니다.'));
    }
  });
