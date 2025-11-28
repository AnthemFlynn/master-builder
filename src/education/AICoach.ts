import Anthropic from '@anthropic-ai/sdk';
import { BlockData } from '../game/BlockManager';
import { MaterialType } from '../game/Materials';

export interface BuildAnalysis {
  summary: string;
  strengths: string[];
  suggestions: string[];
  concepts: string[]; // Educational concepts demonstrated
}

export interface CoachConfig {
  apiKey: string;
  modelName?: string;
  maxTokens?: number;
  temperature?: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const SYSTEM_PROMPT = `You are Master Aldric, a friendly and wise architect mentor helping young students (ages 9-12) learn about building and architecture.

Your role:
- Provide encouragement and celebrate their efforts
- Explain concepts in simple, clear language
- Give practical building tips
- Help them understand structural stability, symmetry, and design
- Use analogies and examples they can relate to
- Keep responses concise (2-3 sentences usually)
- Be enthusiastic about their creativity!

Remember: Every builder started somewhere. Your goal is to inspire and educate, not criticize.`;

export default class AICoach {
  private client: Anthropic;
  private modelName: string;
  private maxTokens: number;
  private temperature: number;
  private conversationHistory: Message[] = [];
  private maxHistoryLength = 10;

  constructor(config: CoachConfig) {
    if (!config.apiKey) {
      throw new Error('API key is required. Please provide an Anthropic API key.');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true, // For client-side usage
    });

    this.modelName = config.modelName || 'claude-sonnet-4-20250514';
    this.maxTokens = config.maxTokens || 500;
    this.temperature = config.temperature || 0.7;
  }

  /**
   * Analyze a build and provide structured feedback
   */
  async analyzeBuild(
    blocks: BlockData[],
    context?: string
  ): Promise<BuildAnalysis> {
    const stats = this.calculateBuildStats(blocks);

    const prompt = `Analyze this student's build and provide encouraging feedback:

Build Statistics:
- Total blocks: ${stats.totalBlocks}
- Height: ${stats.height} blocks
- Width: ${stats.width} blocks
- Depth: ${stats.depth} blocks
- Materials used: ${stats.materialsUsed.join(', ')}
- Material distribution: ${JSON.stringify(stats.materialCounts)}
${context ? `\nContext: ${context}` : ''}

Please provide:
1. A brief summary (1-2 sentences) celebrating what they built
2. 2-3 strengths or cool things about their design
3. 1-2 gentle suggestions for improvement
4. 1-2 educational concepts they're learning (like symmetry, balance, structural stability, etc.)

Format your response as JSON with keys: summary, strengths (array), suggestions (array), concepts (array).`;

    try {
      const response = await this.sendMessage(prompt);

      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          summary: parsed.summary || 'Great work on your build!',
          strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
          suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
          concepts: Array.isArray(parsed.concepts) ? parsed.concepts : [],
        };
      }

