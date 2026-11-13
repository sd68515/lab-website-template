// Fictional labels only. / 仅用于演示的虚构名称。
export const REAL_DATASET_LABELS = ['Dataset A', 'Dataset B'] as const
export type RealDatasetLabel = (typeof REAL_DATASET_LABELS)[number]
