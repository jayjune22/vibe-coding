require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/generate', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: 'API 키가 설정되지 않았습니다. .env 파일에 ANTHROPIC_API_KEY를 추가해 주세요.',
    });
  }

  const { productName, features, targetCustomer } = req.body;

  if (!productName || !targetCustomer) {
    return res.status(400).json({
      error: '상품명과 타겟 고객을 입력해 주세요.',
    });
  }

  const featureLines = Array.isArray(features)
    ? features
    : (features || '')
        .toString()
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

  if (featureLines.length < 1) {
    return res.status(400).json({
      error: '특징을 최소 1개 이상 입력해 주세요.',
    });
  }

  const prompt = `당신은 이커머스 상품 상세페이지 카피라이터입니다.
아래 정보를 바탕으로 매력적이고 구매 욕구를 자극하는 상품 상세페이지 문구를 작성해 주세요.

【상품 정보】
- 상품명: ${productName}
- 주요 특징:
${featureLines.map((f) => `  • ${f}`).join('\n')}
- 타겟 고객: ${targetCustomer}

【요청 사항】
- 헤드라인, 상품 소개, 특징 설명, 타겟 고객 맞춤 메시지가 담긴 완성도 높은 상세페이지 문구를 작성해 주세요.
- 문구는 마크다운 없이 일반 텍스트로, 자연스럽고 읽기 쉽게 작성해 주세요.
- 300~500자 내외로 작성해 주세요.`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || data.message || `API 오류 (${response.status})`,
      });
    }

    const text = data.content?.[0]?.text || '';
    if (!text) {
      return res.status(500).json({ error: '생성된 문구가 없습니다.' });
    }

    res.json({ text: text.trim() });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: err.message || '서버 오류가 발생했습니다.',
    });
  }
});

app.listen(PORT, () => {
  console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
  console.log(`AI 생성기: http://localhost:${PORT}/ai-generator.html`);
});
