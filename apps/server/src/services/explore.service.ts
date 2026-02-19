import { Service } from 'typedi';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type {
  ExploreQueryDto,
  ExploreResponseDto,
  ExploreSourceDto,
  MemoListItemDto,
} from '@aimo/dto';
import { config } from '../config/config.js';
import { MemoService } from './memo.service.js';
import { EmbeddingService } from './embedding.service.js';
import { LanceDbService } from '../sources/lancedb.js';
import type { MemoListItemWithScoreDto } from '@aimo/dto';

/**
 * Node names for the agent workflow
 */
const NODE_RETRIEVE = 'retrieve' as const;
const NODE_ANALYZE = 'analyze' as const;
const NODE_GENERATE = 'generate' as const;

/**
 * Default number of memos to retrieve for context
 */
const DEFAULT_RETRIEVAL_LIMIT = 10;

/**
 * Minimum relevance score for a memo to be considered relevant
 */
const MIN_RELEVANCE_SCORE = 0.5;

/**
 * Agent state interface for internal use
 */
interface ExploreAgentState {
  query: string;
  uid: string;
  context?: string;
  retrievedMemos?: MemoListItemDto[];
  relevanceScores?: Record<string, number>;
  analysis?: string;
  answer?: string;
  sources?: ExploreSourceDto[];
  suggestedQuestions?: string[];
  error?: string;
}

/**
 * Service for AI-powered knowledge exploration using LangChain DeepAgents
 * Implements a multi-agent workflow:
 * 1. Retrieval Agent - Fetches relevant memos using vector search
 * 2. Analysis Agent - Analyzes the retrieved content
 * 3. Summary Agent - Generates the final answer with sources
 */
@Service()
export class ExploreService {
  private model: ChatOpenAI;
  private embeddings: OpenAIEmbeddings;

  constructor(
    private memoService: MemoService,
    private embeddingService: EmbeddingService,
    private lanceDb: LanceDbService
  ) {
    // Initialize LangChain components
    this.model = new ChatOpenAI({
      modelName: config.openai.model || 'gpt-4o-mini',
      apiKey: config.openai.apiKey,
      configuration: {
        baseURL: config.openai.baseURL,
      },
      temperature: 0.3,
    });

    this.embeddings = new OpenAIEmbeddings({
      modelName: config.openai.model || 'text-embedding-3-small',
      apiKey: config.openai.apiKey,
      configuration: {
        baseURL: config.openai.baseURL,
      },
    });
  }

  /**
   * Initialize the LangChain agent workflow
   * Creates a state graph with retrieval, analysis, and generation nodes
   */
  private initializeWorkflow() {
    // Define the state annotation for LangGraph
    const ExploreStateAnnotation = Annotation.Root({
      query: Annotation<string>,
      uid: Annotation<string>,
      context: Annotation<string | undefined>,
      retrievedMemos: Annotation<MemoListItemDto[] | undefined>,
      relevanceScores: Annotation<Record<string, number> | undefined>,
      analysis: Annotation<string | undefined>,
      answer: Annotation<string | undefined>,
      sources: Annotation<ExploreSourceDto[] | undefined>,
      suggestedQuestions: Annotation<string[] | undefined>,
      error: Annotation<string | undefined>,
    });

    // Define the state graph using Annotation
    const workflow = new StateGraph(ExploreStateAnnotation);

    // Add retrieval node
    workflow.addNode(NODE_RETRIEVE, this.retrievalNode.bind(this));

    // Add analysis node
    workflow.addNode(NODE_ANALYZE, this.analysisNode.bind(this));

    // Add generation node
    workflow.addNode(NODE_GENERATE, this.generationNode.bind(this));

    // Define edges - eslint-disable-next-line is needed for LangGraph's complex types
    // Define edges - use type assertions to avoid strict type checking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (workflow as any).addEdge(NODE_RETRIEVE, NODE_ANALYZE);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (workflow as any).addEdge(NODE_ANALYZE, NODE_GENERATE);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (workflow as any).addEdge(NODE_GENERATE, END);

    // Set entry point
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (workflow as any).addEdge(START, NODE_RETRIEVE);

    return workflow;
  }

