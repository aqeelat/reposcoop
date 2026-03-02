# Changelog Discovery Solutions for RepoScoop

## Problem Statement

Many repositories don't publish their changelogs in GitHub release notes. Instead, they maintain changelogs in markdown files within the repository. This is especially challenging in monorepos where:

1. Multiple packages may have separate changelog files
2. Different directory structures and naming conventions are used
3. Package organization varies significantly between projects
4. Some packages may have changelogs while others don't

Currently, RepoScoop relies solely on GitHub's Releases API, missing valuable changelog information stored in repository files.

## Common Changelog Patterns Analysis

Based on popular open-source projects, changelog files typically follow these patterns:

### Naming Conventions

- **Root level**: `CHANGELOG.md`, `CHANGES.md`, `HISTORY.md`, `NEWS.md`, `RELEASES.md`
- **Case variations**: `changelog.md`, `Changelog.md`, `CHANGELOG.MD`
- **With extensions**: `CHANGELOG.rst`, `CHANGELOG.txt`, `CHANGELOG`

### Monorepo Structures

- **Package-specific**: `packages/[package-name]/CHANGELOG.md`
- **Grouped by scope**: `libs/[lib-name]/CHANGELOG.md`, `apps/[app-name]/CHANGELOG.md`
- **Workspace patterns**: `workspace/[workspace]/CHANGELOG.md`
- **Nested structures**: `src/[component]/docs/CHANGELOG.md`

## Proposed Solutions

## Solution 1: Intelligent File Discovery with Pattern Matching

### Overview

Implement a comprehensive file discovery system that intelligently searches for changelog files using multiple strategies and heuristics.

### Implementation Details

#### Phase 1: Repository Scanning

```typescript
interface ChangelogFile {
  path: string;
  packageName: string | null;
  confidence: number;
  lastModified: Date;
  size: number;
}

class ChangelogDiscovery {
  async discoverChangelogs(owner: string, repo: string): Promise<ChangelogFile[]> {
    const candidates = await this.findCandidateFiles(owner, repo);
    return this.rankAndFilterCandidates(candidates);
  }

  private async findCandidateFiles(owner: string, repo: string): Promise<ChangelogFile[]> {
    // Multi-strategy file discovery
    const strategies = [this.searchByFilename, this.searchByDirectory, this.searchByContent];

    const results = await Promise.all(strategies.map((strategy) => strategy(owner, repo)));

    return this.deduplicateResults(results.flat());
  }
}
```

#### File Discovery Strategies

1. **Filename Pattern Matching**
   - Search for files matching known changelog patterns
   - Use GitHub's search API with filename filters
   - Support regex patterns for flexible matching

2. **Directory-Based Discovery**
   - Analyze repository structure for common monorepo patterns
   - Identify package directories (package.json, cargo.toml, setup.py, etc.)
   - Search for changelog files within identified package directories

3. **Content-Based Discovery**
   - Search for files containing changelog-specific content patterns
   - Look for version headers, date patterns, and release notes formatting
   - Use GitHub's code search API with changelog-related queries

#### Confidence Scoring System

```typescript
interface ConfidenceFactors {
  filenameMatch: number; // 0-40 points
  pathRelevance: number; // 0-25 points
  contentAnalysis: number; // 0-25 points
  fileSize: number; // 0-5 points
  lastActivity: number; // 0-5 points
}

function calculateConfidence(file: ChangelogFile, analysis: ConfidenceFactors): number {
  return Math.min(
    100,
    analysis.filenameMatch +
      analysis.pathRelevance +
      analysis.contentAnalysis +
      analysis.fileSize +
      analysis.lastActivity,
  );
}
```

### Advantages

- **High Accuracy**: Multiple validation layers reduce false positives
- **Adaptable**: Works with various repository structures and naming conventions
- **Performance**: Can be optimized with caching and parallel processing
- **Extensible**: Easy to add new discovery patterns and heuristics

### Disadvantages

- **API Intensive**: Requires multiple GitHub API calls, impacting rate limits
- **Complexity**: Sophisticated ranking algorithm needs fine-tuning
- **Maintenance**: Patterns may need updates as conventions evolve

### Implementation Complexity: **Medium-High**

---

## Solution 2: Repository Structure Analysis and Mapping

### Overview

Create a comprehensive repository analysis system that understands project structures and applies context-aware changelog discovery rules.

### Implementation Details

#### Project Type Detection

```typescript
interface ProjectStructure {
  type: 'monorepo' | 'single-package' | 'multi-component';
  framework: string[];
  packageManager: 'npm' | 'yarn' | 'pnpm' | 'cargo' | 'go' | 'maven' | 'gradle' | 'unknown';
  workspaceConfig: WorkspaceConfig | null;
  packages: PackageInfo[];
}

interface PackageInfo {
  name: string;
  path: string;
  type: 'library' | 'application' | 'tool' | 'example';
  configFiles: string[];
  changelogPath: string | null;
}

class RepositoryAnalyzer {
  async analyzeStructure(owner: string, repo: string): Promise<ProjectStructure> {
    const rootFiles = await this.getRootFiles(owner, repo);
    const projectType = this.detectProjectType(rootFiles);
    const packages = await this.discoverPackages(owner, repo, projectType);

    return {
      type: projectType,
      framework: this.detectFrameworks(rootFiles),
      packageManager: this.detectPackageManager(rootFiles),
      workspaceConfig: this.parseWorkspaceConfig(rootFiles),
      packages: await this.enrichPackagesWithChangelogs(owner, repo, packages),
    };
  }
}
```

