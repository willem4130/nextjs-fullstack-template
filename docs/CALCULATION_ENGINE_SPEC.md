# Calculation Engine Specification

## Overview
The calculation engine evaluates formulas in dependency order, applies effect curves, and compares results to baseline scenarios.

## Variable System

### Variable Types
1. **INPUT Variables**: User-entered values (no formula)
   - Example: `INPUT_SUPPLIER_COST_PER_UNIT`, `INPUT_ORDER_VOLUME`
   - Stored in `VariableValue` table with `isManual: true`
   - Must have a value before calculation

2. **OUTPUT Variables**: Calculated from formulas
   - Example: `OUTPUT_TOTAL_COST = INPUT_SUPPLIER_COST_PER_UNIT * INPUT_ORDER_VOLUME`
   - Formula stored in `Variable.formula`
   - Dependencies stored in `Variable.dependencies` (array of variable names)
   - Calculated values stored in `VariableValue` with `isManual: false`

### Parameter vs Variable
- **Parameters** (`Parameter` model): Global constants shared across all scenarios
  - Example: `PARAM_TAX_RATE`, `PARAM_LEAD_TIME_DAYS`
  - Single value per organization (stored in `Parameter.value`)
  - Referenced in formulas: `OUTPUT_TOTAL_WITH_TAX = OUTPUT_SUBTOTAL * (1 + PARAM_TAX_RATE / 100)`

- **Variables** (`Variable` model): Scenario-specific values that change per scenario
  - INPUT variables: User enters different values per scenario
  - OUTPUT variables: Calculated differently per scenario based on INPUT values

## Formula Language

### Syntax
```
FORMULA := EXPRESSION
EXPRESSION := TERM | EXPRESSION '+' TERM | EXPRESSION '-' TERM
TERM := FACTOR | TERM '*' FACTOR | TERM '/' FACTOR
FACTOR := NUMBER | VARIABLE_REF | PARAM_REF | FUNCTION_CALL | '(' EXPRESSION ')'
VARIABLE_REF := INPUT_* | OUTPUT_*
PARAM_REF := PARAM_*
FUNCTION_CALL := FUNCTION_NAME '(' ARGS ')'
ARGS := EXPRESSION | EXPRESSION ',' ARGS
```

### Supported Operators
- **Arithmetic**: `+`, `-`, `*`, `/`
- **Parentheses**: `(` `)` for grouping
- **Precedence**: Standard math order (parentheses, *, /, +, -)

### Supported Functions
- `MAX(a, b, ...)` - Maximum value
- `MIN(a, b, ...)` - Minimum value
- `IF(condition, trueValue, falseValue)` - Conditional (condition: 0=false, non-zero=true)
- `ABS(x)` - Absolute value
- `SQRT(x)` - Square root
- `ROUND(x, decimals)` - Round to N decimal places
- `CEILING(x)` - Round up to nearest integer
- `FLOOR(x)` - Round down to nearest integer
- `POW(base, exponent)` - Power function

### Variable Naming Convention
- **INPUT variables**: `INPUT_<DESCRIPTION>` (e.g., `INPUT_SALES_DEMAND`, `INPUT_UNIT_COST`)
- **OUTPUT variables**: `OUTPUT_<DESCRIPTION>` (e.g., `OUTPUT_TOTAL_COST`, `OUTPUT_PROFIT_MARGIN`)
- **Parameters**: `PARAM_<DESCRIPTION>` (e.g., `PARAM_TAX_RATE`, `PARAM_LEAD_TIME`)

### Example Formulas
```javascript
// Simple arithmetic
OUTPUT_TOTAL_COST = INPUT_UNIT_COST * INPUT_QUANTITY

// With parameters
OUTPUT_COST_WITH_TAX = OUTPUT_TOTAL_COST * (1 + PARAM_TAX_RATE / 100)

// With functions
OUTPUT_SAFETY_STOCK = MAX(INPUT_MIN_STOCK, INPUT_AVG_DEMAND * PARAM_LEAD_TIME_DAYS)

// Complex example
OUTPUT_REORDER_POINT = IF(
  INPUT_CURRENT_STOCK < OUTPUT_SAFETY_STOCK,
  OUTPUT_SAFETY_STOCK + INPUT_AVG_DEMAND * PARAM_LEAD_TIME_DAYS,
  INPUT_CURRENT_STOCK
)

// Multi-level dependency
OUTPUT_REVENUE = INPUT_SALES_VOLUME * INPUT_PRICE_PER_UNIT
OUTPUT_COST = INPUT_SALES_VOLUME * INPUT_COST_PER_UNIT
OUTPUT_PROFIT = OUTPUT_REVENUE - OUTPUT_COST
OUTPUT_MARGIN_PCT = (OUTPUT_PROFIT / OUTPUT_REVENUE) * 100
```

