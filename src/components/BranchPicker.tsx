import { Select } from 'antd'
import { useEffect } from 'react'
import { useBranches } from '../api/lookups'

/** The branch whose prices are shown. Picks the first branch the user may see. */
export default function BranchPicker({ value, onChange }: {
  value: string | undefined
  onChange: (branchId: string) => void
}) {
  const branches = useBranches()
  const list = (branches.data ?? []).filter((b) => b.is_active)
  useEffect(() => {
    if (!value && list.length) onChange(list[0].branch_id)
  }, [value, list, onChange])
  if (list.length <= 1) return null
  return (
    <Select style={{ width: 200 }} value={value} onChange={onChange}
      options={list.map((b) => ({ value: b.branch_id, label: b.name }))} />
  )
}