#### Structure-Specific Discovery Rules

```typescript
class StructureBasedDiscovery {
  private discoveryRules = new Map<string, ChangelogDiscoveryRule[]>([
    [
      'lerna',
      [
        { pattern: 'packages/*/CHANGELOG.md', priority: 10 },
        { pattern: 'packages/*/HISTORY.md', priority: 8 },
        { pattern: 'CHANGELOG.md', priority: 5 },
      ],
    ],
    [
      'nx',
      [
        { pattern: 'libs/*/CHANGELOG.md', priority: 10 },
        { pattern: 'apps/*/CHANGELOG.md', priority: 10 },
        { pattern: 'packages/*/CHANGELOG.md', priority: 9 },
      ],
    ],
    [
      'cargo-workspace',
      [
        { pattern: '*/Cargo.toml/../CHANGELOG.md', priority: 10 },
        { pattern: 'CHANGELOG.md', priority: 5 },
      ],
    ],
  ]);

  async discoverByStructure(structure: ProjectStructure): Promise<ChangelogFile[]> {
    const rules = this.getApplicableRules(structure);
    return this.applyDiscoveryRules(rules, structure);
  }
}
```

#### Smart Package Detection

- **NPM/Yarn**: Parse `package.json` and workspace configurations
- **Go Modules**: Analyze `go.mod` and directory structure
- **Rust**: Parse `Cargo.toml` workspace definitions
- **Maven/Gradle**: Understand multi-module project structures
- **Python**: Detect packages through `setup.py`, `pyproject.toml`

### Advantages

- **Context-Aware**: Understanding project structure improves accuracy
- **Efficient**: Targeted discovery reduces unnecessary API calls
- **Comprehensive**: Covers wide range of project types and conventions
- **Maintainable**: Rule-based system is easy to extend and modify

### Disadvantages

- **Initial Overhead**: Repository analysis requires upfront processing
- **Rule Maintenance**: Discovery rules need regular updates for new patterns
- **Edge Cases**: Unusual project structures may not be handled well

### Implementation Complexity: **High**

---

## Solution 3: Community-Driven Changelog Database

### Overview

Build a collaborative database where users and automated systems contribute changelog location information for repositories, creating a knowledge base that improves over time.

### Implementation Details

#### Database Schema

```typescript
interface ChangelogRegistry {
  repoId: string;
  owner: string;
  repo: string;
  changelogs: ChangelogEntry[];
  lastUpdated: Date;
  verificationStatus: 'verified' | 'pending' | 'outdated';
  contributorCount: number;
}

interface ChangelogEntry {
  packageName: string | null;
  path: string;
  confidence: number;
  contributedBy: 'user' | 'automated' | 'maintainer';
  verificationCount: number;
  lastVerified: Date;
}

interface RegistryContribution {
  repoId: string;
  changelog: ChangelogEntry;
  contributor: string;
  timestamp: Date;
  evidence: ContributionEvidence;
}
```

#### Contribution Mechanisms

1. **User Submissions**
   - Web interface for users to submit changelog locations
   - Browser extension for one-click submissions while browsing repos
   - API for programmatic contributions

2. **Automated Discovery**
   - Regular scans using Solutions 1 & 2 to populate database
   - GitHub webhooks to detect new changelog files
   - CI/CD integrations to auto-register changelogs

3. **Maintainer Verification**
   - Special status for repository maintainers' contributions
   - GitHub App integration for official changelog registration
   - Automated verification through GitHub Actions

#### Verification and Quality Control

```typescript
class RegistryVerification {
  async verifyChangelogEntry(entry: ChangelogEntry): Promise<VerificationResult> {
    const checks = [
      this.verifyFileExists,
      this.verifyContentFormat,
      this.verifyRecentActivity,
      this.verifyCommunityConsensus,
    ];

    const results = await Promise.all(checks.map((check) => check(entry)));

    return this.aggregateVerificationResults(results);
  }

  private async verifyCommunityConsensus(entry: ChangelogEntry): Promise<boolean> {
    // Check if multiple users have confirmed this changelog
    return entry.verificationCount >= 3;
  }
}
```

#### Integration with RepoScoop

```typescript
class HybridChangelogDiscovery {
  async findChangelogs(owner: string, repo: string): Promise<ChangelogFile[]> {
    // Try registry first (fastest)
    const registryResults = await this.registryLookup(owner, repo);
    if (registryResults.length > 0 && this.isHighConfidence(registryResults)) {
      return registryResults;
    }

    // Fall back to intelligent discovery
    const discoveredResults = await this.intelligentDiscovery(owner, repo);

    // Contribute discoveries back to registry
    await this.contributeToRegistry(owner, repo, discoveredResults);

    return this.mergeResults(registryResults, discoveredResults);
  }
}
```

