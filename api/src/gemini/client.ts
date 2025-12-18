import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

export interface StructuredResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface LeaveImpactInput {
  employeeName: string;
  startDate: string;
  endDate: string;
  remainingEta: number;
  affectedTasks: any[];
  blockingTasks: any[];
}

export interface PredictionInput {
  taskName: string;
  originalEta: number;
  currentEta: number;
  timeSpent: number;
  statusDays: number;
  status: string;
  handlerLoad: number;
  historicalBreachRate: number;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;

  constructor() {
    this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      generationConfig: {
        temperature: 0.3, // Lower temperature for more consistent outputs
        topP: 0.8,
        maxOutputTokens: 2048,
      },
    });
  }

  /**
   * Generate SQL from natural language query
   */
  async generateSQL(query: string, context: string): Promise<StructuredResponse<{ sql: string; explanation: string }>> {
    const prompt = `You are a SQL expert for WorkLens AI, a workload intelligence platform.

CONTEXT:
${context}

DATABASE SCHEMA:
- mantis_bug_table: Tasks with id, project_id, handler_id, status, resolution, eta, due_date, last_updated, source_system
- mantis_bugnote_table: Time tracking with bug_id, time_tracking (minutes), source_system
- mantis_project_table: Projects with id, name, source_system
- mantis_user_table: Users with id, email, realname, source_system
- mantis_custom_field_string_table: Custom fields (field_id=4 for ETA hours, field_id=40/54 for Task Type)
- hs_hr_employee: Employees with emp_number, emp_firstname, emp_lastname, emp_work_email, job_title_code
- ohrm_job_title: Job titles with id, job_title

CRITICAL RULES:
1. ALWAYS include source_system joins: every join must enforce source_system equality
2. Status codes: 10=New, 20=Feedback, 30=Acknowledged, 40=Confirmed, 50=Assigned, 60=Movedout, 70=Deferred, 80=Resolved, 90=Closed, 100=Reopen
3. Active tasks: status NOT IN (80, 90)
4. Resolution: 10=Open, 20=Fixed, 30=Reopened, etc.
5. ETA is in custom_field_string_table with field_id=4
6. Time tracking is in minutes, convert to hours by dividing by 60
7. NEVER output raw status/resolution codes - always use labels
8. If the query is unrelated to workload/tasks/employees, respond with "code red"

USER QUERY: "${query}"

Respond in JSON format:
{
  "sql": "SELECT ... (the SQL query)",
  "explanation": "Brief explanation of what the query does",
  "isOutOfDomain": false
}

If the query is out of domain, respond:
{
  "sql": null,
  "explanation": "code red",
  "isOutOfDomain": true
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      
      // Parse JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { success: false, error: 'Failed to parse response' };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (parsed.isOutOfDomain) {
        return { success: false, error: 'code red' };
      }

      return {
        success: true,
        data: {
          sql: parsed.sql,
          explanation: parsed.explanation,
        },
      };
    } catch (error) {
      console.error('Gemini SQL generation error:', error);
      return { success: false, error: 'Failed to generate SQL' };
    }
  }

  /**
   * Generate narrative insight from data
   */
  async generateNarrative(context: any): Promise<string> {
    const prompt = `You are WorkLens AI, an enterprise workload intelligence assistant.

Generate a concise, insightful narrative (2-4 sentences) explaining the current workload situation.

CONTEXT:
${JSON.stringify(context, null, 2)}

GUIDELINES:
- Focus on "why" not just "what"
- Highlight risks or opportunities
- Be specific with numbers
- Avoid generic statements
- Use professional but conversational tone

Generate the narrative:`;

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('Gemini narrative error:', error);
      return 'Unable to generate insight at this time.';
    }
  }

  /**
   * Predict ETA breach probability
   */
  async predictBreachProbability(input: PredictionInput): Promise<{
    probability: number;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
  }> {
    const prompt = `You are a workload prediction expert. Analyze this task data and predict the probability of ETA breach.

TASK DATA:
- Task: ${input.taskName}
- Original ETA: ${input.originalEta}h
- Current ETA: ${input.currentEta}h  
- Time Spent: ${input.timeSpent}h
- Days in Current Status: ${input.statusDays} days at "${input.status}"
- Handler's Current Load: ${input.handlerLoad}h remaining across all tasks
- Historical Breach Rate: ${input.historicalBreachRate}% for similar tasks

ANALYSIS FACTORS:
1. ETA inflation (current vs original)
2. Progress ratio (time spent vs ETA)
3. Status stagnation
4. Handler workload pressure
5. Historical patterns

Respond in JSON:
{
  "probability": 0-100,
  "confidence": "high" | "medium" | "low",
  "reasoning": "1-2 sentence explanation"
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Gemini prediction error:', error);
    }

    // Fallback to rule-based prediction
    const progress = input.timeSpent / input.currentEta;
    const inflation = input.currentEta / input.originalEta;
    
    let probability = 30; // Base probability
    
    if (progress > 0.8 && input.timeSpent < input.currentEta * 0.5) {
      probability += 30; // Low progress relative to time
    }
    if (inflation > 1.3) {
      probability += 20; // ETA has inflated
    }
    if (input.statusDays > 7) {
      probability += 15; // Stagnant
    }
    if (input.handlerLoad > 60) {
      probability += 10; // Handler is overloaded
    }

    return {
      probability: Math.min(95, probability),
      confidence: 'medium',
      reasoning: 'Based on rule-based analysis of progress and workload factors.',
    };
  }

  /**
   * Analyze leave impact and generate recommendations
   */
  async analyzeLeaveImpact(input: LeaveImpactInput): Promise<{
    summary: string;
    riskLevel: 'low' | 'medium' | 'high';
    recommendations: string[];
  }> {
    const prompt = `You are a workload planning assistant. Analyze the impact of planned leave.

LEAVE DETAILS:
- Employee: ${input.employeeName}
- Leave Period: ${input.startDate} to ${input.endDate}
- Remaining ETA on Tasks: ${input.remainingEta}h

AFFECTED TASKS (due during leave):
${JSON.stringify(input.affectedTasks, null, 2)}

BLOCKING TASKS (blocking other team members):
${JSON.stringify(input.blockingTasks, null, 2)}

Provide impact analysis in JSON:
{
  "summary": "2-3 sentence impact summary",
  "riskLevel": "low" | "medium" | "high",
  "recommendations": ["action 1", "action 2", "action 3"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Gemini leave impact error:', error);
    }

    // Fallback
    const riskLevel = input.affectedTasks.length > 2 || input.blockingTasks.length > 0 
      ? 'high' 
      : input.affectedTasks.length > 0 
        ? 'medium' 
        : 'low';

    return {
      summary: `${input.employeeName}'s leave will pause ${input.remainingEta}h of work. ${input.affectedTasks.length} tasks have due dates during this period.`,
      riskLevel,
      recommendations: [
        input.blockingTasks.length > 0 ? 'Reassign blocking tasks before leave' : 'Review task priorities',
        'Communicate status to stakeholders',
        'Consider extending due dates for non-critical tasks',
      ].filter(Boolean),
    };
  }

  /**
   * Generate diagnostic explanation (Mode 2)
   */
  async generateDiagnostic(question: string, data: any): Promise<{
    answer: string;
    confidence: number;
    dataPoints: string[];
  }> {
    const prompt = `You are WorkLens AI diagnostic assistant. Answer the user's question using the provided data.

QUESTION: "${question}"

DATA:
${JSON.stringify(data, null, 2)}

Provide a diagnostic response in JSON:
{
  "answer": "Clear, specific answer with numbers and context (2-4 sentences)",
  "confidence": 0.0-1.0,
  "dataPoints": ["key fact 1", "key fact 2", "key fact 3"]
}`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Gemini diagnostic error:', error);
    }

    return {
      answer: 'Unable to generate diagnostic at this time.',
      confidence: 0,
      dataPoints: [],
    };
  }

  /**
   * Generate prescriptive recommendations (Mode 3)
   */
  async generateRecommendations(context: string, goal: string): Promise<{
    recommendations: Array<{
      action: string;
      impact: string;
      priority: 'high' | 'medium' | 'low';
    }>;
    rationale: string;
  }> {
    const prompt = `You are WorkLens AI prescriptive assistant. Generate actionable recommendations.

CURRENT CONTEXT:
${context}

USER GOAL: "${goal}"

Provide recommendations in JSON:
{
  "recommendations": [
    {
      "action": "Specific action to take",
      "impact": "Expected outcome",
      "priority": "high" | "medium" | "low"
    }
  ],
  "rationale": "Brief explanation of the recommendation strategy"
}

Limit to 3-5 most impactful recommendations.`;

    try {
      const result = await this.model.generateContent(prompt);
      const text = result.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Gemini recommendations error:', error);
    }

    return {
      recommendations: [
        {
          action: 'Review and prioritize current task backlog',
          impact: 'Clearer focus on high-value work',
          priority: 'high',
        },
      ],
      rationale: 'Default recommendation based on general best practices.',
    };
  }

  /**
   * Summarize data for executive narrative
   */
  async generateExecutiveSummary(data: any): Promise<string> {
    const prompt = `You are WorkLens AI executive briefing generator.

Create a concise executive summary (3-5 sentences) that:
1. Highlights the most critical insight
2. Quantifies the situation with specific numbers
3. Indicates trend direction (improving/declining)
4. Suggests one key action if needed

DATA:
${JSON.stringify(data, null, 2)}

Write the executive summary:`;

    try {
      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('Gemini executive summary error:', error);
      return 'Executive summary temporarily unavailable.';
    }
  }
}

