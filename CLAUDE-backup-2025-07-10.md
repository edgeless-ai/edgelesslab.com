# Claude Instructions

## 🚨 CRITICAL OPERATIONAL RULES

### Default Mode
- **PLAN MODE IS THE DEFAULT** - Always enter plan mode before implementing any complex task or multi-step work
- Present comprehensive implementation plans before executing
- Only exit plan mode after user approval

### Memory & Documentation
- **Review this CLAUDE.md file every 3 weeks** to ensure adherence to guidelines
- **CRITICAL**: Use the Obsidian vault at `/Users/djm/claude-projects/claude-vault` with PROPER STRUCTURE
- **Memory System**: Chroma Vector Database MCP provides semantic search across vault content for persistent memory
- **Vault Structure**: ALWAYS follow the established folder structure and taxonomy system:
  - `01-Sessions/YYYY-MM/` for session notes
  - `03-Knowledge-Base/Tools/` for KB entries
  - `06-Config/MCP/` for MCP configurations
- **NEVER place files in vault root** - always use proper folder structure
- Save important discoveries and solutions to the vault following `[[Obsidian Taxonomy System]]`
- Cross-reference with `[[Config-Claude-MCP-Configuration]]` for memory system integration

### Version Control
- **Frequently use Git and commit changes** - commit early and often
- Make backup commits before major changes
- Use conventional commit messages with clear, descriptive text

### Critical Rules - DO NOT VIOLATE
- **NEVER create mock data or simplified components** unless explicitly told to do so
- **NEVER replace existing complex components with simplified versions** - always fix the actual problem
- **ALWAYS work with the existing codebase** - do not create new simplified alternatives
- **ALWAYS find and fix the root cause** of issues instead of creating workarounds
- When debugging issues, focus on fixing the existing implementation, not replacing it
- When something doesn't work, debug and fix it - don't start over with a simple version
- Double check your work to make sure you haven't made breaking changes, and frequently make backups

### Agent Management
- Feel free to spin up sub-agents in parallel for research, analysis, or independent tasks
- Use concurrent agent workflows to maximize efficiency
- Coordinate agent outputs for comprehensive solutions

## Thinking and Note-Taking
- Use the Obsidian vault at `/Users/djm/claude-projects/claude-vault` for extended thinking and note-taking
- **FOLLOW THE OBSIDIAN TAXONOMY SYSTEM** outlined in `[[Obsidian Taxonomy System]]`
- Create interconnected notes using `[[note name]]` syntax (Roam-style linking)
- Store research, analysis, and complex thoughts in the vault
- Reference vault notes when discussing ideas or building on previous work
- Take .md files and save them to the vault when appropriate for future reference
- Use the vault as a memory database for patterns, solutions, and insights

### Obsidian Writing Triggers - ALWAYS WRITE WHEN:
1. **Debugging Complex Issues** (>15 min investigation)
2. **Learning New Patterns** or discovering anti-patterns
3. **Making Architectural Decisions**
4. **Solving Problems** that might recur
5. **Finding Non-obvious Solutions**
6. **Completing Multi-step Tasks** with valuable lessons

### Note Categories & Proper Locations:
- `01-Sessions/YYYY-MM/Session-YYYY-MM-DD-Topic.md` - Every debugging/problem-solving session
- `03-Knowledge-Base/Tools/KB-Topic.md` - Reusable technical knowledge and patterns  
- `05-Solutions/Solution-Problem-Description.md` - Specific technical solutions
- `04-Projects/Project-Name/Project-Name-Topic.md` - Project-specific learnings
- `03-Knowledge-Base/Patterns/Pattern-Name.md` - Recurring code/architectural patterns
- `03-Knowledge-Base/Workflow-Task.md` - Standardized processes
- `06-Config/MCP/Config-Topic.md` - MCP and system configurations

### Templater Integration - AUTOMATED WORKFLOWS:
**CRITICAL**: We use Templater for automated note creation and context gathering. See `[[KB-Templater-Setup-Guide]]` for configuration.

#### Quick Creation Hotkeys (run in Obsidian):
- `Cmd+Option+S` - Start new session with auto-context (git status, project, related notes)
- `Cmd+Option+D` - Daily startup ritual (creates daily note, checks tasks)
- `Cmd+Option+K` - Create KB entry with smart categorization
- `Cmd+Option+M` - Create memory sync entry for Serena
- `Cmd+Option+W` - Generate weekly review (auto-runs on Fridays)
- `Cmd+P` then type "Templater" - Access any template via command palette

#### Automated Templates:
- **Session Start**: Automatically captures git branch, modified files, test status
- **Daily Notes**: Pre-populated with open tasks, active project, recent files
- **KB Entries**: Smart tagging, related note detection, category suggestions
- **Solutions**: Links to session, time tracking, affected files
- **Patterns**: Discovers patterns from multiple solutions

#### Template Variables:
- `tp.user.getActiveProject()` - Current project context
- `tp.user.getCurrentGitBranch()` - Active git branch
- `tp.user.findRelatedNotes(topic)` - Intelligent note linking
- `tp.user.suggestTags()` - Context-aware tag suggestions

