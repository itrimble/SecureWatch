import { z } from 'zod';

// Spark configuration schema
const SparkConfigSchema = z.object({
  sparkMaster: z.string().default('spark://localhost:7077'),
  appName: z.string().default('SecureWatch-BatchProcessor'),
  executorMemory: z.string().default('4g'),
  executorCores: z.number().default(4),
  driverMemory: z.string().default('2g'),
  maxResultSize: z.string().default('2g'),
  serializer: z.string().default('org.apache.spark.serializer.KryoSerializer'),
  checkpoint: z.string().default('/tmp/spark-checkpoint'),
  watermarkDelay: z.string().default('10 minutes'),
  maxRecordsPerTrigger: z.number().default(1000000),
  enableAdaptiveQueryExecution: z.boolean().default(true),
  adaptiveSkewJoin: z.boolean().default(true),
  broadcastTimeout: z.string().default('300'),
  networkTimeout: z.string().default('120'),
});

// Kafka Spark integration configuration
const KafkaSparkConfigSchema = z.object({
  kafkaBootstrapServers: z.string().default('localhost:9092'),
  kafkaTopics: z.string().default('log-events-raw,log-events-normalized'),
  startingOffsets: z.enum(['earliest', 'latest']).default('latest'),
  maxOffsetsPerTrigger: z.number().default(1000000),
  failOnDataLoss: z.boolean().default(false),
  includeHeaders: z.boolean().default(true),
  kafkaConsumerPollTimeoutMs: z.number().default(120000),
  securityProtocol: z.string().default('PLAINTEXT'),
  saslMechanism: z.string().optional(),
  saslUsername: z.string().optional(),
  saslPassword: z.string().optional(),
});

// Machine Learning configuration
const MLConfigSchema = z.object({
  anomalyDetectionEnabled: z.boolean().default(true),
  modelPath: z.string().default('/app/models'),
  batchSize: z.number().default(10000),
  trainingInterval: z.string().default('24h'),
  modelRefreshInterval: z.string().default('1h'),
  featureColumns: z.array(z.string()).default([
    'timestamp', 'source_ip', 'dest_ip', 'port', 'event_type', 'severity'
  ]),
  anomalyThreshold: z.number().default(0.8),
  enableAutoML: z.boolean().default(false),
});

// Batch processing configuration
const BatchConfigSchema = z.object({
  triggerInterval: z.string().default('5 minutes'),
  outputMode: z.enum(['append', 'complete', 'update']).default('append'),
  outputPath: z.string().default('/app/output'),
  partitionBy: z.array(z.string()).default(['year', 'month', 'day', 'hour']),
  compression: z.enum(['none', 'snappy', 'gzip', 'lz4', 'zstd']).default('zstd'),
  maxFilesPerTrigger: z.number().default(1000),
  cleanSourceArchiveAfterBatch: z.boolean().default(false),
  enableDataQualityChecks: z.boolean().default(true),
});

// Storage configuration
const StorageConfigSchema = z.object({
  primaryStorage: z.enum(['elasticsearch', 'opensearch', 'hdfs', 's3']).default('opensearch'),
  archiveStorage: z.enum(['s3', 'hdfs', 'gcs', 'azure']).default('s3'),
  retentionPolicy: z.object({
    hot: z.string().default('7d'),
    warm: z.string().default('30d'),
    cold: z.string().default('90d'),
    delete: z.string().default('365d'),
  }),
  compressionRatio: z.number().default(0.3),
  enableIndexOptimization: z.boolean().default(true),
});

// Complete configuration schema
const ConfigSchema = z.object({
  spark: SparkConfigSchema,
  kafka: KafkaSparkConfigSchema,
  ml: MLConfigSchema,
  batch: BatchConfigSchema,
  storage: StorageConfigSchema,
  environment: z.enum(['development', 'staging', 'production']).default('development'),
  logLevel: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  metricsEnabled: z.boolean().default(true),
  healthCheckInterval: z.number().default(30000),
});

