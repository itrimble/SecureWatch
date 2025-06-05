import { ASTNode, KQLOperator } from '../types/ast';
import { 
  QueryBuilder, 
  BoolQuery, 
  Query,
  RangeQuery,
  MatchQuery,
  TermQuery,
  ExistsQuery,
  PrefixQuery,
  WildcardQuery,
  RegexpQuery,
  Aggregation
} from '../types/opensearch';

export class KQLToOpenSearchTranslator {
  private fieldMappings: Map<string, string>;
  
  constructor() {
    // Map KQL fields to OpenSearch document fields
    this.fieldMappings = new Map([
      ['EventID', 'event_id'],
      ['TimeCreated', 'timestamp'],
      ['Computer', 'source_host'],
      ['User', 'user.name'],
      ['Process', 'process.name'],
      ['ProcessId', 'process.pid'],
      ['CommandLine', 'process.command_line'],
      ['SourceIp', 'network.source_ip'],
      ['DestinationIp', 'network.destination_ip'],
      ['Severity', 'severity'],
      ['Category', 'category'],
      ['Message', 'raw_message'],
      ['RiskScore', 'security.risk_score'],
      ['MitreTechnique', 'security.mitre_technique']
    ]);
  }

  translate(ast: ASTNode): any {
    const query = this.buildQuery(ast);
    const aggregations = this.buildAggregations(ast);
    const sort = this.buildSort(ast);
    const projections = this.extractProjections(ast);
    
    const body: any = {
      query: query || { match_all: {} }
    };
    
    if (aggregations && Object.keys(aggregations).length > 0) {
      body.aggs = aggregations;
    }
    
    if (sort && sort.length > 0) {
      body.sort = sort;
    }
    
    if (projections && projections.length > 0) {
      body._source = projections;
    }
    
    return body;
  }

  private buildQuery(node: ASTNode): any {
    switch (node.type) {
      case 'query':
        return this.buildQuery(node.children![0]);
        
      case 'where':
        return this.translateWhereClause(node);
        
      case 'and':
        return {
          bool: {
            must: node.children!.map(child => this.buildQuery(child))
          }
        };
        
      case 'or':
        return {
          bool: {
            should: node.children!.map(child => this.buildQuery(child)),
            minimum_should_match: 1
          }
        };
        
      case 'not':
        return {
          bool: {
            must_not: this.buildQuery(node.children![0])
          }
        };
        
      case 'comparison':
        return this.translateComparison(node);
        
      case 'contains':
        return this.translateContains(node);
        
      case 'startswith':
        return this.translateStartsWith(node);
        
      case 'endswith':
        return this.translateEndsWith(node);
        
      case 'in':
        return this.translateIn(node);
        
      case 'between':
        return this.translateBetween(node);
        
      default:
        if (node.children && node.children.length > 0) {
          return this.buildQuery(node.children[0]);
        }
        return null;
    }
  }

  private translateWhereClause(node: ASTNode): any {
    if (node.children && node.children.length > 0) {
      return this.buildQuery(node.children[0]);
    }
    return { match_all: {} };
  }

  private translateComparison(node: ASTNode): any {
    const field = this.mapField(node.value.field);
    const value = node.value.value;
    const operator = node.value.operator;
    
    switch (operator) {
      case '==':
      case '=':
        return { term: { [field]: value } };
        
      case '!=':
      case '<>':
        return {
          bool: {
            must_not: { term: { [field]: value } }
          }
        };
        
      case '>':
        return {
          range: {
            [field]: { gt: value }
          }
        };
        
      case '>=':
        return {
          range: {
            [field]: { gte: value }
          }
        };
        
      case '<':
        return {
          range: {
            [field]: { lt: value }
          }
        };
        
      case '<=':
        return {
          range: {
            [field]: { lte: value }
          }
        };
        
      default:
        throw new Error(`Unsupported comparison operator: ${operator}`);
    }
  }

  private translateContains(node: ASTNode): any {
    const field = this.mapField(node.value.field);
    const value = node.value.value;
    
    // Use match query for text fields
    if (this.isTextField(field)) {
      return {
        match: {
          [field]: {
            query: value,
            operator: 'and'
          }
        }
      };
    }
    
    // Use wildcard for keyword fields
    return {
      wildcard: {
        [field]: `*${value}*`
      }
    };
  }

  private translateStartsWith(node: ASTNode): any {
    const field = this.mapField(node.value.field);
    const value = node.value.value;
    
    return {
      prefix: {
        [field]: value
      }
    };
  }

  private translateEndsWith(node: ASTNode): any {
    const field = this.mapField(node.value.field);
    const value = node.value.value;
    
    return {
      wildcard: {
        [field]: `*${value}`
      }
    };
  }

  private translateIn(node: ASTNode): any {
    const field = this.mapField(node.value.field);
    const values = node.value.values;
    
    return {
      terms: {
        [field]: values
      }
    };
  }

  private translateBetween(node: ASTNode): any {
    const field = this.mapField(node.value.field);
    const { start, end } = node.value;
    
    return {
      range: {
        [field]: {
          gte: start,
          lte: end
        }
      }
    };
  }

  private buildAggregations(node: ASTNode): any {
    const aggs: any = {};
    
    this.traverseForAggregations(node, aggs);
    
    return aggs;
  }

