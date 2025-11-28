# AICoach - Educational AI Mentor

An AI-powered mentor that provides personalized feedback, answers questions, and guides students (ages 9-12) through architectural and building concepts using Anthropic's Claude.

## Features

- **Build Analysis**: Analyzes student builds and provides encouraging, constructive feedback
- **Question Answering**: Answers student questions about building and architecture
- **Building Tips**: Provides tips on symmetry, stability, materials, and design
- **Concept Explanations**: Explains architectural concepts in age-appropriate language
- **Achievement Celebration**: Celebrates milestones and encourages progress
- **Streaming Responses**: Supports real-time streaming for interactive feedback
- **Conversation History**: Maintains context across multiple interactions

## Installation

```bash
npm install @anthropic-ai/sdk
```

## Quick Start

```typescript
import AICoach from './education/AICoach';

// Initialize with API key
const coach = new AICoach({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Analyze a build
const blocks = [
  { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
  // ... more blocks
];

const analysis = await coach.analyzeBuild(blocks);
console.log(analysis.summary);
```

## API Reference

### Constructor

```typescript
new AICoach(config: CoachConfig)
```

**CoachConfig:**
- `apiKey` (required): Your Anthropic API key
- `modelName` (optional): Model to use (default: 'claude-sonnet-4-20250514')
- `maxTokens` (optional): Max response length (default: 500)
- `temperature` (optional): Response creativity (default: 0.7)

### Methods

#### analyzeBuild()

Analyzes a student's build and provides structured feedback.

```typescript
async analyzeBuild(
  blocks: BlockData[],
  context?: string
): Promise<BuildAnalysis>
```

**Parameters:**
- `blocks`: Array of block data from the build
- `context` (optional): Additional context about the student's goals

**Returns BuildAnalysis:**
```typescript
{
  summary: string;           // Brief celebration of their work
  strengths: string[];       // What they did well
  suggestions: string[];     // Gentle improvement ideas
  concepts: string[];        // Educational concepts demonstrated
}
```

**Example:**
```typescript
const analysis = await coach.analyzeBuild(blocks, 'Building first castle');
console.log(analysis.summary);
// "Wow! You're building an awesome castle with 15 blocks!"
```

#### askQuestion()

Answers a student's question about building or architecture.

```typescript
async askQuestion(question: string): Promise<string>
```

**Example:**
```typescript
const answer = await coach.askQuestion('How do I make my tower stronger?');
// "Great question! To make your tower stronger, try building a wider..."
```

#### provideTip()

Provides a building tip, optionally on a specific topic.

```typescript
async provideTip(
  topic?: 'symmetry' | 'stability' | 'materials' | 'design'
): Promise<string>
```

**Example:**
```typescript
const tip = await coach.provideTip('symmetry');
// "Symmetry tip: Try making both sides of your building mirror each other!"
```

#### explainConcept()

Explains an architectural or engineering concept in simple terms.

```typescript
async explainConcept(concept: string): Promise<string>
```

**Example:**
```typescript
const explanation = await coach.explainConcept('cantilever');
// "A cantilever is like a diving board - it sticks out from a building..."
```

#### celebrateSuccess()

Celebrates a student's achievement with enthusiasm.

```typescript
async celebrateSuccess(achievement: string): Promise<string>
```

**Example:**
```typescript
const celebration = await coach.celebrateSuccess('Built a tower 10 blocks tall');
// "Wow! 10 blocks tall! You're becoming a master builder! 🏰"
```

#### streamResponse()

Streams responses in real-time for interactive feedback.

```typescript
async *streamResponse(prompt: string): AsyncGenerator<string>
```

**Example:**
```typescript
for await (const chunk of coach.streamResponse('Tell me about arches')) {
  console.log(chunk); // Prints each word as it arrives
}
```

#### clearHistory()

Clears conversation history to start fresh.

```typescript
clearHistory(): void
```

**Example:**
```typescript
coach.clearHistory(); // Start a new conversation topic
```

## The Mentor Persona: Master Aldric

Master Aldric is designed to be:

- **Encouraging**: Always celebrates effort and creativity
- **Age-appropriate**: Uses simple language for 9-12 year olds
- **Educational**: Teaches concepts through relatable examples
- **Supportive**: Never criticizes, always constructive
- **Concise**: Keeps responses brief (2-3 sentences usually)
- **Enthusiastic**: Shows genuine excitement about student progress

## Build Analysis Details

The coach analyzes:

- **Total blocks used**: Understanding scale and scope
- **Build dimensions**: Height, width, and depth
- **Material variety**: Different materials used
- **Material distribution**: How materials are combined
- **Symmetry**: Balance and mirroring
- **Structural stability**: Foundation and support