// Load configuration from environment
export const config = ConfigSchema.parse({
  spark: {
    sparkMaster: process.env.SPARK_MASTER,
    appName: process.env.SPARK_APP_NAME,
    executorMemory: process.env.SPARK_EXECUTOR_MEMORY,
    executorCores: process.env.SPARK_EXECUTOR_CORES ? parseInt(process.env.SPARK_EXECUTOR_CORES) : undefined,
    driverMemory: process.env.SPARK_DRIVER_MEMORY,
    maxResultSize: process.env.SPARK_MAX_RESULT_SIZE,
    serializer: process.env.SPARK_SERIALIZER,
    checkpoint: process.env.SPARK_CHECKPOINT_DIR,
    watermarkDelay: process.env.SPARK_WATERMARK_DELAY,
    maxRecordsPerTrigger: process.env.SPARK_MAX_RECORDS_PER_TRIGGER ? parseInt(process.env.SPARK_MAX_RECORDS_PER_TRIGGER) : undefined,
    enableAdaptiveQueryExecution: process.env.SPARK_ADAPTIVE_QUERY_EXECUTION === 'true',
    adaptiveSkewJoin: process.env.SPARK_ADAPTIVE_SKEW_JOIN === 'true',
    broadcastTimeout: process.env.SPARK_BROADCAST_TIMEOUT,
    networkTimeout: process.env.SPARK_NETWORK_TIMEOUT,
  },
  kafka: {
    kafkaBootstrapServers: process.env.KAFKA_BOOTSTRAP_SERVERS,
    kafkaTopics: process.env.KAFKA_TOPICS,
    startingOffsets: process.env.KAFKA_STARTING_OFFSETS as 'earliest' | 'latest',
    maxOffsetsPerTrigger: process.env.KAFKA_MAX_OFFSETS_PER_TRIGGER ? parseInt(process.env.KAFKA_MAX_OFFSETS_PER_TRIGGER) : undefined,
    failOnDataLoss: process.env.KAFKA_FAIL_ON_DATA_LOSS === 'true',
    includeHeaders: process.env.KAFKA_INCLUDE_HEADERS !== 'false',
    kafkaConsumerPollTimeoutMs: process.env.KAFKA_CONSUMER_POLL_TIMEOUT_MS ? parseInt(process.env.KAFKA_CONSUMER_POLL_TIMEOUT_MS) : undefined,
    securityProtocol: process.env.KAFKA_SECURITY_PROTOCOL,
    saslMechanism: process.env.KAFKA_SASL_MECHANISM,
    saslUsername: process.env.KAFKA_SASL_USERNAME,
    saslPassword: process.env.KAFKA_SASL_PASSWORD,
  },
  ml: {
    anomalyDetectionEnabled: process.env.ML_ANOMALY_DETECTION_ENABLED !== 'false',
    modelPath: process.env.ML_MODEL_PATH,
    batchSize: process.env.ML_BATCH_SIZE ? parseInt(process.env.ML_BATCH_SIZE) : undefined,
    trainingInterval: process.env.ML_TRAINING_INTERVAL,
    modelRefreshInterval: process.env.ML_MODEL_REFRESH_INTERVAL,
    featureColumns: process.env.ML_FEATURE_COLUMNS ? process.env.ML_FEATURE_COLUMNS.split(',') : undefined,
    anomalyThreshold: process.env.ML_ANOMALY_THRESHOLD ? parseFloat(process.env.ML_ANOMALY_THRESHOLD) : undefined,
    enableAutoML: process.env.ML_ENABLE_AUTO_ML === 'true',
  },
  batch: {
    triggerInterval: process.env.BATCH_TRIGGER_INTERVAL,
    outputMode: process.env.BATCH_OUTPUT_MODE as 'append' | 'complete' | 'update',
    outputPath: process.env.BATCH_OUTPUT_PATH,
    partitionBy: process.env.BATCH_PARTITION_BY ? process.env.BATCH_PARTITION_BY.split(',') : undefined,
    compression: process.env.BATCH_COMPRESSION as 'none' | 'snappy' | 'gzip' | 'lz4' | 'zstd',
    maxFilesPerTrigger: process.env.BATCH_MAX_FILES_PER_TRIGGER ? parseInt(process.env.BATCH_MAX_FILES_PER_TRIGGER) : undefined,
    cleanSourceArchiveAfterBatch: process.env.BATCH_CLEAN_SOURCE_ARCHIVE === 'true',
    enableDataQualityChecks: process.env.BATCH_ENABLE_DATA_QUALITY_CHECKS !== 'false',
  },
  storage: {
    primaryStorage: process.env.PRIMARY_STORAGE as 'elasticsearch' | 'opensearch' | 'hdfs' | 's3',
    archiveStorage: process.env.ARCHIVE_STORAGE as 's3' | 'hdfs' | 'gcs' | 'azure',
    retentionPolicy: {
      hot: process.env.RETENTION_HOT,
      warm: process.env.RETENTION_WARM,
      cold: process.env.RETENTION_COLD,
      delete: process.env.RETENTION_DELETE,
    },
    compressionRatio: process.env.STORAGE_COMPRESSION_RATIO ? parseFloat(process.env.STORAGE_COMPRESSION_RATIO) : undefined,
    enableIndexOptimization: process.env.STORAGE_ENABLE_INDEX_OPTIMIZATION !== 'false',
  },
  environment: process.env.NODE_ENV as 'development' | 'staging' | 'production',
  logLevel: process.env.LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error',
  metricsEnabled: process.env.METRICS_ENABLED !== 'false',
  healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL ? parseInt(process.env.HEALTH_CHECK_INTERVAL) : undefined,
});

export type Config = z.infer<typeof ConfigSchema>;
export { SparkConfigSchema, KafkaSparkConfigSchema, MLConfigSchema, BatchConfigSchema, StorageConfigSchema };