  /**
   * Retrieval Agent node
   * Performs vector search to find relevant memos
   */
  private async retrievalNode(state: ExploreAgentState): Promise<Partial<ExploreAgentState>> {
    try {
      const { query, uid } = state;

      // Perform vector search to find relevant memos
      const searchResult = await this.memoService.vectorSearch({
        uid,
        query,
        page: 1,
        limit: DEFAULT_RETRIEVAL_LIMIT,
      });

      // Filter by minimum relevance score
      const relevantMemos = searchResult.items.filter(
        (memo) => (memo.relevanceScore || 0) >= MIN_RELEVANCE_SCORE
      );

      // Build relevance score map
      const relevanceScores: Record<string, number> = {};
      relevantMemos.forEach((memo) => {
        relevanceScores[memo.memoId] = memo.relevanceScore || 0;
      });

      return {
        retrievedMemos: relevantMemos,
        relevanceScores,
      };
    } catch (error) {
      console.error('Retrieval agent error:', error);
      return {
        error: `Retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Analysis Agent node
   * Analyzes the retrieved memos for relevance and key insights
   */
  private async analysisNode(state: ExploreAgentState): Promise<Partial<ExploreAgentState>> {
    try {
      const { query, retrievedMemos } = state;

      if (!retrievedMemos || retrievedMemos.length === 0) {
        return {
          analysis: 'No relevant memos found for this query.',
        };
      }

      // Prepare context from retrieved memos
      const context = retrievedMemos
        .map((memo, index) => {
          const score = state.relevanceScores?.[memo.memoId] || 0;
          return `[${index + 1}] ${memo.content.substring(0, 500)}${
            memo.content.length > 500 ? '...' : ''
          }\n(Relevance: ${(score * 100).toFixed(1)}%)`;
        })
        .join('\n\n');

      // Create analysis prompt
      const analysisPrompt = `You are analyzing retrieved notes to answer a user's question.

User Query: ${query}

Retrieved Notes:
${context}

Analyze these notes and identify:
1. Which notes are most relevant to answering the query
2. Key insights or facts that can help answer the query
3. Any gaps or contradictions in the information

Provide a concise analysis focusing on how these notes can answer the user's query.`;

      // Run analysis through LLM
      const messages = [
        new SystemMessage(
          'You are an expert analyst who evaluates the relevance and quality of retrieved information.'
        ),
        new HumanMessage(analysisPrompt),
      ];

      const analysis = await this.model.invoke(messages);
      const analysisText = typeof analysis.content === 'string' ? analysis.content : '';

      return {
        analysis: analysisText,
      };
    } catch (error) {
      console.error('Analysis agent error:', error);
      return {
        analysis: 'Analysis could not be completed due to an error.',
      };
    }
  }

  /**
   * Summary/Generation Agent node
   * Generates the final answer based on analysis
   */
  private async generationNode(state: ExploreAgentState): Promise<Partial<ExploreAgentState>> {
    try {
      const { query, retrievedMemos, analysis, context } = state;

      // If no memos found, return appropriate message
      if (!retrievedMemos || retrievedMemos.length === 0) {
        return {
          answer:
            'I could not find any relevant notes in your knowledge base to answer this question.',
          sources: [],
          suggestedQuestions: [],
        };
      }

      // Prepare context from retrieved memos
      const memoContext = retrievedMemos
        .map((memo, index) => {
          return `[${index + 1}] ${memo.content}`;
        })
        .join('\n\n---\n\n');

      // Include conversation context if available
      const contextPrefix = context ? `Previous context: ${context}\n\n` : '';

      // Create generation prompt
      const generationPrompt = `${contextPrefix}You are answering a user's question based on their personal notes.

User Query: ${query}

Relevant Notes:
${memoContext}

Analysis of Notes:
${analysis || 'No analysis available.'}

Instructions:
1. Answer the user's question using ONLY the information from the notes above
2. Cite sources using [1], [2], etc. format to reference the notes
3. If the notes don't contain enough information, clearly state this
4. Be concise but comprehensive
5. Format your response in Markdown

Provide your answer:`;

      // Generate answer
      const messages = [
        new SystemMessage(
          'You are a helpful AI assistant that answers questions based on the user\'s personal notes. Always cite your sources using [1], [2], etc.'
        ),
        new HumanMessage(generationPrompt),
      ];

      const response = await this.model.invoke(messages);
      const answer = typeof response.content === 'string' ? response.content : '';

      // Map memos to sources
      const sources: ExploreSourceDto[] = retrievedMemos.map((memo) => ({
        memoId: memo.memoId,
        content: memo.content.substring(0, 200) + (memo.content.length > 200 ? '...' : ''),
        relevanceScore: state.relevanceScores?.[memo.memoId] || 0,
        createdAt: memo.createdAt,
      }));

      // Generate suggested follow-up questions
      const suggestedQuestions = await this.generateSuggestedQuestions(query, answer);

      return {
        answer,
        sources,
        suggestedQuestions,
      };
    } catch (error) {
      console.error('Generation agent error:', error);
      return {
        answer: 'An error occurred while generating the response.',
        sources: [],
        error: `Generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Generate suggested follow-up questions
   */
  private async generateSuggestedQuestions(
    query: string,
    answer: string
  ): Promise<string[]> {
    try {
      const prompt = `Based on this question and answer, suggest 3 follow-up questions the user might want to ask:

Original Question: ${query}

Answer Summary: ${answer.substring(0, 300)}...

Provide exactly 3 short, relevant follow-up questions (one per line, no numbering):`;

      const messages = [
        new SystemMessage('You suggest helpful follow-up questions based on a conversation.'),
        new HumanMessage(prompt),
      ];

      const response = await this.model.invoke(messages);
      const content = typeof response.content === 'string' ? response.content : '';

      // Parse questions (one per line, take first 3)
      return content
        .split('\n')
        .map((q) => q.trim())
        .filter((q) => q.length > 0 && !q.match(/^\d+[.)]/))
        .slice(0, 3);
    } catch (error) {
      console.warn('Failed to generate suggested questions:', error);
      return [];
    }
  }

  /**
   * Process an exploration query through the agent workflow
   * @param queryDto The query data
   * @param uid User ID
   * @returns The exploration response
   */
  async explore(queryDto: ExploreQueryDto, uid: string): Promise<ExploreResponseDto> {
    try {
      const { query, context } = queryDto;

      // Initialize agent workflow
      const workflow = this.initializeWorkflow();

      // Initialize agent state
      const initialState: ExploreAgentState = {
        query,
        uid,
        context,
      };

      // Compile and run the workflow
      const compiledWorkflow = workflow.compile();
      const result = (await compiledWorkflow.invoke(initialState)) as ExploreAgentState;

      // Handle errors
      if (result.error) {
        console.error('Explore workflow error:', result.error);
      }

      // Return the response
      return {
        answer: result.answer || 'Unable to generate a response.',
        sources: result.sources || [],
        relatedTopics: result.analysis ? [result.analysis.substring(0, 100)] : undefined,
        suggestedQuestions: result.suggestedQuestions,
      };
    } catch (error) {
      console.error('Explore service error:', error);
      throw new Error(
        `Exploration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Quick search for memos (for initial exploration)
   * Returns memos without full LLM processing
   */
  async quickSearch(
    query: string,
    uid: string,
    limit: number = 5
  ): Promise<MemoListItemWithScoreDto[]> {
    try {
      const result = await this.memoService.vectorSearch({
        uid,
        query,
        page: 1,
        limit,
      });

      return result.items.filter((memo) => (memo.relevanceScore || 0) >= MIN_RELEVANCE_SCORE);
    } catch (error) {
      console.error('Quick search error:', error);
      return [];
    }
  }
}
