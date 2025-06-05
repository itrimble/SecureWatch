// OpenSearch Query DSL Type Definitions

export interface QueryBuilder {
  query?: Query;
  aggs?: Record<string, Aggregation>;
  sort?: SortSpec[];
  _source?: string[] | boolean;
  from?: number;
  size?: number;
  highlight?: HighlightSpec;
  track_total_hits?: boolean | number;
}

export type Query = 
  | MatchAllQuery
  | MatchQuery
  | TermQuery
  | TermsQuery
  | RangeQuery
  | ExistsQuery
  | PrefixQuery
  | WildcardQuery
  | RegexpQuery
  | BoolQuery
  | NestedQuery;

export interface MatchAllQuery {
  match_all: Record<string, any>;
}

export interface MatchQuery {
  match: {
    [field: string]: string | {
      query: string;
      operator?: 'or' | 'and';
      fuzziness?: string | number;
      analyzer?: string;
    };
  };
}

export interface TermQuery {
  term: {
    [field: string]: string | number | boolean;
  };
}

export interface TermsQuery {
  terms: {
    [field: string]: Array<string | number | boolean>;
  };
}

export interface RangeQuery {
  range: {
    [field: string]: {
      gt?: any;
      gte?: any;
      lt?: any;
      lte?: any;
      format?: string;
      time_zone?: string;
    };
  };
}

export interface ExistsQuery {
  exists: {
    field: string;
  };
}

export interface PrefixQuery {
  prefix: {
    [field: string]: string | {
      value: string;
      case_insensitive?: boolean;
    };
  };
}

export interface WildcardQuery {
  wildcard: {
    [field: string]: string | {
      value: string;
      case_insensitive?: boolean;
    };
  };
}

export interface RegexpQuery {
  regexp: {
    [field: string]: string | {
      value: string;
      flags?: string;
      case_insensitive?: boolean;
      max_determinized_states?: number;
    };
  };
}

export interface BoolQuery {
  bool: {
    must?: Query | Query[];
    filter?: Query | Query[];
    should?: Query | Query[];
    must_not?: Query | Query[];
    minimum_should_match?: number | string;
    boost?: number;
  };
}

export interface NestedQuery {
  nested: {
    path: string;
    query: Query;
    score_mode?: 'avg' | 'sum' | 'min' | 'max' | 'none';
  };
}

// Aggregations
export type Aggregation = 
  | MetricAggregation
  | BucketAggregation
  | PipelineAggregation;

export type MetricAggregation =
  | ValueCountAgg
  | CardinalityAgg
  | SumAgg
  | AvgAgg
  | MinAgg
  | MaxAgg
  | StatsAgg
  | ExtendedStatsAgg
  | PercentilesAgg;

export interface ValueCountAgg {
  value_count: {
    field: string;
  };
}

export interface CardinalityAgg {
  cardinality: {
    field: string;
    precision_threshold?: number;
  };
}

export interface SumAgg {
  sum: {
    field: string;
    missing?: number;
  };
}

export interface AvgAgg {
  avg: {
    field: string;
    missing?: number;
  };
}

export interface MinAgg {
  min: {
    field: string;
    missing?: number;
  };
}

export interface MaxAgg {
  max: {
    field: string;
    missing?: number;
  };
}

export interface StatsAgg {
  stats: {
    field: string;
    missing?: number;
  };
}

export interface ExtendedStatsAgg {
  extended_stats: {
    field: string;
    sigma?: number;
  };
}

export interface PercentilesAgg {
  percentiles: {
    field: string;
    percents?: number[];
    keyed?: boolean;
  };
}

// Bucket Aggregations
export type BucketAggregation =
  | TermsAgg
  | DateHistogramAgg
  | HistogramAgg
  | RangeAgg
  | FilterAgg
  | FiltersAgg;

export interface TermsAgg {
  terms: {
    field: string;
    size?: number;
    order?: Record<string, 'asc' | 'desc'>;
    min_doc_count?: number;
    include?: string | string[];
    exclude?: string | string[];
  };
  aggs?: Record<string, Aggregation>;
}

export interface DateHistogramAgg {
  date_histogram: {
    field: string;
    calendar_interval?: string;
    fixed_interval?: string;
    format?: string;
    time_zone?: string;
    min_doc_count?: number;
  };
  aggs?: Record<string, Aggregation>;
}

export interface HistogramAgg {
  histogram: {
    field: string;
    interval: number;
    min_doc_count?: number;
    extended_bounds?: {
      min: number;
      max: number;
    };
  };
  aggs?: Record<string, Aggregation>;
}

export interface RangeAgg {
  range: {
    field: string;
    ranges: Array<{
      key?: string;
      from?: number;
      to?: number;
    }>;
  };
  aggs?: Record<string, Aggregation>;
}

export interface FilterAgg {
  filter: Query;
  aggs?: Record<string, Aggregation>;
}

export interface FiltersAgg {
  filters: {
    filters: Record<string, Query> | Query[];
  };
  aggs?: Record<string, Aggregation>;
}

// Pipeline Aggregations
export type PipelineAggregation =
  | BucketSortAgg
  | BucketSelectorAgg
  | DerivativeAgg
  | MovingAvgAgg;

export interface BucketSortAgg {
  bucket_sort: {
    sort?: SortSpec[];
    size?: number;
    gap_policy?: 'skip' | 'insert_zeros';
  };
}

export interface BucketSelectorAgg {
  bucket_selector: {
    buckets_path: Record<string, string>;
    script: string;
  };
}

export interface DerivativeAgg {
  derivative: {
    buckets_path: string;
  };
}

export interface MovingAvgAgg {
  moving_avg: {
    buckets_path: string;
    window?: number;
    model?: 'simple' | 'linear' | 'ewma' | 'holt' | 'holt_winters';
  };
}

// Sort Specification
export interface SortSpec {
  [field: string]: {
    order: 'asc' | 'desc';
    mode?: 'min' | 'max' | 'sum' | 'avg' | 'median';
    missing?: '_first' | '_last' | string;
  } | 'asc' | 'desc';
}

// Highlight Specification
export interface HighlightSpec {
  fields: Record<string, HighlightField>;
  pre_tags?: string[];
  post_tags?: string[];
  encoder?: 'default' | 'html';
}

export interface HighlightField {
  fragment_size?: number;
  number_of_fragments?: number;
  no_match_size?: number;
  highlight_query?: Query;
}