      // Fallback if JSON parsing fails
      return this.parseTextAnalysis(response, stats);
    } catch (error) {
      console.error('Error analyzing build:', error);
      throw new Error('Failed to analyze build. Please check your API key and try again.');
    }
  }

  /**
   * Answer a student's question about building
   */
  async askQuestion(question: string): Promise<string> {
    const prompt = `A young student asks: "${question}"

Please provide a clear, age-appropriate answer that encourages their curiosity.`;

    try {
      return await this.sendMessage(prompt);
    } catch (error) {
      console.error('Error answering question:', error);
      // Re-throw if it's already a specific error message
      if (error instanceof Error && error.message.startsWith('Invalid API key')) {
        throw error;
      }
      if (error instanceof Error && error.message.startsWith('Rate limit')) {
        throw error;
      }
      if (error instanceof Error && error.message.startsWith('API Error')) {
        throw error;
      }
      throw new Error('Failed to answer question. Please try again.');
    }
  }

  /**
   * Provide a building tip on a specific topic
   */
  async provideTip(topic?: 'symmetry' | 'stability' | 'materials' | 'design'): Promise<string> {
    let prompt = 'Share a helpful building tip for young architects.';

    if (topic) {
      const topicGuides = {
        symmetry: 'Share a tip about creating symmetrical and balanced designs.',
        stability: 'Share a tip about building stable structures that won\'t fall over.',
        materials: 'Share a tip about choosing and combining different building materials.',
        design: 'Share a tip about creative design and making buildings look interesting.',
      };
      prompt = topicGuides[topic];
    }

    try {
      return await this.sendMessage(prompt);
    } catch (error) {
      console.error('Error providing tip:', error);
      throw new Error('Failed to provide tip. Please try again.');
    }
  }

  /**
   * Explain an architectural or engineering concept
   */
  async explainConcept(concept: string): Promise<string> {
    const prompt = `Explain the concept of "${concept}" to a 9-12 year old student learning about architecture and building. Use simple language and relatable examples.`;

    try {
      return await this.sendMessage(prompt);
    } catch (error) {
      console.error('Error explaining concept:', error);
      throw new Error('Failed to explain concept. Please try again.');
    }
  }

  /**
   * Celebrate a student's achievement
   */
  async celebrateSuccess(achievement: string): Promise<string> {
    const prompt = `A student just achieved: "${achievement}"

Celebrate their success with enthusiasm and encouragement!`;

    try {
      return await this.sendMessage(prompt);
    } catch (error) {
      console.error('Error celebrating success:', error);
      throw new Error('Failed to celebrate success. Please try again.');
    }
  }

  /**
   * Stream responses for real-time feedback
   */
  async *streamResponse(prompt: string): AsyncGenerator<string> {
    try {
      const messages = this.buildMessages(prompt);

      const stream = await this.client.messages.stream({
        model: this.modelName,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: SYSTEM_PROMPT,
        messages,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          const text = chunk.delta.text;
          fullResponse += text;
          yield text;
        }
      }

      // Update conversation history
      this.addToHistory('user', prompt);
      this.addToHistory('assistant', fullResponse);
    } catch (error) {
      console.error('Error streaming response:', error);
      if (error && typeof error === 'object' && 'status' in error) {
        const apiError = error as { status: number };
        if (apiError.status === 401) {
          throw new Error('Invalid API key. Please check your Anthropic API key.');
        } else if (apiError.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        throw new Error(`API Error: ${apiError.status}`);
      }
      throw new Error('Failed to stream response. Please try again.');
    }
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Send a message and get a response
   */
  private async sendMessage(prompt: string): Promise<string> {
    try {
      const messages = this.buildMessages(prompt);

      const response = await this.client.messages.create({
        model: this.modelName,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: SYSTEM_PROMPT,
        messages,
      });

      const content = response.content[0];
      const text = content.type === 'text' ? content.text : '';

      // Update conversation history
      this.addToHistory('user', prompt);
      this.addToHistory('assistant', text);

      return text;
    } catch (error) {
      // Check if it's an API error by checking for status property
      if (error && typeof error === 'object' && 'status' in error) {
        const apiError = error as { status: number };
        if (apiError.status === 401) {
          throw new Error('Invalid API key. Please check your Anthropic API key.');
        } else if (apiError.status === 429) {
          throw new Error('Rate limit exceeded. Please wait a moment and try again.');
        }
        throw new Error(`API Error: ${apiError.status}`);
      }
      throw error;
    }
  }

  /**
   * Build messages array for API call
   */
  private buildMessages(newPrompt: string): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    // Add conversation history
    for (const msg of this.conversationHistory) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }

    // Add new prompt
    messages.push({
      role: 'user',
      content: newPrompt,
    });

    return messages;
  }

  /**
   * Add message to conversation history
   */
  private addToHistory(role: 'user' | 'assistant', content: string): void {
    this.conversationHistory.push({ role, content });

    // Maintain max history length
    while (this.conversationHistory.length > this.maxHistoryLength) {
      this.conversationHistory.shift();
    }
  }

  /**
   * Calculate statistics about the build
   */
  private calculateBuildStats(blocks: BlockData[]) {
    if (blocks.length === 0) {
      return {
        totalBlocks: 0,
        height: 0,
        width: 0,
        depth: 0,
        materialsUsed: [],
        materialCounts: {},
      };
    }

    const positions = blocks.map(b => b.position);
    const minX = Math.min(...positions.map(p => p.x));
    const maxX = Math.max(...positions.map(p => p.x));
    const minY = Math.min(...positions.map(p => p.y));
    const maxY = Math.max(...positions.map(p => p.y));
    const minZ = Math.min(...positions.map(p => p.z));
    const maxZ = Math.max(...positions.map(p => p.z));

    const materialCounts: Record<string, number> = {};
    const materialsUsed = new Set<string>();

    blocks.forEach(block => {
      const materialName = MaterialType[block.materialType];
      materialsUsed.add(materialName);
      materialCounts[materialName] = (materialCounts[materialName] || 0) + 1;
    });

    return {
      totalBlocks: blocks.length,
      height: maxY - minY + 1,
      width: maxX - minX + 1,
      depth: maxZ - minZ + 1,
      materialsUsed: Array.from(materialsUsed),
      materialCounts,
    };
  }

  /**
   * Parse text response into BuildAnalysis format (fallback)
   */
  private parseTextAnalysis(text: string, stats: ReturnType<typeof this.calculateBuildStats>): BuildAnalysis {
    // Simple fallback parsing
    const lines = text.split('\n').filter(l => l.trim());

    return {
      summary: lines[0] || `Amazing work! You've built something with ${stats.totalBlocks} blocks!`,
      strengths: [
        `You used ${stats.materialsUsed.length} different materials - great variety!`,
        `Your structure is ${stats.height} blocks tall - impressive!`,
      ],
      suggestions: [
        'Try experimenting with symmetry to make your build even more balanced.',
      ],
      concepts: [
        'Material selection',
        'Structural height',
      ],
    };
  }
}