## Error Handling

The component provides helpful error messages:

```typescript
try {
  const coach = new AICoach({ apiKey: '' });
} catch (error) {
  // "API key is required. Please provide an Anthropic API key."
}

try {
  await coach.askQuestion('test');
} catch (error) {
  // Possible errors:
  // - "Invalid API key. Please check your Anthropic API key."
  // - "Rate limit exceeded. Please wait a moment and try again."
  // - "API Error: [specific error message]"
  // - "Failed to [action]. Please try again."
}
```

## Best Practices

### 1. Secure API Key Management

Never hardcode API keys in your application:

```typescript
// ✅ Good: Use environment variables
const coach = new AICoach({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ❌ Bad: Hardcoded key
const coach = new AICoach({
  apiKey: 'sk-ant-...',
});
```

### 2. Handle Errors Gracefully

Always wrap API calls in try-catch blocks:

```typescript
try {
  const analysis = await coach.analyzeBuild(blocks);
  displayFeedback(analysis);
} catch (error) {
  showUserFriendlyError('Could not get feedback right now. Try again!');
}
```

### 3. Provide Context

Help the coach give better feedback by providing context:

```typescript
// ✅ Better: With context
const analysis = await coach.analyzeBuild(
  blocks,
  'Student is working on the "Build a Bridge" challenge'
);

// ✅ Good: Without context
const analysis = await coach.analyzeBuild(blocks);
```

### 4. Use Conversation History

The coach remembers recent messages for better context:

```typescript
// First question establishes topic
await coach.askQuestion('How do I build a strong foundation?');

// Follow-up uses context from previous question
await coach.askQuestion('How many blocks wide should it be?');

// Clear history when changing topics
coach.clearHistory();
await coach.askQuestion('Tell me about building towers');
```

### 5. Stream for Better UX

Use streaming for longer responses to show progress:

```typescript
setLoading(true);
let response = '';

for await (const chunk of coach.streamResponse(prompt)) {
  response += chunk;
  updateUI(response); // Update UI in real-time
}

setLoading(false);
```

## React Integration

Example React component:

```typescript
import { useState } from 'react';
import AICoach, { BuildAnalysis } from './education/AICoach';

function AIFeedbackPanel({ blocks, apiKey }) {
  const [coach] = useState(() => new AICoach({ apiKey }));
  const [analysis, setAnalysis] = useState<BuildAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const getAnalysis = async () => {
    setLoading(true);
    try {
      const result = await coach.analyzeBuild(blocks);
      setAnalysis(result);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-feedback">
      <button onClick={getAnalysis} disabled={loading}>
        Get Master Aldric's Feedback
      </button>

      {analysis && (
        <div className="feedback">
          <p className="summary">{analysis.summary}</p>
          <div className="strengths">
            <h4>What's Great:</h4>
            <ul>
              {analysis.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
```

## Performance Considerations

- **API Calls**: Each method makes an API call (costs money)
- **Rate Limits**: Anthropic has rate limits; handle 429 errors
- **Response Time**: Typical response: 1-3 seconds
- **Streaming**: Faster perceived performance for long responses
- **History**: Limited to 10 messages (5 exchanges) to manage context window

## Testing

The component includes comprehensive tests. Run them with:

```bash
npm test src/education/AICoach.test.ts
```

Tests cover:
- Constructor validation
- Build analysis with various inputs
- Question answering
- Tip generation for all topics
- Concept explanations
- Success celebrations
- Streaming responses
- Conversation history management
- Error handling (401, 429, generic errors)
- Build statistics calculation

## Privacy & Safety

- The AI coach is designed for educational content only
- All interactions go through Anthropic's API (see their privacy policy)
- No student data is stored by this component
- Responses are designed to be safe and appropriate for children

## Troubleshooting

### "API key is required"
Solution: Provide a valid Anthropic API key in the config.

### "Invalid API key"
Solution: Check your API key is correct and active.

### "Rate limit exceeded"
Solution: Wait a moment before retrying. Consider implementing backoff.

### Responses are too long/short
Solution: Adjust `maxTokens` in config (default: 500).

### Responses are too creative/predictable
Solution: Adjust `temperature` (0.0-1.0, default: 0.7).

## Examples

See `AICoach.example.ts` for complete working examples of:
- Analyzing builds
- Asking questions
- Getting tips
- Explaining concepts
- Celebrating achievements
- Streaming responses
- Managing conversations
- Error handling
- React integration

## License

Part of the Kingdom Builder educational game project.