## Dependency Resolution

### Dependency Graph
- Variables must be calculated in topological order
- Dependencies stored as **variable names** (not IDs) for stability across cloning
- Example:
  ```
  INPUT_A (no dependencies)
  INPUT_B (no dependencies)
  OUTPUT_C = INPUT_A + INPUT_B (depends on: INPUT_A, INPUT_B)
  OUTPUT_D = OUTPUT_C * 2 (depends on: OUTPUT_C)
  ```
- Calculation order: INPUT_A, INPUT_B → OUTPUT_C → OUTPUT_D

### Topological Sort (Kahn's Algorithm)
1. Build in-degree map (count of dependencies per variable)
2. Add all variables with 0 in-degree to queue
3. Process queue:
   - Remove variable from queue
   - Add to sorted list
   - Decrement in-degree for all dependents
   - If dependent in-degree becomes 0, add to queue
4. If sorted list length ≠ total variables → circular dependency detected

### Circular Dependency Detection
- If topological sort fails, identify the cycle
- Return error: `Circular dependency detected: OUTPUT_A → OUTPUT_B → OUTPUT_A`
- Prevent variable creation/update if it creates a cycle

## Calculation Workflow

### 1. Pre-calculation Validation
- Verify all INPUT variables have values for the scenario
- Verify all OUTPUT variable formulas are valid
- Verify no circular dependencies exist
- Load all Parameters for formula evaluation

### 2. Dependency-Ordered Calculation
```javascript
// Pseudocode
function calculateScenario(scenarioId, organizationId) {
  // 1. Load all variables and parameters
  const variables = loadVariables(organizationId)
  const parameters = loadParameters(organizationId)
  const inputValues = loadInputValues(scenarioId)

  // 2. Build dependency graph
  const sortedVariables = topologicalSort(variables)
  if (!sortedVariables) throw new Error("Circular dependency")

  // 3. Calculate in order
  const results = {}
  for (const variable of sortedVariables) {
    if (variable.type === 'INPUT') {
      results[variable.name] = inputValues[variable.id]
    } else {
      // Evaluate formula with current results + parameters
      const rawValue = evaluateFormula(variable.formula, results, parameters)

      // Apply effect curve if configured
      const finalValue = variable.effectCurveId
        ? applyEffectCurve(rawValue, variable.effectCurve)
        : rawValue

      results[variable.name] = finalValue

      // Store calculated value
      storeVariableValue(scenarioId, variable.id, finalValue)
    }
  }

  // 4. Compare to baseline (if not baseline scenario)
  const baseline = loadBaselineResults(organizationId)
  const comparison = compareToBaseline(results, baseline)

  // 5. Store calculation result
  storeCalculation(scenarioId, results, comparison)

  return results
}
```

### 3. Effect Curve Application
- Applied AFTER formula evaluation, BEFORE storing result
- Transforms raw calculated value through non-linear curve
- Example: Volume discount curve reduces cost at higher quantities
- See `EFFECT_CURVES_SPEC.md` for curve implementation details (Phase 3)

### 4. Baseline Comparison
- Find baseline scenario for organization (`Scenario.isBaseline = true`)
- For each OUTPUT variable:
  - `delta = currentValue - baselineValue`
  - `percentChange = ((currentValue - baselineValue) / baselineValue) * 100`
- Store in `Calculation.results` JSON:
  ```json
  {
    "OUTPUT_TOTAL_COST": {
      "value": 42500,
      "rawValue": 42500,
      "delta": -7500,
      "percentChange": -15.0,
      "baselineValue": 50000,
      "effectCurveApplied": false,
      "calculatedAt": "2024-01-15T10:30:00Z",
      "dependencies": ["INPUT_UNIT_COST", "INPUT_QUANTITY"]
    }
  }
  ```

## Calculation Storage

### Calculation Table Structure
```typescript
interface CalculationResult {
  scenarioId: string
  periodStart: Date | null
  periodEnd: Date | null
  baselineScenarioId: string | null
  results: {
    [variableName: string]: {
      value: number              // Final value (after effect curve)
      rawValue: number           // Before effect curve
      delta: number | null       // Difference from baseline
      percentChange: number | null  // % change from baseline
      baselineValue: number | null
      effectCurveApplied: boolean
      calculatedAt: string
      dependencies: string[]     // Variable names used in calculation
    }
  }
  calculationTime: Date
  executionTimeMs: number
  version: number
  hasErrors: boolean
  errorLog: ErrorEntry[] | null
}

interface ErrorEntry {
  variableName: string
  errorType: 'MISSING_VALUE' | 'DIVISION_BY_ZERO' | 'FORMULA_ERROR' | 'CIRCULAR_DEPENDENCY'
  message: string
  timestamp: string
}
```