  private traverseForAggregations(node: ASTNode, aggs: any): void {
    switch (node.type) {
      case 'summarize':
        this.buildSummarizeAggregations(node, aggs);
        break;
        
      case 'count':
        if (!node.value || !node.value.field) {
          // Simple count
          aggs.total_count = {
            value_count: {
              field: '_id'
            }
          };
        } else {
          // Count by field
          const field = this.mapField(node.value.field);
          aggs[`count_${field}`] = {
            cardinality: {
              field: field
            }
          };
        }
        break;
        
      case 'sum':
        const sumField = this.mapField(node.value.field);
        aggs[`sum_${sumField}`] = {
          sum: {
            field: sumField
          }
        };
        break;
        
      case 'avg':
        const avgField = this.mapField(node.value.field);
        aggs[`avg_${avgField}`] = {
          avg: {
            field: avgField
          }
        };
        break;
        
      case 'min':
        const minField = this.mapField(node.value.field);
        aggs[`min_${minField}`] = {
          min: {
            field: minField
          }
        };
        break;
        
      case 'max':
        const maxField = this.mapField(node.value.field);
        aggs[`max_${maxField}`] = {
          max: {
            field: maxField
          }
        };
        break;
        
      case 'groupby':
        this.buildGroupByAggregations(node, aggs);
        break;
    }
    
    // Traverse children
    if (node.children) {
      for (const child of node.children) {
        this.traverseForAggregations(child, aggs);
      }
    }
  }

  private buildSummarizeAggregations(node: ASTNode, aggs: any): void {
    if (node.value.groupBy && node.value.groupBy.length > 0) {
      // Build nested aggregations for group by
      let currentAgg = aggs;
      
      for (const groupField of node.value.groupBy) {
        const field = this.mapField(groupField);
        const aggName = `group_by_${field}`;
        
        currentAgg[aggName] = {
          terms: {
            field: field,
            size: 1000 // Configurable
          },
          aggs: {}
        };
        
        currentAgg = currentAgg[aggName].aggs;
      }
      
      // Add metrics to the innermost aggregation
      for (const metric of node.value.metrics) {
        this.addMetricAggregation(metric, currentAgg);
      }
    } else {
      // Simple metrics without grouping
      for (const metric of node.value.metrics) {
        this.addMetricAggregation(metric, aggs);
      }
    }
  }

  private buildGroupByAggregations(node: ASTNode, aggs: any): void {
    const fields = node.value.fields;
    let currentAgg = aggs;
    
    for (const field of fields) {
      const mappedField = this.mapField(field);
      const aggName = `group_by_${mappedField}`;
      
      currentAgg[aggName] = {
        terms: {
          field: mappedField,
          size: 1000
        },
        aggs: {}
      };
      
      currentAgg = currentAgg[aggName].aggs;
    }
  }

  private addMetricAggregation(metric: any, aggs: any): void {
    const { function: fn, field, alias } = metric;
    const mappedField = field ? this.mapField(field) : null;
    const aggName = alias || `${fn}_${mappedField || 'all'}`;
    
    switch (fn) {
      case 'count':
        if (!mappedField) {
          aggs[aggName] = { value_count: { field: '_id' } };
        } else {
          aggs[aggName] = { cardinality: { field: mappedField } };
        }
        break;
      case 'sum':
        aggs[aggName] = { sum: { field: mappedField } };
        break;
      case 'avg':
        aggs[aggName] = { avg: { field: mappedField } };
        break;
      case 'min':
        aggs[aggName] = { min: { field: mappedField } };
        break;
      case 'max':
        aggs[aggName] = { max: { field: mappedField } };
        break;
      case 'percentile':
        aggs[aggName] = {
          percentiles: {
            field: mappedField,
            percents: metric.percents || [50, 90, 99]
          }
        };
        break;
    }
  }

  private buildSort(node: ASTNode): any[] {
    const sort: any[] = [];
    
    this.traverseForSort(node, sort);
    
    return sort;
  }

  private traverseForSort(node: ASTNode, sort: any[]): void {
    if (node.type === 'sort' || node.type === 'order') {
      for (const sortSpec of node.value.fields) {
        const field = this.mapField(sortSpec.field);
        sort.push({
          [field]: {
            order: sortSpec.direction || 'asc'
          }
        });
      }
    }
    
    if (node.children) {
      for (const child of node.children) {
        this.traverseForSort(child, sort);
      }
    }
  }

  private extractProjections(node: ASTNode): string[] | null {
    const projections: string[] = [];
    
    this.traverseForProjections(node, projections);
    
    return projections.length > 0 ? projections : null;
  }

  private traverseForProjections(node: ASTNode, projections: string[]): void {
    if (node.type === 'project') {
      for (const field of node.value.fields) {
        projections.push(this.mapField(field.name || field));
      }
    }
    
    if (node.children) {
      for (const child of node.children) {
        this.traverseForProjections(child, projections);
      }
    }
  }

  private mapField(kqlField: string): string {
    // Direct mapping
    if (this.fieldMappings.has(kqlField)) {
      return this.fieldMappings.get(kqlField)!;
    }
    
    // Convert PascalCase to snake_case
    const snakeCase = kqlField
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
    
    return snakeCase;
  }

  private isTextField(field: string): boolean {
    // Fields that are analyzed text fields
    const textFields = [
      'raw_message',
      'process.command_line',
      '_search_text'
    ];
    
    return textFields.includes(field);
  }
}