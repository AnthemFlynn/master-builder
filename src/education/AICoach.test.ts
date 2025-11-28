import { describe, it, expect, vi, beforeEach } from 'vitest';
import AICoach, { CoachConfig } from './AICoach';
import { BlockData } from '../game/BlockManager';
import { MaterialType } from '../game/Materials';

// Mock the Anthropic SDK
const mockCreate = vi.fn();
const mockStream = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  class MockAPIError extends Error {
    status: number;
    error: any;
    headers: any;
    constructor(status: number, error: any, message?: string, headers?: any) {
      super(message || String(status));
      this.status = status;
      this.error = error;
      this.headers = headers;
      this.name = 'APIError';
    }
  }

  return {
    default: class MockAnthropic {
      messages = {
        create: mockCreate,
        stream: mockStream,
      };
    },
    APIError: MockAPIError,
  };
});

describe('AICoach', () => {
  let coach: AICoach;
  const testApiKey = 'test-api-key';

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mock responses
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: 'Mock response from Master Aldric',
        },
      ],
    });
  });

  describe('Constructor', () => {
    it('should create an AICoach instance with valid config', () => {
      expect(() => {
        coach = new AICoach({ apiKey: testApiKey });
      }).not.toThrow();
    });

    it('should throw error when API key is missing', () => {
      expect(() => {
        new AICoach({ apiKey: '' });
      }).toThrow('API key is required');
    });

    it('should use default values for optional config', () => {
      coach = new AICoach({ apiKey: testApiKey });
      expect(coach).toBeDefined();
    });

    it('should accept custom config values', () => {
      const config: CoachConfig = {
        apiKey: testApiKey,
        modelName: 'claude-3-opus-20240229',
        maxTokens: 1000,
        temperature: 0.9,
      };

      expect(() => {
        coach = new AICoach(config);
      }).not.toThrow();
    });
  });

  describe('analyzeBuild', () => {
    beforeEach(() => {
      coach = new AICoach({ apiKey: testApiKey });
    });

    it('should analyze a simple build with JSON response', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.OakWood },
      ];

      const mockAnalysis = {
        summary: 'Great start on your tower!',
        strengths: ['Nice use of cobblestone for the foundation', 'Good height'],
        suggestions: ['Try adding more variety in materials'],
        concepts: ['Structural stability', 'Material selection'],
      };

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify(mockAnalysis),
          },
        ],
      });

      const result = await coach.analyzeBuild(blocks);

      expect(result).toEqual(mockAnalysis);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          temperature: 0.7,
        })
      );
    });

    it('should handle build analysis with context', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Brick },
      ];

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Nice brick placement!',
              strengths: ['Good start'],
              suggestions: ['Keep building'],
              concepts: ['Foundation basics'],
            }),
          },
        ],
      });

      const context = 'Student is building their first castle';
      const result = await coach.analyzeBuild(blocks, context);

      expect(result.summary).toBeDefined();
      expect(mockCreate).toHaveBeenCalled();

      // Check that context was included in the prompt
      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(context);
    });

    it('should calculate build statistics correctly', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
        { position: { x: 2, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.OakWood },
        { position: { x: 0, y: 2, z: 0 }, materialType: MaterialType.OakWood },
      ];

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Excellent build!',
              strengths: ['Great variety', 'Nice height'],
              suggestions: ['Try symmetry'],
              concepts: ['Balance', 'Materials'],
            }),
          },
        ],
      });

      await coach.analyzeBuild(blocks);

      const callArgs = mockCreate.mock.calls[0][0];
      const prompt = callArgs.messages[0].content;

      // Verify statistics in prompt
      expect(prompt).toContain('Total blocks: 5');
      expect(prompt).toContain('Height: 3');
      expect(prompt).toContain('Cobblestone');
      expect(prompt).toContain('OakWood');
      expect(prompt).toContain('Brick');
    });

    it('should handle empty build gracefully', async () => {
      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Ready to start building!',
              strengths: [],
              suggestions: ['Place your first block!'],
              concepts: ['Getting started'],
            }),
          },
        ],
      });

      const result = await coach.analyzeBuild([]);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should fallback to text parsing if JSON parsing fails', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Gold },
      ];

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Great work! You built something amazing with gold blocks!',
          },
        ],
      });

      const result = await coach.analyzeBuild(blocks);

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(Array.isArray(result.strengths)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
      expect(Array.isArray(result.concepts)).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Brick },
      ];

      mockCreate.mockRejectedValue(new Error('Network error'));

      await expect(coach.analyzeBuild(blocks)).rejects.toThrow(
        'Failed to analyze build'
      );
    });
  });

  describe('askQuestion', () => {
    beforeEach(() => {
      coach = new AICoach({ apiKey: testApiKey });
    });

    it('should answer a student question', async () => {
      const question = 'How do I make my tower stronger?';
      const answer = 'Great question! Make your tower stronger by building a wide base...';

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: answer }],
      });

      const result = await coach.askQuestion(question);

      expect(result).toBe(answer);
      expect(mockCreate).toHaveBeenCalled();

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(question);
    });

    it('should handle errors when answering questions', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      await expect(coach.askQuestion('test question')).rejects.toThrow(
        'Failed to answer question'
      );
    });
  });

  describe('provideTip', () => {
    beforeEach(() => {
      coach = new AICoach({ apiKey: testApiKey });
    });

    it('should provide a general tip when no topic specified', async () => {
      const tip = 'Here\'s a great tip: Always start with a strong foundation!';

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: tip }],
      });

      const result = await coach.provideTip();

      expect(result).toBe(tip);
    });

    it('should provide a symmetry tip', async () => {
      const tip = 'Symmetry tip: Try mirroring your design on both sides!';

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: tip }],
      });

      const result = await coach.provideTip('symmetry');

      expect(result).toBe(tip);
      expect(mockCreate).toHaveBeenCalled();

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain('symmetrical');
    });

    it('should provide a stability tip', async () => {
      const tip = 'Stability tip: Wide bases prevent toppling!';

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: tip }],
      });

      const result = await coach.provideTip('stability');

      expect(result).toBe(tip);
    });

    it('should provide a materials tip', async () => {
      const tip = 'Materials tip: Mix different materials for interesting designs!';

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: tip }],
      });

      const result = await coach.provideTip('materials');

      expect(result).toBe(tip);
    });

    it('should provide a design tip', async () => {
      const tip = 'Design tip: Add details like windows and doors!';

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: tip }],
      });

      const result = await coach.provideTip('design');

      expect(result).toBe(tip);
    });

    it('should handle errors when providing tips', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      await expect(coach.provideTip()).rejects.toThrow('Failed to provide tip');
    });
  });

  describe('explainConcept', () => {
    beforeEach(() => {
      coach = new AICoach({ apiKey: testApiKey });
    });

    it('should explain a concept in age-appropriate language', async () => {
      const concept = 'cantilever';
      const explanation =
        'A cantilever is like a diving board - it sticks out from a building...';

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: explanation }],
      });

      const result = await coach.explainConcept(concept);

      expect(result).toBe(explanation);
      expect(mockCreate).toHaveBeenCalled();

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(concept);
      expect(callArgs.messages[0].content).toContain('9-12 year old');
    });

    it('should handle errors when explaining concepts', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      await expect(coach.explainConcept('symmetry')).rejects.toThrow(
        'Failed to explain concept'
      );
    });
  });

  describe('celebrateSuccess', () => {
    beforeEach(() => {
      coach = new AICoach({ apiKey: testApiKey });
    });

    it('should celebrate a student achievement', async () => {
      const achievement = 'Built a tower 10 blocks tall';
      const celebration = 'Wow! 10 blocks tall! You\'re becoming a master builder!';

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: celebration }],
      });

      const result = await coach.celebrateSuccess(achievement);

      expect(result).toBe(celebration);
      expect(mockCreate).toHaveBeenCalled();

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.messages[0].content).toContain(achievement);
    });

    it('should handle errors when celebrating', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      await expect(coach.celebrateSuccess('test achievement')).rejects.toThrow(
        'Failed to celebrate success'
      );
    });
  });

  describe('streamResponse', () => {
    beforeEach(() => {
      coach = new AICoach({ apiKey: testApiKey });
    });

    it('should stream response chunks', async () => {
      const chunks = ['Hello', ' there', ' student', '!'];

      // Mock async iterator
      const mockAsyncIterator = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield {
              type: 'content_block_delta',
              delta: {
                type: 'text_delta',
                text: chunk,
              },
            };
          }
        },
      };

      mockStream.mockResolvedValue(mockAsyncIterator);

      const receivedChunks: string[] = [];
      for await (const chunk of coach.streamResponse('test prompt')) {
        receivedChunks.push(chunk);
      }

      expect(receivedChunks).toEqual(chunks);
      expect(mockStream).toHaveBeenCalled();
    });

    it('should handle streaming errors', async () => {
      mockStream.mockRejectedValue(new Error('Streaming error'));

      const generator = coach.streamResponse('test prompt');

      await expect(async () => {
        await generator.next();
      }).rejects.toThrow();
    });
  });

  describe('Conversation History', () => {
    beforeEach(() => {
      coach = new AICoach({ apiKey: testApiKey });
    });

    it('should maintain conversation history', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response 1' }],
      });

      await coach.askQuestion('Question 1');

      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response 2' }],
      });

      await coach.askQuestion('Question 2');

      // Check that history is being used
      const callArgs = mockCreate.mock.calls[1][0];
      expect(callArgs.messages.length).toBeGreaterThan(1);
    });

    it('should clear conversation history', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
      });

      await coach.askQuestion('Question 1');
      coach.clearHistory();

      await coach.askQuestion('Question 2');

      // After clearing, only the new question should be in messages
      const callArgs = mockCreate.mock.calls[1][0];
      expect(callArgs.messages.length).toBe(1);
    });

    it('should limit history to max length', async () => {
      mockCreate.mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
      });

      // Ask 15 questions (more than max of 10)
      for (let i = 0; i < 15; i++) {
        await coach.askQuestion(`Question ${i}`);
      }

      // History should be limited
      const callArgs = mockCreate.mock.calls[14][0];
      // Should have at most 11 messages (10 from history + 1 new)
      expect(callArgs.messages.length).toBeLessThanOrEqual(11);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      coach = new AICoach({ apiKey: testApiKey });
    });

    it('should handle 401 authentication errors', async () => {
      const { APIError } = await import('@anthropic-ai/sdk');
      const apiError = new APIError(401, { message: 'Unauthorized' }, 'Unauthorized', undefined);
      mockCreate.mockRejectedValue(apiError);

      await expect(coach.askQuestion('test')).rejects.toThrow('Invalid API key');
    });

    it('should handle 429 rate limit errors', async () => {
      const { APIError } = await import('@anthropic-ai/sdk');
      const apiError = new APIError(429, { message: 'Rate limited' }, 'Rate limited', undefined);
      mockCreate.mockRejectedValue(apiError);

      await expect(coach.askQuestion('test')).rejects.toThrow('Rate limit exceeded');
    });

    it('should handle other API errors', async () => {
      const { APIError } = await import('@anthropic-ai/sdk');
      const apiError = new APIError(500, { message: 'Server error' }, 'Server error', undefined);
      mockCreate.mockRejectedValue(apiError);

      await expect(coach.askQuestion('test')).rejects.toThrow('API Error');
    });
  });

  describe('Build Statistics Calculation', () => {
    beforeEach(() => {
      coach = new AICoach({ apiKey: testApiKey });
    });

    it('should calculate dimensions correctly', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 5, y: 0, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 10, z: 0 }, materialType: MaterialType.Brick },
        { position: { x: 0, y: 0, z: 3 }, materialType: MaterialType.Brick },
      ];

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Great build!',
              strengths: ['Nice dimensions'],
              suggestions: ['Keep going'],
              concepts: ['Spatial awareness'],
            }),
          },
        ],
      });

      await coach.analyzeBuild(blocks);

      const callArgs = mockCreate.mock.calls[0][0];
      const prompt = callArgs.messages[0].content;

      // Width: 0 to 5 = 6, Height: 0 to 10 = 11, Depth: 0 to 3 = 4
      expect(prompt).toContain('Width: 6');
      expect(prompt).toContain('Height: 11');
      expect(prompt).toContain('Depth: 4');
    });

    it('should count materials correctly', async () => {
      const blocks: BlockData[] = [
        { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Gold },
        { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Gold },
        { position: { x: 2, y: 0, z: 0 }, materialType: MaterialType.Ruby },
        { position: { x: 3, y: 0, z: 0 }, materialType: MaterialType.Emerald },
        { position: { x: 4, y: 0, z: 0 }, materialType: MaterialType.Emerald },
        { position: { x: 5, y: 0, z: 0 }, materialType: MaterialType.Emerald },
      ];

      mockCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              summary: 'Luxurious build!',
              strengths: ['Precious materials'],
              suggestions: ['Add structure'],
              concepts: ['Material value'],
            }),
          },
        ],
      });

      await coach.analyzeBuild(blocks);

      const callArgs = mockCreate.mock.calls[0][0];
      const prompt = callArgs.messages[0].content;

      expect(prompt).toContain('Gold');
      expect(prompt).toContain('Ruby');
      expect(prompt).toContain('Emerald');
      expect(prompt).toContain('"Gold":2');
      expect(prompt).toContain('"Ruby":1');
      expect(prompt).toContain('"Emerald":3');
    });
  });
});
