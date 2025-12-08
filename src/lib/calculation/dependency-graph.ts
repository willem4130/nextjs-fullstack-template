/**
 * Dependency Graph Builder - Topological Sort + Cycle Detection
 *
 * Builds a dependency graph from variables and determines
 * the correct calculation order using Kahn's algorithm.
 */

import {
  VariableDefinition,
  DependencyGraph,
  DependencyNode,
  ErrorType,
} from './types'

// ==========================================
// DEPENDENCY GRAPH BUILDER
// ==========================================

export class DependencyGraphBuilder {
  private variables: VariableDefinition[]
  private nodes: Map<string, DependencyNode>

  constructor(variables: VariableDefinition[]) {
    this.variables = variables
    this.nodes = new Map()
  }

  /**
   * Build the dependency graph
   */
  public build(): DependencyGraph {
    // Step 1: Create nodes for all variables
    this.createNodes()

    // Step 2: Build edges (dependencies)
    this.buildEdges()

    // Step 3: Perform topological sort
    const sortResult = this.topologicalSort()

    return {
      nodes: this.nodes,
      sortedOrder: sortResult.sortedOrder,
      hasCycle: sortResult.hasCycle,
      cycleDescription: sortResult.cycleDescription,
    }
  }

  /**
   * Create a node for each variable
   */
  private createNodes(): void {
    for (const variable of this.variables) {
      this.nodes.set(variable.name, {
        variableId: variable.id,
        variableName: variable.name,
        dependencies: variable.dependencies,
        dependents: [],
        inDegree: 0,
      })
    }
  }

  /**
   * Build edges between nodes based on dependencies
   */
  private buildEdges(): void {
    for (const variable of this.variables) {
      const node = this.nodes.get(variable.name)!

      // For each dependency, add this variable as a dependent
      for (const dependencyName of variable.dependencies) {
        const dependencyNode = this.nodes.get(dependencyName)

        if (!dependencyNode) {
          // Dependency not found - could be a parameter (which is OK)
          // or a missing variable (which is an error)
          if (!dependencyName.startsWith('PARAM_')) {
            throw new Error(
              `Variable '${variable.name}' depends on '${dependencyName}', ` +
                `but '${dependencyName}' is not defined. ` +
                `Error type: ${ErrorType.UNKNOWN_VARIABLE}`
            )
          }
          // Parameters don't need nodes (they're in the context)
          continue
        }

        // Add edge: dependencyNode → node
        dependencyNode.dependents.push(variable.name)
        node.inDegree++
      }
    }
  }

  /**
   * Topological sort using Kahn's algorithm
   *
   * Returns variables in calculation order (dependencies first)
   */
  private topologicalSort(): {
    sortedOrder: string[]
    hasCycle: boolean
    cycleDescription: string | null
  } {
    const sortedOrder: string[] = []
    const queue: string[] = []
    const inDegreeMap = new Map<string, number>()

    // Initialize in-degree map
    for (const [name, node] of this.nodes) {
      inDegreeMap.set(name, node.inDegree)
      if (node.inDegree === 0) {
        queue.push(name)
      }
    }

    // Process queue
    while (queue.length > 0) {
      const currentName = queue.shift()!
      sortedOrder.push(currentName)

      const currentNode = this.nodes.get(currentName)!

      // For each dependent, decrement in-degree
      for (const dependentName of currentNode.dependents) {
        const currentInDegree = inDegreeMap.get(dependentName)!
        const newInDegree = currentInDegree - 1
        inDegreeMap.set(dependentName, newInDegree)

        if (newInDegree === 0) {
          queue.push(dependentName)
        }
      }
    }

    // Check for cycles
    if (sortedOrder.length !== this.nodes.size) {
      const cycleDescription = this.detectCycle(inDegreeMap)
      return {
        sortedOrder: [],
        hasCycle: true,
        cycleDescription,
      }
    }

    return {
      sortedOrder,
      hasCycle: false,
      cycleDescription: null,
    }
  }

  /**
   * Detect and describe a cycle in the dependency graph
   */
  private detectCycle(inDegreeMap: Map<string, number>): string {
    // Variables with non-zero in-degree are part of a cycle
    const cycleVariables: string[] = []

    for (const [name, inDegree] of inDegreeMap) {
      if (inDegree > 0) {
        cycleVariables.push(name)
      }
    }

    if (cycleVariables.length === 0) {
      return 'Unknown cycle detected'
    }

    // Find a path through the cycle (for better error message)
    const cycle = this.findCyclePath(cycleVariables)

    return `Circular dependency detected: ${cycle.join(' → ')}`
  }

  /**
   * Find a path through the cycle for error reporting
   */
  private findCyclePath(cycleVariables: string[]): string[] {
    if (cycleVariables.length === 0) return []

    const path: string[] = []
    const visited = new Set<string>()
    const stack = new Set<string>()

    // DFS to find cycle path
    const dfs = (variableName: string): boolean => {
      if (stack.has(variableName)) {
        // Found cycle - add to path and return
        path.push(variableName)
        return true
      }

      if (visited.has(variableName)) {
        return false
      }

      visited.add(variableName)
      stack.add(variableName)

      const node = this.nodes.get(variableName)
      if (node) {
        for (const depName of node.dependencies) {
          // Only follow dependencies within the cycle
          if (cycleVariables.includes(depName)) {
            if (dfs(depName)) {
              path.push(variableName)
              return true
            }
          }
        }
      }

      stack.delete(variableName)
      return false
    }

    // Start DFS from first cycle variable
    dfs(cycleVariables[0]!)

    return path.reverse()
  }
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Build dependency graph from variable definitions
 */
export function buildDependencyGraph(
  variables: VariableDefinition[]
): DependencyGraph {
  const builder = new DependencyGraphBuilder(variables)
  return builder.build()
}

/**
 * Get calculation order for variables
 * Throws error if circular dependency detected
 */
export function getCalculationOrder(
  variables: VariableDefinition[]
): string[] {
  const graph = buildDependencyGraph(variables)

  if (graph.hasCycle) {
    throw new Error(
      `${graph.cycleDescription}. Error type: ${ErrorType.CIRCULAR_DEPENDENCY}`
    )
  }

  return graph.sortedOrder
}

/**
 * Validate that a new dependency doesn't create a cycle
 *
 * Simulates adding a new variable with dependencies and checks for cycles
 */
export function validateNoCycle(
  existingVariables: VariableDefinition[],
  newVariable: {
    name: string
    dependencies: string[]
  }
): { valid: boolean; error: string | null } {
  // Create temporary variable definition
  const tempVariable: VariableDefinition = {
    id: 'temp',
    name: newVariable.name,
    displayName: newVariable.name,
    variableType: 'OUTPUT',
    formula: 'temp',
    dependencies: newVariable.dependencies,
    effectCurveId: null,
    unit: null,
  }

  // Try building graph with new variable
  try {
    const graph = buildDependencyGraph([...existingVariables, tempVariable])

    if (graph.hasCycle) {
      return {
        valid: false,
        error: graph.cycleDescription,
      }
    }

    return { valid: true, error: null }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
