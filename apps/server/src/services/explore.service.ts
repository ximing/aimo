import { Service } from 'typedi';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { StateGraph, END, START, Annotation } from '@langchain/langgraph';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type {
  ExploreQueryDto,
  ExploreResponseDto,
  ExploreSourceDto,
  MemoListItemDto,
  AttachmentDto,
} from '@aimo/dto';
import { config } from '../config/config.js';
import { MemoService } from './memo.service.js';
import { EmbeddingService } from './embedding.service.js';
import { LanceDbService } from '../sources/lancedb.js';
import { MemoRelationService } from './memo-relation.service.js';
import { AttachmentService } from './attachment.service.js';
import type { MemoListItemWithScoreDto } from '@aimo/dto';

/**
 * Node names for the agent workflow
 */
const NODE_RETRIEVE = 'retrieve' as const;
const NODE_ANALYZE = 'analyze' as const;
const NODE_RELATION_ANALYSIS = 'relationAnalysis' as const;
const NODE_ATTACHMENT_ANALYSIS = 'attachmentAnalysis' as const;
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
  // Relation analysis results
  relationAnalysis?: {
    relatedMemoIds: string[];
    relationTypes: Record<string, string[]>;
    analysis: string;
  };
  // Attachment analysis results
  attachmentAnalysis?: {
    attachmentSummaries: Record<string, string>;
    keyInsights: string[];
    analyzedAttachments: AttachmentDto[];
  };
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
    private lanceDb: LanceDbService,
    private memoRelationService: MemoRelationService,
    private attachmentService: AttachmentService
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
   * Creates a state graph with retrieval, analysis, relation analysis, attachment analysis, and generation nodes
   * Uses parallel execution for relation and attachment analysis to meet performance requirements
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
      relationAnalysis: Annotation<
        | {
            relatedMemoIds: string[];
            relationTypes: Record<string, string[]>;
            analysis: string;
          }
        | undefined
      >,
      attachmentAnalysis: Annotation<
        | {
            attachmentSummaries: Record<string, string>;
            keyInsights: string[];
            analyzedAttachments: AttachmentDto[];
          }
        | undefined
      >,
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

    // Add relation analysis node
    workflow.addNode(NODE_RELATION_ANALYSIS, this.relationAnalysisNode.bind(this));

    // Add attachment analysis node
    workflow.addNode(NODE_ATTACHMENT_ANALYSIS, this.attachmentAnalysisNode.bind(this));

    // Add generation node
    workflow.addNode(NODE_GENERATE, this.generationNode.bind(this));

    // Define edges - use type assertions to avoid strict type checking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (workflow as any).addEdge(NODE_RETRIEVE, NODE_ANALYZE);

    // Parallel execution: from analysis, go to both relation and attachment analysis
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (workflow as any).addEdge(NODE_ANALYZE, NODE_RELATION_ANALYSIS);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (workflow as any).addEdge(NODE_ANALYZE, NODE_ATTACHMENT_ANALYSIS);

    // Both parallel branches converge to generation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (workflow as any).addEdge(NODE_RELATION_ANALYSIS, NODE_GENERATE);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (workflow as any).addEdge(NODE_ATTACHMENT_ANALYSIS, NODE_GENERATE);

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
   * Relation Analysis Agent node
   * Analyzes relationships between retrieved memos and the broader knowledge graph
   */
  private async relationAnalysisNode(
    state: ExploreAgentState
  ): Promise<Partial<ExploreAgentState>> {
    const startTime = Date.now();
    try {
      const { uid, retrievedMemos, query } = state;

      if (!retrievedMemos || retrievedMemos.length === 0) {
        return {
          relationAnalysis: {
            relatedMemoIds: [],
            relationTypes: {},
            analysis: 'No memos to analyze for relations.',
          },
        };
      }

      // Collect all related memo IDs and backlinks from retrieved memos
      const allRelatedIds = new Set<string>();
      const relationTypes: Record<string, string[]> = {};
      const backlinksMap = new Map<string, string[]>(); // memoId -> backlink source IDs

      // Fetch relations and backlinks for each retrieved memo (in parallel for speed)
      await Promise.all(
        retrievedMemos.map(async (memo) => {
          try {
            // Get forward relations (this memo -> others)
            const relatedIds = await this.memoRelationService.getRelatedMemos(uid, memo.memoId);
            if (relatedIds.length > 0) {
              relationTypes[memo.memoId] = ['outgoing'];
              relatedIds.forEach((id) => allRelatedIds.add(id));
            }

            // Get backlinks (others -> this memo)
            const backlinks = await this.memoRelationService.getBacklinks(uid, memo.memoId);
            if (backlinks.length > 0) {
              backlinksMap.set(memo.memoId, backlinks);
              const existingTypes = relationTypes[memo.memoId] || [];
              relationTypes[memo.memoId] = [...existingTypes, 'incoming'];
              backlinks.forEach((id) => allRelatedIds.add(id));
            }
          } catch (error) {
            console.warn(`Failed to fetch relations for memo ${memo.memoId}:`, error);
          }
        })
      );

      // Fetch the actual related memo content
      const relatedMemoIds = Array.from(allRelatedIds).slice(0, 20); // Limit to 20 related memos
      let relatedMemos: MemoListItemDto[] = [];
      if (relatedMemoIds.length > 0) {
        try {
          relatedMemos = await this.memoService.getMemosByIds(relatedMemoIds, uid);
        } catch (error) {
          console.warn('Failed to fetch related memos:', error);
        }
      }

      // Build relation analysis context
      const retrievedMemoIds = new Set(retrievedMemos.map((m) => m.memoId));
      const analysisParts: string[] = [];

      // Analyze connections between retrieved memos
      const connectionsBetweenRetrieved = retrievedMemos.filter(
        (memo) => relationTypes[memo.memoId] && relationTypes[memo.memoId].length > 0
      );

      if (connectionsBetweenRetrieved.length > 0) {
        analysisParts.push(
          `Found ${connectionsBetweenRetrieved.length} memos with explicit relations in the retrieved set.`
        );
      }

      // Analyze backlinks
      const totalBacklinks = Array.from(backlinksMap.values()).flat().length;
      if (totalBacklinks > 0) {
        analysisParts.push(
          `Found ${totalBacklinks} backlinks pointing to retrieved memos, indicating they are referenced by other notes.`
        );
      }

      // Analyze temporal patterns
      const timestamps = retrievedMemos.map((m) => m.createdAt);
      const timeRange = Math.max(...timestamps) - Math.min(...timestamps);
      const daysRange = timeRange / (1000 * 60 * 60 * 24);
      if (daysRange > 30) {
        analysisParts.push(
          `Memos span ${Math.round(daysRange)} days, showing long-term relevance to the query.`
        );
      }

      // Build analysis summary
      const analysis = analysisParts.join(' ') || 'No significant relations found among retrieved memos.';

      // Generate LLM-based relation insights if we have related memos
      let enhancedAnalysis = analysis;
      if (relatedMemos.length > 0) {
        try {
          const relationPrompt = `Analyze the relationships between these memos and their connected notes to answer: "${query}"

Retrieved Memos:
${retrievedMemos.map((m, i) => `[${i + 1}] ${m.content.substring(0, 300)}${m.content.length > 300 ? '...' : ''}`).join('\n\n')}

Related Connected Memos:
${relatedMemos.slice(0, 5).map((m, i) => `[R${i + 1}] ${m.content.substring(0, 200)}${m.content.length > 200 ? '...' : ''}`).join('\n\n')}

Identify:
1. Key thematic connections between retrieved memos
2. How connected memos provide additional context
3. Any knowledge clusters or patterns

Provide a brief analysis (2-3 sentences):`;

          const messages = [
            new SystemMessage(
              'You are an expert at analyzing knowledge graphs and identifying connections between notes.'
            ),
            new HumanMessage(relationPrompt),
          ];

          const response = await this.model.invoke(messages);
          const llmAnalysis = typeof response.content === 'string' ? response.content.trim() : '';
          if (llmAnalysis) {
            enhancedAnalysis = `${analysis}\n\n${llmAnalysis}`;
          }
        } catch (error) {
          console.warn('LLM relation analysis failed:', error);
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`Relation analysis completed in ${elapsed}ms`);

      return {
        relationAnalysis: {
          relatedMemoIds: relatedMemoIds,
          relationTypes,
          analysis: enhancedAnalysis,
        },
      };
    } catch (error) {
      console.error('Relation analysis agent error:', error);
      return {
        relationAnalysis: {
          relatedMemoIds: [],
          relationTypes: {},
          analysis: 'Relation analysis could not be completed due to an error.',
        },
      };
    }
  }

  /**
   * Attachment Understanding Agent node
   * Analyzes attachments (images, PDFs) from retrieved memos to extract key information
   */
  private async attachmentAnalysisNode(
    state: ExploreAgentState
  ): Promise<Partial<ExploreAgentState>> {
    const startTime = Date.now();
    try {
      const { retrievedMemos, query } = state;

      if (!retrievedMemos || retrievedMemos.length === 0) {
        return {
          attachmentAnalysis: {
            attachmentSummaries: {},
            keyInsights: [],
            analyzedAttachments: [],
          },
        };
      }

      // Collect all attachments from retrieved memos
      const allAttachments: AttachmentDto[] = [];
      const memoAttachmentsMap = new Map<string, AttachmentDto[]>();

      for (const memo of retrievedMemos) {
        if (memo.attachments && memo.attachments.length > 0) {
          const memoAtts = memo.attachments.filter(
            (att) => att.type.startsWith('image/') || att.type === 'application/pdf'
          );
          if (memoAtts.length > 0) {
            allAttachments.push(...memoAtts);
            memoAttachmentsMap.set(memo.memoId, memoAtts);
          }
        }
      }

      if (allAttachments.length === 0) {
        return {
          attachmentAnalysis: {
            attachmentSummaries: {},
            keyInsights: [],
            analyzedAttachments: [],
          },
        };
      }

      // Limit attachments to analyze for performance (max 5)
      const attachmentsToAnalyze = allAttachments.slice(0, 5);
      const attachmentSummaries: Record<string, string> = {};
      const keyInsights: string[] = [];

      // Analyze each attachment
      for (const attachment of attachmentsToAnalyze) {
        try {
          const isImage = attachment.type.startsWith('image/');
          const isPDF = attachment.type === 'application/pdf';

          if (isImage) {
            // For images, generate a description based on context
            // In a full implementation, this could use multimodal LLM capabilities
            const contextMemos = Array.from(memoAttachmentsMap.entries())
              .filter(([_, atts]) => atts.some((a) => a.attachmentId === attachment.attachmentId))
              .map(([memoId, _]) => retrievedMemos.find((m) => m.memoId === memoId))
              .filter(Boolean);

            const contextText = contextMemos
              .map((m) => m?.content.substring(0, 200))
              .join('; ');

            attachmentSummaries[attachment.attachmentId] = `Image: ${attachment.filename}. ${contextText ? 'Referenced in context: ' + contextText : 'No direct context available.'}`;

            // Extract potential insights from image filename and context
            if (attachment.filename.match(/chart|graph|diagram|flow/i)) {
              keyInsights.push(`Image "${attachment.filename}" may contain visual data or diagrams relevant to the query.`);
            } else if (attachment.filename.match(/screenshot|screen/i)) {
              keyInsights.push(`Screenshot "${attachment.filename}" captures a specific state or interface.`);
            }
          } else if (isPDF) {
            // For PDFs, note their presence and potential relevance
            attachmentSummaries[attachment.attachmentId] = `PDF Document: ${attachment.filename}. Content extraction would require additional processing.`;
            keyInsights.push(`PDF "${attachment.filename}" may contain detailed reference material.`);
          }
        } catch (error) {
          console.warn(`Failed to analyze attachment ${attachment.attachmentId}:`, error);
          attachmentSummaries[attachment.attachmentId] = `Unable to analyze ${attachment.filename}`;
        }
      }

      // Generate LLM-based attachment insights
      if (attachmentsToAnalyze.length > 0) {
        try {
          const attachmentPrompt = `Given the query "${query}", analyze how these attachments might provide additional context:

Attachments:
${attachmentsToAnalyze.map((att, i) => `[${i + 1}] ${att.filename} (${att.type})`).join('\n')}

Context from related memos:
${retrievedMemos.slice(0, 3).map((m) => `- ${m.content.substring(0, 150)}...`).join('\n')}

What key information might these attachments contain that could help answer the query?
Provide 1-2 brief insights:`;

          const messages = [
            new SystemMessage(
              'You are an expert at understanding how visual and document content can provide context to questions.'
            ),
            new HumanMessage(attachmentPrompt),
          ];

          const response = await this.model.invoke(messages);
          const llmInsights = typeof response.content === 'string' ? response.content.trim() : '';

          if (llmInsights) {
            // Parse insights (one per line, take up to 2)
            const parsedInsights = llmInsights
              .split('\n')
              .map((line) => line.trim())
              .filter((line) => line.length > 0 && !line.match(/^\d+[.)]/))
              .slice(0, 2);

            keyInsights.push(...parsedInsights);
          }
        } catch (error) {
          console.warn('LLM attachment analysis failed:', error);
        }
      }

      const elapsed = Date.now() - startTime;
      console.log(`Attachment analysis completed in ${elapsed}ms`);

      return {
        attachmentAnalysis: {
          attachmentSummaries,
          keyInsights: keyInsights.slice(0, 5), // Limit to 5 insights
          analyzedAttachments: attachmentsToAnalyze,
        },
      };
    } catch (error) {
      console.error('Attachment analysis agent error:', error);
      return {
        attachmentAnalysis: {
          attachmentSummaries: {},
          keyInsights: [],
          analyzedAttachments: [],
        },
      };
    }
  }

  /**
   * Summary/Generation Agent node
   * Generates the final answer based on analysis, relation analysis, and attachment analysis
   */
  private async generationNode(state: ExploreAgentState): Promise<Partial<ExploreAgentState>> {
    try {
      const { query, retrievedMemos, analysis, relationAnalysis, attachmentAnalysis, context } =
        state;

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
      // Format: User/Assistant alternating messages for multi-turn dialogue
      const contextSection = context
        ? `\n\nPrevious Conversation History:\n${context}\n\nThis is a follow-up question. Consider the conversation history above when answering.`
        : '';

      // Build relation context
      let relationContext = '';
      if (relationAnalysis && relationAnalysis.relatedMemoIds.length > 0) {
        relationContext = `\n\nRelation Analysis:\n${relationAnalysis.analysis}`;
      }

      // Build attachment context
      let attachmentContext = '';
      if (attachmentAnalysis && attachmentAnalysis.analyzedAttachments.length > 0) {
        attachmentContext = `\n\nAttachment Analysis:\nAnalyzed ${attachmentAnalysis.analyzedAttachments.length} attachments.\n${attachmentAnalysis.keyInsights.join('\n')}`;
      }

      // Create generation prompt with integrated analysis
      const generationPrompt = `You are answering a user's question based on their personal notes and knowledge graph.${contextSection}

User Query: ${query}

Relevant Notes:
${memoContext}

Analysis of Notes:
${analysis || 'No analysis available.'}${relationContext}${attachmentContext}

Instructions:
1. Answer the user's question using ONLY the information from the notes above
2. Cite sources using [1], [2], etc. format to reference the notes
3. If the notes don't contain enough information, clearly state this
4. Consider the relation analysis to provide context about connected ideas
5. Consider the attachment analysis for any visual or document context
6. Be concise but comprehensive
7. Format your response in Markdown

Provide your answer:`;

      // Generate answer
      const messages = [
        new SystemMessage(
          "You are a helpful AI assistant that answers questions based on the user's personal notes. " +
          "Always cite your sources using [1], [2], etc. " +
          "Consider relationships between notes and any attachment context in your answer. " +
          "For follow-up questions, reference the conversation history to maintain context and provide coherent multi-turn responses."
        ),
        new HumanMessage(generationPrompt),
      ];

      const response = await this.model.invoke(messages);
      const answer = typeof response.content === 'string' ? response.content : '';

      // Map memos to sources with generated titles
      const sources: ExploreSourceDto[] = retrievedMemos.map((memo) => {
        // Generate title from first line or first 50 chars of content
        const firstLine = memo.content.split('\n')[0].trim();
        const title = firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;

        return {
          memoId: memo.memoId,
          title,
          content: memo.content.substring(0, 200) + (memo.content.length > 200 ? '...' : ''),
          relevanceScore: state.relevanceScores?.[memo.memoId] || 0,
          createdAt: memo.createdAt,
        };
      });

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