## Error Handling

### Error Types
1. **MISSING_VALUE**: Required INPUT variable has no value
2. **DIVISION_BY_ZERO**: Formula attempts x/0
3. **FORMULA_ERROR**: Invalid formula syntax or undefined variable reference
4. **CIRCULAR_DEPENDENCY**: Variables depend on each other in a cycle
5. **INVALID_FUNCTION**: Unknown function or wrong argument count

### Error Recovery
- Store partial results up to error point
- Set `Calculation.hasErrors = true`
- Store errors in `Calculation.errorLog`
- Return descriptive error message to user

## Implementation Files

```
src/lib/calculation/
├── formula-parser.ts         # Tokenizer + AST builder
├── formula-evaluator.ts      # AST executor with function support
├── dependency-graph.ts       # Topological sort + cycle detection
├── effect-curves.ts          # Curve application logic (Phase 3)
├── engine.ts                 # Main orchestrator
└── types.ts                  # TypeScript interfaces

src/server/api/routers/
├── calculation.ts            # tRPC router for calculation endpoints
```

## API Endpoints (tRPC)

### `calculation.calculate`
```typescript
input: {
  organizationId: string
  scenarioId: string
  periodStart?: Date
}
output: CalculationResult
```
- Runs full calculation for scenario
- Returns results + comparison to baseline

### `calculation.getResults`
```typescript
input: {
  organizationId: string
  scenarioId: string
  version?: number  // Latest if not specified
}
output: CalculationResult
```
- Retrieves cached calculation results
- Optionally specify version

### `calculation.recalculate`
```typescript
input: {
  organizationId: string
  scenarioId: string
}
output: CalculationResult
```
- Forces recalculation (increments version)
- Use when variable values or formulas change

### `calculation.validateFormula`
```typescript
input: {
  organizationId: string
  formula: string
}
output: {
  valid: boolean
  errors: string[]
  dependencies: string[]
}
```
- Validates formula syntax before saving variable
- Returns list of variable/parameter dependencies

## Testing Strategy

### Unit Tests
- Formula parser: tokenization, AST building
- Formula evaluator: operators, functions, edge cases
- Dependency graph: topological sort, cycle detection
- Effect curves: each curve type (Phase 3)

### Integration Tests
- End-to-end calculation with mock data
- Error handling scenarios
- Baseline comparison accuracy
- Performance benchmarks (1000+ variables)

### Test Data
```javascript
// Example test scenario
const testVariables = [
  { name: 'INPUT_QUANTITY', type: 'INPUT', value: 100 },
  { name: 'INPUT_UNIT_COST', type: 'INPUT', value: 50 },
  { name: 'OUTPUT_TOTAL_COST', type: 'OUTPUT', formula: 'INPUT_QUANTITY * INPUT_UNIT_COST' },
  { name: 'OUTPUT_WITH_TAX', type: 'OUTPUT', formula: 'OUTPUT_TOTAL_COST * (1 + PARAM_TAX_RATE / 100)' }
]

const testParameters = [
  { name: 'PARAM_TAX_RATE', value: 20 }
]

// Expected results
// OUTPUT_TOTAL_COST = 100 * 50 = 5000
// OUTPUT_WITH_TAX = 5000 * (1 + 20/100) = 5000 * 1.2 = 6000
```

## Performance Considerations

### Optimization Strategies
1. **Caching**: Store calculation results, only recalculate on input change
2. **Versioning**: Track when inputs change, invalidate downstream calculations
3. **Partial Recalculation**: Only recalculate affected variables (future enhancement)
4. **Parallel Evaluation**: Calculate independent branches in parallel (future enhancement)

### Scalability Limits
- Target: 500 variables per organization
- Target calculation time: <1 second for 500 variables
- Database query optimization: batch load variables/parameters

## Next Steps (Phase 2 Implementation)

1. ✅ **Design spec** (this document)
2. Create TypeScript types (`types.ts`)
3. Implement formula parser (`formula-parser.ts`)
4. Implement formula evaluator (`formula-evaluator.ts`)
5. Implement dependency graph (`dependency-graph.ts`)
6. Implement calculation engine (`engine.ts`)
7. Update calculation router with real implementation
8. Build Variable UI components
9. Test end-to-end with real scenarios

---

**Last Updated**: 2024-01-15
**Status**: Design Complete - Ready for Implementation