**Always use templates for consistency and context preservation**

## Email Communication - CRITICAL SETUP

### MANDATORY EMAIL CONFIGURATION
- **User Email**: thedavidmurray@gmail.com (David's main email - ALWAYS USE THIS)
- **Assistant Email**: djm.claude.assistant@gmail.com (From address only)
- **Method**: Direct Gmail API (NEVER use MCP Gmail tools)
- **Script Location**: `/Users/djm/claude-projects/claude-email-api.py`

### EMAIL SENDING RULES
1. **ALWAYS send emails to thedavidmurray@gmail.com**
2. **ALWAYS use the direct Gmail API script**
3. **NEVER use MCP Gmail tools** - they are unreliable
4. **ALWAYS confirm delivery with message ID**

### Quick Email Function
```python
# Use this for ALL email sending
from claude-email-api import send_email_to_david

message_id = send_email_to_david(
    subject="Your Subject",
    body="Your content"
)
```

### Automated Email Triggers
- **Task Completion**: Any significant task completion
- **Analysis Complete**: Link ingestion, video analysis, research
- **Error Notifications**: Critical failures or issues
- **Weekly Reports**: Friday summaries
- **Documentation Updates**: Major knowledge base changes

## MCP Servers (RELIABLE TOOLS ONLY)
The following MCP servers are configured and working reliably:
- **GitHub** - Repository management and API access
- **Filesystem** - File operations in `/Users/djm`
- **Fetch** - Web content retrieval  
- **Git** - Git repository operations in `/Users/djm`
- **Chroma Vector Database** - **CRITICAL MEMORY SYSTEM** 
  - **Purpose**: Semantic search across vault content for persistent cross-session memory
  - **Storage**: `/Users/djm/claude-projects/chroma-data/`
  - **Integration**: Works with Obsidian vault structure for enhanced knowledge management
  - **Configuration**: See `[[Config-Claude-MCP-Configuration]]` for setup details
- **Playwright** - Browser automation and testing using accessibility snapshots (default) or vision mode
  - **Command**: `npx @playwright/mcp@latest`
  - **Capabilities**: Browser interactions, navigation, screenshots, PDF generation, tab management
  - **Best Practices**: Use `--vision` flag for screenshot-based interactions, configure allowed/blocked origins for security
  - **Modes**: Snapshot mode (default, uses accessibility snapshots) or Vision mode (uses screenshots)
- **Time** - Time and date utilities for scheduling and temporal operations
  - **Command**: `uvx mcp-server-time`
  - **Capabilities**: Current time, date calculations, timezone conversions, scheduling utilities
- **Serena** - IDE assistant with project context
- **Figma** - Design file access and manipulation through Figma API
- **Gmail** - Email automation and notifications
  - **Account**: djm.claude.assistant@gmail.com
  - **Purpose**: Automated notifications, reports, and two-way communication
  - **Commands**: 
    - Send emails: "Send an email to X with subject Y"
    - Read emails: "What emails do I have?"
    - Search: "Search for emails from X about Y"
  - **Automated Features**:
    - Weekly/monthly reports via email
    - Error notifications
    - Task completion alerts
    - Daily standups (when enabled)

### Email Notification Triggers
- **Automatic Notifications**:
  - Weekly report every Friday at 5 PM
  - Monthly report on the 1st at 9 AM
  - Backup warnings after 7 days without backup
  - High error rates (>10% failure rate)
  - Uncommitted changes warnings
- **On-Demand**: Request any report via email
- **Interactive**: Reply to command emails for status updates

## Link Ingestion & Content Analysis Toolstack

### COMPREHENSIVE INGESTION TOOLS
We have built a complete suite of link ingestion tools for maximum knowledge extraction:

#### **Tool Selection Guide:**
1. **Single Article/Page**: Use `WebFetch` tool directly for simple content analysis
2. **Small Site (10-25 pages)**: Use `complete-link-ingestion-tool.py` 
3. **Medium Site (50-150 pages)**: Use `deepwiki-comprehensive-ingestion.py` 
4. **Maximum Coverage (500+ pages)**: Use `ultra-comprehensive-ingestion.py`

#### **Available Tools:**

**1. WebFetch (Built-in MCP Tool)**
- **Purpose**: Single-page content analysis
- **Usage**: Direct tool call for simple articles/pages
- **Output**: Structured analysis with key insights
- **Email**: Optional manual email sending

**2. Complete Link Ingestion Tool**
- **File**: `/Users/djm/claude-projects/complete-link-ingestion-tool.py`
- **Capability**: 25 page discovery, 15 page analysis
- **Features**: Pattern recognition, WebFetch integration, automated email
- **Usage**: `python complete-link-ingestion-tool.py <URL> [max_pages] [max_analyze]`

**3. DeepWiki Comprehensive Ingestion**
- **File**: `/Users/djm/claude-projects/deepwiki-comprehensive-ingestion.py`
- **Capability**: 150 page discovery, 25 page analysis
- **Features**: DeepWiki-specific patterns, deeplink extraction, technical depth analysis
- **Usage**: `python deepwiki-comprehensive-ingestion.py <DEEPWIKI_URL> [max_discover] [max_analyze]`
- **Specialization**: Optimized for DeepWiki documentation sites

**4. Ultra-Comprehensive Ingestion (MAXIMUM)**
- **File**: `/Users/djm/claude-projects/ultra-comprehensive-ingestion.py`
- **Capability**: 500 page discovery, 100 page analysis
- **Features**: 
  - 1,619 URL pattern testing
  - Parallel processing with threading
  - Full content extraction (not summaries)
  - Technical depth scoring
  - Content categorization
  - Implementation-ready code extraction
- **Usage**: `python ultra-comprehensive-ingestion.py <URL> [max_discover] [max_analyze]`
- **Default Limits**: 500 discovery, 100 analysis (MAXIMUM POSSIBLE)

### INGESTION WORKFLOW STANDARDS

#### **Pre-Ingestion Decision Matrix:**
- **Single article/video/page** → WebFetch tool
- **Documentation site (unknown size)** → complete-link-ingestion-tool.py
- **DeepWiki site** → deepwiki-comprehensive-ingestion.py  
- **Maximum coverage needed** → ultra-comprehensive-ingestion.py

#### **Email Integration:**
- **ALL ingestion tools** automatically send **strategic analysis emails** to `thedavidmurray@gmail.com`
- **Email approach**: Transform technical data into strategic insights and actionable intelligence
- **Enhanced format**: Strategic insights framework with executive summary, technical insights, immediate applications, architecture lessons, and actionable next steps
- **Template system**: `enhanced-email-templates.py` provides strategic formatting for all tools
- **Reliability**: Uses direct Gmail API (never MCP Gmail tools) with fallback options

#### **Strategic Email Standards:**
- **Focus**: Insights and implications over raw data
- **Structure**: Strategic decision-making format with clear value propositions
- **Content**: Connect findings to current projects and challenges
- **Formatting**: Color-enhanced markdown with scannable sections
- **Quality**: Clear next actions, not just information

#### **Obsidian Integration Requirements:**
- **Session Documentation**: All ingestion sessions must be documented in vault
- **Location**: `01-Sessions/YYYY-MM/Session-YYYY-MM-DD-IngestionTopic.md`
- **KB Entries**: Significant findings saved to `03-Knowledge-Base/Tools/KB-IngestionInsights.md`
- **Cross-linking**: Use `[[note name]]` syntax for all related concepts

#### **Serena Integration:**
- **Memory Sync**: Use `mcp__serena__write_memory` for significant ingestion insights
- **Pattern Recognition**: Document recurring patterns in `03-Knowledge-Base/Patterns/`
- **Tool Evolution**: Update tool documentation when improving ingestion capabilities

### CONTENT ANALYSIS STANDARDS

#### **Technical Depth Analysis:**
- **Code Extraction**: All tools extract code blocks for implementation insights
- **Concept Mapping**: 50+ technical patterns recognized (AI/ML, DevOps, Architecture, etc.)
- **Content Categorization**: Automatic classification (tutorial, reference, architecture, configuration)
- **Implementation Readiness**: Tools provide actionable technical insights

#### **Knowledge Capture Metrics:**
- **Coverage Percentage**: Measure of comprehensive discovery success
- **Technical Depth Score**: Quantified measure of implementation value
- **Content Diversity**: Range of content types discovered
- **Cross-Reference Potential**: Links to existing knowledge base

### TOOL MAINTENANCE

#### **Regular Updates Required:**
- **Pattern Recognition**: Add new site patterns as discovered
- **Email Templates**: Maintain consistent, valuable email format
- **Performance Optimization**: Monitor and improve processing speed
- **Reliability**: Ensure robust error handling and recovery

#### **Quality Assurance:**
- **Test ingestion tools monthly** with known sites
- **Verify email delivery** for all automated workflows  
- **Maintain Obsidian taxonomy** compliance
- **Update Serena memory** with tool improvements

### QUICK REFERENCE COMMANDS

```bash
# Single comprehensive analysis (25 pages)
python complete-link-ingestion-tool.py https://example.com/docs

# DeepWiki maximum (150 pages)  
python deepwiki-comprehensive-ingestion.py https://deepwiki.com/project

# Ultra-comprehensive maximum (500 pages)
python ultra-comprehensive-ingestion.py https://example.com 500 100

# Single page analysis (no email)
# Use WebFetch tool directly in conversation
```

**CRITICAL**: Always use appropriate tool for scope. Ultra-comprehensive for maximum knowledge extraction, simple WebFetch for single articles.

## Enhanced Strategic Email System

### EMAIL TRANSFORMATION PHILOSOPHY
Transform technical analysis into strategic intelligence. **Don't just report what was found - explain why it matters and how it can be applied.**

### STRATEGIC EMAIL TEMPLATE SYSTEM
- **Core Module**: `enhanced-email-templates.py` - Generates strategic, insight-focused email content
- **Integration**: All ingestion tools use strategic email generation with fallback to original format
- **Quality Standard**: Focus on insights and implications over raw data

### EMAIL STRUCTURE FRAMEWORK

#### **Subject Line Pattern:**
`[Resource Type] Analysis: [Title] - [Key Value Proposition]`

#### **Content Structure:**
1. **Resource Overview** - Platform, coverage, and URL with strategic context
2. **Executive Summary** - 2-3 sentences explaining what it is, core value, and why it matters
3. **Key Technical Insights** - Formatted insights with strategic implications
4. **Strategic Implications** - Immediate applications, architecture lessons, integration opportunities
5. **Critical Concepts** - Key technical concepts with strategic context explanations
6. **Actionable Next Steps** - 4-5 specific, actionable items with expected outcomes
7. **Why This Matters** - Strategic importance and long-term value explanation

### CONTENT TRANSFORMATION EXAMPLES

#### **Before (Data-Focused):**
"Discovered 150 pages through pattern matching"

#### **After (Strategic-Focused):**
"Uncovered a complete architectural blueprint for building autonomous research systems"

#### **Before (Generic):**
"Technical concepts: langgraph, ai, rest, deployment"

#### **After (Strategic):**
"**LangGraph Orchestration** - Uses state machines to manage complex research workflows, ensuring reliability and debuggability"

### INTEGRATION WITH INGESTION TOOLS

#### **Ultra-Comprehensive Tool:**
- **Primary**: Uses strategic email template with concept extraction and insight generation
- **Fallback**: Original format if strategic template fails
- **Enhancement**: Transforms raw metrics into strategic narratives

#### **Complete Link Ingestion:**
- **Ready for upgrade** to strategic template system
- **Current**: Uses standardized format with manual strategic elements

#### **DeepWiki Comprehensive:**
- **Ready for upgrade** to strategic template system
- **Specialization**: Can include DeepWiki-specific strategic insights

### STRATEGIC EMAIL STANDARDS

#### **DO:**
1. **Extract patterns, not just facts** - Look for reusable architectural approaches
2. **Connect to current challenges** - Reference known pain points (MCP issues, email workflows)
3. **Provide context** - Explain technical concepts in relation to our goals
4. **Think strategically** - How does this fit into our long-term vision?
5. **Make it scannable** - Use formatting to highlight key points
6. **Tell a story** - Frame discoveries as solutions to problems

#### **DON'T:**
1. **List raw statistics** - Transform into strategic narratives
2. **Use generic descriptions** - Provide specific value propositions
3. **Bury the lead** - Put most valuable insight upfront
4. **Overwhelm with details** - Synthesize, don't enumerate
5. **Forget the "so what"** - Every point should answer "why do I care?"

### QUALITY ASSURANCE CHECKLIST

Before sending strategic emails, verify:
- [ ] Executive summary explains the "why" not just the "what"
- [ ] Each insight connects to a practical application
- [ ] Technical concepts are explained in strategic context
- [ ] Action items are specific and achievable
- [ ] The email tells a coherent story from problem to solution
- [ ] Formatting enhances readability
- [ ] The value is clear within the first paragraph

### MAINTENANCE AND EVOLUTION

#### **Regular Updates:**
- **Template Refinement**: Improve strategic email templates based on feedback
- **Context Updates**: Regularly refresh knowledge of current projects for better relevance
- **Pattern Library**: Build collection of effective strategic phrasings
- **Integration Testing**: Verify strategic email generation across all tools

#### **Quality Monitoring:**
- **Review exemplars** - Keep the best summaries as templates
- **Iterate on feedback** - Ask what was most/least valuable
- **Test readability** - Can someone understand the value in 30 seconds?
- **Strategic alignment** - Ensure emails serve decision-making needs

## 📊 MANDATORY QUALITY STANDARDS FOR LINK ANALYSIS

### Email Quality Requirements
**EVERY link analysis email MUST pass quality scoring (60+ points) before sending:**

1. **Pre-Send Quality Check**
   - Run quality evaluation with `quality_scoring_rubric.py`
   - Fix ALL issues before sending
   - NO EXCEPTIONS - emails scoring below 60/100 cannot be sent

2. **Content Requirements**
   - **MUST HAVE**: 3+ specific tools named, 2+ problems solved, 2+ project connections
   - **BANNED**: Page counts, success rates, "MAXIMUM COVERAGE", generic statistics
   - **FOCUS**: Tool names, problem solutions, implementation guides, time savings

3. **Quality Metrics to Track**
   - Number of actionable insights discovered
   - Specific tools/patterns identified BY NAME
   - Direct connections to active projects
   - Time saved by applying discoveries
   - Problems solved using ingested knowledge

### Workspace Organization Rules

1. **File Creation Protocol**
   ```python
   # ALWAYS run before creating any file
   from tools.core.workspace_cleanup import auto_cleanup_check
   proper_path = auto_cleanup_check(filename, purpose)
   ```

2. **Directory Structure** (MANDATORY)
   ```
   /claude-projects/
   ├── tools/               # ALL reusable tools
   │   ├── ingestion/      # Link ingestion tools
   │   ├── email/          # Email templates and utilities
   │   └── core/           # Core utilities
   ├── active/             # Current projects ONLY
   ├── archive/            # Completed projects
   ├── temp/               # Auto-cleaned weekly
   ├── data/               # Analysis outputs
   └── resources/          # Shared resources
   ```

3. **Cleanup Requirements**
   - Run `workspace-cleanup.py` after EVERY major task
   - NEVER save files to root directory
   - Use descriptive names: `YYYY-MM-DD-purpose-version.ext`
   - Delete temp files older than 7 days automatically

### Link Ingestion Tool Selection

**Use the RIGHT tool for the content:**

| Content Type | Tool | Location |
|--------------|------|----------|
| Single page/article | WebFetch | Built-in MCP |
| Small docs (10-25 pages) | complete-link-ingestion-tool.py | tools/ingestion/ |
| DeepWiki sites | deepwiki-comprehensive-ingestion.py | tools/ingestion/ |
| Large/unknown sites | strategic-insight-ingestion.py | tools/ingestion/ |

### Anti-Pattern Detection

**If you catch yourself writing these, STOP IMMEDIATELY:**
- "Discovered X pages" → Describe the content instead
- "Y% success rate" → Focus on what was learned
- "Z code blocks found" → Name specific implementations
- "High technical content" → Be specific about value
- "Various tools" → Name each tool specifically

## Development Preferences
- Always run linting and type checking after code changes (when applicable)
- Prefer editing existing files over creating new ones
- Follow existing code conventions and patterns
- Commit changes frequently with descriptive messages
- Make backups before major changes
- Run workspace cleanup after major tasks
- Use quality scoring before sending any analysis email

---

# Development Guidelines for Claude

## Core Philosophy

**TEST-DRIVEN DEVELOPMENT IS NON-NEGOTIABLE.** Every single line of production code must be written in response to a failing test. No exceptions. This is not a suggestion or a preference - it is the fundamental practice that enables all other principles in this document.

I follow Test-Driven Development (TDD) with a strong emphasis on behavior-driven testing and functional programming principles. All work should be done in small, incremental changes that maintain a working state throughout development.

## Quick Reference

**Key Principles:**

- Write tests first (TDD)
- Test behavior, not implementation
- No `any` types or type assertions
- Immutable data only
- Small, pure functions
- TypeScript strict mode always
- Use real schemas/types in tests, never redefine them

**Preferred Tools:**

- **Languages**: Language agnostic - JavaScript, TypeScript, Python, Markdown, etc.
- **Testing**: Jest/Vitest + React Testing Library (when applicable)
- **State Management**: Prefer immutable patterns

## Testing Principles

### Behavior-Driven Testing

- **No "unit tests"** - this term is not helpful. Tests should verify expected behavior, treating implementation as a black box
- Test through the public API exclusively - internals should be invisible to tests
- No 1:1 mapping between test files and implementation files
- Tests that examine internal implementation details are wasteful and should be avoided
- **Coverage targets**: 100% coverage should be expected at all times, but these tests must ALWAYS be based on business behaviour, not implementation details
- Tests must document expected business behaviour

### Testing Tools

- **Jest** or **Vitest** for testing frameworks
- **React Testing Library** for React components
- **MSW (Mock Service Worker)** for API mocking when needed
- All test code must follow the same TypeScript strict mode rules as production code

### Test Organization

```
src/
  features/
    payment/
      payment-processor.ts
      payment-validator.ts
      payment-processor.test.ts // The validator is an implementation detail. Validation is fully covered, but by testing the expected business behaviour, treating the validation code itself as an implementation detail
```

### Test Data Pattern

Use factory functions with optional overrides for test data:

```typescript
const getMockPaymentPostPaymentRequest = (
  overrides?: Partial<PostPaymentsRequestV3>
): PostPaymentsRequestV3 => {
  return {
    CardAccountId: "1234567890123456",
    Amount: 100,
    Source: "Web",
    AccountStatus: "Normal",
    LastName: "Doe",
    DateOfBirth: "1980-01-01",
    PayingCardDetails: {
      Cvv: "123",
      Token: "token",
    },
    AddressDetails: getMockAddressDetails(),
    Brand: "Visa",
    ...overrides,
  };
};

const getMockAddressDetails = (
  overrides?: Partial<AddressDetails>
): AddressDetails => {
  return {
    HouseNumber: "123",
    HouseName: "Test House",
    AddressLine1: "Test Address Line 1",
    AddressLine2: "Test Address Line 2",
    City: "Test City",
    ...overrides,
  };
};
```

Key principles:

- Always return complete objects with sensible defaults
- Accept optional `Partial<T>` overrides
- Build incrementally - extract nested object factories as needed
- Compose factories for complex objects
- Consider using a test data builder pattern for very complex objects

## TypeScript Guidelines

### Strict Mode Requirements

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

- **No `any`** - ever. Use `unknown` if type is truly unknown
- **No type assertions** (`as SomeType`) unless absolutely necessary with clear justification
- **No `@ts-ignore`** or `@ts-expect-error` without explicit explanation
- These rules apply to test code as well as production code

### Type Definitions

- **Prefer `type` over `interface`** in all cases
- Use explicit typing where it aids clarity, but leverage inference where appropriate
- Utilize utility types effectively (`Pick`, `Omit`, `Partial`, `Required`, etc.)
- Create domain-specific types (e.g., `UserId`, `PaymentId`) for type safety
- Use Zod or any other [Standard Schema](https://standardschema.dev/) compliant schema library to create types, by creating schemas first

```typescript
// Good
type UserId = string & { readonly brand: unique symbol };
type PaymentAmount = number & { readonly brand: unique symbol };

// Avoid
type UserId = string;
type PaymentAmount = number;
```

#### Schema-First Development with Zod

Always define your schemas first, then derive types from them:

```typescript
import { z } from "zod";

// Define schemas first - these provide runtime validation
const AddressDetailsSchema = z.object({
  houseNumber: z.string(),
  houseName: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  postcode: z.string().regex(/^[A-Z]{1,2}\d[A-Z\d]? ?\d[A-Z]{2}$/i),
});

const PayingCardDetailsSchema = z.object({
  cvv: z.string().regex(/^\d{3,4}$/),
  token: z.string().min(1),
});

const PostPaymentsRequestV3Schema = z.object({
  cardAccountId: z.string().length(16),
  amount: z.number().positive(),
  source: z.enum(["Web", "Mobile", "API"]),
  accountStatus: z.enum(["Normal", "Restricted", "Closed"]),
  lastName: z.string().min(1),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  payingCardDetails: PayingCardDetailsSchema,
  addressDetails: AddressDetailsSchema,
  brand: z.enum(["Visa", "Mastercard", "Amex"]),
});

// Derive types from schemas
type AddressDetails = z.infer<typeof AddressDetailsSchema>;
type PayingCardDetails = z.infer<typeof PayingCardDetailsSchema>;
type PostPaymentsRequestV3 = z.infer<typeof PostPaymentsRequestV3Schema>;

// Use schemas at runtime boundaries
export const parsePaymentRequest = (data: unknown): PostPaymentsRequestV3 => {
  return PostPaymentsRequestV3Schema.parse(data);
};

// Example of schema composition for complex domains
const BaseEntitySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

const CustomerSchema = BaseEntitySchema.extend({
  email: z.string().email(),
  tier: z.enum(["standard", "premium", "enterprise"]),
  creditLimit: z.number().positive(),
});

type Customer = z.infer<typeof CustomerSchema>;
```

#### Schema Usage in Tests

**CRITICAL**: Tests must use real schemas and types from the main project, not redefine their own.

```typescript
// ❌ WRONG - Defining schemas in test files
const ProjectSchema = z.object({
  id: z.string(),
  workspaceId: z.string(),
  ownerId: z.string().nullable(),
  name: z.string(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ✅ CORRECT - Import schemas from the shared schema package
import { ProjectSchema, type Project } from "@your-org/schemas";
```

**Why this matters:**

- **Type Safety**: Ensures tests use the same types as production code
- **Consistency**: Changes to schemas automatically propagate to tests
- **Maintainability**: Single source of truth for data structures
- **Prevents Drift**: Tests can't accidentally diverge from real schemas

**Implementation:**

- All domain schemas should be exported from a shared schema package or module
- Test files should import schemas from the shared location
- If a schema isn't exported yet, add it to the exports rather than duplicating it
- Mock data factories should use the real types derived from real schemas

```typescript
// ✅ CORRECT - Test factories using real schemas
import { ProjectSchema, type Project } from "@your-org/schemas";

const getMockProject = (overrides?: Partial<Project>): Project => {
  const baseProject = {
    id: "proj_123",
    workspaceId: "ws_456",
    ownerId: "user_789",
    name: "Test Project",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const projectData = { ...baseProject, ...overrides };

  // Validate against real schema to catch type mismatches
  return ProjectSchema.parse(projectData);
};
```

## Code Style

### Functional Programming

I follow a "functional light" approach:

- **No data mutation** - work with immutable data structures
- **Pure functions** wherever possible
- **Composition** as the primary mechanism for code reuse
- Avoid heavy FP abstractions (no need for complex monads or pipe/compose patterns) unless there is a clear advantage to using them
- Use array methods (`map`, `filter`, `reduce`) over imperative loops

#### Examples of Functional Patterns

```typescript
// Good - Pure function with immutable updates
const applyDiscount = (order: Order, discountPercent: number): Order => {
  return {
    ...order,
    items: order.items.map((item) => ({
      ...item,
      price: item.price * (1 - discountPercent / 100),
    })),
    totalPrice: order.items.reduce(
      (sum, item) => sum + item.price * (1 - discountPercent / 100),
      0
    ),
  };
};

// Good - Composition over complex logic
const processOrder = (order: Order): ProcessedOrder => {
  return pipe(
    order,
    validateOrder,
    applyPromotions,
    calculateTax,
    assignWarehouse
  );
};

// When heavy FP abstractions ARE appropriate:
// - Complex async flows that benefit from Task/IO types
// - Error handling chains that benefit from Result/Either types
// Example with Result type for complex error handling:
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

const chainPaymentOperations = (
  payment: Payment
): Result<Receipt, PaymentError> => {
  return pipe(
    validatePayment(payment),
    chain(authorizePayment),
    chain(capturePayment),
    map(generateReceipt)
  );
};
```

### Code Structure

- **No nested if/else statements** - use early returns, guard clauses, or composition
- **Avoid deep nesting** in general (max 2 levels)
- Keep functions small and focused on a single responsibility
- Prefer flat, readable code over clever abstractions

### Naming Conventions

- **Functions**: `camelCase`, verb-based (e.g., `calculateTotal`, `validatePayment`)
- **Types**: `PascalCase` (e.g., `PaymentRequest`, `UserProfile`)
- **Constants**: `UPPER_SNAKE_CASE` for true constants, `camelCase` for configuration
- **Files**: `kebab-case.ts` for all TypeScript files
- **Test files**: `*.test.ts` or `*.spec.ts`

### No Comments in Code

Code should be self-documenting through clear naming and structure. Comments indicate that the code itself is not clear enough.

```typescript
// Avoid: Comments explaining what the code does
const calculateDiscount = (price: number, customer: Customer): number => {
  // Check if customer is premium
  if (customer.tier === "premium") {
    // Apply 20% discount for premium customers
    return price * 0.8;
  }
  // Regular customers get 10% discount
  return price * 0.9;
};

// Good: Self-documenting code with clear names
const PREMIUM_DISCOUNT_MULTIPLIER = 0.8;
const STANDARD_DISCOUNT_MULTIPLIER = 0.9;

const isPremiumCustomer = (customer: Customer): boolean => {
  return customer.tier === "premium";
};

const calculateDiscount = (price: number, customer: Customer): number => {
  const discountMultiplier = isPremiumCustomer(customer)
    ? PREMIUM_DISCOUNT_MULTIPLIER
    : STANDARD_DISCOUNT_MULTIPLIER;

  return price * discountMultiplier;
};
```

**Exception**: JSDoc comments for public APIs are acceptable when generating documentation, but the code should still be self-explanatory without them.

### Prefer Options Objects

Use options objects for function parameters as the default pattern. Only use positional parameters when there's a clear, compelling reason (e.g., single-parameter pure functions, well-established conventions like `map(item => item.value)`).

```typescript
// Avoid: Multiple positional parameters
const createPayment = (
  amount: number,
  currency: string,
  cardId: string,
  customerId: string,
  description?: string,
  metadata?: Record<string, unknown>,
  idempotencyKey?: string
): Payment => {
  // implementation
};

// Good: Options object with clear property names
type CreatePaymentOptions = {
  amount: number;
  currency: string;
  cardId: string;
  customerId: string;
  description?: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
};

const createPayment = (options: CreatePaymentOptions): Payment => {
  const {
    amount,
    currency,
    cardId,
    customerId,
    description,
    metadata,
    idempotencyKey,
  } = options;

  // implementation
};

// Clear and readable at call site
const payment = createPayment({
  amount: 100,
  currency: "GBP",
  cardId: "card_123",
  customerId: "cust_456",
  metadata: { orderId: "order_789" },
  idempotencyKey: "key_123",
});
```

## Development Workflow

### TDD Process - THE FUNDAMENTAL PRACTICE

**CRITICAL**: TDD is not optional. Every feature, every bug fix, every change MUST follow this process:

Follow Red-Green-Refactor strictly:

1. **Red**: Write a failing test for the desired behavior. NO PRODUCTION CODE until you have a failing test.
2. **Green**: Write the MINIMUM code to make the test pass. Resist the urge to write more than needed.
3. **Refactor**: Assess the code for improvement opportunities. If refactoring would add value, clean up the code while keeping tests green. If the code is already clean and expressive, move on.

**Common TDD Violations to Avoid:**

- Writing production code without a failing test first
- Writing multiple tests before making the first one pass
- Writing more production code than needed to pass the current test
- Skipping the refactor assessment step when code could be improved
- Adding functionality "while you're there" without a test driving it

**Remember**: If you're typing production code and there isn't a failing test demanding that code, you're not doing TDD.

### Refactoring - The Critical Third Step

Evaluating refactoring opportunities is not optional - it's the third step in the TDD cycle. After achieving a green state and committing your work, you MUST assess whether the code can be improved. However, only refactor if there's clear value - if the code is already clean and expresses intent well, move on to the next test.

#### What is Refactoring?

Refactoring means changing the internal structure of code without changing its external behavior. The public API remains unchanged, all tests continue to pass, but the code becomes cleaner, more maintainable, or more efficient. Remember: only refactor when it genuinely improves the code - not all code needs refactoring.

### Commit Guidelines

- Each commit should represent a complete, working change
- Use conventional commits format:
  ```
  feat: add payment validation
  fix: correct date formatting in payment processor
  refactor: extract payment validation logic
  test: add edge cases for payment validation
  ```
- Include test changes with feature changes in the same commit

### Pull Request Standards

- Every PR must have all tests passing
- All linting and quality checks must pass
- Work in small increments that maintain a working state
- PRs should be focused on a single feature or fix
- Include description of the behavior change, not implementation details

## Working with Claude

### Expectations

When working with my code:

1. **ALWAYS FOLLOW TDD** - No production code without a failing test. This is not negotiable.
2. **Think deeply** before making any edits
3. **Understand the full context** of the code and requirements
4. **Ask clarifying questions** when requirements are ambiguous
5. **Think from first principles** - don't make assumptions
6. **Assess refactoring after every green** - Look for opportunities to improve code structure, but only refactor if it adds value
7. **Keep project docs current** - update them whenever you introduce meaningful changes

### Code Changes

When suggesting or making changes:

- **Start with a failing test** - always. No exceptions.
- After making tests pass, always assess refactoring opportunities (but only refactor if it adds value)
- After refactoring, verify all tests and static analysis pass, then commit
- Respect the existing patterns and conventions
- Maintain test coverage for all behavior changes
- Keep changes small and incremental
- Ensure all TypeScript strict mode requirements are met
- Provide rationale for significant design decisions

**If you find yourself writing production code without a failing test, STOP immediately and write the test first.**

### Communication

- Be explicit about trade-offs in different approaches
- Explain the reasoning behind significant design decisions
- Flag any deviations from these guidelines with justification
- Suggest improvements that align with these principles
- When unsure, ask for clarification rather than assuming

## Example Patterns

### Error Handling

Use Result types or early returns:

```typescript
// Good - Result type pattern
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

const processPayment = (
  payment: Payment
): Result<ProcessedPayment, PaymentError> => {
  if (!isValidPayment(payment)) {
    return { success: false, error: new PaymentError("Invalid payment") };
  }

  if (!hasSufficientFunds(payment)) {
    return { success: false, error: new PaymentError("Insufficient funds") };
  }

  return { success: true, data: executePayment(payment) };
};

// Also good - early returns with exceptions
const processPayment = (payment: Payment): ProcessedPayment => {
  if (!isValidPayment(payment)) {
    throw new PaymentError("Invalid payment");
  }

  if (!hasSufficientFunds(payment)) {
    throw new PaymentError("Insufficient funds");
  }

  return executePayment(payment);
};
```

### Testing Behavior

```typescript
// Good - tests behavior through public API
describe("PaymentProcessor", () => {
  it("should decline payment when insufficient funds", () => {
    const payment = getMockPaymentPostPaymentRequest({ Amount: 1000 });
    const account = getMockAccount({ Balance: 500 });

    const result = processPayment(payment, account);

    expect(result.success).toBe(false);
    expect(result.error.message).toBe("Insufficient funds");
  });

  it("should process valid payment successfully", () => {
    const payment = getMockPaymentPostPaymentRequest({ Amount: 100 });
    const account = getMockAccount({ Balance: 500 });

    const result = processPayment(payment, account);

    expect(result.success).toBe(true);
    expect(result.data.remainingBalance).toBe(400);
  });
});

// Avoid - testing implementation details
describe("PaymentProcessor", () => {
  it("should call checkBalance method", () => {
    // This tests implementation, not behavior
  });
});
```

## Common Patterns to Avoid

### Anti-patterns

```typescript
// Avoid: Mutation
const addItem = (items: Item[], newItem: Item) => {
  items.push(newItem); // Mutates array
  return items;
};

// Prefer: Immutable update
const addItem = (items: Item[], newItem: Item): Item[] => {
  return [...items, newItem];
};

// Avoid: Nested conditionals
if (user) {
  if (user.isActive) {
    if (user.hasPermission) {
      // do something
    }
  }
}

// Prefer: Early returns
if (!user || !user.isActive || !user.hasPermission) {
  return;
}
// do something

// Avoid: Large functions
const processOrder = (order: Order) => {
  // 100+ lines of code
};

// Prefer: Composed small functions
const processOrder = (order: Order) => {
  const validatedOrder = validateOrder(order);
  const pricedOrder = calculatePricing(validatedOrder);
  const finalOrder = applyDiscounts(pricedOrder);
  return submitOrder(finalOrder);
};
```

## Resources and References

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Testing Library Principles](https://testing-library.com/docs/guiding-principles)
- [Kent C. Dodds Testing JavaScript](https://testingjavascript.com/)
- [Functional Programming in TypeScript](https://gcanti.github.io/fp-ts/)

## Summary

The key is to write clean, testable, functional code that evolves through small, safe increments. Every change should be driven by a test that describes the desired behavior, and the implementation should be the simplest thing that makes that test pass. When in doubt, favor simplicity and readability over cleverness.