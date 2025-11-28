/**
 * Example usage of the AICoach component
 *
 * This file demonstrates how to integrate the AI mentor into your application.
 * DO NOT commit API keys to version control!
 */

import AICoach, { BuildAnalysis } from './AICoach';
import { BlockData } from '../game/BlockManager';
import { MaterialType } from '../game/Materials';

// Example 1: Initialize the AI Coach
async function initializeCoach() {
  // Get API key from environment variable or secure configuration
  const apiKey = process.env.ANTHROPIC_API_KEY || 'your-api-key-here';

  const coach = new AICoach({
    apiKey,
    // Optional configuration
    modelName: 'claude-sonnet-4-20250514',
    maxTokens: 500,
    temperature: 0.7,
  });

  return coach;
}

// Example 2: Analyze a student's build
async function analyzeBuildExample() {
  const coach = await initializeCoach();

  // Sample build data
  const blocks: BlockData[] = [
    { position: { x: 0, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
    { position: { x: 1, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
    { position: { x: 2, y: 0, z: 0 }, materialType: MaterialType.Cobblestone },
    { position: { x: 0, y: 1, z: 0 }, materialType: MaterialType.Brick },
    { position: { x: 1, y: 1, z: 0 }, materialType: MaterialType.Brick },
    { position: { x: 2, y: 1, z: 0 }, materialType: MaterialType.Brick },
    { position: { x: 1, y: 2, z: 0 }, materialType: MaterialType.OakWood },
  ];

  const context = 'Student is building their first tower';
  const analysis: BuildAnalysis = await coach.analyzeBuild(blocks, context);

  console.log('Build Analysis:');
  console.log('Summary:', analysis.summary);
  console.log('Strengths:', analysis.strengths);
  console.log('Suggestions:', analysis.suggestions);
  console.log('Concepts:', analysis.concepts);

  return analysis;
}

// Example 3: Ask a question
async function askQuestionExample() {
  const coach = await initializeCoach();

  const question = 'How do I make my castle stronger?';
  const answer = await coach.askQuestion(question);

  console.log('Q:', question);
  console.log('A:', answer);

  return answer;
}

// Example 4: Get building tips
async function getTipsExample() {
  const coach = await initializeCoach();

  // Get a general tip
  const generalTip = await coach.provideTip();
  console.log('General tip:', generalTip);

  // Get topic-specific tips
  const symmetryTip = await coach.provideTip('symmetry');
  console.log('Symmetry tip:', symmetryTip);

  const stabilityTip = await coach.provideTip('stability');
  console.log('Stability tip:', stabilityTip);

  const materialsTip = await coach.provideTip('materials');
  console.log('Materials tip:', materialsTip);

  const designTip = await coach.provideTip('design');
  console.log('Design tip:', designTip);
}

// Example 5: Explain architectural concepts
async function explainConceptExample() {
  const coach = await initializeCoach();

  const concepts = ['symmetry', 'foundation', 'balance', 'cantilever', 'arch'];

  for (const concept of concepts) {
    const explanation = await coach.explainConcept(concept);
    console.log(`\nConcept: ${concept}`);
    console.log(`Explanation: ${explanation}`);
  }
}

// Example 6: Celebrate achievements
async function celebrateExample() {
  const coach = await initializeCoach();

  const achievements = [
    'Built a tower 10 blocks tall',
    'Used 5 different materials in one build',
    'Created a symmetrical design',
    'Built their first castle',
  ];

  for (const achievement of achievements) {
    const celebration = await coach.celebrateSuccess(achievement);
    console.log(`\nAchievement: ${achievement}`);
    console.log(`Celebration: ${celebration}`);
  }
}

// Example 7: Stream responses for real-time feedback
async function streamResponseExample() {
  const coach = await initializeCoach();

  const prompt = 'Tell me about building a strong foundation for my castle';

  console.log('Streaming response...');
  for await (const chunk of coach.streamResponse(prompt)) {
    process.stdout.write(chunk);
  }
  console.log('\n');
}

// Example 8: Conversation with context
async function conversationExample() {
  const coach = await initializeCoach();

  // First question
  const q1 = 'What makes a good foundation?';
  const a1 = await coach.askQuestion(q1);
  console.log('Q1:', q1);
  console.log('A1:', a1);

  // Follow-up question (coach remembers previous context)
  const q2 = 'How wide should it be?';
  const a2 = await coach.askQuestion(q2);
  console.log('\nQ2:', q2);
  console.log('A2:', a2);

  // Another follow-up
  const q3 = 'What materials work best for that?';
  const a3 = await coach.askQuestion(q3);
  console.log('\nQ3:', q3);
  console.log('A3:', a3);

  // Clear history if starting a new topic
  coach.clearHistory();

  const q4 = 'Tell me about building tall towers';
  const a4 = await coach.askQuestion(q4);
  console.log('\n\nNew topic:');
  console.log('Q4:', q4);
  console.log('A4:', a4);
}

// Example 9: Error handling
async function errorHandlingExample() {
  try {
    // Invalid API key
    const coach = new AICoach({ apiKey: 'invalid-key' });
    await coach.askQuestion('test');
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    // Output: "Invalid API key. Please check your Anthropic API key."
  }

  try {
    // Missing API key - will throw error
    new AICoach({ apiKey: '' });
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    // Output: "API key is required. Please provide an Anthropic API key."
  }
}

// Example 10: React Component Integration
/*
import { useState, useEffect } from 'react';
import AICoach, { BuildAnalysis } from './education/AICoach';

function BuildFeedback({ blocks, apiKey }) {
  const [coach, setCoach] = useState<AICoach | null>(null);
  const [analysis, setAnalysis] = useState<BuildAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (apiKey) {
      setCoach(new AICoach({ apiKey }));
    }
  }, [apiKey]);

  const analyzeMyBuild = async () => {
    if (!coach) return;

    setLoading(true);
    try {
      const result = await coach.analyzeBuild(blocks);
      setAnalysis(result);
    } catch (error) {
      console.error('Failed to analyze build:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button onClick={analyzeMyBuild} disabled={loading}>
        {loading ? 'Analyzing...' : 'Get Feedback'}
      </button>

      {analysis && (
        <div>
          <h3>Master Aldric says:</h3>
          <p>{analysis.summary}</p>

          <h4>What's Great:</h4>
          <ul>
            {analysis.strengths.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>

          <h4>Try This:</h4>
          <ul>
            {analysis.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>

          <h4>You're Learning:</h4>
          <ul>
            {analysis.concepts.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
*/

// Run examples (uncomment to test)
// analyzeBuildExample();
// askQuestionExample();
// getTipsExample();
// explainConceptExample();
// celebrateExample();
// streamResponseExample();
// conversationExample();
// errorHandlingExample();

export {
  initializeCoach,
  analyzeBuildExample,
  askQuestionExample,
  getTipsExample,
  explainConceptExample,
  celebrateExample,
  streamResponseExample,
  conversationExample,
  errorHandlingExample,
};
