import { ref, computed, watch, type Ref } from 'vue';
import {
  getCellOptions,
  getGeneOptions,
  type TopologyKey,
  type SelectOption
} from '@/constants/simulation';

export interface UseSimulationCascadeOptions {
  /**
   * Whether to restrict options to efficiency-only datasets.
   * Home page always uses false.
   * Measurement DatasetFilter passes props.includeEfficiencyOnly ?? false.
   */
  includeEfficiencyOnly?: boolean;
}

export interface UseSimulationCascadeReturn {
  topology: Ref<string | null>;
  cells: Ref<string | null>;
  genes: Ref<string | null>;
  cellOptions: Ref<SelectOption[]>;
  geneOptions: Ref<SelectOption[]>;
  reset: () => void;
  constructDatasetId: () => string | null;
}

/**
 * Shared simulation dataset cascade:
 * Topology -> Cells -> Genes
 *
 * This composable centralizes the cascade logic for:
 * - Available cells / genes options for a given topology
 * - Resetting downstream selections when parents change
 * - Constructing the standard simulation dataset id:
 *   `${topology}_cell${cells}_gene${genes}`
 *
 * It intentionally does NOT handle:
 * - Dataset ID based simulation topologies (Additional / Bursting tree / Lineage tracing)
 * - Emitting events to parents
 * - Dataset type switching or other UI concerns
 */
export function useSimulationCascade(
  options: UseSimulationCascadeOptions = {}
): UseSimulationCascadeReturn {
  const { includeEfficiencyOnly = false } = options;

  const topology = ref<string | null>(null);
  const cells = ref<string | null>(null);
  const genes = ref<string | null>(null);

  const cellOptions = computed<SelectOption[]>(() => {
    if (!topology.value) return [];
    return getCellOptions(topology.value as TopologyKey, includeEfficiencyOnly);
  });

  const geneOptions = computed<SelectOption[]>(() => {
    if (!topology.value || !cells.value) return [];
    return getGeneOptions(
      topology.value as TopologyKey,
      Number(cells.value),
      includeEfficiencyOnly
    );
  });

  // When topology changes, ensure downstream selections remain valid.
  watch(topology, (newValue) => {
    if (!newValue) {
      cells.value = null;
      genes.value = null;
      return;
    }

    const allowedCells = new Set(cellOptions.value.map((opt) => opt.value));
    if (cells.value && !allowedCells.has(cells.value)) {
      cells.value = null;
    }

    const allowedGenes = new Set(geneOptions.value.map((opt) => opt.value));
    if (genes.value && !allowedGenes.has(genes.value)) {
      genes.value = null;
    }
  });

  // When cells change, ensure genes remain valid.
  watch(cells, () => {
    const allowedGenes = new Set(geneOptions.value.map((opt) => opt.value));
    if (genes.value && !allowedGenes.has(genes.value)) {
      genes.value = null;
    }
  });

  const reset = (): void => {
    topology.value = null;
    cells.value = null;
    genes.value = null;
  };

  const constructDatasetId = (): string | null => {
    if (!topology.value || !cells.value || !genes.value) {
      return null;
    }
    return `${topology.value}_cell${cells.value}_gene${genes.value}`;
  };

  return {
    topology,
    cells,
    genes,
    cellOptions,
    geneOptions,
    reset,
    constructDatasetId
  };
}