### Advantages

- **Scalable**: Community contributions reduce computational overhead
- **Accurate**: Human verification and multiple confirmations improve quality
- **Learning**: Database improves over time with more contributions
- **Fast**: Registry lookups are much faster than API-based discovery

### Disadvantages

- **Bootstrap Problem**: Initial database will be sparse
- **Maintenance Overhead**: Requires moderation and quality control
- **Staleness**: Registry entries may become outdated
- **Infrastructure**: Requires additional database and API infrastructure

### Implementation Complexity: **Medium**

---

## Solution 4: Machine Learning-Based Pattern Recognition

### Overview

Train machine learning models to recognize changelog files based on repository structure, file content, and naming patterns.

### Implementation Details

#### Feature Engineering

```typescript
interface ChangelogFeatures {
  // File-based features
  filename: string;
  fileExtension: string;
  fileSize: number;
  lastModified: Date;

  // Path-based features
  directoryDepth: number;
  parentDirectoryNames: string[];
  siblingFiles: string[];

  // Content-based features
  hasVersionHeaders: boolean;
  hasDatePatterns: boolean;
  hasChangeTypes: boolean; // Added, Changed, Fixed, etc.
  avgLineLength: number;
  markdownStructure: MarkdownStructure;

  // Repository context
  repoSize: number;
  repoLanguages: string[];
  hasPackageConfig: boolean;
  packageManagerType: string;
}
```

#### Model Architecture

```typescript
class ChangelogMLClassifier {
  private models: {
    binaryClassifier: MLModel; // Is this file a changelog?
    confidenceRegressor: MLModel; // How confident are we?
    packageMatcher: MLModel; // Which package does this belong to?
  };

  async classifyFile(features: ChangelogFeatures): Promise<ClassificationResult> {
    const isChangelog = await this.models.binaryClassifier.predict(features);
    const confidence = await this.models.confidenceRegressor.predict(features);
    const packageMatch = await this.models.packageMatcher.predict(features);

    return {
      isChangelog: isChangelog > 0.5,
      confidence: confidence,
      packageName: packageMatch,
      features: features,
    };
  }

  async trainModels(trainingData: LabeledChangelogData[]): Promise<void> {
    // Implementation would use TensorFlow.js or similar
    // Training pipeline with feature extraction and model optimization
  }
}
```

#### Training Data Collection

- **Positive Examples**: Known changelog files from popular repositories
- **Negative Examples**: Documentation, readme, and other markdown files
- **Augmentation**: Generate synthetic examples with various naming patterns
- **Continuous Learning**: Update models as new patterns emerge

### Advantages

- **Adaptive**: Learns from patterns without explicit rules
- **Robust**: Can handle novel naming conventions and structures
- **Accurate**: Can achieve high precision with sufficient training data
- **Automated**: Requires minimal manual rule maintenance

### Disadvantages

- **Training Complexity**: Requires substantial labeled dataset
- **Resource Intensive**: Model training and inference overhead
- **Black Box**: Less interpretable than rule-based approaches
- **Overfitting Risk**: May not generalize well to unseen patterns

### Implementation Complexity: **Very High**

---

## Recommended Implementation Strategy

### Phase 1: Foundation (Months 1-2)

1. Implement **Solution 1** (Intelligent File Discovery) as the core system
2. Start with basic pattern matching and confidence scoring
3. Add simple caching to reduce API calls

### Phase 2: Enhancement (Months 3-4)

1. Integrate **Solution 2** (Repository Structure Analysis) for better context
2. Add support for major monorepo frameworks (Lerna, Nx, Cargo workspaces)
3. Implement comprehensive testing with real-world repositories

### Phase 3: Community (Months 5-6)

1. Build **Solution 3** (Community Database) infrastructure
2. Create user interfaces for contributions and verification
3. Implement automated quality control and verification systems

### Phase 4: Advanced (Future)

1. Research feasibility of **Solution 4** (Machine Learning)
2. Collect training data from Solutions 1-3 implementations
3. Experiment with ML models for pattern recognition

## Integration Considerations

### API Rate Limiting

- Implement intelligent caching strategies
- Use conditional requests with ETags
- Batch API calls where possible
- Provide graceful degradation when rate limited

### Performance Optimization

- Cache discovery results per repository
- Use background processing for expensive analysis
- Implement progressive enhancement (show partial results quickly)

### User Experience

- Provide confidence indicators for discovered changelogs
- Allow users to manually specify changelog locations
- Show discovery process transparency
- Enable feedback mechanisms for improvements

### Error Handling

- Graceful fallback to GitHub releases when changelog discovery fails
- Clear error messages when repositories are inaccessible
- Retry mechanisms for transient failures

## Conclusion

The multi-solution approach provides a robust foundation for changelog discovery that can adapt to various repository structures and conventions. Starting with intelligent file discovery and gradually adding more sophisticated techniques will ensure RepoScoop can effectively surface changelog information that's currently hidden in repository files.

The combination of automated discovery, community contributions, and structured analysis will create a comprehensive system that improves over time while providing immediate value to users exploring repository histories.
