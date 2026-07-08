import type { Dispatch, SetStateAction } from 'react'

export type SectionKey =
  | 'Dashboard'
  | 'Repositories'
  | 'Settings'
  | 'Sync History'
  | 'Account'
  | 'Statistics'

const sections: SectionKey[] = [
  'Dashboard',
  'Repositories',
  'Settings',
  'Sync History',
  'Account',
  'Statistics',
]

export const SectionTabs = ({
  selected,
  onSelect,
}: {
  selected: SectionKey
  onSelect: Dispatch<SetStateAction<SectionKey>>
}) => (
  <nav className="tabs">
    {sections.map((section) => (
      <button
        key={section}
        className={selected === section ? 'tab active' : 'tab'}
        onClick={() => onSelect(section)}
      >
        {section}
      </button>
    ))}
  </nav>
)
