import type { NavigationSection } from '@/composables/useNavigationSync'

export interface ResultNavigationSection extends NavigationSection {
  wrapText?: boolean
  fullLabel?: string
}

export interface ResultNavigationGroup {
  id: string
  title: string
  items?: ResultNavigationSection[]
  subGroups?: ResultNavigationGroup[]
}

export function flattenNavigationGroups(groups: readonly ResultNavigationGroup[]): ResultNavigationSection[] {
  return groups.flatMap(group => [
    ...(group.items ?? []),
    ...flattenNavigationGroups(group.subGroups ?? [])
  ])
}

export function findNavigationGroupPath(
  groups: readonly ResultNavigationGroup[],
  activeId: string
): string[] {
  for (const group of groups) {
    if (group.items?.some(item => item.id === activeId)) return [group.id]
    const path = findNavigationGroupPath(group.subGroups ?? [], activeId)
    if (path.length) return [group.id, ...path]
  }
  return []
}
